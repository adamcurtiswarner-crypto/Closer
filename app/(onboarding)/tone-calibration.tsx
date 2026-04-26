import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, { FadeIn, FadeInUp } from 'react-native-reanimated';
import { router } from 'expo-router';
import { doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '@/config/firebase';
import { logger } from '@/utils/logger';
import { useAuth } from '@/hooks/useAuth';
import { Button, Icon } from '@/components';
import { useTranslation } from 'react-i18next';

const TONE_OPTIONS = [
  {
    value: 'solid',
    label: "We're solid",
    description: 'Just want to stay that way',
  },
  {
    value: 'distant',
    label: "We're okay",
    description: 'But feel a bit distant lately',
  },
  {
    value: 'struggling',
    label: "We're struggling to connect",
    description: 'Want to be more intentional',
  },
];

export default function ToneCalibrationScreen() {
  const { user, refreshUser } = useAuth();
  const [selectedTone, setSelectedTone] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const { t } = useTranslation();

  const handleContinue = async () => {
    if (!user?.id || !selectedTone) return;
    setIsSaving(true);
    try {
      const userRef = doc(db, 'users', user.id);
      await updateDoc(userRef, {
        tone_calibration: selectedTone,
        updated_at: serverTimestamp(),
      });
      await refreshUser();
      router.push('/(onboarding)/relationship-stage');
    } catch (error) {
      logger.error('Error saving tone calibration:', error);
      Alert.alert('Could not save', 'Please check your connection and try again.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <Animated.Text entering={FadeIn.duration(400)} style={styles.title}>
          {t('onboarding.toneCalibration.title')}
        </Animated.Text>
        <Animated.Text entering={FadeIn.duration(400).delay(100)} style={styles.subtitle}>
          {t('onboarding.toneCalibration.subtitle')}
        </Animated.Text>

        <View style={styles.optionsContainer}>
          {TONE_OPTIONS.map((option, index) => (
            <Animated.View
              key={option.value}
              entering={FadeInUp.duration(400).delay(200 + index * 100)}
            >
              <TouchableOpacity
                style={[
                  styles.optionCard,
                  selectedTone === option.value
                    ? styles.optionCardSelected
                    : styles.optionCardDefault,
                ]}
                onPress={() => setSelectedTone(option.value)}
              >
                <View style={styles.optionHeader}>
                  <Text
                    style={[
                      styles.optionLabel,
                      selectedTone === option.value
                        ? styles.optionLabelSelected
                        : styles.optionLabelDefault,
                    ]}
                  >
                    {option.label}
                  </Text>
                  {selectedTone === option.value && (
                    <Icon name="check" size="sm" color="#c97454" weight="bold" />
                  )}
                </View>
                <Text
                  style={[
                    styles.optionDescription,
                    selectedTone === option.value
                      ? styles.optionDescriptionSelected
                      : styles.optionDescriptionDefault,
                  ]}
                >
                  {option.description}
                </Text>
              </TouchableOpacity>
            </Animated.View>
          ))}
        </View>

        <View style={styles.spacer} />

        <Animated.View entering={FadeInUp.duration(400).delay(500)} style={styles.buttonContainer}>
          <Button
            title={isSaving ? t('common.saving') : t('common.continue')}
            onPress={handleContinue}
            disabled={!selectedTone || isSaving}
          />
        </Animated.View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fef7f4',
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 48,
  },
  title: {
    fontSize: 24,
    fontWeight: '600',
    fontFamily: 'Alexandria-SemiBold',
    color: '#1c1917',
  },
  subtitle: {
    fontFamily: 'Inter-Regular',
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
    backgroundColor: '#fef5f0',
    borderWidth: 1.5,
    borderColor: '#c97454',
  },
  optionCardDefault: {
    backgroundColor: '#fff',
    borderWidth: 1.5,
    borderColor: '#e7e5e4',
  },
  optionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  optionLabel: {
    fontSize: 16,
    fontWeight: '500',
    fontFamily: 'Inter-Medium',
  },
  optionLabelSelected: {
    color: '#c97454',
  },
  optionLabelDefault: {
    color: '#1c1917',
  },
  optionDescription: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    marginTop: 4,
  },
  optionDescriptionSelected: {
    color: '#c97454',
  },
  optionDescriptionDefault: {
    color: '#a8a29e',
  },
  spacer: {
    flex: 1,
  },
  buttonContainer: {
    marginBottom: 32,
  },
});
