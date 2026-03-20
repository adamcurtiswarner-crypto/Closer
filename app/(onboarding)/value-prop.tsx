import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, { FadeIn, FadeInUp } from 'react-native-reanimated';
import { router } from 'expo-router';
import { Button, Icon } from '@/components';
import type { IconName } from '@/components/Icon';

export default function ValuePropScreen() {
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <Animated.View entering={FadeIn.duration(400)} style={styles.iconRow}>
          <Icon name="flame" size="xl" color="#c97454" weight="fill" />
        </Animated.View>

        <Animated.View entering={FadeInUp.duration(400).delay(200)}>
          <Text style={styles.title}>Stay connected in{'\n'}just 5 minutes a day</Text>
          <Text style={styles.subtitle}>
            One thoughtful question, answered together.{'\n'}
            That's all it takes to keep the spark alive.
          </Text>
        </Animated.View>

        <Animated.View entering={FadeInUp.duration(400).delay(400)} style={styles.features}>
          <FeatureRow icon="check" text="Daily prompts designed for couples" />
          <FeatureRow icon="lock" text="Private and encrypted" />
          <FeatureRow icon="heart" text="Built on relationship science" />
        </Animated.View>
      </View>

      <Animated.View entering={FadeInUp.duration(400).delay(600)}>
        <Button title="Continue" onPress={() => router.push('/(onboarding)/preferences')} />
      </Animated.View>
    </SafeAreaView>
  );
}

function FeatureRow({ icon, text }: { icon: IconName; text: string }) {
  return (
    <View style={styles.featureRow}>
      <Icon name={icon} size="sm" color="#c97454" weight="bold" />
      <Text style={styles.featureText}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fafaf9',
    padding: 24,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
  },
  iconRow: {
    alignItems: 'center',
    marginBottom: 24,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    fontFamily: 'Alexandria-SemiBold',
    color: '#1c1917',
    textAlign: 'center',
    marginBottom: 12,
  },
  subtitle: {
    fontSize: 15,
    fontFamily: 'Inter-Regular',
    color: '#57534e',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 32,
  },
  features: {
    gap: 16,
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 24,
  },
  featureText: {
    fontSize: 15,
    fontFamily: 'Inter-Regular',
    color: '#57534e',
  },
});
