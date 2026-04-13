import { WalkingSession } from '../types';

export const getSessionGroupId = (session: WalkingSession) => session.batchId ?? session.id;

const sortByCreatedAtAscending = (sessions: WalkingSession[]) =>
  [...sessions].sort((left, right) => new Date(left.createdAt).getTime() - new Date(right.createdAt).getTime());

export const mergeSessionGroup = (sessions: WalkingSession[]) => {
  const sortedSessions = sortByCreatedAtAscending(sessions);
  const firstSession = sortedSessions[0];

  if (!firstSession) {
    return null;
  }

  const groupId = getSessionGroupId(firstSession);

  return {
    ...firstSession,
    id: groupId,
    batchId: groupId,
    minutes: sortedSessions.reduce((total, session) => total + session.minutes, 0),
    createdAt: firstSession.createdAt,
  } as WalkingSession;
};

export const getLinkedSessions = (sessions: WalkingSession[], targetSession: WalkingSession | string) => {
  const targetGroupId = typeof targetSession === 'string' ? targetSession : getSessionGroupId(targetSession);

  return sortByCreatedAtAscending(
    sessions.filter((session) => getSessionGroupId(session) === targetGroupId),
  );
};

export const mergeLinkedSessions = (sessions: WalkingSession[]) => {
  const groups = sessions.reduce<Map<string, WalkingSession[]>>((accumulator, session) => {
    const groupId = getSessionGroupId(session);
    const existingSessions = accumulator.get(groupId) ?? [];
    accumulator.set(groupId, [...existingSessions, session]);
    return accumulator;
  }, new Map());

  return [...groups.entries()]
    .flatMap(([, groupedSessions]) => {
      const mergedSession = mergeSessionGroup(groupedSessions);
      return mergedSession ? [mergedSession] : [];
    })
    .sort((left, right) => new Date(left.createdAt).getTime() - new Date(right.createdAt).getTime());
};