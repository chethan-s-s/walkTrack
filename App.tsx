import React from 'react';
import { StatusBar } from 'expo-status-bar';
import { NavigationContainer } from '@react-navigation/native';
import { BottomTabScreenProps, createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { useColorScheme } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { AppSettingsProvider } from './src/context/AppSettingsContext';
import { WalkingDataProvider } from './src/context/WalkingDataContext';
import AddScreen from './src/screens/AddScreen/AddScreen';
import HistoryScreen from './src/screens/HistoryScreen/HistoryScreen';
import HomeScreen from './src/screens/HomeScreen/HomeScreen';
import MoreScreen from './src/screens/MoreScreen/MoreScreen';
import { getAppColors, getNavigationTheme } from './src/theme/palette';
import { RootTabParamList } from './src/types';
import AppTabBarIcon from './src/components/AppTabBarIcon';

const Tab = createBottomTabNavigator<RootTabParamList>();
const ComposePlaceholder = () => null;

export default function App() {
  const scheme = useColorScheme();
  const colors = getAppColors(scheme);
  const appTheme = getNavigationTheme(colors, scheme);

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
                tabBarIcon: ({ color, focused, size }) => (
                  <AppTabBarIcon
                    colors={colors}
                    focused={focused}
                    routeName={route.name}
                    size={size}
                    tintColor={color}
                  />
                ),
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
