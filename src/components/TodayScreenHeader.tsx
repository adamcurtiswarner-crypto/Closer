import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { format } from 'date-fns';
import { ConnectionHeader } from '@/components/ConnectionHeader';
import { colors, spacing, typography } from '@/config/theme';

interface TodayScreenHeaderProps {
  greeting: string;
  userName: string | null;
  /** Optional override — when absent, ConnectionHeader resolves the name
   *  via usePartnerName (partner display_name > pet name > fallback). */
  partnerName?: string;
  isPartnerOnline: boolean;
  isPartnerTyping: boolean;
  typingContext: 'chat' | 'prompt' | null;
  lastSeen: Date | null;
  currentStreak: number;
  isStreakActive: boolean;
  userPhotoUrl?: string | null;
  partnerPhotoUrl?: string | null;
  /** Both partners answered today — lights the ember on the thread. */
  bothAnswered?: boolean;
  /** Whether the ember plays its ignition (decided by the Today screen). */
  emberIgniting?: boolean;
}

export function TodayScreenHeader({
  greeting,
  userName,
  partnerName,
  isPartnerOnline,
  isPartnerTyping,
  typingContext,
  lastSeen,
  currentStreak,
  isStreakActive,
  userPhotoUrl,
  partnerPhotoUrl,
  bothAnswered,
  emberIgniting,
}: TodayScreenHeaderProps) {
  return (
    <>
      {/* Greeting stands alone — the wordmark next to it read as one
          garbled phrase, so the lockup is greeting + date only. */}
      <View style={styles.greetingRow}>
        <Text style={styles.greeting} maxFontSizeMultiplier={1.4}>{greeting}</Text>
        <Text style={styles.dateText}>{format(new Date(), 'EEEE, MMMM d')}</Text>
      </View>

      <ConnectionHeader
        userName={userName}
        partnerName={partnerName}
        isPartnerOnline={isPartnerOnline}
        isPartnerTyping={isPartnerTyping}
        typingContext={typingContext}
        lastSeen={lastSeen}
        currentStreak={currentStreak}
        isStreakActive={isStreakActive}
        userPhotoUrl={userPhotoUrl}
        partnerPhotoUrl={partnerPhotoUrl}
        bothAnswered={bothAnswered}
        emberIgniting={emberIgniting}
      />
    </>
  );
}

const styles = StyleSheet.create({
  greetingRow: {
    marginBottom: spacing.sm,
  },
  greeting: {
    ...typography.display,
    color: colors.text.primary,
  },
  dateText: {
    ...typography.body,
    color: colors.text.secondary,
    marginTop: 2,
  },
});
