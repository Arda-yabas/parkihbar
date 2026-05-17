import storage from '@react-native-firebase/storage';

export const StorageService = {
  async uploadPhoto(
    localUri: string,
    onProgress?: (pct: number) => void,
  ): Promise<string> {
    const filePath = localUri.replace('file://', '');
    const filename = `reports/${Date.now()}_${Math.random().toString(36).slice(2, 8)}.jpg`;
    const ref = storage().ref(filename);

    await new Promise<void>((resolve, reject) => {
      const task = ref.putFile(filePath);
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
