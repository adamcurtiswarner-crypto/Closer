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
  Platform,
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
import { ReauthModal } from '@/components/ReauthModal';
import { logger } from '@/utils/logger';
import { PartnershipSection, Icon } from '@/components';
import { FEATURES } from '@/config/features';
import { getSupportEmailUrl, SUPPORT_EMAIL } from '@/config/app';
import { ProfileCard } from '@/components/ProfileCard';
import { useTranslation } from 'react-i18next';
import { useBiometricAuth } from '@/hooks/useBiometricAuth';
import Constants from 'expo-constants';
import { colors, radius, shadow, spacing, typography } from '@/config/theme';
import { TIME_OPTIONS, getTimeDisplay, resolvePromptTime } from '@/config/promptTime';

const FREQUENCY_OPTIONS = [
  { label: 'Daily', value: 'daily' as const, description: 'Every day' },
  { label: 'Weekdays', value: 'weekdays' as const, description: 'Monday - Friday' },
  { label: 'Weekends', value: 'weekends' as const, description: 'Saturday & Sunday' },
];

function getFrequencyDisplay(value: string): string {
  return FREQUENCY_OPTIONS.find((f) => f.value === value)?.label || 'Daily';
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

  // Truth: display what delivery will actually use — the stored user value,
  // falling back to the backend default (19:00, see functions/src/prompts.ts).
  const currentTime = resolvePromptTime(user?.notificationTime);

  // Privacy & Data
  const deleteAccount = useDeleteAccount();
  const exportData = useExportData();
  const anonymizeResponses = useAnonymizeResponses();
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  const [showAnonymizeModal, setShowAnonymizeModal] = useState(false);

  // Biometric
  const {
    isBiometricAvailable,
    isBiometricEnabled,
    biometricType,
    enableBiometric,
    disableBiometric,
  } = useBiometricAuth();

  // Re-auth for delete flow
  const [showReauthModal, setShowReauthModal] = useState(false);

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

  const handleContactUs = async () => {
    // Pre-fills only app version and platform — no user identifiers beyond
    // whatever the user chooses to write themselves.
    const url = getSupportEmailUrl(
      Constants.expoConfig?.version || 'unknown',
      Platform.OS
    );
    try {
      await Linking.openURL(url);
    } catch (error) {
      logger.error('Error opening support email:', error);
      Alert.alert(t('common.error'), t('settings.contactFailed', { email: SUPPORT_EMAIL }));
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
        <Animated.View entering={FadeInUp.duration(400).delay(50)}>
          <ProfileCard />
        </Animated.View>

        {/* Notifications */}
        <Animated.View entering={FadeInUp.duration(400).delay(150)}>
          <Text style={styles.sectionTitle}>{t('settings.notifications')}</Text>
          <View style={styles.section}>
            <TouchableOpacity style={styles.row} onPress={() => setShowTimePicker(true)}>
              <Text style={styles.rowLabel}>{t('settings.dailyPromptTime')}</Text>
              <View style={styles.rowRight}>
                <Text style={styles.rowValue}>{getTimeDisplay(currentTime)}</Text>
                <Icon name="caret-right" size="sm" color={colors.text.muted} />
              </View>
            </TouchableOpacity>
            <TouchableOpacity style={styles.row} onPress={() => setShowFrequencyPicker(true)}>
              <Text style={styles.rowLabel}>{t('settings.promptFrequency')}</Text>
              <View style={styles.rowRight}>
                <Text style={styles.rowValue}>{getFrequencyDisplay(currentFrequency)}</Text>
                <Icon name="caret-right" size="sm" color={colors.text.muted} />
              </View>
            </TouchableOpacity>
            <View style={styles.rowToggle}>
              <Text style={styles.rowLabel}>{t('settings.remindMe')}</Text>
              <Switch
                value={remindMe}
                onValueChange={handleToggleRemind}
                trackColor={{ false: colors.border.default, true: colors.accent.primary }}
                thumbColor={colors.surface.card}
              />
            </View>
            <View style={styles.rowToggle}>
              <Text style={styles.rowLabel}>{t('settings.notifyPartner')}</Text>
              <Switch
                value={partnerNotify}
                onValueChange={handleTogglePartnerNotify}
                trackColor={{ false: colors.border.default, true: colors.accent.primary }}
                thumbColor={colors.surface.card}
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
                trackColor={{ false: colors.border.default, true: colors.accent.primary }}
                thumbColor={colors.surface.card}
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
        {FEATURES.resources && (
          <Animated.View entering={FadeInUp.duration(400).delay(220)}>
            <Text style={styles.sectionTitle}>{t('settings.resources')}</Text>
            <View style={styles.section}>
              <TouchableOpacity
                style={[styles.row, styles.lastRow]}
                onPress={() => router.push('/(app)/resources')}
              >
                <Text style={styles.rowLabel}>{t('settings.findSupport')}</Text>
                <Icon name="caret-right" size="sm" color={colors.text.muted} />
              </TouchableOpacity>
            </View>
          </Animated.View>
        )}

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
                <ActivityIndicator size="small" color={colors.accent.primary} />
              ) : (
                <Icon name="caret-right" size="sm" color={colors.text.muted} />
              )}
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.row}
              onPress={() => setShowAnonymizeModal(true)}
            >
              <Text style={styles.rowLabel}>{t('settings.anonymize')}</Text>
              <Icon name="caret-right" size="sm" color={colors.text.muted} />
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.row}
              onPress={() => router.push('/(app)/privacy-policy')}
            >
              <Text style={styles.rowLabel}>{t('settings.privacyPolicy')}</Text>
              <Icon name="caret-right" size="sm" color={colors.text.muted} />
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.row}
              onPress={() => router.push('/(app)/terms-of-service' as any)}
            >
              <Text style={styles.rowLabel}>{t('settings.termsOfService')}</Text>
              <Icon name="caret-right" size="sm" color={colors.text.muted} />
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.row, styles.lastRow]}
              onPress={() => {
                if (isPremium) {
                  Alert.alert(
                    t('settings.subscriptionWarning'),
                    t('settings.subscriptionWarningBody'),
                    [
                      {
                        text: t('settings.manageSubscription'),
                        onPress: () => Linking.openURL('https://apps.apple.com/account/subscriptions'),
                      },
                      {
                        text: t('settings.continueDelete'),
                        style: 'destructive',
                        onPress: () => setShowReauthModal(true),
                      },
                      { text: t('common.cancel'), style: 'cancel' },
                    ],
                  );
                } else {
                  setShowReauthModal(true);
                }
              }}
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
              <View style={styles.rowRight}>
                <Text style={[styles.rowValue, isPremium && styles.premiumText]}>
                  {isPremium ? t('settings.premium') : t('settings.free')}
                </Text>
                {!isPremium && (
                  <Icon name="caret-right" size="sm" color={colors.text.muted} />
                )}
              </View>
            </TouchableOpacity>
            {isBiometricAvailable && (
              <View style={styles.rowToggle}>
                <Text style={styles.rowLabel}>{biometricType}</Text>
                <Switch
                  value={isBiometricEnabled}
                  onValueChange={async (value) => {
                    if (value) {
                      await enableBiometric();
                    } else {
                      await disableBiometric();
                    }
                  }}
                  trackColor={{ false: colors.border.default, true: colors.accent.primary }}
                  thumbColor={colors.surface.card}
                />
              </View>
            )}
            <View style={styles.row}>
              <Text style={styles.rowLabel}>{t('settings.version')}</Text>
              <Text style={styles.rowValue}>{Constants.expoConfig?.version || '1.0.0'}</Text>
            </View>
            <TouchableOpacity style={styles.row} onPress={handleContactUs}>
              <Text style={styles.rowLabel}>{t('settings.contactUs')}</Text>
              <Icon name="caret-right" size="sm" color={colors.text.muted} />
            </TouchableOpacity>
            <TouchableOpacity style={[styles.row, styles.lastRow]} onPress={handleSignOut}>
              <Text style={styles.rowLabel}>{t('settings.signOut')}</Text>
              <Icon name="caret-right" size="sm" color={colors.text.muted} />
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
              <Text style={styles.modalCloseText}>{t('common.cancel')}</Text>
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
              <Text style={styles.modalCloseText}>{t('common.cancel')}</Text>
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
              placeholderTextColor={colors.text.secondary}
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
                <ActivityIndicator size="small" color={colors.text.inverse} />
              ) : (
                <Text style={styles.deleteButtonText} maxFontSizeMultiplier={1.4}>{t('settings.deleteButton')}</Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.modalClose}
              onPress={() => {
                setShowDeleteModal(false);
                setDeleteConfirmText('');
              }}
            >
              <Text style={styles.modalCloseText}>{t('common.cancel')}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Re-auth Modal */}
      <ReauthModal
        visible={showReauthModal}
        onSuccess={() => {
          setShowReauthModal(false);
          setShowDeleteModal(true);
        }}
        onCancel={() => setShowReauthModal(false)}
      />

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
                <ActivityIndicator size="small" color={colors.text.inverse} />
              ) : (
                <Text style={styles.deleteButtonText} maxFontSizeMultiplier={1.4}>{t('settings.anonymizeButton')}</Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.modalClose}
              onPress={() => setShowAnonymizeModal(false)}
            >
              <Text style={styles.modalCloseText}>{t('common.cancel')}</Text>
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
    backgroundColor: colors.surface.background,
  },
  header: {
    paddingHorizontal: spacing.screen,
    paddingTop: spacing.xl,
    paddingBottom: spacing.md,
  },
  title: {
    ...typography.display,
    color: colors.text.primary,
  },
  scrollView: {
    flex: 1,
    paddingHorizontal: spacing.md,
  },
  // Section headers — eyebrow caps
  sectionTitle: {
    ...typography.eyebrow,
    color: colors.text.secondary,
    marginTop: spacing.lg,
    marginBottom: spacing.sm,
    marginLeft: spacing.xs,
  },
  section: {
    backgroundColor: colors.surface.card,
    borderRadius: radius.card,
    overflow: 'hidden',
    ...shadow.cardSubtle,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border.default,
  },
  rowToggle: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.smd,
    borderBottomWidth: 1,
    borderBottomColor: colors.border.default,
  },
  lastRow: {
    borderBottomWidth: 0,
  },
  rowLabel: {
    ...typography.body,
    color: colors.text.primary,
  },
  rowValue: {
    ...typography.body,
    color: colors.text.secondary,
  },
  rowRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  premiumText: {
    color: colors.accent.primary,
  },
  dangerText: {
    ...typography.body,
    color: colors.semantic.destructive,
  },
  safety: {
    backgroundColor: colors.surface.card,
    borderRadius: radius.card,
    borderWidth: 1.5,
    borderColor: colors.border.default,
    padding: spacing.md,
    marginTop: spacing.xl,
    marginBottom: spacing.xxl,
  },
  safetyText: {
    ...typography.bodySm,
    color: colors.text.secondary,
  },
  safetyLink: {
    ...typography.bodySm,
    color: colors.accent.primary,
    marginTop: spacing.sm,
  },
  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: colors.surface.card,
    borderTopLeftRadius: radius.hero,
    borderTopRightRadius: radius.hero,
    padding: spacing.lg,
    paddingBottom: spacing.xl,
  },
  modalTitle: {
    ...typography.heading,
    color: colors.text.primary,
    marginBottom: spacing.xs,
  },
  modalSubtitle: {
    ...typography.bodySm,
    color: colors.text.secondary,
    marginBottom: spacing.cardPad,
  },
  timeOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    borderRadius: radius.choice,
    borderWidth: 1.5,
    borderColor: 'transparent',
    marginBottom: spacing.sm,
    backgroundColor: colors.surface.background,
  },
  timeOptionActive: {
    backgroundColor: colors.accent.primaryLight,
    borderColor: colors.accent.primary,
  },
  radio: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: colors.text.muted,
    marginRight: spacing.smd,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioActive: {
    borderColor: colors.accent.primary,
  },
  radioInner: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: colors.accent.primary,
  },
  timeOptionText: {
    ...typography.body,
    color: colors.text.secondary,
  },
  timeOptionTextActive: {
    color: colors.accent.primary,
  },
  frequencyDescription: {
    ...typography.caption,
    color: colors.text.secondary,
    marginTop: 2,
  },
  modalClose: {
    marginTop: spacing.sm,
    paddingVertical: spacing.md,
    alignItems: 'center',
  },
  modalCloseText: {
    ...typography.body,
    color: colors.text.secondary,
  },
  deleteModalBody: {
    ...typography.body,
    color: colors.text.secondary,
    marginBottom: spacing.cardPad,
  },
  deleteModalLabel: {
    ...typography.eyebrow,
    color: colors.text.secondary,
    marginBottom: spacing.sm,
  },
  deleteInput: {
    borderWidth: 1.5,
    borderColor: colors.border.default,
    borderRadius: radius.input,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.smd,
    ...typography.body,
    color: colors.text.primary,
    marginBottom: spacing.md,
  },
  deleteButton: {
    backgroundColor: colors.semantic.destructive,
    borderRadius: radius.pill,
    paddingVertical: spacing.md,
    alignItems: 'center',
  },
  deleteButtonDisabled: {
    opacity: 0.45,
  },
  deleteButtonText: {
    ...typography.btn,
    color: colors.text.inverse,
  },
  anonymizeButton: {
    backgroundColor: colors.accent.primary,
    borderRadius: radius.pill,
    paddingVertical: spacing.md,
    alignItems: 'center',
  },
});
