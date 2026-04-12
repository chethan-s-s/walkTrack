import React, {
  createContext,
  PropsWithChildren,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';

import { appendEntry, getDateKey, loadEntries } from '../storage/walkingStorage';
import { WalkingEntry } from '../types';

type WalkingDataContextValue = {
  entries: WalkingEntry[];
  loading: boolean;
  weeklyMinutes: number;
  todayMinutes: number;
  averageMinutes: number;
  saveWalkingSession: (date: string, minutes: number) => Promise<void>;
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

  const saveWalkingSession = useCallback(async (date: string, minutes: number) => {
    const nextEntries = await appendEntry(date, minutes);
    setEntries(nextEntries);
  }, []);

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
      saveWalkingSession,
      getEntryForDate,
    }),
    [averageMinutes, entries, getEntryForDate, loading, saveWalkingSession, todayMinutes, weeklyMinutes],
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
