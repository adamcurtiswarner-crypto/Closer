import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, { FadeIn, FadeInUp } from 'react-native-reanimated';
import { router } from 'expo-router';
import { doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '@/config/firebase';
import { logger } from '@/utils/logger';
import { useAuth } from '@/hooks/useAuth';
import { Button, Input, Icon } from '@/components';
import { useTranslation } from 'react-i18next';

const TIME_OPTIONS = [
  { label: 'Morning (8 AM)', value: '08:00' },
  { label: 'Afternoon (2 PM)', value: '14:00' },
  { label: 'Evening (7 PM)', value: '19:00' },
  { label: 'Night (9 PM)', value: '21:00' },
];

const DAYS_OF_WEEK = [
  { key: 'su', label: 'SU' },
  { key: 'mo', label: 'M' },
  { key: 'tu', label: 'T' },
  { key: 'we', label: 'W' },
  { key: 'th', label: 'TH' },
  { key: 'fr', label: 'F' },
  { key: 'sa', label: 'S' },
];

const ALL_DAYS = DAYS_OF_WEEK.map((d) => d.key);

export default function PreferencesScreen() {
  const { user, refreshUser } = useAuth();
  const [partnerName, setPartnerName] = useState('');
  const [selectedTime, setSelectedTime] = useState('19:00');
  const [selectedDays, setSelectedDays] = useState<string[]>(ALL_DAYS);
  const [isSaving, setIsSaving] = useState(false);
  const { t } = useTranslation();

  const toggleDay = (dayKey: string) => {
    setSelectedDays((prev) =>
      prev.includes(dayKey)
        ? prev.filter((d) => d !== dayKey)
        : [...prev, dayKey]
    );
  };

  const handleContinue = async () => {
    if (!user?.id) return;
    setIsSaving(true);
    try {
      const userRef = doc(db, 'users', user.id);
      await updateDoc(userRef, {
        partner_name: partnerName || null,
        notification_time: selectedTime,
        notification_days: selectedDays,
        updated_at: serverTimestamp(),
      });
      await refreshUser();
      router.push('/(onboarding)/tone-calibration');
    } catch (error) {
      logger.error('Error saving preferences:', error);
      Alert.alert('Could not save', 'Please check your connection and try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleSkip = () => {
    router.push('/(onboarding)/tone-calibration');
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <Animated.Text
          entering={FadeIn.duration(400)}
          style={styles.title}
        >
          What times would you prefer to engage with Stoke?
        </Animated.Text>
        <Animated.Text
          entering={FadeIn.duration(400).delay(50)}
          style={styles.helperText}
        >
          Any time you can choose but we recommend first thing in the morning
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
                <View style={styles.optionContent}>
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
                  {selectedTime === option.value && (
                    <Icon name="check" size="sm" color="#c97454" weight="bold" />
                  )}
                </View>
              </TouchableOpacity>
            </Animated.View>
          ))}
        </View>

        <Animated.View
          entering={FadeInUp.duration(400).delay(600)}
          style={styles.daySection}
        >
          <Text style={styles.daySectionTitle}>
            Which day would you like to receive prompts?
          </Text>
          <Text style={styles.daySectionHelper}>
            Everyday is best, but we recommend picking at least four
          </Text>

          <View style={styles.dayRow}>
            {DAYS_OF_WEEK.map((day, index) => {
              const isSelected = selectedDays.includes(day.key);
              return (
                <Animated.View
                  key={day.key}
                  entering={FadeInUp.duration(300).delay(650 + index * 40)}
                >
                  <TouchableOpacity
                    style={[
                      styles.dayCircle,
                      isSelected && styles.dayCircleSelected,
                    ]}
                    onPress={() => toggleDay(day.key)}
                    activeOpacity={0.7}
                  >
                    <Text
                      style={[
                        styles.dayLabel,
                        isSelected && styles.dayLabelSelected,
                      ]}
                    >
                      {day.label}
                    </Text>
                  </TouchableOpacity>
                </Animated.View>
              );
            })}
          </View>
        </Animated.View>

        <View style={styles.spacer} />

        <Animated.View
          entering={FadeInUp.duration(500).delay(700)}
          style={styles.buttonWrapper}
        >
          <Button
            title={isSaving ? t('common.saving') : 'SAVE'}
            onPress={handleContinue}
            disabled={isSaving}
          />
          <TouchableOpacity
            style={styles.skipButton}
            onPress={handleSkip}
            activeOpacity={0.6}
          >
            <Text style={styles.skipText}>NO THANKS</Text>
          </TouchableOpacity>
        </Animated.View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fef7f4',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingTop: 48,
    paddingBottom: 32,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    fontFamily: 'Alexandria-SemiBold',
    color: '#1c1917',
  },
  helperText: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#78716c',
    marginTop: 8,
    lineHeight: 20,
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
    fontFamily: 'Inter-Medium',
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
    backgroundColor: '#fef5f0',
    borderColor: '#c97454',
    borderWidth: 2,
  },
  optionRowDefault: {
    backgroundColor: '#fff',
    borderColor: '#e7e5e4',
  },
  optionContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    flex: 1,
  },
  selectedCheck: {
    fontSize: 16,
    fontWeight: '700',
    color: '#c97454',
  },
  optionText: {
    fontSize: 16,
    fontFamily: 'Inter-Regular',
  },
  optionTextSelected: {
    color: '#b5370f',
  },
  optionTextDefault: {
    color: '#44403c',
  },
  daySection: {
    marginTop: 32,
  },
  daySectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    fontFamily: 'Alexandria-SemiBold',
    color: '#1c1917',
  },
  daySectionHelper: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#78716c',
    marginTop: 6,
    marginBottom: 16,
    lineHeight: 20,
  },
  dayRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  dayCircle: {
    width: 41,
    height: 41,
    borderRadius: 20.5,
    borderWidth: 1,
    borderColor: '#e7e5e4',
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayCircleSelected: {
    backgroundColor: '#c97454',
    borderColor: '#c97454',
  },
  dayLabel: {
    fontFamily: 'Inter-Medium',
    fontSize: 13,
    color: '#57534e',
  },
  dayLabelSelected: {
    color: '#ffffff',
  },
  spacer: {
    flex: 1,
    minHeight: 24,
  },
  buttonWrapper: {
    marginBottom: 8,
    alignItems: 'center',
  },
  skipButton: {
    marginTop: 16,
    paddingVertical: 8,
  },
  skipText: {
    fontFamily: 'Inter-Medium',
    fontSize: 14,
    color: '#a8a29e',
    letterSpacing: 1,
  },
});
