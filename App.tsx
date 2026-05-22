import React, {useEffect, useState, useRef} from 'react';
import {View, Animated, StyleSheet, Dimensions} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import BootSplash from 'react-native-bootsplash';
import {AppNavigator} from './src/navigation/AppNavigator';
import {ensureAnonymousAuth} from './src/services/firebase';
import {ThemeProvider} from './src/theme/ThemeContext';
import {FCMService} from './src/services/fcm.service';

const SPLASH_BG = '#14af7d';
const logo = require('./src/assets/bootsplash/logo.png');
const {width: SW, height: SH} = Dimensions.get('screen');

const AppInner = () => {
  const [onboardingDone, setOnboardingDone] = useState(false);
  const [showSplash, setShowSplash] = useState(true);
  const [appReady, setAppReady] = useState(false);

  const scale = useRef(new Animated.Value(0.75)).current;
  const logoOpacity = useRef(new Animated.Value(0)).current;
  const splashOpacity = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    // Native splash'ı JS render olduktan hemen sonra gizle
    const hideTimer = setTimeout(() => BootSplash.hide({fade: true}), 80);

    // Zoom in animasyonu
    Animated.parallel([
      Animated.spring(scale, {toValue: 1, tension: 55, friction: 6, useNativeDriver: true}),
      Animated.timing(logoOpacity, {toValue: 1, duration: 300, useNativeDriver: true}),
    ]).start();

    // Veri yükle
    Promise.all([
      ensureAnonymousAuth().catch(() => {}),
      FCMService.init().catch(() => {}),
      AsyncStorage.getItem('@onboarding_completed'),
      new Promise<void>(r => setTimeout(r, 2000)),
    ]).then(([,, onboarding]) => {
      setOnboardingDone(onboarding === 'true');
      setAppReady(true);

      // Önce app render et, sonra splash fade out başlasın
      requestAnimationFrame(() => {
        Animated.timing(splashOpacity, {
          toValue: 0,
          duration: 450,
          useNativeDriver: true,
        }).start(() => setShowSplash(false));
      });
    });

    return () => clearTimeout(hideTimer);
  }, []);

  return (
    <View style={styles.root}>
      {appReady && (
        <AppNavigator
          onboardingDone={onboardingDone}
          onOnboardingComplete={() => setOnboardingDone(true)}
        />
      )}
      {showSplash && (
        <Animated.View style={[styles.splash, {opacity: splashOpacity}]}>
          <Animated.Image
            source={logo}
            style={[styles.logo, {opacity: logoOpacity, transform: [{scale}]}]}
            resizeMode="contain"
          />
        </Animated.View>
      )}
    </View>
  );
};

export default function App() {
  return (
    <ThemeProvider>
      <AppInner />
    </ThemeProvider>
  );
}

const styles = StyleSheet.create({
  root: {flex: 1},
  splash: {
    position: 'absolute',
    width: SW,
    height: SH,
    top: 0,
    left: 0,
    backgroundColor: SPLASH_BG,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 999,
  },
  logo: {
    width: 180,
    height: 180,
  },
});
