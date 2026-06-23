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
  const sinceText = linkedAt ? `Together since ${format(linkedAt, 'MMMM d, yyyy')}` : 'Your story is just beginning';

  return (
    <Animated.View entering={FadeIn.duration(500)} style={styles.container}>
      <View style={styles.avatarRow}>
        <Avatar photoUrl={userPhotoUrl} initials={userInitials} color="#D4522A" />
        <View style={styles.plusBadge}>
          <Text style={styles.plusText}>+</Text>
        </View>
        <View style={styles.avatarOverlap}>
          <Avatar photoUrl={partnerPhotoUrl} initials={partnerInitials} color="#3D2870" />
        </View>
      </View>
      <View style={styles.namesRow}>
        <Text style={styles.nameScript}>{userName || 'You'}</Text>
        <Text style={styles.nameAnd}>&</Text>
        <Text style={styles.nameScript}>{partnerName || 'Partner'}</Text>
      </View>
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
  plusBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: -14,
    zIndex: 1,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  plusText: {
    fontSize: 18,
    fontFamily: 'Nunito-Bold',
    fontWeight: '600',
    color: '#D4522A',
  },
  avatarOverlap: {},
  avatarFallback: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarInitials: {
    fontSize: 32,
    fontFamily: 'Nunito-Black',
    fontWeight: '600',
    color: '#ffffff',
  },
  namesRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 8,
  },
  nameScript: {
    fontSize: 26,
    fontFamily: 'Pacifico',
    color: '#D4522A',
  },
  nameAnd: {
    fontSize: 16,
    fontFamily: 'Nunito-Regular',
    color: '#B8B8C4',
  },
  since: {
    fontSize: 14,
    fontFamily: 'Nunito-Regular',
    color: '#6B6B7A',
    textAlign: 'center',
    marginTop: 6,
  },
});
