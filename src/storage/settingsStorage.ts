import AsyncStorage from '@react-native-async-storage/async-storage';

import { DailyGoalHistoryEntry, DashboardSectionKey, UserSettings, WeekStartDay } from '../types';
import { GOAL_HISTORY_BASE_DATE } from '../utils/dailyGoals';
import {
  DAILY_GOAL_MINUTES,
  MONTHLY_GOAL_MINUTES,
  WEEKLY_GOAL_DAYS,
  WEEKLY_GOAL_MINUTES,
} from '../constants/goals';

const SETTINGS_STORAGE_KEY = 'walking-tracker/settings-v1';

// Increment this whenever a new field is added to UserSettings.
// Add a corresponding migration step in migrateSettings() below.
const CURRENT_SCHEMA_VERSION = 1;

export const DEFAULT_DASHBOARD_ORDER: DashboardSectionKey[] = [
  'insights',
  'weeklyRhythm',
  'weeklyTrend',
  'heatmap',
];

export const defaultSettings: UserSettings = {
  schemaVersion: CURRENT_SCHEMA_VERSION,
  weekStart: 'monday',
  dailyGoalMinutes: DAILY_GOAL_MINUTES,
  dailyGoalHistory: [{ date: GOAL_HISTORY_BASE_DATE, minutes: DAILY_GOAL_MINUTES }],
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

const normalizeDailyGoalHistory = (value: unknown, fallbackMinutes: number): DailyGoalHistoryEntry[] => {
  const safeValues = Array.isArray(value)
    ? value.filter((item): item is DailyGoalHistoryEntry =>
        typeof item === 'object' &&
        item !== null &&
        typeof item.date === 'string' &&
        typeof item.minutes === 'number' &&
        item.minutes >= 5,
      )
    : [];

  const entriesByDate = safeValues.reduce<Map<string, DailyGoalHistoryEntry>>((accumulator, item) => {
    accumulator.set(item.date, {
      date: item.date,
      minutes: Math.round(item.minutes),
    });
    return accumulator;
  }, new Map());

  if (!entriesByDate.has(GOAL_HISTORY_BASE_DATE)) {
    entriesByDate.set(GOAL_HISTORY_BASE_DATE, {
      date: GOAL_HISTORY_BASE_DATE,
      minutes: fallbackMinutes,
    });
  }

  return [...entriesByDate.values()].sort((left, right) => left.date.localeCompare(right.date));
};

const normalizeSettings = (value: Partial<UserSettings> | null | undefined): UserSettings => ({
  schemaVersion: CURRENT_SCHEMA_VERSION,
  dailyGoalMinutes:
    typeof value?.dailyGoalMinutes === 'number' && value.dailyGoalMinutes >= 5
      ? Math.round(value.dailyGoalMinutes)
      : defaultSettings.dailyGoalMinutes,
  weekStart: normalizeWeekStart(value?.weekStart),
  dailyGoalHistory: normalizeDailyGoalHistory(
    value?.dailyGoalHistory,
    typeof value?.dailyGoalMinutes === 'number' && value.dailyGoalMinutes >= 5
      ? Math.round(value.dailyGoalMinutes)
      : defaultSettings.dailyGoalMinutes,
  ),
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

/**
 * Apply incremental migrations for stored settings that are behind the current schema version.
 * Add a new `case` block here whenever CURRENT_SCHEMA_VERSION is bumped.
 * Each case should mutate `data` in-place and fall through to the next version.
 */
const migrateSettings = (data: Record<string, unknown>): Record<string, unknown> => {
  const storedVersion = typeof data.schemaVersion === 'number' ? data.schemaVersion : 0;

  // Versions are applied sequentially so each migration only needs to handle one step.
  // Example for a future version 2:
  //   case 1:
  //     data.newField = defaultValue;
  //     // falls through to case 2, 3, etc.
  switch (storedVersion) {
    case 0:
      // v0 → v1: schemaVersion field did not exist; normalizeSettings will set it.
      break;
    default:
      break;
  }

  return data;
};

export async function loadSettings(): Promise<UserSettings> {
  const raw = await AsyncStorage.getItem(SETTINGS_STORAGE_KEY);

  if (!raw) {
    return defaultSettings;
  }

  try {
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    const migrated = migrateSettings(parsed);
    return normalizeSettings(migrated as Partial<UserSettings>);
  } catch {
    return defaultSettings;
  }
}

export async function saveSettings(nextSettings: UserSettings): Promise<UserSettings> {
  const normalizedSettings = normalizeSettings(nextSettings);
  await AsyncStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(normalizedSettings));
  return normalizedSettings;
}
