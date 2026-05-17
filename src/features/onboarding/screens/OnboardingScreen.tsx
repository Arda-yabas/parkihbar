import React, {useState, useRef, useEffect, useMemo} from 'react';
import {
  StyleSheet,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Animated,
  Dimensions,
  Modal,
  FlatList,
  Platform,
  Alert,
  Switch,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {
  check,
  request,
  requestNotifications,
  openSettings,
  PERMISSIONS,
  RESULTS,
  Permission,
} from 'react-native-permissions';
import {useTheme, Colors} from '../../../theme/ThemeContext';

const {width, height} = Dimensions.get('window');

const EMOJI_LIST = [
  '😊','😎','🤩','🥳','😄','😁','🤗','😇','🥸','🤓',
  '😏','🤠','😈','🤑','🥹','😤','🤪','😜','🤫','🫡',
  '👨','👩','🧑','👦','👧','👴','👵','🧔','👨‍💼','👩‍💼',
  '👨‍🎓','👩‍🎓','👨‍💻','👩‍💻','👮','🧑‍🚒','🦸','🦹','🧙','🧝',
  '🧑‍🍳','👷','🕵️','🧑‍🎤','🧑‍🎨','🧑‍✈️','🧑‍🚀','🥷','🤴','👸',
  '🐶','🐱','🦊','🐸','🐼','🦁','🐯','🐧','🦋','🐺',
  '🦄','🐻','🐨','🐮','🐷','🐙','🦖','🦅','🦜','🐬',
  '🐲','🦝','🦔','🐿️','🦋','🐝','🦩','🦚','🦁','🐻‍❄️',
  '🚀','⚡️','🔥','💎','🏆','🎯','💪','✨','🌈','❤️',
  '⭐','🌙','☀️','🌊','🍀','🎮','🎸','🎨','📸','🏅',
  '💥','🎯','🛡️','⚔️','🗡️','🔮','🧿','🪄','💫','🌟',
];

interface OnboardingScreenProps {
  onComplete: () => void;
}

export const OnboardingScreen = ({onComplete}: OnboardingScreenProps) => {
  const insets = useSafeAreaInsets();
  const {colors, isDark: isThemeDark, toggleTheme} = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);

  const [page, setPage] = useState(0);
  const [permStatus, setPermStatus] = useState<Record<string, boolean>>({
    location: false, camera: false, notification: false,
  });
  const [userName, setUserName] = useState('');
  const [avatar, setAvatar] = useState('😎');
  const [emojiModalVisible, setEmojiModalVisible] = useState(false);

  const scrollRef = useRef<ScrollView>(null);
  const fadeAnim = useRef(new Animated.Value(1)).current;
  const slideAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const heroScale = useRef(new Animated.Value(0.9)).current;
  const heroOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.spring(heroScale, {toValue: 1, tension: 40, friction: 8, useNativeDriver: true}),
      Animated.timing(heroOpacity, {toValue: 1, duration: 700, useNativeDriver: true}),
    ]).start();
  }, []);

  const animatePageChange = (nextPage: number) => {
    Animated.sequence([
      Animated.parallel([
        Animated.timing(fadeAnim, {toValue: 0, duration: 150, useNativeDriver: true}),
        Animated.timing(slideAnim, {toValue: -30, duration: 150, useNativeDriver: true}),
      ]),
    ]).start(() => {
      setPage(nextPage);
      if (nextPage === 2) setPermStatus({location: false, camera: false, notification: false});
      slideAnim.setValue(30);
      Animated.parallel([
        Animated.timing(fadeAnim, {toValue: 1, duration: 300, useNativeDriver: true}),
        Animated.spring(slideAnim, {toValue: 0, tension: 60, friction: 10, useNativeDriver: true}),
        Animated.spring(scaleAnim, {toValue: 1, tension: 60, friction: 10, useNativeDriver: true}),
      ]).start();
    });
    scaleAnim.setValue(0.95);
  };

  const handleNext = () => {
    if (page === 1 && !userName.trim()) {
      Alert.alert('Adın Eksik', 'Seni nasıl çağıralım? 😊');
      return;
    }
    if (page < 2) animatePageChange(page + 1);
  };

  const handleBack = () => {
    if (page > 0) animatePageChange(page - 1);
  };

  const POST_NOTIFICATIONS = 'android.permission.POST_NOTIFICATIONS' as Permission;

  const getAndroidNotifPerm = (): Permission | null => {
    const v = typeof Platform.Version === 'string' ? parseInt(Platform.Version, 10) : Platform.Version;
    return v >= 33 ? POST_NOTIFICATIONS : null;
  };

  const getPerm = (key: string): Permission | null => {
    if (key === 'notification') {
      return Platform.OS === 'ios' ? null : getAndroidNotifPerm();
    }
    if (Platform.OS === 'ios') {
      return key === 'location' ? PERMISSIONS.IOS.LOCATION_WHEN_IN_USE : PERMISSIONS.IOS.CAMERA;
    }
    return key === 'location' ? PERMISSIONS.ANDROID.ACCESS_FINE_LOCATION : PERMISSIONS.ANDROID.CAMERA;
  };

  const LABELS: Record<string, string> = {location: 'Konum', camera: 'Kamera', notification: 'Bildirim'};

  const doRequest = async (key: string): Promise<boolean> => {
    if (key === 'notification') {
      if (Platform.OS === 'ios') {
        const res = await requestNotifications(['alert', 'sound', 'badge']);
        if (res.status === RESULTS.BLOCKED) {
          Alert.alert('Bildirim İzni', 'İzin engellendi. Ayarlardan açabilirsin.',
            [{text: 'İptal', style: 'cancel'}, {text: 'Ayarları Aç', onPress: () => openSettings()}]);
          return false;
        }
        return res.status === RESULTS.GRANTED;
      }
      const perm = getAndroidNotifPerm();
      if (!perm) return true;
      const current = await check(perm);
      if (current === RESULTS.GRANTED) return true;
      if (current === RESULTS.BLOCKED) {
        Alert.alert('Bildirim İzni', 'İzin engellendi. Ayarlardan açabilirsin.',
          [{text: 'İptal', style: 'cancel'}, {text: 'Ayarları Aç', onPress: () => openSettings()}]);
        return false;
      }
      const result = await request(perm);
      return result === RESULTS.GRANTED;
    }

    const perm = getPerm(key)!;
    const current = await check(perm);
    if (current === RESULTS.GRANTED) return true;
    if (current === RESULTS.BLOCKED) {
      Alert.alert(`${LABELS[key]} İzni`, 'İzin engellendi. Ayarlardan açabilirsin.',
        [{text: 'İptal', style: 'cancel'}, {text: 'Ayarları Aç', onPress: () => openSettings()}]);
      return false;
    }
    const result = await request(perm);
    return result === RESULTS.GRANTED;
  };

  const handlePermTap = async (key: string) => {
    if (permStatus[key]) {
      setPermStatus(prev => ({...prev, [key]: false}));
      return;
    }
    try {
      const granted = await doRequest(key);
      setPermStatus(prev => ({...prev, [key]: granted}));
    } catch (e) {
      console.warn('İzin hatası:', key, e);
    }
  };

  const requestAllPerms = async () => {
    for (const key of ['location', 'camera', 'notification']) {
      try {
        const granted = await doRequest(key);
        setPermStatus(prev => ({...prev, [key]: granted}));
      } catch {}
    }
  };

  const handleComplete = async () => {
    try {
      await AsyncStorage.multiSet([
        ['@onboarding_completed', 'true'],
        ['@username', userName.trim() || 'Kullanıcı'],
        ['@avatar', avatar],
      ]);
      onComplete();
    } catch {
      onComplete();
    }
  };

  const PAGE_COLORS = [colors.primary, colors.background, colors.background];
  const bgColor = PAGE_COLORS[page];
  const isPageDark = page === 0 || isThemeDark;

  return (
    <View style={[styles.container, {backgroundColor: bgColor}]}>
      {/* Decorative circles */}
      {isPageDark && (
        <>
          <View style={[styles.circle, styles.circle1, {opacity: page === 0 ? 0.15 : 0.08}]} />
          <View style={[styles.circle, styles.circle2, {opacity: page === 0 ? 0.1 : 0.05}]} />
        </>
      )}

      {/* Progress bar */}
      <View style={[styles.progressBar, {paddingTop: (insets.top || 44) + 16}]}>
        {[0, 1, 2].map(i => (
          <View
            key={i}
            style={[
              styles.progressSegment,
              {
                backgroundColor: i <= page
                  ? (isPageDark ? '#FFFFFF' : colors.primary)
                  : (isPageDark ? 'rgba(255,255,255,0.2)' : colors.border),
              },
            ]}
          />
        ))}
      </View>

      {/* Page content */}
      <Animated.View
        style={[
          styles.pageWrap,
          {opacity: fadeAnim, transform: [{translateY: slideAnim}, {scale: scaleAnim}]},
        ]}>

        {/* ── PAGE 0: HERO + NASIL ÇALIŞIR ── */}
        {page === 0 && (
          <Animated.View
            style={[styles.heroPage, {opacity: heroOpacity, transform: [{scale: heroScale}]}]}>
            <View style={styles.heroTop}>
              <View style={styles.appIconWrap}>
                <Text style={styles.appIcon}>🅿️</Text>
              </View>
              <Text style={styles.heroTitle}>parkihbar</Text>
              <Text style={styles.heroTagline}>Şehrini Değiştir!</Text>
            </View>

            <View style={styles.heroCards}>
              <View style={styles.heroCard}>
                <Text style={styles.heroCardIcon}>📸</Text>
                <Text style={styles.heroCardText}>Gör, fotoğrafla</Text>
              </View>
              <View style={styles.heroCard}>
                <Text style={styles.heroCardIcon}>📍</Text>
                <Text style={styles.heroCardText}>Bildir, ihbar et</Text>
              </View>
              <View style={styles.heroCard}>
                <Text style={styles.heroCardIcon}>🏆</Text>
                <Text style={styles.heroCardText}>Puan kazan</Text>
              </View>
            </View>

            <View style={styles.heroDesc}>
              <Text style={styles.heroDescText}>
                Engelli park yerleri, kaldırım ve yaya geçidi ihlallerini saniyeler içinde yetkililere ilet.{' '}
                <Text style={styles.heroDescBold}>Toplulukla birlikte şehrini daha yaşanabilir yap.</Text>
              </Text>
            </View>

            <View style={styles.howSection}>
              <Text style={styles.howTitle}>Nasıl Çalışır?</Text>
              <View style={styles.howList}>
                {[
                  {num: '1', icon: '📷', title: 'Fotoğrafla', desc: 'İhlali görür görmez kamerayı aç'},
                  {num: '2', icon: '📝', title: 'Bildir', desc: 'Tür seç, konum otomatik eklenir'},
                  {num: '3', icon: '✅', title: 'Topluluk Onaylar', desc: '3+ kişi veya 10 dk sonra onaylanır'},
                ].map((s, i) => (
                  <View key={s.num} style={styles.howItem}>
                    <View style={styles.howNumWrap}>
                      <Text style={styles.howNum}>{s.num}</Text>
                    </View>
                    <Text style={styles.howIcon}>{s.icon}</Text>
                    <View style={styles.howText}>
                      <Text style={styles.howItemTitle}>{s.title}</Text>
                      <Text style={styles.howItemDesc}>{s.desc}</Text>
                    </View>
                    {i < 2 && <View style={styles.howConnector} />}
                  </View>
                ))}
              </View>
            </View>
          </Animated.View>
        )}

        {/* ── PAGE 1: PROFILE ── */}
        {page === 1 && (
          <View style={styles.profilePage}>
            <Text style={styles.profileTitle}>Profil Oluştur</Text>
            <Text style={styles.profileSubtitle}>Topluluğa nasıl görüneceğini belirle</Text>

            <TouchableOpacity
              style={styles.avatarPickerBtn}
              onPress={() => setEmojiModalVisible(true)}
              activeOpacity={0.8}>
              <View style={styles.avatarCircle}>
                <Text style={styles.avatarDisplay}>{avatar}</Text>
              </View>
              <View style={styles.avatarEditBadge}>
                <Text style={styles.avatarEditIcon}>✏️</Text>
              </View>
              <Text style={styles.avatarHint}>Avatarına dokunarak değiştir</Text>
            </TouchableOpacity>

            <View style={styles.inputWrap}>
              <Text style={styles.inputLabel}>Adın</Text>
              <View style={styles.inputBox}>
                <Text style={styles.inputPrefixIcon}>👤</Text>
                <TextInput
                  style={styles.textInput}
                  placeholder="Örn: Ali Yılmaz"
                  placeholderTextColor={colors.textSecondary}
                  value={userName}
                  onChangeText={setUserName}
                  maxLength={30}
                  returnKeyType="done"
                  autoCapitalize="words"
                />
              </View>
            </View>

            <View style={styles.privacyNote}>
              <Text style={styles.privacyText}>🔒 Bilgilerin sadece ihbarlarında görünür</Text>
            </View>

            {/* Dark mode toggle */}
            <View style={styles.darkModeRow}>
              <Text style={styles.darkModeIcon}>{isThemeDark ? '🌙' : '☀️'}</Text>
              <View style={styles.darkModeInfo}>
                <Text style={styles.darkModeLabel}>Karanlık Mod</Text>
                <Text style={styles.darkModeDesc}>{isThemeDark ? 'Karanlık tema aktif' : 'Aydınlık tema aktif'}</Text>
              </View>
              <Switch
                value={isThemeDark}
                onValueChange={toggleTheme}
                trackColor={{false: colors.border, true: colors.primary}}
                thumbColor="#FFFFFF"
              />
            </View>
          </View>
        )}

        {/* ── PAGE 2: PERMISSIONS ── */}
        {page === 2 && (
          <View style={styles.permPage}>
            <View style={styles.permTop}>
              <Text style={styles.permHello}>Merhaba, {userName || 'Arkadaş'}! 👋</Text>
              <Text style={styles.permTitle}>Son Bir Adım</Text>
              <Text style={styles.permSubtitle}>
                parkihbar'ın en iyi şekilde çalışması için{'\n'}bu izinlere ihtiyacımız var
              </Text>
            </View>

            <View style={styles.permCards}>
              {[
                {key: 'location',     icon: '📍', label: 'Konum',      desc: 'İhbarına otomatik konum ekle',        bg: '#4CAF5022'},
                {key: 'notification', icon: '🔔', label: 'Bildirimler', desc: 'İhbar onayı ve rozet bildirimleri',   bg: '#2196F322'},
                {key: 'camera',       icon: '📷', label: 'Kamera',      desc: 'İhlalleri fotoğraflayarak ihbar et', bg: '#FF980022'},
              ].map(p => (
                <TouchableOpacity
                  key={p.key}
                  style={[styles.permCard, permStatus[p.key] && styles.permCardGranted]}
                  onPress={() => handlePermTap(p.key)}
                  activeOpacity={0.75}>
                  <View style={[styles.permIconWrap, {backgroundColor: p.bg}]}>
                    <Text style={styles.permIcon}>{p.icon}</Text>
                  </View>
                  <View style={styles.permInfo}>
                    <Text style={styles.permName}>{p.label}</Text>
                    <Text style={styles.permDesc}>{p.desc}</Text>
                  </View>
                  <View style={[styles.permBadge, permStatus[p.key] && styles.permBadgeGranted]}>
                    <Text style={styles.permBadgeText}>{permStatus[p.key] ? '✓' : '+'}</Text>
                  </View>
                </TouchableOpacity>
              ))}
            </View>

            {!Object.values(permStatus).every(Boolean) && (
              <TouchableOpacity style={styles.permAllBtn} onPress={requestAllPerms} activeOpacity={0.8}>
                <Text style={styles.permAllBtnText}>Tümüne İzin Ver</Text>
              </TouchableOpacity>
            )}
          </View>
        )}
      </Animated.View>

      {/* Navigation buttons */}
      <View style={[styles.navRow, {paddingBottom: (insets.bottom || 0) + 20}]}>
        {page === 0 ? (
          <TouchableOpacity style={styles.heroCta} onPress={handleNext} activeOpacity={0.85}>
            <Text style={styles.heroCtaText}>Profil Oluştur →</Text>
          </TouchableOpacity>
        ) : page < 2 ? (
          <>
            <TouchableOpacity style={[styles.backBtn, isPageDark && styles.backBtnDark]} onPress={handleBack}>
              <Text style={[styles.backBtnText, isPageDark && {color: 'rgba(255,255,255,0.7)'}]}>← Geri</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.nextBtn, !isPageDark && styles.nextBtnLight]}
              onPress={handleNext}
              activeOpacity={0.85}>
              <Text style={[styles.nextBtnText, !isPageDark && {color: '#FFFFFF'}]}>Devam</Text>
              <Text style={[styles.nextBtnArrow, !isPageDark && {color: '#FFFFFF'}]}> →</Text>
            </TouchableOpacity>
          </>
        ) : (
          <>
            <TouchableOpacity style={[styles.backBtn, styles.backBtnDark]} onPress={handleBack}>
              <Text style={[styles.backBtnText, {color: 'rgba(255,255,255,0.7)'}]}>← Geri</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.startBtn} onPress={handleComplete} activeOpacity={0.85}>
              <Text style={styles.startBtnText}>Parkihbar'a Başla ✨</Text>
            </TouchableOpacity>
          </>
        )}
      </View>

      {/* Emoji picker modal */}
      <Modal
        visible={emojiModalVisible}
        animationType="slide"
        transparent
        onRequestClose={() => setEmojiModalVisible(false)}>
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setEmojiModalVisible(false)}>
          <View style={styles.emojiSheet}>
            <View style={styles.emojiSheetHandle} />
            <Text style={styles.emojiSheetTitle}>Avatar Seç</Text>
            <FlatList
              data={EMOJI_LIST}
              numColumns={6}
              keyExtractor={(_, i) => String(i)}
              contentContainerStyle={styles.emojiGrid}
              renderItem={({item}) => (
                <TouchableOpacity
                  style={[styles.emojiItem, item === avatar && styles.emojiItemSelected]}
                  onPress={() => {setAvatar(item); setEmojiModalVisible(false);}}>
                  <Text style={styles.emojiItemText}>{item}</Text>
                </TouchableOpacity>
              )}
            />
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
};

const makeStyles = (colors: Colors) => StyleSheet.create({
  container: {flex: 1},

  circle: {position: 'absolute', borderRadius: 9999, backgroundColor: '#FFFFFF'},
  circle1: {width: 400, height: 400, top: -150, right: -120},
  circle2: {width: 300, height: 300, bottom: 50, left: -100},

  progressBar: {flexDirection: 'row', gap: 6, paddingHorizontal: 24, paddingBottom: 8},
  progressSegment: {flex: 1, height: 4, borderRadius: 2},

  pageWrap: {flex: 1, paddingHorizontal: 24},

  // ── PAGE 0: HERO ──
  heroPage: {flex: 1, justifyContent: 'space-between', paddingTop: 8, paddingBottom: 4},
  heroTop: {alignItems: 'center', marginBottom: 16},
  appIconWrap: {
    width: 80, height: 80, borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center', alignItems: 'center',
    marginBottom: 12,
    shadowColor: '#000', shadowOffset: {width: 0, height: 6}, shadowOpacity: 0.2, shadowRadius: 12,
  },
  appIcon: {fontSize: 44},
  heroTitle: {fontSize: 46, fontWeight: '900', color: '#FFFFFF', letterSpacing: -1.5, marginBottom: 4},
  heroTagline: {fontSize: 16, color: 'rgba(255,255,255,0.85)', fontWeight: '500'},
  heroCards: {flexDirection: 'row', gap: 8, marginBottom: 10},
  heroCard: {
    flex: 1, backgroundColor: 'rgba(255,255,255,0.18)',
    borderRadius: 14, paddingVertical: 10, paddingHorizontal: 8, alignItems: 'center',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.25)',
  },
  heroCardIcon: {fontSize: 22, marginBottom: 2},
  heroCardText: {fontSize: 11, fontWeight: '600', color: '#FFFFFF', textAlign: 'center'},
  heroDesc: {
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: 16, padding: 12, marginBottom: 10,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)',
  },
  heroDescText: {fontSize: 15, color: 'rgba(255,255,255,0.9)', lineHeight: 22, textAlign: 'center'},
  heroDescBold: {fontWeight: '700', color: '#FFFFFF'},
  howSection: {
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderRadius: 20, padding: 16,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)',
  },
  howTitle: {fontSize: 13, fontWeight: '700', color: 'rgba(255,255,255,0.7)', textTransform: 'uppercase', letterSpacing: 1.2, marginBottom: 12},
  howList: {gap: 0},
  howItem: {flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10},
  howNumWrap: {width: 26, height: 26, borderRadius: 13, backgroundColor: 'rgba(255,255,255,0.25)', justifyContent: 'center', alignItems: 'center'},
  howNum: {fontSize: 12, fontWeight: '800', color: '#FFFFFF'},
  howIcon: {fontSize: 22},
  howText: {flex: 1},
  howItemTitle: {fontSize: 14, fontWeight: '700', color: '#FFFFFF', marginBottom: 1},
  howItemDesc: {fontSize: 12, color: 'rgba(255,255,255,0.65)'},
  howConnector: {position: 'absolute', left: 12, top: 36, width: 2, height: 10, backgroundColor: 'rgba(255,255,255,0.2)'},

  // ── PAGE 1: PROFILE ──
  profilePage: {flex: 1, paddingTop: 16},
  profileTitle: {fontSize: 34, fontWeight: '800', color: colors.text, marginBottom: 4},
  profileSubtitle: {fontSize: 16, color: colors.textSecondary, marginBottom: 32},
  avatarPickerBtn: {alignItems: 'center', marginBottom: 32},
  avatarCircle: {
    width: 110, height: 110, borderRadius: 55,
    backgroundColor: colors.card,
    justifyContent: 'center', alignItems: 'center',
    borderWidth: 3, borderColor: colors.primary,
    shadowColor: colors.primary,
    shadowOffset: {width: 0, height: 6}, shadowOpacity: 0.3, shadowRadius: 16,
    elevation: 10,
  },
  avatarDisplay: {fontSize: 60},
  avatarEditBadge: {
    position: 'absolute', bottom: 22, right: width / 2 - 70,
    width: 30, height: 30, borderRadius: 15,
    backgroundColor: colors.primary,
    justifyContent: 'center', alignItems: 'center',
    borderWidth: 2, borderColor: colors.background,
  },
  avatarEditIcon: {fontSize: 14},
  avatarHint: {marginTop: 10, fontSize: 13, color: colors.textSecondary},
  inputWrap: {marginBottom: 20},
  inputLabel: {fontSize: 14, fontWeight: '700', color: colors.text, marginBottom: 8},
  inputBox: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: colors.card,
    borderRadius: 16, borderWidth: 2, borderColor: colors.border,
    paddingHorizontal: 16, paddingVertical: 14,
    gap: 10,
  },
  inputPrefixIcon: {fontSize: 20},
  textInput: {flex: 1, fontSize: 16, color: colors.text},
  privacyNote: {
    flexDirection: 'row', justifyContent: 'center',
    backgroundColor: colors.primary + '12',
    borderRadius: 12, padding: 12,
    marginBottom: 12,
  },
  privacyText: {fontSize: 13, color: colors.primary, fontWeight: '600'},
  darkModeRow: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: colors.card,
    borderRadius: 14, borderWidth: 1.5, borderColor: colors.border,
    paddingHorizontal: 16, paddingVertical: 14,
  },
  darkModeIcon: {fontSize: 22, marginRight: 12},
  darkModeInfo: {flex: 1},
  darkModeLabel: {fontSize: 15, fontWeight: '600', color: colors.text},
  darkModeDesc: {fontSize: 12, color: colors.textSecondary, marginTop: 2},

  // ── PAGE 2: PERMISSIONS ──
  permPage: {flex: 1, paddingTop: 16},
  permTop: {marginBottom: 28},
  permHello: {fontSize: 16, color: colors.primary, fontWeight: '700', marginBottom: 8},
  permTitle: {fontSize: 34, fontWeight: '800', color: colors.text, marginBottom: 8},
  permSubtitle: {fontSize: 15, color: colors.textSecondary, lineHeight: 22},
  permCards: {gap: 12, marginBottom: 20},
  permCard: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: colors.card,
    borderRadius: 18, padding: 18, gap: 16,
    borderWidth: 1, borderColor: colors.border,
  },
  permIconWrap: {width: 52, height: 52, borderRadius: 16, justifyContent: 'center', alignItems: 'center'},
  permIcon: {fontSize: 26},
  permInfo: {flex: 1},
  permName: {fontSize: 16, fontWeight: '700', color: colors.text, marginBottom: 4},
  permDesc: {fontSize: 13, color: colors.textSecondary, lineHeight: 18},
  permCardGranted: {borderColor: colors.primary, borderWidth: 1.5},
  permBadge: {
    width: 28, height: 28, borderRadius: 14,
    backgroundColor: colors.border,
    alignItems: 'center', justifyContent: 'center',
  },
  permBadgeGranted: {backgroundColor: colors.primary},
  permBadgeText: {fontSize: 14, fontWeight: '800', color: '#FFFFFF'},
  permAllBtn: {
    marginTop: 16,
    backgroundColor: colors.card,
    borderRadius: 14, paddingVertical: 14, alignItems: 'center',
    borderWidth: 1, borderColor: colors.border,
  },
  permAllBtnText: {fontSize: 15, fontWeight: '700', color: colors.primary},

  // ── NAVIGATION ──
  navRow: {
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingBottom: 20,
    paddingTop: 12,
    gap: 12,
  },
  backBtn: {paddingVertical: 12, paddingHorizontal: 4, minWidth: 70},
  backBtnDark: {},
  backBtnText: {fontSize: 15, fontWeight: '600', color: colors.textSecondary},
  nextBtn: {
    flex: 1, flexDirection: 'row', justifyContent: 'center', alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.95)',
    borderRadius: 18, paddingVertical: 18,
    shadowColor: '#000', shadowOffset: {width: 0, height: 4}, shadowOpacity: 0.2, shadowRadius: 12, elevation: 8,
  },
  nextBtnLight: {backgroundColor: colors.primary},
  nextBtnText: {fontSize: 17, fontWeight: '700', color: colors.primary},
  nextBtnArrow: {fontSize: 17, fontWeight: '700', color: colors.primary},
  heroCta: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 18, paddingVertical: 18,
    alignItems: 'center', justifyContent: 'center',
    shadowColor: '#000', shadowOffset: {width: 0, height: 4}, shadowOpacity: 0.15, shadowRadius: 12, elevation: 8,
  },
  heroCtaText: {fontSize: 17, fontWeight: '800', color: colors.primary},
  startBtn: {
    flex: 1, backgroundColor: colors.primary,
    borderRadius: 18, paddingVertical: 18,
    alignItems: 'center', justifyContent: 'center',
    shadowColor: colors.primary,
    shadowOffset: {width: 0, height: 6}, shadowOpacity: 0.5, shadowRadius: 16, elevation: 10,
  },
  startBtnText: {fontSize: 17, fontWeight: '800', color: '#FFFFFF'},

  // ── EMOJI MODAL ──
  modalOverlay: {flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end'},
  emojiSheet: {
    backgroundColor: colors.card,
    borderTopLeftRadius: 28, borderTopRightRadius: 28,
    paddingTop: 12, paddingBottom: Platform.OS === 'ios' ? 36 : 20,
    maxHeight: height * 0.55,
  },
  emojiSheetHandle: {width: 40, height: 4, borderRadius: 2, backgroundColor: colors.border, alignSelf: 'center', marginBottom: 16},
  emojiSheetTitle: {fontSize: 18, fontWeight: '700', color: colors.text, textAlign: 'center', marginBottom: 16},
  emojiGrid: {paddingHorizontal: 16, paddingBottom: 16},
  emojiItem: {
    width: (width - 64) / 6,
    aspectRatio: 1,
    justifyContent: 'center', alignItems: 'center',
    borderRadius: 12, margin: 2,
  },
  emojiItemSelected: {backgroundColor: colors.primary + '25'},
  emojiItemText: {fontSize: 32},
});
