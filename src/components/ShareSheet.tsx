import React, {useState, useMemo} from 'react';
import {View, Text, TouchableOpacity, StyleSheet, Alert, Linking} from 'react-native';
import RNShare, {Social} from 'react-native-share';
import FontAwesome6 from 'react-native-vector-icons/FontAwesome6';
import Clipboard from '@react-native-clipboard/clipboard';
import {useNavigation} from '@react-navigation/native';
import {useTheme, Colors} from '../theme/ThemeContext';
import {getTemplate} from '../constants/reportTemplates';
import {generateMessage, ShareInfo} from '../utils/messageGenerator';

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

  // ── X DM → @parkihbar ────────────────────────────────────────────────────
  // X uygulaması (v11.42+) iOS deep link sistemini kırdı — tüm URL şemaları
  // ana sayfaya düşüyor. Mesajı kopyala + adım adım talimat göster.
  const handleX = async () => {
    const message = generateMessage(info, 'twitter');
    Clipboard.setString(message);
    Alert.alert(
      '📋 Mesaj Kopyalandı!',
      'X uygulamasında @parkihbar\'a DM göndermek için:\n\n1. Aşağıdaki "X\'i Aç" tuşuna bas\n2. Arama çubuğuna @parkihbar yaz\n3. Profilden "Mesaj" ikonuna bas\n4. Mesaj kutusuna uzun bas → Yapıştır\n5. Fotoğrafı ekle ve gönder',
      [
        {
          text: "X'i Aç",
          onPress: () => openURL('twitter://').catch(() => openURL('https://x.com')),
        },
        {text: 'Kapat', style: 'cancel'},
      ],
    );
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
      onPress: handleEGM,
      bg: '#C0392B',
      icon: <Text style={styles.emoji}>🌐</Text>,
      title: 'EGM İhbar Formu',
      sub: 'İl · ilçe · adres otomatik doldurulur — resmi polis kaydı',
    },
    {
      onPress: handleZabita,
      bg: '#2980B9',
      icon: <Text style={styles.emoji}>📞</Text>,
      title: 'Zabıta Çağır — 153',
      sub: 'Anlık müdahale için belediye zabıta hattı',
    },
    {
      onPress: handleWhatsApp,
      bg: '#25D366',
      icon: <FontAwesome6 name="whatsapp" brand size={22} color="#FFF" />,
      title: 'WhatsApp\'ta Paylaş',
      sub: 'Metin + konum + fotoğraf linki hazır',
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
      title: 'X\'te Paylaş',
      sub: 'Mesaj kopyalanır, X uygulaması açılır',
    },
  ];

  return (
    <View style={styles.container}>
      {/* parkihbar otomatik yayın kartı */}
      <View style={styles.pipelineCard}>
        <View style={styles.pipelineIconWrap}>
          <Text style={styles.pipelineIcon}>𝕏</Text>
        </View>
        <View style={styles.pipelineTextWrap}>
          <Text style={styles.pipelineTitle}>parkihbar Otomatik Yayın</Text>
          <Text style={styles.pipelineSub}>
            İhbarın inceleniyor — onaylanırsa <Text style={styles.pipelineHandle}>@parkihbar</Text> X hesabında yayınlanacak
          </Text>
        </View>
        <View style={styles.pipelineStatus}>
          <View style={styles.pipelineDot} />
        </View>
      </View>

      <Text style={styles.sectionTitle}>EK ADIMLAR · YETKİLİLERE İLET</Text>

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
    </View>
  );
};

const makeStyles = (colors: Colors) =>
  StyleSheet.create({
    container: {width: '100%'},
    // parkihbar pipeline card
    pipelineCard: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: '#000',
      borderRadius: 14,
      padding: 14,
      marginBottom: 16,
      gap: 12,
    },
    pipelineIconWrap: {
      width: 44, height: 44, borderRadius: 12,
      backgroundColor: '#1a1a1a',
      justifyContent: 'center', alignItems: 'center',
    },
    pipelineIcon: {fontSize: 20, color: '#FFF', fontWeight: '700'},
    pipelineTextWrap: {flex: 1},
    pipelineTitle: {fontSize: 14, fontWeight: '700', color: '#FFF', marginBottom: 3},
    pipelineSub: {fontSize: 12, color: 'rgba(255,255,255,0.6)', lineHeight: 16},
    pipelineHandle: {color: '#FFF', fontWeight: '600'},
    pipelineStatus: {justifyContent: 'center', alignItems: 'center'},
    pipelineDot: {
      width: 8, height: 8, borderRadius: 4,
      backgroundColor: '#43A047',
    },
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
