import {onCall, HttpsError} from 'firebase-functions/v2/https';
import * as admin from 'firebase-admin';
import {shareToX} from './services/x.service';

admin.initializeApp();

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
