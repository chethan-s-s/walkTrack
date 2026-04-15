import React from 'react';
import { Text, View } from 'react-native';

import GoalProgressRing from '../../../components/GoalProgressRing';
import { useAppColors } from '../../../theme/useAppColors';
import { formatDuration } from '../../../utils/formatDuration';
import { createStyles } from '../HomeScreenStyles';

type MilestoneBadge = {
  title: string;
  description: string;
};

type GoalsCardProps = {
  currentDailyGoalMinutes: number;
  currentStreak: number;
  goalReminderEnabled: boolean;
  isGoalReached: boolean;
  milestoneBadge: MilestoneBadge | null;
  remainingGoalMinutes: number;
  todayMinutes: number;
  weeklyGoalDays: number;
  weeklyGoalHits: number;
};

export default function GoalsCard({
  currentDailyGoalMinutes,
  currentStreak,
  goalReminderEnabled,
  isGoalReached,
  milestoneBadge,
  remainingGoalMinutes,
  todayMinutes,
  weeklyGoalDays,
  weeklyGoalHits,
}: GoalsCardProps) {
  const colors = useAppColors();
  const styles = React.useMemo(() => createStyles(colors), [colors]);

  return (
    <View style={styles.goalsCard}>
      <View style={styles.goalsTopRow}>
        <GoalProgressRing
          colors={colors}
          goal={currentDailyGoalMinutes}
          label={`${Math.round((todayMinutes / currentDailyGoalMinutes) * 100) || 0}%`}
          sublabel="goal"
          value={todayMinutes}
        />

        <View style={styles.goalsTextWrap}>
          <Text style={styles.goalEyebrow}>Daily Goal</Text>
          <Text adjustsFontSizeToFit ellipsizeMode="tail" numberOfLines={1} style={styles.goalHeadline}>
            {formatDuration(todayMinutes)} / {formatDuration(currentDailyGoalMinutes)}
          </Text>
          <Text style={styles.goalMeta}>
            {weeklyGoalHits}/7 days hit · Weekly target {weeklyGoalDays} days
          </Text>
          <View style={styles.streakPill}>
            <Text ellipsizeMode="tail" numberOfLines={1} style={styles.streakText}>
              {currentStreak > 0
                ? `${currentStreak}-day streak`
                : weeklyGoalHits >= weeklyGoalDays
                  ? 'On track'
                  : `${weeklyGoalDays - weeklyGoalHits} more day${weeklyGoalDays - weeklyGoalHits === 1 ? '' : 's'} needed`}
            </Text>
          </View>
          {milestoneBadge ? (
            <View style={styles.milestonePill}>
              <Text style={styles.milestoneTitle}>{milestoneBadge.title}</Text>
              <Text style={styles.milestoneText}>{milestoneBadge.description}</Text>
            </View>
          ) : null}
        </View>
      </View>

      {!isGoalReached && goalReminderEnabled ? (
        <View style={styles.reminderCard}>
          <Text style={styles.reminderTitle}>Goal reminder</Text>
          <Text style={styles.reminderText}>
            {formatDuration(remainingGoalMinutes)} left to reach today's goal.
          </Text>
        </View>
      ) : null}
    </View>
  );
}
