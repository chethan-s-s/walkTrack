import assert from 'node:assert/strict';
import test from 'node:test';

import { getDateKey } from '../storage/walkingStorage';
import {
  buildSessionSegments,
  doesTimeRangeCollide,
  formatReadableDate,
  getTimestampForDateTime,
} from './time';
import { WalkingSession } from '../types';

test('buildSessionSegments splits minutes across hours using the starting minute', () => {
  const segments = buildSessionSegments(95, 10, 30);

  assert.deepEqual(segments, [
    { hour: 10, minute: 30, minutes: 30 },
    { hour: 11, minute: 0, minutes: 60 },
    { hour: 12, minute: 0, minutes: 5 },
  ]);
});

test('doesTimeRangeCollide detects overlaps using exact start and end time', () => {
  const dateKey = getDateKey(new Date(2026, 3, 12));
  const sessionStart = getTimestampForDateTime(dateKey, 10, 15).toISOString();
  const sessions: WalkingSession[] = [
    {
      id: 'session-1',
      date: dateKey,
      minutes: 45,
      createdAt: sessionStart,
    },
  ];

  const overlaps = doesTimeRangeCollide(dateKey, sessions, [{ hour: 10, minute: 30, minutes: 20 }]);
  const doesNotOverlap = doesTimeRangeCollide(dateKey, sessions, [{ hour: 11, minute: 0, minutes: 15 }]);

  assert.equal(overlaps, true);
  assert.equal(doesNotOverlap, false);
});

test('formatReadableDate returns Today and Yesterday when appropriate', () => {
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);

  assert.equal(formatReadableDate(today), 'Today');
  assert.equal(formatReadableDate(yesterday), 'Yesterday');
});
