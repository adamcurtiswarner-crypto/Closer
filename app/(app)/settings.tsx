import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Switch,
  Alert,
  Linking,
  Modal,
  TextInput,
  ActivityIndicator,
  Share,
  StyleSheet,
} from 'react-native';
import Animated, { FadeInUp } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '@/config/firebase';
import { useAuth } from '@/hooks/useAuth';
import { useCouple, useUpdatePromptFrequency } from '@/hooks/useCouple';
import { useSubscription } from '@/hooks/useSubscription';
import { useDeleteAccount, useExportData, useAnonymizeResponses } from '@/hooks/usePrivacy';
import { useCalendarSync } from '@/hooks/useCalendar';
import { Paywall } from '@/components/Paywall';
import { logger } from '@/utils/logger';
import { PartnershipSection, ProfileCard } from '@/components';
import { useTranslation } from 'react-i18next';

const FREQUENCY_OPTIONS = [
  { label: 'Daily', value: 'daily' as const, description: 'Every day' },
  { label: 'Weekdays', value: 'weekdays' as const, description: 'Monday - Friday' },
  { label: 'Weekends', value: 'weekends' as const, description: 'Saturday & Sunday' },
];

function getFrequencyDisplay(value: string): string {
  return FREQUENCY_OPTIONS.find((f) => f.value === value)?.label || 'Daily';
}

const TIME_OPTIONS = [
  { label: 'Morning (8 AM)', value: '08:00', display: '8:00 AM' },
  { label: 'Afternoon (2 PM)', value: '14:00', display: '2:00 PM' },
  { label: 'Evening (7 PM)', value: '19:00', display: '7:00 PM' },
  { label: 'Night (9 PM)', value: '21:00', display: '9:00 PM' },
];

function getTimeDisplay(value: string): string {
  return TIME_OPTIONS.find((t) => t.value === value)?.display || value;
}

export default function SettingsScreen() {
  const { user, signOut, refreshUser } = useAuth();
  const { t } = useTranslation();
  const { data: couple } = useCouple();
  const updateFrequency = useUpdatePromptFrequency();
  const [remindMe, setRemindMe] = useState(user?.remindToRespond ?? true);
  const [partnerNotify, setPartnerNotify] = useState(user?.notifyPartnerResponse ?? true);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [showFrequencyPicker, setShowFrequencyPicker] = useState(false);
  const [isSavingTime, setIsSavingTime] = useState(false);

  const { isPremium } = useSubscription();
  const [showPaywall, setShowPaywall] = useState(false);
  const currentFrequency = couple?.promptFrequency || 'daily';

  const currentTime = user?.notificationTime || '19:00';

  // Privacy & Data
  const deleteAccount = useDeleteAccount();
  const exportData = useExportData();
  const anonymizeResponses = useAnonymizeResponses();
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  const [showAnonymizeModal, setShowAnonymizeModal] = useState(false);

  // Calendar sync
  const { synced: calendarSynced, sync: calendarSync, remove: calendarRemove } = useCalendarSync();

  const handleTimeChange = async (newTime: string) => {
    if (!user?.id) return;
    setIsSavingTime(true);
    try {
      const userRef = doc(db, 'users', user.id);
      await updateDoc(userRef, {
        notification_time: newTime,
        updated_at: serverTimestamp(),
      });
      await refreshUser();
    } catch (error) {
      logger.error('Error updating notification time:', error);
      Alert.alert(t('common.error'), t('settings.errorUpdateTime'));
    } finally {
      setIsSavingTime(false);
      setShowTimePicker(false);
    }
  };

  const handleSignOut = () => {
    Alert.alert(t('settings.signOut'), t('settings.signOutConfirm'), [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('settings.signOut'),
        style: 'destructive',
        onPress: async () => {
          await signOut();
          router.replace('/(auth)/welcome');
        },
      },
    ]);
  };

  const handleDeleteAccount = async () => {
    try {
      await deleteAccount.mutateAsync();
      router.replace('/(auth)/welcome');
    } catch (error) {
      Alert.alert(t('common.error'), t('settings.deleteFailed'));
    } finally {
      setShowDeleteModal(false);
      setDeleteConfirmText('');
    }
  };

  const handleExportData = async () => {
    try {
      const data = await exportData.mutateAsync();
      const jsonString = JSON.stringify(data, null, 2);
      await Share.share({
        message: jsonString,
        title: 'Stoke - My Data Export',
      });
    } catch (error: any) {
      if (error?.code === 'functions/resource-exhausted') {
        Alert.alert(t('common.error'), t('settings.exportUnavailable'));
      } else {
        Alert.alert(t('common.error'), t('settings.exportFailed'));
      }
    }
  };

  const handleAnonymizeResponses = async () => {
    try {
      const result = await anonymizeResponses.mutateAsync();
      setShowAnonymizeModal(false);
      Alert.alert(
        t('settings.anonymized'),
        t('settings.anonymizedBody', { count: result.anonymized_count })
      );
    } catch (error) {
      Alert.alert(t('common.error'), t('settings.anonymizeFailed'));
    }
  };

  const handleToggleRemind = async (value: boolean) => {
    setRemindMe(value);
    if (!user?.id) return;
    try {
      const userRef = doc(db, 'users', user.id);
      await updateDoc(userRef, {
        remind_to_respond: value,
        updated_at: serverTimestamp(),
      });
    } catch (error) {
      logger.error('Error updating reminder setting:', error);
      setRemindMe(!value); // Revert on error
    }
  };

  const handleTogglePartnerNotify = async (value: boolean) => {
    setPartnerNotify(value);
    if (!user?.id) return;
    try {
      const userRef = doc(db, 'users', user.id);
      await updateDoc(userRef, {
        notify_partner_response: value,
        updated_at: serverTimestamp(),
      });
    } catch (error) {
      logger.error('Error updating partner notify setting:', error);
      setPartnerNotify(!value); // Revert on error
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>{t('settings.title')}</Text>
      </View>

      <ScrollView style={styles.scrollView}>
        {/* Profile */}
        <Text style={styles.sectionTitle}>{t('settings.profile')}</Text>
        <ProfileCard />

        {/* Notifications */}
        <Animated.View entering={FadeInUp.duration(400).delay(100)}>
          <Text style={styles.sectionTitle}>{t('settings.notifications')}</Text>
          <View style={styles.section}>
            <TouchableOpacity style={styles.row} onPress={() => setShowTimePicker(true)}>
              <Text style={styles.rowLabel}>{t('settings.dailyPromptTime')}</Text>
              <Text style={styles.rowValue}>{getTimeDisplay(currentTime)} {'>'}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.row} onPress={() => setShowFrequencyPicker(true)}>
              <Text style={styles.rowLabel}>{t('settings.promptFrequency')}</Text>
              <Text style={styles.rowValue}>{getFrequencyDisplay(currentFrequency)} {'>'}</Text>
            </TouchableOpacity>
            <View style={styles.rowToggle}>
              <Text style={styles.rowLabel}>{t('settings.remindMe')}</Text>
              <Switch
                value={remindMe}
                onValueChange={handleToggleRemind}
                trackColor={{ false: '#e7e5e4', true: '#f9a07a' }}
                thumbColor={remindMe ? '#c97454' : '#fef7f4'}
              />
            </View>
            <View style={styles.rowToggle}>
              <Text style={styles.rowLabel}>{t('settings.notifyPartner')}</Text>
              <Switch
                value={partnerNotify}
                onValueChange={handleTogglePartnerNotify}
                trackColor={{ false: '#e7e5e4', true: '#f9a07a' }}
                thumbColor={partnerNotify ? '#c97454' : '#fef7f4'}
              />
            </View>
            <View style={[styles.rowToggle, styles.lastRow]}>
              <Text style={styles.rowLabel}>{t('settings.syncToCalendar')}</Text>
              <Switch
                value={calendarSynced}
                onValueChange={(value) => {
                  if (value) {
                    calendarSync.mutate();
                  } else {
                    calendarRemove.mutate();
                  }
                }}
                trackColor={{ false: '#e7e5e4', true: '#f9a07a' }}
                thumbColor={calendarSynced ? '#c97454' : '#fef7f4'}
                disabled={calendarSync.isPending || calendarRemove.isPending}
              />
            </View>
          </View>
        </Animated.View>

        {/* Partnership */}
        <Animated.View entering={FadeInUp.duration(400).delay(160)}>
          <PartnershipSection
            sectionTitleStyle={styles.sectionTitle}
            sectionStyle={styles.section}
            rowStyle={styles.row}
            lastRowStyle={styles.lastRow}
            rowLabelStyle={styles.rowLabel}
            rowValueStyle={styles.rowValue}
            dangerTextStyle={styles.dangerText}
          />
        </Animated.View>

        {/* Resources */}
        <Animated.View entering={FadeInUp.duration(400).delay(220)}>
          <Text style={styles.sectionTitle}>{t('settings.resources')}</Text>
          <View style={styles.section}>
            <TouchableOpacity
              style={[styles.row, styles.lastRow]}
              onPress={() => router.push('/(app)/resources')}
            >
              <Text style={styles.rowLabel}>{t('settings.findSupport')}</Text>
              <Text style={styles.rowValue}>{'>'}</Text>
            </TouchableOpacity>
          </View>
        </Animated.View>

        {/* Privacy & Data */}
        <Animated.View entering={FadeInUp.duration(400).delay(280)}>
          <Text style={styles.sectionTitle}>{t('settings.privacyData')}</Text>
          <View style={styles.section}>
            <TouchableOpacity
              style={styles.row}
              onPress={handleExportData}
              disabled={exportData.isPending}
            >
              <Text style={styles.rowLabel}>{t('settings.exportData')}</Text>
              {exportData.isPending ? (
                <ActivityIndicator size="small" color="#c97454" />
              ) : (
                <Text style={styles.rowValue}>{'>'}</Text>
              )}
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.row}
              onPress={() => setShowAnonymizeModal(true)}
            >
              <Text style={styles.rowLabel}>{t('settings.anonymize')}</Text>
              <Text style={styles.rowValue}>{'>'}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.row}
              onPress={() => router.push('/(app)/privacy-policy')}
            >
              <Text style={styles.rowLabel}>{t('settings.privacyPolicy')}</Text>
              <Text style={styles.rowValue}>{'>'}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.row, styles.lastRow]}
              onPress={() => setShowDeleteModal(true)}
            >
              <Text style={styles.dangerText}>{t('settings.deleteAccount')}</Text>
            </TouchableOpacity>
          </View>
        </Animated.View>

        {/* Account */}
        <Animated.View entering={FadeInUp.duration(400).delay(340)}>
          <Text style={styles.sectionTitle}>{t('settings.account')}</Text>
          <View style={styles.section}>
            <TouchableOpacity
              style={styles.row}
              onPress={() => !isPremium && setShowPaywall(true)}
              disabled={isPremium}
            >
              <Text style={styles.rowLabel}>{t('settings.subscription')}</Text>
              <Text style={[styles.rowValue, isPremium && styles.premiumText]}>
                {isPremium ? t('settings.premium') : t('settings.free') + ' >'}
              </Text>
            </TouchableOpacity>
            <View style={styles.row}>
              <Text style={styles.rowLabel}>{t('settings.version')}</Text>
              <Text style={styles.rowValue}>1.0.0</Text>
            </View>
            <TouchableOpacity style={[styles.row, styles.lastRow]} onPress={handleSignOut}>
              <Text style={styles.rowLabel}>{t('settings.signOut')}</Text>
              <Text style={styles.rowValue}>{'>'}</Text>
            </TouchableOpacity>
          </View>
        </Animated.View>

        {/* Safety */}
        <Animated.View entering={FadeInUp.duration(400).delay(400)}>
          <View style={styles.safety}>
            <Text style={styles.safetyText}>
              {t('settings.safetyText')}
            </Text>
            <TouchableOpacity onPress={() => Linking.openURL('tel:1-800-799-7233')}>
              <Text style={styles.safetyLink}>{t('settings.safetyLink')}</Text>
            </TouchableOpacity>
          </View>
        </Animated.View>
      </ScrollView>

      {/* Time Picker Modal */}
      <Modal
        visible={showTimePicker}
        transparent
        animationType="slide"
        onRequestClose={() => setShowTimePicker(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>{t('settings.promptTimeTitle')}</Text>
            <Text style={styles.modalSubtitle}>
              {t('settings.promptTimeSubtitle')}
            </Text>

            {TIME_OPTIONS.map((option) => (
              <TouchableOpacity
                key={option.value}
                style={[
                  styles.timeOption,
                  currentTime === option.value && styles.timeOptionActive,
                ]}
                onPress={() => handleTimeChange(option.value)}
                disabled={isSavingTime}
              >
                <View style={[
                  styles.radio,
                  currentTime === option.value && styles.radioActive,
                ]}>
                  {currentTime === option.value && <View style={styles.radioInner} />}
                </View>
                <Text style={[
                  styles.timeOptionText,
                  currentTime === option.value && styles.timeOptionTextActive,
                ]}>
                  {option.label}
                </Text>
              </TouchableOpacity>
            ))}

            <TouchableOpacity
              style={styles.modalClose}
              onPress={() => setShowTimePicker(false)}
            >
              <Text style={styles.modalCloseText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
      <Paywall visible={showPaywall} onClose={() => setShowPaywall(false)} />

      {/* Frequency Picker Modal */}
      <Modal
        visible={showFrequencyPicker}
        transparent
        animationType="slide"
        onRequestClose={() => setShowFrequencyPicker(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>{t('settings.frequencyTitle')}</Text>
            <Text style={styles.modalSubtitle}>
              {t('settings.frequencySubtitle')}
            </Text>

            {FREQUENCY_OPTIONS.map((option) => (
              <TouchableOpacity
                key={option.value}
                style={[
                  styles.timeOption,
                  currentFrequency === option.value && styles.timeOptionActive,
                ]}
                onPress={async () => {
                  try {
                    await updateFrequency.mutateAsync(option.value);
                  } catch (error) {
                    logger.error('Error updating frequency:', error);
                    Alert.alert(t('common.error'), t('settings.errorUpdateFrequency'));
                  }
                  setShowFrequencyPicker(false);
                }}
                disabled={updateFrequency.isPending}
              >
                <View style={[
                  styles.radio,
                  currentFrequency === option.value && styles.radioActive,
                ]}>
                  {currentFrequency === option.value && <View style={styles.radioInner} />}
                </View>
                <View>
                  <Text style={[
                    styles.timeOptionText,
                    currentFrequency === option.value && styles.timeOptionTextActive,
                  ]}>
                    {option.label}
                  </Text>
                  <Text style={styles.frequencyDescription}>{option.description}</Text>
                </View>
              </TouchableOpacity>
            ))}

            <TouchableOpacity
              style={styles.modalClose}
              onPress={() => setShowFrequencyPicker(false)}
            >
              <Text style={styles.modalCloseText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Delete Account Modal */}
      <Modal
        visible={showDeleteModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowDeleteModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>{t('settings.deleteTitle')}</Text>
            <Text style={styles.deleteModalBody}>
              {t('settings.deleteBody')}
            </Text>

            <Text style={styles.deleteModalLabel}>{t('settings.deleteConfirmLabel')}</Text>
            <TextInput
              style={styles.deleteInput}
              value={deleteConfirmText}
              onChangeText={setDeleteConfirmText}
              placeholder="DELETE"
              placeholderTextColor="#d6d3d1"
              autoCapitalize="characters"
              autoCorrect={false}
            />

            <TouchableOpacity
              style={[
                styles.deleteButton,
                deleteConfirmText !== 'DELETE' && styles.deleteButtonDisabled,
              ]}
              onPress={handleDeleteAccount}
              disabled={deleteConfirmText !== 'DELETE' || deleteAccount.isPending}
            >
              {deleteAccount.isPending ? (
                <ActivityIndicator size="small" color="#ffffff" />
              ) : (
                <Text style={styles.deleteButtonText}>{t('settings.deleteButton')}</Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.modalClose}
              onPress={() => {
                setShowDeleteModal(false);
                setDeleteConfirmText('');
              }}
            >
              <Text style={styles.modalCloseText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Anonymize Responses Modal */}
      <Modal
        visible={showAnonymizeModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowAnonymizeModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>{t('settings.anonymizeTitle')}</Text>
            <Text style={styles.deleteModalBody}>
              {t('settings.anonymizeBody')}
            </Text>

            <TouchableOpacity
              style={styles.anonymizeButton}
              onPress={handleAnonymizeResponses}
              disabled={anonymizeResponses.isPending}
            >
              {anonymizeResponses.isPending ? (
                <ActivityIndicator size="small" color="#ffffff" />
              ) : (
                <Text style={styles.deleteButtonText}>{t('settings.anonymizeButton')}</Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.modalClose}
              onPress={() => setShowAnonymizeModal(false)}
            >
              <Text style={styles.modalCloseText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
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
    paddingTop: 32,
    paddingBottom: 16,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    fontFamily: 'Alexandria-SemiBold',
    color: '#1c1917',
  },
  scrollView: {
    flex: 1,
    paddingHorizontal: 16,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '500',
    fontFamily: 'Inter-Medium',
    color: '#78716c',
    marginTop: 24,
    marginBottom: 8,
    marginLeft: 4,
    letterSpacing: 0.5,
  },
  section: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    overflow: 'hidden',
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#f5f5f4',
  },
  rowToggle: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#f5f5f4',
  },
  lastRow: {
    borderBottomWidth: 0,
  },
  rowLabel: {
    fontSize: 16,
    color: '#1c1917',
    fontFamily: 'Inter-Regular',
  },
  rowValue: {
    fontSize: 16,
    color: '#78716c',
    fontFamily: 'Inter-Regular',
  },
  premiumText: {
    color: '#c97454',
    fontWeight: '600',
  },
  dangerText: {
    fontSize: 16,
    color: '#f87171',
  },
  safety: {
    backgroundColor: '#f5f5f4',
    borderRadius: 12,
    padding: 16,
    marginTop: 32,
    marginBottom: 48,
  },
  safetyText: {
    fontSize: 14,
    color: '#57534e',
    fontFamily: 'Inter-Regular',
    lineHeight: 20,
  },
  safetyLink: {
    fontSize: 14,
    color: '#c97454',
    fontFamily: 'Inter-Medium',
    marginTop: 8,
  },
  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 24,
    paddingBottom: 40,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '600',
    fontFamily: 'Alexandria-SemiBold',
    color: '#1c1917',
    marginBottom: 4,
  },
  modalSubtitle: {
    fontSize: 14,
    color: '#78716c',
    fontFamily: 'Inter-Regular',
    marginBottom: 20,
  },
  timeOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 12,
    marginBottom: 8,
    backgroundColor: '#fef7f4',
  },
  timeOptionActive: {
    backgroundColor: '#fef3ee',
    borderWidth: 1,
    borderColor: '#f9a07a',
  },
  radio: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#d6d3d1',
    marginRight: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioActive: {
    borderColor: '#c97454',
  },
  radioInner: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#c97454',
  },
  timeOptionText: {
    fontSize: 16,
    color: '#57534e',
    fontFamily: 'Inter-Regular',
  },
  timeOptionTextActive: {
    color: '#c97454',
    fontWeight: '500',
  },
  frequencyDescription: {
    fontSize: 13,
    color: '#a8a29e',
    marginTop: 2,
  },
  modalClose: {
    marginTop: 8,
    paddingVertical: 14,
    alignItems: 'center',
  },
  modalCloseText: {
    fontSize: 16,
    color: '#78716c',
  },
  deleteModalBody: {
    fontSize: 15,
    color: '#57534e',
    lineHeight: 22,
    marginBottom: 20,
  },
  deleteModalLabel: {
    fontSize: 13,
    fontWeight: '500',
    color: '#78716c',
    marginBottom: 8,
  },
  deleteInput: {
    borderWidth: 1,
    borderColor: '#e7e5e4',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
    color: '#1c1917',
    marginBottom: 16,
    letterSpacing: 2,
  },
  deleteButton: {
    backgroundColor: '#ef4444',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  deleteButtonDisabled: {
    backgroundColor: '#fca5a5',
  },
  deleteButtonText: {
    fontSize: 16,
    fontWeight: '600',
    fontFamily: 'Inter-SemiBold',
    color: '#ffffff',
  },
  anonymizeButton: {
    backgroundColor: '#c97454',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
});
