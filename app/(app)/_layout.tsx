import React from 'react';
import { Tabs } from 'expo-router';
import { Text } from 'react-native';

export default function AppLayout() {
  return (
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
            <Text style={{ fontSize: 24, color: focused ? '#c97454' : '#a8a29e' }}>◉</Text>
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
  );
}
