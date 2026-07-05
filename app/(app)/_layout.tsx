import React, { useMemo } from 'react';
import { Tabs, Redirect } from 'expo-router';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { useAuth } from '@/hooks/useAuth';
import { OfflineBanner } from '@/components/OfflineBanner';
import { Icon } from '@/components';
import { FEATURES } from '@/config/features';
import { colors, radius, spacing, typography } from '@/config/theme';

// Today is the v1 landing tab (home is feature-flagged off)
export const unstable_settings = {
  initialRouteName: 'today',
};

function CustomTabBar({ state, descriptors, navigation }: BottomTabBarProps) {
  // Filter to only tabs that have an icon defined (hidden tabs use href:null and have no icon)
  const visibleRoutes = useMemo(
    () =>
      state.routes.filter((route: any) => {
        const options = descriptors[route.key].options;
        return options.tabBarIcon !== undefined;
      }),
    [state.routes, descriptors]
  );

  // Determine the visible tab index for the current active route
  const activeVisibleIndex = useMemo(() => {
    const activeRoute = state.routes[state.index];
    const idx = visibleRoutes.findIndex((r: any) => r.key === activeRoute.key);
    // If active route is a hidden tab, return -1
    return idx;
  }, [state.index, state.routes, visibleRoutes]);

  return (
    <View style={customTabBarStyles.container}>
      <View style={customTabBarStyles.tabRow}>
        {visibleRoutes.map((route: any, index: number) => {
          const { options } = descriptors[route.key];
          const isFocused = activeVisibleIndex === index;

          const label = options.title ?? route.name;
          const color = isFocused ? colors.accent.primary : colors.text.muted;

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
              <View
                style={[
                  customTabBarStyles.iconPill,
                  isFocused && customTabBarStyles.iconPillActive,
                ]}
              >
                {options.tabBarIcon?.({ focused: isFocused, color, size: 24 })}
              </View>
              <Text
                style={[
                  customTabBarStyles.label,
                  { color },
                ]}
                maxFontSizeMultiplier={1.4}
              >
                {label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
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
      initialRouteName="today"
      tabBar={(props) => <CustomTabBar {...props} />}
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.accent.primary,
        tabBarInactiveTintColor: colors.text.muted,
      }}
    >
      <Tabs.Screen
        name="home"
        options={
          FEATURES.home
            ? {
                title: 'Home',
                tabBarIcon: ({ focused, color }) => (
                  <Icon name="handshake" size="md" color={color} weight={focused ? 'fill' : 'light'} />
                ),
              }
            : { href: null }
        }
      />
      <Tabs.Screen
        name="today"
        options={{
          title: 'Today',
          tabBarIcon: ({ focused, color }) => (
            <Icon name="flame" size="md" color={color} weight={focused ? 'fill' : 'light'} />
          ),
        }}
      />
      <Tabs.Screen
        name="memories"
        options={
          FEATURES.memories
            ? {
                title: 'Memories',
                tabBarIcon: ({ focused, color }) => (
                  <Icon name="heart" size="md" color={color} weight={focused ? 'fill' : 'light'} />
                ),
              }
            : { href: null }
        }
      />
      <Tabs.Screen
        name="insights"
        options={
          FEATURES.insights
            ? {
                title: 'Insights',
                tabBarIcon: ({ focused, color }) => (
                  <Icon name="sparkle" size="md" color={color} weight={focused ? 'fill' : 'light'} />
                ),
              }
            : { href: null }
        }
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
        name="terms-of-service"
        options={{
          href: null,
        }}
      />
      <Tabs.Screen
        name="explore"
        options={
          FEATURES.explore
            ? {
                title: 'Categories',
                tabBarIcon: ({ focused, color }) => (
                  <Icon name="compass" size="md" color={color} weight={focused ? 'fill' : 'light'} />
                ),
              }
            : { href: null }
        }
      />
      <Tabs.Screen
        name="date-nights"
        options={{
          href: null,
        }}
      />
      <Tabs.Screen
        name="coaching"
        options={{
          href: null,
        }}
      />
      <Tabs.Screen
        name="morning-checkin"
        options={{
          href: null,
        }}
      />
      <Tabs.Screen
        name="evening-reflection"
        options={{
          href: null,
        }}
      />
      <Tabs.Screen
        name="surprise-mission"
        options={{
          href: null,
        }}
      />
      <Tabs.Screen
        name="partner-guess"
        options={{
          href: null,
        }}
      />
      <Tabs.Screen
        name="todays-spark"
        options={{
          href: null,
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: 'Settings',
          tabBarIcon: ({ focused, color }) => (
            <Icon name="gear" size="md" color={color} weight={focused ? 'fill' : 'light'} />
          ),
        }}
      />
    </Tabs>
    </View>
  );
}

const customTabBarStyles = StyleSheet.create({
  container: {
    backgroundColor: colors.surface.card,
    borderTopWidth: 1,
    borderTopColor: colors.border.default,
    paddingTop: spacing.sm,
    height: 85,
  },
  tabRow: {
    flexDirection: 'row',
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.xs,
  },
  // Active tab — small warm pill behind the icon (reference Nav treatment)
  iconPill: {
    width: 38,
    height: 28,
    borderRadius: radius.nav,
    backgroundColor: 'transparent',
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconPillActive: {
    backgroundColor: colors.accent.primaryLight,
  },
  label: {
    ...typography.caption,
    marginTop: 3,
  },
});
