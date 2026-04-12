import React, { useEffect, useMemo, useState } from 'react';
import {
  Modal,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

import { useWalkingData } from '../../context/WalkingDataContext';
import { getDateKey } from '../../storage/walkingStorage';
import { WalkingSession } from '../../types';
import { formatDuration } from '../../utils/formatDuration';
import { styles } from './AddScreenStyles';

const QUICK_MINUTES = [10, 20, 30];
const HOUR_ROWS = [...Array.from({ length: 18 }, (_, index) => index + 6), 0];

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
  const { deleteWalkingSession, getEntryForDate, saveWalkingSession } = useWalkingData();
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [draftMinutes, setDraftMinutes] = useState('30');
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [sessionPendingDelete, setSessionPendingDelete] = useState<WalkingSession | null>(null);
  const [targetHour, setTargetHour] = useState(getDefaultTargetHour());
  const [toastState, setToastState] = useState<{
    message: string;
    type: 'success' | 'warning';
  } | null>(null);

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

  useEffect(() => {
    if (!toastState) {
      return undefined;
    }

    const timeout = setTimeout(() => {
      setToastState(null);
    }, 2200);

    return () => clearTimeout(timeout);
  }, [toastState]);

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

  const openModal = (hour = getDefaultTargetHour()) => {
    if (!canEditSelectedDate) {
      return;
    }

    setToastState(null);
    setTargetHour(hour);
    setDraftMinutes('30');
    setIsModalVisible(true);
  };

  const closeModal = () => {
    setToastState(null);
    setIsModalVisible(false);
  };

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

    await deleteWalkingSession(selectedKey, sessionPendingDelete);
    setSessionPendingDelete(null);
    setToastState({
      message: 'Walking session deleted.',
      type: 'success',
    });
  };

  const renderToastCard = () =>
    toastState ? (
      <View style={[styles.toastCard, toastState.type === 'warning' && styles.toastCardWarning]}>
        <Ionicons
          color="#fafafa"
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

    const hourSegments = splitMinutesAcrossHours(parsedMinutes, targetHour);
    const hasOverlap = hourSegments.some((segment) => occupiedHours.has(segment.hour));

    if (hasOverlap) {
      setToastState({
        message: 'A walking session already exists in one or more of those hourly slots.',
        type: 'warning',
      });
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
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.dateRow}>
          <Pressable onPress={() => changeDate(-1)} style={styles.dateArrow}>
            <Ionicons color="#f8fafc" name="chevron-back" size={20} />
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
            <Ionicons color={canGoForward ? '#f8fafc' : '#71717a'} name="chevron-forward" size={20} />
          </Pressable>
        </View>

        <View style={styles.summaryCard}>
          <View>
            <Text style={styles.summaryLabel}>Selected day total</Text>
            <Text style={styles.summaryValue}>{formatDuration(totalMinutes)}</Text>
          </View>
          <Text style={styles.summaryMeta}>{selectedEntry?.sessions.length ?? 0} sessions</Text>
        </View>

        <View style={styles.timelineCard}>
          {groupedTimeline.map(({ hour, sessions }) => (
            <View key={hour} style={styles.timelineRow}>
              <View style={styles.timelineLine} />
              <View style={styles.hourColumn}>
                <View style={styles.hourBadge}>
                  <Text adjustsFontSizeToFit numberOfLines={1} style={styles.hourMarker}>
                    {formatHourLabel(hour)}
                  </Text>
                </View>
              </View>

              <View style={styles.timelineContentColumn}>
                <View style={styles.timelineHeaderRow}>
                  {canEditSelectedDate ? (
                    <Pressable onPress={() => openModal(hour)} style={styles.hourActionButton}>
                      <Ionicons color="#fafafa" name="add" size={12} />
                    </Pressable>
                  ) : (
                    <View style={styles.hourActionSpacer} />
                  )}
                </View>
                {sessions.length ? (
                  <View style={styles.sessionList}>
                    {sessions.map((session) => (
                      <View key={session.id} style={styles.sessionCard}>
                        <View style={styles.sessionDot} />
                        <View style={styles.sessionTextWrap}>
                          <Text style={styles.sessionTitle}>{session.minutes} min walk</Text>
                          <Text style={styles.sessionMeta}>{formatSessionTime(session.createdAt)}</Text>
                        </View>
                        {canEditSelectedDate ? (
                          <Pressable onPress={() => confirmDeleteSession(session)} style={styles.sessionDeleteButton}>
                            <Ionicons color="#fafafa" name="trash-outline" size={14} />
                          </Pressable>
                        ) : null}
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
            <Ionicons color="#fafafa" name="add" size={22} />
            <Text style={styles.floatingBarText}>Add walking session</Text>
          </View>
        </Pressable>
      ) : null}

      {toastState && !isModalVisible ? (
        <View pointerEvents="none" style={styles.toastWrap}>
          {renderToastCard()}
        </View>
      ) : null}

      <Modal animationType="slide" onRequestClose={closeModal} transparent visible={isModalVisible}>
        <View style={styles.modalOverlay}>
          <Pressable onPress={closeModal} style={styles.modalDismissArea} />
          <View style={styles.modalSheet}>
            <View style={styles.modalHandle} />
            <Text style={styles.modalTitle}>Add walking minutes</Text>
            <Text style={styles.modalSubtitle}>Enter any positive minutes. Anything over 60 rolls into the next hour automatically.</Text>

            {toastState?.type === 'warning' ? <View style={styles.modalToastWrap}>{renderToastCard()}</View> : null}

            <View style={styles.modalCounterCard}>
              <View style={styles.modalCounterInputRow}>
                <TextInput
                  keyboardType="number-pad"
                  onChangeText={(text) => setDraftMinutes(text.replace(/[^0-9]/g, ''))}
                  placeholder="0"
                  placeholderTextColor="#71717a"
                  style={styles.modalCounterInput}
                  value={draftMinutes}
                />
                <Text style={styles.modalCounterUnit}>min</Text>
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
                <LinearGradient colors={["#323232", "#323232"]} end={{ x: 1, y: 1 }} start={{ x: 0, y: 0 }} style={styles.saveButton}>
                  <Ionicons color="#fafafa" name="checkmark-circle" size={22} />
                  <Text style={styles.saveButtonText}>Add session</Text>
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
              <Ionicons color="#fafafa" name="trash-outline" size={18} />
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
