import React, { useEffect, useRef, useState } from 'react';
import {
  Animated,
  Easing,
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
import TimeWheelModal from './TimeWheelModal';

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
  onUpdateStartTime: (hour: number, minute: number) => void;
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
  onUpdateStartTime,
}: SessionModalProps) {
  const overlayOpacity = useRef(new Animated.Value(0)).current;
  const sheetTranslateY = useRef(new Animated.Value(24)).current;
  const sheetScale = useRef(new Animated.Value(0.98)).current;
  const [isTimeWheelVisible, setIsTimeWheelVisible] = useState(false);

  useEffect(() => {
    if (!visible) {
      return;
    }

    overlayOpacity.setValue(0);
    sheetTranslateY.setValue(24);
    sheetScale.setValue(0.98);

    Animated.parallel([
      Animated.timing(overlayOpacity, {
        toValue: 1,
        duration: 180,
        easing: Easing.out(Easing.quad),
        useNativeDriver: true,
      }),
      Animated.spring(sheetTranslateY, {
        toValue: 0,
        damping: 18,
        mass: 0.9,
        stiffness: 180,
        useNativeDriver: true,
      }),
      Animated.spring(sheetScale, {
        toValue: 1,
        damping: 18,
        mass: 0.9,
        stiffness: 180,
        useNativeDriver: true,
      }),
    ]).start();
  }, [overlayOpacity, sheetScale, sheetTranslateY, visible]);

  return (
    <Modal animationType="none" onRequestClose={onClose} transparent visible={visible}>
      <Animated.View style={[styles.modalOverlay, { opacity: overlayOpacity }]}>
        <Pressable accessibilityLabel="Close session modal" accessibilityRole="button" onPress={onClose} style={styles.modalDismissArea} />
        <Animated.View
          style={[
            styles.modalSheet,
            {
              transform: [{ translateY: sheetTranslateY }, { scale: sheetScale }],
            },
          ]}
        >
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
            <Text style={styles.modalCounterMeta}>
              For {formatReadableDate(selectedDate)} ·{' '}
              {formatDateKeyTimeRange(selectedKey, targetHour, targetMinute, Math.max(getPositiveMinutes(draftMinutes), 1))}
            </Text>
            <Pressable
              accessibilityLabel={`Change start time, currently ${formatHourLabel(targetHour)} ${String(targetMinute).padStart(2, '0')}`}
              accessibilityRole="button"
              onPress={() => setIsTimeWheelVisible(true)}
              style={styles.startTimePill}
            >
              <Ionicons color={colors.textSecondary} name="time-outline" size={14} />
              <Text style={styles.startTimePillText}>
                {formatHourLabel(targetHour)} {String(targetMinute).padStart(2, '0')}
              </Text>
              <Ionicons color={colors.textMuted} name="chevron-forward" size={13} />
            </Pressable>
          </View>

          <TimeWheelModal
            colors={colors}
            initialHour={targetHour}
            initialMinute={targetMinute}
            onCancel={() => setIsTimeWheelVisible(false)}
            onUpdate={(hour, minute) => {
              onUpdateStartTime(hour, minute);
              setIsTimeWheelVisible(false);
            }}
            visible={isTimeWheelVisible}
          />

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
            <Pressable accessibilityRole="button" onPress={onSave} style={styles.saveButtonWrapFull}>
              <LinearGradient colors={[colors.actionSurface, colors.actionSurface]} end={{ x: 1, y: 1 }} start={{ x: 0, y: 0 }} style={styles.saveButton}>
                <Ionicons color={colors.textPrimary} name={editingSession ? 'create-outline' : 'checkmark-circle'} size={22} />
                <Text style={styles.saveButtonText}>{editingSession ? 'Save changes' : 'Add session'}</Text>
              </LinearGradient>
            </Pressable>
          </View>
        </Animated.View>
      </Animated.View>
    </Modal>
  );
}
