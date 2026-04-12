import React from 'react';
import {
  ActivityIndicator,
  FlatList,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useWalkingData } from '../context/WalkingDataContext';

const formatHistoryDate = (value: string) => {
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
        data={entries}
        keyExtractor={(item) => item.id}
        ListHeaderComponent={
          <View style={styles.headerWrap}>
            <Text style={styles.eyebrow}>History</Text>
            <Text style={styles.title}>Every saved walk, all in one place.</Text>
            <Text style={styles.subtitle}>
              {entries.length ? `You have logged ${entries.length} day${entries.length > 1 ? 's' : ''}.` : 'Start with your first entry from the Add tab.'}
            </Text>
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
                {item.sessions.length} session{item.sessions.length > 1 ? 's' : ''} · Last saved {new Date(item.createdAt).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}
              </Text>
            </View>
            <LinearGradient colors={["#fafafa", "#a1a1aa"]} end={{ x: 1, y: 1 }} start={{ x: 0, y: 0 }} style={styles.minutesPill}>
              <Text style={styles.minutesText}>{item.totalMinutes} min</Text>
            </LinearGradient>
          </View>
        )}
        showsVerticalScrollIndicator={false}
      />
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
    gap: 14,
  },
  headerWrap: {
    marginBottom: 20,
    gap: 10,
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
  emptyCard: {
    backgroundColor: '#111113',
    borderRadius: 24,
    padding: 20,
    borderWidth: 1,
    borderColor: '#27272a',
    gap: 8,
  },
  emptyTitle: {
    color: '#f8fafc',
    fontSize: 20,
    fontWeight: '700',
  },
  emptyText: {
    color: '#a1a1aa',
    fontSize: 14,
    lineHeight: 20,
  },
  rowCard: {
    backgroundColor: '#111113',
    borderRadius: 22,
    padding: 18,
    borderWidth: 1,
    borderColor: '#27272a',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
    gap: 12,
  },
  rowDate: {
    color: '#f8fafc',
    fontSize: 16,
    fontWeight: '700',
  },
  rowMeta: {
    marginTop: 6,
    color: '#a1a1aa',
    fontSize: 13,
  },
  minutesPill: {
    borderRadius: 999,
    paddingVertical: 12,
    paddingHorizontal: 14,
  },
  minutesText: {
    color: '#09090b',
    fontSize: 14,
    fontWeight: '800',
  },
});
