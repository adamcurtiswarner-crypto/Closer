import React from 'react';
import { Stack } from 'expo-router';

export default function OnboardingLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: '#fafaf9' },
        animation: 'slide_from_right',
      }}
    >
      <Stack.Screen name="verify-email" />
      <Stack.Screen name="invite-partner" />
      <Stack.Screen name="accept-invite" />
      <Stack.Screen name="waiting-partner" />
      <Stack.Screen name="preferences" />
      <Stack.Screen name="tone-calibration" />
      <Stack.Screen name="first-prompt" />
      <Stack.Screen name="ready" />
    </Stack>
  );
}
