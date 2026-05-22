import Anthropic from '@anthropic-ai/sdk';
import fetch from 'node-fetch';
import sharp from 'sharp';

const TELEGRAM_API = 'https://api.telegram.org/bot';

const VIOLATION_LABELS: Record<string, {name: string; icon: string}> = {
  disabled:    {name: 'Engelli Park İhlali',      icon: '♿'},
  sidewalk:    {name: 'Kaldırıma Park',           icon: '🚶'},
  bus_stop:    {name: 'Otobüs Durağı İhlali',     icon: '🚌'},
  fire_hydrant:{name: 'Yangın Musluğu İhlali',    icon: '🚒'},
  no_parking:  {name: 'Park Yasak Bölge',         icon: '🚫'},
  double_park: {name: 'Çift Sıra Park',           icon: '🚗'},
};

export interface AnalysisResult {
  qualityScore: number;
  shouldPublish: boolean;
  categoryConfirmed: string;
  plate: string | null;
  city: string;
  finalTweet: string;
  reasoning: string;
  mentions: string[];
  blurredBuffer: Buffer | null;
}

export const analyzeWithClaude = async (
  photoUrl: string,
  reportData: {
    type: string;
    location: {address: string; district: string; city: string};
    note?: string;
  },
  claudeApiKey: string,
): Promise<AnalysisResult | null> => {
  const photoRes = await fetch(photoUrl);
  if (!photoRes.ok) {
    console.error(`Fotoğraf indirilemedi: ${photoRes.status} ${photoRes.statusText} url=${photoUrl.slice(0, 80)}`);
    return null;
  }
  const rawContentType = photoRes.headers.get('content-type') ?? '';
  console.log(`Fotoğraf indirildi: ${rawContentType}, url=${photoUrl.slice(0, 80)}`);
  let buffer = await photoRes.buffer();
  console.log(`Buffer boyutu: ${buffer.length} bytes`);
  const base64 = buffer.toString('base64');
  const contentType = (rawContentType.split(';')[0].trim() || 'image/jpeg') as
    | 'image/jpeg'
    | 'image/png'
    | 'image/gif'
    | 'image/webp';

  const label = VIOLATION_LABELS[reportData.type] ?? {name: reportData.type, icon: '🚗'};

  const prompt = `Sen bir trafik ihlali analiz uzmanısın. Bu ihbar fotoğrafını analiz et.

İhbar Bilgileri:
- İhlal Türü: ${label.icon} ${label.name}
- Konum: ${reportData.location.address}, ${reportData.location.district}, ${reportData.location.city}
- Not: ${reportData.note ?? 'Yok'}

Aşağıdaki JSON formatında yanıt ver (sadece JSON, başka açıklama ekleme):
{
  "quality_score": <0-100, fotoğraf netliği + plaka görünürlüğü + ihlal açıklığı>,
  "should_publish": <true if quality_score >= 70 and ihlal açıkça görülüyorsa>,
  "category_confirmed": "<tespit edilen ihlal türü Türkçe>",
  "plate": "<plaka numarası ya da null>",
  "city": "<şehir adı küçük harfle>",
  "final_tweet": "<280 karakter max tweet, @EmniyetGM mention, #parkihbar #parkihlali hashtag>",
  "reasoning": "<karar gerekçesi max 100 karakter>",
  "mentions": ["@EmniyetGM"],
  "faces": [<görünür insan yüzü varsa her biri için {"x": <sol kenar 0.0-1.0>, "y": <üst kenar 0.0-1.0>, "w": <genişlik 0.0-1.0>, "h": <yükseklik 0.0-1.0>}>, yüz yoksa boş dizi []>]
}`;

  const client = new Anthropic({apiKey: claudeApiKey});

  const message = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 1024,
    messages: [
      {
        role: 'user',
        content: [
          {type: 'image', source: {type: 'base64', media_type: contentType, data: base64}},
          {type: 'text', text: prompt},
        ],
      },
    ],
  });

  const text = message.content[0].type === 'text' ? message.content[0].text : '';
  console.log('Claude yanıtı:', text.slice(0, 400));
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    console.error('Claude JSON döndürmedi:', text.slice(0, 300));
    return null;
  }

  try {
    const parsed = JSON.parse(jsonMatch[0]);

    // Yüz bulanıklaştırma
    const faces: Array<{x: number; y: number; w: number; h: number}> = parsed.faces ?? [];
    if (faces.length > 0) {
      console.log(`${faces.length} yüz tespit edildi, bulanıklaştırılıyor...`);
      const meta = await sharp(buffer).metadata();
      const imgW = meta.width ?? 1;
      const imgH = meta.height ?? 1;

      const overlays = await Promise.all(
        faces.map(async face => {
          const left   = Math.max(0, Math.round(face.x * imgW));
          const top    = Math.max(0, Math.round(face.y * imgH));
          const width  = Math.min(imgW - left, Math.round(face.w * imgW));
          const height = Math.min(imgH - top,  Math.round(face.h * imgH));
          if (width <= 0 || height <= 0) return null;
          const blurred = await sharp(buffer)
            .extract({left, top, width, height})
            .blur(30)
            .toBuffer();
          return {input: blurred, left, top};
        }),
      );

      const validOverlays = overlays.filter(Boolean) as sharp.OverlayOptions[];
      buffer = await sharp(buffer).composite(validOverlays).toBuffer();
      console.log(`Yüz bulanıklaştırma tamamlandı`);
    }

    return {
      qualityScore:      parsed.quality_score      ?? 0,
      shouldPublish:     parsed.should_publish      ?? false,
      categoryConfirmed: parsed.category_confirmed  ?? label.name,
      plate:             parsed.plate               ?? null,
      city:              parsed.city                ?? reportData.location.city,
      finalTweet:        parsed.final_tweet         ?? '',
      reasoning:         parsed.reasoning           ?? '',
      mentions:          parsed.mentions            ?? ['@EmniyetGM'],
      blurredBuffer:     faces.length > 0 ? buffer : null,
    };
  } catch (e) {
    console.error('JSON parse error:', e);
    return null;
  }
};

export const sendTelegramApproval = async (
  botToken: string,
  chatId: string,
  photoUrl: string,
  analysis: AnalysisResult,
  reportId: string,
  location: {address: string; district: string; city: string; lat?: number; lng?: number},
): Promise<boolean> => {
  // Tweet metnine harita + fotoğraf linki ekle
  const mapsLine  = (location.lat && location.lng)
    ? `\n🗺️ https://maps.google.com/?q=${location.lat},${location.lng}` : '';
  const photoLine = photoUrl ? `\n📸 ${photoUrl}` : '';
  const fullTweet = analysis.finalTweet + mapsLine + photoLine;
  const xOpenUrl  = `https://us-central1-parkihbar.cloudfunctions.net/xOpen?text=${encodeURIComponent(fullTweet)}`;

  const caption =
    `🔔 *Yeni İhbar!*\n\n` +
    `📊 Kalite: *${analysis.qualityScore}/100*\n` +
    `📍 *Konum:* ${location.address}, ${location.district}\n` +
    `🏙️ *Şehir:* ${location.city}\n` +
    `🚗 *Kategori:* ${analysis.categoryConfirmed}\n` +
    `🔢 *Plaka:* ${analysis.plate ?? 'Belirsiz'}\n\n` +
    `💡 ${analysis.reasoning}\n\n` +
    `_X açılınca fotoğrafı da ekle 📎_`;

  const keyboard = {
    inline_keyboard: [[
      {text: "𝕏'te Post Et", url: xOpenUrl},
    ]],
  };

  // Yüz bulanıklaştırıldıysa buffer'ı multipart olarak gönder, yoksa URL ile
  let res: any;
  if (analysis.blurredBuffer) {
    const FormData = (await import('form-data')).default;
    const form = new FormData();
    form.append('chat_id', chatId);
    form.append('photo', analysis.blurredBuffer, {filename: 'report.jpg', contentType: 'image/jpeg'});
    form.append('caption', caption);
    form.append('parse_mode', 'Markdown');
    form.append('reply_markup', JSON.stringify(keyboard));
    res = await fetch(`${TELEGRAM_API}${botToken}/sendPhoto`, {method: 'POST', body: form});
  } else {
    res = await fetch(`${TELEGRAM_API}${botToken}/sendPhoto`, {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({chat_id: chatId, photo: photoUrl, caption, parse_mode: 'Markdown', reply_markup: keyboard}),
    });
  }

  if (!res.ok) {
    const body = await res.text();
    console.error('Telegram sendPhoto failed:', body);
  }
  return res.ok;
};

export const editTelegramCaption = async (
  botToken: string,
  chatId: string,
  messageId: number,
  caption: string,
): Promise<void> => {
  await fetch(`${TELEGRAM_API}${botToken}/editMessageCaption`, {
    method: 'POST',
    headers: {'Content-Type': 'application/json'},
    body: JSON.stringify({chat_id: chatId, message_id: messageId, caption}),
  });
};

export const answerCallback = async (botToken: string, callbackQueryId: string): Promise<void> => {
  await fetch(`${TELEGRAM_API}${botToken}/answerCallbackQuery`, {
    method: 'POST',
    headers: {'Content-Type': 'application/json'},
    body: JSON.stringify({callback_query_id: callbackQueryId}),
  });
};
