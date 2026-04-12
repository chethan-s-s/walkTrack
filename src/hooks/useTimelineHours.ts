import { useMemo } from 'react';

import { getDefaultTargetHour, getTimelineHours } from '../utils/time';

export const useTimelineHours = (startHour: number, endHour: number) => {
  const visibleHours = useMemo(() => getTimelineHours(startHour, endHour), [endHour, startHour]);
  const defaultTargetHour = useMemo(() => getDefaultTargetHour(visibleHours), [visibleHours]);

  return {
    visibleHours,
    defaultTargetHour,
  };
};
