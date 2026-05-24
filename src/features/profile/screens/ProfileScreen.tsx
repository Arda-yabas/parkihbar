import React, {useEffect, useState, useMemo, useRef} from 'react';
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Alert,
  Linking,
  Animated,
  Modal,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {useNavigation} from '@react-navigation/native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {AuthService, FirestoreService} from '../../../services/firebase';
import {useTheme, Colors} from '../../../theme/ThemeContext';
import {CATEGORY_OPTIONS} from '../../../constants/reportTemplates';

const VIOLATION_ICONS: Record<string, string> = Object.fromEntries(CATEGORY_OPTIONS.map(c => [c.value, c.icon]));
const VIOLATION_NAMES: Record<string, string> = Object.fromEntries(CATEGORY_OPTIONS.map(c => [c.value, c.label]));

function formatTime(createdAt: any): string {
  if (!createdAt) return '';
  const ms: number = createdAt.toMillis ? createdAt.toMillis() : Number(createdAt);
  if (!ms) return '';
  const mins = Math.floor((Date.now() - ms) / 60000);
  if (mins < 2) return 'Az önce';
  if (mins < 60) return `${mins} dakika önce`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours} saat önce`;
  const days = Math.floor(hours / 24);
  return days < 7 ? `${days} gün önce` : `${Math.floor(days / 7)} hafta önce`;
}

const LEVEL_NAMES: {[key: number]: {name: string; icon: string}} = {
  1: {name: 'Gözlemci', icon: '🌱'},
  2: {name: 'Sokak Koruyucusu', icon: '🎯'},
  3: {name: 'Mahalle Kahramanı', icon: '🏘️'},
  4: {name: 'Şehir Koruyucusu', icon: '🏙️'},
  5: {name: 'Kent Savunucusu', icon: '⭐'},
  6: {name: 'Değişim Öncüsü', icon: '🏆'},
};

const LEVEL_POINTS = [0, 100, 300, 600, 1000, 2000];

interface Badge {
  id: string;
  name: string;
  icon: string;
  description: string;
  type: 'reports' | 'verified' | 'streak' | 'accuracy' | 'seenIt' | 'comments';
  requirement: number;
}

const BADGES: Badge[] = [
  {id: 'first_step',     name: 'İlk Adım',           icon: '🎯', type: 'reports',  requirement: 1,   description: 'İlk ihbarını oluşturdun'},
  {id: 'lightning',      name: 'Şimşek',              icon: '⚡', type: 'reports',  requirement: 5,   description: '5 ihbar oluşturdun'},
  {id: 'sharp_eye',      name: 'Keskin Göz',          icon: '📸', type: 'reports',  requirement: 10,  description: '10 ihbar oluşturdun'},
  {id: 'fiery_mission',  name: 'Ateşli Görev',        icon: '🔥', type: 'reports',  requirement: 50,  description: '50 ihbar oluşturdun'},
  {id: 'hundred',        name: 'Yüz İhbar',           icon: '💯', type: 'reports',  requirement: 100, description: '100 ihbar oluşturdun'},
  {id: 'correct_eye',    name: 'Doğru Göz',           icon: '✅', type: 'verified', requirement: 10,  description: '10 ihbarın topluluk tarafından doğrulandı'},
  {id: 'eagle_eye',      name: 'Kartal Göz',          icon: '👁️', type: 'accuracy', requirement: 70,  description: '%70 doğruluk oranına ulaştın'},
  {id: 'weekly_streak',  name: 'Haftalık Seri',       icon: '📅', type: 'streak',   requirement: 7,   description: '7 gün art arda ihbar gönderdin'},
  {id: 'community_hero', name: 'Toplum Koruyucusu',   icon: '🤝', type: 'seenIt',   requirement: 10,  description: '10 ihbarı topluluk olarak onayladın'},
  {id: 'commenter',      name: 'Yorumcu',             icon: '💬', type: 'comments', requirement: 1,   description: 'İlk yorumunu yazdın'},
];

const BadgeCard = ({badge, earned, colors, styles, onPress}: {badge: Badge; earned: boolean; colors: Colors; styles: any; onPress: () => void}) => (
  <TouchableOpacity style={[styles.badgeCard, !earned && styles.badgeCardLocked]} onPress={onPress} activeOpacity={0.75}>
    <View style={styles.badgeIconWrap}>
      <Text style={styles.badgeIcon}>{badge.icon}</Text>
    </View>
    <Text style={[styles.badgeName, !earned && styles.badgeNameLocked]} numberOfLines={2}>
      {badge.name}
    </Text>
  </TouchableOpacity>
);

export const ProfileScreen = () => {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const {colors} = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);

  const [userData, setUserData] = useState<Record<string, any> | null>(null);
  const [localName, setLocalName] = useState('Kullanıcı');
  const [localAvatar, setLocalAvatar] = useState('👤');
  const [loading, setLoading] = useState(true);
  const [badgesExpanded, setBadgesExpanded] = useState(false);
  const [selectedBadge, setSelectedBadge] = useState<Badge | null>(null);
  const tooltipOpacity = useRef(new Animated.Value(0)).current;
  const [myReports, setMyReports] = useState<{id: string; type: string; icon: string; time: string; status: string}[]>([]);

  useEffect(() => {
    AsyncStorage.multiGet(['@username', '@avatar', '@settings_tooltip_shown']).then(pairs => {
      if (pairs[0][1]) setLocalName(pairs[0][1]);
      if (pairs[1][1]) setLocalAvatar(pairs[1][1]);
      if (!pairs[2][1]) {
        // İlk ziyaret — tooltip göster
        setTimeout(() => {
          Animated.sequence([
            Animated.timing(tooltipOpacity, {toValue: 1, duration: 300, useNativeDriver: true}),
            Animated.delay(2200),
            Animated.timing(tooltipOpacity, {toValue: 0, duration: 400, useNativeDriver: true}),
          ]).start();
          AsyncStorage.setItem('@settings_tooltip_shown', 'true').catch(() => {});
        }, 800);
      }
    }).catch(() => {});

    const user = AuthService.getCurrentUser();
    if (!user) {
      setUserData({});
      setLoading(false);
      return;
    }

    const unsubUser = FirestoreService.listenUserData(user.uid, data => {
      setUserData(data ?? {});
      setLoading(false);
    });

    const unsubReports = FirestoreService.listenUserReports(user.uid, 5, reports => {
      setMyReports(reports.map(r => ({
        id: r.id ?? '',
        type: VIOLATION_NAMES[r.type] ?? r.type?.replace(/_/g, ' '),
        icon: VIOLATION_ICONS[r.type] ?? '🚗',
        time: formatTime(r.createdAt),
        status: r.status,
      })));
    });

    return () => {
      unsubUser();
      unsubReports();
    };
  }, []);

  if (loading) {
    return (
      <View style={styles.centered}>
        <Text style={styles.loadingText}>Yükleniyor...</Text>
      </View>
    );
  }

  const level = (userData?.level) || 1;
  const levelInfo = LEVEL_NAMES[level] ?? LEVEL_NAMES[1];
  const points = userData?.points || 0;
  const totalReports = userData?.totalReports || 0;
  const verifiedReports = userData?.verifiedReports || 0;
  const streak = userData?.streak || 0;
  const accuracy =
    totalReports > 0 ? Math.round((verifiedReports / totalReports) * 100) : 0;

  const nextLevel = Math.min(level + 1, 6);
  const currentLevelPoints = LEVEL_POINTS[level - 1] ?? 0;
  const nextLevelPoints = LEVEL_POINTS[nextLevel - 1] ?? 2000;
  const progress =
    level >= 6
      ? 100
      : ((points - currentLevelPoints) / (nextLevelPoints - currentLevelPoints)) * 100;
  const pointsToNext = level < 6 ? nextLevelPoints - points : 0;

  const seenItCount   = userData?.seenItCount   || 0;
  const commentsCount = userData?.commentsCount || 0;

  const earnedBadgeIds = new Set(
    BADGES.filter(b => {
      switch (b.type) {
        case 'reports':  return totalReports    >= b.requirement;
        case 'verified': return verifiedReports >= b.requirement;
        case 'streak':   return streak          >= b.requirement;
        case 'accuracy': return accuracy        >= b.requirement;
        case 'seenIt':   return seenItCount     >= b.requirement;
        case 'comments': return commentsCount   >= b.requirement;
      }
    }).map(b => b.id),
  );

  const getBadgeProgress = (badge: Badge): string => {
    switch (badge.type) {
      case 'reports':  return `${totalReports} / ${badge.requirement} ihbar`;
      case 'verified': return `${verifiedReports} / ${badge.requirement} onaylı ihbar`;
      case 'streak':   return `${streak} / ${badge.requirement} gün seri`;
      case 'accuracy': return `%${accuracy} / %${badge.requirement} doğruluk`;
      case 'seenIt':   return `${seenItCount} / ${badge.requirement} onay`;
      case 'comments': return `${commentsCount} / ${badge.requirement} yorum`;
    }
  };

  return (
    <>
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={[styles.gearBtn, {top: insets.top + 10}]}
          onPress={() => navigation.navigate('Settings' as never)}
          activeOpacity={0.7}>
          <Text style={styles.gearIcon}>⚙️</Text>
        </TouchableOpacity>
        <Animated.View style={[styles.tooltip, {top: insets.top + 52, opacity: tooltipOpacity}]}>
          <Text style={styles.tooltipText}>Ayarlar</Text>
          <View style={styles.tooltipArrow} />
        </Animated.View>

        <View style={styles.headerTop}>
          <View style={styles.avatarRing}>
            <Text style={styles.avatarText}>{localAvatar}</Text>
          </View>
          <View style={styles.headerInfo}>
            <Text style={styles.displayName}>{userData?.displayName || localName}</Text>
            <View style={styles.levelBadge}>
              <Text style={styles.levelIcon}>{levelInfo.icon}</Text>
              <Text style={styles.levelName}>{levelInfo.name}</Text>
            </View>
            <View style={styles.headerXpBar}>
              <View style={[styles.headerXpFill, {width: `${Math.min(Math.max(progress, 0), 100)}%`}]} />
            </View>
            <Text style={styles.headerXpText}>
              {level < 6 ? `${points} / ${nextLevelPoints} XP` : '🏆 Max seviye'}
            </Text>
          </View>
        </View>

        <View style={styles.headerStats}>
          <View style={styles.headerStat}>
            <Text style={styles.headerStatValue}>{totalReports}</Text>
            <Text style={styles.headerStatLabel}>İhbar</Text>
          </View>
          <View style={styles.headerStatDivider} />
          <View style={styles.headerStat}>
            <Text style={styles.headerStatValue}>{points}</Text>
            <Text style={styles.headerStatLabel}>Puan</Text>
          </View>
          <View style={styles.headerStatDivider} />
          <View style={styles.headerStat}>
            <Text style={styles.headerStatValue}>{streak > 0 ? `${streak} 🔥` : '—'}</Text>
            <Text style={styles.headerStatLabel}>Seri</Text>
          </View>
        </View>
      </View>

      {/* Progress */}
      {level < 6 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Seviye İlerlemesi</Text>
          <View style={styles.progressBar}>
            <View style={[styles.progressFill, {width: `${Math.min(Math.max(progress, 0), 100)}%`}]} />
          </View>
          <Text style={styles.progressText}>{points} / {nextLevelPoints} puan</Text>
          <Text style={styles.progressSubtext}>
            {LEVEL_NAMES[nextLevel].icon} {LEVEL_NAMES[nextLevel].name}'ya {pointsToNext} puan kaldı!
          </Text>
        </View>
      )}

      {/* Etki Özeti */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>🌍 Etkin Etkisi</Text>
        <View style={styles.impactRow}>
          <Text style={styles.impactNum}>{userData?.totalSeenImpact || 0}</Text>
          <Text style={styles.impactText}> kişi ihbarlarını gördü — farkındalık yarattın</Text>
        </View>
        <View style={styles.impactRow}>
          <Text style={styles.impactNum}>{verifiedReports}</Text>
          <Text style={styles.impactText}> ihbarın topluluk tarafından doğrulandı</Text>
        </View>
        <View style={styles.impactRow}>
          <Text style={styles.impactNum}>{totalReports}</Text>
          <Text style={styles.impactText}> ihbarla şehrini değiştiriyorsun</Text>
        </View>
      </View>

      {/* Badges */}
      <View style={styles.section}>
        <View style={styles.badgesTitleRow}>
          <Text style={styles.sectionTitle}>
            Rozetler ({earnedBadgeIds.size}/{BADGES.length})
          </Text>
          {BADGES.length > 3 && (
            <TouchableOpacity onPress={() => setBadgesExpanded(v => !v)}>
              <Text style={styles.badgesToggle}>
                {badgesExpanded ? 'Gizle ↑' : 'Tümünü Gör ↓'}
              </Text>
            </TouchableOpacity>
          )}
        </View>
        <View style={styles.badgesGrid}>
          {(badgesExpanded ? BADGES : BADGES.slice(0, 3)).map(badge => (
            <BadgeCard
              key={badge.id}
              badge={badge}
              earned={earnedBadgeIds.has(badge.id)}
              colors={colors}
              styles={styles}
              onPress={() => setSelectedBadge(badge)}
            />
          ))}
        </View>
      </View>

      {/* Son İhbarlarım */}
      <View style={styles.section}>
        <View style={styles.sectionHeaderRow}>
          <Text style={styles.sectionTitle}>📋 Son İhbarlarım</Text>
          <TouchableOpacity onPress={() => (navigation as any).navigate('UserReports', {
            userId: AuthService.getCurrentUser()?.uid ?? '',
            userName: userData?.displayName || localName,
            avatar: localAvatar,
          })}>
            <Text style={styles.sectionLink}>Tümü →</Text>
          </TouchableOpacity>
        </View>
        {myReports.length === 0 ? (
          <Text style={styles.emptyText}>Henüz ihbarın yok. İlk ihbarını yap! 🎯</Text>
        ) : (
          myReports.map(r => (
            <TouchableOpacity
              key={r.id}
              style={styles.myReportRow}
              activeOpacity={0.7}
              onPress={() => (navigation as any).navigate('ReportDetail', {reportId: r.id})}>
              <Text style={styles.myReportIcon}>{r.icon}</Text>
              <View style={styles.myReportInfo}>
                <Text style={styles.myReportType}>{r.type}</Text>
                <Text style={styles.myReportTime}>{r.time}</Text>
              </View>
              <View style={[styles.myReportBadge, r.status === 'verified' && styles.myReportBadgeVerified]}>
                <Text style={styles.myReportBadgeText}>
                  {r.status === 'verified' ? '✓ Onaylı' : '⏳ Bekliyor'}
                </Text>
              </View>
              <Text style={styles.myReportArrow}>›</Text>
            </TouchableOpacity>
          ))
        )}
      </View>

      {/* Acil Durum */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>🚨 Acil Hatlar</Text>
        <View style={styles.emergencyRow}>
          {[
            {number: '112', label: 'Acil Yardım'},
            {number: '181', label: 'Zabıta'},
            {number: '153', label: 'Belediye'},
          ].map(({number, label}) => (
            <TouchableOpacity
              key={number}
              style={styles.emergencyButton}
              activeOpacity={0.7}
              onPress={() =>
                Alert.alert(label, `${number} numarasını aramak istiyor musunuz?`, [
                  {text: 'İptal', style: 'cancel'},
                  {text: 'Ara', onPress: () => Linking.openURL(`tel:${number}`)},
                ])
              }>
              <Text style={styles.emergencyCallIcon}>📞</Text>
              <Text style={styles.emergencyNumber}>{number}</Text>
              <Text style={styles.emergencyLabel}>{label}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>
    </ScrollView>

    <Modal visible={!!selectedBadge} transparent animationType="fade" onRequestClose={() => setSelectedBadge(null)}>
      <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setSelectedBadge(null)}>
        <View style={styles.modalCard}>
          <Text style={styles.modalBadgeIcon}>{selectedBadge?.icon}</Text>
          <Text style={styles.modalBadgeName}>{selectedBadge?.name}</Text>
          <Text style={styles.modalBadgeDesc}>{selectedBadge?.description}</Text>
          {selectedBadge && earnedBadgeIds.has(selectedBadge.id) ? (
            <View style={styles.modalEarned}>
              <Text style={styles.modalEarnedText}>✅ Kazanıldı!</Text>
            </View>
          ) : (
            <View style={styles.modalProgress}>
              <Text style={styles.modalProgressLabel}>İlerleme</Text>
              <Text style={styles.modalProgressText}>{selectedBadge ? getBadgeProgress(selectedBadge) : ''}</Text>
            </View>
          )}
        </View>
      </TouchableOpacity>
    </Modal>
    </>
  );
};

const makeStyles = (colors: Colors) => StyleSheet.create({
  container: {flex: 1, backgroundColor: colors.background},
  content: {paddingBottom: 100, overflow: 'visible'},
  centered: {flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.background},
  loadingText: {color: colors.textSecondary, fontSize: 16},
  header: {
    paddingTop: 56, paddingHorizontal: 20,
    backgroundColor: colors.primary,
    borderBottomLeftRadius: 24, borderBottomRightRadius: 24,
    shadowColor: '#000', shadowOffset: {width: 0, height: 4}, shadowOpacity: 0.15, shadowRadius: 12, elevation: 8,
  },
  gearBtn: {
    position: 'absolute', right: 16, zIndex: 10,
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center', justifyContent: 'center',
  },
  gearIcon: {fontSize: 18},
  tooltip: {
    position: 'absolute', right: 8, zIndex: 20,
    backgroundColor: 'rgba(0,0,0,0.75)',
    paddingHorizontal: 12, paddingVertical: 6,
    borderRadius: 8,
  },
  tooltipText: {fontSize: 12, fontWeight: '600', color: '#FFFFFF'},
  tooltipArrow: {
    position: 'absolute', top: -6, right: 14,
    width: 0, height: 0,
    borderLeftWidth: 6, borderRightWidth: 6, borderBottomWidth: 6,
    borderLeftColor: 'transparent', borderRightColor: 'transparent',
    borderBottomColor: 'rgba(0,0,0,0.75)',
  },
  headerTop: {flexDirection: 'row', alignItems: 'center', paddingBottom: 20, gap: 16},
  avatarRing: {
    width: 80, height: 80, borderRadius: 40,
    backgroundColor: 'rgba(255,255,255,0.25)',
    justifyContent: 'center', alignItems: 'center',
    borderWidth: 2, borderColor: 'rgba(255,255,255,0.5)',
  },
  avatarText: {fontSize: 40},
  headerInfo: {flex: 1},
  displayName: {fontSize: 20, fontWeight: '800', color: '#FFFFFF', marginBottom: 6},
  levelBadge: {
    flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start',
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12, marginBottom: 10,
  },
  levelIcon: {fontSize: 14, marginRight: 5},
  levelName: {fontSize: 13, fontWeight: '600', color: '#FFFFFF'},
  headerXpBar: {height: 5, backgroundColor: 'rgba(255,255,255,0.25)', borderRadius: 3, overflow: 'hidden', marginBottom: 4},
  headerXpFill: {height: '100%', backgroundColor: '#FFFFFF', borderRadius: 3},
  headerXpText: {fontSize: 10, color: 'rgba(255,255,255,0.7)', fontWeight: '600'},
  headerStats: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: 16, borderWidth: 1, borderColor: 'rgba(255,255,255,0.3)',
    marginBottom: 20, paddingVertical: 14,
  },
  headerStat: {flex: 1, alignItems: 'center'},
  headerStatDivider: {width: 1, backgroundColor: 'rgba(255,255,255,0.3)', marginVertical: 4},
  headerStatValue: {fontSize: 22, fontWeight: '800', color: '#FFFFFF', marginBottom: 4},
  headerStatLabel: {fontSize: 12, fontWeight: '600', color: 'rgba(255,255,255,0.75)'},
  section: {
    marginHorizontal: 16, marginBottom: 10, padding: 16,
    backgroundColor: colors.card, borderRadius: 16,
    shadowColor: '#000', shadowOffset: {width: 0, height: 1}, shadowOpacity: 0.06, shadowRadius: 4, elevation: 2,
  },
  sectionTitle: {fontSize: 16, fontWeight: '700', color: colors.text, marginBottom: 12},
  progressBar: {height: 12, backgroundColor: colors.border, borderRadius: 6, overflow: 'hidden', marginBottom: 8},
  progressFill: {height: '100%', backgroundColor: colors.primary, borderRadius: 6},
  progressText: {fontSize: 16, fontWeight: '600', color: colors.text, marginBottom: 4},
  progressSubtext: {fontSize: 14, color: colors.textSecondary},
  badgesTitleRow: {flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12},
  badgesToggle: {fontSize: 13, fontWeight: '600', color: colors.primary},
  badgesGrid: {flexDirection: 'row', flexWrap: 'wrap', gap: 10},
  badgeCard: {
    width: '30%', paddingVertical: 10, paddingHorizontal: 4,
    backgroundColor: colors.primary, borderRadius: 12, alignItems: 'center',
  },
  badgeCardLocked: {backgroundColor: colors.border, opacity: 0.5},
  badgeIconWrap: {
    width: 38, height: 38, borderRadius: 19,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center', justifyContent: 'center', marginBottom: 6,
  },
  badgeIcon: {fontSize: 20},
  badgeName: {fontSize: 9, fontWeight: '600', color: '#FFFFFF', textAlign: 'center', lineHeight: 12},
  badgeNameLocked: {color: colors.textSecondary},
  sectionHeaderRow: {flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12},
  sectionLink: {fontSize: 13, fontWeight: '600', color: colors.primary},
  emptyText: {fontSize: 13, color: colors.textSecondary, textAlign: 'center', paddingVertical: 8},
  myReportRow: {flexDirection: 'row', alignItems: 'center', paddingVertical: 10, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border},
  myReportIcon: {fontSize: 26, marginRight: 12},
  myReportInfo: {flex: 1},
  myReportType: {fontSize: 14, fontWeight: '600', color: colors.text, marginBottom: 2},
  myReportTime: {fontSize: 12, color: colors.textSecondary},
  myReportBadge: {paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10, backgroundColor: '#FFF3CD'},
  myReportBadgeVerified: {backgroundColor: '#D4EDDA'},
  myReportBadgeText: {fontSize: 11, fontWeight: '600', color: '#856404'},
  myReportArrow: {fontSize: 18, color: colors.textSecondary, marginLeft: 6},
  emergencyRow: {flexDirection: 'row', gap: 10},
  emergencyButton: {
    flex: 1, backgroundColor: colors.background,
    borderWidth: 1, borderColor: colors.border, borderRadius: 14,
    paddingVertical: 14, alignItems: 'center', justifyContent: 'center',
    position: 'relative',
  },
  emergencyCallIcon: {position: 'absolute', left: 10, top: '50%', fontSize: 15},
  emergencyNumber: {fontSize: 20, fontWeight: '800', color: colors.text, textAlign: 'center', marginBottom: 3},
  emergencyLabel: {fontSize: 11, fontWeight: '500', color: colors.textSecondary, textAlign: 'center'},
  impactRow: {flexDirection: 'row', alignItems: 'baseline', marginBottom: 10},
  impactNum: {fontSize: 22, fontWeight: '800', color: colors.primary},
  impactText: {fontSize: 14, color: colors.textSecondary, flex: 1, flexWrap: 'wrap'},
  modalOverlay: {flex: 1, backgroundColor: 'rgba(0,0,0,0.55)', justifyContent: 'center', alignItems: 'center'},
  modalCard: {
    width: '78%', backgroundColor: colors.card,
    borderRadius: 20, padding: 28, alignItems: 'center',
    shadowColor: '#000', shadowOffset: {width: 0, height: 8}, shadowOpacity: 0.2, shadowRadius: 20, elevation: 12,
  },
  modalBadgeIcon: {fontSize: 48, marginBottom: 12},
  modalBadgeName: {fontSize: 20, fontWeight: '800', color: colors.text, marginBottom: 8, textAlign: 'center'},
  modalBadgeDesc: {fontSize: 14, color: colors.textSecondary, textAlign: 'center', lineHeight: 20, marginBottom: 16},
  modalEarned: {backgroundColor: '#D4EDDA', borderRadius: 10, paddingHorizontal: 16, paddingVertical: 8},
  modalEarnedText: {fontSize: 14, fontWeight: '700', color: '#155724'},
  modalProgress: {backgroundColor: colors.background, borderRadius: 10, paddingHorizontal: 16, paddingVertical: 10, alignItems: 'center'},
  modalProgressLabel: {fontSize: 11, fontWeight: '600', color: colors.textSecondary, marginBottom: 4, letterSpacing: 0.5},
  modalProgressText: {fontSize: 15, fontWeight: '700', color: colors.primary},
});
