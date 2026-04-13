import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

import GoalProgressRing from '../../components/GoalProgressRing';
import { useWalkingData } from '../../context/WalkingDataContext';
import { getDateKey } from '../../storage/walkingStorage';
import { useAppColors } from '../../theme/useAppColors';
import {
  getAverageSessionLength,
  getBestDay,
  getCurrentStreak,
  getMilestoneBadge,
  getMonthlyHeatmapCalendar,
  getTotalMinutesThisMonth,
  getWeekDates,
  getWeeklyGoalHitCount,
  getWeeklyTrend,
} from '../../utils/analytics';
import { formatDuration } from '../../utils/formatDuration';
import { createStyles } from './HomeScreenStyles';
import { useAppSettings } from '../../context/AppSettingsContext';
import { DashboardSectionKey } from '../../types';
import { formatDashboardDate, formatEntryDate } from '../../utils/time';

const formatDay = (date: Date) =>
  date.toLocaleDateString('en-US', {
    weekday: 'short',
  });

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

const getHeatLabelColor = (minutes: number, maxMinutes: number, colors: ReturnType<typeof useAppColors>) => {
  if (minutes <= 0) {
    return colors.textMuted;
  }

  if (colors.isLight) {
    return minutes > maxMinutes * 0.33 ? colors.surface : colors.textPrimary;
  }

  return colors.textPrimary;
};

export default function HomeScreen() {
  const colors = useAppColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const { entries, loading, todayMinutes } = useWalkingData();
  const { settings } = useAppSettings();
  const currentDateLabel = formatDashboardDate(new Date());
  const [selectedHeatmapMonth, setSelectedHeatmapMonth] = useState(() => {
    const today = new Date();
    return new Date(today.getFullYear(), today.getMonth(), 1);
  });
  const [heatmapTooltip, setHeatmapTooltip] = useState<{ key: string; id: number } | null>(null);
  const currentMonthStart = useMemo(() => {
    const today = new Date();
    return new Date(today.getFullYear(), today.getMonth(), 1);
  }, []);

  const weeklyBars = useMemo(() => {
    return getWeekDates(new Date(), settings.weekStart).map((date) => {
      const key = getDateKey(date);
      const minutes = entries.find((entry) => entry.date === key)?.totalMinutes ?? 0;

      return {
        key,
        label: formatDay(date),
        minutes,
      };
    });
  }, [entries, settings.weekStart]);

  const maxMinutes = Math.max(...weeklyBars.map((item) => item.minutes), 30);
  const weeklyMinutes = useMemo(
    () => weeklyBars.reduce((total, bar) => total + bar.minutes, 0),
    [weeklyBars],
  );
  const weeklyGoalHits = useMemo(
    () => getWeeklyGoalHitCount(entries, settings.dailyGoalMinutes, settings.weekStart),
    [entries, settings.dailyGoalMinutes, settings.weekStart],
  );
  const bestDay = useMemo(() => getBestDay(entries), [entries]);
  const averageSessionLength = useMemo(() => getAverageSessionLength(entries), [entries]);
  const totalMinutesThisMonth = useMemo(() => getTotalMinutesThisMonth(entries), [entries]);
  const weeklyTrend = useMemo(() => getWeeklyTrend(entries, settings.weekStart), [entries, settings.weekStart]);
  const currentStreak = useMemo(() => getCurrentStreak(entries, settings.dailyGoalMinutes), [entries, settings.dailyGoalMinutes]);
  const milestoneBadge = useMemo(() => getMilestoneBadge(entries), [entries]);
  const heatmapCalendar = useMemo(
    () => getMonthlyHeatmapCalendar(entries, selectedHeatmapMonth, settings.weekStart),
    [entries, selectedHeatmapMonth, settings.weekStart],
  );
  const heatmapMaxMinutes = Math.max(
    ...heatmapCalendar.cells.map((item) => item.minutes),
    settings.dailyGoalMinutes,
  );
  const canGoToNextHeatmapMonth =
    selectedHeatmapMonth.getFullYear() < currentMonthStart.getFullYear() ||
    (selectedHeatmapMonth.getFullYear() === currentMonthStart.getFullYear() &&
      selectedHeatmapMonth.getMonth() < currentMonthStart.getMonth());
  const remainingGoalMinutes = Math.max(settings.dailyGoalMinutes - todayMinutes, 0);
  const isGoalReached = todayMinutes >= settings.dailyGoalMinutes;
  useEffect(() => {
    if (!heatmapTooltip) {
      return undefined;
    }

    const timeout = setTimeout(() => {
      setHeatmapTooltip(null);
    }, 2000);

    return () => clearTimeout(timeout);
  }, [heatmapTooltip]);

  const changeHeatmapMonth = (direction: -1 | 1) => {
    setSelectedHeatmapMonth((currentMonth) => {
      const nextMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + direction, 1);

      if (direction === 1 && nextMonth > currentMonthStart) {
        return currentMonth;
      }

      return nextMonth;
    });
    setHeatmapTooltip(null);
  };

  const dashboardSections = useMemo(() => {
    const hiddenSections = new Set(settings.hiddenDashboardSections);

    const sectionMap: Record<DashboardSectionKey, React.ReactNode> = {
      insights: (
        <View style={styles.insightsCard}>
          <Text style={styles.sectionTitle}>Insights</Text>
          <Text style={styles.sectionSubtitle}>Quick highlights.</Text>

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
              <Text style={styles.insightLabel}>This week</Text>
              <Text adjustsFontSizeToFit ellipsizeMode="tail" numberOfLines={1} style={styles.insightValue}>
                {formatDuration(weeklyMinutes)}
              </Text>
              <Text style={styles.insightMeta}>Total logged this week</Text>
            </View>

            <View style={styles.insightTile}>
              <Text style={styles.insightLabel}>This month</Text>
              <Text adjustsFontSizeToFit ellipsizeMode="tail" numberOfLines={1} style={styles.insightValue}>
                {formatDuration(totalMinutesThisMonth)}
              </Text>
              <Text style={styles.insightMeta}>Total logged this month</Text>
            </View>
          </View>
        </View>
      ),
      weeklyRhythm: (
        <View style={styles.chartCard}>
          <Text style={styles.sectionTitle}>Weekly Rhythm</Text>
          <Text style={styles.sectionSubtitle}>This week at a glance.</Text>
          <View style={styles.chartWrap}>
            {weeklyBars.map((bar) => {
              const height = Math.max((bar.minutes / maxMinutes) * 120, bar.minutes > 0 ? 12 : 6);

              return (
                <View key={bar.key} style={styles.barColumn}>
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
      ),
      weeklyTrend: (
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
              const maxValue = Math.max(weeklyTrend.thisWeekTotal, weeklyTrend.previousWeekTotal, settings.dailyGoalMinutes);
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
      ),
      heatmap: (
        <View style={styles.heatmapCard}>
          <View style={styles.heatmapHeaderRow}>
            <View style={styles.sectionTextWrap}>
              <Text style={styles.sectionTitle}>Heatmap</Text>
              <Text style={styles.sectionSubtitle}>Monthly activity.</Text>
            </View>

            <View style={styles.heatmapMonthNav}>
              <Pressable accessibilityLabel="Show previous month" accessibilityRole="button" onPress={() => changeHeatmapMonth(-1)} style={styles.heatmapMonthButton}>
                <Ionicons color={colors.textPrimary} name="chevron-back" size={16} />
              </Pressable>
              <View style={styles.heatmapMonthBadge}>
                <Text style={styles.heatmapMonthText}>{heatmapCalendar.monthLabel}</Text>
              </View>
              <Pressable
                accessibilityLabel="Show next month"
                accessibilityRole="button"
                disabled={!canGoToNextHeatmapMonth}
                onPress={() => changeHeatmapMonth(1)}
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
                  accessibilityLabel={`${day.dayNumber} ${heatmapCalendar.monthLabel}, ${formatDuration(day.minutes)} walked`}
                  accessibilityRole="button"
                  key={day.key}
                  onPress={() => setHeatmapTooltip({ key: day.key, id: Date.now() })}
                  style={[
                    styles.heatmapCell,
                    { backgroundColor: getHeatColor(day.minutes, heatmapMaxMinutes, colors) },
                    day.isToday && styles.heatmapCellToday,
                    heatmapTooltip?.key === day.key && styles.heatmapCellSelected,
                  ]}
                >
                  {heatmapTooltip?.key === day.key ? (
                    <View style={styles.heatmapTooltip}>
                      <Text style={styles.heatmapTooltipText}>{formatDuration(day.minutes)}</Text>
                    </View>
                  ) : null}
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
      ),
    };

    return settings.dashboardOrder
      .filter((section) => !hiddenSections.has(section))
      .map((section) => <React.Fragment key={section}>{sectionMap[section]}</React.Fragment>);
  }, [
    averageSessionLength,
    bestDay,
    colors,
    currentStreak,
    heatmapCalendar,
    heatmapMaxMinutes,
    milestoneBadge,
    maxMinutes,
    settings.dailyGoalMinutes,
    settings.dashboardOrder,
    settings.hiddenDashboardSections,
    canGoToNextHeatmapMonth,
    heatmapTooltip,
    totalMinutesThisMonth,
    weeklyMinutes,
    weeklyBars,
    weeklyGoalHits,
    weeklyTrend,
    styles,
  ]);

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
              goal={settings.dailyGoalMinutes}
              label={`${Math.round((todayMinutes / settings.dailyGoalMinutes) * 100) || 0}%`}
              sublabel="goal"
              value={todayMinutes}
            />

            <View style={styles.goalsTextWrap}>
              <Text style={styles.goalEyebrow}>Daily Goal</Text>
              <Text adjustsFontSizeToFit ellipsizeMode="tail" numberOfLines={1} style={styles.goalHeadline}>
                {formatDuration(todayMinutes)} / {formatDuration(settings.dailyGoalMinutes)}
              </Text>
              <Text style={styles.goalMeta}>
                {weeklyGoalHits}/7 days hit · Weekly target {settings.weeklyGoalDays} days
              </Text>
              <View style={styles.streakPill}>
                <Text ellipsizeMode="tail" numberOfLines={1} style={styles.streakText}>
                  {currentStreak > 0
                    ? `${currentStreak}-day streak`
                    : weeklyGoalHits >= settings.weeklyGoalDays
                      ? 'On track'
                      : `${settings.weeklyGoalDays - weeklyGoalHits} more day${settings.weeklyGoalDays - weeklyGoalHits === 1 ? '' : 's'} needed`}
                </Text>
              </View>
              {milestoneBadge ? (
                <View style={styles.milestonePill}>
                  <Text style={styles.milestoneTitle}>{milestoneBadge.title}</Text>
                  <Text style={styles.milestoneText}>{milestoneBadge.description}</Text>
                </View>
              ) : null}
            </View>
          </View>

          {!isGoalReached && settings.goalReminderEnabled ? (
            <View style={styles.reminderCard}>
              <Text style={styles.reminderTitle}>Goal reminder</Text>
              <Text style={styles.reminderText}>
                {formatDuration(remainingGoalMinutes)} left to reach today’s goal.
              </Text>
            </View>
          ) : null}
        </View>

        <View style={styles.statGrid}>
          <View style={styles.card}>
            <Text style={styles.cardLabel}>Today</Text>
            <Text adjustsFontSizeToFit ellipsizeMode="tail" numberOfLines={1} style={styles.cardValue}>
              {formatDuration(todayMinutes)}
            </Text>
            <Text style={styles.cardMeta}>{isGoalReached ? 'Goal reached' : `${formatDuration(remainingGoalMinutes)} left`}</Text>
          </View>
          <View style={styles.card}>
            <Text style={styles.cardLabel}>This week</Text>
            <Text adjustsFontSizeToFit ellipsizeMode="tail" numberOfLines={1} style={styles.cardValue}>
              {formatDuration(weeklyMinutes)}
            </Text>
            <Text style={styles.cardMeta}>{weeklyGoalHits}/7 goal days hit</Text>
          </View>
        </View>

        {dashboardSections}
      </ScrollView>
    </SafeAreaView>
  );
}
