import React, {useState, useCallback, useMemo} from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
} from 'react-native';
import {useNavigation, useFocusEffect} from '@react-navigation/native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {AuthService, FirestoreService} from '../../../services/firebase';
import {useTheme, Colors} from '../../../theme/ThemeContext';
import {BackButton} from '../../../components/BackButton';

interface Notification {
  id: string;
  type: 'badge' | 'report' | 'social' | 'level' | 'system';
  title: string;
  message: string;
  read: boolean;
  createdAt: any;
  metadata?: Record<string, any>;
}

type Tab = 'all' | 'reports' | 'badges' | 'social';

const TYPE_ICON: Record<string, string> = {
  badge: '🏆',
  report: '✅',
  social: '👍',
  level: '⬆️',
  system: '📢',
};

const formatTime = (ts: any): string => {
  if (!ts) return '';
  const ms: number = ts?.toMillis ? ts.toMillis() : ts?.seconds ? ts.seconds * 1000 : Number(ts);
  const diff = Date.now() - ms;
  const m = Math.floor(diff / 60000);
  if (m < 1) return 'Az önce';
  if (m < 60) return `${m} dakika önce`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h} saat önce`;
  const d = Math.floor(h / 24);
  if (d === 1) return 'Dün';
  if (d < 7) return `${d} gün önce`;
  return `${Math.floor(d / 7)} hafta önce`;
};

export const NotificationsScreen = () => {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const {colors} = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);

  const [tab, setTab] = useState<Tab>('all');
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);

  useFocusEffect(
    useCallback(() => {
      loadNotifications();
    }, []),
  );

  const loadNotifications = async () => {
    setLoading(true);
    try {
      const user = AuthService.getCurrentUser();
      if (!user) return;
      const data = await FirestoreService.getNotifications(user.uid, 50);
      setNotifications(data as Notification[]);
    } catch {
    } finally {
      setLoading(false);
    }
  };

  const unreadCount = notifications.filter(n => !n.read).length;

  const filtered = notifications.filter(n => {
    if (tab === 'all') return true;
    if (tab === 'reports') return n.type === 'report';
    if (tab === 'badges') return n.type === 'badge';
    if (tab === 'social') return n.type === 'social';
    return true;
  });

  const markAllRead = async () => {
    const user = AuthService.getCurrentUser();
    if (!user) return;
    await FirestoreService.markAllNotificationsRead(user.uid).catch(() => {});
    setNotifications(prev => prev.map(n => ({...n, read: true})));
  };

  const onPress = async (n: Notification) => {
    if (!n.read) {
      await FirestoreService.markNotificationRead(n.id).catch(() => {});
      setNotifications(prev => prev.map(x => (x.id === n.id ? {...x, read: true} : x)));
    }
    if (n.type === 'report' && n.metadata?.reportId) {
      (navigation as any).navigate('ReportDetail', {reportId: n.metadata.reportId});
    }
  };

  const renderItem = ({item}: {item: Notification}) => (
    <TouchableOpacity
      style={[styles.card, !item.read && styles.cardUnread]}
      onPress={() => onPress(item)}
      activeOpacity={0.7}>
      <View style={styles.iconWrap}>
        <Text style={styles.iconText}>{TYPE_ICON[item.type] ?? '📢'}</Text>
      </View>
      <View style={styles.content}>
        <Text style={styles.title}>{item.title}</Text>
        <Text style={styles.message}>{item.message}</Text>
        <Text style={styles.time}>{formatTime(item.createdAt)}</Text>
      </View>
      {!item.read && <View style={styles.dot} />}
    </TouchableOpacity>
  );

  return (
    <View style={[styles.container, {paddingTop: insets.top}]}>
      <View style={styles.header}>
        <BackButton />
        <Text style={styles.headerTitle}>Bildirimler</Text>
        {unreadCount > 0 ? (
          <TouchableOpacity style={styles.markAllButton} onPress={markAllRead}>
            <Text style={styles.markAllText}>Tümü Okundu</Text>
          </TouchableOpacity>
        ) : (
          <View style={styles.headerRight} />
        )}
      </View>

      <View style={styles.tabs}>
        {(['all', 'reports', 'badges', 'social'] as Tab[]).map(t => (
          <TouchableOpacity
            key={t}
            style={[styles.tab, tab === t && styles.tabActive]}
            onPress={() => setTab(t)}>
            <Text style={[styles.tabText, tab === t && styles.tabTextActive]}>
              {t === 'all' ? 'Hepsi' : t === 'reports' ? 'İhbarlar' : t === 'badges' ? 'Rozetler' : 'Sosyal'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : filtered.length === 0 ? (
        <View style={styles.centered}>
          <Text style={styles.emptyIcon}>🔔</Text>
          <Text style={styles.emptyTitle}>Bildirim yok</Text>
          <Text style={styles.emptyDesc}>
            {tab === 'all' ? 'Henüz hiç bildirim almadın.' : 'Bu kategoride bildirim yok.'}
          </Text>
        </View>
      ) : (
        <FlatList
          data={filtered}
          renderItem={renderItem}
          keyExtractor={item => item.id}
          contentContainerStyle={[styles.list, {paddingBottom: insets.bottom + 16}]}
          showsVerticalScrollIndicator={false}
        />
      )}
    </View>
  );
};

const makeStyles = (colors: Colors) => StyleSheet.create({
  container: {flex: 1, backgroundColor: colors.background},
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    padding: 16, paddingTop: 12, backgroundColor: colors.card,
    borderBottomWidth: 1, borderBottomColor: colors.border,
  },
  backButton: {width: 40, height: 40, borderRadius: 20, backgroundColor: colors.background, justifyContent: 'center', alignItems: 'center'},
  backIcon: {fontSize: 24, color: colors.text},
  headerTitle: {fontSize: 20, fontWeight: 'bold', color: colors.text, flex: 1, textAlign: 'center'},
  headerRight: {width: 80},
  markAllButton: {paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8, backgroundColor: colors.primary + '20'},
  markAllText: {fontSize: 12, fontWeight: '600', color: colors.primary},
  tabs: {flexDirection: 'row', backgroundColor: colors.card, padding: 12, gap: 8},
  tab: {flex: 1, paddingVertical: 10, borderRadius: 8, backgroundColor: colors.background, alignItems: 'center'},
  tabActive: {backgroundColor: colors.primary},
  tabText: {fontSize: 13, fontWeight: '600', color: colors.textSecondary},
  tabTextActive: {color: '#FFFFFF'},
  list: {padding: 16},
  card: {
    flexDirection: 'row', backgroundColor: colors.card,
    borderRadius: 12, padding: 16, marginBottom: 12,
    shadowColor: '#000', shadowOffset: {width: 0, height: 2}, shadowOpacity: 0.05, shadowRadius: 8, elevation: 2,
  },
  cardUnread: {borderLeftWidth: 3, borderLeftColor: colors.primary},
  iconWrap: {
    width: 48, height: 48, borderRadius: 24,
    backgroundColor: colors.background,
    justifyContent: 'center', alignItems: 'center', marginRight: 12,
  },
  iconText: {fontSize: 24},
  content: {flex: 1},
  title: {fontSize: 16, fontWeight: '600', color: colors.text, marginBottom: 4},
  message: {fontSize: 14, color: colors.text, marginBottom: 4, lineHeight: 20},
  time: {fontSize: 12, color: colors.textSecondary},
  dot: {width: 8, height: 8, borderRadius: 4, backgroundColor: colors.primary, marginLeft: 8},
  centered: {flex: 1, justifyContent: 'center', alignItems: 'center', padding: 32},
  emptyIcon: {fontSize: 48, marginBottom: 16},
  emptyTitle: {fontSize: 18, fontWeight: '700', color: colors.text, marginBottom: 8},
  emptyDesc: {fontSize: 14, color: colors.textSecondary, textAlign: 'center', lineHeight: 20},
});
