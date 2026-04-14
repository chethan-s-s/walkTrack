import { UserSettings } from '../types';

export const GOAL_HISTORY_BASE_DATE = '1970-01-01';

export const getDailyGoalMinutesForDate = (settings: UserSettings, dateKey: string) => {
  const goalEntry = settings.dailyGoalHistory
    .filter((entry) => entry.date <= dateKey)
    .sort((left, right) => right.date.localeCompare(left.date))[0];

  return goalEntry?.minutes ?? settings.dailyGoalMinutes;
};