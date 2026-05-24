import React, {useEffect, useState, Component} from 'react';
import {View, Text, StyleSheet} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import BootSplash from 'react-native-bootsplash';
import crashlytics from '@react-native-firebase/crashlytics';
import {AppNavigator} from './src/navigation/AppNavigator';
import {ensureAnonymousAuth} from './src/services/firebase';
import {ThemeProvider} from './src/theme/ThemeContext';
import {FCMService} from './src/services/fcm.service';

class ErrorBoundary extends Component<{children: React.ReactNode}, {hasError: boolean}> {
  state = {hasError: false};

  static getDerivedStateFromError() {
    return {hasError: true};
  }

  componentDidCatch(error: Error) {
    crashlytics().recordError(error);
  }

  render() {
    if (this.state.hasError) {
      return (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>Beklenmedik bir hata oluştu.</Text>
          <Text style={styles.errorSub}>Uygulamayı kapatıp tekrar açabilirsiniz.</Text>
        </View>
      );
    }
    return this.props.children;
  }
}

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
    <ErrorBoundary>
      <ThemeProvider>
        <AppInner />
      </ThemeProvider>
    </ErrorBoundary>
  );
}

const styles = StyleSheet.create({
  root: {flex: 1},
  errorContainer: {flex: 1, justifyContent: 'center', alignItems: 'center', padding: 32},
  errorText: {fontSize: 18, fontWeight: '600', color: '#1a1a1a', marginBottom: 8},
  errorSub: {fontSize: 14, color: '#666', textAlign: 'center'},
});
