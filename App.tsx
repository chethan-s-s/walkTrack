import React from 'react';
import { StatusBar } from 'expo-status-bar';
import { NavigationContainer } from '@react-navigation/native';
import { BottomTabScreenProps, createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, useColorScheme, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { AppSettingsProvider } from './src/context/AppSettingsContext';
import { WalkingDataProvider } from './src/context/WalkingDataContext';
import AddScreen from './src/screens/AddScreen/AddScreen';
import HistoryScreen from './src/screens/HistoryScreen/HistoryScreen';
import HomeScreen from './src/screens/HomeScreen/HomeScreen';
import MoreScreen from './src/screens/MoreScreen/MoreScreen';
import { getAppColors, getNavigationTheme } from './src/theme/palette';
import { RootTabParamList } from './src/types';

const Tab = createBottomTabNavigator<RootTabParamList>();
const ComposePlaceholder = () => null;

type IconName = React.ComponentProps<typeof Ionicons>['name'];

const getTabIconName = (routeName: keyof RootTabParamList, focused: boolean): IconName => {
  if (routeName === 'Home') {
    return focused ? 'home' : 'home-outline';
  }

  if (routeName === 'Add') {
    return focused ? 'walk' : 'walk-outline';
  }

  if (routeName === 'Compose') {
    return focused ? 'add' : 'add';
  }

  if (routeName === 'More') {
    return focused ? 'menu' : 'menu-outline';
  }

  return focused ? 'time' : 'time-outline';
};

export default function App() {
  const scheme = useColorScheme();
  const colors = getAppColors(scheme);
  const appTheme = getNavigationTheme(colors, scheme);
  const styles = React.useMemo(
    () =>
      StyleSheet.create({
        composeIconWrap: {
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
      }),
    [colors.shadow],
  );

  return (
    <SafeAreaProvider>
      <AppSettingsProvider>
        <WalkingDataProvider>
          <NavigationContainer theme={appTheme}>
            <StatusBar animated backgroundColor={colors.background} style={scheme === 'light' ? 'dark' : 'light'} />
            <Tab.Navigator
              screenOptions={({ route }) => ({
                headerShown: false,
                tabBarShowLabel: true,
                tabBarLabelPosition: 'below-icon',
                tabBarActiveTintColor: colors.textPrimary,
                tabBarInactiveTintColor: colors.textMuted,
                tabBarStyle: {
                  backgroundColor: colors.tabBar,
                  borderTopColor: colors.border,
                  height: 66,
                  paddingTop: 2,
                  paddingBottom: 2,
                },
                tabBarLabelStyle: {
                  fontSize: 12,
                  fontWeight: '700',
                  marginTop: 0,
                },
                tabBarItemStyle: {
                  paddingVertical: 4,
                },
                tabBarIcon: ({ color, focused, size }) => {
                  if (route.name === 'Compose') {
                    return (
                      <View style={styles.composeIconWrap}>
                        <Ionicons color="#09090b" name={getTabIconName(route.name, focused)} size={size + 6} />
                      </View>
                    );
                  }

                  return <Ionicons color={color} name={getTabIconName(route.name, focused)} size={size} />;
                },
              })}
            >
              <Tab.Screen component={HomeScreen} name="Home" options={{ tabBarLabel: 'Home', title: 'Home' }} />
              <Tab.Screen component={AddScreen} name="Add" options={{ title: 'Walk', tabBarLabel: 'Walk' }} />
              <Tab.Screen
                component={ComposePlaceholder}
                listeners={({ navigation }: BottomTabScreenProps<RootTabParamList, 'Compose'>) => ({
                  tabPress: (event) => {
                    event.preventDefault();
                    navigation.navigate('Add', { openComposerToken: Date.now() });
                  },
                })}
                name="Compose"
                options={{ title: 'Add', tabBarLabel: '' }}
              />
              <Tab.Screen component={HistoryScreen} name="History" options={{ tabBarLabel: 'History', title: 'History' }} />
              <Tab.Screen component={MoreScreen} name="More" options={{ tabBarLabel: 'More', title: 'More' }} />
            </Tab.Navigator>
          </NavigationContainer>
        </WalkingDataProvider>
      </AppSettingsProvider>
    </SafeAreaProvider>
  );
}
