import React from 'react';
import { View, Text, Image, StyleSheet } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';
import { format } from 'date-fns';

interface CoupleHeroProps {
  userName: string | null;
  partnerName: string | null;
  userPhotoUrl: string | null;
  partnerPhotoUrl: string | null;
  linkedAt: Date | null;
}

function Avatar({ photoUrl, initials, color }: { photoUrl: string | null; initials: string; color: string }) {
  if (photoUrl) {
    return <Image source={{ uri: photoUrl }} style={[styles.avatar, { borderColor: color }]} />;
  }
  return (
    <View style={[styles.avatar, styles.avatarFallback, { backgroundColor: color }]}>
      <Text style={styles.avatarInitials}>{initials}</Text>
    </View>
  );
}

export function CoupleHero({ userName, partnerName, userPhotoUrl, partnerPhotoUrl, linkedAt }: CoupleHeroProps) {
  const userInitials = (userName || 'Y').charAt(0).toUpperCase();
  const partnerInitials = (partnerName || 'P').charAt(0).toUpperCase();
  const displayNames = `${userName || 'You'} and ${partnerName || 'Partner'}`;
  const sinceText = linkedAt ? `Together since ${format(linkedAt, 'MMMM d, yyyy')}` : 'Your story is just beginning';

  return (
    <Animated.View entering={FadeIn.duration(500)} style={styles.container}>
      <View style={styles.avatarRow}>
        <Avatar photoUrl={userPhotoUrl} initials={userInitials} color="#c97454" />
        <View style={styles.avatarOverlap}>
          <Avatar photoUrl={partnerPhotoUrl} initials={partnerInitials} color="#490f5f" />
        </View>
      </View>
      <Text style={styles.names}>{displayNames}</Text>
      <Text style={styles.since}>{sinceText}</Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    paddingTop: 16,
    paddingBottom: 24,
  },
  avatarRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  avatar: {
    width: 92,
    height: 92,
    borderRadius: 46,
    borderWidth: 3,
    borderColor: '#ffffff',
  },
  avatarOverlap: {
    marginLeft: -24,
  },
  avatarFallback: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarInitials: {
    fontSize: 32,
    fontFamily: 'Alexandria-SemiBold',
    fontWeight: '600',
    color: '#ffffff',
  },
  names: {
    fontSize: 22,
    fontFamily: 'Alexandria-SemiBold',
    fontWeight: '600',
    color: '#1c1917',
    textAlign: 'center',
  },
  since: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#78716c',
    textAlign: 'center',
    marginTop: 4,
  },
});
