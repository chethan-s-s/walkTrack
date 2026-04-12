import React, { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  LayoutAnimation,
  Platform,
  Pressable,
  Text,
  TextInput,
  UIManager,
  View,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useWalkingData } from '../../context/WalkingDataContext';
import { getDateKey } from '../../storage/walkingStorage';
import { useAppColors } from '../../theme/useAppColors';
import { getFilteredHistoryEntries } from '../../utils/analytics';
import { formatDuration } from '../../utils/formatDuration';
import { createStyles } from './HistoryScreenStyles';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

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
  const colors = useAppColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const { entries, loading } = useWalkingData();
  const [activeFilter, setActiveFilter] = useState<'all' | 'week' | 'month' | 'longest'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedDate, setExpandedDate] = useState<string | null>(null);

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

  const filteredEntries = useMemo(
    () => getFilteredHistoryEntries(dailyEntries, activeFilter, searchQuery),
    [activeFilter, dailyEntries, searchQuery],
  );

  const toggleExpanded = async (date: string) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setExpandedDate((currentDate) => (currentDate === date ? null : date));
    await Haptics.selectionAsync();
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.loaderWrap}>
          <ActivityIndicator color={colors.textPrimary} size="large" />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <FlatList
        contentContainerStyle={styles.content}
        data={filteredEntries}
        keyExtractor={(item) => item.date}
        ListHeaderComponent={
          <View style={styles.headerWrap}>
            <Text style={styles.title}>History</Text>
            <Text style={styles.subtitle}>Search and expand any day to inspect saved sessions.</Text>

            <View style={styles.searchCard}>
              <Ionicons color={colors.textMuted} name="search" size={18} />
              <TextInput
                onChangeText={setSearchQuery}
                placeholder="Search by date"
                placeholderTextColor={colors.textMuted}
                style={styles.searchInput}
                value={searchQuery}
              />
            </View>

            <View style={styles.filterRow}>
              {[
                ['all', 'All'],
                ['week', 'This week'],
                ['month', 'This month'],
                ['longest', 'Longest day'],
              ].map(([value, label]) => {
                const active = activeFilter === value;

                return (
                  <Pressable
                    key={value}
                    onPress={async () => {
                      setActiveFilter(value as typeof activeFilter);
                      await Haptics.selectionAsync();
                    }}
                    style={[styles.filterChip, active && styles.filterChipActive]}
                  >
                    <Text style={[styles.filterChipText, active && styles.filterChipTextActive]}>{label}</Text>
                  </Pressable>
                );
              })}
            </View>
          </View>
        }
        ListEmptyComponent={
          <View style={styles.emptyCard}>
            <Text style={styles.emptyTitle}>No history yet</Text>
            <Text style={styles.emptyText}>Save your first walking session to build your daily streak.</Text>
          </View>
        }
        renderItem={({ item }) => (
          <Pressable onPress={() => toggleExpanded(item.date)} style={styles.rowCard}>
            <View style={styles.rowTop}>
              <View>
                <Text style={styles.rowDate}>{formatHistoryDate(item.date)}</Text>
                <Text style={styles.rowMeta}>
                  {item.sessions.length} session{item.sessions.length > 1 ? 's' : ''} · Last saved{' '}
                  {new Date(item.createdAt).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}
                </Text>
              </View>
              <View style={styles.rowChevronWrap}>
                <LinearGradient colors={[colors.textPrimary, colors.accentMuted]} end={{ x: 1, y: 1 }} start={{ x: 0, y: 0 }} style={styles.minutesPill}>
                  <Text style={styles.minutesText}>{formatDuration(item.totalMinutes)}</Text>
                </LinearGradient>
                <Ionicons
                  color={colors.textMuted}
                  name={expandedDate === item.date ? 'chevron-up' : 'chevron-down'}
                  size={18}
                />
              </View>
            </View>

            {expandedDate === item.date ? (
              <View style={styles.expandedWrap}>
                {item.sessions.map((session) => (
                  <View key={session.id} style={styles.sessionRow}>
                    <Text style={styles.sessionTitle}>{formatDuration(session.minutes)} walk</Text>
                    <Text style={styles.sessionMeta}>
                      {new Date(session.createdAt).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}
                    </Text>
                  </View>
                ))}
              </View>
            ) : null}
          </Pressable>
        )}
        showsVerticalScrollIndicator={false}
      />
    </SafeAreaView>
  );
}
