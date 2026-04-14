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
import { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import { useNavigation } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useAppSettings } from '../../context/AppSettingsContext';
import { useWalkingData } from '../../context/WalkingDataContext';
import { useAppColors } from '../../theme/useAppColors';
import { RootTabParamList } from '../../types';
import { getFilteredHistoryEntries } from '../../utils/analytics';
import { formatDuration } from '../../utils/formatDuration';
import { formatHistoryDate, formatSessionTimeRange } from '../../utils/time';
import { createStyles } from './HistoryScreenStyles';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

export default function HistoryScreen() {
  const navigation = useNavigation<BottomTabNavigationProp<RootTabParamList>>();
  const colors = useAppColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const { settings } = useAppSettings();
  const { entries, loading } = useWalkingData();
  const [activeFilter, setActiveFilter] = useState<'all' | 'week' | 'month' | 'longestSession'>('all');
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
    () => getFilteredHistoryEntries(dailyEntries, activeFilter, searchQuery, settings.weekStart),
    [activeFilter, dailyEntries, searchQuery, settings.weekStart],
  );

  const triggerSelectionHaptic = async () => {
    if (!settings.hapticsEnabled) {
      return;
    }

    await Haptics.selectionAsync();
  };

  const toggleExpanded = async (date: string) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setExpandedDate((currentDate) => (currentDate === date ? null : date));
    await triggerSelectionHaptic();
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
            <Text style={styles.subtitle}>Review saved sessions.</Text>

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
                ['longestSession', 'Longest session'],
              ].map(([value, label]) => {
                const active = activeFilter === value;

                return (
                  <Pressable
                    key={value}
                    onPress={async () => {
                      setActiveFilter(value as typeof activeFilter);
                      await triggerSelectionHaptic();
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
            <Text style={styles.emptyText}>Save a session to see it here.</Text>
          </View>
        }
        renderItem={({ item }) => (
          <View style={styles.rowCard}>
            <View style={styles.rowTop}>
              <Pressable
                accessibilityHint="Open this day in the walking timeline"
                accessibilityLabel={`Edit ${formatHistoryDate(item.date)}`}
                accessibilityRole="button"
                onPress={() => navigation.navigate('Add', { targetDateKey: item.date })}
                style={styles.rowMainButton}
              >
                <View style={styles.rowTextWrap}>
                  <Text ellipsizeMode="tail" numberOfLines={1} style={styles.rowDate}>{formatHistoryDate(item.date)}</Text>
                  <Text ellipsizeMode="tail" numberOfLines={2} style={styles.rowMeta}>
                    {item.sessions.length} session{item.sessions.length > 1 ? 's' : ''} · Last saved{' '}
                    {new Date(item.createdAt).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}
                  </Text>
                </View>
              </Pressable>
              <View style={styles.rowChevronWrap}>
                <LinearGradient colors={[colors.textPrimary, colors.accentMuted]} end={{ x: 1, y: 1 }} start={{ x: 0, y: 0 }} style={styles.minutesPill}>
                  <Text adjustsFontSizeToFit ellipsizeMode="tail" numberOfLines={1} style={styles.minutesText}>
                    {formatDuration(item.totalMinutes)}
                  </Text>
                </LinearGradient>
                <Pressable
                  accessibilityLabel={`Toggle sessions for ${formatHistoryDate(item.date)}`}
                  accessibilityRole="button"
                  onPress={() => toggleExpanded(item.date)}
                  style={styles.expandButton}
                >
                  <Ionicons
                    color={colors.textMuted}
                    name={expandedDate === item.date ? 'chevron-up' : 'chevron-down'}
                    size={18}
                  />
                </Pressable>
              </View>
            </View>

            {expandedDate === item.date ? (
              <View style={styles.expandedWrap}>
                {item.sessions.map((session) => (
                  <View key={session.id} style={styles.sessionRow}>
                    <Text style={styles.sessionTitle}>{formatDuration(session.minutes)} walk</Text>
                    <Text style={styles.sessionMeta}>{formatSessionTimeRange(session.createdAt, session.minutes)}</Text>
                  </View>
                ))}
              </View>
            ) : null}
          </View>
        )}
        showsVerticalScrollIndicator={false}
      />
    </SafeAreaView>
  );
}
