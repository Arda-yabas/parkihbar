import React, {useRef, useState, useCallback} from 'react';
import {
  Modal,
  View,
  Text,
  Image,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  Alert,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import {captureRef} from 'react-native-view-shot';
import {CameraRoll} from '@react-native-camera-roll/camera-roll';
import RNShare, {Social} from 'react-native-share';
import {getTemplate} from '../constants/reportTemplates';
import {ShareInfo} from '../utils/messageGenerator';
import {useTheme} from '../theme/ThemeContext';

const {width: SCREEN_WIDTH} = Dimensions.get('window');
const CARD_WIDTH = SCREEN_WIDTH;
const CARD_HEIGHT = CARD_WIDTH * (5 / 4);
const PHOTO_HEIGHT = CARD_HEIGHT * 0.7;
const BAND_HEIGHT = CARD_HEIGHT * 0.3;

interface Props {
  visible: boolean;
  onClose: () => void;
  info: ShareInfo;
}

const isSilentError = (e: any): boolean => {
  const msg: string = e?.message ?? e?.error ?? '';
  return (
    msg.includes('User did not share') ||
    msg.includes('cancelled') ||
    msg.includes('cancel') ||
    msg.includes('dismissed')
  );
};

export const ReportCardModal: React.FC<Props> = ({visible, onClose, info}) => {
  const {colors} = useTheme();
  const cardRef = useRef<View>(null);
  const [loading, setLoading] = useState(false);
  const [imageReady, setImageReady] = useState(false);
  const [capturedUri, setCapturedUri] = useState<string | null>(null);

  const template = getTemplate(info.type);

  const now = new Date();
  const formattedDate = now.toLocaleDateString('tr-TR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
  const formattedTime = now.toLocaleTimeString('tr-TR', {
    hour: '2-digit',
    minute: '2-digit',
  });

  const locationStr =
    [info.location.district, info.location.city]
      .filter(v => v && v.trim())
      .join(', ') || info.location.address;

  const photoSource = info.localPhotoUri || info.photoUrl;

  // Capture the card view as a file
  const getCardUri = useCallback(async (): Promise<string | null> => {
    if (capturedUri) return capturedUri;
    if (!imageReady) {
      Alert.alert('Bekleyin', 'Fotoğraf henüz yüklenmedi, lütfen bekleyin.');
      return null;
    }
    try {
      // Wait one frame so the layout is fully settled
      await new Promise(resolve => setTimeout(resolve, 150));
      const uri = await captureRef(cardRef, {
        format: 'jpg',
        quality: 0.92,
        result: 'tmpfile',
      });
      setCapturedUri(uri);
      return uri;
    } catch (e: any) {
      Alert.alert('Hata', `Kart oluşturulamadı: ${e?.message ?? 'Bilinmeyen hata'}`);
      return null;
    }
  }, [capturedUri, imageReady]);

  const handleSave = async () => {
    setLoading(true);
    try {
      const uri = await getCardUri();
      if (!uri) return;
      await CameraRoll.save(uri, {type: 'photo'});
      Alert.alert(
        'Kaydedildi ✓',
        'Kart galerinize kaydedildi. Instagram, WhatsApp veya istediğiniz uygulamadan paylaşabilirsiniz.',
      );
    } catch (e: any) {
      Alert.alert('Hata', `Galeriye kaydedilemedi: ${e?.message ?? 'İzin verilmedi'}`);
    } finally {
      setLoading(false);
    }
  };

  const handleInstagramPost = async () => {
    setLoading(true);
    try {
      const uri = await getCardUri();
      if (!uri) return;
      // react-native-share expects file:// prefix
      const shareUri = uri.startsWith('file://') ? uri : `file://${uri}`;
      await RNShare.shareSingle({
        social: Social.Instagram,
        url: shareUri,
        type: 'image/jpeg',
      });
    } catch (e: any) {
      if (isSilentError(e)) return;
      // Fallback: save to gallery
      try {
        const uri = capturedUri;
        if (uri) await CameraRoll.save(uri, {type: 'photo'});
        Alert.alert('Kaydedildi', 'Instagram açılamadı. Kart galerinize kaydedildi.');
      } catch {}
    } finally {
      setLoading(false);
    }
  };

  const handleInstagramStory = async () => {
    setLoading(true);
    try {
      const uri = await getCardUri();
      if (!uri) return;
      const shareUri = uri.startsWith('file://') ? uri : `file://${uri}`;
      await RNShare.shareSingle({
        social: Social.InstagramStories,
        backgroundImage: shareUri,
        backgroundTopColor: '#1C1C1E',
        backgroundBottomColor: '#2C2C2E',
        appId: '',
      } as any);
    } catch (e: any) {
      if (isSilentError(e)) return;
      try {
        const uri = capturedUri;
        if (uri) await CameraRoll.save(uri, {type: 'photo'});
        Alert.alert('Kaydedildi', 'Instagram açılamadı. Kart galerinize kaydedildi.');
      } catch {}
    } finally {
      setLoading(false);
    }
  };

  // Reset state when modal closes
  const handleClose = () => {
    setCapturedUri(null);
    setImageReady(false);
    onClose();
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={handleClose}>
      <View style={styles.overlay}>
        <View style={[styles.sheet, {backgroundColor: colors.background}]}>
          <View style={styles.handleBar} />
          <Text style={[styles.sheetTitle, {color: colors.text}]}>
            İhbar Kartı Önizleme
          </Text>

          {/* ── Card — outside ScrollView so captureRef works cleanly ── */}
          <View
            ref={cardRef}
            style={styles.card}
            collapsable={false}>
            {!imageReady && (
              <View style={styles.imageLoading}>
                <ActivityIndicator color="#FFF" />
              </View>
            )}
            <Image
              source={{uri: photoSource}}
              style={styles.photo}
              resizeMode="cover"
              onLoadEnd={() => setImageReady(true)}
            />
            <View style={styles.band}>
              <View style={styles.bandTop}>
                <View style={styles.typeRow}>
                  <Text style={styles.typeEmoji}>{template.emoji}</Text>
                  <Text style={styles.typeTitle} numberOfLines={1}>
                    {template.title}
                  </Text>
                </View>
                <View style={styles.infoRow}>
                  <Text style={styles.infoIcon}>📍</Text>
                  <Text style={styles.infoText} numberOfLines={2}>
                    {locationStr}
                  </Text>
                </View>
                <View style={styles.infoRow}>
                  <Text style={styles.infoIcon}>📅</Text>
                  <Text style={styles.infoText}>
                    {formattedDate}  ·  {formattedTime}
                  </Text>
                </View>
              </View>
              <View style={styles.bandFooter}>
                <Text style={styles.hashtags} numberOfLines={1}>
                  {template.hashtags}
                </Text>
                <Text style={styles.brand}>parkihbar ↗</Text>
              </View>
            </View>
          </View>

          {/* ── Buttons — inside ScrollView ── */}
          <ScrollView
            style={styles.scroll}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}>
            <View style={styles.buttons}>
              <TouchableOpacity
                style={[styles.btn, styles.btnInstagram, !imageReady && styles.btnDisabled]}
                onPress={handleInstagramPost}
                disabled={loading || !imageReady}
                activeOpacity={0.8}>
                <Text style={styles.btnText}>📸  Instagram Gönderi</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.btn, styles.btnStory, !imageReady && styles.btnDisabled]}
                onPress={handleInstagramStory}
                disabled={loading || !imageReady}
                activeOpacity={0.8}>
                <Text style={styles.btnText}>✨  Instagram Story</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.btn, styles.btnSave, {borderColor: colors.border}, !imageReady && styles.btnDisabled]}
                onPress={handleSave}
                disabled={loading || !imageReady}
                activeOpacity={0.8}>
                <Text style={[styles.btnText, {color: colors.text}]}>
                  💾  Galeriye Kaydet
                </Text>
              </TouchableOpacity>

              {loading && (
                <ActivityIndicator style={{marginTop: 8}} color={colors.primary} />
              )}

              {!imageReady && (
                <Text style={[styles.loadingHint, {color: colors.textSecondary}]}>
                  Fotoğraf yükleniyor...
                </Text>
              )}

              <TouchableOpacity
                style={styles.closeBtn}
                onPress={handleClose}
                activeOpacity={0.7}>
                <Text style={[styles.closeBtnText, {color: colors.textSecondary}]}>
                  Kapat
                </Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'flex-end',
  },
  sheet: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '95%',
  },
  handleBar: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#D1D1D6',
    alignSelf: 'center',
    marginTop: 10,
    marginBottom: 4,
  },
  sheetTitle: {
    fontSize: 17,
    fontWeight: '700',
    textAlign: 'center',
    paddingVertical: 10,
  },
  // Card — outside ScrollView
  card: {
    width: CARD_WIDTH,
    height: CARD_HEIGHT,
    backgroundColor: '#000',
    overflow: 'hidden',
  },
  imageLoading: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: PHOTO_HEIGHT,
    backgroundColor: '#222',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1,
  },
  photo: {
    width: CARD_WIDTH,
    height: PHOTO_HEIGHT,
  },
  band: {
    height: BAND_HEIGHT,
    backgroundColor: '#111',
    paddingHorizontal: 20,
    paddingTop: 14,
    paddingBottom: 12,
    justifyContent: 'space-between',
  },
  bandTop: {gap: 6},
  typeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  typeEmoji: {fontSize: 22},
  typeTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: '#FFF',
    letterSpacing: 0.5,
    flex: 1,
  },
  infoRow: {flexDirection: 'row', alignItems: 'flex-start', gap: 6},
  infoIcon: {fontSize: 13, marginTop: 1},
  infoText: {fontSize: 13, color: '#DDD', flex: 1, lineHeight: 18},
  bandFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 4,
  },
  hashtags: {fontSize: 12, color: '#AAA', flex: 1},
  brand: {fontSize: 13, fontWeight: '700', color: '#FFF', opacity: 0.9},
  // Buttons
  scroll: {flexShrink: 1},
  scrollContent: {paddingBottom: 20},
  buttons: {paddingHorizontal: 20, paddingTop: 16, gap: 10},
  btn: {
    borderRadius: 14,
    paddingVertical: 15,
    alignItems: 'center',
  },
  btnDisabled: {opacity: 0.5},
  btnInstagram: {backgroundColor: '#C13584'},
  btnStory: {backgroundColor: '#833AB4'},
  btnSave: {backgroundColor: 'transparent', borderWidth: 1.5},
  btnText: {fontSize: 15, fontWeight: '700', color: '#FFF'},
  loadingHint: {fontSize: 13, textAlign: 'center', marginTop: 4},
  closeBtn: {alignItems: 'center', paddingVertical: 12},
  closeBtnText: {fontSize: 15},
});
