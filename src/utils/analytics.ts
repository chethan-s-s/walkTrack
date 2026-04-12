import { WalkingEntry } from '../types';
import { getDateKey } from '../storage/walkingStorage';

export const getWeeklyGoalHitCount = (entries: WalkingEntry[], dailyGoalMinutes: number) => {
  const today = new Date();
  const start = new Date(today);
  start.setDate(today.getDate() - 6);
  const startKey = getDateKey(start);
  const endKey = getDateKey(today);

  return entries.filter(
    (entry) => entry.date >= startKey && entry.date <= endKey && entry.totalMinutes >= dailyGoalMinutes,
  ).length;
};

export const getBestDay = (entries: WalkingEntry[]) =>
  [...entries].sort((left, right) => right.totalMinutes - left.totalMinutes)[0];

export const getAverageSessionLength = (entries: WalkingEntry[]) => {
  const allSessions = entries.flatMap((entry) => entry.sessions);

  if (!allSessions.length) {
    return 0;
  }

  return Math.round(allSessions.reduce((total, session) => total + session.minutes, 0) / allSessions.length);
};

export const getTotalMinutesThisMonth = (entries: WalkingEntry[], date = new Date()) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const monthPrefix = `${year}-${month}`;

  return entries
    .filter((entry) => entry.date.startsWith(monthPrefix))
    .reduce((total, entry) => total + entry.totalMinutes, 0);
};

export const getWeeklyTrend = (entries: WalkingEntry[]) => {
  const today = new Date();
  const thisWeekStart = new Date(today);
  thisWeekStart.setDate(today.getDate() - 6);
  const previousWeekStart = new Date(today);
  previousWeekStart.setDate(today.getDate() - 13);
  const previousWeekEnd = new Date(today);
  previousWeekEnd.setDate(today.getDate() - 7);

  const thisWeekTotal = entries.reduce((total, entry) => {
    if (entry.date >= getDateKey(thisWeekStart) && entry.date <= getDateKey(today)) {
      return total + entry.totalMinutes;
    }

    return total;
  }, 0);

  const previousWeekTotal = entries.reduce((total, entry) => {
    if (entry.date >= getDateKey(previousWeekStart) && entry.date <= getDateKey(previousWeekEnd)) {
      return total + entry.totalMinutes;
    }

    return total;
  }, 0);

  const delta = thisWeekTotal - previousWeekTotal;
  const percent = previousWeekTotal > 0 ? Math.round((delta / previousWeekTotal) * 100) : 100;

  return {
    thisWeekTotal,
    previousWeekTotal,
    delta,
    percent,
    improving: delta >= 0,
  };
};

export const getHeatmapDays = (entries: WalkingEntry[], totalDays = 35) => {
  const entryMap = new Map(entries.map((entry) => [entry.date, entry.totalMinutes]));

  return Array.from({ length: totalDays }, (_, index) => {
    const date = new Date();
    date.setDate(date.getDate() - (totalDays - 1 - index));
    const key = getDateKey(date);

    return {
      key,
      label: date.toLocaleDateString('en-US', { weekday: 'narrow' }),
      minutes: entryMap.get(key) ?? 0,
    };
  });
};

export const getFilteredHistoryEntries = (
  entries: WalkingEntry[],
  filter: 'all' | 'week' | 'month' | 'longest',
  query: string,
) => {
  const trimmedQuery = query.trim().toLowerCase();
  const today = new Date();
  const weekStart = new Date(today);
  weekStart.setDate(today.getDate() - 6);
  const monthPrefix = getDateKey(today).slice(0, 7);

  let nextEntries = [...entries];

  if (filter === 'week') {
    const startKey = getDateKey(weekStart);
    const endKey = getDateKey(today);
    nextEntries = nextEntries.filter((entry) => entry.date >= startKey && entry.date <= endKey);
  }

  if (filter === 'month') {
    nextEntries = nextEntries.filter((entry) => entry.date.startsWith(monthPrefix));
  }

  if (filter === 'longest') {
    nextEntries = nextEntries.sort((left, right) => right.totalMinutes - left.totalMinutes);
  } else {
    nextEntries = nextEntries.sort((left, right) => right.date.localeCompare(left.date));
  }

  if (!trimmedQuery) {
    return nextEntries;
  }

  return nextEntries.filter((entry) => {
    const formattedDate = new Date(entry.date).toLocaleDateString('en-US').toLowerCase();
    return entry.date.includes(trimmedQuery) || formattedDate.includes(trimmedQuery);
  });
};
