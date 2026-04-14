import React from 'react';
import {
  GestureResponderHandlers,
  LayoutChangeEvent,
  Pressable,
  Text,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { AppColors } from '../../../theme/palette';
import { WalkingSession } from '../../../types';
import { formatDuration } from '../../../utils/formatDuration';
import {
  formatHourLabel,
  formatSessionTimeRange,
} from '../../../utils/time';
import { createStyles } from '../AddScreenStyles';

type TimelineSessionItem = {
  displayMinutes: number;
  id: string;
  logicalSession: WalkingSession;
  segment: WalkingSession;
};

type TimelineGroup = {
  hour: number;
  sessions: TimelineSessionItem[];
};

type AddTimelineProps = {
  canEditSelectedDate: boolean;
  colors: AppColors;
  createDraggedHoursSet: Set<number>;
  currentHour: number;
  groupedTimeline: TimelineGroup[];
  isCurrentDate: boolean;
  moveDraggedHoursSet: Set<number>;
  moveDragSessionId?: string;
  onConfirmDelete: (session: WalkingSession) => void;
  onOpenEditModal: (session: WalkingSession) => void;
  onOpenModal: (hour?: number, minutes?: string, minute?: number) => void;
  onRowLayout: (hour: number, event: LayoutChangeEvent) => void;
  onSessionLongPress: (session: WalkingSession) => void;
  onToggleSessionSelection: (session: WalkingSession) => void;
  selectedSessionGroupIds: Set<string>;
  selectionMode: boolean;
  setRowRef: (hour: number, node: View | null) => void;
  suggestedStartMinutes: Map<number, number | null>;
  styles: ReturnType<typeof createStyles>;
  getCreateDragHandlers: (hour: number) => GestureResponderHandlers;
  getMoveDragHandlers: (session: WalkingSession) => GestureResponderHandlers;
};

export default function AddTimeline({
  canEditSelectedDate,
  colors,
  createDraggedHoursSet,
  currentHour,
  groupedTimeline,
  isCurrentDate,
  moveDraggedHoursSet,
  moveDragSessionId,
  onConfirmDelete,
  onOpenEditModal,
  onOpenModal,
  onRowLayout,
  onSessionLongPress,
  onToggleSessionSelection,
  selectedSessionGroupIds,
  selectionMode,
  setRowRef,
  suggestedStartMinutes,
  styles,
  getCreateDragHandlers,
  getMoveDragHandlers,
}: AddTimelineProps) {
  return (
    <View style={styles.timelineCard}>
      {/* {!hasSessions ? (
        <View style={styles.emptyDayCard}>
          <Text style={styles.emptyDayTitle}>No walks saved yet</Text>
          <Text style={styles.emptyDayText}>
            Tap the add button on a time slot, or use the floating action button to log today’s walk.
          </Text>
        </View>
      ) : null} */}

      {groupedTimeline.map(({ hour, sessions }) => (
        (() => {
          const suggestedMinute = suggestedStartMinutes.get(hour) ?? null;

          return (
        <View
          key={hour}
          onLayout={(event) => onRowLayout(hour, event)}
          ref={(node) => {
            setRowRef(hour, node);
          }}
          style={styles.timelineRow}
        >
          <View style={styles.timelineLine} />
          <View style={styles.hourColumn}>
            <View
              style={[
                styles.hourBadge,
                (createDraggedHoursSet.has(hour) || moveDraggedHoursSet.has(hour)) && styles.hourBadgeActive,
              ]}
            >
              <View style={styles.hourBadgeContent}>
                <Text adjustsFontSizeToFit numberOfLines={1} style={styles.hourMarker}>
                  {formatHourLabel(hour)}
                </Text>
                {isCurrentDate && currentHour === hour ? <View style={styles.hourCurrentDot} /> : null}
              </View>
            </View>
          </View>

          <View
            style={[
              styles.timelineContentColumn,
              createDraggedHoursSet.has(hour) && styles.timelineContentColumnCreateActive,
              moveDraggedHoursSet.has(hour) && styles.timelineContentColumnMoveActive,
            ]}
          >
            <View style={styles.timelineHeaderRow}>
              {canEditSelectedDate && !selectionMode && suggestedMinute !== null ? (
                <View {...getCreateDragHandlers(hour)}>
                  <Pressable
                    accessibilityHint="Creates a new walk starting in this hour"
                    accessibilityLabel={`Add session around ${formatHourLabel(hour)}`}
                    accessibilityRole="button"
                    hitSlop={8}
                    onPress={() => onOpenModal(hour, '30', suggestedMinute)}
                    style={[
                      styles.hourActionButton,
                      createDraggedHoursSet.has(hour) && styles.hourActionButtonActive,
                    ]}
                  >
                    <Ionicons color={colors.textPrimary} name="add" size={14} />
                  </Pressable>
                </View>
              ) : (
                <View style={styles.hourActionSpacer} />
              )}
            </View>
            {sessions.length ? (
              <View style={styles.sessionList}>
                {sessions.map((session) => {
                  const groupId = session.logicalSession.batchId ?? session.logicalSession.id;
                  const isSelected = selectedSessionGroupIds.has(groupId);

                  return (
                  <View
                    key={session.id}
                    style={styles.sessionSelectableWrap}
                    {...(selectionMode ? {} : getMoveDragHandlers(session.logicalSession))}
                  >
                    {selectionMode ? (
                      <View style={[styles.sessionSelectionIndicator, isSelected && styles.sessionSelectionIndicatorActive]}>
                        {isSelected ? <Ionicons color={colors.background} name="checkmark" size={14} /> : null}
                      </View>
                    ) : null}
                    <Pressable
                      accessibilityHint={
                        selectionMode
                          ? 'Double tap to toggle this session in the current selection.'
                          : canEditSelectedDate
                            ? 'Long press to select for bulk actions. Use the edit button to change it.'
                            : undefined
                      }
                      accessibilityLabel={`${session.displayMinutes} minute walk, ${formatSessionTimeRange(session.segment.createdAt, session.segment.minutes)}`}
                      accessibilityState={{ selected: isSelected }}
                      delayLongPress={220}
                      onLongPress={() => onSessionLongPress(session.logicalSession)}
                      onPress={() => {
                        if (selectionMode) {
                          onToggleSessionSelection(session.logicalSession);
                        }
                      }}
                      accessibilityRole="button"
                      style={[
                        styles.sessionCard,
                        selectionMode && styles.sessionCardSelectable,
                        isSelected && styles.sessionCardSelected,
                        moveDragSessionId === session.logicalSession.id && styles.sessionCardDragging,
                      ]}
                    >
                      <View style={styles.sessionDot} />
                      <View style={styles.sessionTextWrap}>
                        <Text ellipsizeMode="tail" numberOfLines={1} style={styles.sessionTitle}>
                          {formatDuration(session.displayMinutes)} walk
                        </Text>
                        <Text ellipsizeMode="tail" numberOfLines={1} style={styles.sessionMeta}>
                          {formatSessionTimeRange(session.segment.createdAt, session.segment.minutes)}
                        </Text>
                      </View>
                      {canEditSelectedDate && !selectionMode ? (
                        <View style={styles.sessionActions}>
                          <Pressable
                            accessibilityLabel={`Edit ${session.logicalSession.minutes} minute session`}
                            accessibilityRole="button"
                            hitSlop={8}
                            onPress={(event) => {
                              event.stopPropagation();
                              onOpenEditModal(session.logicalSession);
                            }}
                            style={styles.sessionEditButton}
                          >
                            <Ionicons color={colors.textPrimary} name="create-outline" size={16} />
                          </Pressable>
                          <Pressable
                            accessibilityLabel={`Delete ${session.logicalSession.minutes} minute session`}
                            accessibilityRole="button"
                            hitSlop={8}
                            onPress={(event) => {
                              event.stopPropagation();
                              onConfirmDelete(session.logicalSession);
                            }}
                            style={styles.sessionDeleteButton}
                          >
                            <Ionicons color={colors.textPrimary} name="trash-outline" size={16} />
                          </Pressable>
                        </View>
                      ) : null}
                    </Pressable>
                  </View>
                  );
                })}
              </View>
            ) : (
              <View style={styles.emptyHourWrap} />
            )}
          </View>
        </View>
          );
        })()
      ))}
    </View>
  );
}
