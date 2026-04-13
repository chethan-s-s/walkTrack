import React, {
  createContext,
  PropsWithChildren,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';

import { DashboardSectionKey, UserSettings, WeekStartDay } from '../types';
import { defaultSettings, saveSettings, loadSettings } from '../storage/settingsStorage';

type AppSettingsContextValue = {
  settings: UserSettings;
  settingsLoading: boolean;
  replaceSettings: (nextSettings: UserSettings) => Promise<void>;
  setWeekStart: (value: WeekStartDay) => Promise<void>;
  setDailyGoalMinutes: (value: number) => Promise<void>;
  setWeeklyGoalDays: (value: number) => Promise<void>;
  setWeeklyGoalMinutes: (value: number) => Promise<void>;
  setMonthlyGoalMinutes: (value: number) => Promise<void>;
  setHapticsEnabled: (value: boolean) => Promise<void>;
  setGoalReminderEnabled: (value: boolean) => Promise<void>;
  setTimelineStartHour: (value: number) => Promise<void>;
  setTimelineEndHour: (value: number) => Promise<void>;
  toggleDashboardSectionHidden: (section: DashboardSectionKey) => Promise<void>;
  moveDashboardSection: (section: DashboardSectionKey, direction: 'up' | 'down') => Promise<void>;
};

const AppSettingsContext = createContext<AppSettingsContextValue | undefined>(undefined);

const clampDailyGoalMinutes = (value: number) => Math.max(5, Math.min(600, Math.round(value)));
const clampWeeklyGoalDays = (value: number) => Math.max(1, Math.min(7, Math.round(value)));
const clampWeeklyGoalMinutes = (value: number) => Math.max(30, Math.min(2000, Math.round(value)));
const clampMonthlyGoalMinutes = (value: number) => Math.max(60, Math.min(10000, Math.round(value)));
const clampHour = (value: number) => ((Math.round(value) % 24) + 24) % 24;

export function AppSettingsProvider({ children }: PropsWithChildren) {
  const [settings, setSettings] = useState<UserSettings>(defaultSettings);
  const [settingsLoading, setSettingsLoading] = useState(true);

  useEffect(() => {
    async function hydrate() {
      const storedSettings = await loadSettings();
      setSettings(storedSettings);
      setSettingsLoading(false);
    }

    hydrate();
  }, []);

  const updateSettings = useCallback(async (updater: (currentSettings: UserSettings) => UserSettings) => {
    setSettings((currentSettings) => {
      const nextSettings = updater(currentSettings);
      void saveSettings(nextSettings);
      return nextSettings;
    });
  }, []);

  const setWeekStart = useCallback(
    async (value: WeekStartDay) => {
      await updateSettings((currentSettings) => ({
        ...currentSettings,
        weekStart: value,
      }));
    },
    [updateSettings],
  );

  const replaceSettings = useCallback(
    async (nextSettings: UserSettings) => {
      await updateSettings(() => nextSettings);
    },
    [updateSettings],
  );

  const setDailyGoalMinutes = useCallback(
    async (value: number) => {
      await updateSettings((currentSettings) => ({
        ...currentSettings,
        dailyGoalMinutes: clampDailyGoalMinutes(value),
      }));
    },
    [updateSettings],
  );

  const setWeeklyGoalDays = useCallback(
    async (value: number) => {
      await updateSettings((currentSettings) => ({
        ...currentSettings,
        weeklyGoalDays: clampWeeklyGoalDays(value),
      }));
    },
    [updateSettings],
  );

  const setWeeklyGoalMinutes = useCallback(
    async (value: number) => {
      await updateSettings((currentSettings) => ({
        ...currentSettings,
        weeklyGoalMinutes: clampWeeklyGoalMinutes(value),
      }));
    },
    [updateSettings],
  );

  const setMonthlyGoalMinutes = useCallback(
    async (value: number) => {
      await updateSettings((currentSettings) => ({
        ...currentSettings,
        monthlyGoalMinutes: clampMonthlyGoalMinutes(value),
      }));
    },
    [updateSettings],
  );

  const setHapticsEnabled = useCallback(
    async (value: boolean) => {
      await updateSettings((currentSettings) => ({
        ...currentSettings,
        hapticsEnabled: value,
      }));
    },
    [updateSettings],
  );

  const setGoalReminderEnabled = useCallback(
    async (value: boolean) => {
      await updateSettings((currentSettings) => ({
        ...currentSettings,
        goalReminderEnabled: value,
      }));
    },
    [updateSettings],
  );

  const setTimelineStartHour = useCallback(
    async (value: number) => {
      await updateSettings((currentSettings) => ({
        ...currentSettings,
        timelineStartHour: clampHour(value),
      }));
    },
    [updateSettings],
  );

  const setTimelineEndHour = useCallback(
    async (value: number) => {
      await updateSettings((currentSettings) => ({
        ...currentSettings,
        timelineEndHour: clampHour(value),
      }));
    },
    [updateSettings],
  );

  const toggleDashboardSectionHidden = useCallback(
    async (section: DashboardSectionKey) => {
      await updateSettings((currentSettings) => {
        const isHidden = currentSettings.hiddenDashboardSections.includes(section);

        return {
          ...currentSettings,
          hiddenDashboardSections: isHidden
            ? currentSettings.hiddenDashboardSections.filter((item) => item !== section)
            : [...currentSettings.hiddenDashboardSections, section],
        };
      });
    },
    [updateSettings],
  );

  const moveDashboardSection = useCallback(
    async (section: DashboardSectionKey, direction: 'up' | 'down') => {
      await updateSettings((currentSettings) => {
        const currentIndex = currentSettings.dashboardOrder.indexOf(section);

        if (currentIndex === -1) {
          return currentSettings;
        }

        const nextIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;

        if (nextIndex < 0 || nextIndex >= currentSettings.dashboardOrder.length) {
          return currentSettings;
        }

        const nextOrder = [...currentSettings.dashboardOrder];
        const [removedSection] = nextOrder.splice(currentIndex, 1);
        nextOrder.splice(nextIndex, 0, removedSection);

        return {
          ...currentSettings,
          dashboardOrder: nextOrder,
        };
      });
    },
    [updateSettings],
  );

  const value = useMemo(
    () => ({
      settings,
      settingsLoading,
      replaceSettings,
      setWeekStart,
      setDailyGoalMinutes,
      setWeeklyGoalDays,
      setWeeklyGoalMinutes,
      setMonthlyGoalMinutes,
      setHapticsEnabled,
      setGoalReminderEnabled,
      setTimelineStartHour,
      setTimelineEndHour,
      toggleDashboardSectionHidden,
      moveDashboardSection,
    }),
    [
      moveDashboardSection,
      replaceSettings,
      setDailyGoalMinutes,
      setGoalReminderEnabled,
      setHapticsEnabled,
      setMonthlyGoalMinutes,
      setTimelineEndHour,
      setTimelineStartHour,
      setWeekStart,
      setWeeklyGoalDays,
      setWeeklyGoalMinutes,
      settings,
      settingsLoading,
      toggleDashboardSectionHidden,
    ],
  );

  return <AppSettingsContext.Provider value={value}>{children}</AppSettingsContext.Provider>;
}

export function useAppSettings() {
  const context = useContext(AppSettingsContext);

  if (!context) {
    throw new Error('useAppSettings must be used inside AppSettingsProvider');
  }

  return context;
}
