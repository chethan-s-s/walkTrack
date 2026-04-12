import AsyncStorage from '@react-native-async-storage/async-storage';

import { WalkingEntry, WalkingSession } from '../types';

const STORAGE_KEY = 'walking-tracker/entries-v1';

type LegacyWalkingEntry = {
  id: string;
  date: string;
  minutes: number;
  createdAt: string;
};

const sortSessions = (sessions: WalkingSession[]) =>
  [...sessions].sort((left, right) => right.createdAt.localeCompare(left.createdAt));

const sortEntries = (entries: WalkingEntry[]) =>
  [...entries].sort((left, right) => {
    if (left.date === right.date) {
      return right.createdAt.localeCompare(left.createdAt);
    }

    return right.date.localeCompare(left.date);
  });

export const getDateKey = (date = new Date()) => {
  const timezoneOffset = date.getTimezoneOffset() * 60_000;
  return new Date(date.getTime() - timezoneOffset).toISOString().slice(0, 10);
};

const getTimestampForDate = (dateKey: string, hour?: number, minute?: number) => {
  const currentDate = new Date();
  const [year, month, day] = dateKey.split('-').map(Number);
  const targetHour = hour ?? currentDate.getHours();
  const targetMinute = minute ?? (hour === undefined ? currentDate.getMinutes() : 0);
  const timestamp = new Date(
    year,
    month - 1,
    day,
    targetHour,
    targetMinute,
    currentDate.getSeconds(),
    currentDate.getMilliseconds(),
  );

  return timestamp.toISOString();
};

const normalizeEntry = (entry: WalkingEntry | LegacyWalkingEntry): WalkingEntry => {
  if ('sessions' in entry && Array.isArray(entry.sessions)) {
    const sessions = sortSessions(entry.sessions);
    return {
      id: entry.id,
      date: entry.date,
      totalMinutes: entry.totalMinutes ?? sessions.reduce((total, session) => total + session.minutes, 0),
      createdAt: sessions[0]?.createdAt ?? entry.createdAt,
      sessions,
    };
  }

  const legacyEntry = entry as LegacyWalkingEntry;

  const session: WalkingSession = {
    id: legacyEntry.id,
    batchId: legacyEntry.id,
    date: legacyEntry.date,
    minutes: legacyEntry.minutes,
    createdAt: legacyEntry.createdAt,
  };

  return {
    id: legacyEntry.date,
    date: legacyEntry.date,
    totalMinutes: legacyEntry.minutes,
    createdAt: legacyEntry.createdAt,
    sessions: [session],
  };
};

const buildEntry = (date: string, sessions: WalkingSession[]): WalkingEntry => {
  const sortedSessions = sortSessions(sessions);

  return {
    id: date,
    date,
    totalMinutes: sortedSessions.reduce((total, session) => total + session.minutes, 0),
    createdAt: sortedSessions[0]?.createdAt ?? new Date().toISOString(),
    sessions: sortedSessions,
  };
};

export async function loadEntries(): Promise<WalkingEntry[]> {
  const raw = await AsyncStorage.getItem(STORAGE_KEY);

  if (!raw) {
    return [];
  }

  try {
    const parsed = JSON.parse(raw) as Array<WalkingEntry | LegacyWalkingEntry>;
    return sortEntries(parsed.map(normalizeEntry));
  } catch {
    return [];
  }
}

export async function appendEntry(
  date: string,
  minutes: number,
  hour?: number,
  minute?: number,
  batchId?: string,
): Promise<WalkingEntry[]> {
  const entries = await loadEntries();
  const existingEntry = entries.find((entry) => entry.date === date);
  const createdAt = getTimestampForDate(date, hour, minute);
  const nextSession: WalkingSession = {
    id: `${createdAt}-${Math.random().toString(36).slice(2, 8)}`,
    batchId,
    date,
    minutes,
    createdAt,
  };
  const nextSessions = sortSessions([...(existingEntry?.sessions ?? []), nextSession]);

  const nextEntry: WalkingEntry = {
    id: existingEntry?.id ?? date,
    date,
    totalMinutes: nextSessions.reduce((total, session) => total + session.minutes, 0),
    createdAt: nextSessions[0]?.createdAt ?? createdAt,
    sessions: nextSessions,
  };

  const nextEntries = sortEntries([
    ...entries.filter((entry) => entry.date !== date),
    nextEntry,
  ]);

  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(nextEntries));
  return nextEntries;
}

export async function deleteSession(
  date: string,
  sessionId: string,
  batchId?: string,
): Promise<WalkingEntry[]> {
  const entries = await loadEntries();
  const existingEntry = entries.find((entry) => entry.date === date);

  if (!existingEntry) {
    return entries;
  }

  const remainingSessions = existingEntry.sessions.filter((session) => {
    if (batchId) {
      return session.batchId !== batchId;
    }

    return session.id !== sessionId;
  });

  const nextEntries = remainingSessions.length
    ? sortEntries([
        ...entries.filter((entry) => entry.date !== date),
        {
          ...existingEntry,
          totalMinutes: remainingSessions.reduce((total, session) => total + session.minutes, 0),
          createdAt: remainingSessions[0]?.createdAt ?? existingEntry.createdAt,
          sessions: sortSessions(remainingSessions),
        },
      ])
    : sortEntries(entries.filter((entry) => entry.date !== date));

  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(nextEntries));
  return nextEntries;
}

export async function restoreSessions(sessions: WalkingSession[]): Promise<WalkingEntry[]> {
  if (!sessions.length) {
    return loadEntries();
  }

  const entries = await loadEntries();
  const groupedSessions = sessions.reduce<Record<string, WalkingSession[]>>((accumulator, session) => {
    accumulator[session.date] = [...(accumulator[session.date] ?? []), session];
    return accumulator;
  }, {});

  let nextEntries = [...entries];

  Object.entries(groupedSessions).forEach(([date, dateSessions]) => {
    const existingEntry = nextEntries.find((entry) => entry.date === date);
    const restoredEntry = buildEntry(date, [...(existingEntry?.sessions ?? []), ...dateSessions]);

    nextEntries = [
      ...nextEntries.filter((entry) => entry.date !== date),
      restoredEntry,
    ];
  });

  const sortedEntries = sortEntries(nextEntries);
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(sortedEntries));
  return sortedEntries;
}

export async function updateStoredSession(
  date: string,
  sessionId: string,
  nextDate: string,
  minutes: number,
  hour: number,
  minute?: number,
): Promise<WalkingEntry[]> {
  const entries = await loadEntries();
  const existingEntry = entries.find((entry) => entry.date === date);

  if (!existingEntry) {
    return entries;
  }

  const targetSession = existingEntry.sessions.find((session) => session.id === sessionId);

  if (!targetSession) {
    return entries;
  }

  const remainingSourceSessions = existingEntry.sessions.filter((session) => session.id !== sessionId);
  const nextSession: WalkingSession = {
    ...targetSession,
    date: nextDate,
    minutes,
    createdAt: getTimestampForDate(nextDate, hour, minute),
  };

  let nextEntries = entries.filter((entry) => entry.date !== date && entry.date !== nextDate);

  if (date === nextDate) {
    const rebuiltSessions = [...remainingSourceSessions, nextSession];

    if (rebuiltSessions.length) {
      nextEntries.push(buildEntry(date, rebuiltSessions));
    }
  } else {
    if (remainingSourceSessions.length) {
      nextEntries.push(buildEntry(date, remainingSourceSessions));
    }

    const targetEntry = entries.find((entry) => entry.date === nextDate);
    nextEntries.push(buildEntry(nextDate, [...(targetEntry?.sessions ?? []), nextSession]));
  }

  const sortedEntries = sortEntries(nextEntries);
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(sortedEntries));
  return sortedEntries;
}
