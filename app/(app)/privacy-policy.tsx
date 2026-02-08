import React from 'react';
import { View, Text, ScrollView, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { TouchableOpacity } from 'react-native';
import { router } from 'expo-router';

export default function PrivacyPolicyScreen() {
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={styles.back}>{'< Back'}</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Privacy Policy</Text>
      </View>

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.content}>
        <Text style={styles.updated}>Last updated: February 2026</Text>

        <Text style={styles.sectionTitle}>What We Collect</Text>
        <Text style={styles.body}>
          Closer collects your email address, display name, and the responses you
          share with your partner. We also store your notification preferences and
          timezone to deliver prompts at the right time.
        </Text>

        <Text style={styles.sectionTitle}>How We Use Your Data</Text>
        <Text style={styles.body}>
          Your data is used solely to power the Closer experience: delivering daily
          prompts, showing responses between you and your partner, and generating
          weekly recaps. We do not sell your data or share it with third parties for
          advertising.
        </Text>

        <Text style={styles.sectionTitle}>Encryption</Text>
        <Text style={styles.body}>
          Your responses are encrypted using AES-256 before being stored. Encryption
          keys are stored securely on your device and are never sent to our servers
          in plaintext.
        </Text>

        <Text style={styles.sectionTitle}>Data Storage</Text>
        <Text style={styles.body}>
          Your data is stored on Google Cloud (Firebase) infrastructure located in
          the United States. Data is protected in transit via TLS and at rest via
          Google's default encryption.
        </Text>

        <Text style={styles.sectionTitle}>Data Deletion</Text>
        <Text style={styles.body}>
          You can delete your account at any time from Settings. This marks your
          account for deletion and removes your data from active use. Backups may
          retain data for up to 30 days before permanent deletion.
        </Text>

        <Text style={styles.sectionTitle}>Analytics</Text>
        <Text style={styles.body}>
          We collect anonymous usage events (e.g., prompt viewed, response submitted)
          to improve the experience. These events are linked to your account but are
          never shared externally.
        </Text>

        <Text style={styles.sectionTitle}>Push Notifications</Text>
        <Text style={styles.body}>
          If you grant notification permissions, we send daily prompt reminders and
          partner activity alerts. You can disable notifications at any time in your
          device settings.
        </Text>

        <Text style={styles.sectionTitle}>Contact</Text>
        <Text style={styles.body}>
          For privacy questions or data requests, contact us at privacy@closerapp.co.
        </Text>

        <View style={styles.bottomSpacer} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fafaf9',
  },
  header: {
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: 16,
  },
  back: {
    fontSize: 16,
    color: '#c97454',
    marginBottom: 12,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
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
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: '#1c1917',
    marginTop: 20,
    marginBottom: 8,
  },
  body: {
    fontSize: 15,
    color: '#57534e',
    lineHeight: 22,
  },
  bottomSpacer: {
    height: 48,
  },
});
