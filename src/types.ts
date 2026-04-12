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

export type UserSettings = {
  weekStart: WeekStartDay;
  dailyGoalMinutes: number;
  weeklyGoalDays: number;
  hapticsEnabled: boolean;
  goalReminderEnabled: boolean;
  timelineStartHour: number;
  timelineEndHour: number;
  dashboardOrder: DashboardSectionKey[];
  hiddenDashboardSections: DashboardSectionKey[];
};

export type RootTabParamList = {
  Home: undefined;
  Add: undefined;
  History: undefined;
  More: undefined;
};
