import React, { useMemo, useState } from 'react';
import {
  Alert,
  Modal,
  Pressable,
  ScrollView,
  Text,
  View,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

import { useWalkingData } from '../../context/WalkingDataContext';
import { getDateKey } from '../../storage/walkingStorage';
import { WalkingSession } from '../../types';
import { styles } from './styles';

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
