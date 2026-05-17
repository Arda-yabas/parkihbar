import React, {useEffect, useState} from 'react';
import {View, ActivityIndicator} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import BootSplash from 'react-native-bootsplash';
import {AppNavigator} from './src/navigation/AppNavigator';
import {ensureAnonymousAuth} from './src/services/firebase';
import {ThemeProvider, useTheme} from './src/theme/ThemeContext';

const AppInner = () => {
  const {colors} = useTheme();
  const [loading, setLoading] = useState(true);
  const [onboardingDone, setOnboardingDone] = useState(false);

  useEffect(() => {
    const minDelay = new Promise<void>(resolve => setTimeout(resolve, 2000));
    Promise.all([
      ensureAnonymousAuth().catch(() => {}),
      AsyncStorage.getItem('@onboarding_completed').then(val => {
        setOnboardingDone(val === 'true');
      }),
      minDelay,
    ]).finally(() => {
      setLoading(false);
      BootSplash.hide({fade: true});
    });
  }, []);

  if (loading) {
    return (
      <View style={{flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.background}}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <AppNavigator
      onboardingDone={onboardingDone}
      onOnboardingComplete={() => setOnboardingDone(true)}
    />
  );
};

function App(): React.JSX.Element {
  return (
    <ThemeProvider>
      <AppInner />
    </ThemeProvider>
  );
}

export default App;
