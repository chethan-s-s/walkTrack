import React from 'react';
import { Text, View } from 'react-native';

import { useAppColors } from '../../../theme/useAppColors';
import { formatDuration } from '../../../utils/formatDuration';
import { createStyles } from '../HomeScreenStyles';

type WeeklyTrend = {
  improving: boolean;
  percent: number;
  previousWeekTotal: number;
  thisWeekTotal: number;
};

type WeeklyTrendCardProps = {
  currentDailyGoalMinutes: number;
  weeklyTrend: WeeklyTrend;
};

export default function WeeklyTrendCard({ currentDailyGoalMinutes, weeklyTrend }: WeeklyTrendCardProps) {
  const colors = useAppColors();
  const styles = React.useMemo(() => createStyles(colors), [colors]);

  return (
    <View style={styles.trendCard}>
      <Text style={styles.sectionTitle}>Weekly Trend</Text>
      <Text style={styles.sectionSubtitle}>Compared with last week.</Text>

      <View style={styles.trendRow}>
        <View style={[styles.trendBadge, weeklyTrend.improving ? styles.trendBadgePositive : styles.trendBadgeNegative]}>
          <Text style={styles.trendBadgeText}>{weeklyTrend.improving ? '+' : ''}{weeklyTrend.percent}%</Text>
        </View>
        <Text style={styles.trendMeta}>
          {formatDuration(weeklyTrend.thisWeekTotal)} this week vs {formatDuration(weeklyTrend.previousWeekTotal)} last week.
        </Text>
      </View>

      <View style={styles.sparklineRow}>
        {[weeklyTrend.previousWeekTotal, weeklyTrend.thisWeekTotal].map((value, index) => {
          const maxValue = Math.max(weeklyTrend.thisWeekTotal, weeklyTrend.previousWeekTotal, currentDailyGoalMinutes);
          const height = Math.max((value / maxValue) * 52, 8);

          return (
            <View
              key={`${index}-${value}`}
              style={[
                styles.sparklineBar,
                { height, backgroundColor: index === 0 ? colors.accentMuted : colors.accent },
              ]}
            />
          );
        })}
      </View>
    </View>
  );
}
