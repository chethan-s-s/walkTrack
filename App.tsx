import React from 'react';
import { StatusBar } from 'expo-status-bar';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { useColorScheme } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { WalkingDataProvider } from './src/context/WalkingDataContext';
import AddScreen from './src/screens/AddScreen/AddScreen';
import HistoryScreen from './src/screens/HistoryScreen/HistoryScreen';
import HomeScreen from './src/screens/HomeScreen/HomeScreen';
import { getAppColors, getNavigationTheme } from './src/theme/palette';
import { RootTabParamList } from './src/types';

const Tab = createBottomTabNavigator<RootTabParamList>();

type IconName = React.ComponentProps<typeof Ionicons>['name'];

const getTabIconName = (routeName: keyof RootTabParamList, focused: boolean): IconName => {
  if (routeName === 'Home') {
    return focused ? 'home' : 'home-outline';
  }

  if (routeName === 'Add') {
    return focused ? 'add-circle' : 'add-circle-outline';
  }

  return focused ? 'time' : 'time-outline';
};

export default function App() {
  const scheme = useColorScheme();
  const colors = getAppColors(scheme);
  const appTheme = getNavigationTheme(colors, scheme);

  return (
    <SafeAreaProvider>
      <WalkingDataProvider>
        <NavigationContainer theme={appTheme}>
          <StatusBar style={scheme === 'light' ? 'dark' : 'light'} />
          <Tab.Navigator
            screenOptions={({ route }) => ({
              headerShown: false,
              tabBarShowLabel: true,
              tabBarActiveTintColor: colors.textPrimary,
              tabBarInactiveTintColor: colors.textPrimary,
              tabBarStyle: {
                backgroundColor: colors.tabBar,
                borderTopColor: colors.border,
                height: 56,
                paddingTop: 4,
                paddingBottom: 4,
              },
              tabBarLabelStyle: {
                fontSize: 12,
                fontWeight: '700',
              },
              tabBarIcon: ({ color, focused, size }) => (
                <Ionicons color={color} name={getTabIconName(route.name, focused)} size={size} />
              ),
            })}
          >
            <Tab.Screen component={HomeScreen} name="Home" />
            <Tab.Screen component={AddScreen} name="Add" />
            <Tab.Screen component={HistoryScreen} name="History" />
          </Tab.Navigator>
        </NavigationContainer>
      </WalkingDataProvider>
    </SafeAreaProvider>
  );
}
