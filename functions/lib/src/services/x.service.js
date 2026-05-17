"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.shareToX = void 0;
const twitter_api_v2_1 = require("twitter-api-v2");
const admin = __importStar(require("firebase-admin"));
const MUNICIPALITY_HANDLES = {
    'Kadıköy': 'Kadikoy_Bld',
    'Beşiktaş': 'Besiktas_Bld',
    'Şişli': 'SisliBld',
    'Çankaya': 'cankayadanbiz',
    'Keçiören': 'keciorenbld',
};
const VIOLATION_HASHTAGS = {
    disabled: '#engellihaklari',
    sidewalk: '#yayaguvenliği',
};
const buildPostText = (data) => {
    const handle = MUNICIPALITY_HANDLES[data.location.district];
    const extraTag = VIOLATION_HASHTAGS[data.violationType.id] ?? '';
    let text = `🚨 Park İhlali İhbarı\n\n📍 ${data.location.district}, ${data.location.address}\n${data.violationType.icon} ${data.violationType.name}`;
    if (data.description) {
        const truncated = data.description.substring(0, 100);
        text += `\n\n"${truncated}${data.description.length > 100 ? '...' : ''}"`;
    }
    text += `\n\n@EmniyetGM`;
    if (handle)
        text += ` @${handle}`;
    text += `\n#parkihbar #parkihlali #${data.location.city}`;
    if (extraTag)
        text += ` ${extraTag}`;
    text += `\n\nİhbar No: #${data.reportId}`;
    return text;
};
const shareToX = async (data) => {
    const client = new twitter_api_v2_1.TwitterApi({
        appKey: data.apiKey,
        appSecret: data.apiSecret,
        accessToken: data.accessToken,
        accessSecret: data.accessSecret,
    });
    const photoRes = await fetch(data.photoUrl);
    const photoBuffer = Buffer.from(await photoRes.arrayBuffer());
    const mediaId = await client.v1.uploadMedia(photoBuffer, { mimeType: 'image/jpeg' });
    const post = await client.v2.tweet({
        text: buildPostText(data),
        media: { media_ids: [mediaId] },
    });
    const postUrl = `https://x.com/parkihbar/status/${post.data.id}`;
    await admin.firestore().collection('reports').doc(data.reportId).update({
        sharedOnX: true,
        xPostId: post.data.id,
        xPostUrl: postUrl,
        xSharedAt: admin.firestore.FieldValue.serverTimestamp(),
    });
    return { postId: post.data.id, postUrl };
};
exports.shareToX = shareToX;
//# sourceMappingURL=x.service.js.map