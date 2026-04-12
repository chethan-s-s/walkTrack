import React from 'react';
import Svg, { Circle } from 'react-native-svg';
import { Text, View } from 'react-native';

import { AppColors } from '../theme/palette';

type GoalProgressRingProps = {
  value: number;
  goal: number;
  colors: AppColors;
  label: string;
  sublabel: string;
};

export default function GoalProgressRing({ colors, goal, label, sublabel, value }: GoalProgressRingProps) {
  const radius = 46;
  const strokeWidth = 10;
  const normalizedRadius = radius - strokeWidth / 2;
  const circumference = normalizedRadius * 2 * Math.PI;
  const progress = Math.min(value / Math.max(goal, 1), 1);
  const strokeDashoffset = circumference - progress * circumference;

  return (
    <View style={{ alignItems: 'center', justifyContent: 'center', width: radius * 2 + 12, height: radius * 2 + 12 }}>
      <Svg height={radius * 2} width={radius * 2}>
        <Circle
          cx={radius}
          cy={radius}
          fill="transparent"
          r={normalizedRadius}
          stroke={colors.surfaceAlt}
          strokeWidth={strokeWidth}
        />
        <Circle
          cx={radius}
          cy={radius}
          fill="transparent"
          r={normalizedRadius}
          stroke={colors.accent}
          strokeDasharray={`${circumference} ${circumference}`}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          strokeWidth={strokeWidth}
          transform={`rotate(-90 ${radius} ${radius})`}
        />
      </Svg>
      <View style={{ position: 'absolute', alignItems: 'center', justifyContent: 'center', gap: 2 }}>
        <Text style={{ color: colors.textPrimary, fontSize: 18, fontWeight: '800' }}>{label}</Text>
        <Text style={{ color: colors.textMuted, fontSize: 11, fontWeight: '700' }}>{sublabel}</Text>
      </View>
    </View>
  );
}
