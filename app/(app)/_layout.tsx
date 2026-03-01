import React, { useEffect, useMemo } from 'react';
import { Tabs, Redirect } from 'expo-router';
import { View, Text, Image, StyleSheet, TouchableOpacity, Dimensions } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
} from 'react-native-reanimated';
import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { useAuth } from '@/hooks/useAuth';
import { OfflineBanner } from '@/components/OfflineBanner';
import { Icon } from '@/components';

const logo = require('@/assets/logo.png');

const SCREEN_WIDTH = Dimensions.get('window').width;

function CustomTabBar({ state, descriptors, navigation }: BottomTabBarProps) {
  // Filter to only tabs that have an icon defined (hidden tabs use href:null and have no icon)
  const visibleRoutes = useMemo(
    () =>
      state.routes.filter((route) => {
        const options = descriptors[route.key].options;
        return options.tabBarIcon !== undefined;
      }),
    [state.routes, descriptors]
  );

  const tabCount = visibleRoutes.length;
  const tabWidth = SCREEN_WIDTH / tabCount;

  // Determine the visible tab index for the current active route
  const activeVisibleIndex = useMemo(() => {
    const activeRoute = state.routes[state.index];
    const idx = visibleRoutes.findIndex((r) => r.key === activeRoute.key);
    // If active route is a hidden tab, return -1
    return idx;
  }, [state.index, state.routes, visibleRoutes]);

  const translateX = useSharedValue(0);

  useEffect(() => {
    if (activeVisibleIndex >= 0) {
      translateX.value = withTiming(activeVisibleIndex * tabWidth + tabWidth / 2 - 3, {
        duration: 250,
      });
    }
  }, [activeVisibleIndex, tabWidth, translateX]);

  const indicatorStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }],
  }));

  return (
    <View style={customTabBarStyles.container}>
      <View style={customTabBarStyles.tabRow}>
        {visibleRoutes.map((route, index) => {
          const { options } = descriptors[route.key];
          const isFocused = activeVisibleIndex === index;

          const label = options.title ?? route.name;
          const color = isFocused ? '#c97454' : '#a8a29e';

          const onPress = () => {
            const event = navigation.emit({
              type: 'tabPress',
              target: route.key,
              canPreventDefault: true,
            });

            if (!isFocused && !event.defaultPrevented) {
              navigation.navigate(route.name, route.params);
            }
          };

          const onLongPress = () => {
            navigation.emit({
              type: 'tabLongPress',
              target: route.key,
            });
          };

          return (
            <TouchableOpacity
              key={route.key}
              accessibilityRole="button"
              accessibilityState={isFocused ? { selected: true } : {}}
              accessibilityLabel={options.tabBarAccessibilityLabel}
              testID={options.tabBarButtonTestID}
              onPress={onPress}
              onLongPress={onLongPress}
              style={customTabBarStyles.tab}
            >
              {options.tabBarIcon?.({ focused: isFocused, color, size: 24 })}
              <Text
                style={[
                  customTabBarStyles.label,
                  { color },
                ]}
              >
                {label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
      <Animated.View style={[customTabBarStyles.indicator, indicatorStyle]} />
    </View>
  );
}

export default function AppLayout() {
  const { isAuthenticated, isLoading, user } = useAuth();

  // Redirect unauthenticated users
  if (!isLoading && !isAuthenticated) {
    return <Redirect href="/(auth)/welcome" />;
  }

  // Redirect non-onboarded users
  if (!isLoading && isAuthenticated && user && !user.isOnboarded) {
    return <Redirect href="/(onboarding)/preferences" />;
  }

  return (
    <View style={{ flex: 1 }}>
    <OfflineBanner />
    <Tabs
      tabBar={(props) => <CustomTabBar {...props} />}
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: '#c97454',
        tabBarInactiveTintColor: '#a8a29e',
      }}
    >
      <Tabs.Screen
        name="today"
        options={{
          title: 'Today',
          tabBarIcon: ({ focused }) => (
            <Image
              source={logo}
              style={[tabStyles.tabLogo, !focused && tabStyles.tabLogoInactive]}
              resizeMode="contain"
            />
          ),
        }}
      />
      <Tabs.Screen
        name="memories"
        options={{
          title: 'Memories',
          tabBarIcon: ({ focused, color }) => (
            <Icon name="heart" size="md" color={color} weight={focused ? 'fill' : 'light'} />
          ),
        }}
      />
      <Tabs.Screen
        name="insights"
        options={{
          title: 'Insights',
          tabBarIcon: ({ focused, color }) => (
            <Icon name="sparkle" size="md" color={color} weight={focused ? 'fill' : 'light'} />
          ),
        }}
      />
      <Tabs.Screen
        name="wishlist"
        options={{
          href: null,
        }}
      />
      <Tabs.Screen
        name="resources"
        options={{
          href: null,
        }}
      />
      <Tabs.Screen
        name="chat"
        options={{
          href: null,
        }}
      />
      <Tabs.Screen
        name="games"
        options={{
          href: null,
        }}
      />
      <Tabs.Screen
        name="privacy-policy"
        options={{
          href: null,
        }}
      />
      <Tabs.Screen
        name="explore"
        options={{
          href: null,
        }}
      />
      <Tabs.Screen
        name="date-nights"
        options={{
          href: null,
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: 'Settings',
          tabBarIcon: ({ focused, color }) => (
            <Icon name="gear" size="md" color={color} weight={focused ? 'regular' : 'light'} />
          ),
        }}
      />
    </Tabs>
    </View>
  );
}

const customTabBarStyles = StyleSheet.create({
  container: {
    backgroundColor: '#fafaf9',
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#e7e5e4',
    paddingTop: 8,
    height: 85,
  },
  tabRow: {
    flexDirection: 'row',
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 4,
  },
  label: {
    fontSize: 12,
    marginTop: 4,
  },
  indicator: {
    position: 'absolute',
    top: 4,
    left: 0,
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#c97454',
  },
});

const tabStyles = StyleSheet.create({
  tabLogo: {
    width: 26,
    height: 26,
  },
  tabLogoInactive: {
    opacity: 0.4,
  },
});
