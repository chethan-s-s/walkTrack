import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { AppColors } from '../theme/palette';
import { RootTabParamList } from '../types';

type IconName = React.ComponentProps<typeof Ionicons>['name'];

const getTabIconName = (routeName: keyof RootTabParamList, focused: boolean): IconName => {
  if (routeName === 'Home') return focused ? 'home' : 'home-outline';
  if (routeName === 'Add') return focused ? 'walk' : 'walk-outline';
  if (routeName === 'Compose') return focused ? 'add' : 'add';
  if (routeName === 'More') return focused ? 'menu' : 'menu-outline';
  return focused ? 'time' : 'time-outline';
};

type AppTabBarIconProps = {
  colors: AppColors;
  focused: boolean;
  routeName: keyof RootTabParamList;
  size: number;
  tintColor: string;
};

export default function AppTabBarIcon({ colors, focused, routeName, size, tintColor }: AppTabBarIconProps) {
  const iconName = getTabIconName(routeName, focused);

  if (routeName === 'Compose') {
    const styles = StyleSheet.create({
      wrap: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: '#ffffff',
        alignItems: 'center',
        justifyContent: 'center',
        shadowColor: colors.shadow,
        shadowOpacity: 0.18,
        shadowRadius: 8,
        shadowOffset: { width: 0, height: 4 },
        elevation: 6,
        marginTop: 14,
      },
    });

    return (
      <View style={styles.wrap}>
        <Ionicons color="#09090b" name={iconName} size={size + 6} />
      </View>
    );
  }

  return <Ionicons color={tintColor} name={iconName} size={size} />;
}
