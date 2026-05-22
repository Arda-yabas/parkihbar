import React, {useState, useEffect, useMemo} from 'react';
import {StyleSheet, View, Text, TextInput, ScrollView, TouchableOpacity, Image, Alert, ActivityIndicator, Linking} from 'react-native';
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
  const {photoUris} = route.params;

  const [selectedType, setSelectedType] = useState<string | null>(null);
  const [note, setNote] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadStep, setUploadStep] = useState('');
  const [locationData, setLocationData] = useState<LocationData | null>(null);

  useEffect(() => {
    LocationService.getCurrentLocation()
      .then(setLocationData)
      .catch(() => {});
  }, []);

  const handleExit = () => {
    navigation.reset({index: 0, routes: [{name: 'Camera'}]});
    (navigation as any).getParent()?.navigate('Dashboard');
  };

  const handleSubmit = async () => {
    if (!selectedType) {
      Alert.alert('Eksik Bilgi', 'Lütfen ihlal tipini seçin');
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
      setUploadStep(`${photoUris.length} fotoğraf yükleniyor...`);

      // Upload all photos in parallel — each tracks its own progress slot
      const progressSlots = new Array(photoUris.length).fill(0);
      const updateOverall = () => {
        const overall = progressSlots.reduce((a, b) => a + b, 0) / photoUris.length;
        setUploadProgress(overall);
      };

      const photoUrls = await Promise.all(
        photoUris.map((uri, i) =>
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
        localPhotoUri: photoUris[0],
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
      <View style={[styles.topBar, {paddingTop: insets.top}]}>
        <BackButton color={colors.text} />
        <View style={styles.stepperWrap}>
          <FlowStepper currentStep={2} />
        </View>
        <View style={styles.exitPlaceholder} />
      </View>
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.photoStrip}
          contentContainerStyle={styles.photoStripContent}>
          {photoUris.map((uri, i) => (
            <Image key={i} source={{uri}} style={styles.photoThumb} />
          ))}
          {photoUris.length < 3 && (
            <TouchableOpacity
              style={styles.photoAddBtn}
              activeOpacity={0.7}
              onPress={() => (navigation as any).navigate('Camera', {existingPhotoUris: photoUris})}>
              <Text style={styles.photoAddIcon}>＋</Text>
              <Text style={styles.photoAddLabel}>Ekle</Text>
            </TouchableOpacity>
          )}
        </ScrollView>

        <View style={styles.section}>
          <View style={styles.sectionTitleRow}>
            <Text style={styles.sectionTitle}>İhlal Tipi</Text>
            <Text style={styles.sectionRequired}>* zorunlu</Text>
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

        <View style={styles.section}>
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

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Not (Opsiyonel)</Text>
          <TextInput
            style={styles.noteInput}
            placeholder="Ek açıklama ekle..."
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
                Onaylanırsa <Text style={styles.hintBold}>@parkihbar</Text> X hesabında paylaşılır
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
              <Text style={styles.homeLinkText}>Ana Sayfaya Dön</Text>
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
  sectionTitleRow: {flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6},
  sectionTitle: {fontSize: 15, fontWeight: '600', color: colors.text},
  sectionRequired: {fontSize: 11, fontWeight: '600', color: colors.primary},
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
    minHeight: 72,
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
  submitButton: {backgroundColor: colors.primary, borderRadius: 12, paddingVertical: 16, alignItems: 'center'},
  submitButtonDisabled: {backgroundColor: colors.border},
  submitButtonText: {color: colors.background, fontSize: 17, fontWeight: '700'},
  homeLink: {alignItems: 'center', paddingVertical: 14},
  homeLinkText: {fontSize: 14, color: colors.textSecondary, fontWeight: '500'},
  hintCard: {
    backgroundColor: colors.card, borderRadius: 12, padding: 14, marginBottom: 12,
    borderLeftWidth: 3, borderLeftColor: colors.primary, gap: 4,
  },
  hintPoints: {fontSize: 14, fontWeight: '700', color: colors.primary},
  hintLine: {fontSize: 12, color: colors.textSecondary, lineHeight: 17},
  hintBold: {fontWeight: '700', color: colors.text},
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
});
