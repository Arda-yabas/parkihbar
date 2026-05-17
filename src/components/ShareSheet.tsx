import React, {useState, useMemo} from 'react';
import {View, Text, TouchableOpacity, StyleSheet, Alert, Linking} from 'react-native';
import RNShare, {Social} from 'react-native-share';
import FontAwesome6 from 'react-native-vector-icons/FontAwesome6';
import Clipboard from '@react-native-clipboard/clipboard';
import {useNavigation} from '@react-navigation/native';
import {useTheme, Colors} from '../theme/ThemeContext';
import {getTemplate} from '../constants/reportTemplates';
import {generateMessage, ShareInfo} from '../utils/messageGenerator';
import {ReportCardModal} from './ReportCardModal';

interface Props {
  info: ShareInfo;
}

const openURL = (url: string): Promise<boolean> =>
  Linking.openURL(url).then(() => true).catch(() => false);

// react-native-share hataları — iptal ve "uygulama yok" sessizce geçilir
const isSilentError = (e: any): boolean => {
  const msg: string = e?.message ?? e?.error ?? '';
  return (
    msg.includes('User did not share') ||
    msg.includes('cancelled') ||
    msg.includes('cancel') ||
    msg.includes('dismissed')
  );
};

export const ShareSheet: React.FC<Props> = ({info}) => {
  const {colors} = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const navigation = useNavigation();
  const [toast, setToast] = useState('');
  const [cardModalVisible, setCardModalVisible] = useState(false);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(''), 2500);
  };

  const photo = info.localPhotoUri;
  const photoOpts = photo
    ? {url: photo, type: 'image/jpeg' as const}
    : {};

  // ── WhatsApp ─────────────────────────────────────────────────────────────
  // iOS'ta react-native-share ile WhatsApp'a resim+metin aynı anda gönderilemiyor
  // (WhatsApp platformu kısıtlaması). URL scheme ile tam metin + fotoğraf linki gönderiyoruz.
  const handleWhatsApp = async () => {
    const message = generateMessage(info, 'whatsapp');
    const opened = await openURL(`whatsapp://send?text=${encodeURIComponent(message)}`);
    if (!opened) Alert.alert('WhatsApp Bulunamadı', 'Cihazınızda WhatsApp yüklü değil.');
  };

  // ── X (Twitter) DM → @parkihbar (ID: 2054192104872587265) ──────────────
  const handleX = async () => {
    const message = generateMessage(info, 'twitter');
    const dmUrl = `twitter://messages/compose?recipient_id=2054192104872587265&text=${encodeURIComponent(message)}`;
    const appOpened = await openURL(dmUrl);
    if (!appOpened) {
      // X yüklü değil → mesajı kopyala + web profil aç
      Clipboard.setString(message);
      await openURL('https://x.com/parkihbar');
      showToast('Mesaj kopyalandı — X\'te yapıştırın');
    }
  };

  // ── E-posta ──────────────────────────────────────────────────────────────
  const handleEmail = async () => {
    const template = getTemplate(info.type);
    const subject = `${template.emoji} ${template.title} - parkihbar`;
    const message = generateMessage(info, 'email');
    try {
      await RNShare.shareSingle({
        social: Social.Email,
        subject,
        message,
        ...photoOpts,
      });
    } catch (e: any) {
      if (isSilentError(e)) return;
      // Fallback: Gmail → mailto
      const gmailOpened = await openURL(
        `googlegmail://co?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(message)}`,
      );
      if (!gmailOpened) {
        await openURL(
          `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(message)}`,
        );
      }
    }
  };

  // ── EGM ──────────────────────────────────────────────────────────────────
  const handleEGM = () => {
    (navigation as any).navigate('EGMWebView', {info});
  };

  // ── Zabıta ───────────────────────────────────────────────────────────────
  const handleZabita = () => {
    Alert.alert('Zabıta Çağır', '153 numaralı zabıta hattını aramak istiyor musunuz?', [
      {text: 'Ara', onPress: () => openURL('tel:153')},
      {text: 'İptal', style: 'cancel'},
    ]);
  };

  const buttons = [
    {
      onPress: () => setCardModalVisible(true),
      bg: '#C13584',
      icon: <FontAwesome6 name="instagram" brand size={22} color="#FFF" />,
      title: 'Instagram İhbar Kartı',
      sub: 'Fotoğraf + bilgi kartı oluştur, galeriye kaydet veya paylaş',
    },
    {
      onPress: handleEmail,
      bg: '#EA4335',
      icon: <Text style={styles.emoji}>✉️</Text>,
      title: 'E-posta Gönder',
      sub: 'Fotoğraf ek + konum + detay ile gönder',
    },
    {
      onPress: handleX,
      bg: '#000000',
      icon: <FontAwesome6 name="x-twitter" brand size={20} color="#FFF" />,
      title: 'X\'te DM Gönder',
      sub: 'X uygulaması açılır, DM hazır gelir',
    },
    {
      onPress: handleEGM,
      bg: '#C0392B',
      icon: <Text style={styles.emoji}>🌐</Text>,
      title: 'EGM İhbar Formu',
      sub: 'Adres ve olay detayı otomatik doldurulur',
    },
    {
      onPress: handleZabita,
      bg: '#2980B9',
      icon: <Text style={styles.emoji}>📞</Text>,
      title: 'Zabıta Çağır — 153',
      sub: 'Belediye zabıta hattı',
    },
    {
      onPress: handleWhatsApp,
      bg: '#25D366',
      icon: <FontAwesome6 name="whatsapp" brand size={22} color="#FFF" />,
      title: 'WhatsApp\'ta Paylaş',
      sub: 'Metin + konum + fotoğraf linki hazır',
    },
  ];

  return (
    <View style={styles.container}>
      <Text style={styles.sectionTitle}>SOSYAL MEDYADA PAYLAŞ · YETKİLİLERE İLET</Text>

      {toast !== '' && (
        <View style={styles.toast}>
          <Text style={styles.toastText}>{toast}</Text>
        </View>
      )}

      {buttons.map((btn, i) => (
        <TouchableOpacity
          key={i}
          style={[styles.row, i === buttons.length - 1 && styles.lastRow]}
          onPress={btn.onPress}
          activeOpacity={0.75}>
          <View style={[styles.logoBox, {backgroundColor: btn.bg}]}>
            {btn.icon}
          </View>
          <View style={styles.textWrap}>
            <Text style={styles.rowTitle}>{btn.title}</Text>
            <Text style={styles.rowSub}>{btn.sub}</Text>
          </View>
          <Text style={styles.arrow}>›</Text>
        </TouchableOpacity>
      ))}

      <ReportCardModal
        visible={cardModalVisible}
        onClose={() => setCardModalVisible(false)}
        info={info}
      />
    </View>
  );
};

const makeStyles = (colors: Colors) =>
  StyleSheet.create({
    container: {width: '100%'},
    sectionTitle: {
      fontSize: 11,
      fontWeight: '700',
      color: colors.textSecondary,
      letterSpacing: 1.2,
      marginBottom: 12,
    },
    toast: {
      backgroundColor: colors.text,
      borderRadius: 10,
      paddingHorizontal: 16,
      paddingVertical: 10,
      marginBottom: 12,
      alignSelf: 'center',
    },
    toastText: {color: colors.background, fontSize: 13, fontWeight: '500'},
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.card,
      borderRadius: 14,
      padding: 14,
      marginBottom: 10,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: colors.border,
    },
    lastRow: {marginBottom: 0},
    logoBox: {
      width: 44,
      height: 44,
      borderRadius: 12,
      justifyContent: 'center',
      alignItems: 'center',
      marginRight: 14,
    },
    emoji: {fontSize: 22},
    textWrap: {flex: 1},
    rowTitle: {fontSize: 15, fontWeight: '600', color: colors.text, marginBottom: 2},
    rowSub: {fontSize: 12, color: colors.textSecondary},
    arrow: {fontSize: 22, color: colors.textSecondary, fontWeight: '300', marginLeft: 8},
  });
