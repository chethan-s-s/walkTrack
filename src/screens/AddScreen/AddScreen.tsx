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

import { useWalkingData } from '../../context/WalkingDataContext';
import { getDateKey } from '../../storage/walkingStorage';
import { useAppColors } from '../../theme/useAppColors';
import { WalkingSession } from '../../types';
import { formatDuration } from '../../utils/formatDuration';
import { createStyles } from './AddScreenStyles';

const QUICK_MINUTES = [10, 20, 30];
const HOUR_ROWS = [...Array.from({ length: 18 }, (_, index) => index + 6), 0];
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

const clampMinutes = (minutes: number) => Math.max(5, Math.min(240, minutes));

const getPositiveMinutes = (value: string) => {
  const numericValue = Number.parseInt(value, 10);

  if (Number.isNaN(numericValue) || numericValue < 1) {
    return 0;
  }

  return numericValue;
};

const splitMinutesAcrossHours = (totalMinutes: number, startingHour: number) => {
  const segments: Array<{ hour: number; minutes: number }> = [];
  let remainingMinutes = totalMinutes;
  let currentHour = startingHour;

  while (remainingMinutes > 0) {
    const segmentMinutes = Math.min(remainingMinutes, 60);
    segments.push({ hour: currentHour, minutes: segmentMinutes });
    remainingMinutes -= segmentMinutes;
    currentHour = (currentHour + 1) % 24;
  }

  return segments;
};

const getHourRange = (startHour: number, endHour: number) => {
  const startIndex = HOUR_ROWS.indexOf(startHour);
  const endIndex = HOUR_ROWS.indexOf(endHour);

  if (startIndex === -1 || endIndex === -1) {
    return [] as number[];
  }

  const [rangeStart, rangeEnd] = startIndex <= endIndex ? [startIndex, endIndex] : [endIndex, startIndex];
  return HOUR_ROWS.slice(rangeStart, rangeEnd + 1);
};

const getHoursForMinutes = (minutes: number, startingHour: number) =>
  splitMinutesAcrossHours(minutes, startingHour).map((segment) => segment.hour);

const getOccupiedHours = (sessions: WalkingSession[]) =>
  new Set(sessions.map((session) => new Date(session.createdAt).getHours()));

const formatReadableDate = (date: Date) =>
  getDateKey(date) === getDateKey()
    ? 'Today'
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

const getDefaultTargetHour = () => {
  const currentHour = new Date().getHours();

  if (currentHour < 6) {
    return 6;
  }

  return currentHour;
};

export default function AddScreen() {
  const colors = useAppColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const {
    deleteWalkingSession,
    getEntryForDate,
    restoreWalkingSessions,
    saveWalkingSession,
    updateWalkingSession,
  } = useWalkingData();
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [draftMinutes, setDraftMinutes] = useState('30');
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [sessionPendingDelete, setSessionPendingDelete] = useState<WalkingSession | null>(null);
  const [editingSession, setEditingSession] = useState<WalkingSession | null>(null);
  const [undoSessions, setUndoSessions] = useState<WalkingSession[] | null>(null);
  const [targetHour, setTargetHour] = useState(getDefaultTargetHour());
  const [toastState, setToastState] = useState<{
    message: string;
    type: 'success' | 'warning';
  } | null>(null);
  const [rowMeasurements, setRowMeasurements] = useState<Record<number, TimelineRowMeasurement>>({});
  const [createDragState, setCreateDragState] = useState<CreateDragState | null>(null);
  const [moveDragState, setMoveDragState] = useState<MoveDragState | null>(null);
  const timelineRowRefs = useRef<Record<number, View | null>>({});
  const createDragRef = useRef<CreateDragState | null>(null);
  const moveDragRef = useRef<MoveDragState | null>(null);

  const selectedKey = useMemo(() => getDateKey(selectedDate), [selectedDate]);
  const isCurrentDate = selectedKey === getDateKey();
  const canEditSelectedDate = selectedKey <= getDateKey();
  const canGoForward = !isCurrentDate;
  const selectedEntry = getEntryForDate(selectedKey);
  const totalMinutes = selectedEntry?.totalMinutes ?? 0;
  const occupiedHours = useMemo(
    () => getOccupiedHours(selectedEntry?.sessions ?? []),
    [selectedEntry?.sessions],
  );

  const groupedTimeline = useMemo(() => {
    const groups = new Map<number, WalkingSession[]>();

    selectedEntry?.sessions.forEach((session) => {
      const hour = new Date(session.createdAt).getHours();
      const existingSessions = groups.get(hour) ?? [];
      groups.set(hour, [...existingSessions, session]);
    });

    return HOUR_ROWS.map((hour) => ({
      hour,
      sessions: groups.get(hour) ?? [],
    }));
  }, [selectedEntry]);

  const setCreateDrag = (nextDragState: CreateDragState | null) => {
    createDragRef.current = nextDragState;
    setCreateDragState(nextDragState);
  };

  const setMoveDrag = (nextDragState: MoveDragState | null) => {
    moveDragRef.current = nextDragState;
    setMoveDragState(nextDragState);
  };

  const createDraggedHours = useMemo(
    () => (createDragState ? getHourRange(createDragState.startHour, createDragState.currentHour) : []),
    [createDragState],
  );
  const moveDraggedHours = useMemo(
    () => (moveDragState ? getHoursForMinutes(moveDragState.session.minutes, moveDragState.currentHour) : []),
    [moveDragState],
  );
  const createDraggedHoursSet = useMemo(() => new Set(createDraggedHours), [createDraggedHours]);
  const moveDraggedHoursSet = useMemo(() => new Set(moveDraggedHours), [moveDraggedHours]);

  useEffect(() => {
    if (!toastState) {
      return undefined;
    }

    const timeout = setTimeout(() => {
      setToastState(null);
    }, 2200);

    return () => clearTimeout(timeout);
  }, [toastState]);

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
  }, [selectedKey]);

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
    const measuredRows = HOUR_ROWS.flatMap((hour) => {
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
    setToastState({
      message,
      type: 'warning',
    });
    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
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
    void Haptics.selectionAsync();
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
    void Haptics.selectionAsync();
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

  const openModal = (hour = getDefaultTargetHour(), minutes = '30') => {
    if (!canEditSelectedDate) {
      return;
    }

    setToastState(null);
    setEditingSession(null);
    setTargetHour(hour);
    setDraftMinutes(minutes);
    setIsModalVisible(true);
  };

  const openEditModal = (session: WalkingSession) => {
    if (!canEditSelectedDate) {
      return;
    }

    setToastState(null);
    setEditingSession(session);
    setTargetHour(new Date(session.createdAt).getHours());
    setDraftMinutes(String(session.minutes));
    setIsModalVisible(true);
  };

  const closeModal = () => {
    setToastState(null);
    setEditingSession(null);
    setIsModalVisible(false);
  };

  const finalizeCreateDrag = async () => {
    const activeDrag = createDragRef.current;
    setCreateDrag(null);

    if (!activeDrag) {
      return;
    }

    const selectedHours = getHourRange(activeDrag.startHour, activeDrag.currentHour);

    if (!selectedHours.length) {
      openModal(activeDrag.startHour);
      return;
    }

    const hasOverlap = selectedHours.some((hour) => occupiedHours.has(hour));

    if (hasOverlap) {
      await showWarningToast('A walking session already exists in one or more of those hourly slots.');
      return;
    }

    openModal(selectedHours[0], String(selectedHours.length * 60));
    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
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

    const targetHours = getHoursForMinutes(activeDrag.session.minutes, activeDrag.currentHour);
    const occupiedHoursForValidation = new Set(
      (selectedEntry?.sessions ?? [])
        .filter((session) => session.id !== activeDrag.session.id)
        .map((session) => new Date(session.createdAt).getHours()),
    );
    const hasOverlap = targetHours.some((hour) => occupiedHoursForValidation.has(hour));

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
    );
    setToastState({
      message: `Moved to ${formatHourLabel(activeDrag.currentHour)}.`,
      type: 'success',
    });
    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  };

  const getCreateDragHandlers = (hour: number) =>
    canEditSelectedDate
      ? PanResponder.create({
          onMoveShouldSetPanResponder: (_event, gestureState) =>
            Math.abs(gestureState.dy) > DRAG_ACTIVATION_DISTANCE,
          onPanResponderGrant: (_event, gestureState) => {
            setToastState(null);
            setCreateDrag({
              startHour: hour,
              currentHour: getHourFromPageY(gestureState.moveY) ?? hour,
            });
            void Haptics.selectionAsync();
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

            setToastState(null);
            setMoveDrag({
              session,
              originHour,
              currentHour: getHourFromPageY(gestureState.moveY) ?? originHour,
            });
            void Haptics.selectionAsync();
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
    setToastState({
      message: 'Walking session deleted.',
      type: 'success',
    });
    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
  };

  const undoDelete = async () => {
    if (!undoSessions?.length) {
      return;
    }

    await restoreWalkingSessions(undoSessions);
    setUndoSessions(null);
    setToastState({
      message: 'Walking session restored.',
      type: 'success',
    });
    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  };

  const renderToastCard = () =>
    toastState ? (
      <View style={[styles.toastCard, toastState.type === 'warning' && styles.toastCardWarning]}>
        <Ionicons
          color={colors.textPrimary}
          name={toastState.type === 'warning' ? 'alert-circle-outline' : 'checkmark-circle'}
          size={18}
        />
        <Text style={styles.toastText}>{toastState.message}</Text>
      </View>
    ) : null;

  const saveMinutes = async () => {
    if (!canEditSelectedDate) {
      return;
    }

    const parsedMinutes = getPositiveMinutes(draftMinutes);

    if (parsedMinutes < 1) {
      setToastState({
        message: 'Please enter a positive number of walking minutes.',
        type: 'warning',
      });
      return;
    }

    const occupiedHoursForValidation = new Set(
      (selectedEntry?.sessions ?? [])
        .filter((session) => session.id !== editingSession?.id)
        .map((session) => new Date(session.createdAt).getHours()),
    );
    const hourSegments = splitMinutesAcrossHours(parsedMinutes, targetHour);
    const hasOverlap = hourSegments.some((segment) => occupiedHoursForValidation.has(segment.hour));

    if (hasOverlap) {
      setToastState({
        message: 'A walking session already exists in one or more of those hourly slots.',
        type: 'warning',
      });
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      return;
    }

    if (editingSession) {
      await updateWalkingSession(selectedKey, editingSession.id, selectedKey, parsedMinutes, targetHour);
      closeModal();
      setToastState({
        message: `Updated to ${parsedMinutes} min at ${formatHourLabel(targetHour)}.`,
        type: 'success',
      });
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      return;
    }

    const batchId = `${selectedKey}-${targetHour}-${Date.now()}`;

    for (const segment of hourSegments) {
      await saveWalkingSession(selectedKey, segment.minutes, segment.hour, batchId);
    }

    closeModal();
    setToastState({
      message: `Added ${parsedMinutes} min starting at ${formatHourLabel(targetHour)}.`,
      type: 'success',
    });
    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.dateRow}>
          <Pressable onPress={() => changeDate(-1)} style={styles.dateArrow}>
            <Ionicons color={colors.textPrimary} name="chevron-back" size={20} />
          </Pressable>
          <View style={styles.datePill}>
            <Text style={styles.dateLabel}>{formatReadableDate(selectedDate)}</Text>
            <Text style={styles.dateSubLabel}>{selectedKey}</Text>
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
                  <Text adjustsFontSizeToFit numberOfLines={1} style={styles.hourMarker}>
                    {formatHourLabel(hour)}
                  </Text>
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
                        onPress={() => openModal(hour)}
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
                          onPress={() => openEditModal(session)}
                          style={[
                            styles.sessionCard,
                            moveDragState?.session.id === session.id && styles.sessionCardDragging,
                          ]}
                        >
                          <View style={styles.sessionDot} />
                          <View style={styles.sessionTextWrap}>
                            <Text style={styles.sessionTitle}>{session.minutes} min walk</Text>
                            <Text style={styles.sessionMeta}>{formatSessionTime(session.createdAt)}</Text>
                          </View>
                          {canEditSelectedDate ? (
                            <Pressable
                              onPress={(event) => {
                                event.stopPropagation();
                                confirmDeleteSession(session);
                              }}
                              style={styles.sessionDeleteButton}
                            >
                              <Ionicons color={colors.textPrimary} name="trash-outline" size={14} />
                            </Pressable>
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

      {canEditSelectedDate ? (
        <Pressable onPress={() => openModal()} style={styles.floatingBarWrap}>
          <View style={styles.floatingBar}>
            <Ionicons color={colors.textPrimary} name="add" size={22} />
            <Text style={styles.floatingBarText}>Add walking session</Text>
          </View>
        </Pressable>
      ) : null}

      {toastState && !isModalVisible ? (
        <View pointerEvents="none" style={styles.toastWrap}>
          {renderToastCard()}
        </View>
      ) : null}

      {undoSessions?.length ? (
        <View style={styles.undoWrap}>
          <View style={styles.undoCard}>
            <Text style={styles.undoText}>Session deleted</Text>
            <Pressable onPress={undoDelete} style={styles.undoButton}>
              <Text style={styles.undoButtonText}>Undo</Text>
            </Pressable>
          </View>
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

            {toastState?.type === 'warning' ? <View style={styles.modalToastWrap}>{renderToastCard()}</View> : null}

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
              <View style={styles.timeAdjustRow}>
                <Pressable onPress={() => setTargetHour((currentHour) => (currentHour + 23) % 24)} style={styles.timeAdjustButton}>
                  <Ionicons color={colors.textPrimary} name="remove" size={16} />
                </Pressable>
                <View style={styles.timeAdjustCenter}>
                  <Text style={styles.timeAdjustLabel}>{formatHourLabel(targetHour)}</Text>
                  <Text style={styles.timeAdjustMeta}>Start time</Text>
                </View>
                <Pressable onPress={() => setTargetHour((currentHour) => (currentHour + 1) % 24)} style={styles.timeAdjustButton}>
                  <Ionicons color={colors.textPrimary} name="add" size={16} />
                </Pressable>
              </View>
              <Text style={styles.modalCounterMeta}>For {formatReadableDate(selectedDate)} at {formatHourLabel(targetHour)}</Text>
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
              This removes the selected session. Multi-hour sessions added together will be removed together.
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
