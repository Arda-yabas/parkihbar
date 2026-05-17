import React, {useState, useEffect, useRef, useMemo, useCallback} from 'react';
import {StyleSheet, View, Text, TouchableOpacity, ScrollView, Animated} from 'react-native';
import {useNavigation, useFocusEffect} from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {useTheme, Colors} from '../../../theme/ThemeContext';
import {AuthService, FirestoreService} from '../../../services/firebase';
import {CATEGORY_OPTIONS} from '../../../constants/reportTemplates';

const VIOLATION_ICONS: Record<string, string> = Object.fromEntries(
  CATEGORY_OPTIONS.map(c => [c.value, c.icon]),
);
const VIOLATION_NAMES: Record<string, string> = Object.fromEntries(
  CATEGORY_OPTIONS.map(c => [c.value, c.label]),
);

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

const CAUSES = [
  {id: 'sehit',   icon: '🎖️', title: 'Şehit Aileleri',   desc: 'Vatanı için hayatını kaybedenlerin aileleri'},
  {id: 'engelli', icon: '♿',  title: 'Engelli Bireyler',  desc: 'Engelli bireylerin erişim hakkı için'},
  {id: 'gazi',    icon: '🏅', title: 'Gaziler',            desc: 'Görevde yaralanan gazilerin iyileşmesi için'},
];

export const DashboardScreen = () => {
  const navigation = useNavigation();
  const {colors} = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);

  const [userData, setUserData] = useState({level: 1, points: 0, totalReports: 0});
  const [recentReports, setRecentReports] = useState<{id: string; type: string; icon: string; time: string; status: string}[]>([]);
  const [topUsers, setTopUsers] = useState<{id: string; name: string; points: number; avatar: string}[]>([]);
  const [dailyProgress] = useState(0);
  const [userAvatar, setUserAvatar] = useState('👤');
  const [selectedCause] = useState('sehit');
  const [donationPoints] = useState(12);
  const [unreadCount, setUnreadCount] = useState(0);

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;

  useEffect(() => {
    AsyncStorage.getItem('@avatar').then(v => { if (v) setUserAvatar(v); }).catch(() => {});
    loadUserData();
    loadRecentReports();
    loadLeaderboard();
    Animated.parallel([
      Animated.timing(fadeAnim, {toValue: 1, duration: 600, useNativeDriver: true}),
      Animated.timing(slideAnim, {toValue: 0, duration: 600, useNativeDriver: true}),
    ]).start();
  }, []);

  useFocusEffect(
    useCallback(() => {
      const user = AuthService.getCurrentUser();
      if (!user) return;
      FirestoreService.getUnreadNotificationCount(user.uid)
        .then(setUnreadCount)
        .catch(() => {});
    }, []),
  );

  const loadUserData = async () => {
    try {
      const user = AuthService.getCurrentUser();
      if (!user) return;
      const data = await FirestoreService.getUserData(user.uid);
      if (data) {
        setUserData({
          level: data.level || 1,
          points: data.points || 0,
          totalReports: data.totalReports || 0,
        });
      }
    } catch {}
  };

  const loadRecentReports = async () => {
    try {
      const reports = await FirestoreService.getNearbyReports(3);
      setRecentReports(
        reports.map(r => ({
          id: r.id ?? '',
          type: VIOLATION_NAMES[r.type] ?? r.type?.replace(/_/g, ' ').replace(/\b\w/g, c => c.toLocaleUpperCase('tr')),
          icon: VIOLATION_ICONS[r.type] ?? '🚗',
          time: formatTime(r.createdAt),
          status: r.status,
        })),
      );
    } catch {}
  };

  const loadLeaderboard = async () => {
    try {
      const leaders = await FirestoreService.getLeaderboard(3);
      setTopUsers(
        leaders.map((u: any, i) => ({
          id: u.id ?? String(i),
          name: u.displayName || 'Anonim',
          points: u.points || 0,
          avatar: '👤',
        })),
      );
    } catch {}
  };

  const getMedalEmoji = (index: number) => {
    if (index === 0) return '🥇';
    if (index === 1) return '🥈';
    if (index === 2) return '🥉';
    return '';
  };

  const trackFillPct = Math.min((dailyProgress / 2) * 100, 100);

  const level = userData.level;
  const points = userData.points;
  const levelInfo = LEVEL_NAMES[level] ?? LEVEL_NAMES[1];
  const nextLevel = Math.min(level + 1, 6);
  const currentLevelPoints = LEVEL_POINTS[level - 1] ?? 0;
  const nextLevelPoints = LEVEL_POINTS[nextLevel - 1] ?? 2000;
  const xpProgress =
    level >= 6
      ? 100
      : Math.max(0, Math.min(100, ((points - currentLevelPoints) / (nextLevelPoints - currentLevelPoints)) * 100));
  const pointsToNext = level < 6 ? nextLevelPoints - points : 0;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View>
          <Text style={styles.logo}>parkihbar</Text>
          <Text style={styles.slogan}>Şehrini Değiştir!</Text>
        </View>
        <TouchableOpacity
          style={styles.notificationButton}
          onPress={() => (navigation as any).navigate('Notifications')}
          activeOpacity={0.7}>
          <Text style={styles.notificationIcon}>🔔</Text>
          {unreadCount > 0 && (
            <View style={styles.notificationBadge}>
              <Text style={styles.notificationBadgeText}>
                {unreadCount > 9 ? '9+' : String(unreadCount)}
              </Text>
            </View>
          )}
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        <Animated.View style={[styles.content, {opacity: fadeAnim, transform: [{translateY: slideAnim}]}]}>
          {/* Game HUD Card */}
          <View style={styles.gameCard}>
            <View style={styles.gameCardTop}>
              <View style={styles.levelCircleWrapper}>
                <View style={styles.levelCircle}>
                  <Text style={styles.levelCircleAvatar}>{userAvatar}</Text>
                </View>
                <Text style={styles.levelCircleLabel}>SEVİYE {level}</Text>
              </View>
              <View style={styles.levelDetails}>
                <View style={styles.levelTitleRow}>
                  <Text style={styles.levelLabel}>{levelInfo.icon}  {levelInfo.name}</Text>
                  {level >= 6 && (
                    <View style={styles.maxBadge}>
                      <Text style={styles.maxBadgeText}>MAX</Text>
                    </View>
                  )}
                </View>
                <View style={styles.xpBarTrack}>
                  <View style={[styles.xpBarFill, {width: `${xpProgress}%`}]} />
                </View>
                <Text style={styles.xpText}>
                  {level < 6
                    ? `${points} / ${nextLevelPoints} XP  •  ${pointsToNext} puan kaldı`
                    : 'En yüksek seviyedesin! 🎉'}
                </Text>
              </View>
            </View>

            <View style={styles.gameStatsRow}>
              {[
                {icon: '⭐', value: String(userData.points), label: 'Puan'},
                {icon: '📋', value: String(userData.totalReports), label: 'İhbar'},
                {icon: '🎯', value: `${Math.round(xpProgress)}%`, label: 'İlerleme'},
              ].map(({icon, value, label}, i) => (
                <View key={label} style={[styles.gameStat, i > 0 && styles.gameStatDivider]}>
                  <Text style={styles.gameStatIcon}>{icon}</Text>
                  <Text style={styles.gameStatValue}>{value}</Text>
                  <Text style={styles.gameStatLabel}>{label}</Text>
                </View>
              ))}
            </View>
          </View>

          {/* Daily Mission Card */}
          <View style={styles.missionCard}>
            <View style={styles.missionHeader}>
              <View>
                <Text style={styles.missionLabel}>GÜNLÜK GÖREV</Text>
                <Text style={styles.missionTitle}>3 ihbar tamamla 🎯</Text>
              </View>
              <View style={styles.missionBadge}>
                <Text style={styles.missionBadgeText}>
                  {dailyProgress >= 3 ? '✅' : `${dailyProgress}/3`}
                </Text>
              </View>
            </View>
            <View style={styles.missionDots}>
              {[0, 1, 2].map(i => (
                <View key={i} style={[styles.missionDot, i < dailyProgress && styles.missionDotDone]}>
                  {i < dailyProgress
                    ? <Text style={styles.missionDotCheck}>✓</Text>
                    : <Text style={styles.missionDotNum}>{i + 1}</Text>}
                </View>
              ))}
              <View style={styles.missionTrack}>
                <View style={[styles.missionTrackFill, {width: `${trackFillPct}%`}]} />
              </View>
            </View>
            <Text style={styles.missionReward}>
              {dailyProgress >= 3
                ? '🎉 Tamamlandı! +50 XP ve +1 Etki Puanı kazandın 💚'
                : `${3 - dailyProgress} ihbar daha → +50 XP ve +1 Etki Puanı`}
            </Text>
          </View>

          {/* Social Impact Teaser */}
          <TouchableOpacity
            style={styles.impactTeaser}
            activeOpacity={0.85}
            onPress={() => navigation.navigate('Profile' as never)}>
            <View style={styles.impactTeaserLeft}>
              <Text style={styles.impactTeaserIcon}>
                {CAUSES.find(c => c.id === selectedCause)?.icon}
              </Text>
              <View>
                <Text style={styles.impactTeaserLabel}>💚 SOSYAL ETKİN</Text>
                <Text style={styles.impactTeaserTitle}>
                  {CAUSES.find(c => c.id === selectedCause)?.title}
                </Text>
                <Text style={styles.impactTeaserSub}>{donationPoints} etki puanı birikti</Text>
              </View>
            </View>
            <Text style={styles.impactTeaserArrow}>›</Text>
          </TouchableOpacity>

          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>📋 Son İhbarlar</Text>
              <TouchableOpacity onPress={() => navigation.navigate('Feed' as never)}>
                <Text style={styles.seeMore}>Daha fazla →</Text>
              </TouchableOpacity>
            </View>
            {recentReports.map(report => (
              <View key={report.id} style={styles.reportCard}>
                <Text style={styles.reportIcon}>{report.icon}</Text>
                <View style={styles.reportInfo}>
                  <Text style={styles.reportType}>{report.type}</Text>
                  <Text style={styles.reportTime}>{report.time}</Text>
                </View>
                <View style={[styles.reportStatus, report.status === 'verified' && styles.reportStatusVerified]}>
                  <Text style={styles.reportStatusText}>
                    {report.status === 'verified' ? '✓ Onaylı' : '⏳ Bekliyor'}
                  </Text>
                </View>
              </View>
            ))}
          </View>

          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>🏆 Bu Haftanın Liderleri</Text>
              <TouchableOpacity onPress={() => navigation.navigate('Leaderboard' as never)}>
                <Text style={styles.seeMore}>Tümü →</Text>
              </TouchableOpacity>
            </View>
            {topUsers.map((user, index) => (
              <View key={user.id} style={styles.leaderCard}>
                <Text style={styles.leaderMedal}>{getMedalEmoji(index)}</Text>
                <Text style={styles.leaderAvatar}>{user.avatar}</Text>
                <View style={styles.leaderInfo}>
                  <Text style={styles.leaderName}>{user.name}</Text>
                  <Text style={styles.leaderPoints}>{user.points} puan</Text>
                </View>
              </View>
            ))}
          </View>

          <View style={{height: 100}} />
        </Animated.View>
      </ScrollView>
    </View>
  );
};

const makeStyles = (colors: Colors) => StyleSheet.create({
  container: {flex: 1, backgroundColor: colors.background},
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    padding: 20, paddingTop: 60, backgroundColor: colors.card,
  },
  logo: {fontSize: 28, fontWeight: 'bold', color: colors.primary},
  slogan: {fontSize: 14, color: colors.textSecondary, marginTop: 2},
  notificationButton: {
    position: 'relative', width: 44, height: 44, borderRadius: 22,
    backgroundColor: colors.background, justifyContent: 'center', alignItems: 'center',
  },
  notificationIcon: {fontSize: 24},
  notificationBadge: {
    position: 'absolute', top: 0, right: 0, width: 20, height: 20,
    borderRadius: 10, backgroundColor: '#FF3B30', justifyContent: 'center', alignItems: 'center',
  },
  notificationBadgeText: {color: '#FFFFFF', fontSize: 12, fontWeight: 'bold'},
  scrollView: {flex: 1},
  content: {padding: 16},
  gameCard: {
    backgroundColor: colors.primary,
    borderRadius: 20,
    marginBottom: 14,
    overflow: 'hidden',
    shadowColor: colors.primary,
    shadowOffset: {width: 0, height: 8},
    shadowOpacity: 0.35,
    shadowRadius: 16,
    elevation: 10,
  },
  gameCardTop: {flexDirection: 'row', alignItems: 'center', padding: 20, paddingBottom: 16},
  levelCircleWrapper: {alignItems: 'center', marginRight: 16},
  levelCircle: {
    width: 64, height: 64, borderRadius: 32,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderWidth: 2, borderColor: 'rgba(255,255,255,0.5)',
    alignItems: 'center', justifyContent: 'center',
  },
  levelCircleAvatar: {fontSize: 32},
  levelCircleLabel: {fontSize: 10, fontWeight: '800', color: 'rgba(255,255,255,0.85)', marginTop: 6, letterSpacing: 0.5},
  levelDetails: {flex: 1},
  levelTitleRow: {flexDirection: 'row', alignItems: 'center', marginBottom: 8},
  levelLabel: {fontSize: 15, fontWeight: '800', color: '#FFFFFF'},
  maxBadge: {marginLeft: 8, backgroundColor: '#FFD700', borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2},
  maxBadgeText: {fontSize: 9, fontWeight: '900', color: '#000'},
  xpBarTrack: {height: 8, backgroundColor: 'rgba(255,255,255,0.25)', borderRadius: 4, overflow: 'hidden', marginBottom: 6},
  xpBarFill: {height: '100%', backgroundColor: '#FFFFFF', borderRadius: 4},
  xpText: {fontSize: 11, color: 'rgba(255,255,255,0.75)', fontWeight: '500'},
  gameStatsRow: {
    flexDirection: 'row',
    borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.15)',
    marginHorizontal: 16, paddingVertical: 14,
  },
  gameStat: {flex: 1, alignItems: 'center'},
  gameStatDivider: {borderLeftWidth: 1, borderLeftColor: 'rgba(255,255,255,0.2)'},
  gameStatIcon: {fontSize: 18, marginBottom: 4},
  gameStatValue: {fontSize: 18, fontWeight: '800', color: '#FFFFFF', marginBottom: 2},
  gameStatLabel: {fontSize: 11, color: 'rgba(255,255,255,0.7)', fontWeight: '600'},
  missionCard: {
    backgroundColor: colors.card,
    borderRadius: 20, padding: 18, marginBottom: 14,
    shadowColor: '#000', shadowOffset: {width: 0, height: 2}, shadowOpacity: 0.08, shadowRadius: 10, elevation: 4,
    borderLeftWidth: 4, borderLeftColor: colors.accent,
  },
  missionHeader: {flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16},
  missionLabel: {fontSize: 10, fontWeight: '700', color: colors.accent, letterSpacing: 1.2, marginBottom: 4},
  missionTitle: {fontSize: 17, fontWeight: '800', color: colors.text},
  missionBadge: {backgroundColor: colors.accentLight, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 8},
  missionBadgeText: {fontSize: 18, fontWeight: '800', color: colors.accent},
  missionDots: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    marginBottom: 12, position: 'relative',
  },
  missionTrack: {
    position: 'absolute', left: 20, right: 20, height: 4,
    backgroundColor: colors.border, borderRadius: 2, zIndex: 0,
  },
  missionTrackFill: {height: '100%', backgroundColor: colors.accent, borderRadius: 2},
  missionDot: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: colors.border, alignItems: 'center', justifyContent: 'center',
    zIndex: 1, borderWidth: 2, borderColor: colors.border,
  },
  missionDotDone: {backgroundColor: colors.accent, borderColor: colors.accent},
  missionDotCheck: {fontSize: 16, color: '#FFFFFF', fontWeight: '700'},
  missionDotNum: {fontSize: 15, color: colors.textSecondary, fontWeight: '700'},
  missionReward: {fontSize: 13, color: colors.textSecondary, fontWeight: '500'},
  impactTeaser: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: colors.card, borderRadius: 16, padding: 14, marginBottom: 14,
    borderLeftWidth: 4, borderLeftColor: colors.primary,
    shadowColor: '#000', shadowOffset: {width: 0, height: 2}, shadowOpacity: 0.07, shadowRadius: 8, elevation: 3,
  },
  impactTeaserLeft: {flexDirection: 'row', alignItems: 'center', flex: 1, gap: 14},
  impactTeaserIcon: {fontSize: 32},
  impactTeaserLabel: {fontSize: 10, fontWeight: '700', color: colors.primary, letterSpacing: 1, marginBottom: 2},
  impactTeaserTitle: {fontSize: 15, fontWeight: '800', color: colors.text, marginBottom: 2},
  impactTeaserSub: {fontSize: 12, color: colors.textSecondary},
  impactTeaserArrow: {fontSize: 28, color: colors.textSecondary, fontWeight: '300'},
  section: {marginBottom: 20},
  sectionHeader: {flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12},
  sectionTitle: {fontSize: 18, fontWeight: 'bold', color: colors.text},
  seeMore: {fontSize: 14, color: colors.primary, fontWeight: '600'},
  reportCard: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: colors.card,
    borderRadius: 12, padding: 16, marginBottom: 12,
  },
  reportIcon: {fontSize: 32, marginRight: 12},
  reportInfo: {flex: 1},
  reportType: {fontSize: 16, fontWeight: '600', color: colors.text, marginBottom: 4},
  reportTime: {fontSize: 13, color: colors.textSecondary},
  reportStatus: {paddingHorizontal: 12, paddingVertical: 6, borderRadius: 12, backgroundColor: '#FFF3CD'},
  reportStatusVerified: {backgroundColor: '#D4EDDA'},
  reportStatusText: {fontSize: 12, fontWeight: '600', color: '#856404'},
  leaderCard: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: colors.card,
    borderRadius: 12, padding: 16, marginBottom: 12,
  },
  leaderMedal: {fontSize: 24, marginRight: 8},
  leaderAvatar: {fontSize: 32, marginRight: 12},
  leaderInfo: {flex: 1},
  leaderName: {fontSize: 16, fontWeight: '600', color: colors.text, marginBottom: 4},
  leaderPoints: {fontSize: 13, color: colors.textSecondary},
});
