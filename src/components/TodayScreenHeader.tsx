import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { format } from 'date-fns';
import { ConnectionHeader } from '@/components/ConnectionHeader';
import { colors } from '@/config/theme';

interface TodayScreenHeaderProps {
  greeting: string;
  userName: string | null;
  partnerName: string;
  isPartnerOnline: boolean;
  isPartnerTyping: boolean;
  typingContext: 'chat' | 'prompt' | null;
  lastSeen: Date | null;
  currentStreak: number;
  isStreakActive: boolean;
  userPhotoUrl?: string | null;
  partnerPhotoUrl?: string | null;
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
}: TodayScreenHeaderProps) {
  return (
    <>
      {/* Greeting stands alone — the wordmark next to it read as one
          garbled phrase, so the lockup is greeting + date only. */}
      <View style={styles.greetingRow}>
        <Text style={styles.greeting}>{greeting}</Text>
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
      />
    </>
  );
}

const styles = StyleSheet.create({
  greetingRow: {
    marginBottom: 8,
  },
  greeting: {
    fontSize: 28,
    // Nunito-Black is weight 900 — fontWeight must match the family.
    fontWeight: '900',
    fontFamily: 'Nunito-Black',
    color: colors.text.primary,
    letterSpacing: -0.5,
  },
  dateText: {
    fontSize: 15,
    fontFamily: 'Nunito-Regular',
    color: colors.text.secondary,
    marginTop: 2,
  },
});
