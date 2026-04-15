import React, { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  LayoutAnimation,
  Platform,
  ScrollView,
  Text,
  UIManager,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import { useNavigation } from '@react-navigation/native';

import { useWalkingData } from '../../context/WalkingDataContext';
import { getDateKey } from '../../storage/walkingStorage';
import { useAppColors } from '../../theme/useAppColors';
import {
  getAverageDailyMinutes,
  getAverageSessionLength,
  getBestDay,
  getBestWeekday,
  getCurrentStreak,
  getGoalCompletionRate,
  getWeekStartDate,
  getLongestStreak,
  getMilestoneBadge,
  getMonthlyHeatmapCalendar,
  getTimeOfDayPattern,
  getTotalMinutesThisMonth,
  getWeekDates,
  getWeeklyGoalHitCount,
  getWeeklyTrend,
} from '../../utils/analytics';
import { createStyles } from './HomeScreenStyles';
import { useAppSettings } from '../../context/AppSettingsContext';
import { DashboardSectionKey, RootTabParamList } from '../../types';
import { formatDashboardDate } from '../../utils/time';
import GoalsCard from './components/GoalsCard';
import InsightsCard from './components/InsightsCard';
import WeeklyRhythmCard from './components/WeeklyRhythmCard';
import WeeklyTrendCard from './components/WeeklyTrendCard';
import HeatmapCard from './components/HeatmapCard';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

const formatDay = (date: Date) =>
  date.toLocaleDateString('en-US', { weekday: 'short' });

export default function HomeScreen() {
  const navigation = useNavigation<BottomTabNavigationProp<RootTabParamList>>();
  const colors = useAppColors();
  const styles = useMemo(() => createStyles(colors), [colors]);  const { entries, loading, todayMinutes } = useWalkingData();
  const { getDailyGoalMinutesForDate, settings } = useAppSettings();
  const todayKey = getDateKey();
  const currentDailyGoalMinutes = getDailyGoalMinutesForDate(todayKey);
  const currentDateLabel = formatDashboardDate(new Date());
  const [selectedRhythmWeekDate, setSelectedRhythmWeekDate] = useState(() => new Date());
  const [selectedHeatmapMonth, setSelectedHeatmapMonth] = useState(() => {
    const today = new Date();
    return new Date(today.getFullYear(), today.getMonth(), 1);
  });
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
  const weeklyAverage = useMemo(() => getAverageDailyMinutes(entries, 7), [entries]);
  const totalMinutesThisMonth = useMemo(() => getTotalMinutesThisMonth(entries), [entries]);
  const weeklyTrend = useMemo(() => getWeeklyTrend(entries, settings.weekStart), [entries, settings.weekStart]);
  const currentStreak = useMemo(() => getCurrentStreak(entries, settings), [entries, settings]);
  const longestStreak = useMemo(() => getLongestStreak(entries, settings), [entries, settings]);
  const bestWeekday = useMemo(() => getBestWeekday(entries), [entries]);
  const weeklyConsistency = useMemo(() => getGoalCompletionRate(entries, settings, 'week'), [entries, settings]);
  const monthlyConsistency = useMemo(() => getGoalCompletionRate(entries, settings, 'month'), [entries, settings]);
  const timeOfDayPattern = useMemo(() => getTimeOfDayPattern(entries), [entries]);
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
  const currentWeekMinutes = useMemo(() => {
    const weekKeys = new Set(getWeekDates(new Date(), settings.weekStart).map((date) => getDateKey(date)));
    return entries.reduce((total, entry) => total + (weekKeys.has(entry.date) ? entry.totalMinutes : 0), 0);
  }, [entries, settings.weekStart]);

  const changeHeatmapMonth = (direction: -1 | 1) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setSelectedHeatmapMonth((currentMonth) => {
      const nextMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + direction, 1);

      if (direction === 1 && nextMonth > currentMonthStart) {
        return currentMonth;
      }

      return nextMonth;
    });
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
        <InsightsCard
          averageSessionLength={averageSessionLength}
          bestDay={bestDay}
          bestWeekday={bestWeekday}
          currentWeekMinutes={currentWeekMinutes}
          longestStreak={longestStreak}
          monthlyConsistency={monthlyConsistency}
          monthlyGoalMinutes={settings.monthlyGoalMinutes}
          timeOfDayPattern={timeOfDayPattern}
          totalMinutesThisMonth={totalMinutesThisMonth}
          weeklyAverage={weeklyAverage}
          weeklyConsistency={weeklyConsistency}
          weeklyGoalMinutes={settings.weeklyGoalMinutes}
        />
      ),
      weeklyRhythm: (
        <WeeklyRhythmCard
          canGoToNextRhythmWeek={canGoToNextRhythmWeek}
          maxMinutes={maxMinutes}
          onChangeRhythmWeek={changeRhythmWeek}
          rhythmWeekLabel={rhythmWeekLabel}
          selectedWeekMinutes={selectedWeekMinutes}
          weeklyBars={weeklyBars}
        />
      ),
      weeklyTrend: (
        <WeeklyTrendCard
          currentDailyGoalMinutes={currentDailyGoalMinutes}
          weeklyTrend={weeklyTrend}
        />
      ),
      heatmap: (
        <HeatmapCard
          canGoToNextHeatmapMonth={canGoToNextHeatmapMonth}
          heatmapCalendar={heatmapCalendar}
          heatmapMaxMinutes={heatmapMaxMinutes}
          onChangeHeatmapMonth={changeHeatmapMonth}
          onNavigateToDate={(dateKey) => navigation.navigate('Add', { targetDateKey: dateKey })}
          todayKey={todayKey}
        />
      ),
    };

    return settings.dashboardOrder
      .filter((section) => !hiddenSections.has(section))
      .map((section) => <React.Fragment key={section}>{sectionMap[section]}</React.Fragment>);
  }, [
    averageSessionLength,
    bestDay,
    bestWeekday,
    canGoToNextRhythmWeek,
    currentWeekMinutes,
    changeRhythmWeek,
    currentStreak,
    currentDailyGoalMinutes,
    heatmapCalendar,
    heatmapMaxMinutes,
    longestStreak,
    milestoneBadge,
    maxMinutes,
    monthlyConsistency,
    navigation,
    settings.dashboardOrder,
    settings.hiddenDashboardSections,
    settings.monthlyGoalMinutes,
    settings.weeklyGoalMinutes,
    canGoToNextHeatmapMonth,
    rhythmWeekLabel,
    selectedWeekMinutes,
    timeOfDayPattern,
    totalMinutesThisMonth,
    weeklyAverage,
    weeklyBars,
    weeklyConsistency,
    weeklyGoalHits,
    weeklyTrend,
    todayKey,
    changeHeatmapMonth,
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

        <GoalsCard
          currentDailyGoalMinutes={currentDailyGoalMinutes}
          currentStreak={currentStreak}
          goalReminderEnabled={settings.goalReminderEnabled}
          isGoalReached={isGoalReached}
          milestoneBadge={milestoneBadge}
          remainingGoalMinutes={remainingGoalMinutes}
          todayMinutes={todayMinutes}
          weeklyGoalDays={settings.weeklyGoalDays}
          weeklyGoalHits={weeklyGoalHits}
        />

        {dashboardSections}
      </ScrollView>
    </SafeAreaView>
  );
}