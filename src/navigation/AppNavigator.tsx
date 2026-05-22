import React, {useMemo} from 'react';
import {StyleSheet, View, Text, Platform, TouchableOpacity} from 'react-native';
import {SafeAreaProvider, useSafeAreaInsets} from 'react-native-safe-area-context';
import {NavigationContainer} from '@react-navigation/native';
import {createBottomTabNavigator} from '@react-navigation/bottom-tabs';
import {createNativeStackNavigator} from '@react-navigation/native-stack';

import {DashboardScreen} from '../features/dashboard/screens/DashboardScreen';
import {CameraScreen} from '../features/camera/screens/CameraScreen';
import {FormScreen} from '../features/camera/screens/FormScreen';
import {SuccessScreen} from '../features/camera/screens/SuccessScreen';
import {FeedScreen} from '../features/feed/screens/FeedScreen';
import {LeaderboardScreen} from '../features/leaderboard/screens/LeaderboardScreen';
import {ProfileScreen} from '../features/profile/screens/ProfileScreen';
import {ReportDetailScreen} from '../features/reports/screens/ReportDetailScreen';
import {UserReportsScreen} from '../features/reports/screens/UserReportsScreen';
import {NotificationsScreen} from '../features/notifications/screens/NotificationsScreen';
import {OnboardingScreen} from '../features/onboarding/screens/OnboardingScreen';
import {SettingsScreen} from '../features/settings/screens/SettingsScreen';
import {PolicyScreen} from '../features/settings/screens/PolicyScreen';
import {EGMWebViewScreen} from '../features/reports/screens/EGMWebViewScreen';
import {DonationsScreen} from '../features/donations/screens/DonationsScreen';
import {useTheme, Colors} from '../theme/ThemeContext';

export type CameraStackParamList = {
  Camera: {existingPhotoUris?: string[]} | undefined;
  Form: {photoUris: string[]};
  Success: {
    reportId: string;
    photoUrl: string;
    localPhotoUri?: string;
    type: string;
    location: {latitude: number; longitude: number; address: string; city?: string; district?: string};
    note?: string;
    points?: number;
  };
};

const Tab = createBottomTabNavigator();
const CameraStackNav = createNativeStackNavigator<CameraStackParamList>();
const RootStack = createNativeStackNavigator();

const TabNavigator = () => (
  <Tab.Navigator
    tabBar={props => <CustomTabBar {...props} />}
    screenOptions={{headerShown: false}}>
    <Tab.Screen name="Dashboard"   component={DashboardScreen} />
    <Tab.Screen name="Feed"        component={FeedScreen} />
    <Tab.Screen name="CameraStack" component={CameraStack} />
    <Tab.Screen name="Leaderboard" component={LeaderboardScreen} />
    <Tab.Screen name="Profile"     component={ProfileScreen} />
  </Tab.Navigator>
);

const CameraStack = () => (
  <CameraStackNav.Navigator screenOptions={{headerShown: false}}>
    <CameraStackNav.Screen name="Camera" component={CameraScreen} />
    <CameraStackNav.Screen name="Form" component={FormScreen} />
    <CameraStackNav.Screen name="Success" component={SuccessScreen} />
  </CameraStackNav.Navigator>
);

const TAB_CONFIG: Record<string, {icon: string; label: string}> = {
  Dashboard:   {icon: '🏠', label: 'Ana Sayfa'},
  Feed:        {icon: '🔍', label: 'Keşfet'},
  CameraStack: {icon: '📷', label: 'İhbar Et'},
  Leaderboard: {icon: '🏆', label: 'Liderler'},
  Profile:     {icon: '👤', label: 'Profilim'},
};

const CustomTabBar = ({state, descriptors, navigation}: any) => {
  const insets = useSafeAreaInsets();
  const {colors} = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);

  const activeRoute = state.routes[state.index];
  if (activeRoute.name === 'CameraStack') {
    return null;
  }

  return (
    <View style={styles.tabBarWrapper}>
      <View style={[styles.tabBar, {paddingBottom: insets.bottom > 0 ? insets.bottom : (Platform.OS === 'ios' ? 28 : 12)}]}>
        {state.routes.map((route: any, index: number) => {
          const isFocused = state.index === index;
          const cfg = TAB_CONFIG[route.name] ?? {icon: '•', label: route.name};

          const onPress = () => {
            const event = navigation.emit({
              type: 'tabPress',
              target: route.key,
              canPreventDefault: true,
            });
            if (!isFocused && !event.defaultPrevented) {
              navigation.navigate(route.name);
            }
          };

          if (route.name === 'CameraStack') {
            return (
              <TouchableOpacity
                key={route.key}
                onPress={onPress}
                style={styles.fabWrapper}
                activeOpacity={0.85}>
                <View style={styles.fab}>
                  <Text style={styles.fabIcon}>{cfg.icon}</Text>
                </View>
                <Text style={styles.fabLabel}>{cfg.label}</Text>
              </TouchableOpacity>
            );
          }

          return (
            <TouchableOpacity
              key={route.key}
              onPress={onPress}
              style={styles.tabButton}
              activeOpacity={0.7}>
              <Text style={[styles.tabIcon, {opacity: isFocused ? 1 : 0.45}]}>
                {cfg.icon}
              </Text>
              <Text style={[styles.tabLabel, {color: isFocused ? colors.primary : colors.textSecondary}]}>
                {cfg.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
};

interface AppNavigatorProps {
  onboardingDone: boolean;
  onOnboardingComplete: () => void;
}

export const AppNavigator = ({onboardingDone, onOnboardingComplete}: AppNavigatorProps) => (
  <SafeAreaProvider>
    <NavigationContainer>
      <RootStack.Navigator screenOptions={{headerShown: false}}>
        {!onboardingDone ? (
          <RootStack.Screen name="Onboarding">
            {() => <OnboardingScreen onComplete={onOnboardingComplete} />}
          </RootStack.Screen>
        ) : (
          <>
            <RootStack.Screen name="Tabs" component={TabNavigator} />
            <RootStack.Screen name="ReportDetail" component={ReportDetailScreen} />
            <RootStack.Screen name="Notifications" component={NotificationsScreen} />
            <RootStack.Screen name="Settings" component={SettingsScreen} />
            <RootStack.Screen name="UserReports" component={UserReportsScreen} />
            <RootStack.Screen name="EGMWebView" component={EGMWebViewScreen} />
            <RootStack.Screen name="Donations" component={DonationsScreen} />
            <RootStack.Screen name="Policy" component={PolicyScreen} />
          </>
        )}
      </RootStack.Navigator>
    </NavigationContainer>
  </SafeAreaProvider>
);

const makeStyles = (colors: Colors) => StyleSheet.create({
  tabBarWrapper: {
    position: 'absolute',
    bottom: 0, left: 0, right: 0,
    backgroundColor: 'transparent',
  },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: colors.card,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
    paddingTop: 8,
    paddingHorizontal: 4,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: -2},
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 12,
  },
  tabButton: {flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 4},
  tabIcon: {fontSize: 24, marginBottom: 3},
  tabLabel: {fontSize: 10, fontWeight: '600'},
  fabWrapper: {flex: 1, alignItems: 'center', justifyContent: 'center', marginTop: -28},
  fab: {
    width: 60, height: 60, borderRadius: 30,
    backgroundColor: colors.primary,
    justifyContent: 'center', alignItems: 'center',
    borderWidth: 3, borderColor: colors.card,
    shadowColor: colors.primary,
    shadowOffset: {width: 0, height: 4},
    shadowOpacity: 0.4, shadowRadius: 8, elevation: 12,
    marginBottom: 4,
  },
  fabIcon: {fontSize: 28},
  fabLabel: {fontSize: 10, fontWeight: '700', color: colors.primary},
});
