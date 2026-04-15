import { DarkTheme, DefaultTheme, Theme } from '@react-navigation/native';
import { ColorSchemeName } from 'react-native';

export type AppColors = {
  isLight: boolean;
  background: string;
  surface: string;
  surfaceAlt: string;
  surfaceMuted: string;
  textPrimary: string;
  textSecondary: string;
  textMuted: string;
  border: string;
  accent: string;
  accentMuted: string;
  tabBar: string;
  actionSurface: string;
  actionBorder: string;
  destructive: string;
  destructiveBorder: string;
  success: string;
  successText: string;
  warning: string;
  warningBorder: string;
  heatEmpty: string;
  heatLow: string;
  heatMid: string;
  heatHigh: string;
  overlay: string;
  shadow: string;
};

const darkColors: AppColors = {
  isLight: false,
  background: '#08090c',
  surface: '#15151c',
  surfaceAlt: '#1f232a',
  surfaceMuted: '#2a2f38',
  textPrimary: '#fafafa',
  textSecondary: '#d4d4d8',
  textMuted: '#a1a1aa',
  border: '#353a43',
  accent: '#e5e7eb',
  accentMuted: '#9ca3af',
  tabBar: '#121419',
  actionSurface: '#272c34',
  actionBorder: '#414752',
  destructive: '#5a1f24',
  destructiveBorder: '#7f1d1d',
  success: '#14532d',
  successText: '#dcfce7',
  warning: '#21180a',
  warningBorder: '#7c5a1d',
  heatEmpty: '#161b22',
  heatLow: '#0e4429',
  heatMid: '#006d32',
  heatHigh: '#26a641',
  overlay: 'rgba(0, 0, 0, 0.5)',
  shadow: '#000000',
};

const lightColors: AppColors = {
  isLight: true,
  background: '#eceff3',
  surface: '#ffffff',
  surfaceAlt: '#f3f5f8',
  surfaceMuted: '#e1e6ed',
  textPrimary: '#09090b',
  textSecondary: '#3f3f46',
  textMuted: '#71717a',
  border: '#c9d0d9',
  accent: '#18181b',
  accentMuted: '#71717a',
  tabBar: '#f8fafc',
  actionSurface: '#e5eaf0',
  actionBorder: '#c6ced8',
  destructive: '#fecaca',
  destructiveBorder: '#f87171',
  success: '#bbf7d0',
  successText: '#14532d',
  warning: '#fef3c7',
  warningBorder: '#f59e0b',
  heatEmpty: '#ebedf0',
  heatLow: '#9be9a8',
  heatMid: '#40c463',
  heatHigh: '#216e39',
  overlay: 'rgba(0, 0, 0, 0.18)',
  shadow: '#000000',
};

export const getAppColors = (scheme?: ColorSchemeName): AppColors =>
  scheme === 'light' ? lightColors : darkColors;

export const getNavigationTheme = (colors: AppColors, scheme?: ColorSchemeName): Theme => {
  const baseTheme = scheme === 'light' ? DefaultTheme : DarkTheme;

  return {
    ...baseTheme,
    colors: {
      ...baseTheme.colors,
      background: colors.background,
      card: colors.surface,
      primary: colors.textPrimary,
      text: colors.textPrimary,
      border: colors.border,
      notification: colors.accent,
    },
  };
};
