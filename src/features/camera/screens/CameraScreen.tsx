import React, {useCallback, useEffect, useRef, useState} from 'react';
import {StyleSheet, View, TouchableOpacity, Text, Alert, ActivityIndicator, Image, ScrollView} from 'react-native';
import {Camera, useCameraDevice, useCameraPermission} from 'react-native-vision-camera';
import {useNavigation, useRoute, useIsFocused, useFocusEffect, RouteProp} from '@react-navigation/native';
import {NativeStackNavigationProp} from '@react-navigation/native-stack';
import {CameraStackParamList} from '../../../navigation/AppNavigator';
import {lightColors as colors} from '../../../theme/ThemeContext';
import {FlowStepper} from '../../../components/FlowStepper';

type CameraScreenNavigationProp = NativeStackNavigationProp<CameraStackParamList, 'Camera'>;
type CameraScreenRouteProp = RouteProp<CameraStackParamList, 'Camera'>;

const MAX_PHOTOS = 3;

export const CameraScreen = () => {
  const navigation = useNavigation<CameraScreenNavigationProp>();
  const route = useRoute<CameraScreenRouteProp>();
  const isFocused = useIsFocused();
  const {hasPermission, requestPermission} = useCameraPermission();
  const device = useCameraDevice('back');
  const camera = useRef<Camera>(null);
  const [isCapturing, setIsCapturing] = useState(false);
  const [photos, setPhotos] = useState<string[]>([]);
  const [flash, setFlash] = useState<'off' | 'on'>('off');

  useEffect(() => {
    if (!hasPermission) {requestPermission();}
  }, [hasPermission, requestPermission]);

  useFocusEffect(
    useCallback(() => {
      const existing = route.params?.existingPhotoUris;
      if (existing?.length) {
        setPhotos(existing);
        navigation.setParams({existingPhotoUris: undefined});
      } else {
        setPhotos([]);
      }
    }, [route.params?.existingPhotoUris]),
  );

  const takePhoto = async () => {
    if (isCapturing || !isFocused || photos.length >= MAX_PHOTOS) {return;}
    try {
      if (!camera.current) {Alert.alert('Hata', 'Kamera hazır değil'); return;}
      setIsCapturing(true);
      const photo = await camera.current.takePhoto({flash});
      setPhotos(prev => [...prev, `file://${photo.path}`]);
    } catch (error: any) {
      if (!String(error?.message ?? '').includes('Cannot Record')) {
        Alert.alert('Hata', 'Fotoğraf çekilemedi, tekrar dene');
      }
    } finally {
      setIsCapturing(false);
    }
  };

  const removePhoto = (index: number) => {
    setPhotos(prev => prev.filter((_, i) => i !== index));
  };

  const handleContinue = () => {
    if (photos.length === 0) {return;}
    navigation.navigate('Form', {photoUris: photos});
  };

  if (!hasPermission) {
    return (
      <View style={styles.container}>
        <View style={styles.permissionContainer}>
          <Text style={styles.permissionText}>Kamera izni gerekiyor</Text>
          <TouchableOpacity style={styles.permissionButton} onPress={requestPermission}>
            <Text style={styles.permissionButtonText}>İzin Ver</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  if (!device) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.loadingText}>Kamera yükleniyor...</Text>
      </View>
    );
  }

  const canTakeMore = photos.length < MAX_PHOTOS;

  return (
    <View style={styles.container}>
      <Camera
        ref={camera}
        style={StyleSheet.absoluteFill}
        device={device}
        isActive={isFocused}
        photo={true}
        photoQualityBalance="speed"
      />

      <View style={styles.overlay}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity style={styles.closeButton} onPress={() => navigation.goBack()}>
            <Text style={styles.closeButtonText}>✕</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>İhlal Fotoğrafı Çek</Text>
          <TouchableOpacity
            style={[styles.closeButton, flash === 'on' && styles.flashButtonActive]}
            onPress={() => setFlash(f => (f === 'off' ? 'on' : 'off'))}>
            <Text style={styles.closeButtonText}>{flash === 'on' ? '⚡' : '🔦'}</Text>
          </TouchableOpacity>
        </View>

        {/* Stepper */}
        <FlowStepper currentStep={1} dark />

        {/* Guide */}
        <View style={styles.centerGuide}>
          <View style={styles.guideBox} />
          <Text style={styles.guideText}>İhlali çerçeve içine al</Text>
        </View>

        {/* Bottom */}
        <View style={styles.bottomArea}>
          {/* Photo slots */}
          <View style={styles.photoSlots}>
            {[0, 1, 2].map(i => {
              const uri = photos[i];
              return uri ? (
                <View key={i} style={styles.photoSlot}>
                  <Image source={{uri}} style={styles.photoThumb} />
                  <TouchableOpacity style={styles.removeBtn} onPress={() => removePhoto(i)}>
                    <Text style={styles.removeBtnText}>✕</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <View key={i} style={[styles.photoSlot, styles.photoSlotEmpty]}>
                  <Text style={styles.photoSlotIcon}>{i < photos.length ? '📷' : '+'}</Text>
                </View>
              );
            })}
          </View>

          {/* Capture button */}
          <View style={styles.captureRow}>
            <TouchableOpacity
              style={[styles.captureButton, !canTakeMore && styles.captureButtonDisabled]}
              onPress={takePhoto}
              disabled={isCapturing || !canTakeMore}>
              {isCapturing
                ? <ActivityIndicator color={colors.background} />
                : <View style={[styles.captureButtonInner, !canTakeMore && styles.captureButtonInnerDisabled]} />}
            </TouchableOpacity>
          </View>
          <Text style={styles.captureHint}>
            {photos.length === 0
              ? 'Fotoğraf çekmek için dokun'
              : photos.length === MAX_PHOTOS
              ? 'Maksimum fotoğraf sayısına ulaşıldı'
              : `${photos.length} fotoğraf çekildi · ${MAX_PHOTOS - photos.length} tane daha eklenebilir`}
          </Text>

          {/* Continue button */}
          {photos.length > 0 && (
            <TouchableOpacity style={styles.continueButton} onPress={handleContinue} activeOpacity={0.85}>
              <Text style={styles.continueButtonText}>
                Devam Et ({photos.length}/{MAX_PHOTOS} fotoğraf) →
              </Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {flex: 1, backgroundColor: '#000', justifyContent: 'center', alignItems: 'center'},
  overlay: {position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, justifyContent: 'space-between'},
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingTop: 60, paddingHorizontal: 20, paddingBottom: 20,
  },
  closeButton: {width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center'},
  closeButtonText: {color: '#FFF', fontSize: 18, fontWeight: 'bold'},
  flashButtonActive: {backgroundColor: '#F5C518'},
  headerTitle: {color: '#FFF', fontSize: 16, fontWeight: '600'},
  centerGuide: {flex: 1, justifyContent: 'center', alignItems: 'center'},
  guideBox: {width: 260, height: 260, borderWidth: 3, borderColor: colors.primary, borderRadius: 20},
  guideText: {
    color: '#FFF', fontSize: 14, fontWeight: '500', marginTop: 16, textAlign: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20,
  },
  bottomArea: {
    backgroundColor: 'rgba(0,0,0,0.7)', paddingTop: 16, paddingBottom: 40, paddingHorizontal: 20,
    alignItems: 'center', gap: 12,
  },
  photoSlots: {flexDirection: 'row', gap: 10, marginBottom: 4},
  photoSlot: {width: 72, height: 72, borderRadius: 12, overflow: 'hidden'},
  photoSlotEmpty: {
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderWidth: 2, borderColor: 'rgba(255,255,255,0.25)', borderStyle: 'dashed',
    justifyContent: 'center', alignItems: 'center',
  },
  photoSlotIcon: {fontSize: 22, color: 'rgba(255,255,255,0.5)'},
  photoThumb: {width: '100%', height: '100%'},
  removeBtn: {
    position: 'absolute', top: 3, right: 3,
    width: 20, height: 20, borderRadius: 10,
    backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'center', alignItems: 'center',
  },
  removeBtnText: {color: '#FFF', fontSize: 10, fontWeight: 'bold'},
  captureRow: {alignItems: 'center'},
  captureButton: {
    width: 74, height: 74, borderRadius: 37,
    backgroundColor: '#FFF', justifyContent: 'center', alignItems: 'center',
    borderWidth: 4, borderColor: colors.primary,
  },
  captureButtonDisabled: {borderColor: 'rgba(255,255,255,0.3)'},
  captureButtonInner: {width: 58, height: 58, borderRadius: 29, backgroundColor: colors.primary},
  captureButtonInnerDisabled: {backgroundColor: 'rgba(255,255,255,0.3)'},
  captureHint: {color: 'rgba(255,255,255,0.7)', fontSize: 13, fontWeight: '500', textAlign: 'center'},
  continueButton: {
    backgroundColor: colors.primary, borderRadius: 14,
    paddingVertical: 14, paddingHorizontal: 32, alignSelf: 'stretch', alignItems: 'center',
    marginTop: 4,
  },
  continueButtonText: {color: '#FFF', fontSize: 16, fontWeight: '700'},
  permissionContainer: {padding: 20, alignItems: 'center'},
  permissionText: {color: '#FFF', fontSize: 16, marginBottom: 20, textAlign: 'center'},
  permissionButton: {backgroundColor: colors.primary, paddingHorizontal: 32, paddingVertical: 12, borderRadius: 8},
  permissionButtonText: {color: '#FFF', fontSize: 16, fontWeight: '600'},
  loadingText: {color: '#FFF', fontSize: 14, marginTop: 12},
});
