import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  Switch,
  Text,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useAppSettings } from '../../context/AppSettingsContext';
import { useWalkingData } from '../../context/WalkingDataContext';
import { useAppColors } from '../../theme/useAppColors';
import { DashboardSectionKey } from '../../types';
import { formatDuration } from '../../utils/formatDuration';
import { buildAppDataSnapshot, parseAppDataSnapshot } from '../../utils/dataTransfer';
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

type DocumentPickerAsset = {
  uri: string;
};

type DocumentPickerResult = {
  canceled: boolean;
  assets: DocumentPickerAsset[];
};

type DocumentPickerModule = {
  getDocumentAsync: (options: {
    type: string;
    copyToCacheDirectory: boolean;
    multiple: boolean;
  }) => Promise<DocumentPickerResult>;
};

type FileSystemModule = {
  cacheDirectory: string | null;
  EncodingType: {
    UTF8: string;
  };
  writeAsStringAsync: (uri: string, contents: string, options: { encoding: string }) => Promise<void>;
  readAsStringAsync: (uri: string, options: { encoding: string }) => Promise<string>;
};

type SharingModule = {
  isAvailableAsync: () => Promise<boolean>;
  shareAsync: (uri: string, options: { dialogTitle: string; mimeType: string }) => Promise<void>;
};

const loadDataTransferModules = () => ({
  documentPickerModule: require('expo-document-picker') as DocumentPickerModule,
  fileSystemModule: require('expo-file-system/legacy') as FileSystemModule,
  sharingModule: require('expo-sharing') as SharingModule,
});

export default function MoreScreen() {
  const colors = useAppColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [generalOpen, setGeneralOpen] = useState(true);
  const [dashboardOpen, setDashboardOpen] = useState(false);
  const [dataOpen, setDataOpen] = useState(false);
  const [dataStatus, setDataStatus] = useState<string | null>(null);
  const [transferNotification, setTransferNotification] = useState<string | null>(null);
  const [isExporting, setIsExporting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const {
    moveDashboardSection,
    replaceSettings,
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
  const { entries, replaceWalkingEntries } = useWalkingData();
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

  useEffect(() => {
    if (!transferNotification) {
      return undefined;
    }

    const timeout = setTimeout(() => {
      setTransferNotification(null);
    }, 2600);

    return () => clearTimeout(timeout);
  }, [transferNotification]);

  const showTransferNotification = (message: string) => {
    setTransferNotification(message);
  };

  const handleExportData = async () => {
    if (isExporting) {
      return;
    }

    setIsExporting(true);
    setDataStatus(null);

    try {
      const { fileSystemModule, sharingModule } = loadDataTransferModules();

      if (!fileSystemModule.cacheDirectory) {
        Alert.alert('Export unavailable', 'This device does not expose a writable cache directory.');
        return;
      }

      const snapshot = buildAppDataSnapshot(entries, settings);
      const fileUri = `${fileSystemModule.cacheDirectory}walk-track-backup-${snapshot.exportedAt.slice(0, 10)}.json`;

      await fileSystemModule.writeAsStringAsync(fileUri, JSON.stringify(snapshot, null, 2), {
        encoding: fileSystemModule.EncodingType.UTF8,
      });

      const canShare = await sharingModule.isAvailableAsync();

      if (!canShare) {
        setDataStatus('Backup created, but sharing is not available on this device.');
        showTransferNotification('Backup exported.');
        Alert.alert('Export complete', 'Your Walk Track backup file was created successfully.');
        return;
      }

      await sharingModule.shareAsync(fileUri, {
        dialogTitle: 'Export Walk Track data',
        mimeType: 'application/json',
      });

      setDataStatus('Backup file ready to save or share.');
        showTransferNotification('Backup exported.');
        Alert.alert('Export complete', 'Your Walk Track backup file is ready to save or share.');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unable to export your data.';
      Alert.alert('Export failed', message);
      setDataStatus(message);
    } finally {
      setIsExporting(false);
    }
  };

  const handleImportData = async () => {
    if (isImporting) {
      return;
    }

    setIsImporting(true);
    setDataStatus(null);

    try {
      const { documentPickerModule, fileSystemModule } = loadDataTransferModules();

      const result = await documentPickerModule.getDocumentAsync({
        type: 'application/json',
        copyToCacheDirectory: true,
        multiple: false,
      });

      if (result.canceled || !result.assets[0]?.uri) {
        return;
      }

      const fileContents = await fileSystemModule.readAsStringAsync(result.assets[0].uri, {
        encoding: fileSystemModule.EncodingType.UTF8,
      });
      const snapshot = parseAppDataSnapshot(fileContents);

      await replaceWalkingEntries(snapshot.entries);
      await replaceSettings(snapshot.settings);

      setDataStatus(`Imported ${snapshot.entries.length} day${snapshot.entries.length === 1 ? '' : 's'} of walking data.`);
      showTransferNotification('Backup imported.');
      Alert.alert('Import complete', 'Your Walk Track data and settings were restored successfully.');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unable to import the selected file.';
      Alert.alert('Import failed', message);
      setDataStatus(message);
    } finally {
      setIsImporting(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={styles.title}>More</Text>
        <Text style={styles.subtitle}>Settings and preferences.</Text>

        {transferNotification ? (
          <View style={styles.transferNotificationCard}>
            <Ionicons color={colors.textPrimary} name="notifications-outline" size={18} />
            <Text style={styles.transferNotificationText}>{transferNotification}</Text>
          </View>
        ) : null}

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
                    <Text
                      adjustsFontSizeToFit
                      ellipsizeMode="tail"
                      numberOfLines={1}
                      style={[styles.segmentedButtonText, active && styles.segmentedButtonTextActive]}
                    >
                      {label}
                    </Text>
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
                  <Text adjustsFontSizeToFit numberOfLines={1} style={styles.stepperValue}>
                    {formatDuration(settings.dailyGoalMinutes)}
                  </Text>
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
                  <Text adjustsFontSizeToFit numberOfLines={1} style={styles.stepperValue}>{settings.weeklyGoalDays}</Text>
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

        <View style={styles.sectionCard}>
          <Pressable onPress={() => setDataOpen((current) => !current)} style={styles.sectionHeaderButton}>
            <View style={styles.sectionHeaderTextWrap}>
              <Text style={styles.sectionTitle}>Data</Text>
              <Text style={styles.sectionSubtitle}>Import or export your dashboard data and settings.</Text>
            </View>
            <Ionicons color={colors.textPrimary} name={dataOpen ? 'chevron-up' : 'chevron-down'} size={20} />
          </Pressable>

          {dataOpen ? (
            <>
              <View style={styles.dataRow}>
                <View style={styles.rowTextWrap}>
                  <Text style={styles.rowTitle}>Export backup</Text>
                  <Text style={styles.rowDescription}>Create a JSON file with sessions and preferences.</Text>
                </View>
                <Pressable
                  accessibilityLabel="Export app data"
                  accessibilityRole="button"
                  disabled={isExporting || isImporting}
                  onPress={() => void handleExportData()}
                  style={[styles.dataActionButton, (isExporting || isImporting) && styles.dataActionButtonDisabled]}
                >
                  {isExporting ? (
                    <ActivityIndicator color={colors.textPrimary} size="small" />
                  ) : (
                    <Ionicons color={colors.textPrimary} name="share-outline" size={18} />
                  )}
                  <Text style={styles.dataActionButtonText}>Export</Text>
                </Pressable>
              </View>

              <View style={styles.dataRow}>
                <View style={styles.rowTextWrap}>
                  <Text style={styles.rowTitle}>Import backup</Text>
                  <Text style={styles.rowDescription}>Restore entries and settings from a JSON backup file.</Text>
                </View>
                <Pressable
                  accessibilityLabel="Import app data"
                  accessibilityRole="button"
                  disabled={isImporting || isExporting}
                  onPress={() => void handleImportData()}
                  style={[styles.dataActionButton, (isImporting || isExporting) && styles.dataActionButtonDisabled]}
                >
                  {isImporting ? (
                    <ActivityIndicator color={colors.textPrimary} size="small" />
                  ) : (
                    <Ionicons color={colors.textPrimary} name="download-outline" size={18} />
                  )}
                  <Text style={styles.dataActionButtonText}>Import</Text>
                </Pressable>
              </View>

              {dataStatus ? <Text style={styles.dataStatusText}>{dataStatus}</Text> : null}
            </>
          ) : null}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
