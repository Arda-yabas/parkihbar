import React, {createContext, useContext, useState, useEffect, useMemo} from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

export const lightColors = {
  primary: '#10B981',
  secondary: '#14B8A6',
  accent: '#F97316',
  background: '#F7F7F7',
  card: '#FFFFFF',
  text: '#2D2D2D',
  textSecondary: '#6D6D6D',
  textLight: '#9CA3AF',
  success: '#10B981',
  error: '#EF4444',
  warning: '#F59E0B',
  info: '#3B82F6',
  gold: '#F59E0B',
  silver: '#9CA3AF',
  bronze: '#D97706',
  border: '#E5E7EB',
  divider: '#F3F4F6',
  overlay: 'rgba(0,0,0,0.5)',
  primaryLight: 'rgba(16,185,129,0.1)',
  accentLight: 'rgba(249,115,22,0.1)',
  errorLight: 'rgba(239,68,68,0.1)',
};

export const darkColors = {
  primary: '#10B981',
  secondary: '#14B8A6',
  accent: '#FB923C',
  background: '#0F0F0F',
  card: '#1C1C1E',
  text: '#FFFFFF',
  textSecondary: '#8E8E93',
  textLight: '#636366',
  success: '#30D158',
  error: '#FF453A',
  warning: '#FFD60A',
  info: '#0A84FF',
  gold: '#FFD60A',
  silver: '#8E8E93',
  bronze: '#D97706',
  border: '#38383A',
  divider: '#2C2C2E',
  overlay: 'rgba(0,0,0,0.7)',
  primaryLight: 'rgba(16,185,129,0.15)',
  accentLight: 'rgba(251,146,60,0.15)',
  errorLight: 'rgba(255,69,58,0.15)',
};

export type Colors = typeof lightColors;

interface ThemeContextType {
  isDark: boolean;
  colors: Colors;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType>({
  isDark: false,
  colors: lightColors,
  toggleTheme: () => {},
});

export const ThemeProvider = ({children}: {children: React.ReactNode}) => {
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem('@dark_mode')
      .then(val => { if (val === 'true') setIsDark(true); })
      .catch(() => {});
  }, []);

  const toggleTheme = async () => {
    const next = !isDark;
    setIsDark(next);
    await AsyncStorage.setItem('@dark_mode', next.toString()).catch(() => {});
  };

  const value = useMemo(() => ({
    isDark,
    colors: isDark ? darkColors : lightColors,
    toggleTheme,
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }), [isDark]);

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
};

export const useTheme = () => useContext(ThemeContext);
