import React, { useMemo } from 'react';
import {
  ActivityIndicator,
  ScrollView,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useWalkingData } from '../../context/WalkingDataContext';
import { getDateKey } from '../../storage/walkingStorage';
import { styles } from './styles';

const formatDay = (date: Date) =>
  date.toLocaleDateString('en-US', {
    weekday: 'short',
  });

const formatDashboardDate = (date: Date) =>
  date.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  });

export default function HomeScreen() {
  const { averageMinutes, entries, loading, todayMinutes, weeklyMinutes } = useWalkingData();
  const currentDateLabel = formatDashboardDate(new Date());

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
        <Text style={styles.dateLabel}>{currentDateLabel}</Text>
        <Text style={styles.title}>Dashboard</Text>

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
