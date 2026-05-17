import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Platform,
  Dimensions,
  Pressable,
} from 'react-native';
import {BlurView} from '@react-native-community/blur';
import {BottomTabBarProps} from '@react-navigation/bottom-tabs';
import {useSafeAreaInsets} from 'react-native-safe-area-context';

const {width} = Dimensions.get('window');

const TAB_ICONS: Record<string, string> = {
  Dashboard: '􀏞',
  Feed: '􀊫',
  CameraStack: '􀕹',
  Leaderboard: '􀏱',
  Profile: '􀉭',
};

const TAB_ICONS_FILLED: Record<string, string> = {
  Dashboard: '􀏟',
  Feed: '􀊬',
  CameraStack: '􀕺',
  Leaderboard: '􀏲',
  Profile: '􀉰',
};

const TAB_LABELS: Record<string, string> = {
  Dashboard: 'Ana Sayfa',
  Feed: 'Keşfet',
  CameraStack: 'İhbar Et',
  Leaderboard: 'Liderler',
  Profile: 'Profil',
};

// SF Symbols are iOS-only; use emoji fallback for Android
const ANDROID_ICONS: Record<string, string> = {
  Dashboard: '⌂',
  Feed: '◎',
  CameraStack: '⊕',
  Leaderboard: '★',
  Profile: '◉',
};

export function CustomTabBar({state, descriptors, navigation}: BottomTabBarProps) {
  const insets = useSafeAreaInsets();

  if (Platform.OS === 'ios') {
    return <IOSTabBar state={state} descriptors={descriptors} navigation={navigation} insets={insets} />;
  }
  return <AndroidTabBar state={state} descriptors={descriptors} navigation={navigation} insets={insets} />;
}

function IOSTabBar({state, navigation, insets}: any) {
  const bottomPadding = Math.max(insets.bottom, 8);

  return (
    <View style={[iosStyles.wrapper, {bottom: 0}]} pointerEvents="box-none">
      <View style={[iosStyles.container, {paddingBottom: bottomPadding}]}>
        <BlurView
          style={StyleSheet.absoluteFill}
          blurType="chromeMaterial"
          blurAmount={20}
          reducedTransparencyFallbackColor="rgba(255,255,255,0.92)"
        />
        {/* Thin top separator */}
        <View style={iosStyles.separator} />

        <View style={iosStyles.tabRow}>
          {state.routes.map((route: any, index: number) => {
            const isFocused = state.index === index;
            const isCamera = route.name === 'CameraStack';

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

            if (isCamera) {
              return (
                <TouchableOpacity
                  key={route.key}
                  onPress={onPress}
                  style={iosStyles.cameraTab}
                  activeOpacity={0.8}>
                  <View style={[iosStyles.cameraButton, isFocused && iosStyles.cameraButtonActive]}>
                    <Text style={iosStyles.cameraIcon}>+</Text>
                  </View>
                  <Text style={[iosStyles.tabLabel, {color: isFocused ? '#10B981' : 'rgba(60,60,67,0.6)'}]}>
                    {TAB_LABELS[route.name]}
                  </Text>
                </TouchableOpacity>
              );
            }

            return (
              <TouchableOpacity
                key={route.key}
                onPress={onPress}
                style={iosStyles.tab}
                activeOpacity={0.7}>
                <Text style={[
                  iosStyles.tabIcon,
                  {color: isFocused ? '#10B981' : 'rgba(60,60,67,0.5)'},
                ]}>
                  {isFocused ? TAB_ICONS_FILLED[route.name] : TAB_ICONS[route.name]}
                </Text>
                <Text style={[
                  iosStyles.tabLabel,
                  {color: isFocused ? '#10B981' : 'rgba(60,60,67,0.6)',
                   fontWeight: isFocused ? '600' : '400'},
                ]}>
                  {TAB_LABELS[route.name]}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>
    </View>
  );
}

function AndroidTabBar({state, navigation, insets}: any) {
  const bottomPadding = Math.max(insets.bottom, 0);

  return (
    <View style={[androidStyles.container, {paddingBottom: bottomPadding}]}>
      <View style={androidStyles.tabRow}>
        {state.routes.map((route: any, index: number) => {
          const isFocused = state.index === index;
          const isCamera = route.name === 'CameraStack';

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

          if (isCamera) {
            return (
              <Pressable
                key={route.key}
                onPress={onPress}
                style={androidStyles.tab}
                android_ripple={null}>
                <View style={androidStyles.fabButton}>
                  <Text style={androidStyles.fabIcon}>+</Text>
                </View>
                <Text style={[androidStyles.tabLabel, {color: isFocused ? '#10B981' : '#49454F'}]}>
                  {TAB_LABELS[route.name]}
                </Text>
              </Pressable>
            );
          }

          return (
            <Pressable
              key={route.key}
              onPress={onPress}
              style={androidStyles.tab}
              android_ripple={null}>
              {/* MD3 active indicator pill */}
              <View style={[androidStyles.indicator, isFocused && androidStyles.indicatorActive]}>
                <Text style={[androidStyles.tabIcon, {color: isFocused ? '#10B981' : '#49454F'}]}>
                  {ANDROID_ICONS[route.name]}
                </Text>
              </View>
              <Text style={[
                androidStyles.tabLabel,
                {color: isFocused ? '#10B981' : '#49454F',
                 fontWeight: isFocused ? '700' : '400'},
              ]}>
                {TAB_LABELS[route.name]}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const iosStyles = StyleSheet.create({
  wrapper: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
  },
  container: {
    overflow: 'hidden',
  },
  separator: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: 'rgba(60,60,67,0.18)',
  },
  tabRow: {
    flexDirection: 'row',
    paddingTop: 8,
    paddingHorizontal: 4,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 4,
    minHeight: 49,
    gap: 2,
  },
  tabIcon: {
    fontSize: 24,
    lineHeight: 28,
  },
  tabLabel: {
    fontSize: 10,
    letterSpacing: -0.2,
  },
  cameraTab: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 4,
    minHeight: 49,
    gap: 4,
  },
  cameraButton: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: 'rgba(60,60,67,0.12)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  cameraButtonActive: {
    backgroundColor: '#10B981',
  },
  cameraIcon: {
    fontSize: 22,
    fontWeight: '300',
    color: '#fff',
    lineHeight: 26,
    marginTop: -1,
  },
});

const androidStyles = StyleSheet.create({
  container: {
    backgroundColor: '#FFFBFE',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: -1},
    shadowOpacity: 0.08,
    shadowRadius: 4,
  },
  tabRow: {
    flexDirection: 'row',
    height: 80,
    alignItems: 'center',
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  indicator: {
    width: 64,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  indicatorActive: {
    backgroundColor: '#E8DEF8',
  },
  tabIcon: {
    fontSize: 20,
  },
  tabLabel: {
    fontSize: 12,
    letterSpacing: 0.4,
  },
  fabButton: {
    width: 56,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#10B981',
    justifyContent: 'center',
    alignItems: 'center',
  },
  fabIcon: {
    fontSize: 22,
    fontWeight: '400',
    color: '#fff',
    lineHeight: 26,
    marginTop: -1,
  },
});
