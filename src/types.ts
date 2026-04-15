export type WalkingSession = {
  id: string;
  batchId?: string;
  date: string;
  minutes: number;
  createdAt: string;
};

export type WalkingEntry = {
  id: string;
  date: string;
  totalMinutes: number;
  createdAt: string;
  sessions: WalkingSession[];
};

export type WeekStartDay = 'sunday' | 'monday';

export type DashboardSectionKey = 'insights' | 'weeklyRhythm' | 'weeklyTrend' | 'heatmap';

export type DailyGoalHistoryEntry = {
  date: string;
  minutes: number;
};

export type UserSettings = {
  schemaVersion: number;
  weekStart: WeekStartDay;
  dailyGoalMinutes: number;
  dailyGoalHistory: DailyGoalHistoryEntry[];
  weeklyGoalDays: number;
  weeklyGoalMinutes: number;
  monthlyGoalMinutes: number;
  hapticsEnabled: boolean;
  goalReminderEnabled: boolean;
  timelineStartHour: number;
  timelineEndHour: number;
  dashboardOrder: DashboardSectionKey[];
  hiddenDashboardSections: DashboardSectionKey[];
};

export type RootTabParamList = {
  Home: undefined;
  Add: { openComposerToken?: number; targetDateKey?: string } | undefined;
  Compose: undefined;
  History: undefined;
  More: undefined;
};
