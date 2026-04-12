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

export type RootTabParamList = {
  Home: undefined;
  Add: undefined;
  History: undefined;
};
