import React from 'react';
import { Text, View } from 'react-native';

import { useAppColors } from '../../../theme/useAppColors';
import { formatDuration } from '../../../utils/formatDuration';
import { formatEntryDate } from '../../../utils/time';
import { createStyles } from '../HomeScreenStyles';

type TimeOfDayBucket = {
  key: string;
  label: string;
  minutes: number;
};

type TimeOfDayPattern = {
  buckets: TimeOfDayBucket[];
  topLabel: string;
  topMinutes: number;
};

type InsightsCardProps = {
  averageSessionLength: number;
  bestDay: { date: string; totalMinutes: number } | undefined;
  bestWeekday: { label: string; totalMinutes: number } | null;
  currentWeekMinutes: number;
  longestStreak: number;
  monthlyConsistency: { completedDays: number; percent: number; totalDays: number };
  monthlyGoalMinutes: number;
  timeOfDayPattern: TimeOfDayPattern;
  totalMinutesThisMonth: number;
  weeklyAverage: number;
  weeklyConsistency: { completedDays: number; percent: number; totalDays: number };
  weeklyGoalMinutes: number;
};

export default function InsightsCard({
  averageSessionLength,
  bestDay,
  bestWeekday,
  currentWeekMinutes,
  longestStreak,
  monthlyConsistency,
  monthlyGoalMinutes,
  timeOfDayPattern,
  totalMinutesThisMonth,
  weeklyAverage,
  weeklyConsistency,
  weeklyGoalMinutes,
}: InsightsCardProps) {
  const colors = useAppColors();
  const styles = React.useMemo(() => createStyles(colors), [colors]);

  return (
    <View style={styles.insightsCard}>
      <Text style={styles.sectionTitle}>Insights</Text>
      <Text style={styles.sectionSubtitle}>Trends, consistency, and goal progress.</Text>

      <View style={styles.insightGrid}>
        <View style={styles.insightTile}>
          <Text style={styles.insightLabel}>Best day</Text>
          <Text adjustsFontSizeToFit ellipsizeMode="tail" numberOfLines={1} style={styles.insightValue}>
            {bestDay ? formatDuration(bestDay.totalMinutes) : '—'}
          </Text>
          <Text style={styles.insightMeta}>{bestDay ? formatEntryDate(bestDay.date) : 'No data yet'}</Text>
        </View>

        <View style={styles.insightTile}>
          <Text style={styles.insightLabel}>Avg session</Text>
          <Text adjustsFontSizeToFit ellipsizeMode="tail" numberOfLines={1} style={styles.insightValue}>
            {formatDuration(averageSessionLength)}
          </Text>
          <Text style={styles.insightMeta}>Across all sessions</Text>
        </View>

        <View style={styles.insightTile}>
          <Text style={styles.insightLabel}>Weekly average</Text>
          <Text adjustsFontSizeToFit ellipsizeMode="tail" numberOfLines={1} style={styles.insightValue}>
            {formatDuration(weeklyAverage)}
          </Text>
          <Text style={styles.insightMeta}>Average daily minutes over the last 7 days</Text>
        </View>

        <View style={styles.insightTile}>
          <Text style={styles.insightLabel}>Longest streak</Text>
          <Text adjustsFontSizeToFit ellipsizeMode="tail" numberOfLines={1} style={styles.insightValue}>
            {longestStreak ? `${longestStreak} days` : '—'}
          </Text>
          <Text style={styles.insightMeta}>Best run of goal-hitting days</Text>
        </View>

        <View style={styles.insightTile}>
          <Text style={styles.insightLabel}>Best weekday</Text>
          <Text adjustsFontSizeToFit ellipsizeMode="tail" numberOfLines={1} style={styles.insightValue}>
            {bestWeekday?.label ?? '—'}
          </Text>
          <Text style={styles.insightMeta}>{bestWeekday ? formatDuration(bestWeekday.totalMinutes) : 'No pattern yet'}</Text>
        </View>

        <View style={styles.insightTileWide}>
          <Text style={styles.insightLabel}>This month</Text>
          <Text adjustsFontSizeToFit ellipsizeMode="tail" numberOfLines={1} style={styles.insightValue}>
            {formatDuration(totalMinutesThisMonth)}
          </Text>
          <Text style={styles.insightMeta}>Total logged this month</Text>
        </View>
      </View>

      <View style={styles.patternCard}>
        <View style={styles.patternHeader}>
          <View style={styles.sectionTextWrap}>
            <Text style={styles.patternTitle}>Time-of-day patterns</Text>
            <Text style={styles.patternSubtitle}>Strongest window: {timeOfDayPattern.topLabel}</Text>
          </View>
          <View style={styles.chartWeekBadge}>
            <Text style={styles.chartWeekBadgeText}>{formatDuration(timeOfDayPattern.topMinutes)}</Text>
          </View>
        </View>

        {timeOfDayPattern.buckets.map((bucket) => {
          const maxBucketMinutes = Math.max(...timeOfDayPattern.buckets.map((item) => item.minutes), 1);
          const width = bucket.minutes ? Math.max((bucket.minutes / maxBucketMinutes) * 100, 12) : 0;

          return (
            <View key={bucket.key} style={styles.patternBarRow}>
              <Text style={styles.patternBarLabel}>{bucket.label}</Text>
              <View style={styles.patternBarTrack}>
                <View style={[styles.patternBarFill, { width: `${width}%` }]} />
              </View>
              <Text style={styles.patternBarMeta}>{formatDuration(bucket.minutes)}</Text>
            </View>
          );
        })}
      </View>

      <View style={styles.consistencyRow}>
        <View style={styles.consistencyTile}>
          <Text style={styles.insightLabel}>Weekly goal progress</Text>
          <Text style={styles.consistencyValue}>{formatDuration(currentWeekMinutes)}</Text>
          <Text style={styles.insightMeta}>of {formatDuration(weeklyGoalMinutes)} weekly minutes</Text>
        </View>

        <View style={styles.consistencyTile}>
          <Text style={styles.insightLabel}>Monthly goal progress</Text>
          <Text style={styles.consistencyValue}>{formatDuration(totalMinutesThisMonth)}</Text>
          <Text style={styles.insightMeta}>of {formatDuration(monthlyGoalMinutes)} monthly minutes</Text>
        </View>
      </View>

      <View style={styles.consistencyRow}>
        <View style={styles.consistencyTile}>
          <Text style={styles.insightLabel}>Weekly consistency</Text>
          <Text style={styles.consistencyValue}>{weeklyConsistency.percent}%</Text>
          <Text style={styles.insightMeta}>{weeklyConsistency.completedDays}/{weeklyConsistency.totalDays} goal days</Text>
        </View>

        <View style={styles.consistencyTile}>
          <Text style={styles.insightLabel}>Monthly consistency</Text>
          <Text style={styles.consistencyValue}>{monthlyConsistency.percent}%</Text>
          <Text style={styles.insightMeta}>{monthlyConsistency.completedDays}/{monthlyConsistency.totalDays} goal days</Text>
        </View>
      </View>
    </View>
  );
}
