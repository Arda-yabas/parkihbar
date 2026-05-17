import React, {useState, useCallback, useMemo} from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Switch,
  Alert,
  Linking,
  Platform,
  StyleSheet,
  StatusBar,
} from 'react-native';
import {useNavigation, useFocusEffect} from '@react-navigation/native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {BackButton} from '../../../components/BackButton';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  check,
  checkNotifications,
  request,
  requestNotifications,
  openSettings,
  PERMISSIONS,
  RESULTS,
  Permission,
} from 'react-native-permissions';

const POST_NOTIFICATIONS = 'android.permission.POST_NOTIFICATIONS' as Permission;
import firestore from '@react-native-firebase/firestore';
import {AuthService} from '../../../services/firebase';
import {useTheme, Colors} from '../../../theme/ThemeContext';

const VERSION = '1.0.0';

type PermKey = 'location' | 'camera' | 'notification';

export const SettingsScreen = () => {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const {colors, isDark, toggleTheme} = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);

  const [userName, setUserName] = useState('');
  const [avatar, setAvatar] = useState('😎');
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [isProfilePublic, setIsProfilePublic] = useState(true);
  const [perms, setPerms] = useState<Record<PermKey, boolean>>({
    location: false,
    camera: false,
    notification: false,
  });

  useFocusEffect(
    useCallback(() => {
      loadData();
      checkPerms();
    }, []),
  );

  const loadData = async () => {
    const pairs = await AsyncStorage.multiGet([
      '@username', '@avatar', '@anonymous', '@profile_public',
    ]);
    if (pairs[0][1]) setUserName(pairs[0][1]);
    if (pairs[1][1]) setAvatar(pairs[1][1]);
    setIsAnonymous(pairs[2][1] === 'true');
    setIsProfilePublic(pairs[3][1] !== 'false');
  };

  const checkPerms = async () => {
    const locationStatus = await check(
      Platform.OS === 'ios'
        ? PERMISSIONS.IOS.LOCATION_WHEN_IN_USE
        : PERMISSIONS.ANDROID.ACCESS_FINE_LOCATION,
    );
    const cameraStatus = await check(
      Platform.OS === 'ios' ? PERMISSIONS.IOS.CAMERA : PERMISSIONS.ANDROID.CAMERA,
    );

    let notifGranted = false;
    if (Platform.OS === 'ios') {
      const {status} = await checkNotifications();
      notifGranted = status === RESULTS.GRANTED;
    } else {
      const v = typeof Platform.Version === 'string'
        ? parseInt(Platform.Version, 10) : Platform.Version;
      if (v < 33) {
        notifGranted = true;
      } else {
        const ns = await check(POST_NOTIFICATIONS);
        notifGranted = ns === RESULTS.GRANTED;
      }
    }

    setPerms({
      location: locationStatus === RESULTS.GRANTED,
      camera: cameraStatus === RESULTS.GRANTED,
      notification: notifGranted,
    });
  };

  const requestPerm = async (key: PermKey) => {
    if (key === 'notification') {
      if (Platform.OS === 'ios') {
        const res = await requestNotifications(['alert', 'sound', 'badge']);
        setPerms(p => ({...p, notification: res.status === RESULTS.GRANTED}));
        return;
      }
      const v = typeof Platform.Version === 'string'
        ? parseInt(Platform.Version, 10) : Platform.Version;
      if (v < 33) { setPerms(p => ({...p, notification: true})); return; }
      const ns = await check(POST_NOTIFICATIONS);
      if (ns === RESULTS.BLOCKED) { openSettings(); return; }
      const result = await request(POST_NOTIFICATIONS);
      setPerms(p => ({...p, notification: result === RESULTS.GRANTED}));
      return;
    }

    const perm = Platform.OS === 'ios'
      ? key === 'location' ? PERMISSIONS.IOS.LOCATION_WHEN_IN_USE : PERMISSIONS.IOS.CAMERA
      : key === 'location' ? PERMISSIONS.ANDROID.ACCESS_FINE_LOCATION : PERMISSIONS.ANDROID.CAMERA;

    const current = await check(perm);
    if (current === RESULTS.BLOCKED) {
      Alert.alert('İzin Engellendi', 'Ayarlardan izni açabilirsin.', [
        {text: 'İptal', style: 'cancel'},
        {text: 'Ayarları Aç', onPress: () => openSettings()},
      ]);
      return;
    }
    const result = await request(perm);
    setPerms(p => ({...p, [key]: result === RESULTS.GRANTED}));
  };

  const getUserId = () => AuthService.getCurrentUser()?.uid ?? null;

  const toggleAnonymous = async (val: boolean) => {
    setIsAnonymous(val);
    await AsyncStorage.setItem('@anonymous', val.toString());
    const uid = getUserId();
    if (uid) {
      await firestore().collection('users').doc(uid).update({anonymous: val}).catch(() => {});
    }
  };

  const toggleProfilePublic = async (val: boolean) => {
    setIsProfilePublic(val);
    await AsyncStorage.setItem('@profile_public', val.toString());
    const uid = getUserId();
    if (uid) {
      await firestore().collection('users').doc(uid).update({profilePublic: val}).catch(() => {});
    }
  };

  const handleLogout = () => {
    Alert.alert('Çıkış Yap', 'Hesabından çıkmak istediğine emin misin?', [
      {text: 'İptal', style: 'cancel'},
      {
        text: 'Çıkış Yap',
        style: 'destructive',
        onPress: async () => {
          await AsyncStorage.multiRemove([
            '@onboarding_completed', '@username', '@avatar',
            '@anonymous', '@profile_public', '@selected_cause',
          ]);
          await AuthService.signOut().catch(() => {});
        },
      },
    ]);
  };

  const handleDeleteAccount = () => {
    Alert.alert(
      'Hesabı Sil',
      'Tüm verilerinin silineceğini, bunun geri alınamayacağını onaylıyor musun?',
      [
        {text: 'İptal', style: 'cancel'},
        {
          text: 'Sil',
          style: 'destructive',
          onPress: async () => {
            const uid = getUserId();
            if (uid) {
              await firestore().collection('users').doc(uid).delete().catch(() => {});
            }
            await AsyncStorage.clear();
            await AuthService.signOut().catch(() => {});
          },
        },
      ],
    );
  };

  const openNotificationSettings = () => {
    if (Platform.OS === 'ios') {
      Linking.openURL('app-settings:');
    } else {
      Linking.sendIntent('android.settings.APP_NOTIFICATION_SETTINGS', [
        {key: 'android.provider.extra.APP_PACKAGE', value: 'com.ardayabas.parkihbar'},
      ]).catch(() => openSettings());
    }
  };

  return (
    <View style={[styles.container, {paddingTop: insets.top}]}>
      <StatusBar
        barStyle={isDark ? 'light-content' : 'dark-content'}
        backgroundColor={colors.background}
      />

      {/* Başlık */}
      <View style={styles.header}>
        <BackButton />
        <Text style={styles.headerTitle}>Ayarlar</Text>
        <View style={styles.backBtn} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>

        {/* Profil */}
        <SectionHeader title="👤 PROFİL" styles={styles} />
        <View style={styles.card}>
          <Row icon="😀" label="Avatar" value={avatar} onPress={() => navigation.navigate('Profile' as never)} styles={styles} />
          <Divider styles={styles} />
          <Row icon="✏️" label="İsim" value={userName || '—'} onPress={() => navigation.navigate('Profile' as never)} styles={styles} />
        </View>

        {/* Görünüm */}
        <SectionHeader title="🌙 GÖRÜNÜM" styles={styles} />
        <View style={styles.card}>
          <SwitchRow
            icon={isDark ? '🌙' : '☀️'}
            label="Karanlık Mod"
            desc={isDark ? 'Karanlık tema aktif' : 'Aydınlık tema aktif'}
            value={isDark}
            onValueChange={toggleTheme}
            colors={colors}
            styles={styles}
          />
        </View>

        {/* Gizlilik */}
        <SectionHeader title="🔒 GİZLİLİK" styles={styles} />
        <View style={styles.card}>
          <SwitchRow
            icon="🕶️"
            label="Anonim İhbar"
            desc="İhbarlarında ismin gizlenir"
            value={isAnonymous}
            onValueChange={toggleAnonymous}
            colors={colors}
            styles={styles}
          />
          <Divider styles={styles} />
          <SwitchRow
            icon="👁️"
            label="Profil Herkese Açık"
            desc="Lider tablosunda görünürsün"
            value={isProfilePublic}
            onValueChange={toggleProfilePublic}
            colors={colors}
            styles={styles}
          />
        </View>

        {/* İzinler */}
        <SectionHeader title="🛡️ İZİNLER" styles={styles} />
        <View style={styles.card}>
          {([
            {key: 'location' as PermKey,     icon: '📍', label: 'Konum',      desc: 'İhbara konum eklemek için'},
            {key: 'camera' as PermKey,       icon: '📷', label: 'Kamera',     desc: 'İhlalleri fotoğraflamak için'},
            {key: 'notification' as PermKey, icon: '🔔', label: 'Bildirimler', desc: 'İhbar onayı ve rozetler'},
          ] as const).map((p, i) => (
            <React.Fragment key={p.key}>
              {i > 0 && <Divider styles={styles} />}
              <View style={styles.permRow}>
                <Text style={styles.rowIcon}>{p.icon}</Text>
                <View style={styles.rowInfo}>
                  <Text style={styles.rowLabel}>{p.label}</Text>
                  <Text style={styles.rowDesc}>{p.desc}</Text>
                </View>
                <TouchableOpacity
                  style={[styles.permBtn, perms[p.key] && styles.permBtnGranted]}
                  onPress={() => perms[p.key] ? openNotificationSettings() : requestPerm(p.key)}>
                  <Text style={[styles.permBtnText, perms[p.key] && styles.permBtnTextGranted]}>
                    {perms[p.key] ? '✓ Verildi' : 'İzin Ver'}
                  </Text>
                </TouchableOpacity>
              </View>
            </React.Fragment>
          ))}
        </View>

        {/* Hakkında */}
        <SectionHeader title="ℹ️ HAKKINDA" styles={styles} />
        <View style={styles.card}>
          <Row icon="🏷️" label="Versiyon" value={VERSION} styles={styles} />
          <Divider styles={styles} />
          <TouchableRow icon="🐦" label="Twitter / X" desc="@parkihbar"
            onPress={() => Linking.openURL('https://x.com/parkihbar')} styles={styles} />
          <Divider styles={styles} />
          <TouchableRow icon="📧" label="İletişim" desc="info@parkihbar.com"
            onPress={() => Linking.openURL('mailto:info@parkihbar.com')} styles={styles} />
          <Divider styles={styles} />
          <TouchableRow icon="🔐" label="Gizlilik Politikası" onPress={() =>
            Alert.alert('Gizlilik Politikası', 'Verileriniz yalnızca ihbar süreçleri için kullanılır. Üçüncü taraflarla paylaşılmaz.')} styles={styles} />
          <Divider styles={styles} />
          <TouchableRow icon="📄" label="Kullanım Şartları" onPress={() =>
            Alert.alert('Kullanım Şartları', 'parkihbar uygulamasını kullanarak kullanım şartlarını kabul etmiş sayılırsınız.')} styles={styles} />
        </View>

        {/* Hesap */}
        <SectionHeader title="🚪 HESAP" styles={styles} />
        <View style={styles.card}>
          <TouchableOpacity style={styles.row} onPress={handleLogout} activeOpacity={0.7}>
            <Text style={styles.rowIcon}>🚪</Text>
            <Text style={[styles.rowLabel, {color: '#F59E0B'}]}>Çıkış Yap</Text>
          </TouchableOpacity>
          <Divider styles={styles} />
          <TouchableOpacity style={styles.row} onPress={handleDeleteAccount} activeOpacity={0.7}>
            <Text style={styles.rowIcon}>🗑️</Text>
            <Text style={[styles.rowLabel, {color: colors.error}]}>Hesabı Sil</Text>
          </TouchableOpacity>
        </View>

        <View style={{height: insets.bottom + 20}} />
      </ScrollView>
    </View>
  );
};

// ── Alt bileşenler ──────────────────────────────────────

const SectionHeader = ({title, styles}: {title: string; styles: any}) => (
  <Text style={styles.sectionHeader}>{title}</Text>
);

const Divider = ({styles}: {styles: any}) => <View style={styles.divider} />;

const Row = ({icon, label, value, onPress, styles}: {
  icon: string; label: string; value?: string; onPress?: () => void; styles: any;
}) => (
  <TouchableOpacity style={styles.row} onPress={onPress} activeOpacity={onPress ? 0.7 : 1} disabled={!onPress}>
    <Text style={styles.rowIcon}>{icon}</Text>
    <View style={styles.rowInfo}>
      <Text style={styles.rowLabel}>{label}</Text>
    </View>
    {value && <Text style={styles.rowValue}>{value}</Text>}
    {onPress && <Text style={styles.chevron}>›</Text>}
  </TouchableOpacity>
);

const TouchableRow = ({icon, label, desc, onPress, styles}: {
  icon: string; label: string; desc?: string; onPress: () => void; styles: any;
}) => (
  <TouchableOpacity style={styles.row} onPress={onPress} activeOpacity={0.7}>
    <Text style={styles.rowIcon}>{icon}</Text>
    <View style={styles.rowInfo}>
      <Text style={styles.rowLabel}>{label}</Text>
      {desc && <Text style={styles.rowDesc}>{desc}</Text>}
    </View>
    <Text style={styles.chevron}>›</Text>
  </TouchableOpacity>
);

const SwitchRow = ({icon, label, desc, value, onValueChange, colors, styles}: {
  icon: string; label: string; desc: string; value: boolean; onValueChange: (v: boolean) => void;
  colors: Colors; styles: any;
}) => (
  <View style={styles.row}>
    <Text style={styles.rowIcon}>{icon}</Text>
    <View style={styles.rowInfo}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={styles.rowDesc}>{desc}</Text>
    </View>
    <Switch
      value={value}
      onValueChange={onValueChange}
      trackColor={{false: colors.border, true: colors.primary}}
      thumbColor="#FFFFFF"
    />
  </View>
);

// ── Stiller ────────────────────────────────────────────

const makeStyles = (colors: Colors) =>
  StyleSheet.create({
    container: {flex: 1, backgroundColor: colors.background},
    header: {
      flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
      paddingHorizontal: 16, paddingVertical: 12,
      backgroundColor: colors.background,
      borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border,
    },
    backBtn: {width: 40, alignItems: 'flex-start'},
    backIcon: {fontSize: 32, color: colors.primary, lineHeight: 36},
    headerTitle: {fontSize: 18, fontWeight: '700', color: colors.text},
    content: {paddingTop: 8},
    sectionHeader: {
      fontSize: 12, fontWeight: '700', color: colors.textSecondary,
      letterSpacing: 0.8, paddingHorizontal: 20, paddingTop: 20, paddingBottom: 8,
    },
    card: {
      marginHorizontal: 16, backgroundColor: colors.card,
      borderRadius: 16, overflow: 'hidden',
      shadowColor: '#000', shadowOffset: {width: 0, height: 1},
      shadowOpacity: 0.06, shadowRadius: 4, elevation: 2,
    },
    divider: {height: StyleSheet.hairlineWidth, backgroundColor: colors.border, marginLeft: 52},
    row: {
      flexDirection: 'row', alignItems: 'center',
      paddingHorizontal: 16, paddingVertical: 14, minHeight: 54,
    },
    rowIcon: {fontSize: 22, width: 36},
    rowInfo: {flex: 1, marginRight: 8},
    rowLabel: {fontSize: 15, fontWeight: '500', color: colors.text},
    rowDesc: {fontSize: 12, color: colors.textSecondary, marginTop: 2},
    rowValue: {fontSize: 14, color: colors.textSecondary, marginRight: 4},
    chevron: {fontSize: 22, color: colors.textSecondary, fontWeight: '300'},
    permRow: {
      flexDirection: 'row', alignItems: 'center',
      paddingHorizontal: 16, paddingVertical: 12, minHeight: 54,
    },
    permBtn: {
      paddingHorizontal: 14, paddingVertical: 7,
      borderRadius: 20, borderWidth: 1.5, borderColor: colors.primary,
    },
    permBtnGranted: {backgroundColor: colors.primary, borderColor: colors.primary},
    permBtnText: {fontSize: 12, fontWeight: '700', color: colors.primary},
    permBtnTextGranted: {color: '#FFFFFF'},
  });
