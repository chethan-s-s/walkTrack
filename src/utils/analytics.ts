import { WalkingEntry, WeekStartDay } from '../types';
import { getDateKey } from '../storage/walkingStorage';

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
  dailyGoalMinutes: number,
  weekStart: WeekStartDay = 'monday',
) => {
  const today = new Date();
  const weekDates = getWeekDates(today, weekStart);
  const startKey = getDateKey(weekDates[0]);
  const endKey = getDateKey(weekDates[weekDates.length - 1]);

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
  filter: 'all' | 'week' | 'month' | 'longest',
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
