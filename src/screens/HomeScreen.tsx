import React, { useMemo } from 'react';
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { getDateKey } from '../storage/walkingStorage';
import { useWalkingData } from '../context/WalkingDataContext';

const formatDay = (date: Date) =>
  date.toLocaleDateString('en-US', {
    weekday: 'short',
  });

export default function HomeScreen() {
  const { averageMinutes, entries, loading, todayMinutes, weeklyMinutes } = useWalkingData();

  const weeklyBars = useMemo(() => {
    return Array.from({ length: 7 }, (_, index) => {
      const date = new Date();
      date.setDate(date.getDate() - (6 - index));
      const key = getDateKey(date);
      const minutes = entries.find((entry) => entry.date === key)?.totalMinutes ?? 0;

      return {
        key,
        label: formatDay(date),
        minutes,
      };
    });
  }, [entries]);

  const maxMinutes = Math.max(...weeklyBars.map((item) => item.minutes), 30);

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
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={styles.eyebrow}>Daily walking tracker</Text>
        <Text style={styles.title}>Stay consistent with every minute you walk.</Text>
        <Text style={styles.subtitle}>
          Log your walking time daily and keep a simple view of today, this week, and your history.
        </Text>

        <View style={styles.statGrid}>
          <View style={styles.card}>
            <Text style={styles.cardLabel}>Today</Text>
            <Text style={styles.cardValue}>{todayMinutes} min</Text>
          </View>
          <View style={styles.card}>
            <Text style={styles.cardLabel}>Last 7 days</Text>
            <Text style={styles.cardValue}>{weeklyMinutes} min</Text>
          </View>
          <View style={styles.cardWide}>
            <Text style={styles.cardLabel}>Daily average</Text>
            <Text style={styles.cardValue}>{averageMinutes} min</Text>
          </View>
        </View>

        <View style={styles.chartCard}>
          <Text style={styles.sectionTitle}>Weekly rhythm</Text>
          <Text style={styles.sectionSubtitle}>A quick glance at the last 7 days.</Text>
          <View style={styles.chartWrap}>
            {weeklyBars.map((bar) => {
              const height = Math.max((bar.minutes / maxMinutes) * 120, bar.minutes > 0 ? 12 : 6);

              return (
                <View key={bar.key} style={styles.barColumn}>
                  <Text style={styles.barMinutes}>{bar.minutes}</Text>
                  <View style={styles.barTrack}>
                    <View style={[styles.barFill, { height }]} />
                  </View>
                  <Text style={styles.barLabel}>{bar.label}</Text>
                </View>
              );
            })}
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#09090b',
  },
  loaderWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    padding: 20,
    paddingBottom: 140,
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
  statGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 14,
  },
  card: {
    width: '47%',
    backgroundColor: '#111113',
    borderRadius: 24,
    padding: 18,
    borderWidth: 1,
    borderColor: '#27272a',
    gap: 8,
  },
  cardWide: {
    width: '100%',
    backgroundColor: '#111113',
    borderRadius: 24,
    padding: 18,
    borderWidth: 1,
    borderColor: '#27272a',
    gap: 8,
  },
  cardLabel: {
    color: '#a1a1aa',
    fontSize: 13,
    fontWeight: '600',
  },
  cardValue: {
    color: '#f8fafc',
    fontSize: 28,
    fontWeight: '800',
  },
  chartCard: {
    backgroundColor: '#111113',
    borderRadius: 28,
    padding: 20,
    borderWidth: 1,
    borderColor: '#27272a',
    gap: 18,
  },
  sectionTitle: {
    color: '#f8fafc',
    fontSize: 20,
    fontWeight: '700',
  },
  sectionSubtitle: {
    color: '#a1a1aa',
    fontSize: 14,
  },
  chartWrap: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    minHeight: 180,
    gap: 10,
  },
  barColumn: {
    flex: 1,
    alignItems: 'center',
    gap: 8,
  },
  barTrack: {
    width: '100%',
    height: 120,
    backgroundColor: '#18181b',
    borderRadius: 18,
    justifyContent: 'flex-end',
    overflow: 'hidden',
  },
  barFill: {
    width: '100%',
    backgroundColor: '#e5e7eb',
    borderRadius: 18,
    minHeight: 6,
  },
  barLabel: {
    color: '#a1a1aa',
    fontSize: 12,
    fontWeight: '600',
  },
  barMinutes: {
    color: '#d4d4d8',
    fontSize: 11,
    fontWeight: '700',
  },
});
