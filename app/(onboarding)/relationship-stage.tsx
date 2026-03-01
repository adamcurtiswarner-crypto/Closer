import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, { FadeIn, FadeInUp } from 'react-native-reanimated';
import { router } from 'expo-router';
import { doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import * as Haptics from 'expo-haptics';
import { Button, Icon } from '@/components';
import { useAuth } from '@/hooks/useAuth';
import { db } from '@/config/firebase';
import { logger } from '@/utils/logger';
import type { IconName } from '@/components/Icon';

type RelationshipStage = 'dating' | 'engaged' | 'married' | 'long_distance';

const STAGES: { value: RelationshipStage; label: string; icon: IconName }[] = [
  { value: 'dating', label: 'Dating', icon: 'heart' },
  { value: 'engaged', label: 'Engaged', icon: 'star' },
  { value: 'married', label: 'Married', icon: 'handshake' },
  { value: 'long_distance', label: 'Long Distance', icon: 'map-pin' },
];

export default function RelationshipStageScreen() {
  const { user, refreshUser } = useAuth();
  const [selected, setSelected] = useState<RelationshipStage | null>(null);
  const [saving, setSaving] = useState(false);

  const handleSelect = (stage: RelationshipStage) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSelected(stage);
  };

  const handleContinue = async () => {
    if (!selected || !user?.id) return;
    setSaving(true);
    try {
      await updateDoc(doc(db, 'users', user.id), {
        relationship_stage: selected,
        updated_at: serverTimestamp(),
      });
      await refreshUser();
      router.push('/(onboarding)/first-prompt');
    } catch (error) {
      logger.error('Error saving relationship stage:', error);
    } finally {
      setSaving(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <Animated.Text entering={FadeIn.duration(400)} style={styles.title}>
          Where are you two?
        </Animated.Text>
        <Animated.Text entering={FadeIn.duration(400).delay(100)} style={styles.subtitle}>
          This helps us tailor your experience
        </Animated.Text>

        <View style={styles.optionsContainer}>
          {STAGES.map((stage, index) => (
            <Animated.View
              key={stage.value}
              entering={FadeInUp.duration(400).delay(200 + index * 100)}
            >
              <TouchableOpacity
                style={[
                  styles.optionCard,
                  selected === stage.value
                    ? styles.optionCardSelected
                    : styles.optionCardDefault,
                ]}
                onPress={() => handleSelect(stage.value)}
                activeOpacity={0.7}
              >
                <View style={styles.optionRow}>
                  <Icon
                    name={stage.icon}
                    size="md"
                    color={selected === stage.value ? '#c97454' : '#78716c'}
                    weight={selected === stage.value ? 'fill' : 'light'}
                  />
                  <Text
                    style={[
                      styles.optionLabel,
                      selected === stage.value
                        ? styles.optionLabelSelected
                        : styles.optionLabelDefault,
                    ]}
                  >
                    {stage.label}
                  </Text>
                  {selected === stage.value && (
                    <View style={styles.checkBadge}>
                      <Icon name="check" size="xs" color="#ffffff" weight="bold" />
                    </View>
                  )}
                </View>
              </TouchableOpacity>
            </Animated.View>
          ))}
        </View>

        <View style={styles.spacer} />

        <Animated.View entering={FadeInUp.duration(400).delay(600)} style={styles.buttonContainer}>
          <Button
            title={saving ? 'Saving...' : 'Continue'}
            onPress={handleContinue}
            disabled={!selected}
            loading={saving}
          />
        </Animated.View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fafaf9',
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 48,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1c1917',
  },
  subtitle: {
    color: '#57534e',
    marginTop: 8,
  },
  optionsContainer: {
    marginTop: 32,
  },
  optionCard: {
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
  },
  optionCardSelected: {
    backgroundColor: '#fef7f4',
    borderWidth: 1.5,
    borderColor: '#c97454',
  },
  optionCardDefault: {
    backgroundColor: '#fff',
    borderWidth: 1.5,
    borderColor: '#e7e5e4',
  },
  optionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  optionLabel: {
    fontSize: 16,
    fontWeight: '500',
    flex: 1,
  },
  optionLabelSelected: {
    color: '#c97454',
  },
  optionLabelDefault: {
    color: '#1c1917',
  },
  checkBadge: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#c97454',
    justifyContent: 'center',
    alignItems: 'center',
  },
  spacer: {
    flex: 1,
  },
  buttonContainer: {
    marginBottom: 32,
  },
});
