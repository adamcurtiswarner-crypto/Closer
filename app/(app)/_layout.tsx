import React from 'react';
import { Tabs, Redirect } from 'expo-router';
import { View, Text, Image, StyleSheet } from 'react-native';
import { useAuth } from '@/hooks/useAuth';
import { OfflineBanner } from '@/components/OfflineBanner';

const logo = require('@/assets/logo.png');

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
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: '#fafaf9',
          borderTopColor: '#e7e5e4',
          paddingTop: 8,
          height: 85,
        },
        tabBarActiveTintColor: '#c97454',
        tabBarInactiveTintColor: '#a8a29e',
        tabBarLabelStyle: {
          fontSize: 12,
          marginTop: 4,
        },
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
          tabBarIcon: ({ focused }) => (
            <Text style={{ fontSize: 24, color: focused ? '#c97454' : '#a8a29e' }}>♡</Text>
          ),
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: 'Settings',
          tabBarIcon: ({ focused }) => (
            <Text style={{ fontSize: 24, color: focused ? '#c97454' : '#a8a29e' }}>⚙</Text>
          ),
        }}
      />
    </Tabs>
    </View>
  );
}

const tabStyles = StyleSheet.create({
  tabLogo: {
    width: 26,
    height: 26,
  },
  tabLogoInactive: {
    opacity: 0.4,
  },
});
