import { UserSettings, WalkingEntry, WalkingSession } from '../types';

export type AppDataSnapshot = {
  version: 1;
  exportedAt: string;
  entries: WalkingEntry[];
  settings: UserSettings;
};

const isObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null;

const isWalkingSession = (value: unknown): value is WalkingSession =>
  isObject(value) &&
  typeof value.id === 'string' &&
  typeof value.date === 'string' &&
  typeof value.minutes === 'number' &&
  typeof value.createdAt === 'string' &&
  (value.batchId === undefined || typeof value.batchId === 'string');

const isWalkingEntry = (value: unknown): value is WalkingEntry =>
  isObject(value) &&
  typeof value.id === 'string' &&
  typeof value.date === 'string' &&
  typeof value.totalMinutes === 'number' &&
  typeof value.createdAt === 'string' &&
  Array.isArray(value.sessions) &&
  value.sessions.every(isWalkingSession);

const isUserSettings = (value: unknown): value is UserSettings =>
  isObject(value) &&
  (value.weekStart === 'sunday' || value.weekStart === 'monday') &&
  typeof value.dailyGoalMinutes === 'number' &&
  (value.dailyGoalHistory === undefined || Array.isArray(value.dailyGoalHistory)) &&
  typeof value.weeklyGoalDays === 'number' &&
  typeof value.weeklyGoalMinutes === 'number' &&
  typeof value.monthlyGoalMinutes === 'number' &&
  typeof value.hapticsEnabled === 'boolean' &&
  typeof value.goalReminderEnabled === 'boolean' &&
  typeof value.timelineStartHour === 'number' &&
  typeof value.timelineEndHour === 'number' &&
  Array.isArray(value.dashboardOrder) &&
  Array.isArray(value.hiddenDashboardSections);

export const buildAppDataSnapshot = (entries: WalkingEntry[], settings: UserSettings): AppDataSnapshot => ({
  version: 1,
  exportedAt: new Date().toISOString(),
  entries,
  settings,
});

export const parseAppDataSnapshot = (rawValue: string): AppDataSnapshot => {
  const parsedValue = JSON.parse(rawValue) as unknown;

  if (!isObject(parsedValue)) {
    throw new Error('The selected file is not valid JSON data.');
  }

  if (parsedValue.version !== 1) {
    throw new Error('This backup version is not supported.');
  }

  if (!Array.isArray(parsedValue.entries) || !parsedValue.entries.every(isWalkingEntry)) {
    throw new Error('The backup file contains invalid walking entries.');
  }

  if (!isUserSettings(parsedValue.settings)) {
    throw new Error('The backup file contains invalid settings.');
  }

  return {
    version: 1,
    exportedAt:
      typeof parsedValue.exportedAt === 'string' ? parsedValue.exportedAt : new Date().toISOString(),
    entries: parsedValue.entries,
    settings: parsedValue.settings,
  };
};