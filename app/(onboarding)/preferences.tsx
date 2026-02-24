import React, { useState } from 'react';
import {
  View,
  Text,
  SafeAreaView,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import Animated, { FadeIn, FadeInUp } from 'react-native-reanimated';
import { router } from 'expo-router';
import { doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '@/config/firebase';
import { logger } from '@/utils/logger';
import { useAuth } from '@/hooks/useAuth';
import { Button, Input } from '@/components';
import { useTranslation } from 'react-i18next';

const TIME_OPTIONS = [
  { label: 'Morning (8 AM)', value: '08:00' },
  { label: 'Afternoon (2 PM)', value: '14:00' },
  { label: 'Evening (7 PM)', value: '19:00' },
  { label: 'Night (9 PM)', value: '21:00' },
];

export default function PreferencesScreen() {
  const { user, refreshUser } = useAuth();
  const [partnerName, setPartnerName] = useState('');
  const [selectedTime, setSelectedTime] = useState('19:00');
  const [isSaving, setIsSaving] = useState(false);
  const { t } = useTranslation();

  const handleContinue = async () => {
    if (!user?.id) return;
    setIsSaving(true);
    try {
      const userRef = doc(db, 'users', user.id);
      await updateDoc(userRef, {
        partner_name: partnerName || null,
        notification_time: selectedTime,
        updated_at: serverTimestamp(),
      });
      await refreshUser();
      router.push('/(onboarding)/tone-calibration');
    } catch (error) {
      logger.error('Error saving preferences:', error);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <Animated.Text
          entering={FadeIn.duration(400)}
          style={styles.title}
        >
          {t('onboarding.preferences.title')}
        </Animated.Text>

        <Animated.View
          entering={FadeIn.duration(400).delay(100)}
          style={styles.inputSection}
        >
          <Input
            label={t('onboarding.preferences.partnerLabel')}
            placeholder={t('onboarding.preferences.partnerPlaceholder')}
            value={partnerName}
            onChangeText={setPartnerName}
          />
        </Animated.View>

        <View style={styles.timeSection}>
          <Animated.Text
            entering={FadeIn.duration(400).delay(100)}
            style={styles.timeLabel}
          >
            {t('onboarding.preferences.promptTimeLabel')}
          </Animated.Text>

          {TIME_OPTIONS.map((option, index) => (
            <Animated.View
              key={option.value}
              entering={FadeInUp.duration(400).delay(200 + index * 100)}
            >
              <TouchableOpacity
                style={[
                  styles.optionRow,
                  selectedTime === option.value
                    ? styles.optionRowSelected
                    : styles.optionRowDefault,
                ]}
                onPress={() => setSelectedTime(option.value)}
              >
                <View
                  style={[
                    styles.radio,
                    selectedTime === option.value
                      ? styles.radioSelected
                      : styles.radioDefault,
                  ]}
                >
                  {selectedTime === option.value && (
                    <View style={styles.radioDot} />
                  )}
                </View>
                <Text
                  style={[
                    styles.optionText,
                    selectedTime === option.value
                      ? styles.optionTextSelected
                      : styles.optionTextDefault,
                  ]}
                >
                  {option.label}
                </Text>
              </TouchableOpacity>
            </Animated.View>
          ))}
        </View>

        <View style={styles.spacer} />

        <Animated.View
          entering={FadeInUp.duration(500).delay(500)}
          style={styles.buttonWrapper}
        >
          <Button
            title={isSaving ? t('common.saving') : t('common.continue')}
            onPress={handleContinue}
            disabled={isSaving}
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
  inputSection: {
    marginTop: 32,
  },
  timeSection: {
    marginTop: 32,
  },
  timeLabel: {
    color: '#44403c',
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 12,
  },
  optionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    marginBottom: 8,
    borderWidth: 1,
  },
  optionRowSelected: {
    backgroundColor: '#fef7f4',
    borderColor: '#e8c4b0',
  },
  optionRowDefault: {
    backgroundColor: '#fff',
    borderColor: '#e7e5e4',
  },
  radio: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    marginRight: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioSelected: {
    borderColor: '#c97454',
  },
  radioDefault: {
    borderColor: '#d6d3d1',
  },
  radioDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#c97454',
  },
  optionText: {
    fontSize: 16,
  },
  optionTextSelected: {
    color: '#9a5a3a',
  },
  optionTextDefault: {
    color: '#44403c',
  },
  spacer: {
    flex: 1,
  },
  buttonWrapper: {
    marginBottom: 32,
  },
});
