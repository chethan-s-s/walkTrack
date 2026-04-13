import React from 'react';
import {
  Modal,
  Pressable,
  Text,
  TextInput,
  View,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';

import { AppColors } from '../../../theme/palette';
import { WalkingSession } from '../../../types';
import {
  formatDateKeyTimeRange,
  formatHourLabel,
  formatReadableDate,
} from '../../../utils/time';
import { createStyles } from '../AddScreenStyles';

type SessionModalProps = {
  colors: AppColors;
  draftMinutes: string;
  editingSession: WalkingSession | null;
  selectedDate: Date;
  selectedKey: string;
  targetHour: number;
  targetMinute: number;
  visible: boolean;
  warningToast?: React.ReactNode;
  styles: ReturnType<typeof createStyles>;
  quickMinutes: number[];
  getPositiveMinutes: (value: string) => number;
  clampMinutes: (minutes: number) => number;
  onChangeDraftMinutes: (value: string) => void;
  onClose: () => void;
  onSave: () => void;
  onShiftTargetHour: (delta: -1 | 1) => void;
  onShiftTargetMinute: (delta: -1 | 1) => void;
};

export default function SessionModal({
  colors,
  draftMinutes,
  editingSession,
  selectedDate,
  selectedKey,
  targetHour,
  targetMinute,
  visible,
  warningToast,
  styles,
  quickMinutes,
  getPositiveMinutes,
  clampMinutes,
  onChangeDraftMinutes,
  onClose,
  onSave,
  onShiftTargetHour,
  onShiftTargetMinute,
}: SessionModalProps) {
  return (
    <Modal animationType="slide" onRequestClose={onClose} transparent visible={visible}>
      <View style={styles.modalOverlay}>
        <Pressable accessibilityLabel="Close session modal" accessibilityRole="button" onPress={onClose} style={styles.modalDismissArea} />
        <View style={styles.modalSheet}>
          <View style={styles.modalHandle} />
          <Text style={styles.modalTitle}>{editingSession ? 'Edit walking session' : 'Add walking minutes'}</Text>
          {/* <Text style={styles.modalSubtitle}>
            {editingSession
              ? `Update to ${draftMinutes || '0'} mins.`
              : `Add to ${draftMinutes || '0'} mins.`}
          </Text> */}

          {warningToast ? <View style={styles.modalToastWrap}>{warningToast}</View> : null}

          <View style={styles.modalCounterCard}>
            <View style={styles.modalCounterInputRow}>
              <TextInput
                accessibilityLabel="Walking minutes"
                keyboardType="number-pad"
                onChangeText={(text) => onChangeDraftMinutes(text.replace(/[^0-9]/g, ''))}
                placeholder="0"
                placeholderTextColor={colors.textMuted}
                style={styles.modalCounterInput}
                value={draftMinutes}
              />
              <Text style={styles.modalCounterUnit}>min</Text>
            </View>
            <View style={styles.timePickerRow}>
              <View style={styles.timePickerField}>
                <Text style={styles.timePickerLabel}>Hour</Text>
                <View style={styles.timeStepperRow}>
                  <Pressable
                    accessibilityLabel="Decrease hour"
                    accessibilityRole="button"
                    hitSlop={8}
                    onPress={() => onShiftTargetHour(-1)}
                    style={styles.timeAdjustButton}
                  >
                    <Ionicons color={colors.textPrimary} name="remove" size={16} />
                  </Pressable>
                  <View style={styles.timeAdjustCenter}>
                    <Text adjustsFontSizeToFit numberOfLines={1} style={styles.timeAdjustLabel}>
                      {formatHourLabel(targetHour)}
                    </Text>
                  </View>
                  <Pressable
                    accessibilityLabel="Increase hour"
                    accessibilityRole="button"
                    hitSlop={8}
                    onPress={() => onShiftTargetHour(1)}
                    style={styles.timeAdjustButton}
                  >
                    <Ionicons color={colors.textPrimary} name="add" size={16} />
                  </Pressable>
                </View>
              </View>

              <View style={styles.timePickerField}>
                <Text style={styles.timePickerLabel}>Minute</Text>
                <View style={styles.timeStepperRow}>
                  <Pressable
                    accessibilityLabel="Decrease minute"
                    accessibilityRole="button"
                    hitSlop={8}
                    onPress={() => onShiftTargetMinute(-1)}
                    style={styles.timeAdjustButton}
                  >
                    <Ionicons color={colors.textPrimary} name="remove" size={16} />
                  </Pressable>
                  <View style={styles.timeAdjustCenter}>
                    <Text adjustsFontSizeToFit numberOfLines={1} style={styles.timeAdjustLabel}>
                      {String(targetMinute).padStart(2, '0')}
                    </Text>
                  </View>
                  <Pressable
                    accessibilityLabel="Increase minute"
                    accessibilityRole="button"
                    hitSlop={8}
                    onPress={() => onShiftTargetMinute(1)}
                    style={styles.timeAdjustButton}
                  >
                    <Ionicons color={colors.textPrimary} name="add" size={16} />
                  </Pressable>
                </View>
              </View>
            </View>
            <Text style={styles.modalCounterMeta}>
              For {formatReadableDate(selectedDate)} ·{' '}
              {formatDateKeyTimeRange(selectedKey, targetHour, targetMinute, Math.max(getPositiveMinutes(draftMinutes), 1))}
            </Text>
          </View>

          <View style={styles.adjustRow}>
            {[-5, -1, 1, 5].map((delta) => (
              <Pressable
                key={delta}
                accessibilityLabel={`${delta > 0 ? 'Increase' : 'Decrease'} minutes by ${Math.abs(delta)}`}
                accessibilityRole="button"
                onPress={() =>
                  onChangeDraftMinutes(String(clampMinutes(getPositiveMinutes(draftMinutes || '0') + delta)))
                }
                style={styles.adjustButton}
              >
                <Text style={styles.adjustButtonText}>{delta > 0 ? `+${delta}` : delta} min</Text>
              </Pressable>
            ))}
          </View>

          <View style={styles.quickWrap}>
            {quickMinutes.map((value) => {
              const active = value === getPositiveMinutes(draftMinutes);

              return (
                <Pressable
                  key={value}
                  accessibilityLabel={`Set minutes to ${value}`}
                  accessibilityRole="button"
                  onPress={() => onChangeDraftMinutes(String(value))}
                  style={[styles.quickChip, active && styles.quickChipActive]}
                >
                  <Text
                    adjustsFontSizeToFit
                    ellipsizeMode="tail"
                    numberOfLines={1}
                    style={[styles.quickChipText, active && styles.quickChipTextActive]}
                  >
                    {value} min
                  </Text>
                </Pressable>
              );
            })}
          </View>

          <View style={styles.modalActionRow}>
            <Pressable accessibilityRole="button" onPress={onClose} style={styles.cancelButton}>
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </Pressable>
            <Pressable accessibilityRole="button" onPress={onSave} style={styles.saveButtonWrap}>
              <LinearGradient colors={[colors.actionSurface, colors.actionSurface]} end={{ x: 1, y: 1 }} start={{ x: 0, y: 0 }} style={styles.saveButton}>
                <Ionicons color={colors.textPrimary} name={editingSession ? 'create-outline' : 'checkmark-circle'} size={22} />
                <Text style={styles.saveButtonText}>{editingSession ? 'Save changes' : 'Add session'}</Text>
              </LinearGradient>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}
