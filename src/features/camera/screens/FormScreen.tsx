import React, {useState, useEffect, useMemo, useRef} from 'react';
import {StyleSheet, View, Text, TextInput, ScrollView, TouchableOpacity, Image, Alert, ActivityIndicator, Linking, Modal} from 'react-native';
import {Camera, useCameraDevice, useCameraPermission} from 'react-native-vision-camera';
import {useNavigation, useRoute, RouteProp} from '@react-navigation/native';
import {NativeStackNavigationProp} from '@react-navigation/native-stack';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {CameraStackParamList} from '../../../navigation/AppNavigator';
import {useTheme, Colors} from '../../../theme/ThemeContext';
import {FirestoreService, StorageService} from '../../../services/firebase';
import {LocationService, LocationData} from '../../../services/location.service';
import {CATEGORY_OPTIONS} from '../../../constants/reportTemplates';
import {BackButton} from '../../../components/BackButton';
import {FlowStepper} from '../../../components/FlowStepper';

type FormScreenNavigationProp = NativeStackNavigationProp<CameraStackParamList, 'Form'>;
type FormScreenRouteProp = RouteProp<CameraStackParamList, 'Form'>;

export const FormScreen = () => {
  const navigation = useNavigation<FormScreenNavigationProp>();
  const route = useRoute<FormScreenRouteProp>();
  const insets = useSafeAreaInsets();
  const {colors} = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);

  const [localPhotoUris, setLocalPhotoUris] = useState<string[]>(route.params.photoUris);
  const [selectedType, setSelectedType] = useState<string | null>(null);
  const [note, setNote] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadStep, setUploadStep] = useState('');
  const [locationData, setLocationData] = useState<LocationData | null>(null);
  const [showAddCamera, setShowAddCamera] = useState(false);
  const [isAddCapturing, setIsAddCapturing] = useState(false);

  const addCameraRef = useRef<Camera>(null);
  const scrollRef = useRef<ScrollView>(null);
  const noteInputRef = useRef<TextInput>(null);
  const {hasPermission, requestPermission} = useCameraPermission();

  const noteRequired = selectedType === 'diger';
  const cameraDevice = useCameraDevice('back');

  useEffect(() => {
    LocationService.getCurrentLocation()
      .then(setLocationData)
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (selectedType === 'diger') {
      setTimeout(() => scrollRef.current?.scrollToEnd({animated: true}), 100);
    }
  }, [selectedType]);

  const handleExit = () => {
    navigation.reset({index: 0, routes: [{name: 'Camera'}]});
    (navigation as any).getParent()?.navigate('Dashboard');
  };

  const handleOpenAddCamera = async () => {
    if (!hasPermission) {
      await requestPermission();
    }
    setShowAddCamera(true);
  };

  const handleAddPhoto = async () => {
    if (isAddCapturing || !addCameraRef.current) {return;}
    try {
      setIsAddCapturing(true);
      const photo = await addCameraRef.current.takePhoto({});
      setLocalPhotoUris(prev => [...prev, `file://${photo.path}`]);
      setShowAddCamera(false);
    } catch {
      Alert.alert('Hata', 'Fotoğraf çekilemedi, tekrar dene');
    } finally {
      setIsAddCapturing(false);
    }
  };

  const handleSubmit = async () => {
    if (!selectedType) {
      Alert.alert('Eksik Bilgi', 'Lütfen ihlal tipini seçin');
      return;
    }
    if (noteRequired && !note.trim()) {
      Alert.alert('Not Gerekli', '"Diğer" seçildiğinde ihlali kısaca açıklamanı istiyoruz.');
      scrollRef.current?.scrollToEnd({animated: true});
      setTimeout(() => noteInputRef.current?.focus(), 350);
      return;
    }
    if (!locationData) {
      Alert.alert(
        'Konum Alınamadı',
        'İhbar için konum gerekli. Lütfen konum iznini ayarlardan açın ve tekrar deneyin.',
        [{text: 'Ayarları Aç', onPress: () => Linking.openSettings()}, {text: 'İptal', style: 'cancel'}],
      );
      return;
    }

    try {
      setIsSubmitting(true);
      setUploadProgress(0);
      setUploadStep(`${localPhotoUris.length} fotoğraf yükleniyor...`);

      const progressSlots = new Array(localPhotoUris.length).fill(0);
      const updateOverall = () => {
        const overall = progressSlots.reduce((a, b) => a + b, 0) / localPhotoUris.length;
        setUploadProgress(overall);
      };

      const photoUrls = await Promise.all(
        localPhotoUris.map((uri, i) =>
          StorageService.uploadPhoto(uri, pct => {
            progressSlots[i] = pct;
            updateOverall();
          }),
        ),
      );

      setUploadStep('İhbar kaydediliyor...');
      setUploadProgress(1);

      const location = {
        latitude:      locationData?.latitude      ?? 41.0082,
        longitude:     locationData?.longitude     ?? 28.9784,
        address:       locationData?.address       ?? 'Konum alınamadı',
        district:      locationData?.district      ?? undefined,
        city:          locationData?.city          ?? undefined,
        neighbourhood: locationData?.neighbourhood ?? undefined,
        road:          locationData?.road          ?? undefined,
      };

      const reportId = await FirestoreService.createReport({
        type: selectedType,
        photoUrl: photoUrls[0],
        photoUrls,
        location,
        note: note || undefined,
        points: 15,
      });

      navigation.navigate('Success', {
        reportId,
        photoUrl: photoUrls[0],
        localPhotoUri: localPhotoUris[0],
        type: selectedType,
        location,
        note: note || undefined,
        points: 15,
      });
    } catch (error: any) {
      const msg = error?.message ?? error?.code ?? JSON.stringify(error) ?? 'Bilinmeyen hata';
      Alert.alert('Hata Detayı', msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <View style={styles.container}>
      <Modal visible={showAddCamera} animationType="slide" onRequestClose={() => setShowAddCamera(false)}>
        <View style={styles.cameraModal}>
          {cameraDevice ? (
            <Camera
              ref={addCameraRef}
              style={StyleSheet.absoluteFill}
              device={cameraDevice}
              isActive={showAddCamera}
              photo={true}
              photoQualityBalance="speed"
            />
          ) : (
            <ActivityIndicator color="#fff" size="large" />
          )}
          <View style={[styles.cameraModalTop, {paddingTop: insets.top + 8}]}>
            <TouchableOpacity style={styles.cameraModalClose} onPress={() => setShowAddCamera(false)}>
              <Text style={styles.cameraModalCloseText}>✕</Text>
            </TouchableOpacity>
            <Text style={styles.cameraModalTitle}>Fotoğraf Ekle</Text>
            <View style={{width: 40}} />
          </View>
          <View style={styles.cameraModalBottom}>
            <TouchableOpacity
              style={styles.cameraCapture}
              onPress={handleAddPhoto}
              disabled={isAddCapturing}>
              {isAddCapturing
                ? <ActivityIndicator color={colors.primary} />
                : <View style={[styles.cameraCaptureInner, {backgroundColor: colors.primary}]} />}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <View style={[styles.topBar, {paddingTop: insets.top}]}>
        <BackButton color={colors.text} />
        <View style={styles.stepperWrap}>
          <FlowStepper currentStep={2} />
        </View>
        <View style={styles.exitPlaceholder} />
      </View>

      <ScrollView ref={scrollRef} style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.photoStrip}
          contentContainerStyle={styles.photoStripContent}>
          {localPhotoUris.map((uri, i) => (
            <Image key={i} source={{uri}} style={styles.photoThumb} />
          ))}
          {localPhotoUris.length < 3 && (
            <TouchableOpacity
              style={styles.photoAddBtn}
              activeOpacity={0.7}
              onPress={handleOpenAddCamera}>
              <Text style={styles.photoAddIcon}>＋</Text>
              <Text style={styles.photoAddLabel}>Ekle</Text>
            </TouchableOpacity>
          )}
        </ScrollView>

        <View style={styles.section}>
          <View style={styles.sectionTitleRow}>
            <Text style={styles.sectionTitle}>
              İhlal Tipi <Text style={styles.sectionRequired}>(zorunlu)</Text>
            </Text>
          </View>
          {!selectedType && (
            <Text style={styles.typeHint}>👆 Devam edebilmek için bir ihlal tipi seçmelisin</Text>
          )}
          <View style={styles.typeGrid}>
            {CATEGORY_OPTIONS.map(cat => (
              <TouchableOpacity
                key={cat.value}
                style={[styles.typeButton, selectedType === cat.value && styles.typeButtonSelected]}
                onPress={() => setSelectedType(cat.value)}>
                <Text style={styles.typeIcon}>{cat.icon}</Text>
                <Text style={[styles.typeLabel, selectedType === cat.value && styles.typeLabelSelected]}>
                  {cat.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View style={styles.sectionCompact}>
          <Text style={styles.sectionTitle}>Konum</Text>
          <TouchableOpacity
            style={styles.locationCard}
            disabled={!locationData}
            onPress={() => {
              if (locationData) {
                Linking.openURL(
                  `maps://?q=${locationData.latitude},${locationData.longitude}`,
                ).catch(() =>
                  Linking.openURL(
                    `https://maps.google.com/?q=${locationData.latitude},${locationData.longitude}`,
                  ),
                );
              }
            }}
            activeOpacity={0.7}>
            <Text style={styles.locationIcon}>📍</Text>
            <View style={styles.locationInfo}>
              <Text style={styles.locationText}>
                {locationData ? locationData.address : 'Konum alınıyor...'}
              </Text>
              <Text style={styles.locationSubtext}>
                {locationData
                  ? `GPS alındı ✓  •  ${locationData.latitude.toFixed(4)}, ${locationData.longitude.toFixed(4)}`
                  : 'GPS bekleniyor...'}
              </Text>
            </View>
            {locationData && <Text style={styles.locationArrow}>›</Text>}
          </TouchableOpacity>
        </View>

        <View style={styles.sectionCompact}>
          <Text style={styles.sectionTitle}>
            Not{noteRequired
              ? <Text style={styles.sectionRequired}> (zorunlu)</Text>
              : <Text style={styles.sectionOptional}> (opsiyonel)</Text>}
          </Text>
          <TextInput
            ref={noteInputRef}
            style={[styles.noteInput, noteRequired && !note.trim() && styles.noteInputRequired]}
            placeholder={noteRequired ? 'İhlali kısaca açıkla...' : 'Ek açıklama ekle...'}
            placeholderTextColor={colors.textSecondary}
            value={note}
            onChangeText={setNote}
            multiline
            numberOfLines={4}
            textAlignVertical="top"
          />
        </View>
      </ScrollView>

      <View style={styles.buttonContainer}>
        {isSubmitting ? (
          <View style={styles.progressContainer}>
            <Text style={styles.progressStep}>{uploadStep}</Text>
            <View style={styles.progressTrack}>
              <View style={[styles.progressFill, {width: `${Math.round(uploadProgress * 100)}%`}]} />
            </View>
            <Text style={styles.progressPct}>{Math.round(uploadProgress * 100)}%</Text>
          </View>
        ) : (
          <>
            <View style={styles.hintCard}>
              <Text style={styles.hintPoints}>⚡ +15 puan kazanırsın</Text>
              <Text style={styles.hintLine}>
                İhbarı kaydedersen ve onaylanırsa <Text style={styles.hintBold}>@parkihbar</Text> X hesabında paylaşılır
              </Text>
              <Text style={styles.hintLine}>🔒 Yüzler otomatik bulanıklaştırılır</Text>
            </View>
            <TouchableOpacity
              style={[styles.submitButton, !selectedType && styles.submitButtonDisabled]}
              onPress={handleSubmit}
              disabled={!selectedType}>
              <Text style={styles.submitButtonText}>İhbarı Kaydet</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.homeLink} onPress={handleExit} activeOpacity={0.6}>
              <Text style={styles.homeLinkText}>🏠  Ana Sayfaya Dön</Text>
            </TouchableOpacity>
          </>
        )}
      </View>
    </View>
  );
};

const makeStyles = (colors: Colors) => StyleSheet.create({
  container: {flex: 1, backgroundColor: colors.background},
  topBar: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: colors.card, paddingHorizontal: 4, paddingBottom: 4,
    borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border,
  },
  stepperWrap: {flex: 1},
  exitPlaceholder: {width: 40},
  scrollView: {flex: 1},
  scrollContent: {paddingBottom: 20},
  photoStrip: {flexGrow: 0, backgroundColor: colors.card},
  photoStripContent: {padding: 8, gap: 6},
  photoThumb: {width: 88, height: 66, borderRadius: 10, backgroundColor: colors.border},
  photoAddBtn: {
    width: 88, height: 66, borderRadius: 10,
    backgroundColor: colors.background,
    borderWidth: 2, borderColor: colors.border, borderStyle: 'dashed',
    justifyContent: 'center', alignItems: 'center', gap: 2,
  },
  photoAddIcon: {fontSize: 22, color: colors.primary, fontWeight: '300'},
  photoAddLabel: {fontSize: 10, color: colors.primary, fontWeight: '600'},
  section: {paddingHorizontal: 16, paddingTop: 10, paddingBottom: 4},
  sectionCompact: {paddingHorizontal: 16, paddingTop: 6, paddingBottom: 4},
  sectionTitleRow: {marginBottom: 6},
  sectionTitle: {fontSize: 15, fontWeight: '600', color: colors.text},
  sectionRequired: {fontSize: 13, fontWeight: '600', color: colors.primary},
  sectionOptional: {fontSize: 13, fontWeight: '400', color: colors.textSecondary},
  typeHint: {fontSize: 12, color: colors.textSecondary, marginBottom: 8},
  typeGrid: {flexDirection: 'row', flexWrap: 'wrap', gap: 8},
  typeButton: {
    width: '30%',
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: 8,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  typeButtonSelected: {borderColor: colors.primary, backgroundColor: colors.primaryLight},
  typeIcon: {fontSize: 22, marginBottom: 3},
  typeLabel: {fontSize: 11, fontWeight: '500', color: colors.text, textAlign: 'center'},
  typeLabelSelected: {color: colors.primary, fontWeight: '600'},
  noteInput: {
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: 12,
    fontSize: 15,
    color: colors.text,
    minHeight: 80,
    borderWidth: 1.5,
    borderColor: 'transparent',
  },
  noteInputRequired: {
    borderColor: colors.primary,
  },
  locationCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: 16,
  },
  locationIcon: {fontSize: 24, marginRight: 12},
  locationInfo: {flex: 1},
  locationText: {fontSize: 15, fontWeight: '500', color: colors.text, marginBottom: 4},
  locationSubtext: {fontSize: 12, color: colors.textSecondary},
  locationArrow: {fontSize: 22, color: colors.textSecondary, fontWeight: '300', marginLeft: 8},
  buttonContainer: {
    padding: 20,
    paddingBottom: 36,
    backgroundColor: colors.background,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  submitButton: {backgroundColor: colors.primary, borderRadius: 12, paddingVertical: 14, alignItems: 'center', gap: 2},
  submitButtonDisabled: {backgroundColor: colors.border},
  submitButtonText: {color: colors.background, fontSize: 17, fontWeight: '700'},
  submitButtonSub: {color: 'rgba(255,255,255,0.72)', fontSize: 11},
  hintCard: {
    backgroundColor: colors.card, borderRadius: 12, padding: 14, marginBottom: 12,
    borderLeftWidth: 3, borderLeftColor: colors.primary, gap: 4,
  },
  hintPoints: {fontSize: 14, fontWeight: '700', color: colors.primary},
  hintLine: {fontSize: 12, color: colors.textSecondary, lineHeight: 17},
  hintBold: {fontWeight: '700', color: colors.text},
  homeLink: {
    borderRadius: 12, paddingVertical: 14, alignItems: 'center', marginTop: 10,
    borderWidth: 1.5, borderColor: colors.primary + '55',
    backgroundColor: colors.primaryLight,
  },
  homeLinkText: {fontSize: 15, fontWeight: '600', color: colors.primary},
  progressContainer: {backgroundColor: colors.card, borderRadius: 12, padding: 20, alignItems: 'center'},
  progressStep: {fontSize: 15, fontWeight: '600', color: colors.text, marginBottom: 12},
  progressTrack: {
    width: '100%',
    height: 10,
    backgroundColor: colors.border,
    borderRadius: 5,
    overflow: 'hidden',
    marginBottom: 8,
  },
  progressFill: {height: '100%', backgroundColor: colors.primary, borderRadius: 5},
  progressPct: {fontSize: 13, color: colors.textSecondary, fontWeight: '500'},
  cameraModal: {flex: 1, backgroundColor: '#000', justifyContent: 'space-between'},
  cameraModalTop: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingBottom: 12,
  },
  cameraModalClose: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center',
  },
  cameraModalCloseText: {color: '#FFF', fontSize: 18, fontWeight: 'bold'},
  cameraModalTitle: {color: '#FFF', fontSize: 16, fontWeight: '600'},
  cameraModalBottom: {
    backgroundColor: 'rgba(0,0,0,0.65)',
    paddingVertical: 32, alignItems: 'center',
  },
  cameraCapture: {
    width: 74, height: 74, borderRadius: 37,
    backgroundColor: '#FFF', justifyContent: 'center', alignItems: 'center',
    borderWidth: 4, borderColor: 'rgba(255,255,255,0.5)',
  },
  cameraCaptureInner: {width: 58, height: 58, borderRadius: 29},
});
