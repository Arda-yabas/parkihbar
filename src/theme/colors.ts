export const colors = {
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
  overlay: 'rgba(0, 0, 0, 0.5)',

  primaryLight: 'rgba(16, 185, 129, 0.1)',
  accentLight: 'rgba(249, 115, 22, 0.1)',
  errorLight: 'rgba(239, 68, 68, 0.1)',
} as const;

export type Colors = typeof colors;
