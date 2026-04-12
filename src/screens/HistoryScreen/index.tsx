import React from 'react';
import {
  ActivityIndicator,
  FlatList,
  Text,
  View,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useWalkingData } from '../../context/WalkingDataContext';
import { styles } from './styles';

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
