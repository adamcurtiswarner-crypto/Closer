import React from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Icon } from '@/components';

export default function TermsOfServiceScreen() {
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <Icon name="arrow-left" size="md" color="#c97454" />
        </TouchableOpacity>
        <Text style={styles.title}>Terms of Service</Text>
      </View>

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.content}>
        <Text style={styles.updated}>Last updated: March 2026</Text>

        <Text style={styles.sectionTitle}>Acceptance of Terms</Text>
        <Text style={styles.body}>
          By creating an account or using Stoke, you agree to these Terms of Service.
          If you do not agree, do not use the app. We may update these terms from time
          to time — continued use after changes constitutes acceptance.
        </Text>

        <Text style={styles.sectionTitle}>What Stoke Is</Text>
        <Text style={styles.body}>
          Stoke is a relationship wellness app that helps couples stay connected through
          daily prompts, shared memories, and reflection tools. Stoke is not therapy,
          counseling, or crisis intervention. It is not a substitute for professional
          relationship support.
        </Text>

        <Text style={styles.sectionTitle}>Your Account</Text>
        <Text style={styles.body}>
          You must be at least 18 years old to use Stoke. You are responsible for
          maintaining the security of your account credentials. One account per person —
          do not share your login with others. You may delete your account at any time
          from Settings.
        </Text>

        <Text style={styles.sectionTitle}>Acceptable Use</Text>
        <Text style={styles.body}>
          You agree to use Stoke respectfully and lawfully. You will not use the app to
          harass, threaten, or harm another person. Content you share through prompts,
          messages, and photos must not contain illegal material, explicit content involving
          minors, or content that violates another person's rights.
        </Text>

        <Text style={styles.sectionTitle}>Your Content</Text>
        <Text style={styles.body}>
          You retain ownership of the responses, messages, and photos you share on Stoke.
          By using the app, you grant us a limited license to store, process, and display
          your content solely to provide the Stoke service to you and your partner. We do
          not sell your content or use it for advertising.
        </Text>

        <Text style={styles.sectionTitle}>Subscriptions and Payments</Text>
        <Text style={styles.body}>
          Stoke offers a free tier and a premium subscription. Subscriptions are billed
          through the App Store and auto-renew unless cancelled at least 24 hours before
          the end of the current period. You can manage or cancel your subscription in
          your device's subscription settings. Deleting your account does not automatically
          cancel your subscription.
        </Text>

        <Text style={styles.sectionTitle}>AI-Assisted Features</Text>
        <Text style={styles.body}>
          Stoke includes AI-powered features such as coaching insights. These features
          provide general relationship wellness suggestions based on engagement patterns.
          AI-generated content is not professional advice and should not be relied upon as
          such. We are not liable for decisions made based on AI-generated suggestions.
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
    backgroundColor: '#fef7f4',
  },
  header: {
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: 16,
  },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#fef5f0',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  title: {
    fontSize: 24,
    fontWeight: '600',
    fontFamily: 'Alexandria-SemiBold',
    color: '#1c1917',
  },
  scrollView: {
    flex: 1,
  },
  content: {
    paddingHorizontal: 24,
  },
  updated: {
    fontSize: 13,
    color: '#a8a29e',
    fontFamily: 'Inter-Regular',
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: '600',
    fontFamily: 'Inter-SemiBold',
    color: '#1c1917',
    marginTop: 20,
    marginBottom: 8,
  },
  body: {
    fontSize: 15,
    color: '#57534e',
    fontFamily: 'Inter-Regular',
    lineHeight: 22,
  },
  bottomSpacer: {
    height: 48,
  },
});
