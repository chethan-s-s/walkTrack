import { WalkingSession } from '../types';
import { getSessionGroupId } from './sessionGroups';
import { getDateKey } from '../storage/walkingStorage';

export type TimeSegment = {
  dayOffset: number;
  hour: number;
  minute: number;
  minutes: number;
};

export const normalizeHour = (hour: number) => ((hour % 24) + 24) % 24;
export const normalizeMinute = (minute: number) => ((minute % 60) + 60) % 60;

export const getYesterdayDate = (date = new Date()) => {
  const yesterday = new Date(date);
  yesterday.setDate(yesterday.getDate() - 1);
  return yesterday;
};

export const parseDateKey = (value: string) => {
  const [year, month, day] = value.split('-').map(Number);
  return new Date(year, month - 1, day);
};

export const formatHourLabel = (hour: number) => {
  if (hour === 0) {
    return '12 AM';
  }

  if (hour < 12) {
    return `${hour} AM`;
  }

  if (hour === 12) {
    return '12 PM';
  }

  return `${hour - 12} PM`;
};

export const formatClockTime = (date: Date) =>
  date.toLocaleTimeString([], {
    hour: 'numeric',
    minute: '2-digit',
  });

export const formatSessionTime = (createdAt: string) =>
  new Date(createdAt).toLocaleTimeString([], {
    hour: 'numeric',
    minute: '2-digit',
  });

export const formatTimeLabel = (hour: number, minute: number) => {
  const suffix = hour >= 12 ? 'PM' : 'AM';
  const normalizedHour = hour % 12 === 0 ? 12 : hour % 12;
  return `${normalizedHour}:${String(normalizeMinute(minute)).padStart(2, '0')} ${suffix}`;
};

export const formatSessionTimeRange = (createdAt: string, durationMinutes: number) => {
  const start = new Date(createdAt);
  const end = new Date(start.getTime() + durationMinutes * 60_000);

  return `${formatClockTime(start)} - ${formatClockTime(end)}`;
};

export const formatReadableDate = (date: Date) => {
  const todayKey = getDateKey();
  const dateKey = getDateKey(date);

  if (dateKey === todayKey) {
    return 'Today';
  }

  if (dateKey === getDateKey(getYesterdayDate())) {
    return 'Yesterday';
  }

  return date.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'short',
    day: 'numeric',
  });
};

export const formatHistoryDate = (value: string) => {
  if (value === getDateKey()) {
    return 'Today';
  }

  if (value === getDateKey(getYesterdayDate())) {
    return 'Yesterday';
  }

  return parseDateKey(value).toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
};

export const formatEntryDate = (value: string) =>
  parseDateKey(value).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  });

export const formatDashboardDate = (date: Date) =>
  date.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  });

export const getTimestampForDateTime = (dateKey: string, hour: number, minute: number, dayOffset = 0) => {
  const [year, month, day] = dateKey.split('-').map(Number);
  return new Date(year, month - 1, day + dayOffset, normalizeHour(hour), normalizeMinute(minute), 0, 0);
};

export const formatDateKeyTimeRange = (dateKey: string, hour: number, minute: number, durationMinutes: number) => {
  const start = getTimestampForDateTime(dateKey, hour, minute);
  const end = new Date(start.getTime() + durationMinutes * 60_000);

  return `${formatClockTime(start)} - ${formatClockTime(end)}`;
};

export const buildSessionSegments = (totalMinutes: number, startingHour: number, startingMinute: number) => {
  const segments: TimeSegment[] = [];
  let remainingMinutes = totalMinutes;
  let currentHour = normalizeHour(startingHour);
  let currentMinute = normalizeMinute(startingMinute);
  let dayOffset = 0;

  while (remainingMinutes > 0) {
    const availableMinutes = segments.length === 0 ? 60 - currentMinute : 60;
    const segmentMinutes = Math.min(remainingMinutes, availableMinutes);
    segments.push({ dayOffset, hour: currentHour, minute: currentMinute, minutes: segmentMinutes });
    remainingMinutes -= segmentMinutes;
    if (currentHour === 23) {
      dayOffset += 1;
    }

    currentHour = normalizeHour(currentHour + 1);
    currentMinute = 0;
  }

  return segments;
};

export const getTimelineHours = (startHour: number, endHour: number) => {
  const hours: number[] = [];
  let currentHour = normalizeHour(startHour);
  const normalizedEndHour = normalizeHour(endHour);

  for (let index = 0; index < 24; index += 1) {
    hours.push(currentHour);

    if (currentHour === normalizedEndHour) {
      break;
    }

    currentHour = normalizeHour(currentHour + 1);
  }

  return hours;
};

export const getTimelineSpanHours = (startHour: number, endHour: number) =>
  getTimelineHours(startHour, endHour).length;

export const isOvernightTimeline = (startHour: number, endHour: number) => normalizeHour(startHour) > normalizeHour(endHour);

export const getHourRange = (hours: number[], startHour: number, endHour: number) => {
  const startIndex = hours.indexOf(startHour);
  const endIndex = hours.indexOf(endHour);

  if (startIndex === -1 || endIndex === -1) {
    return [] as number[];
  }

  const [rangeStart, rangeEnd] = startIndex <= endIndex ? [startIndex, endIndex] : [endIndex, startIndex];
  return hours.slice(rangeStart, rangeEnd + 1);
};

export const getHoursForMinutes = (minutes: number, startingHour: number, startingMinute: number) =>
  buildSessionSegments(minutes, startingHour, startingMinute).map((segment) => segment.hour);

export const getSuggestedStartMinute = (
  dateKey: string,
  hour: number,
  sessions: WalkingSession[],
  durationMinutes = 30,
  excludedSessionIds: string[] = [],
) => {
  const normalizedHour = normalizeHour(hour);

  for (let minute = 0; minute < 60; minute += 1) {
    const nextSegments = buildSessionSegments(durationMinutes, normalizedHour, minute);
    const firstSegment = nextSegments[0];

    if (!firstSegment || firstSegment.hour !== normalizedHour || firstSegment.minute !== minute) {
      continue;
    }

    if (!doesTimeRangeCollide(dateKey, sessions, nextSegments, excludedSessionIds)) {
      return minute;
    }
  }

  return null;
};

export const doesTimeRangeCollide = (
  dateKey: string,
  sessions: WalkingSession[],
  nextSegments: TimeSegment[],
  excludedSessionIds: string[] = [],
) => {
  const excludedIds = new Set(excludedSessionIds);

  return nextSegments.some((segment) => {
    const nextStart = getTimestampForDateTime(dateKey, segment.hour, segment.minute, segment.dayOffset);
    const nextEnd = new Date(nextStart.getTime() + segment.minutes * 60_000);

    return sessions
      .filter((session) => !excludedIds.has(getSessionGroupId(session)))
      .some((session) => {
        const existingStart = new Date(session.createdAt);
        const existingEnd = new Date(existingStart.getTime() + session.minutes * 60_000);
        return nextStart < existingEnd && nextEnd > existingStart;
      });
  });
};

export const getDefaultTargetHour = (visibleHours: number[]) => {
  const currentHour = new Date().getHours();

  if (visibleHours.includes(currentHour)) {
    return currentHour;
  }

  return visibleHours[0] ?? 6;
};
