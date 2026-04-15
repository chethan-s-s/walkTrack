import React from 'react';
import { Pressable, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { useAppColors } from '../../../theme/useAppColors';
import { formatDuration } from '../../../utils/formatDuration';
import { createStyles } from '../HomeScreenStyles';

type WeeklyBar = {
  key: string;
  label: string;
  minutes: number;
};

type WeeklyRhythmCardProps = {
  canGoToNextRhythmWeek: boolean;
  maxMinutes: number;
  onChangeRhythmWeek: (direction: -1 | 1) => void;
  rhythmWeekLabel: string;
  selectedWeekMinutes: number;
  weeklyBars: WeeklyBar[];
};

export default function WeeklyRhythmCard({
  canGoToNextRhythmWeek,
  maxMinutes,
  onChangeRhythmWeek,
  rhythmWeekLabel,
  selectedWeekMinutes,
  weeklyBars,
}: WeeklyRhythmCardProps) {
  const colors = useAppColors();
  const styles = React.useMemo(() => createStyles(colors), [colors]);

  return (
    <View
      accessible
      accessibilityLabel={`Weekly rhythm chart for ${rhythmWeekLabel}. Total ${formatDuration(selectedWeekMinutes)}. Highest day ${formatDuration(maxMinutes)}.`}
      style={styles.chartCard}
    >
      <View style={styles.chartHeaderRow}>
        <View style={styles.sectionTextWrap}>
          <Text style={styles.sectionTitle}>Weekly Rhythm</Text>
          <Text style={styles.sectionSubtitle}>{rhythmWeekLabel}</Text>
        </View>

        <View style={styles.chartHeaderMetaWrap}>
          <View style={styles.chartWeekBadge}>
            <Text style={styles.chartWeekBadgeText}>{formatDuration(selectedWeekMinutes)}</Text>
          </View>
          <View style={styles.chartWeekNav}>
            <Pressable
              accessibilityLabel="Show previous week"
              accessibilityRole="button"
              onPress={() => onChangeRhythmWeek(-1)}
              style={styles.chartWeekButton}
            >
              <Ionicons color={colors.textPrimary} name="chevron-back" size={16} />
            </Pressable>
            <Pressable
              accessibilityLabel="Show next week"
              accessibilityRole="button"
              disabled={!canGoToNextRhythmWeek}
              onPress={() => onChangeRhythmWeek(1)}
              style={[styles.chartWeekButton, !canGoToNextRhythmWeek && styles.chartWeekButtonDisabled]}
            >
              <Ionicons color={canGoToNextRhythmWeek ? colors.textPrimary : colors.textMuted} name="chevron-forward" size={16} />
            </Pressable>
          </View>
        </View>
      </View>

      <View style={styles.chartWrap}>
        {weeklyBars.map((bar) => {
          const height = Math.max((bar.minutes / maxMinutes) * 120, bar.minutes > 0 ? 12 : 6);

          return (
            <View accessibilityLabel={`${bar.label}, ${formatDuration(bar.minutes)} walked`} accessible key={bar.key} style={styles.barColumn}>
              <Text adjustsFontSizeToFit ellipsizeMode="tail" numberOfLines={1} style={styles.barMinutes}>
                {formatDuration(bar.minutes)}
              </Text>
              <View style={styles.barTrack}>
                <View style={[styles.barFill, { height }]} />
              </View>
              <Text style={styles.barLabel}>{bar.label}</Text>
            </View>
          );
        })}
      </View>
    </View>
  );
}
