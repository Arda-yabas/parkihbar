import React, {useState, useEffect, useRef, useMemo} from 'react';
import {StyleSheet, View, Text, TouchableOpacity, ScrollView, Animated} from 'react-native';
import {useNavigation} from '@react-navigation/native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {useTheme, Colors} from '../../../theme/ThemeContext';
import {FirestoreService} from '../../../services/firebase';

type Period = 'today' | 'week' | 'month';

interface Leader {
  id: string;
  name: string;
  avatar: string;
  points: number;
  reportsCount: number;
}

export const LeaderboardScreen = () => {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const {colors} = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);

  const [selectedPeriod, setSelectedPeriod] = useState<Period>('today');
  const [leaders, setLeaders] = useState<Leader[]>([]);

  const scaleAnim1 = useRef(new Animated.Value(0)).current;
  const scaleAnim2 = useRef(new Animated.Value(0)).current;
  const scaleAnim3 = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    loadLeaders();
    scaleAnim1.setValue(0);
    scaleAnim2.setValue(0);
    scaleAnim3.setValue(0);
    Animated.stagger(200, [
      Animated.spring(scaleAnim2, {toValue: 1, tension: 50, friction: 7, useNativeDriver: true}),
      Animated.spring(scaleAnim1, {toValue: 1, tension: 50, friction: 7, useNativeDriver: true}),
      Animated.spring(scaleAnim3, {toValue: 1, tension: 50, friction: 7, useNativeDriver: true}),
    ]).start();
  }, [selectedPeriod]);

  const goToUser = (leader: Leader) =>
    (navigation as any).navigate('UserReports', {
      userId: leader.id,
      userName: leader.name,
      avatar: leader.avatar,
    });

  const loadLeaders = async () => {
    try {
      const data = await FirestoreService.getLeaderboard(10, selectedPeriod);
      setLeaders(
        data.map((u: any, i) => ({
          id: u.id ?? String(i),
          name: u.displayName || 'Anonim',
          avatar: '👤',
          points: u.points || 0,
          reportsCount: u.totalReports || 0,
        })),
      );
    } catch {}
  };

  const top3 = leaders.slice(0, 3);

  return (
    <View style={styles.container}>
      <View style={[styles.header, {paddingTop: insets.top + 12}]}>
        <Text style={styles.headerTitle}>Liderler</Text>
      </View>

      <View style={styles.tabs}>
        {(['today', 'week', 'month'] as Period[]).map(period => (
          <TouchableOpacity
            key={period}
            style={[styles.tab, selectedPeriod === period && styles.tabActive]}
            onPress={() => setSelectedPeriod(period)}>
            <Text style={[styles.tabText, selectedPeriod === period && styles.tabTextActive]}>
              {period === 'today' ? 'Bugün' : period === 'week' ? 'Bu Hafta' : 'Bu Ay'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView style={styles.scrollView} contentContainerStyle={{paddingBottom: insets.bottom + 24}}>
        {top3.length >= 3 && (
          <View style={styles.podium}>
            {/* 2nd place — slightly lower */}
            <TouchableOpacity style={[styles.podiumItem, {marginTop: 28}]} onPress={() => goToUser(top3[1])}>
              <Animated.View style={[styles.podiumBox, styles.podiumBox2, {transform: [{scale: scaleAnim2}]}]}>
                <Text style={styles.podiumAvatar}>{top3[1].avatar}</Text>
                <Text style={styles.podiumName} numberOfLines={1}>{top3[1].name}</Text>
                <Text style={styles.podiumPoints}>{top3[1].points} p</Text>
                <View style={[styles.podiumRank, styles.podiumRank2]}><Text style={styles.podiumRankText}>2</Text></View>
              </Animated.View>
              <Text style={styles.podiumMedal}>🥈</Text>
            </TouchableOpacity>

            {/* 1st place — tallest / center */}
            <TouchableOpacity style={styles.podiumItem} onPress={() => goToUser(top3[0])}>
              <Animated.View style={[styles.podiumBox, styles.podiumBox1, {transform: [{scale: scaleAnim1}]}]}>
                <Text style={[styles.podiumAvatar, styles.podiumAvatar1]}>{top3[0].avatar}</Text>
                <Text style={[styles.podiumName, styles.podiumName1]} numberOfLines={1}>{top3[0].name}</Text>
                <Text style={[styles.podiumPoints, styles.podiumPoints1]}>{top3[0].points} p</Text>
                <View style={[styles.podiumRank, styles.podiumRank1]}><Text style={styles.podiumRankText}>1</Text></View>
              </Animated.View>
              <Text style={styles.podiumMedal}>🥇</Text>
            </TouchableOpacity>

            {/* 3rd place — lowest */}
            <TouchableOpacity style={[styles.podiumItem, {marginTop: 44}]} onPress={() => goToUser(top3[2])}>
              <Animated.View style={[styles.podiumBox, styles.podiumBox3, {transform: [{scale: scaleAnim3}]}]}>
                <Text style={styles.podiumAvatar}>{top3[2].avatar}</Text>
                <Text style={styles.podiumName} numberOfLines={1}>{top3[2].name}</Text>
                <Text style={styles.podiumPoints}>{top3[2].points} p</Text>
                <View style={[styles.podiumRank, styles.podiumRank3]}><Text style={styles.podiumRankText}>3</Text></View>
              </Animated.View>
              <Text style={styles.podiumMedal}>🥉</Text>
            </TouchableOpacity>
          </View>
        )}

        <View style={styles.listHeader}>
          <Text style={styles.listTitle}>
            {selectedPeriod === 'today'
              ? '🏆 Bugünün Liderleri'
              : selectedPeriod === 'week'
              ? '🏆 Bu Haftanın Liderleri'
              : '🏆 Bu Ayın Liderleri'}
          </Text>
          {leaders.length > 0 && (
            <Text style={styles.listSubtitle}>{leaders.length} kullanıcı</Text>
          )}
        </View>

        <View style={styles.list}>
          {leaders.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyIcon}>🏅</Text>
              <Text style={[styles.emptyText, {color: colors.textSecondary}]}>
                {selectedPeriod === 'today'
                  ? 'Bugün henüz ihbar yapılmadı'
                  : selectedPeriod === 'week'
                  ? 'Bu hafta henüz ihbar yapılmadı'
                  : 'Bu ay henüz ihbar yapılmadı'}
              </Text>
            </View>
          ) : (
            leaders.map((leader, index) => (
              <TouchableOpacity
                key={leader.id}
                style={styles.listItem}
                activeOpacity={0.75}
                onPress={() => goToUser(leader)}>
                <View style={styles.listRank}>
                  <Text style={styles.listRankText}>{index + 1}</Text>
                </View>
                <Text style={styles.listAvatar}>{leader.avatar}</Text>
                <View style={styles.listInfo}>
                  <Text style={styles.listName}>{leader.name}</Text>
                  <Text style={styles.listReports}>{leader.reportsCount} ihbar</Text>
                </View>
                <Text style={styles.listPoints}>{leader.points}p</Text>
              </TouchableOpacity>
            ))
          )}
        </View>
      </ScrollView>
    </View>
  );
};

const makeStyles = (colors: Colors) => StyleSheet.create({
  container: {flex: 1, backgroundColor: colors.background},
  header: {padding: 20, backgroundColor: colors.card, borderBottomWidth: 1, borderBottomColor: colors.border},
  headerTitle: {fontSize: 28, fontWeight: 'bold', color: colors.text},
  tabs: {flexDirection: 'row', backgroundColor: colors.card, paddingHorizontal: 12, paddingVertical: 12, gap: 6},
  tab: {flex: 1, paddingVertical: 10, paddingHorizontal: 4, borderRadius: 10, backgroundColor: colors.background, alignItems: 'center'},
  tabActive: {backgroundColor: colors.primary},
  tabText: {fontSize: 12, fontWeight: '600', color: colors.textSecondary, textAlign: 'center'},
  tabTextActive: {color: '#FFFFFF'},
  scrollView: {flex: 1},
  podium: {flexDirection: 'row', justifyContent: 'center', alignItems: 'flex-start', padding: 16, paddingTop: 28, gap: 10},
  podiumItem: {alignItems: 'center', width: 110},
  podiumBox: {
    backgroundColor: colors.card, borderRadius: 16, padding: 14, alignItems: 'center', width: '100%',
    shadowColor: '#000', shadowOffset: {width: 0, height: 4}, shadowOpacity: 0.1, shadowRadius: 8, elevation: 4, borderWidth: 2,
  },
  podiumBox1: {borderColor: '#FFD700'},
  podiumBox2: {borderColor: '#C0C0C0'},
  podiumBox3: {borderColor: '#CD7F32'},
  podiumAvatar: {fontSize: 36, marginBottom: 8},
  podiumAvatar1: {fontSize: 48},
  podiumName: {fontSize: 14, fontWeight: '600', color: colors.text, marginBottom: 4, textAlign: 'center'},
  podiumName1: {fontSize: 16},
  podiumPoints: {fontSize: 16, fontWeight: 'bold', color: colors.primary, marginBottom: 8},
  podiumPoints1: {fontSize: 18},
  podiumRank: {width: 32, height: 32, borderRadius: 16, justifyContent: 'center', alignItems: 'center'},
  podiumRank1: {backgroundColor: '#FFD700'},
  podiumRank2: {backgroundColor: '#C0C0C0'},
  podiumRank3: {backgroundColor: '#CD7F32'},
  podiumRankText: {fontSize: 16, fontWeight: 'bold', color: '#FFFFFF'},
  podiumMedal: {fontSize: 32, marginTop: 8},
  listHeader: {padding: 16, paddingBottom: 8},
  listTitle: {fontSize: 18, fontWeight: 'bold', color: colors.text},
  listSubtitle: {fontSize: 13, color: colors.textSecondary, marginTop: 2},
  list: {padding: 16, paddingTop: 0},
  listItem: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: colors.card,
    borderRadius: 12, padding: 16, marginBottom: 12,
  },
  listRank: {width: 32, height: 32, borderRadius: 16, backgroundColor: colors.primary + '20', justifyContent: 'center', alignItems: 'center', marginRight: 12},
  listRankText: {fontSize: 16, fontWeight: 'bold', color: colors.primary},
  listAvatar: {fontSize: 32, marginRight: 12},
  listInfo: {flex: 1},
  listName: {fontSize: 16, fontWeight: '600', color: colors.text, marginBottom: 4},
  listReports: {fontSize: 13, color: colors.textSecondary},
  listPoints: {fontSize: 18, fontWeight: 'bold', color: colors.text},
  emptyState: {alignItems: 'center', paddingVertical: 40},
  emptyIcon: {fontSize: 48, marginBottom: 12},
  emptyText: {fontSize: 15, textAlign: 'center'},
});
