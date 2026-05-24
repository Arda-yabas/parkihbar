import React, {useState, useEffect, useRef, useMemo, useCallback} from 'react';
import {StyleSheet, View, Text, TouchableOpacity, ScrollView, Animated, Linking, FlatList, AppState} from 'react-native';
import {useNavigation, useFocusEffect} from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {useTheme, Colors} from '../../../theme/ThemeContext';
import {AuthService, FirestoreService} from '../../../services/firebase';
import {GamificationService} from '../../../services/gamification.service';
import {CATEGORY_OPTIONS} from '../../../constants/reportTemplates';
import {CAUSES} from '../../../constants/causes';

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

const CARD_WIDTH = 118;
const CARD_GAP = 8;

export const DashboardScreen = () => {
  const navigation = useNavigation();
  const {colors} = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);

  const [userData, setUserData] = useState({level: 1, points: 0, totalReports: 0});
  const [recentReports, setRecentReports] = useState<{id: string; type: string; icon: string; time: string; status: string; raw: any}[]>([]);
  const [dailyProgress, setDailyProgress] = useState(0);
  const [userAvatar, setUserAvatar] = useState('👤');
  const [unreadCount, setUnreadCount] = useState(0);

  const donationListRef = useRef<FlatList>(null);
  const donationIndex = useRef(0);
  const donationInterval = useRef<ReturnType<typeof setInterval> | null>(null);

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;

  useEffect(() => {
    AsyncStorage.getItem('@avatar').then(v => { if (v) setUserAvatar(v); }).catch(() => {});
    Animated.parallel([
      Animated.timing(fadeAnim, {toValue: 1, duration: 600, useNativeDriver: true}),
      Animated.timing(slideAnim, {toValue: 0, duration: 600, useNativeDriver: true}),
    ]).start();

    const user = AuthService.getCurrentUser();

    const prevDailyProgress = {current: 0};
    const unsubUser = user
      ? FirestoreService.listenUserData(user.uid, data => {
          if (data) {
            setUserData({level: data.level || 1, points: data.points || 0, totalReports: data.totalReports || 0});
          }
          // Haftalık görev — kullanıcı verisi değişince bu haftaki sayıyı güncelle
          FirestoreService.getThisWeekReportCount(user.uid).then(count => {
            // 3'e ulaştıysa ve daha önce ödül verilmediyse +50 XP ver
            if (count >= 3 && prevDailyProgress.current < 3) {
              const monday = new Date();
              monday.setHours(0, 0, 0, 0);
              const day = monday.getDay();
              monday.setDate(monday.getDate() - (day === 0 ? 6 : day - 1));
              const weekKey = `@weekly_bonus_${monday.toDateString()}`;
              AsyncStorage.getItem(weekKey).then(given => {
                if (!given) {
                  AsyncStorage.setItem(weekKey, 'true').catch(() => {});
                  GamificationService.addPoints(user.uid, 50).catch(() => {});
                }
              }).catch(() => {});
            }
            prevDailyProgress.current = count;
            setDailyProgress(count);
          }).catch(() => {});
        })
      : () => {};

    const unsubReports = FirestoreService.listenReports(3, reports => {
      setRecentReports(
        reports.map(r => ({
          id: r.id ?? '',
          type: VIOLATION_NAMES[r.type] ?? r.type?.replace(/_/g, ' ').replace(/\b\w/g, c => c.toLocaleUpperCase('tr')),
          icon: VIOLATION_ICONS[r.type] ?? '🚗',
          time: formatTime(r.createdAt),
          status: r.status,
          raw: r,
        })),
      );
    });

    const unsubUnread = user
      ? FirestoreService.listenUnreadCount(user.uid, setUnreadCount)
      : () => {};

    return () => {
      unsubUser();
      unsubReports();
      unsubUnread();
    };
  }, []);

  const startDonationLoop = useCallback(() => {
    if (donationInterval.current) clearInterval(donationInterval.current);
    donationInterval.current = setInterval(() => {
      donationIndex.current = (donationIndex.current + 1) % CAUSES.length;
      donationListRef.current?.scrollToIndex({index: donationIndex.current, animated: true});
    }, 3000);
  }, []);

  useFocusEffect(
    useCallback(() => {
      startDonationLoop();
      return () => {
        if (donationInterval.current) clearInterval(donationInterval.current);
      };
    }, [startDonationLoop]),
  );

  useEffect(() => {
    const sub = AppState.addEventListener('change', state => {
      if (state === 'active') startDonationLoop();
      else if (donationInterval.current) clearInterval(donationInterval.current);
    });
    return () => sub.remove();
  }, [startDonationLoop]);


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
                <Text style={styles.missionLabel}>HAFTALIK GÖREV</Text>
                <Text style={styles.missionTitle}>Bu hafta 3 ihbar tamamla 🎯</Text>
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
                ? '🎉 Bu hafta tamamlandı! +50 XP kazandın 💚'
                : `${3 - dailyProgress} ihbar daha → +50 XP`}
            </Text>
          </View>

          {/* Donation Section */}
          <View style={styles.donationSection}>
            <View style={styles.donationMission}>
              <Text style={styles.donationMissionTitle}>Tek başına küçük, birlikte güçlü.</Text>
              <Text style={styles.donationMissionText}>
                parkihbar bir topluluk hareketidir. Şehri birlikte dönüştürüyoruz — ihbarla, sesimizle ve destekle. Aşağıdaki sivil toplum kuruluşları da bu değişimin parçası.
              </Text>
            </View>
            <View style={styles.donationSectionHeader}>
              <Text style={styles.sectionTitle}>💚 Destekle</Text>
              <TouchableOpacity onPress={() => navigation.navigate('Donations' as never)}>
                <Text style={styles.seeMore}>Tümü →</Text>
              </TouchableOpacity>
            </View>
            <FlatList
              ref={donationListRef}
              data={CAUSES}
              horizontal
              showsHorizontalScrollIndicator={false}
              keyExtractor={item => item.id}
              snapToInterval={CARD_WIDTH + CARD_GAP}
              decelerationRate="fast"
              contentContainerStyle={styles.donationList}
              onScrollBeginDrag={() => {
                if (donationInterval.current) clearInterval(donationInterval.current);
              }}
              onMomentumScrollEnd={e => {
                donationIndex.current = Math.round(e.nativeEvent.contentOffset.x / (CARD_WIDTH + CARD_GAP));
                startDonationLoop();
              }}
              renderItem={({item}) => (
                <TouchableOpacity
                  style={styles.donationCard}
                  activeOpacity={0.8}
                  onPress={() => {
                    FirestoreService.incrementDonationClick(item.id).catch(() => {});
                    Linking.openURL(item.url);
                  }}>
                  <View style={styles.donationCardTop}>
                    <Text style={styles.donationCardIcon}>{item.icon}</Text>
                    <Text style={styles.donationCardTitle}>{item.title}</Text>
                    <Text style={styles.donationCardOrg}>{item.org}</Text>
                  </View>
                  <View style={styles.donationCardBtn}>
                    <Text style={styles.donationCardBtnText}>Bağış Yap</Text>
                  </View>
                </TouchableOpacity>
              )}
            />
          </View>

          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>📋 Son İhbarlar</Text>
              <TouchableOpacity onPress={() => navigation.navigate('Feed' as never)}>
                <Text style={styles.seeMore}>Daha fazla →</Text>
              </TouchableOpacity>
            </View>
            {recentReports.map(report => (
              <TouchableOpacity
                key={report.id}
                style={styles.reportCard}
                activeOpacity={0.7}
                onPress={() => (navigation as any).navigate('ReportDetail', {report: report.raw})}>
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
              </TouchableOpacity>
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
  content: {padding: 12},
  gameCard: {
    backgroundColor: colors.primary,
    borderRadius: 18,
    marginBottom: 10,
    overflow: 'hidden',
    shadowColor: colors.primary,
    shadowOffset: {width: 0, height: 6},
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
  },
  gameCardTop: {flexDirection: 'row', alignItems: 'center', padding: 12, paddingBottom: 10},
  levelCircleWrapper: {alignItems: 'center', marginRight: 12},
  levelCircle: {
    width: 46, height: 46, borderRadius: 23,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderWidth: 2, borderColor: 'rgba(255,255,255,0.5)',
    alignItems: 'center', justifyContent: 'center',
  },
  levelCircleAvatar: {fontSize: 22},
  levelCircleLabel: {fontSize: 9, fontWeight: '800', color: 'rgba(255,255,255,0.85)', marginTop: 4, letterSpacing: 0.5},
  levelDetails: {flex: 1},
  levelTitleRow: {flexDirection: 'row', alignItems: 'center', marginBottom: 6},
  levelLabel: {fontSize: 13, fontWeight: '800', color: '#FFFFFF'},
  maxBadge: {marginLeft: 6, backgroundColor: '#FFD700', borderRadius: 5, paddingHorizontal: 5, paddingVertical: 1},
  maxBadgeText: {fontSize: 9, fontWeight: '900', color: '#000'},
  xpBarTrack: {height: 6, backgroundColor: 'rgba(255,255,255,0.25)', borderRadius: 3, overflow: 'hidden', marginBottom: 4},
  xpBarFill: {height: '100%', backgroundColor: '#FFFFFF', borderRadius: 3},
  xpText: {fontSize: 10, color: 'rgba(255,255,255,0.75)', fontWeight: '500'},
  gameStatsRow: {
    flexDirection: 'row',
    borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.15)',
    marginHorizontal: 12, paddingVertical: 9,
  },
  gameStat: {flex: 1, alignItems: 'center'},
  gameStatDivider: {borderLeftWidth: 1, borderLeftColor: 'rgba(255,255,255,0.2)'},
  gameStatIcon: {fontSize: 14, marginBottom: 2},
  gameStatValue: {fontSize: 15, fontWeight: '800', color: '#FFFFFF', marginBottom: 1},
  gameStatLabel: {fontSize: 10, color: 'rgba(255,255,255,0.7)', fontWeight: '600'},
  missionCard: {
    backgroundColor: colors.card,
    borderRadius: 16, padding: 12, marginBottom: 10,
    shadowColor: '#000', shadowOffset: {width: 0, height: 2}, shadowOpacity: 0.07, shadowRadius: 8, elevation: 3,
    borderLeftWidth: 4, borderLeftColor: colors.accent,
  },
  missionHeader: {flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10},
  missionLabel: {fontSize: 9, fontWeight: '700', color: colors.accent, letterSpacing: 1.2, marginBottom: 2},
  missionTitle: {fontSize: 14, fontWeight: '800', color: colors.text},
  missionBadge: {backgroundColor: colors.accentLight, borderRadius: 10, paddingHorizontal: 10, paddingVertical: 5},
  missionBadgeText: {fontSize: 14, fontWeight: '800', color: colors.accent},
  missionDots: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    marginBottom: 8, position: 'relative',
  },
  missionTrack: {
    position: 'absolute', left: 16, right: 16, height: 3,
    backgroundColor: colors.border, borderRadius: 2, zIndex: 0,
  },
  missionTrackFill: {height: '100%', backgroundColor: colors.accent, borderRadius: 2},
  missionDot: {
    width: 32, height: 32, borderRadius: 16,
    backgroundColor: colors.border, alignItems: 'center', justifyContent: 'center',
    zIndex: 1, borderWidth: 2, borderColor: colors.border,
  },
  missionDotDone: {backgroundColor: colors.accent, borderColor: colors.accent},
  missionDotCheck: {fontSize: 13, color: '#FFFFFF', fontWeight: '700'},
  missionDotNum: {fontSize: 12, color: colors.textSecondary, fontWeight: '700'},
  missionReward: {fontSize: 11, color: colors.textSecondary, fontWeight: '500'},
  donationSection: {marginBottom: 14},
  donationSectionHeader: {flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8},
  donationMission: {
    backgroundColor: colors.card,
    borderRadius: 14, padding: 14, marginBottom: 12,
    borderLeftWidth: 3, borderLeftColor: colors.primary,
  },
  donationMissionTitle: {fontSize: 14, fontWeight: '700', color: colors.text, marginBottom: 6},
  donationMissionText: {fontSize: 12, color: colors.textSecondary, lineHeight: 18},
  donationList: {gap: CARD_GAP, paddingRight: 4},
  donationCard: {
    width: CARD_WIDTH,
    height: 148,
    backgroundColor: colors.primary,
    borderRadius: 14, padding: 11,
    alignItems: 'center',
    justifyContent: 'space-between',
    shadowColor: colors.primary, shadowOffset: {width: 0, height: 3}, shadowOpacity: 0.22, shadowRadius: 6, elevation: 5,
  },
  donationCardTop: {alignItems: 'center'},
  donationCardIcon: {fontSize: 28, marginBottom: 6},
  donationCardTitle: {fontSize: 12, fontWeight: '800', color: '#FFFFFF', textAlign: 'center', marginBottom: 2},
  donationCardOrg: {fontSize: 10, color: 'rgba(255,255,255,0.7)', textAlign: 'center'},
  donationCardBtn: {backgroundColor: '#FFFFFF', borderRadius: 7, paddingHorizontal: 10, paddingVertical: 5},
  donationCardBtnText: {fontSize: 11, fontWeight: '700', color: colors.primary},
  section: {marginBottom: 14},
  sectionHeader: {flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10},
  sectionTitle: {fontSize: 16, fontWeight: 'bold', color: colors.text},
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
});
