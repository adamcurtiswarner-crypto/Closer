import React from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Icon } from '@/components';
import { colors, radius, spacing, typography } from '@/config/theme';

export default function PrivacyPolicyScreen() {
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <Icon name="arrow-left" size="md" color={colors.accent.primary} />
        </TouchableOpacity>
        <Text style={styles.title}>Privacy Policy</Text>
      </View>

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.content}>
        <Text style={styles.updated}>Last updated: November 2026</Text>

        <Text style={styles.sectionTitle}>What We Collect</Text>
        <Text style={styles.body}>
          Stoke collects your email address, display name, partner name, love language
          preference, relationship stage, timezone, and notification preferences. We
          also store the responses you share with your partner through daily prompts,
          follow-up conversations, clarify exchanges, and explore questions.
        </Text>

        <Text style={styles.sectionTitle}>How We Use Your Data</Text>
        <Text style={styles.body}>
          Your data is used solely to power the Stoke experience: delivering daily
          scored prompts, triggering follow-up conversations based on your scores,
          showing your answers to your partner after both of you respond, and building
          the Hearth (your shared history of answered prompts). We do not sell your
          data or share it with third parties for advertising.
        </Text>

        <Text style={styles.sectionTitle}>Data Storage</Text>
        <Text style={styles.body}>
          Your data is stored on Google Cloud (Firebase) infrastructure located in
          the United States. Data is protected in transit via TLS and at rest via
          Google's default encryption. Prompt responses and clarify exchanges are
          stored as written text — there is no additional field-level encryption
          beyond what Google Cloud provides.
        </Text>

        <Text style={styles.sectionTitle}>Data Deletion</Text>
        <Text style={styles.body}>
          You can delete your account at any time from the Profile tab. This
          permanently removes your user record, unlinks you from your partner, and
          clears your data from active use. Your partner retains access to their own
          responses but can no longer see yours. Automated cleanup runs daily to
          finalize deletions.
        </Text>

        <Text style={styles.sectionTitle}>Data Export</Text>
        <Text style={styles.body}>
          You can export all your data from the Profile tab at any time. The export
          includes your profile, responses, reactions, and memories. Exports are
          limited to once per 24-hour period.
        </Text>

        <Text style={styles.sectionTitle}>Analytics</Text>
        <Text style={styles.body}>
          We collect usage events (such as prompt viewed, response submitted, reaction
          added, and follow-up completed) to understand how couples use Stoke and to
          improve the experience. Error events are logged for reliability monitoring.
          These events are linked to your account and are never shared externally.
          Crash reporting is handled by Sentry.
        </Text>

        <Text style={styles.sectionTitle}>Push Notifications</Text>
        <Text style={styles.body}>
          If you grant notification permissions, Stoke may send: daily prompt
          delivery, partner response alerts, follow-up question delivery, reaction
          notifications, weekly recaps, and explore question alerts. Notifications
          respect quiet hours (8 AM to 9 PM in your local timezone). You can disable
          notifications at any time in your device settings.
        </Text>

        <Text style={styles.sectionTitle}>Subscriptions</Text>
        <Text style={styles.body}>
          Stoke offers a free experience and an optional premium subscription managed
          through the App Store via RevenueCat. We receive subscription status and
          entitlement information but do not store your payment details. See our Terms
          of Service for subscription and cancellation details.
        </Text>

        <Text style={styles.sectionTitle}>Third-Party Services</Text>
        <Text style={styles.body}>
          Stoke uses Google Firebase (authentication, database, cloud functions,
          storage), Expo (push notifications, over-the-air updates), RevenueCat
          (subscription management), and Sentry (error monitoring). Each service
          processes data as described in their respective privacy policies. We do not
          use any advertising or tracking SDKs.
        </Text>

        <Text style={styles.sectionTitle}>Safety</Text>
        <Text style={styles.body}>
          Stoke checks written responses for crisis language (references to self-harm,
          abuse, or acute distress) and quietly surfaces professional resources when
          detected. This check runs locally and on the server. No data is shared with
          external crisis services. Stoke is not therapy, counseling, or crisis
          intervention.
        </Text>

        <Text style={styles.sectionTitle}>Contact</Text>
        <Text style={styles.body}>
          For privacy questions or data requests, contact us at privacy@stoke.llc.
        </Text>

        <View style={styles.bottomSpacer} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.surface.background,
  },
  header: {
    paddingHorizontal: spacing.screen,
    paddingTop: spacing.md,
    paddingBottom: spacing.md,
  },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: radius.full,
    backgroundColor: colors.accent.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.smd,
  },
  title: {
    ...typography.display,
    color: colors.text.primary,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    paddingHorizontal: spacing.screen,
  },
  updated: {
    ...typography.caption,
    color: colors.text.muted,
    marginBottom: spacing.lg,
  },
  sectionTitle: {
    ...typography.heading,
    color: colors.text.primary,
    marginTop: spacing.lg,
    marginBottom: spacing.sm,
  },
  body: {
    ...typography.body,
    color: colors.text.secondary,
  },
  bottomSpacer: {
    height: spacing.xxl,
  },
});
