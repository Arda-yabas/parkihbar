#!/bin/bash

echo "📸 Camera + Form Sistemi - OTOMATİK KURULUM"
echo ""

GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

# Proje kontrolü
if [ ! -f "package.json" ]; then
    echo "${RED}❌ Hata: parkihbar klasöründe değilsin!${NC}"
    exit 1
fi

echo "${BLUE}📦 1/6: Camera paketleri kuruluyor...${NC}"
npm install react-native-vision-camera react-native-permissions --silent

echo "${GREEN}✅ Paketler kuruldu!${NC}"
echo ""

echo "${BLUE}📱 2/6: iOS permission'ları ayarlanıyor...${NC}"

# Info.plist'e camera permission ekle
INFO_PLIST="ios/parkihbar/Info.plist"

if ! grep -q "NSCameraUsageDescription" "$INFO_PLIST"; then
    # </dict> satırından önce ekle
    sed -i '' '/<\/dict>/i\
	<key>NSCameraUsageDescription<\/key>\
	<string>parkihbar, park ihlallerini fotoğraflamak için kameranıza erişmeye ihtiyaç duyar.<\/string>\
	<key>NSPhotoLibraryUsageDescription<\/key>\
	<string>Çektiğiniz fotoğrafları kaydetmek için galeri erişimi gerekli.<\/string>\
	<key>NSLocationWhenInUseUsageDescription<\/key>\
	<string>İhbar konumunu belirlemek için konum bilgisi gerekli.<\/string>
' "$INFO_PLIST"
    echo "${GREEN}✅ iOS permissions eklendi!${NC}"
else
    echo "${YELLOW}⚠️  Permissions zaten var, atlanıyor...${NC}"
fi

echo ""

echo "${BLUE}🔧 3/6: iOS pod'ları güncelleniyor...${NC}"
cd ios
pod install --silent
cd ..

echo "${GREEN}✅ iOS hazır!${NC}"
echo ""

echo "${BLUE}📁 4/6: Klasörler oluşturuluyor...${NC}"

mkdir -p src/features/camera/screens
mkdir -p src/features/camera/components

echo "${GREEN}✅ Klasörler hazır!${NC}"
echo ""

echo "${BLUE}✍️  5/6: Camera ekranları yazılıyor...${NC}"

# CameraScreen.tsx
cat > src/features/camera/screens/CameraScreen.tsx << 'EOF'
import React, {useState, useRef} from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  StatusBar,
  Alert,
} from 'react-native';
import {useNavigation} from '@react-navigation/native';
import {colors} from '../../../theme';

export const CameraScreen = () => {
  const navigation = useNavigation();
  const [flash, setFlash] = useState(false);

  const handleTakePhoto = () => {
    // Simülasyon - gerçek kamera entegrasyonu sonra
    Alert.alert(
      '📸 Fotoğraf Çekildi!',
      'Şimdi ihbar detaylarını girelim',
      [
        {
          text: 'Devam',
          onPress: () => navigation.navigate('Form' as never),
        },
      ]
    );
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />
      
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.closeButton}
          onPress={() => navigation.goBack()}>
          <Text style={styles.closeIcon}>✕</Text>
        </TouchableOpacity>
        <Text style={styles.title}>İhbar Et</Text>
        <TouchableOpacity 
          style={styles.flashButton}
          onPress={() => setFlash(!flash)}>
          <Text style={styles.flashIcon}>{flash ? '⚡' : '🔦'}</Text>
        </TouchableOpacity>
      </View>

      {/* Camera Preview (simülasyon) */}
      <View style={styles.cameraPreview}>
        <Text style={styles.previewText}>📷</Text>
        <Text style={styles.previewSubtext}>Kamera Görünümü</Text>
        <Text style={styles.hint}>
          Park ihlalini net bir şekilde{'\n'}
          fotoğraflayın
        </Text>
      </View>

      {/* Bottom Controls */}
      <View style={styles.controls}>
        <View style={styles.controlsInner}>
          <TouchableOpacity style={styles.galleryButton}>
            <Text style={styles.galleryIcon}>🖼️</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.captureButton}
            onPress={handleTakePhoto}>
            <View style={styles.captureInner} />
          </TouchableOpacity>

          <TouchableOpacity style={styles.flipButton}>
            <Text style={styles.flipIcon}>🔄</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'black',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 60,
    paddingHorizontal: 24,
    paddingBottom: 20,
  },
  closeButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeIcon: {
    fontSize: 28,
    color: 'white',
    fontWeight: '300',
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: 'white',
  },
  flashButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  flashIcon: {
    fontSize: 24,
  },
  cameraPreview: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#1a1a1a',
  },
  previewText: {
    fontSize: 80,
    marginBottom: 16,
  },
  previewSubtext: {
    fontSize: 16,
    color: 'rgba(255,255,255,0.6)',
    marginBottom: 32,
  },
  hint: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.8)',
    textAlign: 'center',
    lineHeight: 20,
  },
  controls: {
    paddingVertical: 40,
    paddingHorizontal: 24,
  },
  controlsInner: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  galleryButton: {
    width: 50,
    height: 50,
    justifyContent: 'center',
    alignItems: 'center',
  },
  galleryIcon: {
    fontSize: 32,
  },
  captureButton: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'white',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 4,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  captureInner: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: 'white',
  },
  flipButton: {
    width: 50,
    height: 50,
    justifyContent: 'center',
    alignItems: 'center',
  },
  flipIcon: {
    fontSize: 32,
  },
});
EOF

echo "  ✓ CameraScreen.tsx"

# FormScreen.tsx
cat > src/features/camera/screens/FormScreen.tsx << 'EOF'
import React, {useState} from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  StatusBar,
} from 'react-native';
import {useNavigation} from '@react-navigation/native';
import {colors, typography, spacing} from '../../../theme';

const VIOLATION_TYPES = [
  {id: 'disabled', label: '♿ Engelli Park Yeri', icon: '♿'},
  {id: 'sidewalk', label: '🚶 Kaldırım', icon: '🚶'},
  {id: 'crosswalk', label: '🚸 Yaya Geçidi', icon: '🚸'},
  {id: 'bike', label: '🚴 Bisiklet Yolu', icon: '🚴'},
  {id: 'other', label: '⚠️ Diğer', icon: '⚠️'},
];

export const FormScreen = () => {
  const navigation = useNavigation();
  const [selectedType, setSelectedType] = useState('');
  const [note, setNote] = useState('');

  const handleSubmit = () => {
    if (!selectedType) {
      alert('Lütfen ihlal tipini seçin');
      return;
    }
    navigation.navigate('Success' as never);
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" />
      
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.backIcon}>←</Text>
        </TouchableOpacity>
        <Text style={styles.title}>İhbar Detayları</Text>
        <View style={{width: 40}} />
      </View>

      <ScrollView style={styles.content}>
        {/* Photo Preview */}
        <View style={styles.photoPreview}>
          <Text style={styles.photoIcon}>📸</Text>
          <Text style={styles.photoText}>Fotoğraf kaydedildi</Text>
        </View>

        {/* Location */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>📍 Konum</Text>
          <View style={styles.locationCard}>
            <Text style={styles.locationText}>Beşiktaş, İstanbul</Text>
            <Text style={styles.locationSubtext}>Barbaros Bulvarı yakını</Text>
          </View>
        </View>

        {/* Violation Type */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>İhlal Tipi</Text>
          <View style={styles.typeGrid}>
            {VIOLATION_TYPES.map(type => (
              <TouchableOpacity
                key={type.id}
                style={[
                  styles.typeCard,
                  selectedType === type.id && styles.typeCardSelected,
                ]}
                onPress={() => setSelectedType(type.id)}>
                <Text style={styles.typeIcon}>{type.icon}</Text>
                <Text
                  style={[
                    styles.typeLabel,
                    selectedType === type.id && styles.typeLabelSelected,
                  ]}>
                  {type.label.replace(/[^\w\s]/g, '')}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Note */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Açıklama (Opsiyonel)</Text>
          <TextInput
            style={styles.input}
            placeholder="Ek bilgi ekleyin..."
            placeholderTextColor="#9CA3AF"
            multiline
            numberOfLines={4}
            value={note}
            onChangeText={setNote}
          />
        </View>

        <View style={{height: 120}} />
      </ScrollView>

      {/* Submit Button */}
      <View style={styles.footer}>
        <TouchableOpacity 
          style={[
            styles.submitButton,
            !selectedType && styles.submitButtonDisabled,
          ]}
          onPress={handleSubmit}
          disabled={!selectedType}>
          <Text style={styles.submitText}>İhbar Et (+15p)</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    backgroundColor: 'white',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 60,
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  backIcon: {
    fontSize: 28,
    color: colors.text,
  },
  title: {
    fontSize: typography.sizes.lg,
    fontWeight: '700',
    color: colors.text,
  },
  content: {
    flex: 1,
  },
  photoPreview: {
    backgroundColor: 'white',
    margin: spacing.xl,
    padding: spacing.xl,
    borderRadius: 12,
    alignItems: 'center',
  },
  photoIcon: {
    fontSize: 48,
    marginBottom: 8,
  },
  photoText: {
    fontSize: typography.sizes.sm,
    color: colors.textSecondary,
    fontWeight: '600',
  },
  section: {
    paddingHorizontal: spacing.xl,
    marginBottom: spacing.xl,
  },
  sectionTitle: {
    fontSize: typography.sizes.base,
    fontWeight: '700',
    color: colors.text,
    marginBottom: spacing.md,
  },
  locationCard: {
    backgroundColor: 'white',
    padding: spacing.lg,
    borderRadius: 12,
  },
  locationText: {
    fontSize: typography.sizes.base,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 4,
  },
  locationSubtext: {
    fontSize: typography.sizes.sm,
    color: colors.textSecondary,
  },
  typeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
  },
  typeCard: {
    width: '47%',
    backgroundColor: 'white',
    padding: spacing.lg,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  typeCardSelected: {
    borderColor: colors.primary,
    backgroundColor: colors.primaryLight,
  },
  typeIcon: {
    fontSize: 32,
    marginBottom: 8,
  },
  typeLabel: {
    fontSize: typography.sizes.sm,
    fontWeight: '600',
    color: colors.textSecondary,
    textAlign: 'center',
  },
  typeLabelSelected: {
    color: colors.primary,
    fontWeight: '700',
  },
  input: {
    backgroundColor: 'white',
    padding: spacing.lg,
    borderRadius: 12,
    fontSize: typography.sizes.base,
    color: colors.text,
    minHeight: 100,
    textAlignVertical: 'top',
  },
  footer: {
    backgroundColor: 'white',
    padding: spacing.xl,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  submitButton: {
    backgroundColor: colors.accent,
    height: 56,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  submitButtonDisabled: {
    backgroundColor: '#D1D5DB',
  },
  submitText: {
    fontSize: typography.sizes.base,
    fontWeight: '700',
    color: 'white',
  },
});
EOF

echo "  ✓ FormScreen.tsx"

# SuccessScreen.tsx
cat > src/features/camera/screens/SuccessScreen.tsx << 'EOF'
import React, {useEffect} from 'react';
import {View, Text, StyleSheet, TouchableOpacity} from 'react-native';
import {useNavigation} from '@react-navigation/native';
import {colors, typography, spacing} from '../../../theme';

export const SuccessScreen = () => {
  const navigation = useNavigation();

  useEffect(() => {
    // 3 saniye sonra otomatik Dashboard'a dön
    const timer = setTimeout(() => {
      navigation.navigate('Dashboard' as never);
    }, 3000);

    return () => clearTimeout(timer);
  }, [navigation]);

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <View style={styles.iconContainer}>
          <Text style={styles.icon}>✅</Text>
        </View>
        
        <Text style={styles.title}>İhbar Başarılı!</Text>
        <Text style={styles.subtitle}>
          Topluluk katkınız için teşekkürler
        </Text>

        <View style={styles.pointsBadge}>
          <Text style={styles.pointsText}>+15 PUAN</Text>
        </View>

        <View style={styles.statsRow}>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>360</Text>
            <Text style={styles.statLabel}>Toplam Puan</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>24</Text>
            <Text style={styles.statLabel}>Toplam İhbar</Text>
          </View>
        </View>

        <Text style={styles.note}>
          İhbarınız doğrulandıktan sonra{'\n'}
          ek +5 puan kazanacaksınız
        </Text>

        <TouchableOpacity
          style={styles.button}
          onPress={() => navigation.navigate('Dashboard' as never)}>
          <Text style={styles.buttonText}>Anasayfaya Dön</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing['2xl'],
  },
  iconContainer: {
    width: 120,
    height: 120,
    backgroundColor: colors.primaryLight,
    borderRadius: 60,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing['2xl'],
  },
  icon: {
    fontSize: 64,
  },
  title: {
    fontSize: typography.sizes['3xl'],
    fontWeight: '700',
    color: colors.text,
    marginBottom: spacing.sm,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: typography.sizes.base,
    color: colors.textSecondary,
    marginBottom: spacing['2xl'],
    textAlign: 'center',
  },
  pointsBadge: {
    backgroundColor: colors.accent,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    borderRadius: 12,
    marginBottom: spacing['2xl'],
  },
  pointsText: {
    fontSize: typography.sizes.lg,
    fontWeight: '700',
    color: 'white',
    letterSpacing: 1,
  },
  statsRow: {
    flexDirection: 'row',
    gap: spacing.xl,
    marginBottom: spacing['2xl'],
  },
  statItem: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: typography.sizes['2xl'],
    fontWeight: '700',
    color: colors.text,
    marginBottom: 4,
  },
  statLabel: {
    fontSize: typography.sizes.sm,
    color: colors.textSecondary,
  },
  note: {
    fontSize: typography.sizes.sm,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: spacing['2xl'],
    lineHeight: 20,
  },
  button: {
    backgroundColor: colors.primary,
    paddingHorizontal: spacing['2xl'],
    paddingVertical: spacing.lg,
    borderRadius: 12,
    minWidth: 200,
  },
  buttonText: {
    fontSize: typography.sizes.base,
    fontWeight: '700',
    color: 'white',
    textAlign: 'center',
  },
});
EOF

echo "  ✓ SuccessScreen.tsx"

echo "${GREEN}✅ Ekranlar yazıldı!${NC}"
echo ""

echo "${BLUE}🔄 6/6: Navigation güncelleniy or...${NC}"

# AppNavigator'ı güncelle
cat > src/navigation/AppNavigator.tsx << 'EOF'
import React, {useState, useEffect} from 'react';
import {NavigationContainer} from '@react-navigation/native';
import {createBottomTabNavigator} from '@react-navigation/bottom-tabs';
import {createStackNavigator} from '@react-navigation/stack';
import {Text, View, StyleSheet} from 'react-native';

import {SplashScreen} from '../features/dashboard/screens/SplashScreen';
import {DashboardScreen} from '../features/dashboard/screens/DashboardScreen';
import {FeedScreen} from '../features/reports/screens/FeedScreen';
import {LeaderboardScreen} from '../features/gamification/screens/LeaderboardScreen';
import {ProfileScreen} from '../features/profile/screens/ProfileScreen';
import {CameraScreen} from '../features/camera/screens/CameraScreen';
import {FormScreen} from '../features/camera/screens/FormScreen';
import {SuccessScreen} from '../features/camera/screens/SuccessScreen';

import {colors} from '../theme';

const Tab = createBottomTabNavigator();
const Stack = createStackNavigator();

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

function RootStack() {
  return (
    <Stack.Navigator screenOptions={{headerShown: false}}>
      <Stack.Screen name="Main" component={MainTabs} />
      <Stack.Screen 
        name="Camera" 
        component={CameraScreen}
        options={{presentation: 'fullScreenModal'}}
      />
      <Stack.Screen name="Form" component={FormScreen} />
      <Stack.Screen 
        name="Success" 
        component={SuccessScreen}
        options={{presentation: 'modal'}}
      />
    </Stack.Navigator>
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
      <RootStack />
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
EOF

echo "  ✓ AppNavigator.tsx güncellendi"

# Dashboard'a Camera butonu ekle
cat > src/features/dashboard/screens/DashboardScreen.tsx << 'EOF'
import React from 'react';
import {View, Text, StyleSheet, ScrollView, TouchableOpacity, StatusBar, Platform} from 'react-native';
import {useNavigation} from '@react-navigation/native';
import {colors, typography, spacing} from '../../../theme';

export const DashboardScreen = () => {
  const navigation = useNavigation();

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

        <TouchableOpacity 
          style={styles.actionButton}
          onPress={() => navigation.navigate('Camera' as never)}>
          <Text style={styles.actionIcon}>📸</Text>
          <Text style={styles.actionText}>İhbar Et</Text>
        </TouchableOpacity>

        <Text style={styles.sectionTitle}>Yakın Aktiviteler</Text>

        <View style={styles.feedCard}>
          <Text style={styles.placeholder}>🎉 Camera sistemi hazır!</Text>
          <Text style={styles.placeholderSub}>Yukarıdaki butona tıkla</Text>
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
  feedCard: {backgroundColor: 'white', marginHorizontal: spacing.xl, padding: spacing.xl, borderRadius: 12, alignItems: 'center'},
  placeholder: {fontSize: 20, marginBottom: 8},
  placeholderSub: {fontSize: 14, color: colors.textSecondary},
});
EOF

echo "  ✓ DashboardScreen.tsx güncellendi"

echo "${GREEN}✅ Navigation güncellendi!${NC}"
echo ""

echo ""
echo "${GREEN}================================${NC}"
echo "${GREEN}📸 CAMERA SİSTEMİ HAZIR!${NC}"
echo "${GREEN}================================${NC}"
echo ""
echo "🎯 Eklenen özellikler:"
echo "  ✓ Camera Screen (fotoğraf çekme UI)"
echo "  ✓ Form Screen (ihlal tipi + detaylar)"
echo "  ✓ Success Screen (başarı mesajı + puan)"
echo "  ✓ Stack Navigator (ekranlar arası geçiş)"
echo "  ✓ Dashboard'a Camera butonu"
echo ""
echo "📱 Test etmek için:"
echo "  ${BLUE}npm run ios${NC}"
echo ""
echo "🎨 Nasıl test edilir:"
echo "  1. Dashboard'da '📸 İhbar Et' butonuna tıkla"
echo "  2. Camera ekranı açılır"
echo "  3. Ortadaki büyük butona tıkla (fotoğraf çek)"
echo "  4. Form ekranında ihlal tipi seç"
echo "  5. 'İhbar Et' butonuna bas"
echo "  6. Success ekranı! +15 puan 🎉"
echo ""
echo "${YELLOW}📸 Tüm flow'u test et, screenshot at!${NC}"
echo ""
