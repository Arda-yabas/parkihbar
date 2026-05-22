import {onCall, onRequest, HttpsError} from 'firebase-functions/v2/https';
import {onDocumentCreated} from 'firebase-functions/v2/firestore';
import * as admin from 'firebase-admin';
import {shareToX} from './services/x.service';
import {
  analyzeWithClaude,
  sendTelegramApproval,
  editTelegramCaption,
  answerCallback,
} from './services/bot.service';

admin.initializeApp();

// ── Mevcut: onCall ile X'e paylaş ───────────────────────────────────────────

export const shareReportToX = onCall(async (request) => {
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'Kullanıcı girişi gerekli');
  }

  const {reportId, photoUrl, location, violationType, description} = request.data;

  if (!reportId || !photoUrl || !location || !violationType) {
    throw new HttpsError('invalid-argument', 'Eksik veri');
  }

  const apiKey       = process.env.X_APP_KEY;
  const apiSecret    = process.env.X_APP_SECRET;
  const accessToken  = process.env.X_ACCESS_TOKEN;
  const accessSecret = process.env.X_ACCESS_SECRET;

  if (!apiKey || !apiSecret || !accessToken || !accessSecret) {
    throw new HttpsError('failed-precondition', 'X API credentials eksik');
  }

  const result = await shareToX({
    reportId, photoUrl, location, violationType, description,
    apiKey, apiSecret, accessToken, accessSecret,
  });

  return {success: true, postId: result.postId, postUrl: result.postUrl};
});

// ── Yeni: Firestore trigger — yeni ihbar → Claude analiz → Telegram ──────────

export const onReportCreated = onDocumentCreated('reports/{reportId}', async (event) => {
  const reportId = event.params.reportId;
  const data = event.data?.data();
  if (!data) return;

  // Daha önce işlenmiş raporları atla
  if (data.status && data.status !== 'pending') return;

  const claudeApiKey     = process.env.CLAUDE_API_KEY;
  const telegramBotToken = process.env.TELEGRAM_BOT_TOKEN;
  const telegramChatId   = process.env.TELEGRAM_CHAT_ID;

  if (!claudeApiKey || !telegramBotToken || !telegramChatId) {
    console.error('onReportCreated: env var eksik');
    return;
  }

  const photoUrl = data.photoUrl || (Array.isArray(data.photoUrls) && data.photoUrls[0]);
  if (!photoUrl) {
    console.log(`${reportId}: fotoğraf URL yok, atlanıyor`);
    return;
  }

  await admin.firestore().collection('reports').doc(reportId).update({status: 'analyzing'});

  let analysis;
  try {
    analysis = await analyzeWithClaude(
      photoUrl,
      {
        type: typeof data.type === 'string' ? data.type : (data.type?.id ?? 'unknown'),
        location: {
          address:  data.location?.address  ?? '',
          district: data.location?.district ?? '',
          city:     data.location?.city     ?? 'istanbul',
        },
        note: data.note,
      },
      claudeApiKey,
    );
  } catch (e) {
    console.error(`${reportId}: Claude analiz hatası`, e);
    await admin.firestore().collection('reports').doc(reportId).update({status: 'analysis_failed'});
    return;
  }

  if (!analysis) {
    await admin.firestore().collection('reports').doc(reportId).update({status: 'analysis_failed'});
    return;
  }

  if (!analysis.shouldPublish || analysis.qualityScore < 70) {
    console.log(`${reportId}: kalite düşük (${analysis.qualityScore}/100), reddedildi`);
    await admin.firestore().collection('reports').doc(reportId).update({
      status: 'rejected',
      analysisResult: analysis,
    });
    return;
  }

  await admin.firestore().collection('reports').doc(reportId).update({
    status: 'pending_approval',
    analysisResult: analysis,
  });

  const sent = await sendTelegramApproval(
    telegramBotToken,
    telegramChatId,
    photoUrl,
    analysis,
    reportId,
    {
      address:  data.location?.address   ?? '',
      district: data.location?.district  ?? '',
      city:     data.location?.city      ?? 'istanbul',
      lat:      data.location?.latitude  ?? data.location?.lat  ?? 0,
      lng:      data.location?.longitude ?? data.location?.lon  ?? 0,
    },
  );

  if (sent) {
    console.log(`✅ ${reportId} Telegram'da onay bekliyor (kalite: ${analysis.qualityScore}/100)`);
  } else {
    console.error(`❌ ${reportId} Telegram gönderilemedi`);
  }
});

// ── Yeni: Telegram webhook — buton callback → Twitter ────────────────────────

export const telegramWebhook = onRequest(async (req, res) => {
  if (req.method !== 'POST') {
    res.status(405).send('Method Not Allowed');
    return;
  }

  const update = req.body;

  if (!update?.callback_query) {
    res.status(200).send('ok');
    return;
  }

  const cq        = update.callback_query;
  const messageId: number = cq.message?.message_id;
  const chatId    = String(cq.message?.chat?.id ?? '');
  const cbData    = String(cq.data ?? '');

  const telegramBotToken = process.env.TELEGRAM_BOT_TOKEN;
  if (!telegramBotToken) {
    res.status(200).send('ok');
    return;
  }

  // Telegram'a hemen cevap ver (loading spinner kalkacak)
  await answerCallback(telegramBotToken, cq.id);

  const sepIdx   = cbData.indexOf('_');
  if (sepIdx === -1) {
    res.status(200).send('ok');
    return;
  }
  const action   = cbData.slice(0, sepIdx);
  const reportId = cbData.slice(sepIdx + 1);

  if (action === 'approve') {
    const snap       = await admin.firestore().collection('reports').doc(reportId).get();
    const reportData = snap.data();

    if (!reportData) {
      await editTelegramCaption(telegramBotToken, chatId, messageId, '❌ Rapor bulunamadı.');
      res.status(200).send('ok');
      return;
    }

    const tweetText: string = reportData.analysisResult?.finalTweet ?? '';
    const photoUrl: string  = reportData.photoUrl
      || (Array.isArray(reportData.photoUrls) && reportData.photoUrls[0])
      || '';

    // Harita ve fotoğraf linkini tweet metnine ekle (X'te URL 23 karakter sayılır)
    const lat = reportData.location?.latitude  ?? reportData.location?.lat  ?? 0;
    const lng = reportData.location?.longitude ?? reportData.location?.lon  ?? 0;
    const mapsLine  = (lat && lng) ? `\n🗺️ https://maps.google.com/?q=${lat},${lng}` : '';
    const photoLine = photoUrl ? `\n📸 ${photoUrl}` : '';
    const fullTweet = tweetText + mapsLine + photoLine;

    const xOpenUrl = `https://us-central1-parkihbar.cloudfunctions.net/xOpen?text=${encodeURIComponent(fullTweet)}`;

    await admin.firestore().collection('reports').doc(reportId).update({status: 'approved'});

    // FCM push notification — moderatör telefonunda X doğrudan açılır
    try {
      const modSnap = await admin.firestore().doc('settings/moderator').get();
      const fcmToken = modSnap.data()?.fcmToken as string | undefined;
      if (fcmToken) {
        await admin.messaging().send({
          token: fcmToken,
          notification: {
            title: '✅ İhbar Onaylandı',
            body: 'X\'te paylaşmaya hazır — bildirime dokun',
          },
          data: {tweetText: fullTweet},
          apns: {payload: {aps: {sound: 'default', badge: 1}}},
        });
        console.log(`📱 ${reportId} FCM gönderildi`);
      }
    } catch (fcmErr) {
      console.error(`${reportId} FCM hatası`, fcmErr);
    }

    await fetch(`https://api.telegram.org/bot${telegramBotToken}/editMessageCaption`, {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({
        chat_id: chatId,
        message_id: messageId,
        caption: '✅ Onaylandı! Telefona bildirim gönderildi 📱\n\nX açılınca fotoğrafı da ekleyip gönder 📎',
        reply_markup: {
          inline_keyboard: [[
            {text: "𝕏'te Post Et", url: xOpenUrl},
          ]],
        },
      }),
    });
    console.log(`✅ ${reportId} onaylandı`);
  } else if (action === 'reject') {
    await admin.firestore().collection('reports').doc(reportId).update({status: 'rejected'});
    await editTelegramCaption(telegramBotToken, chatId, messageId, '❌ Reddedildi.');
    console.log(`🗑️  ${reportId} reddedildi`);
  }

  res.status(200).send('ok');
});

// ── X deep-link — twitter:// scheme'ine 302 redirect, iOS direkt X'i açar ──

export const xOpen = onRequest((req, res) => {
  const text       = String(req.query.text ?? '');
  const twitterUrl = `twitter://post?message=${encodeURIComponent(text)}`;
  res.redirect(302, twitterUrl);
});
