import AsyncStorage from '@react-native-async-storage/async-storage';

import { DashboardSectionKey, UserSettings, WeekStartDay } from '../types';
import {
  DAILY_GOAL_MINUTES,
  MONTHLY_GOAL_MINUTES,
  WEEKLY_GOAL_DAYS,
  WEEKLY_GOAL_MINUTES,
} from '../constants/goals';

const SETTINGS_STORAGE_KEY = 'walking-tracker/settings-v1';

export const DEFAULT_DASHBOARD_ORDER: DashboardSectionKey[] = [
  'insights',
  'weeklyRhythm',
  'weeklyTrend',
  'heatmap',
];

export const defaultSettings: UserSettings = {
  weekStart: 'monday',
  dailyGoalMinutes: DAILY_GOAL_MINUTES,
  weeklyGoalDays: WEEKLY_GOAL_DAYS,
  weeklyGoalMinutes: WEEKLY_GOAL_MINUTES,
  monthlyGoalMinutes: MONTHLY_GOAL_MINUTES,
  hapticsEnabled: true,
  goalReminderEnabled: true,
  timelineStartHour: 6,
  timelineEndHour: 0,
  dashboardOrder: DEFAULT_DASHBOARD_ORDER,
  hiddenDashboardSections: [],
};

const normalizeWeekStart = (value: unknown): WeekStartDay =>
  value === 'sunday' ? 'sunday' : 'monday';

const normalizeHour = (value: unknown, fallback: number) => {
  if (typeof value !== 'number' || Number.isNaN(value)) {
    return fallback;
  }

  const rounded = Math.round(value);
  return ((rounded % 24) + 24) % 24;
};

const normalizeDashboardOrder = (value: unknown): DashboardSectionKey[] => {
  const seen = new Set<DashboardSectionKey>();
  const safeOrder = Array.isArray(value)
    ? value.filter((item): item is DashboardSectionKey =>
        item === 'insights' || item === 'weeklyRhythm' || item === 'weeklyTrend' || item === 'heatmap',
      )
    : [];

  const normalized = [...safeOrder, ...DEFAULT_DASHBOARD_ORDER].filter((item) => {
    if (seen.has(item)) {
      return false;
    }

    seen.add(item);
    return true;
  });

  return normalized;
};

const normalizeHiddenDashboardSections = (value: unknown): DashboardSectionKey[] => {
  const safeValues = Array.isArray(value)
    ? value.filter((item): item is DashboardSectionKey =>
        item === 'insights' || item === 'weeklyRhythm' || item === 'weeklyTrend' || item === 'heatmap',
      )
    : [];

  return [...new Set(safeValues)];
};

const normalizeSettings = (value: Partial<UserSettings> | null | undefined): UserSettings => ({
  weekStart: normalizeWeekStart(value?.weekStart),
  dailyGoalMinutes:
    typeof value?.dailyGoalMinutes === 'number' && value.dailyGoalMinutes >= 5
      ? Math.round(value.dailyGoalMinutes)
      : defaultSettings.dailyGoalMinutes,
  weeklyGoalDays:
    typeof value?.weeklyGoalDays === 'number' && value.weeklyGoalDays >= 1 && value.weeklyGoalDays <= 7
      ? Math.round(value.weeklyGoalDays)
      : defaultSettings.weeklyGoalDays,
  weeklyGoalMinutes:
    typeof value?.weeklyGoalMinutes === 'number' && value.weeklyGoalMinutes >= 30
      ? Math.round(value.weeklyGoalMinutes)
      : defaultSettings.weeklyGoalMinutes,
  monthlyGoalMinutes:
    typeof value?.monthlyGoalMinutes === 'number' && value.monthlyGoalMinutes >= 60
      ? Math.round(value.monthlyGoalMinutes)
      : defaultSettings.monthlyGoalMinutes,
  hapticsEnabled: typeof value?.hapticsEnabled === 'boolean' ? value.hapticsEnabled : defaultSettings.hapticsEnabled,
  goalReminderEnabled:
    typeof value?.goalReminderEnabled === 'boolean'
      ? value.goalReminderEnabled
      : defaultSettings.goalReminderEnabled,
  timelineStartHour: normalizeHour(value?.timelineStartHour, defaultSettings.timelineStartHour),
  timelineEndHour: normalizeHour(value?.timelineEndHour, defaultSettings.timelineEndHour),
  dashboardOrder: normalizeDashboardOrder(value?.dashboardOrder),
  hiddenDashboardSections: normalizeHiddenDashboardSections(value?.hiddenDashboardSections),
});

export async function loadSettings(): Promise<UserSettings> {
  const raw = await AsyncStorage.getItem(SETTINGS_STORAGE_KEY);

  if (!raw) {
    return defaultSettings;
  }

  try {
    const parsed = JSON.parse(raw) as Partial<UserSettings>;
    return normalizeSettings(parsed);
  } catch {
    return defaultSettings;
  }
}

export async function saveSettings(nextSettings: UserSettings): Promise<UserSettings> {
  const normalizedSettings = normalizeSettings(nextSettings);
  await AsyncStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(normalizedSettings));
  return normalizedSettings;
}
