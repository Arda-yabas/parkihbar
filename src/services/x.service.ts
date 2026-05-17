import functions from '@react-native-firebase/functions';
import {Alert, Linking} from 'react-native';

export interface ShareToXParams {
  reportId: string;
  photoUrl: string;
  location: {
    district?: string;
    address: string;
    city?: string;
    latitude: number;
    longitude: number;
  };
  violationType: {id: string; name: string; icon: string};
  description?: string;
}

export class XService {
  static async shareReport(params: ShareToXParams): Promise<boolean> {
    try {
      const payload = {
        reportId: params.reportId,
        photoUrl: params.photoUrl,
        location: {
          district: params.location.district ?? '',
          address: params.location.address,
          city: params.location.city ?? '',
          lat: params.location.latitude,
          lon: params.location.longitude,
        },
        violationType: params.violationType,
        description: params.description,
      };

      const result = await functions().httpsCallable('shareReportToX')(payload);
      const data = result.data as {success: boolean; postUrl: string};

      if (data.success) {
        Alert.alert(
          "X'te Paylaşıldı! 🎉",
          'İhbarınız @parkihbar hesabından paylaşıldı.\n\nPostu görüntülemek ister misiniz?',
          [
            {text: 'Kapat', style: 'cancel'},
            {text: 'Postu Aç', onPress: () => Linking.openURL(data.postUrl)},
          ],
        );
        return true;
      }
      return false;
    } catch (error) {
      console.error('X share error:', error);
      Alert.alert('Hata', "X'te paylaşım yapılamadı. Lütfen tekrar deneyin.");
      return false;
    }
  }
}
