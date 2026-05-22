import React, {useState, useEffect, useMemo} from 'react';
import {
  StyleSheet,
  View,
  Text,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  Image,
  RefreshControl,
} from 'react-native';
import {useRoute, useNavigation} from '@react-navigation/native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {FirestoreService, AuthService} from '../../../services/firebase';
import {useTheme, Colors} from '../../../theme/ThemeContext';
import {BackButton} from '../../../components/BackButton';

interface RouteParams {
  userId: string;
  userName: string;
  avatar?: string;
}

interface Report {
  id: string;
  type: string;
  photoUrl: string;
  note?: string;
  status: string;
  createdAt: any;
  location?: {address?: string; city?: string; district?: string};
  seenCount?: number;
}

const STATUS: Record<string, {label: string; color: string; icon: string}> = {
  pending:  {label: 'Bekliyor', color: '#F59E0B', icon: '⏳'},
  verified: {label: 'Onaylı',   color: '#22C55E', icon: '✓'},
  resolved: {label: 'Çözüldü', color: '#3B82F6', icon: '✓'},
};

const formatDate = (ts: any): string => {
  if (!ts) return '';
  const ms: number = ts?.toMillis ? ts.toMillis() : ts?.seconds ? ts.seconds * 1000 : Number(ts);
  return new Date(ms).toLocaleDateString('tr-TR', {day: '2-digit', month: 'short', year: 'numeric'});
};

export const UserReportsScreen = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const insets = useSafeAreaInsets();
  const {colors} = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const params = (route.params ?? {}) as Partial<RouteParams>;
  const userId = params.userId || AuthService.getCurrentUser()?.uid || '';
  const userName = params.userName || 'İhbarlarım';
  const avatar = params.avatar ?? '👤';

  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    if (!userId) return;
    const unsub = FirestoreService.listenUserReports(userId, 100, data => {
      setReports(data as Report[]);
      setLoading(false);
      setRefreshing(false);
    });
    return () => unsub();
  }, [userId]);

  const onRefresh = () => {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 600);
  };

  const total    = reports.length;
  const verified = reports.filter(r => r.status === 'verified' || r.status === 'resolved').length;
  const pending  = reports.filter(r => r.status === 'pending').length;
  const accuracy = total > 0 ? Math.round((verified / total) * 100) : 0;

  const renderItem = ({item}: {item: Report}) => {
    const s = STATUS[item.status] ?? {label: item.status, color: '#999', icon: '•'};
    return (
      <TouchableOpacity
        style={styles.card}
        activeOpacity={0.8}
        onPress={() => (navigation as any).navigate('ReportDetail', {report: item})}>
        {item.photoUrl ? (
          <Image source={{uri: item.photoUrl}} style={styles.cardImage} resizeMode="cover" />
        ) : (
          <View style={styles.cardImagePlaceholder}>
            <Text style={styles.cardImagePlaceholderIcon}>📷</Text>
          </View>
        )}
        <View style={styles.cardBody}>
          <View style={styles.cardTop}>
            <View style={[styles.statusBadge, {backgroundColor: s.color + '20', borderColor: s.color + '40'}]}>
              <View style={[styles.statusDot, {backgroundColor: s.color}]} />
              <Text style={[styles.statusText, {color: s.color}]}>{s.label}</Text>
            </View>
            <Text style={styles.cardDate}>{formatDate(item.createdAt)}</Text>
          </View>

          <Text style={styles.cardType}>{item.type || 'İhbar'}</Text>

          {item.note ? (
            <Text style={styles.cardNote} numberOfLines={2}>{item.note}</Text>
          ) : null}

          {item.location?.address ? (
            <Text style={styles.cardAddress} numberOfLines={1}>
              📍 {item.location.district ?? item.location.city ?? item.location.address}
            </Text>
          ) : null}

          {(item.seenCount ?? 0) > 0 && (
            <Text style={styles.cardSeen}>👁 {item.seenCount} kişi gördü</Text>
          )}
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={[styles.container, {paddingTop: insets.top}]}>
      <View style={styles.header}>
        <BackButton />
        <Text style={styles.headerTitle} numberOfLines={1}>{userName}</Text>
        <View style={styles.backBtn} />
      </View>

      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : (
        <FlatList
          data={reports}
          renderItem={renderItem}
          keyExtractor={item => item.id}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{paddingBottom: insets.bottom + 16}}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} colors={[colors.primary]} />
          }
          ListHeaderComponent={
            <View>
              <View style={styles.profileCard}>
                <Text style={styles.profileAvatar}>{avatar}</Text>
                <Text style={styles.profileName}>{userName}</Text>
                <Text style={styles.profileSub}>Kullanıcı İhbarları</Text>

                <View style={styles.statsRow}>
                  <View style={styles.stat}>
                    <Text style={styles.statNum}>{total}</Text>
                    <Text style={styles.statLabel}>Toplam</Text>
                  </View>
                  <View style={styles.statDivider} />
                  <View style={styles.stat}>
                    <Text style={[styles.statNum, {color: '#22C55E'}]}>{verified}</Text>
                    <Text style={styles.statLabel}>Onaylı</Text>
                  </View>
                  <View style={styles.statDivider} />
                  <View style={styles.stat}>
                    <Text style={[styles.statNum, {color: '#F59E0B'}]}>{pending}</Text>
                    <Text style={styles.statLabel}>Bekleyen</Text>
                  </View>
                  <View style={styles.statDivider} />
                  <View style={styles.stat}>
                    <Text style={[styles.statNum, {color: colors.primary}]}>{accuracy}%</Text>
                    <Text style={styles.statLabel}>Doğruluk</Text>
                  </View>
                </View>
              </View>

              {reports.length > 0 && (
                <Text style={styles.listHeader}>📋 Tüm İhbarlar ({total})</Text>
              )}
            </View>
          }
          ListEmptyComponent={
            <View style={styles.centered}>
              <Text style={styles.emptyEmoji}>📋</Text>
              <Text style={styles.emptyTitle}>Henüz ihbar yok</Text>
              <Text style={styles.emptyDesc}>Bu kullanıcı henüz ihbar oluşturmamış.</Text>
            </View>
          }
        />
      )}
    </View>
  );
};

const makeStyles = (colors: Colors) => StyleSheet.create({
  container: {flex: 1, backgroundColor: colors.background},
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 12,
    backgroundColor: colors.card,
    borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border,
  },
  backBtn: {width: 40, alignItems: 'flex-start'},
  backIcon: {fontSize: 32, color: colors.primary, lineHeight: 36},
  headerTitle: {fontSize: 18, fontWeight: '700', color: colors.text, flex: 1, textAlign: 'center'},
  centered: {flex: 1, minHeight: 300, justifyContent: 'center', alignItems: 'center', padding: 32},
  profileCard: {
    backgroundColor: colors.primary,
    paddingTop: 28, paddingBottom: 24, paddingHorizontal: 20,
    alignItems: 'center',
  },
  profileAvatar: {fontSize: 56, marginBottom: 10},
  profileName: {fontSize: 22, fontWeight: '800', color: '#FFFFFF', marginBottom: 4},
  profileSub: {fontSize: 13, color: 'rgba(255,255,255,0.7)', marginBottom: 20},
  statsRow: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: 16, paddingVertical: 14,
    width: '100%',
  },
  stat: {flex: 1, alignItems: 'center'},
  statDivider: {width: 1, backgroundColor: 'rgba(255,255,255,0.3)', marginVertical: 4},
  statNum: {fontSize: 22, fontWeight: '900', color: '#FFFFFF', marginBottom: 3},
  statLabel: {fontSize: 11, color: 'rgba(255,255,255,0.75)', fontWeight: '500'},
  listHeader: {
    fontSize: 16, fontWeight: '700', color: colors.text,
    paddingHorizontal: 16, paddingTop: 20, paddingBottom: 8,
  },
  card: {
    flexDirection: 'row',
    backgroundColor: colors.card,
    marginHorizontal: 16, marginBottom: 10,
    borderRadius: 14, overflow: 'hidden',
    shadowColor: '#000', shadowOffset: {width: 0, height: 2}, shadowOpacity: 0.06, shadowRadius: 6, elevation: 3,
  },
  cardImage: {width: 90, height: 90},
  cardImagePlaceholder: {
    width: 90, height: 90,
    backgroundColor: colors.border,
    justifyContent: 'center', alignItems: 'center',
  },
  cardImagePlaceholderIcon: {fontSize: 28},
  cardBody: {flex: 1, padding: 12},
  cardTop: {flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6},
  statusBadge: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 8, paddingVertical: 3,
    borderRadius: 10, borderWidth: 1,
  },
  statusDot: {width: 6, height: 6, borderRadius: 3, marginRight: 5},
  statusText: {fontSize: 11, fontWeight: '700'},
  cardDate: {fontSize: 11, color: colors.textSecondary},
  cardType: {fontSize: 14, fontWeight: '700', color: colors.text, marginBottom: 3},
  cardNote: {fontSize: 12, color: colors.textSecondary, lineHeight: 17, marginBottom: 3},
  cardAddress: {fontSize: 11, color: colors.textSecondary},
  cardSeen: {fontSize: 11, color: colors.textSecondary, marginTop: 3},
  emptyEmoji: {fontSize: 56},
  emptyTitle: {fontSize: 17, fontWeight: '700', color: colors.text, marginTop: 16, marginBottom: 6},
  emptyDesc: {fontSize: 13, color: colors.textSecondary, textAlign: 'center'},
});
