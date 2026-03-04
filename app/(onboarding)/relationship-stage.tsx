import React, { useState } from 'react';
import { View, Text, Pressable, StyleSheet, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, { FadeIn, FadeInUp } from 'react-native-reanimated';
import { router } from 'expo-router';
import { doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { hapticImpact } from '@utils/haptics';
import { Button } from '@/components';
import { useAuth } from '@/hooks/useAuth';
import { db } from '@/config/firebase';
import { logger } from '@/utils/logger';

type RelationshipStage =
  | 'comfortable_but_busy'
  | 'new_and_exciting'
  | 'a_little_disconnected'
  | 'going_through_a_lot'
  | 'deep_and_steady'
  | 'in_a_bit_of_a_rut'
  | 'reduce_stress';

type StageItem = {
  value: RelationshipStage;
  label: string;
  column: 0 | 1;
};

// Cards arranged in two columns with varying heights achieved via content/padding
const LEFT_COLUMN: StageItem[] = [
  { value: 'comfortable_but_busy', label: 'Comfortable but busy', column: 0 },
  { value: 'a_little_disconnected', label: 'A little disconnected', column: 0 },
  { value: 'deep_and_steady', label: 'Deep and steady', column: 0 },
  { value: 'reduce_stress', label: 'Reduce Stress', column: 0 },
];

const RIGHT_COLUMN: StageItem[] = [
  { value: 'new_and_exciting', label: 'New and exciting', column: 1 },
  { value: 'going_through_a_lot', label: 'Going through a lot', column: 1 },
  { value: 'in_a_bit_of_a_rut', label: 'In a bit of a rut', column: 1 },
];

// Varying minimum heights per card for masonry effect
const CARD_MIN_HEIGHTS: Record<RelationshipStage, number> = {
  comfortable_but_busy: 96,
  new_and_exciting: 112,
  a_little_disconnected: 112,
  going_through_a_lot: 96,
  deep_and_steady: 96,
  in_a_bit_of_a_rut: 112,
  reduce_stress: 96,
};

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export default function RelationshipStageScreen() {
  const { user, refreshUser } = useAuth();
  const [selected, setSelected] = useState<RelationshipStage | null>(null);
  const [saving, setSaving] = useState(false);

  const handleSelect = (stage: RelationshipStage) => {
    hapticImpact();
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

  const renderCard = (stage: StageItem, index: number, columnOffset: number) => {
    const isSelected = selected === stage.value;
    const animationDelay = 200 + (index + columnOffset) * 80;

    return (
      <AnimatedPressable
        key={stage.value}
        entering={FadeInUp.duration(400).delay(animationDelay)}
        style={[
          styles.card,
          { minHeight: CARD_MIN_HEIGHTS[stage.value] },
          isSelected ? styles.cardSelected : styles.cardDefault,
        ]}
        onPress={() => handleSelect(stage.value)}
      >
        <Text style={[styles.cardLabel, isSelected && styles.cardLabelSelected]}>
          {stage.label}
        </Text>
      </AnimatedPressable>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <Animated.Text entering={FadeIn.duration(400)} style={styles.title}>
          What does your relationship feel like right now?
        </Animated.Text>

        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.gridContainer}>
            <View style={styles.column}>
              {LEFT_COLUMN.map((stage, index) => renderCard(stage, index, 0))}
            </View>
            <View style={styles.column}>
              {RIGHT_COLUMN.map((stage, index) => renderCard(stage, index, LEFT_COLUMN.length))}
            </View>
          </View>
        </ScrollView>

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
    fontSize: 28,
    fontWeight: '600',
    fontFamily: 'Alexandria-SemiBold',
    color: '#1c1917',
    lineHeight: 36,
    marginBottom: 8,
  },
  scrollView: {
    flex: 1,
    marginTop: 24,
  },
  scrollContent: {
    paddingBottom: 16,
  },
  gridContainer: {
    flexDirection: 'row',
    gap: 12,
  },
  column: {
    flex: 1,
    gap: 12,
  },
  card: {
    borderRadius: 20,
    padding: 16,
    justifyContent: 'center',
  },
  cardDefault: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e7e5e4',
  },
  cardSelected: {
    backgroundColor: '#fef5f0',
    borderWidth: 2,
    borderColor: '#ef5323',
  },
  cardLabel: {
    fontSize: 16,
    fontWeight: '500',
    fontFamily: 'Inter-Medium',
    color: '#1c1917',
  },
  cardLabelSelected: {
    color: '#ef5323',
  },
  buttonContainer: {
    marginBottom: 32,
  },
});
