import React from 'react';
import { View, Text, Image, StyleSheet } from 'react-native';
import { format } from 'date-fns';
import { ConnectionHeader } from '@/components/ConnectionHeader';

const logo = require('@/assets/logo.png');

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
      <View style={styles.greetingRow}>
        <View style={styles.greetingTop}>
          <Image source={logo} style={styles.logoMark} resizeMode="contain" />
          <Text style={styles.greeting}>{greeting}</Text>
        </View>
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
  greetingTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  logoMark: {
    width: 32,
    height: 32,
  },
  greeting: {
    fontSize: 28,
    fontWeight: '700',
    color: '#1c1917',
    letterSpacing: -0.5,
  },
  dateText: {
    fontSize: 15,
    color: '#78716c',
    marginTop: 2,
  },
});
