import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Animated,
  Easing,
  Modal,
  NativeScrollEvent,
  NativeSyntheticEvent,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';

import { AppColors } from '../../../theme/palette';
import { formatHourLabel } from '../../../utils/time';

const ITEM_HEIGHT = 52;
const VISIBLE_ITEMS = 5;
const WHEEL_HEIGHT = ITEM_HEIGHT * VISIBLE_ITEMS;

type WheelPickerProps = {
  colors: AppColors;
  items: number[];
  label: (value: number) => string;
  onChangeValue: (value: number) => void;
  selectedValue: number;
  styles: ReturnType<typeof createWheelStyles>;
};


function WheelPicker({ colors, items, label, onChangeValue, selectedValue, styles }: WheelPickerProps) {
  const scrollRef = useRef<ScrollView>(null);
  const isScrolling = useRef(false);
  const selectedIndex = items.indexOf(selectedValue);

  // Scroll to the selected item on mount / when selectedValue changes externally
  useEffect(() => {
    if (isScrolling.current) return;
    const index = items.indexOf(selectedValue);
    if (index >= 0) {
      scrollRef.current?.scrollTo({ y: index * ITEM_HEIGHT, animated: false });
    }
  }, [items, selectedValue]);

  const handleScrollEnd = useCallback(
    (event: NativeSyntheticEvent<NativeScrollEvent>) => {
      isScrolling.current = false;
      const offsetY = event.nativeEvent.contentOffset.y;
      const index = Math.round(offsetY / ITEM_HEIGHT);
      const clamped = Math.max(0, Math.min(items.length - 1, index));
      const value = items[clamped];
      if (value !== undefined && value !== selectedValue) {
        onChangeValue(value);
      }
    },
    [items, onChangeValue, selectedValue],
  );

  const handleScrollBegin = useCallback(() => {
    isScrolling.current = true;
  }, []);

  return (
    <View style={styles.wheelColumn}>
      <View pointerEvents="none" style={styles.wheelSelectionHighlight} />
      <ScrollView
        ref={scrollRef}
        contentContainerStyle={{ paddingVertical: ITEM_HEIGHT * 2 }}
        decelerationRate="fast"
        onMomentumScrollBegin={handleScrollBegin}
        onMomentumScrollEnd={handleScrollEnd}
        onScrollBeginDrag={handleScrollBegin}
        onScrollEndDrag={handleScrollEnd}
        scrollEventThrottle={16}
        showsVerticalScrollIndicator={false}
        snapToInterval={ITEM_HEIGHT}
        style={styles.wheelScroll}
      >
        {items.map((item, index) => (
          <View key={item} style={styles.wheelItem}>
            <Text
              style={[
                styles.wheelItemText,
                index === selectedIndex && styles.wheelItemTextSelected,
              ]}
            >
              {label(item)}
            </Text>
          </View>
        ))}
      </ScrollView>
      <LinearGradient
        colors={[colors.surface, 'transparent']}
        end={{ x: 0, y: 1 }}
        pointerEvents="none"
        start={{ x: 0, y: 0 }}
        style={styles.wheelFadeTop}
      />
      <LinearGradient
        colors={['transparent', colors.surface]}
        end={{ x: 0, y: 1 }}
        pointerEvents="none"
        start={{ x: 0, y: 0 }}
        style={styles.wheelFadeBottom}
      />
    </View>
  );
}

const createWheelStyles = (colors: AppColors) =>
  StyleSheet.create({
    overlay: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.55)',
      justifyContent: 'flex-end',
    },
    sheet: {
      backgroundColor: colors.surface,
      borderTopLeftRadius: 28,
      borderTopRightRadius: 28,
      paddingBottom: 32,
      paddingHorizontal: 20,
      paddingTop: 14,
      gap: 20,
    },
    handle: {
      width: 40,
      height: 4,
      borderRadius: 2,
      backgroundColor: colors.textMuted,
      alignSelf: 'center',
      marginBottom: 4,
    },
    title: {
      color: colors.textPrimary,
      fontSize: 18,
      fontWeight: '800',
      textAlign: 'center',
    },
    wheelsRow: {
      flexDirection: 'row',
      height: WHEEL_HEIGHT,
      gap: 12,
    },
    wheelColumn: {
      flex: 1,
      position: 'relative',
      overflow: 'hidden',
      height: WHEEL_HEIGHT,
    },
    wheelScroll: {
      flex: 1,
    },
    wheelSelectionHighlight: {
      position: 'absolute',
      top: ITEM_HEIGHT * 2,
      left: 0,
      right: 0,
      height: ITEM_HEIGHT,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: colors.actionBorder,
      zIndex: 1,
    },
    wheelItem: {
      height: ITEM_HEIGHT,
      alignItems: 'center',
      justifyContent: 'center',
    },
    wheelItemText: {
      color: colors.textMuted,
      fontSize: 20,
      fontWeight: '600',
      textAlign: 'center',
    },
    wheelItemTextSelected: {
      color: colors.textPrimary,
      fontSize: 22,
      fontWeight: '800',
    },
    wheelFadeTop: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      height: ITEM_HEIGHT * 2,
      zIndex: 2,
    },
    wheelFadeBottom: {
      position: 'absolute',
      bottom: 0,
      left: 0,
      right: 0,
      height: ITEM_HEIGHT * 2,
      zIndex: 2,
    },
    wheelLabel: {
      color: colors.textMuted,
      fontSize: 12,
      fontWeight: '700',
      textTransform: 'uppercase',
      letterSpacing: 0.5,
      textAlign: 'center',
    },
    wheelLabelRow: {
      flexDirection: 'row',
      gap: 12,
    },
    wheelLabelCell: {
      flex: 1,
    },
    actionRow: {
      flexDirection: 'row',
      gap: 12,
    },
    cancelButton: {
      flex: 1,
      minHeight: 54,
      borderRadius: 22,
      backgroundColor: colors.surfaceAlt,
      borderWidth: 1,
      borderColor: colors.actionBorder,
      alignItems: 'center',
      justifyContent: 'center',
    },
    cancelButtonText: {
      color: colors.textPrimary,
      fontSize: 18,
      fontWeight: '800',
    },
    updateButtonWrap: {
      flex: 1.4,
    },
    updateButton: {
      borderRadius: 22,
      minHeight: 54,
      backgroundColor: colors.actionSurface,
      justifyContent: 'center',
      alignItems: 'center',
      flexDirection: 'row',
      gap: 10,
    },
    updateButtonText: {
      color: colors.textPrimary,
      fontSize: 18,
      fontWeight: '800',
    },
  });

const HOURS = Array.from({ length: 24 }, (_, i) => i);
const MINUTES = Array.from({ length: 60 }, (_, i) => i);

type TimeWheelModalProps = {
  colors: AppColors;
  initialHour: number;
  initialMinute: number;
  onCancel: () => void;
  onUpdate: (hour: number, minute: number) => void;
  visible: boolean;
};

export default function TimeWheelModal({
  colors,
  initialHour,
  initialMinute,
  onCancel,
  onUpdate,
  visible,
}: TimeWheelModalProps) {
  const styles = React.useMemo(() => createWheelStyles(colors), [colors]);
  const [draftHour, setDraftHour] = useState(initialHour);
  const [draftMinute, setDraftMinute] = useState(initialMinute);
  const overlayOpacity = useRef(new Animated.Value(0)).current;
  const sheetTranslateY = useRef(new Animated.Value(300)).current;

  useEffect(() => {
    if (visible) {
      setDraftHour(initialHour);
      setDraftMinute(initialMinute);
      overlayOpacity.setValue(0);
      sheetTranslateY.setValue(300);
      Animated.parallel([
        Animated.timing(overlayOpacity, {
          toValue: 1,
          duration: 200,
          easing: Easing.out(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.spring(sheetTranslateY, {
          toValue: 0,
          damping: 20,
          mass: 0.9,
          stiffness: 200,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [visible, initialHour, initialMinute, overlayOpacity, sheetTranslateY]);

  const handleUpdate = () => {
    onUpdate(draftHour, draftMinute);
  };

  return (
    <Modal animationType="none" onRequestClose={onCancel} transparent visible={visible}>
      <Animated.View style={[styles.overlay, { opacity: overlayOpacity }]}>
        <Pressable
          accessibilityLabel="Dismiss time picker"
          onPress={onCancel}
          style={StyleSheet.absoluteFillObject}
        />
        <Animated.View style={[styles.sheet, { transform: [{ translateY: sheetTranslateY }] }]}>
          <View style={styles.handle} />
          <Text style={styles.title}>Set Start Time</Text>

          <View style={styles.wheelLabelRow}>
            <View style={styles.wheelLabelCell}>
              <Text style={styles.wheelLabel}>Hour</Text>
            </View>
            <View style={styles.wheelLabelCell}>
              <Text style={styles.wheelLabel}>Minute</Text>
            </View>
          </View>

          <View style={styles.wheelsRow}>
            <WheelPicker
              colors={colors}
              items={HOURS}
              label={formatHourLabel}
              onChangeValue={setDraftHour}
              selectedValue={draftHour}
              styles={styles}
            />
            <WheelPicker
              colors={colors}
              items={MINUTES}
              label={(m) => String(m).padStart(2, '0')}
              onChangeValue={setDraftMinute}
              selectedValue={draftMinute}
              styles={styles}
            />
          </View>

          <View style={styles.actionRow}>
            <Pressable accessibilityRole="button" onPress={onCancel} style={styles.cancelButton}>
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </Pressable>
            <Pressable accessibilityRole="button" onPress={handleUpdate} style={styles.updateButtonWrap}>
              <LinearGradient
                colors={[colors.actionSurface, colors.actionSurface]}
                end={{ x: 1, y: 1 }}
                start={{ x: 0, y: 0 }}
                style={styles.updateButton}
              >
                <Ionicons color={colors.textPrimary} name="checkmark-circle" size={22} />
                <Text style={styles.updateButtonText}>Update</Text>
              </LinearGradient>
            </Pressable>
          </View>
        </Animated.View>
      </Animated.View>
    </Modal>
  );
}
