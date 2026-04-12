import React, {
  createContext,
  PropsWithChildren,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';

import {
  appendEntry,
  deleteSession,
  getDateKey,
  loadEntries,
  restoreSessions,
  updateStoredSession,
} from '../storage/walkingStorage';
import { WalkingEntry, WalkingSession } from '../types';

type WalkingDataContextValue = {
  entries: WalkingEntry[];
  loading: boolean;
  weeklyMinutes: number;
  todayMinutes: number;
  averageMinutes: number;
  saveWalkingSession: (date: string, minutes: number, hour?: number, batchId?: string) => Promise<void>;
  deleteWalkingSession: (date: string, session: WalkingSession) => Promise<void>;
  restoreWalkingSessions: (sessions: WalkingSession[]) => Promise<void>;
  updateWalkingSession: (date: string, sessionId: string, nextDate: string, minutes: number, hour: number) => Promise<void>;
  getEntryForDate: (date: string) => WalkingEntry | undefined;
};

const WalkingDataContext = createContext<WalkingDataContextValue | undefined>(undefined);

export function WalkingDataProvider({ children }: PropsWithChildren) {
  const [entries, setEntries] = useState<WalkingEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function hydrate() {
      const storedEntries = await loadEntries();
      setEntries(storedEntries);
      setLoading(false);
    }

    hydrate();
  }, []);

  const saveWalkingSession = useCallback(async (date: string, minutes: number, hour?: number, batchId?: string) => {
    const nextEntries = await appendEntry(date, minutes, hour, batchId);
    setEntries(nextEntries);
  }, []);

  const deleteWalkingSession = useCallback(async (date: string, session: WalkingSession) => {
    const nextEntries = await deleteSession(date, session.id, session.batchId);
    setEntries(nextEntries);
  }, []);

  const restoreWalkingSessions = useCallback(async (sessions: WalkingSession[]) => {
    const nextEntries = await restoreSessions(sessions);
    setEntries(nextEntries);
  }, []);

  const updateWalkingSession = useCallback(
    async (date: string, sessionId: string, nextDate: string, minutes: number, hour: number) => {
      const nextEntries = await updateStoredSession(date, sessionId, nextDate, minutes, hour);
      setEntries(nextEntries);
    },
    [],
  );

  const getEntryForDate = useCallback(
    (date: string) => entries.find((entry) => entry.date === date),
    [entries],
  );

  const weeklyMinutes = useMemo(() => {
    const today = new Date();
    const sevenDaysAgo = new Date(today);
    sevenDaysAgo.setDate(today.getDate() - 6);

    return entries.reduce((total, entry) => {
      if (entry.date >= getDateKey(sevenDaysAgo) && entry.date <= getDateKey(today)) {
        return total + entry.totalMinutes;
      }

      return total;
    }, 0);
  }, [entries]);

  const todayMinutes = useMemo(() => getEntryForDate(getDateKey())?.totalMinutes ?? 0, [getEntryForDate]);

  const averageMinutes = useMemo(() => {
    if (!entries.length) {
      return 0;
    }

    return Math.round(entries.reduce((total, entry) => total + entry.totalMinutes, 0) / entries.length);
  }, [entries]);

  const value = useMemo(
    () => ({
      entries,
      loading,
      weeklyMinutes,
      todayMinutes,
      averageMinutes,
      deleteWalkingSession,
      saveWalkingSession,
      restoreWalkingSessions,
      updateWalkingSession,
      getEntryForDate,
    }),
    [
      averageMinutes,
      deleteWalkingSession,
      entries,
      getEntryForDate,
      loading,
      restoreWalkingSessions,
      saveWalkingSession,
      todayMinutes,
      updateWalkingSession,
      weeklyMinutes,
    ],
  );

  return <WalkingDataContext.Provider value={value}>{children}</WalkingDataContext.Provider>;
}

export function useWalkingData() {
  const context = useContext(WalkingDataContext);

  if (!context) {
    throw new Error('useWalkingData must be used inside WalkingDataProvider');
  }

  return context;
}
