import storage from '@react-native-firebase/storage';
import ImageResizer from 'react-native-image-resizer';

async function compressPhoto(uri: string): Promise<string> {
  try {
    const result = await ImageResizer.createResizedImage(
      uri,
      1280,   // max genişlik
      1280,   // max yükseklik (oran korunur)
      'JPEG',
      82,     // kalite %82 — görsel kayıp minimal, boyut ~5x küçülür
      0,
      undefined,
      false,
      {mode: 'contain'},
    );
    return result.uri;
  } catch {
    return uri; // sıkıştırma başarısız → orijinali kullan
  }
}

export const StorageService = {
  async uploadPhoto(
    localUri: string,
    onProgress?: (pct: number) => void,
  ): Promise<string> {
    const compressed = await compressPhoto(localUri);
    const filePath = compressed.replace('file://', '');
    const filename = `reports/${Date.now()}_${Math.random().toString(36).slice(2, 8)}.jpg`;
    const ref = storage().ref(filename);

    await new Promise<void>((resolve, reject) => {
      const task = ref.putFile(filePath, {contentType: 'image/jpeg'});
      task.on(
        'state_changed',
        (snapshot: any) => {
          if (onProgress && snapshot.totalBytes > 0) {
            onProgress(snapshot.bytesTransferred / snapshot.totalBytes);
          }
        },
        (error: any) => reject(error),
        () => resolve(),
      );
    });

    return ref.getDownloadURL();
  },
};
