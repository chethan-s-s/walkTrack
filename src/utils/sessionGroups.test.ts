import assert from 'node:assert/strict';
import test from 'node:test';

import { getLinkedSessions, mergeLinkedSessions, mergeSessionGroup } from './sessionGroups';
import { doesTimeRangeCollide } from './time';
import { getDateKey } from '../storage/walkingStorage';

test('mergeLinkedSessions combines split segments into one logical session', () => {
  const dateKey = getDateKey(new Date(2026, 3, 13));
  const sessions = [
    {
      id: 'walk-1',
      batchId: 'walk-1',
      date: dateKey,
      minutes: 20,
      createdAt: new Date(2026, 3, 13, 10, 40).toISOString(),
    },
    {
      id: 'walk-1-1',
      batchId: 'walk-1',
      date: dateKey,
      minutes: 40,
      createdAt: new Date(2026, 3, 13, 11, 0).toISOString(),
    },
  ];

  assert.deepEqual(mergeLinkedSessions(sessions), [
    {
      id: 'walk-1',
      batchId: 'walk-1',
      date: dateKey,
      minutes: 60,
      createdAt: new Date(2026, 3, 13, 10, 40).toISOString(),
    },
  ]);
});

test('getLinkedSessions and collision exclusion work with logical session ids', () => {
  const dateKey = getDateKey(new Date(2026, 3, 13));
  const splitSessions = [
    {
      id: 'walk-2',
      batchId: 'walk-2',
      date: dateKey,
      minutes: 25,
      createdAt: new Date(2026, 3, 13, 21, 35).toISOString(),
    },
    {
      id: 'walk-2-1',
      batchId: 'walk-2',
      date: dateKey,
      minutes: 35,
      createdAt: new Date(2026, 3, 13, 22, 0).toISOString(),
    },
  ];

  assert.equal(getLinkedSessions(splitSessions, 'walk-2').length, 2);
  assert.equal(
    doesTimeRangeCollide(dateKey, splitSessions, [{ hour: 21, minute: 35, minutes: 60 }], ['walk-2']),
    false,
  );
});

test('mergeSessionGroup returns the full logical session for any linked subset', () => {
  const firstDay = getDateKey(new Date(2026, 3, 13));
  const secondDay = getDateKey(new Date(2026, 3, 14));
  const merged = mergeSessionGroup([
    {
      id: 'walk-3',
      batchId: 'walk-3',
      date: firstDay,
      minutes: 30,
      createdAt: new Date(2026, 3, 13, 23, 30).toISOString(),
    },
    {
      id: 'walk-3-1',
      batchId: 'walk-3',
      date: secondDay,
      minutes: 60,
      createdAt: new Date(2026, 3, 14, 0, 0).toISOString(),
    },
  ]);

  assert.deepEqual(merged, {
    id: 'walk-3',
    batchId: 'walk-3',
    date: firstDay,
    minutes: 90,
    createdAt: new Date(2026, 3, 13, 23, 30).toISOString(),
  });
});