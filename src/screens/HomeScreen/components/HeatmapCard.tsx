import React from 'react';
import { Pressable, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { useAppColors } from '../../../theme/useAppColors';
import { formatDuration } from '../../../utils/formatDuration';
import { createStyles } from '../HomeScreenStyles';

type HeatmapCell = {
  dayNumber: number;
  isCurrentMonth: boolean;
  isToday: boolean;
  key: string;
  minutes: number;
};

type HeatmapCalendar = {
  cells: HeatmapCell[];
  monthLabel: string;
  weekdayLabels: string[];
};

type HeatmapCardProps = {
  canGoToNextHeatmapMonth: boolean;
  heatmapCalendar: HeatmapCalendar;
  heatmapMaxMinutes: number;
  onChangeHeatmapMonth: (direction: -1 | 1) => void;
  onNavigateToDate: (dateKey: string) => void;
  todayKey: string;
};

const getHeatColor = (minutes: number, maxMinutes: number, colors: ReturnType<typeof useAppColors>) => {
  if (minutes <= 0) return colors.heatEmpty;
  if (minutes <= maxMinutes * 0.33) return colors.heatLow;
  if (minutes <= maxMinutes * 0.66) return colors.heatMid;
  return colors.heatHigh;
};

const getHeatLabelColor = (minutes: number, maxMinutes: number, colors: ReturnType<typeof useAppColors>) => {
  if (minutes <= 0) return colors.textMuted;
  if (colors.isLight) return minutes > maxMinutes * 0.33 ? colors.surface : colors.textPrimary;
  return colors.textPrimary;
};

export default function HeatmapCard({
  canGoToNextHeatmapMonth,
  heatmapCalendar,
  heatmapMaxMinutes,
  onChangeHeatmapMonth,
  onNavigateToDate,
  todayKey,
}: HeatmapCardProps) {
  const colors = useAppColors();
  const styles = React.useMemo(() => createStyles(colors), [colors]);

  return (
    <View
      accessible
      accessibilityLabel={`Monthly heatmap for ${heatmapCalendar.monthLabel}. ${heatmapCalendar.cells.filter((day) => day.isCurrentMonth && day.minutes > 0).length} active days shown.`}
      style={styles.heatmapCard}
    >
      <View style={styles.heatmapHeaderRow}>
        <View style={styles.sectionTextWrap}>
          <Text style={styles.sectionTitle}>Heatmap</Text>
          <Text style={styles.sectionSubtitle}>Monthly activity.</Text>
        </View>

        <View style={styles.heatmapMonthNav}>
          <Pressable accessibilityLabel="Show previous month" accessibilityRole="button" onPress={() => onChangeHeatmapMonth(-1)} style={styles.heatmapMonthButton}>
            <Ionicons color={colors.textPrimary} name="chevron-back" size={16} />
          </Pressable>
          <View style={styles.heatmapMonthBadge}>
            <Text style={styles.heatmapMonthText}>{heatmapCalendar.monthLabel}</Text>
          </View>
          <Pressable
            accessibilityLabel="Show next month"
            accessibilityRole="button"
            disabled={!canGoToNextHeatmapMonth}
            onPress={() => onChangeHeatmapMonth(1)}
            style={[styles.heatmapMonthButton, !canGoToNextHeatmapMonth && styles.heatmapMonthButtonDisabled]}
          >
            <Ionicons
              color={canGoToNextHeatmapMonth ? colors.textPrimary : colors.textMuted}
              name="chevron-forward"
              size={16}
            />
          </Pressable>
        </View>
      </View>

      <View style={styles.heatmapWeekdayRow}>
        {heatmapCalendar.weekdayLabels.map((label) => (
          <Text key={label} style={styles.heatmapWeekdayLabel}>{label}</Text>
        ))}
      </View>

      <View style={styles.heatmapGrid}>
        {heatmapCalendar.cells.map((day) =>
          day.isCurrentMonth ? (
            <Pressable
              accessibilityHint={day.key > todayKey ? 'Future days are unavailable' : 'Open this day in the walking timeline'}
              accessibilityLabel={`${day.dayNumber} ${heatmapCalendar.monthLabel}, ${formatDuration(day.minutes)} walked${day.isToday ? ', today' : ''}`}
              accessibilityRole="button"
              accessibilityState={{ disabled: day.key > todayKey }}
              disabled={day.key > todayKey}
              hitSlop={6}
              key={day.key}
              onPress={() => onNavigateToDate(day.key)}
              style={[
                styles.heatmapCell,
                { backgroundColor: getHeatColor(day.minutes, heatmapMaxMinutes, colors) },
                day.isToday && styles.heatmapCellToday,
                day.key > todayKey && styles.heatmapCellFuture,
              ]}
            >
              <View style={styles.heatmapCellContent}>
                <Text
                  style={[
                    styles.heatmapLabel,
                    day.minutes > 0 && styles.heatmapLabelActive,
                    { color: getHeatLabelColor(day.minutes, heatmapMaxMinutes, colors) },
                  ]}
                >
                  {day.dayNumber}
                </Text>
              </View>
            </Pressable>
          ) : (
            <View key={day.key} style={[styles.heatmapCell, styles.heatmapCellEmpty]} />
          ),
        )}
      </View>

      <View style={styles.heatmapLegendRow}>
        <Text style={styles.heatmapLegendText}>Less</Text>
        <View style={styles.heatmapLegendScale}>
          {[colors.heatEmpty, colors.heatLow, colors.heatMid, colors.heatHigh].map((color) => (
            <View key={color} style={[styles.heatmapLegendSwatch, { backgroundColor: color }]} />
          ))}
        </View>
        <Text style={styles.heatmapLegendText}>More</Text>
      </View>
    </View>
  );
}
