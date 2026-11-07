import React from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Icon } from '@/components';
import { colors, radius, spacing, typography } from '@/config/theme';

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <>
      <Text style={styles.sectionTitle}>{title}</Text>
      {children}
    </>
  );
}

function P({ children }: { children: React.ReactNode }) {
  return <Text style={styles.body}>{children}</Text>;
}

function B({ children }: { children: React.ReactNode }) {
  return <Text style={styles.bold}>{children}</Text>;
}

export default function TermsOfServiceScreen() {
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <Icon name="arrow-left" size="md" color={colors.accent.primary} />
        </TouchableOpacity>
        <Text style={styles.title}>Terms of Service</Text>
        <Text style={styles.subtitle}>Stoke by Omnific Collective, LLC</Text>
      </View>

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.content}>
        <Text style={styles.updated}>Last updated: November 7, 2026</Text>

        <P>These Terms of Service govern your access to and use of Stoke, including our mobile application, website, prompts, notifications, content, features, and related services. The Service is operated by Omnific Collective, LLC. By accessing or using Stoke, you agree to these Terms.</P>

        <Section title="1. What Stoke Is">
          <P>Stoke is a relationship connection app designed to help adults create small moments of connection through prompts, reminders, preferences, shared rituals, and lightweight personalized suggestions. Stoke is not directed to children under 18.</P>
        </Section>

        <Section title="2. What Stoke Is Not">
          <P>Stoke is not therapy, couples counseling, medical advice, mental health treatment, crisis support, legal advice, financial advice, a safety planning tool, a domestic violence intervention tool, or a substitute for professional support. Stoke does not guarantee relationship improvement or any particular outcome.</P>
        </Section>

        <Section title="3. How Stoke Works">
          <P>Stoke delivers a daily question that both partners rate on a 1-10 scale and add a written note. Both answers are sealed until both respond, then revealed. Based on your ratings, the app may trigger follow-up conversations. You can also send your partner questions from 12 categories, react to answers with emoji, and ask a clarify question about your partner's answer. Stoke tracks your shared history in the Hearth and shows alignment trends in the Us view. All scores, notes, reactions, clarify exchanges, and alignment data are visible to your linked partner.</P>
        </Section>

        <Section title="4. Partner Connections">
          <P>A partner connection should be mutual and consensual. Either partner may disconnect at any time without the other's approval. You may not impersonate another person, pressure someone to connect, or use the Service to monitor, control, harass, or manipulate another person.</P>
        </Section>

        <Section title="5. Safety Detection">
          <P>Stoke automatically scans the text of your responses and clarify exchanges for language that may indicate crisis or harm. This detection runs on your device and on our servers. When detected, the app may show you safety resources and may suppress follow-up conversations. We do not report this detection to any external party. This feature is not comprehensive. If you or someone you know is in crisis, contact local emergency services or the 988 Suicide and Crisis Lifeline.</P>
        </Section>

        <Section title="6. Subscriptions and Payments">
          <P><B>Free tier:</B> The daily prompt loop, one follow-up conversation, up to three explore sends per month, and current-month Hearth are always free.</P>
          <P><B>Premium:</B> Unlocks unlimited follow-ups, unlimited explore sends, full Hearth history and trends, and the Us view. One subscription covers both linked partners.</P>
          <P><B>Trial:</B> 21-day free trial for new subscribers. Transitions to paid unless cancelled at least 24 hours before the trial ends.</P>
          <P><B>Billing:</B> Annual ($49.99/year) or monthly ($9.99/month) via the App Store. Subscriptions auto-renew unless turned off at least 24 hours before the end of the current period. No cancellation during the active period. Manage subscriptions in your Apple ID Account Settings. Deleting your account does not cancel your subscription.</P>
        </Section>

        <Section title="7. Your Content">
          <P>You retain ownership of your content. By submitting content, you grant us a limited license to host, store, process, and display it as necessary to operate the Service. This license ends when your content is deleted from our active systems.</P>
        </Section>

        <Section title="8. Account Deletion">
          <P>You may delete your account at any time from the Profile tab. Your data is permanently deleted within 30 days. Your partner will lose access to your shared responses. You may export your data once every 24 hours. Deleting your account does not cancel your App Store subscription.</P>
        </Section>

        <Section title="9. Third-Party Services">
          <P>Stoke uses Google Firebase, Apple, RevenueCat, Sentry, Expo, and Anthropic. Third-party services are governed by their own terms and privacy policies.</P>
        </Section>

        <Section title="10. Disclaimers">
          <P>The Service is provided "as is" and "as available." We disclaim all warranties. We do not warrant that the Service will improve your relationship, that prompts will be appropriate for your situation, or that the Service will be uninterrupted or error-free.</P>
        </Section>

        <Section title="11. Limitation of Liability">
          <P>Our total liability for any claim will not exceed the greater of the amount you paid in the twelve months before the claim arose, or $100.</P>
        </Section>

        <Section title="12. Dispute Resolution">
          <P>Before filing a formal claim, contact us at legal@stoke.llc and try to resolve the dispute informally for at least 30 days. If unresolved, disputes will be resolved by binding individual arbitration administered by JAMS. You waive the right to participate in a class action and the right to a jury trial. You may opt out of arbitration within 30 days of accepting these Terms by writing to legal@stoke.llc.</P>
        </Section>

        <Section title="13. Governing Law">
          <P>These Terms are governed by the laws of the State of Georgia.</P>
        </Section>

        <Section title="14. California Residents">
          <P>If you are a California resident, you have additional rights under the CCPA/CPRA as described in our Privacy Policy. We do not sell your personal information.</P>
        </Section>

        <Section title="15. General">
          <P>If any provision is found unenforceable, it will be modified to the minimum extent necessary. These Terms, together with the Privacy Policy, constitute the entire agreement between you and us. We are not liable for delays caused by circumstances beyond our reasonable control.</P>
        </Section>

        <Section title="16. Contact">
          <P>Omnific Collective, LLC{'\n'}legal@stoke.llc{'\n'}https://stoke.llc</P>
        </Section>

        <P>The full, unabridged Terms of Service are available at stoke.llc/terms.</P>

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
  subtitle: {
    ...typography.caption,
    color: colors.text.secondary,
    marginTop: 2,
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
    marginBottom: spacing.sm,
  },
  bold: {
    fontFamily: 'Nunito-Bold',
    fontWeight: '700',
    color: colors.text.primary,
  },
  bottomSpacer: {
    height: spacing.xxl,
  },
});
