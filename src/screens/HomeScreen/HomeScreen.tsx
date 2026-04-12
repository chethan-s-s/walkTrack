import React, { useMemo } from 'react';
import {
  ActivityIndicator,
  ScrollView,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import GoalProgressRing from '../../components/GoalProgressRing';
import { DAILY_GOAL_MINUTES, WEEKLY_GOAL_DAYS } from '../../constants/goals';
import { useWalkingData } from '../../context/WalkingDataContext';
import { getDateKey } from '../../storage/walkingStorage';
import { useAppColors } from '../../theme/useAppColors';
import {
  getAverageSessionLength,
  getBestDay,
  getHeatmapDays,
  getTotalMinutesThisMonth,
  getWeeklyGoalHitCount,
  getWeeklyTrend,
} from '../../utils/analytics';
import { formatDuration } from '../../utils/formatDuration';
import { createStyles } from './HomeScreenStyles';

const formatDay = (date: Date) =>
  date.toLocaleDateString('en-US', {
    weekday: 'short',
  });

const formatDashboardDate = (date: Date) =>
  date.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  });

const formatEntryDate = (value: string) => {
  const [year, month, day] = value.split('-').map(Number);

  return new Date(year, month - 1, day).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  });
};

const getHeatColor = (minutes: number, maxMinutes: number, colors: ReturnType<typeof useAppColors>) => {
  if (minutes <= 0) {
    return colors.heatEmpty;
  }

  if (minutes <= maxMinutes * 0.33) {
    return colors.heatLow;
  }

  if (minutes <= maxMinutes * 0.66) {
    return colors.heatMid;
  }

  return colors.heatHigh;
};

export default function HomeScreen() {
  const colors = useAppColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const { averageMinutes, entries, loading, todayMinutes, weeklyMinutes } = useWalkingData();
  const currentDateLabel = formatDashboardDate(new Date());

  const weeklyBars = useMemo(() => {
    return Array.from({ length: 7 }, (_, index) => {
      const date = new Date();
      date.setDate(date.getDate() - (6 - index));
      const key = getDateKey(date);
      const minutes = entries.find((entry) => entry.date === key)?.totalMinutes ?? 0;

      return {
        key,
        label: formatDay(date),
        minutes,
      };
    });
  }, [entries]);

  const maxMinutes = Math.max(...weeklyBars.map((item) => item.minutes), 30);
  const weeklyGoalHits = useMemo(() => getWeeklyGoalHitCount(entries, DAILY_GOAL_MINUTES), [entries]);
  const bestDay = useMemo(() => getBestDay(entries), [entries]);
  const averageSessionLength = useMemo(() => getAverageSessionLength(entries), [entries]);
  const totalMinutesThisMonth = useMemo(() => getTotalMinutesThisMonth(entries), [entries]);
  const weeklyTrend = useMemo(() => getWeeklyTrend(entries), [entries]);
  const heatmapDays = useMemo(() => getHeatmapDays(entries), [entries]);
  const heatmapMaxMinutes = Math.max(...heatmapDays.map((item) => item.minutes), DAILY_GOAL_MINUTES);
  const remainingGoalMinutes = Math.max(DAILY_GOAL_MINUTES - todayMinutes, 0);
  const isGoalReached = todayMinutes >= DAILY_GOAL_MINUTES;

  if (loading) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.loaderWrap}>
          <ActivityIndicator color={colors.textPrimary} size="large" />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={styles.dateLabel}>{currentDateLabel}</Text>
        <Text style={styles.title}>Dashboard</Text>

        <View style={styles.goalsCard}>
          <View style={styles.goalsTopRow}>
            <GoalProgressRing
              colors={colors}
              goal={DAILY_GOAL_MINUTES}
              label={`${Math.round((todayMinutes / DAILY_GOAL_MINUTES) * 100) || 0}%`}
              sublabel="goal"
              value={todayMinutes}
            />

            <View style={styles.goalsTextWrap}>
              <Text style={styles.goalEyebrow}>Daily Goal</Text>
              <Text style={styles.goalHeadline}>{formatDuration(todayMinutes)} / {formatDuration(DAILY_GOAL_MINUTES)}</Text>
              <Text style={styles.goalMeta}>
                {weeklyGoalHits}/7 days hit · Weekly target {WEEKLY_GOAL_DAYS} days
              </Text>
              <View style={styles.streakPill}>
                <Text style={styles.streakText}>
                  {weeklyGoalHits >= WEEKLY_GOAL_DAYS ? 'Weekly goal on track' : `${WEEKLY_GOAL_DAYS - weeklyGoalHits} more day${WEEKLY_GOAL_DAYS - weeklyGoalHits === 1 ? '' : 's'} needed`}
                </Text>
              </View>
            </View>
          </View>

          {!isGoalReached ? (
            <View style={styles.reminderCard}>
              <Text style={styles.reminderTitle}>Goal reminder</Text>
              <Text style={styles.reminderText}>
                You are {formatDuration(remainingGoalMinutes)} away from today’s walking goal.
              </Text>
            </View>
          ) : null}
        </View>

        <View style={styles.statGrid}>
          <View style={styles.card}>
            <Text style={styles.cardLabel}>Today</Text>
            <Text style={styles.cardValue}>{formatDuration(todayMinutes)}</Text>
          </View>
          <View style={styles.card}>
            <Text style={styles.cardLabel}>Last 7 days</Text>
            <Text style={styles.cardValue}>{formatDuration(weeklyMinutes)}</Text>
          </View>
          <View style={styles.cardWide}>
            <Text style={styles.cardLabel}>Daily average</Text>
            <Text style={styles.cardValue}>{formatDuration(averageMinutes)}</Text>
          </View>
        </View>

        <View style={styles.insightsCard}>
          <Text style={styles.sectionTitle}>Insights</Text>
          <Text style={styles.sectionSubtitle}>Your walking patterns at a glance.</Text>

          <View style={styles.insightGrid}>
            <View style={styles.insightTile}>
              <Text style={styles.insightLabel}>Best day</Text>
              <Text style={styles.insightValue}>{bestDay ? formatDuration(bestDay.totalMinutes) : '—'}</Text>
              <Text style={styles.insightMeta}>{bestDay ? formatEntryDate(bestDay.date) : 'No sessions yet'}</Text>
            </View>

            <View style={styles.insightTile}>
              <Text style={styles.insightLabel}>Avg session</Text>
              <Text style={styles.insightValue}>{formatDuration(averageSessionLength)}</Text>
              <Text style={styles.insightMeta}>Based on all saved sessions</Text>
            </View>

            <View style={styles.insightTileWide}>
              <Text style={styles.insightLabel}>This month</Text>
              <Text style={styles.insightValue}>{formatDuration(totalMinutesThisMonth)}</Text>
              <Text style={styles.insightMeta}>Total walking time logged this month</Text>
            </View>
          </View>
        </View>

        <View style={styles.chartCard}>
          <Text style={styles.sectionTitle}>Weekly Rhythm</Text>
          <Text style={styles.sectionSubtitle}>A quick glance at the last 7 days.</Text>
          <View style={styles.chartWrap}>
            {weeklyBars.map((bar) => {
              const height = Math.max((bar.minutes / maxMinutes) * 120, bar.minutes > 0 ? 12 : 6);

              return (
                <View key={bar.key} style={styles.barColumn}>
                  <Text style={styles.barMinutes}>{formatDuration(bar.minutes)}</Text>
                  <View style={styles.barTrack}>
                    <View style={[styles.barFill, { height }]} />
                  </View>
                  <Text style={styles.barLabel}>{bar.label}</Text>
                </View>
              );
            })}
          </View>
        </View>

        <View style={styles.trendCard}>
          <Text style={styles.sectionTitle}>Weekly Trend</Text>
          <Text style={styles.sectionSubtitle}>Compare this week with the previous 7 days.</Text>

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
              const maxValue = Math.max(weeklyTrend.thisWeekTotal, weeklyTrend.previousWeekTotal, DAILY_GOAL_MINUTES);
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

        <View style={styles.heatmapCard}>
          <Text style={styles.sectionTitle}>Heatmap</Text>
          <Text style={styles.sectionSubtitle}>Your last 35 days of walking activity.</Text>

          <View style={styles.heatmapGrid}>
            {heatmapDays.map((day) => (
              <View
                key={day.key}
                style={[styles.heatmapCell, { backgroundColor: getHeatColor(day.minutes, heatmapMaxMinutes, colors) }]}
              >
                <Text style={styles.heatmapLabel}>{day.label}</Text>
              </View>
            ))}
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
      </ScrollView>
    </SafeAreaView>
  );
}
