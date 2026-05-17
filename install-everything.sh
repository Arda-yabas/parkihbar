#!/bin/bash

echo "🚀 parkihbar Navigation - OTOMATİK KURULUM"
echo ""
echo "Her şeyi ben yapacağım, sen izle! 🎬"
echo ""

GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Proje dizinini kontrol et
if [ ! -f "package.json" ]; then
    echo "${YELLOW}❌ Hata: parkihbar proje klasöründe değilsin!${NC}"
    echo "Lütfen 'cd Desktop/parkihbar' yap ve tekrar çalıştır"
    exit 1
fi

echo "${BLUE}📦 1/5: React Navigation paketleri kuruluyor...${NC}"
npm install @react-navigation/native @react-navigation/bottom-tabs @react-navigation/stack react-native-screens react-native-safe-area-context --silent

echo "${GREEN}✅ Paketler kuruldu!${NC}"
echo ""

echo "${BLUE}📱 2/5: iOS bağımlılıkları güncelleniyor...${NC}"
cd ios
pod install --silent
cd ..

echo "${GREEN}✅ iOS hazır!${NC}"
echo ""

echo "${BLUE}📁 3/5: Klasör yapısı oluşturuluyor...${NC}"

# Klasörleri oluştur
mkdir -p src/navigation
mkdir -p src/features/dashboard/screens
mkdir -p src/features/reports/screens
mkdir -p src/features/gamification/screens
mkdir -p src/features/profile/screens
mkdir -p src/theme

echo "${GREEN}✅ Klasörler hazır!${NC}"
echo ""

echo "${BLUE}✍️  4/5: Kodlar yazılıyor...${NC}"

# theme/index.ts
cat > src/theme/index.ts << 'EOF'
export const colors = {
  primary: '#10B981',
  primaryLight: '#D1FAE5',
  secondary: '#14B8A6',
  accent: '#F97316',
  background: '#F7F7F7',
  text: '#18181B',
  textSecondary: '#6D6D6D',
  border: '#E5E7EB',
};

export const typography = {
  sizes: {
    xs: 11,
    sm: 13,
    base: 15,
    lg: 18,
    xl: 20,
    '2xl': 24,
    '3xl': 28,
    '4xl': 32,
  },
  weights: {
    regular: '400' as '400',
    medium: '500' as '500',
    semibold: '600' as '600',
    bold: '700' as '700',
  },
};

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  '2xl': 32,
};
EOF

# AppNavigator.tsx
cat > src/navigation/AppNavigator.tsx << 'NAVIGATOR_EOF'
import React, {useState, useEffect} from 'react';
import {NavigationContainer} from '@react-navigation/native';
import {createBottomTabNavigator} from '@react-navigation/bottom-tabs';
import {Text, View, StyleSheet} from 'react-native';

import {SplashScreen} from '../features/dashboard/screens/SplashScreen';
import {DashboardScreen} from '../features/dashboard/screens/DashboardScreen';
import {FeedScreen} from '../features/reports/screens/FeedScreen';
import {LeaderboardScreen} from '../features/gamification/screens/LeaderboardScreen';
import {ProfileScreen} from '../features/profile/screens/ProfileScreen';

import {colors} from '../theme';

const Tab = createBottomTabNavigator();

const TabIcon = ({label, focused}: {label: string; focused: boolean}) => {
  const icons: {[key: string]: string} = {
    Ana: '🏠',
    Feed: '📱',
    Lider: '🏆',
    Profil: '👤',
  };

  return (
    <View style={styles.tabItem}>
      <Text style={[styles.tabIcon, focused && styles.tabIconActive]}>
        {icons[label]}
      </Text>
      <Text style={[styles.tabLabel, focused && styles.tabLabelActive]}>
        {label}
      </Text>
    </View>
  );
};

function MainTabs() {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarShowLabel: false,
        tabBarStyle: styles.tabBar,
      }}>
      <Tab.Screen
        name="Dashboard"
        component={DashboardScreen}
        options={{
          tabBarIcon: ({focused}) => <TabIcon label="Ana" focused={focused} />,
        }}
      />
      <Tab.Screen
        name="Feed"
        component={FeedScreen}
        options={{
          tabBarIcon: ({focused}) => <TabIcon label="Feed" focused={focused} />,
        }}
      />
      <Tab.Screen
        name="Leaderboard"
        component={LeaderboardScreen}
        options={{
          tabBarIcon: ({focused}) => <TabIcon label="Lider" focused={focused} />,
        }}
      />
      <Tab.Screen
        name="Profile"
        component={ProfileScreen}
        options={{
          tabBarIcon: ({focused}) => <TabIcon label="Profil" focused={focused} />,
        }}
      />
    </Tab.Navigator>
  );
}

export function AppNavigator() {
  const [showSplash, setShowSplash] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setShowSplash(false);
    }, 2500);

    return () => clearTimeout(timer);
  }, []);

  if (showSplash) {
    return <SplashScreen />;
  }

  return (
    <NavigationContainer>
      <MainTabs />
    </NavigationContainer>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    backgroundColor: 'white',
    height: 70,
    paddingBottom: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  tabItem: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabIcon: {
    fontSize: 24,
    marginBottom: 4,
    opacity: 0.5,
  },
  tabIconActive: {
    opacity: 1,
  },
  tabLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#6D6D6D',
  },
  tabLabelActive: {
    color: colors.primary,
    fontWeight: '700',
  },
});
NAVIGATOR_EOF

echo "  ✓ AppNavigator.tsx"

# DashboardScreen.tsx - Kısaltılmış versiyon
cat > src/features/dashboard/screens/DashboardScreen.tsx << 'DASHBOARD_EOF'
import React from 'react';
import {View, Text, StyleSheet, ScrollView, TouchableOpacity, StatusBar, Platform} from 'react-native';
import {colors, typography, spacing} from '../../../theme';

export const DashboardScreen = () => {
  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={colors.background} />
      
      <View style={styles.header}>
        <View>
          <Text style={styles.greeting}>Merhaba,</Text>
          <Text style={styles.name}>Arda 👋</Text>
        </View>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        
        <View style={styles.statsRow}>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>345</Text>
            <Text style={styles.statLabel}>PUAN</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>23</Text>
            <Text style={styles.statLabel}>İHBAR</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>#47</Text>
            <Text style={styles.statLabel}>SIRA</Text>
          </View>
        </View>

        <View style={styles.levelCard}>
          <View style={styles.levelHeader}>
            <View style={styles.levelInfo}>
              <Text style={styles.levelTitle}>Seviye 2</Text>
              <Text style={styles.levelSubtitle}>Sokak Koruyucusu 🛡️</Text>
            </View>
            <View style={styles.levelBadge}>
              <Text style={styles.levelBadgeText}>155 / 500</Text>
            </View>
          </View>
          <View style={styles.progressBar}>
            <View style={[styles.progressFill, {width: '31%'}]} />
          </View>
        </View>

        <TouchableOpacity style={styles.actionButton}>
          <Text style={styles.actionIcon}>📸</Text>
          <Text style={styles.actionText}>İhbar Et</Text>
        </TouchableOpacity>

        <Text style={styles.sectionTitle}>Yakın Aktiviteler</Text>

        <View style={styles.feedCard}>
          <Text style={styles.placeholder}>🎉 Navigation çalışıyor!</Text>
        </View>

        <View style={{height: 100}} />
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {flex: 1, backgroundColor: colors.background},
  header: {backgroundColor: 'white', paddingTop: 60, paddingHorizontal: spacing.xl, paddingBottom: spacing.xl, borderBottomWidth: 1, borderBottomColor: colors.border},
  greeting: {fontSize: typography.sizes.sm, fontWeight: '600', color: colors.textSecondary, marginBottom: 4},
  name: {fontSize: typography.sizes['2xl'], fontWeight: '700', color: colors.text},
  content: {flex: 1},
  statsRow: {flexDirection: 'row', gap: spacing.md, paddingHorizontal: spacing.xl, paddingTop: spacing.xl},
  statCard: {flex: 1, backgroundColor: 'white', padding: spacing.lg, borderRadius: 12, alignItems: 'center'},
  statValue: {fontSize: typography.sizes['2xl'], fontWeight: '700', color: colors.text, marginBottom: 4},
  statLabel: {fontSize: 11, fontWeight: '600', color: colors.textSecondary, letterSpacing: 0.5},
  levelCard: {backgroundColor: 'white', marginHorizontal: spacing.xl, marginTop: spacing.lg, padding: spacing.lg, borderRadius: 12},
  levelHeader: {flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.md},
  levelInfo: {flex: 1},
  levelTitle: {fontSize: typography.sizes.base, fontWeight: '700', color: colors.text, marginBottom: 2},
  levelSubtitle: {fontSize: typography.sizes.sm, fontWeight: '500', color: colors.textSecondary},
  levelBadge: {backgroundColor: colors.primary, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8},
  levelBadgeText: {fontSize: typography.sizes.sm, fontWeight: '700', color: 'white'},
  progressBar: {height: 6, backgroundColor: '#E5E7EB', borderRadius: 3, overflow: 'hidden'},
  progressFill: {height: '100%', backgroundColor: colors.primary, borderRadius: 3},
  actionButton: {backgroundColor: colors.accent, marginHorizontal: spacing.xl, marginTop: spacing['2xl'], height: 56, borderRadius: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10},
  actionIcon: {fontSize: 24},
  actionText: {fontSize: typography.sizes.base, fontWeight: '700', color: 'white'},
  sectionTitle: {fontSize: typography.sizes.lg, fontWeight: '700', color: colors.text, marginHorizontal: spacing.xl, marginTop: spacing['2xl'], marginBottom: spacing.md},
  feedCard: {backgroundColor: 'white', marginHorizontal: spacing.xl, padding: spacing.lg, borderRadius: 12, alignItems: 'center'},
  placeholder: {fontSize: 20},
});
DASHBOARD_EOF

echo "  ✓ DashboardScreen.tsx"

# Diğer ekranlar
cat > src/features/reports/screens/FeedScreen.tsx << 'EOF'
import React from 'react';
import {View, Text, StyleSheet, ScrollView} from 'react-native';
import {colors} from '../../../theme';

export const FeedScreen = () => (
  <View style={styles.container}>
    <View style={styles.header}>
      <Text style={styles.title}>İhbar Akışı</Text>
    </View>
    <ScrollView style={styles.content}>
      <View style={styles.placeholder}>
        <Text style={styles.emoji}>📱</Text>
        <Text style={styles.text}>Yakındaki ihbarlar burada görünecek</Text>
      </View>
    </ScrollView>
  </View>
);

const styles = StyleSheet.create({
  container: {flex: 1, backgroundColor: colors.background},
  header: {backgroundColor: 'white', paddingTop: 60, paddingHorizontal: 24, paddingBottom: 20, borderBottomWidth: 1, borderBottomColor: colors.border},
  title: {fontSize: 28, fontWeight: '700', color: colors.text},
  content: {flex: 1},
  placeholder: {alignItems: 'center', justifyContent: 'center', paddingVertical: 60},
  emoji: {fontSize: 64, marginBottom: 16},
  text: {fontSize: 16, color: colors.textSecondary},
});
EOF

echo "  ✓ FeedScreen.tsx"

cat > src/features/gamification/screens/LeaderboardScreen.tsx << 'EOF'
import React from 'react';
import {View, Text, StyleSheet, ScrollView} from 'react-native';
import {colors} from '../../../theme';

export const LeaderboardScreen = () => (
  <View style={styles.container}>
    <View style={styles.header}>
      <Text style={styles.title}>Liderlik Tablosu</Text>
    </View>
    <ScrollView style={styles.content}>
      <View style={styles.placeholder}>
        <Text style={styles.emoji}>🏆</Text>
        <Text style={styles.text}>En aktif kullanıcılar burada listelenecek</Text>
      </View>
    </ScrollView>
  </View>
);

const styles = StyleSheet.create({
  container: {flex: 1, backgroundColor: colors.background},
  header: {backgroundColor: 'white', paddingTop: 60, paddingHorizontal: 24, paddingBottom: 20, borderBottomWidth: 1, borderBottomColor: colors.border},
  title: {fontSize: 28, fontWeight: '700', color: colors.text},
  content: {flex: 1},
  placeholder: {alignItems: 'center', justifyContent: 'center', paddingVertical: 60},
  emoji: {fontSize: 64, marginBottom: 16},
  text: {fontSize: 16, color: colors.textSecondary},
});
EOF

echo "  ✓ LeaderboardScreen.tsx"

cat > src/features/profile/screens/ProfileScreen.tsx << 'EOF'
import React from 'react';
import {View, Text, StyleSheet, ScrollView} from 'react-native';
import {colors} from '../../../theme';

export const ProfileScreen = () => (
  <View style={styles.container}>
    <View style={styles.header}>
      <Text style={styles.title}>Profilim</Text>
    </View>
    <ScrollView style={styles.content}>
      <View style={styles.placeholder}>
        <Text style={styles.emoji}>👤</Text>
        <Text style={styles.text}>Profil bilgilerin burada görünecek</Text>
      </View>
    </ScrollView>
  </View>
);

const styles = StyleSheet.create({
  container: {flex: 1, backgroundColor: colors.background},
  header: {backgroundColor: 'white', paddingTop: 60, paddingHorizontal: 24, paddingBottom: 20, borderBottomWidth: 1, borderBottomColor: colors.border},
  title: {fontSize: 28, fontWeight: '700', color: colors.text},
  content: {flex: 1},
  placeholder: {alignItems: 'center', justifyContent: 'center', paddingVertical: 60},
  emoji: {fontSize: 64, marginBottom: 16},
  text: {fontSize: 16, color: colors.textSecondary},
});
EOF

echo "  ✓ ProfileScreen.tsx"

echo "${GREEN}✅ Tüm kodlar yazıldı!${NC}"
echo ""

echo "${BLUE}🔄 5/5: App.tsx güncelleniyor...${NC}"

cat > App.tsx << 'EOF'
import React from 'react';
import {AppNavigator} from './src/navigation/AppNavigator';

function App(): React.JSX.Element {
  return <AppNavigator />;
}

export default App;
EOF

echo "${GREEN}✅ App.tsx güncellendi!${NC}"
echo ""

echo ""
echo "${GREEN}================================${NC}"
echo "${GREEN}🎉 KURULUM TAMAMLANDI!${NC}"
echo "${GREEN}================================${NC}"
echo ""
echo "📱 Test etmek için:"
echo "  ${BLUE}npm run ios${NC}"
echo ""
echo "🎨 Ne göreceksin:"
echo "  1. Splash Screen (2.5 saniye)"
echo "  2. Dashboard (gerçek tasarım!)"
echo "  3. Alt menü (4 sekme)"
echo "  4. Ekranlar arası geçiş"
echo ""
echo "${YELLOW}📸 Screenshot at, paylaş!${NC}"
echo ""
