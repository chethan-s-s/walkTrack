import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  LayoutChangeEvent,
  Modal,
  PanResponder,
  Pressable,
  ScrollView,
  Text,
  View,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

import GoalProgressRing from '../../components/GoalProgressRing';
import { useTimelineHours } from '../../hooks/useTimelineHours';
import { useAppSettings } from '../../context/AppSettingsContext';
import { useWalkingData } from '../../context/WalkingDataContext';
import { getDateKey } from '../../storage/walkingStorage';
import { useAppColors } from '../../theme/useAppColors';
import { WalkingSession } from '../../types';
import { formatDuration } from '../../utils/formatDuration';
import {
  buildSessionSegments,
  doesTimeRangeCollide,
  formatDateKeyTimeRange,
  formatReadableDate,
  formatTimeLabel,
  getDefaultTargetHour,
  getHourRange,
  getHoursForMinutes,
  getSuggestedStartMinute,
  normalizeHour,
  normalizeMinute,
} from '../../utils/time';
import AddTimeline from './components/AddTimeline';
import SessionModal from './components/SessionModal';
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
const getDefaultTargetMinute = () => new Date().getMinutes();

const getPositiveMinutes = (value: string) => {
  const numericValue = Number.parseInt(value, 10);

  if (Number.isNaN(numericValue) || numericValue < 1) {
    return 0;
  }

  return numericValue;
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
  const { defaultTargetHour, visibleHours } = useTimelineHours(
    settings.timelineStartHour,
    settings.timelineEndHour,
  );
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [draftMinutes, setDraftMinutes] = useState('30');
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [sessionPendingDelete, setSessionPendingDelete] = useState<WalkingSession | null>(null);
  const [editingSession, setEditingSession] = useState<WalkingSession | null>(null);
  const [undoSessions, setUndoSessions] = useState<WalkingSession[] | null>(null);
  const [targetHour, setTargetHour] = useState(() => defaultTargetHour);
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
  const averageSessionLength = useMemo(() => {
    const sessions = selectedEntry?.sessions ?? [];

    if (!sessions.length) {
      return 0;
    }

    return Math.round(sessions.reduce((total, session) => total + session.minutes, 0) / sessions.length);
  }, [selectedEntry?.sessions]);
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
      setTargetHour(defaultTargetHour);
    }
  }, [defaultTargetHour, targetHour, visibleHours]);

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
    setTargetHour((currentValue) => {
      const currentIndex = visibleHours.indexOf(currentValue);

      if (currentIndex === -1) {
        return defaultTargetHour;
      }

      const nextIndex = (currentIndex + delta + visibleHours.length) % visibleHours.length;
      return visibleHours[nextIndex] ?? currentValue;
    });
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

    const startMinute = getSuggestedStartMinute(selectedHours[0], selectedEntry?.sessions ?? []);
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
              <Pressable
                accessibilityLabel="Go to previous day"
                accessibilityRole="button"
                onPress={() => changeDate(-1)}
                style={styles.dateArrow}
              >
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
              accessibilityLabel="Go to next day"
              accessibilityRole="button"
              disabled={!canGoForward}
              onPress={() => changeDate(1)}
              style={[styles.dateArrow, !canGoForward && styles.dateArrowDisabled]}
            >
              <Ionicons color={canGoForward ? colors.textPrimary : colors.textMuted} name="chevron-forward" size={20} />
            </Pressable>
          </View>

          <View style={styles.summaryCard}>
            <View style={styles.summaryValueWrap}>
              <Text style={styles.summaryLabel}>Selected day total</Text>
              <Text style={styles.summaryValue}>{formatDuration(totalMinutes)}</Text>
            </View>
            <View style={styles.summaryRingWrap}>
              <GoalProgressRing
                colors={colors}
                goal={settings.dailyGoalMinutes}
                label={`${Math.round((totalMinutes / settings.dailyGoalMinutes) * 100) || 0}%`}
                progressColor={totalMinutes >= settings.dailyGoalMinutes ? colors.success : undefined}
                sublabel="goal"
                value={totalMinutes}
              />
            </View>
            <View style={styles.summaryMetaWrap}>
              <Text style={styles.summaryMeta}>
                {selectedEntry?.sessions.length ?? 0} session{(selectedEntry?.sessions.length ?? 0) === 1 ? '' : 's'}
              </Text>
              <Text style={styles.summaryMetaSecondary}>
                Avg {averageSessionLength ? formatDuration(averageSessionLength) : '—'}
              </Text>
            </View>
          </View>
        </View>

        <ScrollView
          contentContainerStyle={styles.timelineScrollContent}
          showsVerticalScrollIndicator={false}
          style={styles.timelineScrollView}
        >
          <AddTimeline
            canEditSelectedDate={canEditSelectedDate}
            colors={colors}
            createDraggedHoursSet={createDraggedHoursSet}
            currentHour={currentHour}
            getCreateDragHandlers={getCreateDragHandlers}
            getMoveDragHandlers={getMoveDragHandlers}
            groupedTimeline={groupedTimeline}
            isCurrentDate={isCurrentDate}
            moveDraggedHoursSet={moveDraggedHoursSet}
            moveDragSessionId={moveDragState?.session.id}
            onConfirmDelete={confirmDeleteSession}
            onOpenEditModal={openEditModal}
            onOpenModal={openModal}
            onRowLayout={handleTimelineRowLayout}
            selectedSessions={selectedEntry?.sessions ?? []}
            setRowRef={(hour, node) => {
              timelineRowRefs.current[hour] = node;
            }}
            styles={styles}
          />
        </ScrollView>
      </View>

      {canEditSelectedDate ? (
        <Pressable accessibilityLabel="Add walking session" accessibilityRole="button" onPress={() => openModal()} style={styles.floatingBarWrap}>
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
              <Pressable accessibilityLabel="Undo delete" accessibilityRole="button" onPress={undoDelete} style={styles.undoButton}>
                <Text style={styles.undoButtonText}>Undo</Text>
              </Pressable>
            </View>
          ) : null}
        </View>
      ) : null}

      <SessionModal
        clampMinutes={clampMinutes}
        colors={colors}
        draftMinutes={draftMinutes}
        editingSession={editingSession}
        getPositiveMinutes={getPositiveMinutes}
        onChangeDraftMinutes={setDraftMinutes}
        onClose={closeModal}
        onSave={saveMinutes}
        onShiftTargetHour={shiftTargetHour}
        onShiftTargetMinute={shiftTargetMinute}
        quickMinutes={QUICK_MINUTES}
        selectedDate={selectedDate}
        selectedKey={selectedKey}
        styles={styles}
        targetHour={targetHour}
        targetMinute={targetMinute}
        visible={isModalVisible}
        warningToast={latestWarningToast ? renderToastCard(latestWarningToast) : undefined}
      />

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
              <Pressable accessibilityRole="button" onPress={closeDeleteDialog} style={styles.dialogSecondaryButton}>
                <Text style={styles.dialogSecondaryText}>Cancel</Text>
              </Pressable>
              <Pressable accessibilityRole="button" onPress={handleDeleteSession} style={styles.dialogPrimaryButton}>
                <Text style={styles.dialogPrimaryText}>Delete</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}
