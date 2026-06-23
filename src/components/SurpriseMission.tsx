import React from 'react';
import {
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, radius, spacing, typography } from '@config/theme';
import { ToneShapes } from '@components';

interface SurpriseMissionProps {
  readonly onClose?: () => void;
  readonly onAccept?: () => void;
  readonly onSkip?: () => void;
}

export function SurpriseMission({ onClose, onAccept, onSkip }: SurpriseMissionProps) {
  return (
    <View style={styles.screen}>
      <ToneShapes variant="coral" />
      <SafeAreaView style={styles.safeArea}>
        {/* Top bar */}
        <View style={styles.topBar}>
          <Pressable
            onPress={onClose}
            style={styles.closeButton}
            accessibilityRole="button"
            accessibilityLabel="Close"
            hitSlop={8}
          >
            <Text style={styles.closeIcon}>{'\u2715'}</Text>
          </Pressable>
          <View style={styles.topBarRight}>
            <Pressable
              style={styles.darkCircle}
              accessibilityRole="button"
              accessibilityLabel="Save"
              hitSlop={8}
            >
              <Text style={styles.darkCircleIcon}>{'\u2661'}</Text>
            </Pressable>
            <Pressable
              style={styles.darkCircle}
              accessibilityRole="button"
              accessibilityLabel="Share"
              hitSlop={8}
            >
              <Text style={styles.darkCircleIcon}>{'\u2193'}</Text>
            </Pressable>
          </View>
        </View>

        {/* Center content */}
        <View style={styles.centerContent}>
          <Text style={styles.missionEyebrow}>Tonight's mission</Text>
          <Text style={styles.missionText}>
            {'Leave before they wake up.\n\nHide a note somewhere they\'ll find tomorrow.'}
          </Text>
          <Text style={styles.tagline}>Small acts. Long memories.</Text>
        </View>

        {/* Bottom CTA */}
        <View style={styles.bottomCta}>
          <Pressable
            onPress={onAccept}
            style={styles.primaryButton}
            accessibilityRole="button"
          >
            <Text style={styles.primaryButtonText}>I'm in</Text>
          </Pressable>
          <Pressable
            onPress={onSkip}
            accessibilityRole="button"
          >
            <Text style={styles.skipText}>Skip for now</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.accent.primary,
  },
  safeArea: {
    flex: 1,
  },

  // Top bar
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 18,
    paddingVertical: 14,
  },
  closeButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.text.inverse,
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeIcon: {
    fontSize: 14,
    color: colors.text.primary,
    fontWeight: '700',
  },
  topBarRight: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  darkCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(10,6,4,0.42)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  darkCircleIcon: {
    fontSize: 16,
    color: colors.text.inverse,
  },

  // Center content
  centerContent: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 28,
  },
  missionEyebrow: {
    ...typography.eyebrow,
    color: 'rgba(255,255,255,0.55)',
    marginBottom: spacing.md,
  },
  missionText: {
    fontFamily: 'Nunito-Black',
    fontWeight: '900',
    fontSize: 26,
    lineHeight: 26 * 1.35,
    color: colors.text.inverse,
    marginBottom: spacing.lg,
  },
  tagline: {
    ...typography.body,
    color: 'rgba(255,255,255,0.5)',
    fontStyle: 'italic',
  },

  // Bottom CTA
  bottomCta: {
    paddingHorizontal: spacing.screen,
    paddingBottom: 36,
    gap: spacing.md,
  },
  primaryButton: {
    backgroundColor: colors.text.inverse,
    borderRadius: radius.pill,
    paddingVertical: 16,
    alignItems: 'center',
  },
  primaryButtonText: {
    ...typography.btn,
    color: colors.accent.primary,
  },
  skipText: {
    ...typography.eyebrow,
    color: 'rgba(255,255,255,0.38)',
    textAlign: 'center',
  },
});
