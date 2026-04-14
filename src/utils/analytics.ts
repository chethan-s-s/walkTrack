import { UserSettings, WalkingEntry, WeekStartDay } from '../types';
import { getDateKey } from '../storage/walkingStorage';
import { getDailyGoalMinutesForDate } from './dailyGoals';

type TimeOfDayKey = 'morning' | 'afternoon' | 'evening';

const getTimeOfDayKey = (hour: number): TimeOfDayKey => {
  if (hour < 12) {
    return 'morning';
  }

  if (hour < 18) {
    return 'afternoon';
  }

  return 'evening';
};

export const getWeekStartDate = (date = new Date(), weekStart: WeekStartDay = 'monday') => {
  const nextDate = new Date(date);
  nextDate.setHours(0, 0, 0, 0);

  const currentDay = nextDate.getDay();
  const offset = weekStart === 'monday' ? (currentDay === 0 ? 6 : currentDay - 1) : currentDay;
  nextDate.setDate(nextDate.getDate() - offset);

  return nextDate;
};

export const getWeekDates = (date = new Date(), weekStart: WeekStartDay = 'monday') => {
  const weekStartDate = getWeekStartDate(date, weekStart);

  return Array.from({ length: 7 }, (_, index) => {
    const nextDate = new Date(weekStartDate);
    nextDate.setDate(weekStartDate.getDate() + index);
    return nextDate;
  });
};

export const getWeeklyGoalHitCount = (
  entries: WalkingEntry[],
  settings: UserSettings,
  date = new Date(),
  weekStart: WeekStartDay = 'monday',
) => {
  const weekDates = getWeekDates(date, weekStart);
  const startKey = getDateKey(weekDates[0]);
  const endKey = getDateKey(weekDates[weekDates.length - 1]);

  return entries.filter(
    (entry) =>
      entry.date >= startKey &&
      entry.date <= endKey &&
      entry.totalMinutes >= getDailyGoalMinutesForDate(settings, entry.date),
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

export const getWeeklyTrend = (entries: WalkingEntry[], weekStart: WeekStartDay = 'monday') => {
  const today = new Date();
  const thisWeekStart = getWeekStartDate(today, weekStart);
  const previousWeekStart = new Date(thisWeekStart);
  previousWeekStart.setDate(thisWeekStart.getDate() - 7);
  const previousWeekEnd = new Date(thisWeekStart);
  previousWeekEnd.setDate(thisWeekStart.getDate() - 1);
  const thisWeekEnd = new Date(thisWeekStart);
  thisWeekEnd.setDate(thisWeekStart.getDate() + 6);

  const thisWeekTotal = entries.reduce((total, entry) => {
    if (entry.date >= getDateKey(thisWeekStart) && entry.date <= getDateKey(thisWeekEnd)) {
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

export const getMonthlyHeatmapCalendar = (
  entries: WalkingEntry[],
  date = new Date(),
  weekStart: WeekStartDay = 'monday',
) => {
  const entryMap = new Map(entries.map((entry) => [entry.date, entry.totalMinutes]));
  const monthStart = new Date(date.getFullYear(), date.getMonth(), 1);
  const monthEnd = new Date(date.getFullYear(), date.getMonth() + 1, 0);
  const monthLabel = monthStart.toLocaleDateString('en-US', {
    month: 'long',
    year: 'numeric',
  });

  const weekdayLabels = getWeekDates(monthStart, weekStart).map((day) =>
    day.toLocaleDateString('en-US', { weekday: 'short' }).slice(0, 2),
  );

  const startOffset = weekStart === 'monday'
    ? (monthStart.getDay() === 0 ? 6 : monthStart.getDay() - 1)
    : monthStart.getDay();

  const daysInMonth = monthEnd.getDate();
  const totalCells = Math.ceil((startOffset + daysInMonth) / 7) * 7;

  const cells = Array.from({ length: totalCells }, (_, index) => {
    const dayNumber = index - startOffset + 1;

    if (dayNumber < 1 || dayNumber > daysInMonth) {
      return {
        key: `empty-${index}`,
        dayNumber: null,
        minutes: 0,
        isCurrentMonth: false,
        isToday: false,
      };
    }

    const currentDate = new Date(date.getFullYear(), date.getMonth(), dayNumber);
    const key = getDateKey(currentDate);

    return {
      key,
      dayNumber,
      minutes: entryMap.get(key) ?? 0,
      isCurrentMonth: true,
      isToday: key === getDateKey(),
    };
  });

  return {
    monthLabel,
    weekdayLabels,
    cells,
  };
};

export const getFilteredHistoryEntries = (
  entries: WalkingEntry[],
  filter: 'all' | 'week' | 'month' | 'longestSession',
  query: string,
  weekStart: WeekStartDay = 'monday',
) => {
  const trimmedQuery = query.trim().toLowerCase();
  const today = new Date();
  const weekStartDate = getWeekStartDate(today, weekStart);
  const weekEndDate = new Date(weekStartDate);
  weekEndDate.setDate(weekStartDate.getDate() + 6);
  const monthPrefix = getDateKey(today).slice(0, 7);

  let nextEntries = [...entries];

  if (filter === 'week') {
    const startKey = getDateKey(weekStartDate);
    const endKey = getDateKey(weekEndDate);
    nextEntries = nextEntries.filter((entry) => entry.date >= startKey && entry.date <= endKey);
  }

  if (filter === 'month') {
    nextEntries = nextEntries.filter((entry) => entry.date.startsWith(monthPrefix));
  }

  if (filter === 'longestSession') {
    const longestSessionMinutes = Math.max(
      ...nextEntries.flatMap((entry) => entry.sessions.map((session) => session.minutes)),
      0,
    );

    nextEntries = nextEntries
      .filter((entry) => entry.sessions.some((session) => session.minutes === longestSessionMinutes))
      .sort((left, right) => right.date.localeCompare(left.date));
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

export const getCurrentStreak = (entries: WalkingEntry[], settings: UserSettings, date = new Date()) => {
  const entryMap = new Map(entries.map((entry) => [entry.date, entry.totalMinutes]));
  let streak = 0;
  const cursor = new Date(date);

  while ((entryMap.get(getDateKey(cursor)) ?? 0) >= getDailyGoalMinutesForDate(settings, getDateKey(cursor))) {
    streak += 1;
    cursor.setDate(cursor.getDate() - 1);
  }

  return streak;
};

export const getMilestoneBadge = (entries: WalkingEntry[]) => {
  const lifetimeMinutes = entries.reduce((total, entry) => total + entry.totalMinutes, 0);
  const milestones = [
    { minutes: 5000, title: 'Trailblazer', description: 'You’ve walked 5,000+ minutes.' },
    { minutes: 2400, title: 'Momentum', description: 'You’ve crossed 40 hours of walking.' },
    { minutes: 1200, title: 'Steady Walker', description: 'You’ve crossed 20 hours total.' },
    { minutes: 600, title: 'First Milestone', description: 'You’ve crossed 10 hours total.' },
  ];

  return milestones.find((milestone) => lifetimeMinutes >= milestone.minutes) ?? null;
};

export const getLongestStreak = (entries: WalkingEntry[], settings: UserSettings, date = new Date()) => {
  const entryMap = new Map(entries.map((entry) => [entry.date, entry.totalMinutes]));
  const sortedDates = [...entryMap.keys()].sort();

  if (!sortedDates.length) {
    return 0;
  }

  const startDate = new Date(sortedDates[0]);
  const endDate = new Date(date);
  startDate.setHours(0, 0, 0, 0);
  endDate.setHours(0, 0, 0, 0);

  let longest = 0;
  let active = 0;

  for (const cursor = new Date(startDate); cursor <= endDate; cursor.setDate(cursor.getDate() + 1)) {
    const key = getDateKey(cursor);

    if ((entryMap.get(key) ?? 0) >= getDailyGoalMinutesForDate(settings, key)) {
      active += 1;
      longest = Math.max(longest, active);
    } else {
      active = 0;
    }
  }

  return longest;
};

export const getBestWeekday = (entries: WalkingEntry[]) => {
  const totals = new Map<number, number>();

  entries.forEach((entry) => {
    const [year, month, day] = entry.date.split('-').map(Number);
    const weekday = new Date(year, month - 1, day).getDay();
    totals.set(weekday, (totals.get(weekday) ?? 0) + entry.totalMinutes);
  });

  const best = [...totals.entries()].sort((left, right) => right[1] - left[1])[0];

  if (!best) {
    return null;
  }

  const label = new Date(2026, 0, 4 + best[0]).toLocaleDateString('en-US', { weekday: 'long' });

  return {
    label,
    totalMinutes: best[1],
  };
};

export const getAverageDailyMinutes = (entries: WalkingEntry[], days = 7, date = new Date()) => {
  const endDate = new Date(date);
  endDate.setHours(0, 0, 0, 0);
  const entryMap = new Map(entries.map((entry) => [entry.date, entry.totalMinutes]));

  let total = 0;

  for (let index = 0; index < days; index += 1) {
    const cursor = new Date(endDate);
    cursor.setDate(endDate.getDate() - index);
    total += entryMap.get(getDateKey(cursor)) ?? 0;
  }

  return Math.round(total / days);
};

export const getGoalCompletionRate = (
  entries: WalkingEntry[],
  settings: UserSettings,
  scope: 'week' | 'month',
  date = new Date(),
) => {
  const startDate = scope === 'week' ? getWeekStartDate(date, settings.weekStart) : new Date(date.getFullYear(), date.getMonth(), 1);
  const endDate = scope === 'week' ? new Date(startDate.getFullYear(), startDate.getMonth(), startDate.getDate() + 6) : new Date(date.getFullYear(), date.getMonth() + 1, 0);
  const entryMap = new Map(entries.map((entry) => [entry.date, entry.totalMinutes]));

  let completedDays = 0;
  let totalDays = 0;

  for (const cursor = new Date(startDate); cursor <= endDate; cursor.setDate(cursor.getDate() + 1)) {
    const key = getDateKey(cursor);
    totalDays += 1;

    if ((entryMap.get(key) ?? 0) >= getDailyGoalMinutesForDate(settings, key)) {
      completedDays += 1;
    }
  }

  return {
    completedDays,
    totalDays,
    percent: totalDays ? Math.round((completedDays / totalDays) * 100) : 0,
  };
};

export const getTimeOfDayPattern = (entries: WalkingEntry[]) => {
  const totals: Record<TimeOfDayKey, number> = {
    morning: 0,
    afternoon: 0,
    evening: 0,
  };

  entries.forEach((entry) => {
    entry.sessions.forEach((session) => {
      const hour = new Date(session.createdAt).getHours();
      totals[getTimeOfDayKey(hour)] += session.minutes;
    });
  });

  const labels: Record<TimeOfDayKey, string> = {
    morning: 'Morning',
    afternoon: 'Afternoon',
    evening: 'Evening',
  };

  const buckets = (Object.keys(totals) as TimeOfDayKey[]).map((key) => ({
    key,
    label: labels[key],
    minutes: totals[key],
  }));

  const topBucket = [...buckets].sort((left, right) => right.minutes - left.minutes)[0] ?? buckets[0];

  return {
    topLabel: topBucket?.label ?? 'Morning',
    topMinutes: topBucket?.minutes ?? 0,
    buckets,
  };
};
