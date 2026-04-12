import React, { useMemo, useState } from 'react';
import {
  Alert,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

import { getDateKey } from '../storage/walkingStorage';
import { useWalkingData } from '../context/WalkingDataContext';
import { WalkingSession } from '../types';

const QUICK_MINUTES = [10, 15, 20, 30, 45, 60, 90];
const HOUR_ROWS = Array.from({ length: 24 }, (_, index) => 23 - index);

const clampMinutes = (minutes: number) => Math.max(5, Math.min(240, minutes));

const formatReadableDate = (date: Date) =>
  date.toLocaleDateString('en-US', {
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

export default function AddScreen() {
  const { getEntryForDate, saveWalkingSession } = useWalkingData();
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [draftMinutes, setDraftMinutes] = useState(30);
  const [isModalVisible, setIsModalVisible] = useState(false);

  const selectedKey = useMemo(() => getDateKey(selectedDate), [selectedDate]);
  const selectedEntry = getEntryForDate(selectedKey);
  const totalMinutes = selectedEntry?.totalMinutes ?? 0;

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

  const changeDate = (direction: -1 | 1) => {
    setSelectedDate((currentDate) => {
      const nextDate = new Date(currentDate);
      nextDate.setDate(nextDate.getDate() + direction);
      return nextDate;
    });
  };

  const openModal = () => {
    setDraftMinutes(30);
    setIsModalVisible(true);
  };

  const closeModal = () => {
    setIsModalVisible(false);
  };

  const saveMinutes = async () => {
    await saveWalkingSession(selectedKey, draftMinutes);
    closeModal();
    Alert.alert('Saved', `Logged ${draftMinutes} minutes for ${formatReadableDate(selectedDate)}.`);
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={styles.eyebrow}>Add walk</Text>
        <Text style={styles.title}>Build your day, one walking entry at a time.</Text>
        <Text style={styles.subtitle}>
          I could not inspect the local image file directly here, so I matched your description with a timeline-style layout and a bottom modal flow.
        </Text>

        <View style={styles.dateRow}>
          <Pressable onPress={() => changeDate(-1)} style={styles.dateArrow}>
            <Ionicons color="#f8fafc" name="chevron-back" size={20} />
          </Pressable>
          <View style={styles.datePill}>
            <Text style={styles.dateLabel}>{formatReadableDate(selectedDate)}</Text>
            <Text style={styles.dateSubLabel}>{selectedKey}</Text>
          </View>
          <Pressable onPress={() => changeDate(1)} style={styles.dateArrow}>
            <Ionicons color="#f8fafc" name="chevron-forward" size={20} />
          </Pressable>
        </View>

        <View style={styles.summaryCard}>
          <View>
            <Text style={styles.summaryLabel}>Selected day total</Text>
            <Text style={styles.summaryValue}>{totalMinutes} min</Text>
          </View>
          <Text style={styles.summaryMeta}>{selectedEntry?.sessions.length ?? 0} sessions</Text>
        </View>

        <View style={styles.timelineCard}>
          {groupedTimeline.map(({ hour, sessions }) => (
            <View key={hour} style={styles.timelineRow}>
              <View style={styles.hourColumn}>
                <Text style={styles.hourMarker}>{formatHourLabel(hour)}</Text>
              </View>

              <View style={styles.timelineContentColumn}>
                <View style={styles.timelineLine} />
                {sessions.length ? (
                  sessions.map((session) => (
                    <View key={session.id} style={styles.sessionCard}>
                      <View style={styles.sessionDot} />
                      <View style={styles.sessionTextWrap}>
                        <Text style={styles.sessionTitle}>{session.minutes} min walk</Text>
                        <Text style={styles.sessionMeta}>{formatSessionTime(session.createdAt)}</Text>
                      </View>
                    </View>
                  ))
                ) : (
                  <View style={styles.emptyHourWrap}>
                    <View style={styles.emptyHourDot} />
                  </View>
                )}
              </View>
            </View>
          ))}
        </View>
      </ScrollView>

      <Pressable onPress={openModal} style={styles.floatingBarWrap}>
        <View style={styles.floatingBar}>
          <Ionicons color="#fafafa" name="add" size={22} />
          <Text style={styles.floatingBarText}>Add walking session</Text>
        </View>
      </Pressable>

      <Modal animationType="slide" onRequestClose={closeModal} transparent visible={isModalVisible}>
        <View style={styles.modalOverlay}>
          <Pressable onPress={closeModal} style={styles.modalDismissArea} />
          <View style={styles.modalSheet}>
            <View style={styles.modalHandle} />
            <Text style={styles.modalTitle}>Add walking minutes</Text>
            <Text style={styles.modalSubtitle}>Entries are added to the current hour with the current minute.</Text>

            <View style={styles.modalCounterCard}>
              <Text style={styles.modalCounterValue}>{draftMinutes} min</Text>
              <Text style={styles.modalCounterMeta}>For {formatReadableDate(selectedDate)}</Text>
            </View>

            <View style={styles.adjustRow}>
              {[-15, -5, 5, 15].map((delta) => (
                <Pressable
                  key={delta}
                  onPress={() => setDraftMinutes((currentMinutes) => clampMinutes(currentMinutes + delta))}
                  style={styles.adjustButton}
                >
                  <Text style={styles.adjustButtonText}>{delta > 0 ? `+${delta}` : delta} min</Text>
                </Pressable>
              ))}
            </View>

            <View style={styles.quickWrap}>
              {QUICK_MINUTES.map((value) => {
                const active = value === draftMinutes;

                return (
                  <Pressable
                    key={value}
                    onPress={() => setDraftMinutes(value)}
                    style={[styles.quickChip, active && styles.quickChipActive]}
                  >
                    <Text style={[styles.quickChipText, active && styles.quickChipTextActive]}>{value} min</Text>
                  </Pressable>
                );
              })}
            </View>

            <Pressable onPress={saveMinutes}>
              <LinearGradient colors={["#fafafa", "#a1a1aa"]} end={{ x: 1, y: 1 }} start={{ x: 0, y: 0 }} style={styles.saveButton}>
                <Ionicons color="#09090b" name="checkmark-circle" size={22} />
                <Text style={styles.saveButtonText}>Add session</Text>
              </LinearGradient>
            </Pressable>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#09090b',
  },
  content: {
    padding: 20,
    paddingBottom: 132,
    gap: 20,
  },
  eyebrow: {
    color: '#d4d4d8',
    fontSize: 13,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 1.2,
  },
  title: {
    color: '#f8fafc',
    fontSize: 30,
    lineHeight: 36,
    fontWeight: '800',
  },
  subtitle: {
    color: '#a1a1aa',
    fontSize: 15,
    lineHeight: 22,
  },
  summaryCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#111113',
    borderRadius: 24,
    padding: 18,
    borderWidth: 1,
    borderColor: '#27272a',
    gap: 12,
  },
  summaryLabel: {
    color: '#a1a1aa',
    fontSize: 13,
    fontWeight: '600',
  },
  summaryValue: {
    marginTop: 6,
    color: '#f8fafc',
    fontSize: 28,
    fontWeight: '800',
  },
  summaryMeta: {
    color: '#d4d4d8',
    fontSize: 14,
    fontWeight: '700',
  },
  dateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  dateArrow: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#111113',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#27272a',
  },
  datePill: {
    flex: 1,
    backgroundColor: '#111113',
    borderRadius: 24,
    paddingVertical: 14,
    paddingHorizontal: 18,
    borderWidth: 1,
    borderColor: '#27272a',
  },
  dateLabel: {
    color: '#f8fafc',
    fontSize: 16,
    fontWeight: '700',
  },
  dateSubLabel: {
    marginTop: 4,
    color: '#a1a1aa',
    fontSize: 13,
  },
  timelineCard: {
    backgroundColor: '#111113',
    borderRadius: 30,
    padding: 14,
    borderWidth: 1,
    borderColor: '#27272a',
    gap: 2,
  },
  timelineRow: {
    flexDirection: 'row',
    minHeight: 64,
  },
  hourColumn: {
    width: 56,
    paddingTop: 4,
  },
  timelineContentColumn: {
    flex: 1,
    paddingBottom: 8,
    paddingLeft: 12,
  },
  timelineLine: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 5,
    width: 2,
    backgroundColor: '#3f3f46',
  },
  hourMarker: {
    color: '#a1a1aa',
    fontSize: 13,
    fontWeight: '700',
  },
  sessionCard: {
    marginBottom: 8,
    marginLeft: 14,
    backgroundColor: '#18181b',
    borderRadius: 16,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: '#3f3f46',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  sessionDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#f5f5f5',
  },
  sessionTextWrap: {
    gap: 4,
  },
  sessionTitle: {
    color: '#f8fafc',
    fontSize: 15,
    fontWeight: '700',
  },
  sessionMeta: {
    color: '#a1a1aa',
    fontSize: 13,
  },
  emptyHourWrap: {
    height: 26,
    justifyContent: 'center',
    marginLeft: 2,
  },
  emptyHourDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#52525b',
  },
  adjustRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  adjustButton: {
    flexGrow: 1,
    minWidth: '47%',
    backgroundColor: '#111113',
    borderRadius: 18,
    paddingVertical: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#27272a',
  },
  adjustButtonText: {
    color: '#f8fafc',
    fontSize: 15,
    fontWeight: '700',
  },
  quickWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  quickChip: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#3f3f46',
    paddingVertical: 10,
    paddingHorizontal: 14,
    backgroundColor: '#18181b',
  },
  quickChipActive: {
    backgroundColor: '#e5e7eb',
    borderColor: '#d4d4d8',
  },
  quickChipText: {
    color: '#e4e4e7',
    fontWeight: '700',
  },
  quickChipTextActive: {
    color: '#09090b',
  },
  saveButton: {
    borderRadius: 24,
    paddingVertical: 18,
    justifyContent: 'center',
    alignItems: 'center',
    flexDirection: 'row',
    gap: 10,
  },
  saveButtonText: {
    color: '#09090b',
    fontSize: 17,
    fontWeight: '800',
  },
  floatingBarWrap: {
    position: 'absolute',
    left: 16,
    right: 16,
    bottom: 80,
    zIndex: 50,
    elevation: 12,
  },
  floatingBar: {
    minHeight: 54,
    borderRadius: 22,
    paddingHorizontal: 16,
    backgroundColor: '#111113',
    borderWidth: 1,
    borderColor: '#3f3f46',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    shadowColor: '#000',
    shadowOpacity: 0.24,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 8 },
    elevation: 12,
  },
  floatingBarText: {
    color: '#fafafa',
    fontSize: 15,
    fontWeight: '800',
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
  },
  modalDismissArea: {
    flex: 1,
  },
  modalSheet: {
    backgroundColor: '#111113',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 20,
    paddingTop: 14,
    paddingBottom: 30,
    borderTopWidth: 1,
    borderColor: '#3f3f46',
    gap: 18,
  },
  modalHandle: {
    alignSelf: 'center',
    width: 44,
    height: 5,
    borderRadius: 999,
    backgroundColor: '#52525b',
  },
  modalTitle: {
    color: '#f8fafc',
    fontSize: 22,
    fontWeight: '800',
  },
  modalSubtitle: {
    color: '#a1a1aa',
    fontSize: 14,
    lineHeight: 20,
  },
  modalCounterCard: {
    backgroundColor: '#18181b',
    borderRadius: 24,
    padding: 20,
    borderWidth: 1,
    borderColor: '#3f3f46',
    alignItems: 'center',
    gap: 6,
  },
  modalCounterValue: {
    color: '#f8fafc',
    fontSize: 34,
    fontWeight: '800',
  },
  modalCounterMeta: {
    color: '#a1a1aa',
    fontSize: 14,
    fontWeight: '600',
  },
});
