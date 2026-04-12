import { DarkTheme, DefaultTheme, Theme } from '@react-navigation/native';
import { ColorSchemeName } from 'react-native';

export type AppColors = {
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
  background: '#09090b',
  surface: '#111113',
  surfaceAlt: '#18181b',
  surfaceMuted: '#232328',
  textPrimary: '#fafafa',
  textSecondary: '#d4d4d8',
  textMuted: '#a1a1aa',
  border: '#27272a',
  accent: '#e5e7eb',
  accentMuted: '#9ca3af',
  tabBar: '#111113',
  actionSurface: '#27272a',
  actionBorder: '#3f3f46',
  destructive: '#5a1f24',
  destructiveBorder: '#7f1d1d',
  success: '#14532d',
  successText: '#dcfce7',
  warning: '#21180a',
  warningBorder: '#7c5a1d',
  heatEmpty: '#18181b',
  heatLow: '#3f3f46',
  heatMid: '#71717a',
  heatHigh: '#fafafa',
  overlay: 'rgba(0, 0, 0, 0.5)',
  shadow: '#000000',
};

const lightColors: AppColors = {
  background: '#f5f5f5',
  surface: '#ffffff',
  surfaceAlt: '#f4f4f5',
  surfaceMuted: '#e4e4e7',
  textPrimary: '#09090b',
  textSecondary: '#3f3f46',
  textMuted: '#71717a',
  border: '#d4d4d8',
  accent: '#18181b',
  accentMuted: '#71717a',
  tabBar: '#ffffff',
  actionSurface: '#e4e4e7',
  actionBorder: '#d4d4d8',
  destructive: '#fecaca',
  destructiveBorder: '#f87171',
  success: '#bbf7d0',
  successText: '#14532d',
  warning: '#fef3c7',
  warningBorder: '#f59e0b',
  heatEmpty: '#e4e4e7',
  heatLow: '#d4d4d8',
  heatMid: '#a1a1aa',
  heatHigh: '#3f3f46',
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
