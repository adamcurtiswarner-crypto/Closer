import React from 'react';
import { Stack } from 'expo-router';

import { colors } from '@/config/theme';
export default function OnboardingLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: colors.surface.background },
        animation: 'slide_from_right',
      }}
    >
      <Stack.Screen name="value-prop" />
      <Stack.Screen name="invite-partner" />
      <Stack.Screen name="accept-invite" />
      <Stack.Screen name="waiting-partner" />
      <Stack.Screen name="tone-calibration" />
      <Stack.Screen name="first-prompt" />
      <Stack.Screen name="ready" />
    </Stack>
  );
}
