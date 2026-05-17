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
exports.shareReportToX = void 0;
const https_1 = require("firebase-functions/v2/https");
const params_1 = require("firebase-functions/params");
const admin = __importStar(require("firebase-admin"));
const x_service_1 = require("./services/x.service");
admin.initializeApp();
const xAppKey = (0, params_1.defineSecret)('X_APP_KEY');
const xAppSecret = (0, params_1.defineSecret)('X_APP_SECRET');
const xAccessToken = (0, params_1.defineSecret)('X_ACCESS_TOKEN');
const xAccessSecret = (0, params_1.defineSecret)('X_ACCESS_SECRET');
exports.shareReportToX = (0, https_1.onCall)({ secrets: [xAppKey, xAppSecret, xAccessToken, xAccessSecret] }, async (request) => {
    if (!request.auth) {
        throw new https_1.HttpsError('unauthenticated', 'Kullanıcı girişi gerekli');
    }
    const { reportId, photoUrl, location, violationType, description } = request.data;
    if (!reportId || !photoUrl || !location || !violationType) {
        throw new https_1.HttpsError('invalid-argument', 'Eksik veri');
    }
    const result = await (0, x_service_1.shareToX)({
        reportId,
        photoUrl,
        location,
        violationType,
        description,
        apiKey: xAppKey.value(),
        apiSecret: xAppSecret.value(),
        accessToken: xAccessToken.value(),
        accessSecret: xAccessSecret.value(),
    });
    return { success: true, postId: result.postId, postUrl: result.postUrl };
});
//# sourceMappingURL=index.js.map