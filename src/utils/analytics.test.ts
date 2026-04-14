import assert from 'node:assert/strict';
import test from 'node:test';

import { UserSettings } from '../types';
import { getDailyGoalMinutesForDate } from './dailyGoals';
import {
  getAverageDailyMinutes,
  getBestWeekday,
  getCurrentStreak,
  getGoalCompletionRate,
  getLongestStreak,
  getTimeOfDayPattern,
  getWeeklyGoalHitCount,
} from './analytics';

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

test('expanded analytics return weekday, streak, average, consistency, and time-of-day patterns', () => {
  const entries = [
    {
      id: '2026-04-07',
      date: '2026-04-07',
      totalMinutes: 60,
      createdAt: '2026-04-07T07:00:00.000Z',
      sessions: [{ id: '1', date: '2026-04-07', minutes: 60, createdAt: '2026-04-07T07:00:00.000Z' }],
    },
    {
      id: '2026-04-08',
      date: '2026-04-08',
      totalMinutes: 80,
      createdAt: '2026-04-08T18:00:00.000Z',
      sessions: [{ id: '2', date: '2026-04-08', minutes: 80, createdAt: '2026-04-08T18:00:00.000Z' }],
    },
    {
      id: '2026-04-09',
      date: '2026-04-09',
      totalMinutes: 90,
      createdAt: '2026-04-09T08:30:00.000Z',
      sessions: [{ id: '3', date: '2026-04-09', minutes: 90, createdAt: '2026-04-09T08:30:00.000Z' }],
    },
  ];

  assert.equal(getLongestStreak(entries, settings, new Date('2026-04-09T12:00:00.000Z')), 3);
  assert.equal(getAverageDailyMinutes(entries, 3, new Date('2026-04-09T12:00:00.000Z')), 77);
  assert.equal(getBestWeekday(entries)?.label, 'Thursday');
  assert.equal(getGoalCompletionRate(entries, settings, 'week', new Date('2026-04-09T12:00:00.000Z')).completedDays, 3);
  assert.equal(getTimeOfDayPattern(entries).topLabel, 'Morning');
});