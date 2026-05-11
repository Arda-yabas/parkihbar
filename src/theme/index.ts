export { colors } from './colors';
export { typography } from './typography';
export { spacing } from './spacing';
export { shadows } from './shadows';

export const theme = {
  colors: require('./colors').colors,
  typography: require('./typography').typography,
  spacing: require('./spacing').spacing,
  shadows: require('./shadows').shadows,
} as const;
