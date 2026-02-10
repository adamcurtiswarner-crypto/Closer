import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Animated, { FadeIn, FadeInUp } from 'react-native-reanimated';
import { ResponseCard } from './ResponseCard';

interface CompletionMomentProps {
  promptText: string;
  yourResponse: string;
  partnerResponse: string;
  partnerName?: string;
}

export function CompletionMoment({
  promptText,
  yourResponse,
  partnerResponse,
  partnerName = 'Partner',
}: CompletionMomentProps) {
  return (
    <View style={styles.card}>
      {/* Accent bar */}
      <View style={styles.accentBar} />

      <Animated.View entering={FadeIn.duration(400)}>
        <View style={styles.headerRow}>
          <Text style={styles.headerIcon}>{'\u2728'}</Text>
          <Text style={styles.header}>You both answered</Text>
        </View>
      </Animated.View>

      <Animated.View entering={FadeInUp.duration(500).delay(100)}>
        <Text style={styles.promptText}>{'\u201C'}{promptText}{'\u201D'}</Text>
      </Animated.View>

      <View style={styles.responses}>
        <Animated.View entering={FadeInUp.duration(400).delay(200)}>
          <ResponseCard
            label="You"
            responseText={yourResponse}
            isYours={true}
          />
        </Animated.View>
        <View style={styles.spacer} />
        <Animated.View entering={FadeInUp.duration(400).delay(400)}>
          <ResponseCard
            label={partnerName}
            responseText={partnerResponse}
            isYours={false}
          />
        </Animated.View>
      </View>

      <Animated.View entering={FadeIn.duration(400).delay(600)}>
        <View style={styles.footerRow}>
          <View style={styles.footerDot} />
          <Text style={styles.footer}>Another moment saved</Text>
          <View style={styles.footerDot} />
        </View>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 20,
    padding: 24,
    paddingTop: 20,
    shadowColor: '#1c1917',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 2,
    overflow: 'hidden',
  },
  accentBar: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 3,
    backgroundColor: '#c97454',
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginBottom: 16,
    marginTop: 4,
  },
  headerIcon: {
    fontSize: 16,
  },
  header: {
    color: '#57534e',
    fontSize: 15,
    fontWeight: '600',
  },
  promptText: {
    color: '#57534e',
    fontSize: 17,
    textAlign: 'center',
    marginBottom: 24,
    fontStyle: 'italic',
    lineHeight: 24,
  },
  responses: {},
  spacer: {
    height: 12,
  },
  footerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 24,
  },
  footerDot: {
    width: 3,
    height: 3,
    borderRadius: 2,
    backgroundColor: '#d6d3d1',
  },
  footer: {
    color: '#a8a29e',
    fontSize: 13,
    fontWeight: '500',
  },
});
