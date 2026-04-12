import React from 'react';
import { StatusBar } from 'expo-status-bar';
import { NavigationContainer, DarkTheme } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { WalkingDataProvider } from './src/context/WalkingDataContext';
import AddScreen from './src/screens/AddScreen/AddScreen';
import HistoryScreen from './src/screens/HistoryScreen/HistoryScreen';
import HomeScreen from './src/screens/HomeScreen/HomeScreen';
import { RootTabParamList } from './src/types';

const Tab = createBottomTabNavigator<RootTabParamList>();

const appTheme = {
  ...DarkTheme,
  colors: {
    ...DarkTheme.colors,
    background: '#09090b',
    card: '#111113',
    primary: '#f5f5f5',
    text: '#fafafa',
    border: '#27272a',
  },
};

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
  return (
    <SafeAreaProvider>
      <WalkingDataProvider>
        <NavigationContainer theme={appTheme}>
          <StatusBar style="light" />
          <Tab.Navigator
            screenOptions={({ route }) => ({
              headerShown: false,
              tabBarShowLabel: true,
              tabBarActiveTintColor: '#fafafa',
              tabBarInactiveTintColor: '#fafafa',
              tabBarStyle: {
                backgroundColor: '#323232',
                borderTopColor: '#27272a',
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
