import React from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Icon } from '@/components';
import { colors, radius, spacing, typography } from '@/config/theme';

export default function TermsOfServiceScreen() {
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <Icon name="arrow-left" size="md" color={colors.accent.primary} />
        </TouchableOpacity>
        <Text style={styles.title}>Terms of Service</Text>
      </View>

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.content}>
        <Text style={styles.updated}>Last updated: November 2026</Text>

        <Text style={styles.sectionTitle}>Acceptance of Terms</Text>
        <Text style={styles.body}>
          By creating an account or using Stoke, you agree to these Terms of Service.
          If you do not agree, do not use the app. We may update these terms from time
          to time — continued use after changes constitutes acceptance.
        </Text>

        <Text style={styles.sectionTitle}>What Stoke Is</Text>
        <Text style={styles.body}>
          Stoke is a relationship wellness app that helps couples stay connected through
          daily scored prompts, follow-up conversations triggered by your answers,
          an explore library of questions across 12 categories, and a shared Hearth
          that tracks where you are close and where you differ. Stoke is not therapy,
          counseling, or crisis intervention. It is not a substitute for professional
          relationship support.
        </Text>

        <Text style={styles.sectionTitle}>Your Account</Text>
        <Text style={styles.body}>
          You must be at least 18 years old to use Stoke. You are responsible for
          maintaining the security of your account credentials. One account per person —
          do not share your login with others. You may link with one partner at a time.
          You may delete your account at any time from the Profile tab.
        </Text>

        <Text style={styles.sectionTitle}>Acceptable Use</Text>
        <Text style={styles.body}>
          You agree to use Stoke respectfully and lawfully. You will not use the app to
          harass, threaten, or harm another person. Content you share through prompts,
          clarify exchanges, and reactions must not contain illegal material, explicit
          content involving minors, or content that violates another person's rights.
        </Text>

        <Text style={styles.sectionTitle}>Your Content</Text>
        <Text style={styles.body}>
          You retain ownership of the responses, clarify exchanges, and reactions you
          share on Stoke. By using the app, you grant us a limited license to store,
          process, and display your content solely to provide the Stoke service to you
          and your partner. We do not sell your content or use it for advertising.
        </Text>

        <Text style={styles.sectionTitle}>Subscriptions and Payments</Text>
        <Text style={styles.body}>
          Stoke offers a free experience and an optional premium subscription. Premium
          unlocks follow-up conversations, Hearth history and trends, and the ability
          to initiate explore questions. Subscriptions are billed through the App Store
          and auto-renew unless cancelled at least 24 hours before the end of the
          current period. You can manage or cancel your subscription in your device's
          subscription settings. Deleting your account does not automatically cancel
          your subscription — you must cancel through the App Store first.
        </Text>

        <Text style={styles.sectionTitle}>Couple Unlinking</Text>
        <Text style={styles.body}>
          Either partner can unlink at any time from the Profile tab. Unlinking ends
          the shared experience: your partner can no longer see your responses, and
          follow-up conversations stop. Each person retains their own account and can
          link with a new partner. Shared history (completions, reactions) is preserved
          for each individual but is no longer visible to the former partner.
        </Text>

        <Text style={styles.sectionTitle}>Privacy</Text>
        <Text style={styles.body}>
          Your privacy matters. Please review our Privacy Policy for details on how we
          collect, use, and protect your data. By using Stoke, you consent to our data
          practices as described in the Privacy Policy.
        </Text>

        <Text style={styles.sectionTitle}>Limitation of Liability</Text>
        <Text style={styles.body}>
          Stoke is provided "as is" without warranties of any kind. We are not liable for
          any indirect, incidental, or consequential damages arising from your use of the
          app. Our total liability is limited to the amount you paid for the service in the
          12 months preceding the claim.
        </Text>

        <Text style={styles.sectionTitle}>Termination</Text>
        <Text style={styles.body}>
          We may suspend or terminate your account if you violate these terms. You may
          delete your account at any time. Upon deletion, your data will be removed as
          described in our Privacy Policy.
        </Text>

        <Text style={styles.sectionTitle}>Governing Law</Text>
        <Text style={styles.body}>
          These terms are governed by the laws of the State of Georgia, United States,
          without regard to its conflict of law provisions.
        </Text>

        <Text style={styles.sectionTitle}>Contact</Text>
        <Text style={styles.body}>
          For questions about these terms, contact us at support@getstoke.io.
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
