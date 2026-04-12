import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  LayoutChangeEvent,
  Modal,
  PanResponder,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

import { useAppSettings } from '../../context/AppSettingsContext';
import { useWalkingData } from '../../context/WalkingDataContext';
import { getDateKey } from '../../storage/walkingStorage';
import { useAppColors } from '../../theme/useAppColors';
import { WalkingSession } from '../../types';
import { formatDuration } from '../../utils/formatDuration';
import { createStyles } from './AddScreenStyles';

const QUICK_MINUTES = [15, 30, 45, 60];
const DRAG_ACTIVATION_DISTANCE = 8;

type TimelineRowMeasurement = {
  pageY: number;
  height: number;
};

type CreateDragState = {
  startHour: number;
  currentHour: number;
};

type MoveDragState = {
  session: WalkingSession;
  originHour: number;
  currentHour: number;
};

type ToastMessage = {
  id: number;
  message: string;
  type: 'success' | 'warning';
};

const clampMinutes = (minutes: number) => Math.max(5, Math.min(240, minutes));
const normalizeHour = (hour: number) => ((hour % 24) + 24) % 24;
const normalizeMinute = (minute: number) => ((minute % 60) + 60) % 60;
const getDefaultTargetMinute = () => new Date().getMinutes();

const getPositiveMinutes = (value: string) => {
  const numericValue = Number.parseInt(value, 10);

  if (Number.isNaN(numericValue) || numericValue < 1) {
    return 0;
  }

  return numericValue;
};

const buildSessionSegments = (totalMinutes: number, startingHour: number, startingMinute: number) => {
  const segments: Array<{ hour: number; minute: number; minutes: number }> = [];
  let remainingMinutes = totalMinutes;
  let currentHour = normalizeHour(startingHour);
  let currentMinute = normalizeMinute(startingMinute);

  while (remainingMinutes > 0) {
    const availableMinutes = segments.length === 0 ? 60 - currentMinute : 60;
    const segmentMinutes = Math.min(remainingMinutes, availableMinutes);
    segments.push({ hour: currentHour, minute: currentMinute, minutes: segmentMinutes });
    remainingMinutes -= segmentMinutes;
    currentHour = normalizeHour(currentHour + 1);
    currentMinute = 0;
  }

  return segments;
};

const getTimelineHours = (startHour: number, endHour: number) => {
  const hours: number[] = [];
  let currentHour = normalizeHour(startHour);
  const normalizedEndHour = normalizeHour(endHour);

  for (let index = 0; index < 24; index += 1) {
    hours.push(currentHour);

    if (currentHour === normalizedEndHour) {
      break;
    }

    currentHour = normalizeHour(currentHour + 1);
  }

  return hours;
};

const getHourRange = (hours: number[], startHour: number, endHour: number) => {
  const startIndex = hours.indexOf(startHour);
  const endIndex = hours.indexOf(endHour);

  if (startIndex === -1 || endIndex === -1) {
    return [] as number[];
  }

  const [rangeStart, rangeEnd] = startIndex <= endIndex ? [startIndex, endIndex] : [endIndex, startIndex];
  return hours.slice(rangeStart, rangeEnd + 1);
};

const getHoursForMinutes = (minutes: number, startingHour: number, startingMinute: number) =>
  buildSessionSegments(minutes, startingHour, startingMinute).map((segment) => segment.hour);

const getYesterdayDate = () => {
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  return yesterday;
};

const formatReadableDate = (date: Date) =>
  getDateKey(date) === getDateKey()
    ? 'Today'
    : getDateKey(date) === getDateKey(getYesterdayDate())
      ? 'Yesterday'
    : date.toLocaleDateString('en-US', {
        weekday: 'long',
        month: 'short',
        day: 'numeric',
      });

const formatHourLabel = (hour: number) => {
  if (hour === 0) {
    return '12 AM';
  }

  if (hour < 12) {
    return `${hour} AM`;
  }

  if (hour === 12) {
    return '12 PM';
  }

  return `${hour - 12} PM`;
};

const formatSessionTime = (createdAt: string) =>
  new Date(createdAt).toLocaleTimeString([], {
    hour: 'numeric',
    minute: '2-digit',
  });

const formatTimeLabel = (hour: number, minute: number) => {
  const suffix = hour >= 12 ? 'PM' : 'AM';
  const normalizedHour = hour % 12 === 0 ? 12 : hour % 12;
  return `${normalizedHour}:${String(normalizeMinute(minute)).padStart(2, '0')} ${suffix}`;
};

const formatClockTime = (date: Date) =>
  date.toLocaleTimeString([], {
    hour: 'numeric',
    minute: '2-digit',
  });

const formatSessionTimeRange = (createdAt: string, durationMinutes: number) => {
  const start = new Date(createdAt);
  const end = new Date(start.getTime() + durationMinutes * 60_000);

  return `${formatClockTime(start)} - ${formatClockTime(end)}`;
};

const getTimestampForDateTime = (dateKey: string, hour: number, minute: number) => {
  const [year, month, day] = dateKey.split('-').map(Number);
  return new Date(year, month - 1, day, normalizeHour(hour), normalizeMinute(minute), 0, 0);
};

const formatDateKeyTimeRange = (dateKey: string, hour: number, minute: number, durationMinutes: number) => {
  const start = getTimestampForDateTime(dateKey, hour, minute);
  const end = new Date(start.getTime() + durationMinutes * 60_000);

  return `${formatClockTime(start)} - ${formatClockTime(end)}`;
};

const getSuggestedStartMinute = (dateKey: string, hour: number, sessions: WalkingSession[]) => {
  const normalizedHour = normalizeHour(hour);
  const sessionsInHour = sessions
    .filter((session) => {
      const start = new Date(session.createdAt);
      return start.getHours() === normalizedHour;
    })
    .sort((left, right) => new Date(left.createdAt).getTime() - new Date(right.createdAt).getTime());

  if (!sessionsInHour.length) {
    return 0;
  }

  const lastSession = sessionsInHour[sessionsInHour.length - 1];
  const lastSessionEnd = new Date(new Date(lastSession.createdAt).getTime() + lastSession.minutes * 60_000);

  if (lastSessionEnd.getHours() !== normalizedHour) {
    return 0;
  }

  return lastSessionEnd.getMinutes();
};

const doesTimeRangeCollide = (
  dateKey: string,
  sessions: WalkingSession[],
  nextSegments: Array<{ hour: number; minute: number; minutes: number }>,
  excludedSessionIds: string[] = [],
) => {
  const excludedIds = new Set(excludedSessionIds);

  return nextSegments.some((segment) => {
    const nextStart = getTimestampForDateTime(dateKey, segment.hour, segment.minute);
    const nextEnd = new Date(nextStart.getTime() + segment.minutes * 60_000);

    return sessions
      .filter((session) => !excludedIds.has(session.id))
      .some((session) => {
        const existingStart = new Date(session.createdAt);
        const existingEnd = new Date(existingStart.getTime() + session.minutes * 60_000);
        return nextStart < existingEnd && nextEnd > existingStart;
      });
  });
};

const getDefaultTargetHour = (visibleHours: number[]) => {
  const currentHour = new Date().getHours();

  if (visibleHours.includes(currentHour)) {
    return currentHour;
  }

  return visibleHours[0] ?? 6;
};

export default function AddScreen() {
  const colors = useAppColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const { settings } = useAppSettings();
  const {
    deleteWalkingSession,
    getEntryForDate,
    restoreWalkingSessions,
    saveWalkingSession,
    updateWalkingSession,
  } = useWalkingData();
  const visibleHours = useMemo(
    () => getTimelineHours(settings.timelineStartHour, settings.timelineEndHour),
    [settings.timelineEndHour, settings.timelineStartHour],
  );
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [draftMinutes, setDraftMinutes] = useState('30');
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [sessionPendingDelete, setSessionPendingDelete] = useState<WalkingSession | null>(null);
  const [editingSession, setEditingSession] = useState<WalkingSession | null>(null);
  const [undoSessions, setUndoSessions] = useState<WalkingSession[] | null>(null);
  const [targetHour, setTargetHour] = useState(() => getDefaultTargetHour(visibleHours));
  const [targetMinute, setTargetMinute] = useState(getDefaultTargetMinute());
  const [toastItems, setToastItems] = useState<ToastMessage[]>([]);
  const [rowMeasurements, setRowMeasurements] = useState<Record<number, TimelineRowMeasurement>>({});
  const [createDragState, setCreateDragState] = useState<CreateDragState | null>(null);
  const [moveDragState, setMoveDragState] = useState<MoveDragState | null>(null);
  const timelineRowRefs = useRef<Record<number, View | null>>({});
  const createDragRef = useRef<CreateDragState | null>(null);
  const moveDragRef = useRef<MoveDragState | null>(null);
  const toastIdRef = useRef(0);

  const selectedKey = useMemo(() => getDateKey(selectedDate), [selectedDate]);
  const isCurrentDate = selectedKey === getDateKey();
  const currentHour = new Date().getHours();
  const canEditSelectedDate = selectedKey <= getDateKey();
  const canGoForward = !isCurrentDate;
  const selectedEntry = getEntryForDate(selectedKey);
  const totalMinutes = selectedEntry?.totalMinutes ?? 0;
  const pendingDeleteSessions = useMemo(() => {
    if (!sessionPendingDelete) {
      return [] as WalkingSession[];
    }

    return (selectedEntry?.sessions ?? []).filter((session) => {
      if (sessionPendingDelete.batchId) {
        return session.batchId === sessionPendingDelete.batchId;
      }

      return session.id === sessionPendingDelete.id;
    });
  }, [selectedEntry?.sessions, sessionPendingDelete]);

  const groupedTimeline = useMemo(() => {
    const groups = new Map<number, WalkingSession[]>();

    selectedEntry?.sessions.forEach((session) => {
      const hour = new Date(session.createdAt).getHours();
      const existingSessions = groups.get(hour) ?? [];
      groups.set(hour, [...existingSessions, session]);
    });

    return visibleHours.map((hour) => ({
      hour,
      sessions: [...(groups.get(hour) ?? [])].sort(
        (left, right) => new Date(left.createdAt).getTime() - new Date(right.createdAt).getTime(),
      ),
    }));
  }, [selectedEntry, visibleHours]);

  const setCreateDrag = (nextDragState: CreateDragState | null) => {
    createDragRef.current = nextDragState;
    setCreateDragState(nextDragState);
  };

  const setMoveDrag = (nextDragState: MoveDragState | null) => {
    moveDragRef.current = nextDragState;
    setMoveDragState(nextDragState);
  };

  const createDraggedHours = useMemo(
    () => (createDragState ? getHourRange(visibleHours, createDragState.startHour, createDragState.currentHour) : []),
    [createDragState, visibleHours],
  );
  const moveDraggedHours = useMemo(
    () =>
      moveDragState
        ? getHoursForMinutes(
            moveDragState.session.minutes,
            moveDragState.currentHour,
            new Date(moveDragState.session.createdAt).getMinutes(),
          )
        : [],
    [moveDragState],
  );
  const createDraggedHoursSet = useMemo(() => new Set(createDraggedHours), [createDraggedHours]);
  const moveDraggedHoursSet = useMemo(() => new Set(moveDraggedHours), [moveDraggedHours]);

  useEffect(() => {
    if (!undoSessions?.length) {
      return undefined;
    }

    const timeout = setTimeout(() => {
      setUndoSessions(null);
    }, 5000);

    return () => clearTimeout(timeout);
  }, [undoSessions]);

  useEffect(() => {
    setCreateDrag(null);
    setMoveDrag(null);
    setRowMeasurements({});
  }, [selectedKey, visibleHours]);

  useEffect(() => {
    if (!visibleHours.includes(targetHour)) {
      setTargetHour(getDefaultTargetHour(visibleHours));
    }
  }, [targetHour, visibleHours]);

  const latestWarningToast = useMemo(
    () => [...toastItems].reverse().find((toastItem) => toastItem.type === 'warning') ?? null,
    [toastItems],
  );

  const pushToast = (message: string, type: 'success' | 'warning') => {
    const nextToastId = toastIdRef.current + 1;
    toastIdRef.current = nextToastId;

    setToastItems((currentToasts) => [...currentToasts, { id: nextToastId, message, type }]);

    setTimeout(() => {
      setToastItems((currentToasts) => currentToasts.filter((toastItem) => toastItem.id !== nextToastId));
    }, 2200);
  };

  const triggerSelectionHaptic = () => {
    if (!settings.hapticsEnabled) {
      return;
    }

    void Haptics.selectionAsync();
  };

  const triggerNotificationHaptic = async (type: Haptics.NotificationFeedbackType) => {
    if (!settings.hapticsEnabled) {
      return;
    }

    await Haptics.notificationAsync(type);
  };

  const updateRowMeasurement = (hour: number, pageY: number, height: number) => {
    setRowMeasurements((currentMeasurements) => {
      const currentMeasurement = currentMeasurements[hour];

      if (
        currentMeasurement &&
        Math.abs(currentMeasurement.pageY - pageY) < 1 &&
        Math.abs(currentMeasurement.height - height) < 1
      ) {
        return currentMeasurements;
      }

      return {
        ...currentMeasurements,
        [hour]: { pageY, height },
      };
    });
  };

  const measureTimelineRow = (hour: number) => {
    requestAnimationFrame(() => {
      timelineRowRefs.current[hour]?.measureInWindow((_x, pageY, _width, height) => {
        if (height) {
          updateRowMeasurement(hour, pageY, height);
        }
      });
    });
  };

  const handleTimelineRowLayout = (hour: number, _event: LayoutChangeEvent) => {
    measureTimelineRow(hour);
  };

  const getHourFromPageY = (pageY: number) => {
    const measuredRows = visibleHours.flatMap((hour) => {
      const measurement = rowMeasurements[hour];

      if (!measurement) {
        return [] as Array<TimelineRowMeasurement & { hour: number }>;
      }

      return [{ hour, ...measurement }];
    });

    if (!measuredRows.length) {
      return null;
    }

    const exactMatch = measuredRows.find(
      (measurement) => pageY >= measurement.pageY && pageY <= measurement.pageY + measurement.height,
    );

    if (exactMatch) {
      return exactMatch.hour;
    }

    return measuredRows.reduce((closestMeasurement, measurement) => {
      const closestDistance = Math.abs(pageY - (closestMeasurement.pageY + closestMeasurement.height / 2));
      const nextDistance = Math.abs(pageY - (measurement.pageY + measurement.height / 2));
      return nextDistance < closestDistance ? measurement : closestMeasurement;
    }).hour;
  };

  const showWarningToast = async (message: string) => {
    pushToast(message, 'warning');
    await triggerNotificationHaptic(Haptics.NotificationFeedbackType.Warning);
  };

  const updateCreateDragHour = (pageY: number) => {
    const nextHour = getHourFromPageY(pageY);
    const activeDrag = createDragRef.current;

    if (nextHour === null || !activeDrag || activeDrag.currentHour === nextHour) {
      return;
    }

    setCreateDrag({
      ...activeDrag,
      currentHour: nextHour,
    });
    triggerSelectionHaptic();
  };

  const updateMoveDragHour = (pageY: number) => {
    const nextHour = getHourFromPageY(pageY);
    const activeDrag = moveDragRef.current;

    if (nextHour === null || !activeDrag || activeDrag.currentHour === nextHour) {
      return;
    }

    setMoveDrag({
      ...activeDrag,
      currentHour: nextHour,
    });
    triggerSelectionHaptic();
  };

  const changeDate = (direction: -1 | 1) => {
    setSelectedDate((currentDate) => {
      if (direction === 1 && getDateKey(currentDate) === getDateKey()) {
        return currentDate;
      }

      const nextDate = new Date(currentDate);
      nextDate.setDate(nextDate.getDate() + direction);
      return nextDate;
    });
  };

  const openModal = (hour = getDefaultTargetHour(visibleHours), minutes = '30', minute = getDefaultTargetMinute()) => {
    if (!canEditSelectedDate) {
      return;
    }

    setEditingSession(null);
    setTargetHour(visibleHours.includes(normalizeHour(hour)) ? normalizeHour(hour) : getDefaultTargetHour(visibleHours));
    setTargetMinute(normalizeMinute(minute));
    setDraftMinutes(minutes);
    setIsModalVisible(true);
  };

  const openEditModal = (session: WalkingSession) => {
    if (!canEditSelectedDate) {
      return;
    }

    setEditingSession(session);
    setTargetHour(new Date(session.createdAt).getHours());
    setTargetMinute(new Date(session.createdAt).getMinutes());
    setDraftMinutes(String(session.minutes));
    setIsModalVisible(true);
  };

  const closeModal = () => {
    setEditingSession(null);
    setIsModalVisible(false);
  };

  const shiftTargetHour = (delta: -1 | 1) => {
    setTargetHour((currentValue) => normalizeHour(currentValue + delta));
  };

  const shiftTargetMinute = (delta: -1 | 1) => {
    setTargetMinute((currentValue) => {
      const nextMinute = currentValue + delta;

      if (nextMinute < 0) {
        setTargetHour((currentValueHour) => normalizeHour(currentValueHour - 1));
      }

      if (nextMinute > 59) {
        setTargetHour((currentValueHour) => normalizeHour(currentValueHour + 1));
      }

      return normalizeMinute(nextMinute);
    });
  };

  const finalizeCreateDrag = async () => {
    const activeDrag = createDragRef.current;
    setCreateDrag(null);

    if (!activeDrag) {
      return;
    }

    const selectedHours = getHourRange(visibleHours, activeDrag.startHour, activeDrag.currentHour);

    if (!selectedHours.length) {
      openModal(activeDrag.startHour, '30', 0);
      return;
    }

    const startMinute = getSuggestedStartMinute(selectedKey, selectedHours[0], selectedEntry?.sessions ?? []);
    const nextSegments = buildSessionSegments(selectedHours.length * 60, selectedHours[0], startMinute);
    const hasOverlap = doesTimeRangeCollide(selectedKey, selectedEntry?.sessions ?? [], nextSegments);

    if (hasOverlap) {
      await showWarningToast('A walking session already exists in one or more of those hourly slots.');
      return;
    }

    openModal(selectedHours[0], String(selectedHours.length * 60), startMinute);
    await triggerNotificationHaptic(Haptics.NotificationFeedbackType.Success);
  };

  const finalizeMoveDrag = async () => {
    const activeDrag = moveDragRef.current;
    setMoveDrag(null);

    if (!activeDrag) {
      return;
    }

    if (activeDrag.currentHour === activeDrag.originHour) {
      return;
    }

    const sessionMinute = new Date(activeDrag.session.createdAt).getMinutes();
    const nextSegments = buildSessionSegments(
      activeDrag.session.minutes,
      activeDrag.currentHour,
      sessionMinute,
    );
    const hasOverlap = doesTimeRangeCollide(
      selectedKey,
      selectedEntry?.sessions ?? [],
      nextSegments,
      [activeDrag.session.id],
    );

    if (hasOverlap) {
      await showWarningToast('A walking session already exists in one or more of those hourly slots.');
      return;
    }

    await updateWalkingSession(
      selectedKey,
      activeDrag.session.id,
      selectedKey,
      activeDrag.session.minutes,
      activeDrag.currentHour,
      sessionMinute,
    );
    pushToast(`Moved to ${formatTimeLabel(activeDrag.currentHour, sessionMinute)}.`, 'success');
    await triggerNotificationHaptic(Haptics.NotificationFeedbackType.Success);
  };

  const getCreateDragHandlers = (hour: number) =>
    canEditSelectedDate
      ? PanResponder.create({
          onMoveShouldSetPanResponder: (_event, gestureState) =>
            Math.abs(gestureState.dy) > DRAG_ACTIVATION_DISTANCE,
          onPanResponderGrant: (_event, gestureState) => {
            setCreateDrag({
              startHour: hour,
              currentHour: getHourFromPageY(gestureState.moveY) ?? hour,
            });
            triggerSelectionHaptic();
          },
          onPanResponderMove: (_event, gestureState) => {
            updateCreateDragHour(gestureState.moveY);
          },
          onPanResponderRelease: () => {
            void finalizeCreateDrag();
          },
          onPanResponderTerminate: () => {
            setCreateDrag(null);
          },
        }).panHandlers
      : {};

  const getMoveDragHandlers = (session: WalkingSession) =>
    canEditSelectedDate
      ? PanResponder.create({
          onMoveShouldSetPanResponder: (_event, gestureState) =>
            Math.abs(gestureState.dy) > DRAG_ACTIVATION_DISTANCE,
          onPanResponderGrant: (_event, gestureState) => {
            const originHour = new Date(session.createdAt).getHours();

            setMoveDrag({
              session,
              originHour,
              currentHour: getHourFromPageY(gestureState.moveY) ?? originHour,
            });
            triggerSelectionHaptic();
          },
          onPanResponderMove: (_event, gestureState) => {
            updateMoveDragHour(gestureState.moveY);
          },
          onPanResponderRelease: () => {
            void finalizeMoveDrag();
          },
          onPanResponderTerminate: () => {
            setMoveDrag(null);
          },
        }).panHandlers
      : {};

  const confirmDeleteSession = (session: WalkingSession) => {
    setSessionPendingDelete(session);
  };

  const closeDeleteDialog = () => {
    setSessionPendingDelete(null);
  };

  const handleDeleteSession = async () => {
    if (!sessionPendingDelete) {
      return;
    }

    const deletedSessions = (selectedEntry?.sessions ?? []).filter((session) => {
      if (sessionPendingDelete.batchId) {
        return session.batchId === sessionPendingDelete.batchId;
      }

      return session.id === sessionPendingDelete.id;
    });

    await deleteWalkingSession(selectedKey, sessionPendingDelete);
    setSessionPendingDelete(null);
    setUndoSessions(deletedSessions);
    pushToast('Walking session deleted.', 'success');
    await triggerNotificationHaptic(Haptics.NotificationFeedbackType.Warning);
  };

  const undoDelete = async () => {
    if (!undoSessions?.length) {
      return;
    }

    await restoreWalkingSessions(undoSessions);
    setUndoSessions(null);
    pushToast('Walking session restored.', 'success');
    await triggerNotificationHaptic(Haptics.NotificationFeedbackType.Success);
  };

  const renderToastCard = (toastItem: ToastMessage) =>
    toastItem ? (
      <View key={toastItem.id} style={[styles.toastCard, toastItem.type === 'warning' && styles.toastCardWarning]}>
        <Ionicons
          color={colors.textPrimary}
          name={toastItem.type === 'warning' ? 'alert-circle-outline' : 'checkmark-circle'}
          size={18}
        />
        <Text style={styles.toastText}>{toastItem.message}</Text>
      </View>
    ) : null;

  const saveMinutes = async () => {
    if (!canEditSelectedDate) {
      return;
    }

    const parsedMinutes = getPositiveMinutes(draftMinutes);

    if (parsedMinutes < 1) {
      pushToast('Please enter a positive number of walking minutes.', 'warning');
      return;
    }

    const nextSegments = buildSessionSegments(parsedMinutes, targetHour, targetMinute);
    const hasOverlap = doesTimeRangeCollide(
      selectedKey,
      selectedEntry?.sessions ?? [],
      nextSegments,
      editingSession ? [editingSession.id] : [],
    );

    if (hasOverlap) {
      pushToast('A walking session already exists in one or more of those hourly slots.', 'warning');
      await triggerNotificationHaptic(Haptics.NotificationFeedbackType.Warning);
      return;
    }

    if (editingSession) {
      await updateWalkingSession(selectedKey, editingSession.id, selectedKey, parsedMinutes, targetHour, targetMinute);
      closeModal();
      pushToast(`Updated ${formatDateKeyTimeRange(selectedKey, targetHour, targetMinute, parsedMinutes)}.`, 'success');
      await triggerNotificationHaptic(Haptics.NotificationFeedbackType.Success);
      return;
    }

    const batchId = `${selectedKey}-${targetHour}-${Date.now()}`;

    for (const segment of nextSegments) {
      await saveWalkingSession(selectedKey, segment.minutes, segment.hour, segment.minute, batchId);
    }

    closeModal();
    pushToast(`Added ${formatDateKeyTimeRange(selectedKey, targetHour, targetMinute, parsedMinutes)}.`, 'success');
    await triggerNotificationHaptic(Haptics.NotificationFeedbackType.Success);
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.content}>
        <View style={styles.fixedHeaderSection}>
          <View style={styles.dateRow}>
            <Pressable onPress={() => changeDate(-1)} style={styles.dateArrow}>
              <Ionicons color={colors.textPrimary} name="chevron-back" size={20} />
            </Pressable>
            <View style={styles.datePill}>
              <View style={styles.datePillTopRow}>
                <View style={styles.dateIconWrap}>
                  <Ionicons color={colors.textPrimary} name="calendar-clear-outline" size={18} />
                </View>
                <View style={styles.dateTextWrap}>
                  <Text style={styles.dateEyebrow}>Walking day</Text>
                  <Text style={styles.dateLabel}>{formatReadableDate(selectedDate)}</Text>
                </View>
              </View>
            </View>
            <Pressable
              disabled={!canGoForward}
              onPress={() => changeDate(1)}
              style={[styles.dateArrow, !canGoForward && styles.dateArrowDisabled]}
            >
              <Ionicons color={canGoForward ? colors.textPrimary : colors.textMuted} name="chevron-forward" size={20} />
            </Pressable>
          </View>

          <View style={styles.summaryCard}>
            <View>
              <Text style={styles.summaryLabel}>Selected day total</Text>
              <Text style={styles.summaryValue}>{formatDuration(totalMinutes)}</Text>
            </View>
            <Text style={styles.summaryMeta}>
              {selectedEntry?.sessions.length ?? 0} session{(selectedEntry?.sessions.length ?? 0) === 1 ? '' : 's'}
            </Text>
          </View>
        </View>

        <ScrollView
          contentContainerStyle={styles.timelineScrollContent}
          showsVerticalScrollIndicator={false}
          style={styles.timelineScrollView}
        >
          <View style={styles.timelineCard}>
            {groupedTimeline.map(({ hour, sessions }) => (
              <View
                key={hour}
                onLayout={(event) => handleTimelineRowLayout(hour, event)}
                ref={(node) => {
                  timelineRowRefs.current[hour] = node;
                }}
                style={styles.timelineRow}
              >
                <View style={styles.timelineLine} />
                <View style={styles.hourColumn}>
                  <View
                    style={[
                      styles.hourBadge,
                      (createDraggedHoursSet.has(hour) || moveDraggedHoursSet.has(hour)) && styles.hourBadgeActive,
                    ]}
                  >
                    <View style={styles.hourBadgeContent}>
                      <Text adjustsFontSizeToFit numberOfLines={1} style={styles.hourMarker}>
                        {formatHourLabel(hour)}
                      </Text>
                      {isCurrentDate && currentHour === hour ? <View style={styles.hourCurrentDot} /> : null}
                    </View>
                  </View>
                </View>

                <View
                  style={[
                    styles.timelineContentColumn,
                    createDraggedHoursSet.has(hour) && styles.timelineContentColumnCreateActive,
                    moveDraggedHoursSet.has(hour) && styles.timelineContentColumnMoveActive,
                  ]}
                >
                  <View style={styles.timelineHeaderRow}>
                    {canEditSelectedDate ? (
                      <View {...getCreateDragHandlers(hour)}>
                        <Pressable
                          onPress={() =>
                            openModal(
                              hour,
                              '30',
                              getSuggestedStartMinute(selectedKey, hour, selectedEntry?.sessions ?? []),
                            )
                          }
                          style={[
                            styles.hourActionButton,
                            createDraggedHoursSet.has(hour) && styles.hourActionButtonActive,
                          ]}
                        >
                          <Ionicons color={colors.textPrimary} name="add" size={12} />
                        </Pressable>
                      </View>
                    ) : (
                      <View style={styles.hourActionSpacer} />
                    )}
                  </View>
                  {sessions.length ? (
                    <View style={styles.sessionList}>
                      {sessions.map((session) => (
                        <View key={session.id} {...getMoveDragHandlers(session)}>
                          <Pressable
                            style={[
                              styles.sessionCard,
                              moveDragState?.session.id === session.id && styles.sessionCardDragging,
                            ]}
                          >
                            <View style={styles.sessionDot} />
                            <View style={styles.sessionTextWrap}>
                              <Text style={styles.sessionTitle}>{session.minutes} min walk</Text>
                              <Text style={styles.sessionMeta}>
                                {formatSessionTimeRange(session.createdAt, session.minutes)}
                              </Text>
                            </View>
                            {canEditSelectedDate ? (
                              <View style={styles.sessionActions}>
                                <Pressable
                                  hitSlop={8}
                                  onPress={(event) => {
                                    event.stopPropagation();
                                    openEditModal(session);
                                  }}
                                  style={styles.sessionEditButton}
                                >
                                  <Ionicons color={colors.textPrimary} name="create-outline" size={16} />
                                </Pressable>
                                <Pressable
                                  hitSlop={8}
                                  onPress={(event) => {
                                    event.stopPropagation();
                                    confirmDeleteSession(session);
                                  }}
                                  style={styles.sessionDeleteButton}
                                >
                                  <Ionicons color={colors.textPrimary} name="trash-outline" size={16} />
                                </Pressable>
                              </View>
                            ) : null}
                          </Pressable>
                        </View>
                      ))}
                    </View>
                  ) : (
                    <View style={styles.emptyHourWrap} />
                  )}
                </View>
              </View>
            ))}
          </View>
        </ScrollView>
      </View>

      {canEditSelectedDate ? (
        <Pressable onPress={() => openModal()} style={styles.floatingBarWrap}>
          <View style={styles.floatingBar}>
            <Ionicons color={colors.textPrimary} name="add" size={22} />
            <Text style={styles.floatingBarText}>Add walking session</Text>
          </View>
        </Pressable>
      ) : null}

      {!isModalVisible && (toastItems.length || undoSessions?.length) ? (
        <View pointerEvents="box-none" style={styles.messageStackWrap}>
          {[...toastItems].reverse().map((toastItem) => renderToastCard(toastItem))}
          {undoSessions?.length ? (
            <View style={styles.undoCard}>
              <Text style={styles.undoText}>Session deleted</Text>
              <Pressable onPress={undoDelete} style={styles.undoButton}>
                <Text style={styles.undoButtonText}>Undo</Text>
              </Pressable>
            </View>
          ) : null}
        </View>
      ) : null}

      <Modal animationType="slide" onRequestClose={closeModal} transparent visible={isModalVisible}>
        <View style={styles.modalOverlay}>
          <Pressable onPress={closeModal} style={styles.modalDismissArea} />
          <View style={styles.modalSheet}>
            <View style={styles.modalHandle} />
            <Text style={styles.modalTitle}>{editingSession ? 'Edit walking session' : 'Add walking minutes'}</Text>
            <Text style={styles.modalSubtitle}>
              {editingSession
                ? 'Adjust the time or minutes for this walking session.'
                : 'Enter any positive minutes. Anything over 60 rolls into the next hour automatically.'}
            </Text>

            {latestWarningToast ? <View style={styles.modalToastWrap}>{renderToastCard(latestWarningToast)}</View> : null}

            <View style={styles.modalCounterCard}>
              <View style={styles.modalCounterInputRow}>
                <TextInput
                  keyboardType="number-pad"
                  onChangeText={(text) => setDraftMinutes(text.replace(/[^0-9]/g, ''))}
                  placeholder="0"
                  placeholderTextColor={colors.textMuted}
                  style={styles.modalCounterInput}
                  value={draftMinutes}
                />
                <Text style={styles.modalCounterUnit}>min</Text>
              </View>
              <View style={styles.timePickerRow}>
                <View style={styles.timePickerField}>
                  <Text style={styles.timePickerLabel}>Hour</Text>
                  <View style={styles.timeStepperRow}>
                    <Pressable hitSlop={8} onPress={() => shiftTargetHour(-1)} style={styles.timeAdjustButton}>
                      <Ionicons color={colors.textPrimary} name="remove" size={16} />
                    </Pressable>
                    <View style={styles.timeAdjustCenter}>
                      <Text adjustsFontSizeToFit numberOfLines={1} style={styles.timeAdjustLabel}>
                        {formatHourLabel(targetHour)}
                      </Text>
                    </View>
                    <Pressable hitSlop={8} onPress={() => shiftTargetHour(1)} style={styles.timeAdjustButton}>
                      <Ionicons color={colors.textPrimary} name="add" size={16} />
                    </Pressable>
                  </View>
                </View>

                <View style={styles.timePickerField}>
                  <Text style={styles.timePickerLabel}>Minute</Text>
                  <View style={styles.timeStepperRow}>
                    <Pressable hitSlop={8} onPress={() => shiftTargetMinute(-1)} style={styles.timeAdjustButton}>
                      <Ionicons color={colors.textPrimary} name="remove" size={16} />
                    </Pressable>
                    <View style={styles.timeAdjustCenter}>
                      <Text style={styles.timeAdjustLabel}>{String(targetMinute).padStart(2, '0')}</Text>
                    </View>
                    <Pressable hitSlop={8} onPress={() => shiftTargetMinute(1)} style={styles.timeAdjustButton}>
                      <Ionicons color={colors.textPrimary} name="add" size={16} />
                    </Pressable>
                  </View>
                </View>
              </View>
              <Text style={styles.modalCounterMeta}>
                For {formatReadableDate(selectedDate)} ·{' '}
                {formatDateKeyTimeRange(selectedKey, targetHour, targetMinute, Math.max(getPositiveMinutes(draftMinutes), 1))}
              </Text>
            </View>

            <View style={styles.adjustRow}>
              {[-5, 5].map((delta) => (
                <Pressable
                  key={delta}
                  onPress={() =>
                    setDraftMinutes((currentMinutes) =>
                      String(clampMinutes(getPositiveMinutes(currentMinutes || '0') + delta)),
                    )
                  }
                  style={styles.adjustButton}
                >
                  <Text style={styles.adjustButtonText}>{delta > 0 ? `+${delta}` : delta} min</Text>
                </Pressable>
              ))}
            </View>

            <View style={styles.quickWrap}>
              {QUICK_MINUTES.map((value) => {
                const active = value === getPositiveMinutes(draftMinutes);

                return (
                  <Pressable
                    key={value}
                    onPress={() => setDraftMinutes(String(value))}
                    style={[styles.quickChip, active && styles.quickChipActive]}
                  >
                    <Text style={[styles.quickChipText, active && styles.quickChipTextActive]}>{value} min</Text>
                  </Pressable>
                );
              })}
            </View>

            <View style={styles.modalActionRow}>
              <Pressable onPress={closeModal} style={styles.cancelButton}>
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </Pressable>
              <Pressable onPress={saveMinutes} style={styles.saveButtonWrap}>
                <LinearGradient colors={[colors.actionSurface, colors.actionSurface]} end={{ x: 1, y: 1 }} start={{ x: 0, y: 0 }} style={styles.saveButton}>
                  <Ionicons color={colors.textPrimary} name={editingSession ? 'create-outline' : 'checkmark-circle'} size={22} />
                  <Text style={styles.saveButtonText}>{editingSession ? 'Save changes' : 'Add session'}</Text>
                </LinearGradient>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      <Modal animationType="fade" onRequestClose={closeDeleteDialog} transparent visible={Boolean(sessionPendingDelete)}>
        <View style={styles.dialogOverlay}>
          <Pressable onPress={closeDeleteDialog} style={styles.dialogDismissArea} />
          <View style={styles.dialogCard}>
            <View style={styles.dialogIconWrap}>
              <Ionicons color={colors.textPrimary} name="trash-outline" size={18} />
            </View>
            <Text style={styles.dialogTitle}>Delete walking session?</Text>
            <Text style={styles.dialogText}>
              {pendingDeleteSessions.length > 1
                ? `This walking session spans ${pendingDeleteSessions.length} linked entries across multiple hours. Deleting it will remove all of them.`
                : 'This removes the selected walking session.'}
            </Text>

            <View style={styles.dialogActions}>
              <Pressable onPress={closeDeleteDialog} style={styles.dialogSecondaryButton}>
                <Text style={styles.dialogSecondaryText}>Cancel</Text>
              </Pressable>
              <Pressable onPress={handleDeleteSession} style={styles.dialogPrimaryButton}>
                <Text style={styles.dialogPrimaryText}>Delete</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}
