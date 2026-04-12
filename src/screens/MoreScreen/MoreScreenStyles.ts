import { StyleSheet } from 'react-native';

import { AppColors } from '../../theme/palette';

export const createStyles = (colors: AppColors) =>
  StyleSheet.create({
    safeArea: {
      flex: 1,
      backgroundColor: colors.background,
    },
    content: {
      padding: 20,
      paddingBottom: 140,
      gap: 18,
    },
    title: {
      color: colors.textPrimary,
      fontSize: 34,
      lineHeight: 40,
      fontWeight: '800',
    },
    subtitle: {
      color: colors.textMuted,
      fontSize: 15,
      lineHeight: 22,
      marginTop: -6,
    },
    sectionCard: {
      backgroundColor: colors.surface,
      borderRadius: 28,
      padding: 16,
      borderWidth: 1,
      borderColor: colors.border,
      gap: 12,
    },
    sectionHeaderButton: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 12,
    },
    sectionHeaderTextWrap: {
      flex: 1,
      gap: 4,
    },
    sectionTitle: {
      color: colors.textPrimary,
      fontSize: 20,
      fontWeight: '800',
    },
    sectionSubtitle: {
      color: colors.textMuted,
      fontSize: 14,
      lineHeight: 20,
    },
    row: {
      backgroundColor: colors.surfaceAlt,
      borderRadius: 20,
      padding: 12,
      gap: 8,
      borderWidth: 1,
      borderColor: colors.border,
    },
    rowTop: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 10,
    },
    rowTextWrap: {
      flex: 1,
      gap: 3,
    },
    rowTitle: {
      color: colors.textPrimary,
      fontSize: 16,
      fontWeight: '700',
    },
    rowDescription: {
      color: colors.textSecondary,
      fontSize: 13,
      lineHeight: 18,
    },
    segmentedRow: {
      flexDirection: 'row',
      gap: 8,
    },
    segmentedButton: {
      flex: 1,
      minHeight: 42,
      borderRadius: 16,
      backgroundColor: colors.actionSurface,
      borderWidth: 1,
      borderColor: colors.actionBorder,
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: 12,
    },
    segmentedButtonActive: {
      backgroundColor: colors.textPrimary,
      borderColor: colors.textPrimary,
    },
    segmentedButtonText: {
      color: colors.textPrimary,
      fontSize: 14,
      fontWeight: '700',
    },
    segmentedButtonTextActive: {
      color: colors.background,
    },
    stepperRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 8,
    },
    stepperControls: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    stepperButton: {
      width: 36,
      height: 36,
      borderRadius: 18,
      backgroundColor: colors.actionSurface,
      borderWidth: 1,
      borderColor: colors.actionBorder,
      alignItems: 'center',
      justifyContent: 'center',
    },
    stepperButtonDisabled: {
      backgroundColor: colors.surfaceMuted,
      borderColor: colors.border,
      opacity: 0.65,
    },
    stepperValueWrap: {
      minWidth: 84,
      alignItems: 'center',
      gap: 2,
    },
    stepperValue: {
      color: colors.textPrimary,
      fontSize: 18,
      fontWeight: '800',
    },
    stepperMeta: {
      color: colors.textMuted,
      fontSize: 12,
      fontWeight: '600',
    },
    hourRangeRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 10,
      backgroundColor: colors.actionSurface,
      borderRadius: 18,
      padding: 10,
      borderWidth: 1,
      borderColor: colors.actionBorder,
    },
    hourRangeLabelInline: {
      color: colors.textMuted,
      fontSize: 13,
      fontWeight: '700',
      textTransform: 'uppercase',
      letterSpacing: 0.5,
    },
    hourRangeValueWrap: {
      minWidth: 92,
      alignItems: 'center',
      justifyContent: 'center',
    },
    dashboardRow: {
      backgroundColor: colors.surfaceAlt,
      borderRadius: 20,
      padding: 12,
      gap: 8,
      borderWidth: 1,
      borderColor: colors.border,
    },
    dashboardControls: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 10,
    },
    moveButtons: {
      flexDirection: 'row',
      gap: 6,
    },
    moveButton: {
      width: 32,
      height: 32,
      borderRadius: 16,
      backgroundColor: colors.actionSurface,
      borderWidth: 1,
      borderColor: colors.actionBorder,
      alignItems: 'center',
      justifyContent: 'center',
    },
    moveButtonDisabled: {
      backgroundColor: colors.surfaceMuted,
      borderColor: colors.border,
      opacity: 0.65,
    },
    footerText: {
      color: colors.textMuted,
      fontSize: 13,
      lineHeight: 18,
    },
  });
