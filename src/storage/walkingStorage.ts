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

const getTimestampForDate = (dateKey: string) => {
  const currentDate = new Date();
  const [year, month, day] = dateKey.split('-').map(Number);
  const timestamp = new Date(
    year,
    month - 1,
    day,
    currentDate.getHours(),
    currentDate.getMinutes(),
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

export async function appendEntry(date: string, minutes: number): Promise<WalkingEntry[]> {
  const entries = await loadEntries();
  const existingEntry = entries.find((entry) => entry.date === date);
  const createdAt = getTimestampForDate(date);
  const nextSession: WalkingSession = {
    id: `${createdAt}-${Math.random().toString(36).slice(2, 8)}`,
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
