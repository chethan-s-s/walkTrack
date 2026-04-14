import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  LayoutAnimation,
  Platform,
  Pressable,
  ScrollView,
  Text,
  UIManager,
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
  getWeekStartDate,
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

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

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
  const { getDailyGoalMinutesForDate, settings } = useAppSettings();
  const todayKey = getDateKey();
  const currentDailyGoalMinutes = getDailyGoalMinutesForDate(todayKey);
  const currentDateLabel = formatDashboardDate(new Date());
  const [selectedRhythmWeekDate, setSelectedRhythmWeekDate] = useState(() => new Date());
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
    return getWeekDates(selectedRhythmWeekDate, settings.weekStart).map((date) => {
      const key = getDateKey(date);
      const minutes = entries.find((entry) => entry.date === key)?.totalMinutes ?? 0;

      return {
        key,
        label: formatDay(date),
        minutes,
      };
    });
  }, [entries, selectedRhythmWeekDate, settings.weekStart]);

  const maxMinutes = Math.max(...weeklyBars.map((item) => item.minutes), 30);
  const selectedWeekMinutes = useMemo(
    () => weeklyBars.reduce((total, bar) => total + bar.minutes, 0),
    [weeklyBars],
  );
  const weeklyGoalHits = useMemo(
    () => getWeeklyGoalHitCount(entries, settings, new Date(), settings.weekStart),
    [entries, settings],
  );
  const bestDay = useMemo(() => getBestDay(entries), [entries]);
  const averageSessionLength = useMemo(() => getAverageSessionLength(entries), [entries]);
  const totalMinutesThisMonth = useMemo(() => getTotalMinutesThisMonth(entries), [entries]);
  const weeklyTrend = useMemo(() => getWeeklyTrend(entries, settings.weekStart), [entries, settings.weekStart]);
  const currentStreak = useMemo(() => getCurrentStreak(entries, settings), [entries, settings]);
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
  const currentRhythmWeekStart = useMemo(() => getWeekStartDate(new Date(), settings.weekStart), [settings.weekStart]);
  const selectedRhythmWeekStart = useMemo(
    () => getWeekStartDate(selectedRhythmWeekDate, settings.weekStart),
    [selectedRhythmWeekDate, settings.weekStart],
  );
  const canGoToNextRhythmWeek = selectedRhythmWeekStart.getTime() < currentRhythmWeekStart.getTime();
  const rhythmWeekLabel = useMemo(() => {
    const startDate = weeklyBars[0] ? new Date(weeklyBars[0].key) : selectedRhythmWeekStart;
    const endDate = weeklyBars[weeklyBars.length - 1]
      ? new Date(weeklyBars[weeklyBars.length - 1].key)
      : selectedRhythmWeekStart;

    const startLabel = startDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    const endLabel = endDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

    return `${startLabel} - ${endLabel}`;
  }, [selectedRhythmWeekStart, weeklyBars]);
  const remainingGoalMinutes = Math.max(currentDailyGoalMinutes - todayMinutes, 0);
  const isGoalReached = todayMinutes >= currentDailyGoalMinutes;
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
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setSelectedHeatmapMonth((currentMonth) => {
      const nextMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + direction, 1);

      if (direction === 1 && nextMonth > currentMonthStart) {
        return currentMonth;
      }

      return nextMonth;
    });
    setHeatmapTooltip(null);
  };

  const changeRhythmWeek = (direction: -1 | 1) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setSelectedRhythmWeekDate((currentDate) => {
      const nextDate = new Date(currentDate);
      nextDate.setDate(nextDate.getDate() + direction * 7);

      if (direction === 1 && getWeekStartDate(nextDate, settings.weekStart) > currentRhythmWeekStart) {
        return currentDate;
      }

      return nextDate;
    });
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

            <View style={styles.insightTileWide}>
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
                  onPress={() => changeRhythmWeek(-1)}
                  style={styles.chartWeekButton}
                >
                  <Ionicons color={colors.textPrimary} name="chevron-back" size={16} />
                </Pressable>
                <Pressable
                  accessibilityLabel="Show next week"
                  accessibilityRole="button"
                  disabled={!canGoToNextRhythmWeek}
                  onPress={() => changeRhythmWeek(1)}
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
      ),
      heatmap: (
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
                  accessibilityHint="Double tap to show the logged time for this day"
                  accessibilityLabel={`${day.dayNumber} ${heatmapCalendar.monthLabel}, ${formatDuration(day.minutes)} walked${day.isToday ? ', today' : ''}`}
                  accessibilityState={{ selected: heatmapTooltip?.key === day.key }}
                  accessibilityRole="button"
                  hitSlop={6}
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
    canGoToNextRhythmWeek,
    changeRhythmWeek,
    colors,
    currentStreak,
    currentDailyGoalMinutes,
    heatmapCalendar,
    heatmapMaxMinutes,
    milestoneBadge,
    maxMinutes,
    settings.dashboardOrder,
    settings.hiddenDashboardSections,
    canGoToNextHeatmapMonth,
    heatmapTooltip,
    rhythmWeekLabel,
    selectedWeekMinutes,
    totalMinutesThisMonth,
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
              goal={currentDailyGoalMinutes}
              label={`${Math.round((todayMinutes / currentDailyGoalMinutes) * 100) || 0}%`}
              sublabel="goal"
              value={todayMinutes}
            />

            <View style={styles.goalsTextWrap}>
              <Text style={styles.goalEyebrow}>Daily Goal</Text>
              <Text adjustsFontSizeToFit ellipsizeMode="tail" numberOfLines={1} style={styles.goalHeadline}>
                {formatDuration(todayMinutes)} / {formatDuration(currentDailyGoalMinutes)}
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

        {dashboardSections}
      </ScrollView>
    </SafeAreaView>
  );
}
