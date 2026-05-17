import Geolocation from '@react-native-community/geolocation';
import {Platform, PermissionsAndroid} from 'react-native';

export interface LocationData {
  latitude: number;
  longitude: number;
  address: string;
  city: string;       // İl  (province/state)
  district: string;   // İlçe
  neighbourhood?: string; // Mahalle
  road?: string;          // Cadde/Sokak
}

export class LocationService {
  static async requestAndroidPermission(): Promise<boolean> {
    if (Platform.OS !== 'android') return true;
    try {
      const result = await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
        {
          title: 'Konum İzni',
          message: 'parkihbar ihbar konumunu belirlemek için konum bilgisine ihtiyaç duyar',
          buttonNeutral: 'Daha Sonra',
          buttonNegative: 'İptal',
          buttonPositive: 'Tamam',
        },
      );
      return result === PermissionsAndroid.RESULTS.GRANTED;
    } catch {
      return false;
    }
  }

  static async getCurrentLocation(): Promise<LocationData> {
    await LocationService.requestAndroidPermission();

    return new Promise((resolve, reject) => {
      Geolocation.getCurrentPosition(
        async position => {
          const {latitude, longitude} = position.coords;
          const geo = await LocationService.reverseGeocode(latitude, longitude);
          resolve({latitude, longitude, ...geo});
        },
        error => reject(new Error('Konum alınamadı: ' + error.message)),
        {enableHighAccuracy: true, timeout: 15000, maximumAge: 10000},
      );
    });
  }

  static async reverseGeocode(
    latitude: number,
    longitude: number,
  ): Promise<Omit<LocationData, 'latitude' | 'longitude'>> {
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&accept-language=tr`,
        {headers: {'User-Agent': 'parkihbar-app'}},
      );
      const data = await response.json() as {address?: Record<string, string>};
      if (data.address) {
        const a = data.address;
        // Nominatim Türkiye için: province = İl, town = İlçe, suburb = Mahalle, road = Cadde
        const city         = a.province || a.state || a.city || 'Bilinmeyen Şehir';
        const district     = a.town || a.county || a.city_district || a.district || city;
        const neighbourhood = a.suburb || a.quarter || a.neighbourhood || a.village || undefined;
        // Nominatim yol adını farklı alanlarda döndürebilir
        const road = a.road || a.residential || a.service || a.footway
                  || a.pedestrian || a.cycleway || a.path || a.street || undefined;

        const parts: string[] = [];
        if (road)          parts.push(road);
        if (neighbourhood) parts.push(neighbourhood);
        if (district && district !== city) parts.push(district);
        if (city)          parts.push(city);

        return {
          address: parts.join(', ') || 'Adres bulunamadı',
          city,
          district,
          neighbourhood,
          road,
        };
      }
    } catch {}
    return {
      address: `${latitude.toFixed(4)}, ${longitude.toFixed(4)}`,
      city: 'Bilinmeyen Şehir',
      district: 'Bilinmeyen İlçe',
    };
  }

  static calculateDistance(
    lat1: number,
    lon1: number,
    lat2: number,
    lon2: number,
  ): number {
    const R = 6371;
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLon = ((lon2 - lon1) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos((lat1 * Math.PI) / 180) *
        Math.cos((lat2 * Math.PI) / 180) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  }
}
