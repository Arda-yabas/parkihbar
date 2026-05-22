import React, {useEffect, useState, useCallback, useRef, useMemo} from 'react';
import {
  StyleSheet,
  View,
  Text,
  FlatList,
  RefreshControl,
  Image,
  TouchableOpacity,
  ActivityIndicator,
  Linking,
} from 'react-native';
import {useNavigation} from '@react-navigation/native';
import {FirestoreService, Report} from '../../../services/firebase';
import {LocationService} from '../../../services/location.service';
import {useTheme, Colors} from '../../../theme/ThemeContext';
import {getTemplate} from '../../../constants/reportTemplates';

type FilterType = 'nearby' | 'city' | 'all';

const formatTimeAgo = (timestamp: any): string => {
  if (!timestamp) return 'Bilinmiyor';
  const now = Date.now();
  const then = timestamp.toMillis ? timestamp.toMillis() : timestamp;
  const diff = now - then;
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);
  if (minutes < 1) return 'Az önce';
  if (minutes < 60) return `${minutes} dk önce`;
  if (hours < 24) return `${hours} sa önce`;
  if (days < 7) return `${days} gün önce`;
  return `${Math.floor(days / 7)} hafta önce`;
};

const formatDistance = (km: number): string => {
  if (km < 1) return `${Math.round(km * 1000)} m`;
  return `${km.toFixed(1)} km`;
};

// ── Report card ───────────────────────────────────────────────────────────────
const ReportCard = ({
  report,
  distanceKm,
}: {
  report: Report;
  distanceKm?: number;
}) => {
  const navigation = useNavigation();
  const {colors} = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const template = getTemplate(report.type);

  return (
    <TouchableOpacity
      style={styles.card}
      activeOpacity={0.93}
      onPress={() => (navigation as any).navigate('ReportDetail', {report})}>
      <Image source={{uri: report.photoUrl}} style={styles.photo} />
      <View style={styles.photoOverlay} />
      <View style={styles.cardContent}>
        <View style={styles.cardTopRow}>
          <View style={styles.typeBadge}>
            <Text style={styles.typeIcon}>{template.emoji}</Text>
            <Text style={styles.typeLabel}>{template.name}</Text>
          </View>
          {distanceKm !== undefined && (
            <View style={styles.distanceBadge}>
              <Text style={styles.distanceText}>📍 {formatDistance(distanceKm)}</Text>
            </View>
          )}
        </View>
        <View style={styles.cardFooter}>
          <Text style={styles.locationText} numberOfLines={1}>
            {report.location.address}
          </Text>
          <View style={styles.bottomRow}>
            <Text style={styles.userName}>👤 {report.userName}</Text>
            <View style={styles.metaRight}>
              {(report.seenCount ?? 0) > 0 && (
                <Text style={styles.seenText}>👁 {report.seenCount}</Text>
              )}
              <Text style={styles.timeText}>{formatTimeAgo(report.createdAt)}</Text>
            </View>
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );
};

// ── Main screen ───────────────────────────────────────────────────────────────
export const FeedScreen = () => {
  const {colors} = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);

  const [reports, setReports] = useState<Report[]>([]);
  const [filteredReports, setFilteredReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState<FilterType>('city');
  const [userLocation, setUserLocation] = useState<{
    lat: number;
    lon: number;
    city: string;
  } | null>(null);
  const listRef = useRef<FlatList<Report>>(null);

  useEffect(() => {
    LocationService.getCurrentLocation()
      .then(loc =>
        setUserLocation({lat: loc.latitude, lon: loc.longitude, city: loc.city}),
      )
      .catch(() => {});
  }, []);

  const distanceTo = useCallback(
    (r: Report): number => {
      if (!userLocation || !r.location.latitude || !r.location.longitude) {
        return Infinity;
      }
      return LocationService.calculateDistance(
        userLocation.lat,
        userLocation.lon,
        r.location.latitude,
        r.location.longitude,
      );
    },
    [userLocation],
  );

  const applyFilter = useCallback(
    (data: Report[], filterType: FilterType) => {
      let result: Report[];

      if (!userLocation) {
        result = [...data];
      } else if (filterType === 'nearby') {
        result = data
          .filter(r => distanceTo(r) < 10)
          .sort((a, b) => distanceTo(a) - distanceTo(b));
      } else if (filterType === 'city') {
        const normalize = (s: string) =>
          s.toLocaleLowerCase('tr').trim()
           .replace(/\s*(il özel idaresi|büyükşehir belediyesi|belediyesi|ili)\s*$/i, '')
           .trim();
        const userCity = normalize(userLocation.city);
        const cityMatches = data.filter(r => {
          const rc = r.location.city;
          if (!rc) return false;
          const norm = normalize(rc);
          return norm === userCity || norm.includes(userCity) || userCity.includes(norm);
        });
        result = cityMatches.sort((a, b) => {
          const aMs = a.createdAt?.toMillis?.() ?? 0;
          const bMs = b.createdAt?.toMillis?.() ?? 0;
          return bMs - aMs;
        });
      } else {
        result = [...data].sort(
          (a, b) => (b.seenCount ?? 0) - (a.seenCount ?? 0),
        );
      }

      setFilteredReports(result);
    },
    [userLocation, distanceTo],
  );

  useEffect(() => {
    const unsub = FirestoreService.listenReports(100, data => {
      setReports(data);
      setLoading(false);
      setRefreshing(false);
    });
    return () => unsub();
  }, []);

  useEffect(() => { applyFilter(reports, filter); }, [userLocation, reports, filter, applyFilter]);

  const onFilterChange = (newFilter: FilterType) => {
    setFilter(newFilter);
    applyFilter(reports, newFilter);
    listRef.current?.scrollToOffset({offset: 0, animated: true});
  };

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 600);
  }, []);

  const openNearbyOnMaps = () => {
    if (!userLocation) return;
    Linking.openURL(
      `maps://?q=park+ihlali&ll=${userLocation.lat},${userLocation.lon}&z=14`,
    ).catch(() =>
      Linking.openURL(
        `https://maps.google.com/?q=${userLocation.lat},${userLocation.lon}`,
      ),
    );
  };

  const contextText = useMemo(() => {
    const count = filteredReports.length;
    if (filter === 'nearby') {
      return `10 km çevresinde ${count} ihbar • yakına göre sıralı`;
    } else if (filter === 'city') {
      return userLocation
        ? `${userLocation.city}'de ${count} ihbar • en yeni önce`
        : `${count} ihbar`;
    } else {
      return `${count} ihbar • en çok onaylanan önce`;
    }
  }, [filter, filteredReports.length, userLocation]);

  if (loading) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Keşfet 🔍</Text>
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Keşfet 🔍</Text>
        <Text style={styles.headerSubtitle}>{contextText}</Text>
      </View>

      {/* Tabs */}
      <View style={styles.filters}>
        {([
          {key: 'nearby', label: '📍 Yakınımda'},
          {key: 'city',   label: '🏙️ Şehrim'},
          {key: 'all',    label: '🇹🇷 Tümü'},
        ] as const).map(({key, label}) => (
          <TouchableOpacity
            key={key}
            style={[styles.filterButton, filter === key && styles.filterButtonActive]}
            onPress={() => onFilterChange(key)}>
            <Text style={[styles.filterText, filter === key && styles.filterTextActive]}>
              {label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Yakınımda: harita butonu + mesafeli liste */}
      {filter === 'nearby' && userLocation && (
        <TouchableOpacity style={styles.mapsButton} onPress={openNearbyOnMaps} activeOpacity={0.8}>
          <Text style={styles.mapsButtonIcon}>🗺️</Text>
          <Text style={styles.mapsButtonText}>Yakın ihbarları haritada gör</Text>
          <Text style={styles.mapsButtonArrow}>›</Text>
        </TouchableOpacity>
      )}

      <FlatList
        ref={listRef}
        data={filteredReports}
        keyExtractor={item => item.id || ''}
        renderItem={({item}) => (
          <ReportCard
            report={item}
            distanceKm={filter === 'nearby' ? distanceTo(item) : undefined}
          />
        )}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.primary}
            colors={[colors.primary]}
          />
        }
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Text style={styles.emptyIcon}>
              {filter === 'nearby' ? '📍' : filter === 'city' ? '🏙️' : '🔍'}
            </Text>
            <Text style={styles.emptyTitle}>İhbar Bulunamadı</Text>
            <Text style={styles.emptyText}>
              {filter === 'nearby'
                ? '10 km çevrenizde henüz ihbar yok'
                : filter === 'city'
                ? `${userLocation?.city ?? 'Şehriniz'}de henüz ihbar yok.\nTümünü görmek için "🇹🇷 Tümü" sekmesine geçin.`
                : 'Henüz hiç ihbar yapılmamış'}
            </Text>
          </View>
        }
      />
    </View>
  );
};

// ── Styles ────────────────────────────────────────────────────────────────────
const makeStyles = (colors: Colors) =>
  StyleSheet.create({
    container: {flex: 1, backgroundColor: colors.background},
    header: {
      paddingTop: 60, paddingHorizontal: 20, paddingBottom: 12,
      backgroundColor: colors.background,
      borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border,
    },
    headerTitle: {fontSize: 28, fontWeight: 'bold', color: colors.text, marginBottom: 2},
    headerSubtitle: {fontSize: 13, color: colors.textSecondary},
    filters: {
      flexDirection: 'row', paddingHorizontal: 16, paddingVertical: 10, gap: 8,
    },
    filterButton: {
      flex: 1, paddingVertical: 8, paddingHorizontal: 4, borderRadius: 20,
      backgroundColor: colors.card, alignItems: 'center',
      borderWidth: 1, borderColor: colors.border,
    },
    filterButtonActive: {backgroundColor: colors.primary, borderColor: colors.primary},
    filterText: {fontSize: 12, fontWeight: '600', color: colors.textSecondary},
    filterTextActive: {color: '#FFFFFF'},
    // Yakınımda harita butonu
    mapsButton: {
      flexDirection: 'row', alignItems: 'center',
      marginHorizontal: 16, marginBottom: 4, marginTop: 2,
      backgroundColor: colors.card, borderRadius: 12, padding: 12,
      borderWidth: 1, borderColor: colors.border,
    },
    mapsButtonIcon: {fontSize: 20, marginRight: 10},
    mapsButtonText: {flex: 1, fontSize: 14, fontWeight: '600', color: colors.text},
    mapsButtonArrow: {fontSize: 20, color: colors.textSecondary},
    listContent: {padding: 16, paddingBottom: 100},
    // Card
    card: {
      backgroundColor: colors.card, borderRadius: 16, marginBottom: 16,
      overflow: 'hidden', elevation: 3,
      shadowColor: '#000', shadowOffset: {width: 0, height: 2},
      shadowOpacity: 0.1, shadowRadius: 8,
    },
    photo: {width: '100%', height: 200, backgroundColor: colors.border},
    photoOverlay: {
      position: 'absolute', top: 0, left: 0, right: 0, height: 200,
      backgroundColor: 'rgba(0,0,0,0.08)',
    },
    cardContent: {position: 'absolute', bottom: 0, left: 0, right: 0, padding: 12},
    cardTopRow: {
      flexDirection: 'row', justifyContent: 'space-between',
      alignItems: 'flex-start', marginBottom: 8,
    },
    typeBadge: {
      flexDirection: 'row', alignItems: 'center',
      backgroundColor: colors.primary, paddingHorizontal: 10, paddingVertical: 5,
      borderRadius: 20, alignSelf: 'flex-start',
    },
    typeIcon: {fontSize: 14, marginRight: 5},
    typeLabel: {color: '#FFF', fontSize: 13, fontWeight: '600'},
    distanceBadge: {
      backgroundColor: 'rgba(0,0,0,0.65)', paddingHorizontal: 8, paddingVertical: 4,
      borderRadius: 12,
    },
    distanceText: {color: '#FFF', fontSize: 12, fontWeight: '600'},
    cardFooter: {
      backgroundColor: 'rgba(0,0,0,0.65)', padding: 10, borderRadius: 10,
    },
    locationText: {color: '#FFF', fontSize: 13, fontWeight: '500', marginBottom: 6},
    bottomRow: {
      flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    },
    metaRight: {flexDirection: 'row', alignItems: 'center', gap: 8},
    seenText: {color: 'rgba(255,255,255,0.8)', fontSize: 12},
    userName: {color: 'rgba(255,255,255,0.9)', fontSize: 12},
    timeText: {color: 'rgba(255,255,255,0.7)', fontSize: 12},
    // Empty / Loading
    loadingContainer: {flex: 1, justifyContent: 'center', alignItems: 'center'},
    emptyState: {alignItems: 'center', paddingVertical: 80},
    emptyIcon: {fontSize: 56, marginBottom: 16},
    emptyTitle: {fontSize: 18, fontWeight: '600', color: colors.text, marginBottom: 6},
    emptyText: {
      fontSize: 14, color: colors.textSecondary,
      textAlign: 'center', paddingHorizontal: 32,
    },
  });
