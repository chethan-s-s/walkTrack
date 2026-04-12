import React, { useMemo, useState } from 'react';
import {
  Pressable,
  ScrollView,
  Switch,
  Text,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useAppSettings } from '../../context/AppSettingsContext';
import { useAppColors } from '../../theme/useAppColors';
import { DashboardSectionKey } from '../../types';
import { formatDuration } from '../../utils/formatDuration';
import { formatHourLabel, getTimelineSpanHours, isOvernightTimeline } from '../../utils/time';
import { createStyles } from './MoreScreenStyles';

const shiftHour = (hour: number, delta: number) => ((hour + delta) % 24 + 24) % 24;
const MIN_DAILY_GOAL_MINUTES = 5;
const MAX_DAILY_GOAL_MINUTES = 600;
const MIN_WEEKLY_GOAL_DAYS = 1;
const MAX_WEEKLY_GOAL_DAYS = 7;

const TIMELINE_PRESETS = [
  { label: 'Daytime', start: 6, end: 22 },
  { label: 'Extended', start: 5, end: 0 },
  { label: 'Overnight', start: 18, end: 6 },
  { label: 'Full day', start: 0, end: 23 },
];

const DASHBOARD_SECTION_DETAILS: Record<DashboardSectionKey, { title: string; description: string }> = {
  insights: {
    title: 'Insights',
    description: 'Best day, average session, and monthly walking time.',
  },
  weeklyRhythm: {
    title: 'Weekly Rhythm',
    description: 'The bar chart that shows the current week at a glance.',
  },
  weeklyTrend: {
    title: 'Weekly Trend',
    description: 'Compare this week with the previous week.',
  },
  heatmap: {
    title: 'Heatmap',
    description: 'A calendar view of your current month’s walking activity.',
  },
};

export default function MoreScreen() {
  const colors = useAppColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [generalOpen, setGeneralOpen] = useState(true);
  const [dashboardOpen, setDashboardOpen] = useState(false);
  const {
    moveDashboardSection,
    setDailyGoalMinutes,
    setGoalReminderEnabled,
    setHapticsEnabled,
    setTimelineEndHour,
    setTimelineStartHour,
    setWeekStart,
    setWeeklyGoalDays,
    settings,
    toggleDashboardSectionHidden,
  } = useAppSettings();
  const isDailyGoalMinned = settings.dailyGoalMinutes <= MIN_DAILY_GOAL_MINUTES;
  const isDailyGoalMaxed = settings.dailyGoalMinutes >= MAX_DAILY_GOAL_MINUTES;
  const isWeeklyGoalDaysMinned = settings.weeklyGoalDays <= MIN_WEEKLY_GOAL_DAYS;
  const isWeeklyGoalDaysMaxed = settings.weeklyGoalDays >= MAX_WEEKLY_GOAL_DAYS;
  const visibleTimelineHours = getTimelineSpanHours(settings.timelineStartHour, settings.timelineEndHour);
  const timelineHelperText = isOvernightTimeline(settings.timelineStartHour, settings.timelineEndHour)
    ? `Overnight range · ${visibleTimelineHours} visible hour${visibleTimelineHours === 1 ? '' : 's'}`
    : settings.timelineStartHour === settings.timelineEndHour
      ? 'Single-hour range · start and end are the same'
      : `Same-day range · ${visibleTimelineHours} visible hour${visibleTimelineHours === 1 ? '' : 's'}`;

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={styles.title}>More</Text>
        <Text style={styles.subtitle}>Settings and preferences.</Text>

        <View style={styles.sectionCard}>
          <Pressable onPress={() => setGeneralOpen((current) => !current)} style={styles.sectionHeaderButton}>
            <View style={styles.sectionHeaderTextWrap}>
              <Text style={styles.sectionTitle}>General</Text>
              <Text style={styles.sectionSubtitle}>Daily app settings.</Text>
            </View>
            <Ionicons color={colors.textPrimary} name={generalOpen ? 'chevron-up' : 'chevron-down'} size={20} />
          </Pressable>

          {generalOpen ? <>
          <View style={styles.row}>
            <View style={styles.rowTextWrap}>
              <Text style={styles.rowTitle}>First day of week</Text>
            </View>
            <View style={styles.segmentedRow}>
              {[
                ['sunday', 'Sunday'],
                ['monday', 'Monday'],
              ].map(([value, label]) => {
                const active = settings.weekStart === value;

                return (
                  <Pressable
                    key={value}
                    onPress={() => void setWeekStart(value as typeof settings.weekStart)}
                    style={[styles.segmentedButton, active && styles.segmentedButtonActive]}
                  >
                    <Text style={[styles.segmentedButtonText, active && styles.segmentedButtonTextActive]}>{label}</Text>
                  </Pressable>
                );
              })}
            </View>
          </View>

          <View style={styles.row}>
            <View style={styles.stepperRow}>
              <View style={styles.rowTextWrap}>
                <Text style={styles.rowTitle}>Daily goal</Text>
                <Text style={styles.rowDescription}>Minutes per day.</Text>
              </View>
              <View style={styles.stepperControls}>
                <Pressable
                  disabled={isDailyGoalMinned}
                  onPress={() => void setDailyGoalMinutes(settings.dailyGoalMinutes - 5)}
                  style={[styles.stepperButton, isDailyGoalMinned && styles.stepperButtonDisabled]}
                >
                  <Ionicons color={isDailyGoalMinned ? colors.textMuted : colors.textPrimary} name="remove" size={18} />
                </Pressable>
                <View style={styles.stepperValueWrap}>
                  <Text style={styles.stepperValue}>{formatDuration(settings.dailyGoalMinutes)}</Text>
                  <Text style={styles.stepperMeta}>daily target</Text>
                </View>
                <Pressable
                  disabled={isDailyGoalMaxed}
                  onPress={() => void setDailyGoalMinutes(settings.dailyGoalMinutes + 5)}
                  style={[styles.stepperButton, isDailyGoalMaxed && styles.stepperButtonDisabled]}
                >
                  <Ionicons color={isDailyGoalMaxed ? colors.textMuted : colors.textPrimary} name="add" size={18} />
                </Pressable>
              </View>
            </View>
          </View>

          <View style={styles.row}>
            <View style={styles.stepperRow}>
              <View style={styles.rowTextWrap}>
                <Text style={styles.rowTitle}>Weekly goal days</Text>
                <Text style={styles.rowDescription}>Days needed each week.</Text>
              </View>
              <View style={styles.stepperControls}>
                <Pressable
                  disabled={isWeeklyGoalDaysMinned}
                  onPress={() => void setWeeklyGoalDays(settings.weeklyGoalDays - 1)}
                  style={[styles.stepperButton, isWeeklyGoalDaysMinned && styles.stepperButtonDisabled]}
                >
                  <Ionicons color={isWeeklyGoalDaysMinned ? colors.textMuted : colors.textPrimary} name="remove" size={18} />
                </Pressable>
                <View style={styles.stepperValueWrap}>
                  <Text style={styles.stepperValue}>{settings.weeklyGoalDays}</Text>
                  <Text style={styles.stepperMeta}>days per week</Text>
                </View>
                <Pressable
                  disabled={isWeeklyGoalDaysMaxed}
                  onPress={() => void setWeeklyGoalDays(settings.weeklyGoalDays + 1)}
                  style={[styles.stepperButton, isWeeklyGoalDaysMaxed && styles.stepperButtonDisabled]}
                >
                  <Ionicons color={isWeeklyGoalDaysMaxed ? colors.textMuted : colors.textPrimary} name="add" size={18} />
                </Pressable>
              </View>
            </View>
          </View>

          <View style={styles.row}>
            <View style={styles.rowTop}>
              <View style={styles.rowTextWrap}>
                <Text style={styles.rowTitle}>Haptic feedback</Text>
                <Text style={styles.rowDescription}>Touch feedback.</Text>
              </View>
              <Switch
                onValueChange={(value) => void setHapticsEnabled(value)}
                thumbColor={settings.hapticsEnabled ? colors.textPrimary : colors.surfaceMuted}
                trackColor={{ false: colors.actionBorder, true: colors.accentMuted }}
                value={settings.hapticsEnabled}
              />
            </View>
          </View>

          <View style={styles.row}>
            <View style={styles.rowTop}>
              <View style={styles.rowTextWrap}>
                <Text style={styles.rowTitle}>Goal reminders</Text>
                <Text style={styles.rowDescription}>Show reminder card.</Text>
              </View>
              <Switch
                onValueChange={(value) => void setGoalReminderEnabled(value)}
                thumbColor={settings.goalReminderEnabled ? colors.textPrimary : colors.surfaceMuted}
                trackColor={{ false: colors.actionBorder, true: colors.accentMuted }}
                value={settings.goalReminderEnabled}
              />
            </View>
          </View>

          <View style={styles.row}>
            <View style={styles.rowTextWrap}>
              <Text style={styles.rowTitle}>Add screen hours</Text>
              <Text style={styles.rowDescription}>Visible hours in the timeline.</Text>
            </View>
            <Text style={styles.timelineHint}>{timelineHelperText}</Text>

            <View style={styles.timelinePresetRow}>
              {TIMELINE_PRESETS.map((preset) => {
                const active =
                  settings.timelineStartHour === preset.start && settings.timelineEndHour === preset.end;

                return (
                  <Pressable
                    key={preset.label}
                    accessibilityLabel={`Use ${preset.label} timeline preset`}
                    accessibilityRole="button"
                    onPress={async () => {
                      await setTimelineStartHour(preset.start);
                      await setTimelineEndHour(preset.end);
                    }}
                    style={[styles.timelinePresetChip, active && styles.timelinePresetChipActive]}
                  >
                    <Text style={[styles.timelinePresetChipText, active && styles.timelinePresetChipTextActive]}>
                      {preset.label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            {[
              { label: 'Start time', hour: settings.timelineStartHour, updateHour: setTimelineStartHour },
              { label: 'End time', hour: settings.timelineEndHour, updateHour: setTimelineEndHour },
            ].map(({ label, hour, updateHour }) => (
              <View key={label} style={styles.hourRangeRow}>
                <Text style={styles.hourRangeLabelInline}>{label}</Text>
                <View style={styles.stepperControls}>
                  <Pressable
                    accessibilityLabel={`Decrease ${String(label).toLowerCase()}`}
                    accessibilityRole="button"
                    onPress={() => void updateHour(shiftHour(hour, -1))}
                    style={styles.stepperButton}
                  >
                    <Ionicons color={colors.textPrimary} name="remove" size={18} />
                  </Pressable>
                  <View style={styles.hourRangeValueWrap}>
                    <Text numberOfLines={1} style={styles.stepperValue}>{formatHourLabel(hour)}</Text>
                  </View>
                  <Pressable
                    accessibilityLabel={`Increase ${String(label).toLowerCase()}`}
                    accessibilityRole="button"
                    onPress={() => void updateHour(shiftHour(hour, 1))}
                    style={styles.stepperButton}
                  >
                    <Ionicons color={colors.textPrimary} name="add" size={18} />
                  </Pressable>
                </View>
              </View>
            ))}
          </View>
          </> : null}
        </View>

        <View style={styles.sectionCard}>
          <Pressable onPress={() => setDashboardOpen((current) => !current)} style={styles.sectionHeaderButton}>
            <View style={styles.sectionHeaderTextWrap}>
              <Text style={styles.sectionTitle}>Dashboard</Text>
              <Text style={styles.sectionSubtitle}>Show, hide, and reorder sections.</Text>
            </View>
            <Ionicons color={colors.textPrimary} name={dashboardOpen ? 'chevron-up' : 'chevron-down'} size={20} />
          </Pressable>

          {dashboardOpen ? settings.dashboardOrder.map((section, index) => {
            const sectionDetails = DASHBOARD_SECTION_DETAILS[section];
            const isHidden = settings.hiddenDashboardSections.includes(section);
            const canMoveUp = index > 0;
            const canMoveDown = index < settings.dashboardOrder.length - 1;

            return (
              <View key={section} style={styles.dashboardRow}>
                <View style={styles.rowTop}>
                  <View style={styles.rowTextWrap}>
                    <Text style={styles.rowTitle}>{sectionDetails.title}</Text>
                    <Text style={styles.rowDescription}>{sectionDetails.description}</Text>
                  </View>
                  <Switch
                    onValueChange={() => void toggleDashboardSectionHidden(section)}
                    thumbColor={!isHidden ? colors.textPrimary : colors.surfaceMuted}
                    trackColor={{ false: colors.actionBorder, true: colors.accentMuted }}
                    value={!isHidden}
                  />
                </View>

                <View style={styles.dashboardControls}>
                  <Text style={styles.footerText}>{isHidden ? 'Hidden on Home' : 'Visible on Home'}</Text>
                  <View style={styles.moveButtons}>
                    <Pressable
                      disabled={!canMoveUp}
                      onPress={() => void moveDashboardSection(section, 'up')}
                      style={[styles.moveButton, !canMoveUp && styles.moveButtonDisabled]}
                    >
                      <Ionicons color={canMoveUp ? colors.textPrimary : colors.textMuted} name="chevron-up" size={18} />
                    </Pressable>
                    <Pressable
                      disabled={!canMoveDown}
                      onPress={() => void moveDashboardSection(section, 'down')}
                      style={[styles.moveButton, !canMoveDown && styles.moveButtonDisabled]}
                    >
                      <Ionicons color={canMoveDown ? colors.textPrimary : colors.textMuted} name="chevron-down" size={18} />
                    </Pressable>
                  </View>
                </View>
              </View>
            );
          }) : null}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
