import messaging from '@react-native-firebase/messaging';
import firestore from '@react-native-firebase/firestore';
import auth from '@react-native-firebase/auth';
import {Linking, PermissionsAndroid, Platform} from 'react-native';

const MODERATOR_DOC = 'settings/moderator';

export const FCMService = {
  async init() {
    // Android 13+ requires explicit POST_NOTIFICATIONS runtime permission
    if (Platform.OS === 'android' && Platform.Version >= 33) {
      const result = await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS,
      );
      if (result !== PermissionsAndroid.RESULTS.GRANTED) return;
    }

    const authStatus = await messaging().requestPermission().catch(() => messaging.AuthorizationStatus.NOT_DETERMINED);
    const enabled =
      authStatus === messaging.AuthorizationStatus.AUTHORIZED ||
      authStatus === messaging.AuthorizationStatus.PROVISIONAL;
    if (!enabled) return;

    const token = await messaging().getToken().catch(() => null);
    if (!token) return;
    console.log('FCM token:', token);

    const saveToken = async (t: string) => {
      await firestore().doc(MODERATOR_DOC).set({fcmToken: t}, {merge: true}).catch(() => {});
      const uid = auth().currentUser?.uid;
      if (uid) {
        await firestore().collection('users').doc(uid).set({fcmToken: t}, {merge: true}).catch(() => {});
      }
    };

    await saveToken(token);

    // Tüm kullanıcıları "all_users" konusuna abone et
    await messaging().subscribeToTopic('all_users').catch(() => {});

    // Token yenilenirse güncelle
    messaging().onTokenRefresh(async newToken => {
      await saveToken(newToken);
    });

    // Uygulama açıkken gelen bildirim — direkt X'i aç
    messaging().onMessage(async remoteMessage => {
      const tweetText = remoteMessage.data?.tweetText as string | undefined;
      if (tweetText) FCMService.openXCompose(tweetText);
    });

    // Arka planda bildirime tıklanınca
    messaging().onNotificationOpenedApp(remoteMessage => {
      const tweetText = remoteMessage.data?.tweetText as string | undefined;
      if (tweetText) FCMService.openXCompose(tweetText);
    });

    // Uygulama kapalıyken bildirime tıklanıp açıldıysa
    const initial = await messaging().getInitialNotification();
    if (initial?.data?.tweetText) {
      FCMService.openXCompose(initial.data.tweetText as string);
    }
  },

  openXCompose(tweetText: string) {
    const webUrl = `https://x.com/intent/post?text=${encodeURIComponent(tweetText)}`;
    if (Platform.OS === 'android') {
      Linking.openURL(webUrl);
      return;
    }
    Linking.openURL(`twitter://post?message=${encodeURIComponent(tweetText)}`).catch(() => {
      Linking.openURL(webUrl);
    });
  },
};
