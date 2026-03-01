import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import Animated, { FadeIn, FadeInUp } from 'react-native-reanimated';
import { hapticImpact } from '@utils/haptics';
import { router } from 'expo-router';
import { Icon } from '@/components';

export function DateNightCard() {
  const handlePlay = () => {
    hapticImpact();
    router.push('/(app)/games');
  };

  return (
    <View style={styles.card}>
      <View style={styles.accentBar} />

      <Animated.View entering={FadeIn.duration(400)} style={styles.header}>
        <View style={styles.headerLeft}>
          <Icon name="game-controller" size="sm" color="#c97454" weight="regular" />
          <Text style={styles.headerTitle}>Date Night</Text>
        </View>
      </Animated.View>

      <Animated.View entering={FadeInUp.duration(400).delay(100)} style={styles.body}>
        <View style={styles.emojiRow}>
          <Icon name="game-controller" size="xl" color="#c97454" weight="light" />
        </View>
        <Text style={styles.bodyText}>
          Games and quizzes to play together. Grab the couch.
        </Text>
      </Animated.View>

      <Animated.View entering={FadeIn.duration(300).delay(300)}>
        <TouchableOpacity style={styles.playButton} onPress={handlePlay} activeOpacity={0.7}>
          <Text style={styles.playText}>Play now</Text>
          <Icon name="arrow-right" size="sm" color="#ffffff" />
        </TouchableOpacity>
      </Animated.View>

      <View style={styles.footerDots}>
        <View style={styles.footerDot} />
        <View style={styles.footerDot} />
        <View style={styles.footerDot} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 20,
    padding: 24,
    paddingTop: 20,
    overflow: 'hidden',
    shadowColor: '#1c1917',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 2,
  },
  accentBar: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 3,
    backgroundColor: '#c97454',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerIcon: {
    fontSize: 16,
  },
  headerTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#292524',
    letterSpacing: -0.3,
  },
  body: {
    alignItems: 'center',
    paddingVertical: 4,
  },
  emojiRow: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 12,
  },
  gameEmoji: {
    fontSize: 28,
  },
  bodyText: {
    fontSize: 14,
    color: '#78716c',
    textAlign: 'center',
    lineHeight: 20,
  },
  playButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingVertical: 12,
    marginTop: 8,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#e7e5e4',
  },
  playText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#c97454',
  },
  playArrow: {
    fontSize: 14,
    color: '#c97454',
  },
  footerDots: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
    marginTop: 8,
  },
  footerDot: {
    width: 3,
    height: 3,
    borderRadius: 2,
    backgroundColor: '#e7e5e4',
  },
});
