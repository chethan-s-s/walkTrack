import { StyleSheet } from 'react-native';

import { AppColors } from '../../theme/palette';

export const createStyles = (colors: AppColors) =>
  StyleSheet.create({
    safeArea: {
      flex: 1,
      backgroundColor: colors.background,
    },
    loaderWrap: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
    },
    content: {
      padding: 20,
      paddingBottom: 140,
      gap: 14,
    },
    headerWrap: {
      marginBottom: 16,
      gap: 10,
    },
    title: {
      color: colors.textPrimary,
      fontSize: 34,
      lineHeight: 40,
      fontWeight: '800',
    },
    subtitle: {
      color: colors.textMuted,
      fontSize: 14,
    },
    searchCard: {
      backgroundColor: colors.surface,
      borderRadius: 22,
      paddingHorizontal: 16,
      paddingVertical: 14,
      borderWidth: 1,
      borderColor: colors.border,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
    },
    searchInput: {
      flex: 1,
      color: colors.textPrimary,
      fontSize: 15,
      fontWeight: '600',
      paddingVertical: 0,
    },
    filterRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 10,
    },
    filterChip: {
      borderRadius: 999,
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
      paddingHorizontal: 14,
      paddingVertical: 10,
    },
    filterChipActive: {
      backgroundColor: colors.actionSurface,
      borderColor: colors.actionBorder,
    },
    filterChipText: {
      color: colors.textMuted,
      fontSize: 13,
      fontWeight: '700',
    },
    filterChipTextActive: {
      color: colors.textPrimary,
    },
    emptyCard: {
      backgroundColor: colors.surface,
      borderRadius: 24,
      padding: 20,
      borderWidth: 1,
      borderColor: colors.border,
      gap: 8,
    },
    emptyTitle: {
      color: colors.textPrimary,
      fontSize: 20,
      fontWeight: '700',
    },
    emptyText: {
      color: colors.textMuted,
      fontSize: 14,
      lineHeight: 20,
    },
    rowCard: {
      backgroundColor: colors.surface,
      borderRadius: 22,
      padding: 16,
      borderWidth: 1,
      borderColor: colors.border,
      marginBottom: 4,
      gap: 14,
    },
    rowTop: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      gap: 12,
    },
    rowMainButton: {
      flex: 1,
    },
    rowTextWrap: {
      flex: 1,
      minWidth: 0,
    },
    rowDate: {
      color: colors.textPrimary,
      fontSize: 16,
      fontWeight: '700',
    },
    rowMeta: {
      marginTop: 6,
      color: colors.textMuted,
      fontSize: 13,
      lineHeight: 18,
    },
    rowChevronWrap: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
    },
    expandButton: {
      width: 32,
      height: 32,
      borderRadius: 16,
      backgroundColor: colors.surfaceAlt,
      borderWidth: 1,
      borderColor: colors.border,
      alignItems: 'center',
      justifyContent: 'center',
    },
    minutesPill: {
      borderRadius: 999,
      paddingVertical: 10,
      paddingHorizontal: 12,
      minWidth: 74,
      alignItems: 'center',
    },
    minutesText: {
      color: colors.background,
      fontSize: 14,
      fontWeight: '800',
    },
    expandedWrap: {
      gap: 10,
      paddingTop: 2,
    },
    sessionRow: {
      backgroundColor: colors.surfaceAlt,
      borderRadius: 18,
      padding: 14,
      gap: 4,
    },
    sessionTitle: {
      color: colors.textPrimary,
      fontSize: 14,
      fontWeight: '700',
    },
    sessionMeta: {
      color: colors.textMuted,
      fontSize: 12,
      lineHeight: 17,
    },
  });
