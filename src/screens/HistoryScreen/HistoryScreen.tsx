import React, { useMemo } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Text,
  View,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useWalkingData } from '../../context/WalkingDataContext';
import { getDateKey } from '../../storage/walkingStorage';
import { formatDuration } from '../../utils/formatDuration';
import { styles } from './HistoryScreenStyles';

const formatHistoryDate = (value: string) => {
  if (value === getDateKey()) {
    return 'Today';
  }

  const [year, month, day] = value.split('-').map(Number);
  return new Date(year, month - 1, day).toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
};

export default function HistoryScreen() {
  const { entries, loading } = useWalkingData();

  const dailyEntries = useMemo(() => {
    const groupedEntries = new Map<string, (typeof entries)[number]>();

    entries.forEach((entry) => {
      const existingEntry = groupedEntries.get(entry.date);

      if (!existingEntry) {
        groupedEntries.set(entry.date, {
          ...entry,
          sessions: [...entry.sessions],
        });
        return;
      }

      const mergedSessions = [...existingEntry.sessions, ...entry.sessions].sort((left, right) =>
        right.createdAt.localeCompare(left.createdAt),
      );

      groupedEntries.set(entry.date, {
        ...existingEntry,
        totalMinutes: existingEntry.totalMinutes + entry.totalMinutes,
        createdAt: [existingEntry.createdAt, entry.createdAt].sort((left, right) =>
          right.localeCompare(left),
        )[0],
        sessions: mergedSessions,
      });
    });

    return [...groupedEntries.values()].sort((left, right) => right.date.localeCompare(left.date));
  }, [entries]);

  if (loading) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.loaderWrap}>
          <ActivityIndicator color="#f5f5f5" size="large" />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <FlatList
        contentContainerStyle={styles.content}
        data={dailyEntries}
        keyExtractor={(item) => item.date}
        ListHeaderComponent={
          <View style={styles.headerWrap}>
            <Text style={styles.title}>History</Text>
          </View>
        }
        ListEmptyComponent={
          <View style={styles.emptyCard}>
            <Text style={styles.emptyTitle}>No history yet</Text>
            <Text style={styles.emptyText}>Save your first walking session to build your daily streak.</Text>
          </View>
        }
        renderItem={({ item }) => (
          <View style={styles.rowCard}>
            <View>
              <Text style={styles.rowDate}>{formatHistoryDate(item.date)}</Text>
              <Text style={styles.rowMeta}>
                {item.sessions.length} session{item.sessions.length > 1 ? 's' : ''} · Last saved{' '}
                {new Date(item.createdAt).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}
              </Text>
            </View>
            <LinearGradient colors={["#fafafa", "#a1a1aa"]} end={{ x: 1, y: 1 }} start={{ x: 0, y: 0 }} style={styles.minutesPill}>
              <Text style={styles.minutesText}>{formatDuration(item.totalMinutes)}</Text>
            </LinearGradient>
          </View>
        )}
        showsVerticalScrollIndicator={false}
      />
    </SafeAreaView>
  );
}
