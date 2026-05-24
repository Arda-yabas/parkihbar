import React, {useEffect, useState} from 'react';
import {View, StyleSheet} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import BootSplash from 'react-native-bootsplash';
import {AppNavigator} from './src/navigation/AppNavigator';
import {ensureAnonymousAuth} from './src/services/firebase';
import {ThemeProvider} from './src/theme/ThemeContext';
import {FCMService} from './src/services/fcm.service';

const AppInner = () => {
  const [onboardingDone, setOnboardingDone] = useState(false);
  const [appReady, setAppReady] = useState(false);

  useEffect(() => {
    Promise.all([
      ensureAnonymousAuth().catch(() => {}),
      Promise.race([
        FCMService.init(),
        new Promise<void>(r => setTimeout(r, 4000)),
      ]).catch(() => {}),
      AsyncStorage.getItem('@onboarding_completed').catch(() => null),
    ]).then(([,, onboarding]) => {
      setOnboardingDone(onboarding === 'true');
      setAppReady(true);
      BootSplash.hide({fade: true});
    });
  }, []);

  if (!appReady) {return <View style={styles.root} />;}

  return (
    <View style={styles.root}>
      <AppNavigator
        onboardingDone={onboardingDone}
        onOnboardingComplete={() => setOnboardingDone(true)}
      />
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
});
