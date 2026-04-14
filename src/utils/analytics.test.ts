import assert from 'node:assert/strict';
import test from 'node:test';

import { UserSettings } from '../types';
import { getDailyGoalMinutesForDate } from './dailyGoals';
import { getCurrentStreak, getWeeklyGoalHitCount } from './analytics';

const settings: UserSettings = {
  weekStart: 'monday',
  dailyGoalMinutes: 120,
  dailyGoalHistory: [
    { date: '1970-01-01', minutes: 60 },
    { date: '2026-04-14', minutes: 120 },
  ],
  weeklyGoalDays: 4,
  weeklyGoalMinutes: 240,
  monthlyGoalMinutes: 600,
  hapticsEnabled: true,
  goalReminderEnabled: true,
  timelineStartHour: 6,
  timelineEndHour: 0,
  dashboardOrder: ['insights', 'weeklyRhythm', 'weeklyTrend', 'heatmap'],
  hiddenDashboardSections: [],
};

test('getDailyGoalMinutesForDate keeps historical dates on their previous goal', () => {
  assert.equal(getDailyGoalMinutesForDate(settings, '2026-04-13'), 60);
  assert.equal(getDailyGoalMinutesForDate(settings, '2026-04-14'), 120);
  assert.equal(getDailyGoalMinutesForDate(settings, '2026-04-15'), 120);
});

test('goal-based weekly hits and streak use the goal active on each date', () => {
  const entries = [
    {
      id: '2026-04-13',
      date: '2026-04-13',
      totalMinutes: 75,
      createdAt: '2026-04-13T08:00:00.000Z',
      sessions: [],
    },
    {
      id: '2026-04-14',
      date: '2026-04-14',
      totalMinutes: 100,
      createdAt: '2026-04-14T08:00:00.000Z',
      sessions: [],
    },
  ];

  assert.equal(getWeeklyGoalHitCount(entries, settings, new Date('2026-04-14T12:00:00.000Z'), 'monday'), 1);
  assert.equal(getCurrentStreak(entries, settings, new Date('2026-04-14T12:00:00.000Z')), 0);
});