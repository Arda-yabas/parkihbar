import React, {useEffect, useState, useMemo} from 'react';
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Alert,
  Linking,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {useNavigation} from '@react-navigation/native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {AuthService, FirestoreService} from '../../../services/firebase';
import {useTheme, Colors} from '../../../theme/ThemeContext';

const CAUSES = [
  {id: 'sehit',   icon: '🎖️', title: 'Şehit Aileleri',   desc: 'Vatanı için hayatını kaybedenlerin aileleri'},
  {id: 'engelli', icon: '♿',  title: 'Engelli Bireyler', desc: 'Engelli bireylerin erişim hakkı için'},
  {id: 'gazi',    icon: '🏅', title: 'Gaziler',           desc: 'Görevde yaralanan gazilerin iyileşmesi için'},
];

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
  type: 'reports' | 'verified' | 'streak' | 'accuracy';
  requirement: number;
}

const BADGES: Badge[] = [
  {id: 'first_step', name: 'İlk Adım', icon: '🎯', type: 'reports', requirement: 1},
  {id: 'sharp_eye', name: 'Keskin Göz', icon: '📸', type: 'reports', requirement: 10},
  {id: 'fiery_mission', name: 'Ateşli Görev', icon: '🔥', type: 'reports', requirement: 50},
  {id: 'hundred', name: 'Yüzlük', icon: '💯', type: 'reports', requirement: 100},
  {id: 'weekly_streak', name: 'Haftalık Seri', icon: '📅', type: 'streak', requirement: 7},
  {id: 'correct_eye', name: 'Doğru Göz', icon: '✅', type: 'verified', requirement: 10},
  {id: 'lightning', name: 'Şimşek', icon: '⚡', type: 'reports', requirement: 5},
  {id: 'eagle_eye', name: 'Kartal Göz', icon: '👁️', type: 'accuracy', requirement: 90},
];

const BadgeCard = ({badge, earned, colors, styles}: {badge: Badge; earned: boolean; colors: Colors; styles: any}) => (
  <View style={[styles.badgeCard, !earned && styles.badgeCardLocked]}>
    <View style={styles.badgeIconWrap}>
      <Text style={styles.badgeIcon}>{badge.icon}</Text>
    </View>
    <Text style={[styles.badgeName, !earned && styles.badgeNameLocked]} numberOfLines={2}>
      {badge.name}
    </Text>
  </View>
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
  const [selectedCause, setSelectedCause] = useState('sehit');
  const [donationPoints] = useState(12);
  const [communityPoints] = useState(8240);

  useEffect(() => {
    AsyncStorage.multiGet(['@username', '@avatar', '@selected_cause']).then(pairs => {
      if (pairs[0][1]) setLocalName(pairs[0][1]);
      if (pairs[1][1]) setLocalAvatar(pairs[1][1]);
      if (pairs[2][1]) setSelectedCause(pairs[2][1]);
    }).catch(() => {});

    const user = AuthService.getCurrentUser();
    if (user) {
      FirestoreService.getUserData(user.uid)
        .then(data => setUserData(data ?? {}))
        .catch(() => setUserData({}))
        .finally(() => setLoading(false));
    } else {
      setUserData({});
      setLoading(false);
    }
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

  const earnedBadgeIds = new Set(
    BADGES.filter(b => {
      switch (b.type) {
        case 'reports':  return totalReports >= b.requirement;
        case 'verified': return verifiedReports >= b.requirement;
        case 'streak':   return streak >= b.requirement;
        case 'accuracy': return accuracy >= b.requirement;
      }
    }).map(b => b.id),
  );

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={[styles.gearBtn, {top: insets.top + 10}]}
          onPress={() => navigation.navigate('Settings' as never)}
          activeOpacity={0.7}>
          <Text style={styles.gearIcon}>⚙️</Text>
        </TouchableOpacity>

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
            />
          ))}
        </View>
      </View>

      {/* Sosyal Etki */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>💚 Sosyal Etkin</Text>
        <Text style={styles.impactDesc}>
          Her günlük hedefte 1 Etki Puanı kazanırsın. Topluluk büyüdükçe bu puanlar kurumsal iş birlikleriyle gerçek bağışa dönüşecek — cebinden bir kuruş çıkmadan.
        </Text>
        <View style={styles.causeRow}>
          {CAUSES.map(cause => {
            const active = selectedCause === cause.id;
            return (
              <TouchableOpacity
                key={cause.id}
                style={[styles.causeCard, active && styles.causeCardActive]}
                activeOpacity={0.8}
                onPress={() => {
                  setSelectedCause(cause.id);
                  AsyncStorage.setItem('@selected_cause', cause.id).catch(() => {});
                }}>
                <Text style={styles.causeIcon}>{cause.icon}</Text>
                <Text style={[styles.causeName, active && styles.causeNameActive]} numberOfLines={2}>
                  {cause.title}
                </Text>
                {active && (
                  <View style={styles.causeCheck}>
                    <Text style={styles.causeCheckText}>✓</Text>
                  </View>
                )}
              </TouchableOpacity>
            );
          })}
        </View>
        <Text style={styles.causeDescText}>
          {CAUSES.find(c => c.id === selectedCause)?.desc}
        </Text>
        <View style={styles.impactStatsRow}>
          <View style={styles.impactStat}>
            <Text style={styles.impactStatNum}>{donationPoints}</Text>
            <Text style={styles.impactStatLabel}>Senin birikimin</Text>
          </View>
          <View style={styles.impactStatDivider} />
          <View style={styles.impactStat}>
            <Text style={styles.impactStatNum}>{communityPoints.toLocaleString('tr-TR')}</Text>
            <Text style={styles.impactStatLabel}>Topluluk birikimi</Text>
          </View>
        </View>
      </View>

      {/* Acil Durum */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>🚨 Acil Hatlar</Text>
        <View style={styles.emergencyRow}>
          {[
            {number: '112', label: 'Acil'},
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
              <Text style={styles.emergencyNumber}>{number}</Text>
              <Text style={styles.emergencyLabel}>{label}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>
    </ScrollView>
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
  sectionTitle: {fontSize: 18, fontWeight: '600', color: colors.text, marginBottom: 12},
  progressBar: {height: 12, backgroundColor: colors.border, borderRadius: 6, overflow: 'hidden', marginBottom: 8},
  progressFill: {height: '100%', backgroundColor: colors.primary, borderRadius: 6},
  progressText: {fontSize: 16, fontWeight: '600', color: colors.text, marginBottom: 4},
  progressSubtext: {fontSize: 14, color: colors.textSecondary},
  badgesTitleRow: {flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12},
  badgesToggle: {fontSize: 13, fontWeight: '600', color: colors.primary},
  badgesGrid: {flexDirection: 'row', flexWrap: 'wrap', gap: 10},
  badgeCard: {
    width: '30%', paddingVertical: 14, paddingHorizontal: 6,
    backgroundColor: colors.primary, borderRadius: 12, alignItems: 'center',
  },
  badgeCardLocked: {backgroundColor: colors.border, opacity: 0.5},
  badgeIconWrap: {
    width: 48, height: 48, borderRadius: 24,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center', justifyContent: 'center', marginBottom: 8,
  },
  badgeIcon: {fontSize: 26},
  badgeName: {fontSize: 10, fontWeight: '600', color: '#FFFFFF', textAlign: 'center', lineHeight: 13},
  badgeNameLocked: {color: colors.textSecondary},
  impactDesc: {fontSize: 13, color: colors.textSecondary, lineHeight: 19, marginBottom: 16},
  causeRow: {flexDirection: 'row', gap: 10, marginBottom: 10},
  causeCard: {
    flex: 1, borderRadius: 14, borderWidth: 2, borderColor: colors.border,
    backgroundColor: colors.background, padding: 12, alignItems: 'center', position: 'relative',
  },
  causeCardActive: {borderColor: colors.primary, backgroundColor: colors.primaryLight},
  causeIcon: {fontSize: 24, marginBottom: 6},
  causeName: {fontSize: 11, fontWeight: '700', color: colors.textSecondary, textAlign: 'center'},
  causeNameActive: {color: colors.primary},
  causeCheck: {
    position: 'absolute', top: 6, right: 6, width: 18, height: 18,
    borderRadius: 9, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center',
  },
  causeCheckText: {fontSize: 10, color: '#FFF', fontWeight: '900'},
  causeDescText: {fontSize: 12, color: colors.textSecondary, fontStyle: 'italic', textAlign: 'center', marginBottom: 14},
  impactStatsRow: {flexDirection: 'row', backgroundColor: colors.background, borderRadius: 12, padding: 14},
  impactStat: {flex: 1, alignItems: 'center'},
  impactStatDivider: {width: 1, backgroundColor: colors.border, marginVertical: 4},
  impactStatNum: {fontSize: 22, fontWeight: '900', color: colors.primary, marginBottom: 3},
  impactStatLabel: {fontSize: 11, color: colors.textSecondary, fontWeight: '500'},
  emergencyRow: {flexDirection: 'row', gap: 10},
  emergencyButton: {
    flex: 1, backgroundColor: colors.background,
    borderWidth: 1, borderColor: colors.border,
    borderRadius: 12, paddingVertical: 14, alignItems: 'center',
  },
  emergencyNumber: {fontSize: 20, fontWeight: '700', color: colors.text, marginBottom: 4},
  emergencyLabel: {fontSize: 11, fontWeight: '500', color: colors.textSecondary},
});
