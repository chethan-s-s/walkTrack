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
              {canEditSelectedDate && suggestedMinute !== null ? (
                <View {...getCreateDragHandlers(hour)}>
                  <Pressable
                    accessibilityLabel={`Add session around ${formatHourLabel(hour)}`}
                    accessibilityRole="button"
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
                {sessions.map((session) => (
                  <View key={session.id} {...getMoveDragHandlers(session.logicalSession)}>
                    <Pressable
                      accessibilityHint={canEditSelectedDate ? 'Use the edit button to modify this session.' : undefined}
                      accessibilityLabel={`${session.displayMinutes} minute walk, ${formatSessionTimeRange(session.segment.createdAt, session.segment.minutes)}`}
                      accessibilityRole="summary"
                      style={[
                        styles.sessionCard,
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
                      {canEditSelectedDate ? (
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
                ))}
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
