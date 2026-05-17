import {TwitterApi} from 'twitter-api-v2';
import * as admin from 'firebase-admin';

const MUNICIPALITY_HANDLES: Record<string, string> = {
  'Kadıköy':  'Kadikoy_Bld',
  'Beşiktaş': 'Besiktas_Bld',
  'Şişli':    'SisliBld',
  'Çankaya':  'cankayadanbiz',
  'Keçiören': 'keciorenbld',
};

const VIOLATION_HASHTAGS: Record<string, string> = {
  disabled: '#engellihaklari',
  sidewalk: '#yayaguvenliği',
};

export interface XPostData {
  reportId: string;
  photoUrl: string;
  location: {district: string; address: string; city: string; lat: number; lon: number};
  violationType: {id: string; name: string; icon: string};
  description?: string;
  apiKey: string;
  apiSecret: string;
  accessToken: string;
  accessSecret: string;
}

const buildPostText = (data: XPostData): string => {
  const handle = MUNICIPALITY_HANDLES[data.location.district];
  const extraTag = VIOLATION_HASHTAGS[data.violationType.id] ?? '';

  let text = `🚨 Park İhlali İhbarı\n\n📍 ${data.location.district}, ${data.location.address}\n${data.violationType.icon} ${data.violationType.name}`;

  if (data.description) {
    const truncated = data.description.substring(0, 80);
    text += `\n\n"${truncated}${data.description.length > 80 ? '...' : ''}"`;
  }

  text += `\n\n📸 ${data.photoUrl}`;

  text += `\n\n@EmniyetGM`;
  if (handle) text += ` @${handle}`;
  text += `\n#parkihbar #parkihlali #${data.location.city}`;
  if (extraTag) text += ` ${extraTag}`;
  text += `\n\nİhbar No: #${data.reportId}`;

  return text;
};

export const shareToX = async (data: XPostData): Promise<{postId: string; postUrl: string}> => {
  const client = new TwitterApi({
    appKey: data.apiKey,
    appSecret: data.apiSecret,
    accessToken: data.accessToken,
    accessSecret: data.accessSecret,
  });

  const post = await client.v2.tweet({
    text: buildPostText(data),
  });

  const postUrl = `https://x.com/parkihbar/status/${post.data.id}`;

  await admin.firestore().collection('reports').doc(data.reportId).update({
    sharedOnX: true,
    xPostId: post.data.id,
    xPostUrl: postUrl,
    xSharedAt: admin.firestore.FieldValue.serverTimestamp(),
  });

  return {postId: post.data.id, postUrl};
};
