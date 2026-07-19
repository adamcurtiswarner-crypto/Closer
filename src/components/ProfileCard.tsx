import React, { useState } from 'react';
import {
  View,
  Text,
  Image,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
} from 'react-native';
import Animated, { FadeIn, FadeInUp } from 'react-native-reanimated';
import { useRouter } from 'expo-router';
import { hapticImpact, hapticNotification, ImpactFeedbackStyle, NotificationFeedbackType } from '@utils/haptics';
import { format } from 'date-fns';
import { doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '@/config/firebase';
import { useAuth } from '@/hooks/useAuth';
import { useCouple, useUpdateAnniversaryDate } from '@/hooks/useCouple';
import { usePartnerName } from '@/hooks/usePartnerName';
import { usePartnerLoveLanguage } from '@/hooks/usePartnerLoveLanguage';
import {
  pickImage,
  showPhotoAccessDeniedAlert,
  uploadProfilePhoto,
  uploadPartnerPhoto,
} from '@/services/imageUpload';
import { getLoveLanguageDisplay } from '@/config/loveLanguages';
import { FEATURES } from '@/config/features';
import { firstGrapheme, getInitials } from '@/utils/initials';
import { logEvent } from '@/services/analytics';
import { useTranslation } from 'react-i18next';
import { logger } from '@/utils/logger';
import { Icon } from './Icon';
import { LoveLanguageModal } from './LoveLanguageModal';
import { AnniversaryPicker } from './AnniversaryPicker';

import { colors, spacing, typography } from '@/config/theme';

export function ProfileCard() {
  const { t } = useTranslation();
  const router = useRouter();
  const { user, refreshUser } = useAuth();
  const { data: couple } = useCouple();
  const updateAnniversary = useUpdateAnniversaryDate();

  const [displayName, setDisplayName] = useState(user?.displayName || '');
  const [partnerName, setPartnerName] = useState(user?.partnerName || '');
  const [editingPartnerName, setEditingPartnerName] = useState(false);
  const [uploadingUser, setUploadingUser] = useState(false);
  const [uploadingPartner, setUploadingPartner] = useState(false);
  const [savingName, setSavingName] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date>(couple?.anniversaryDate || new Date());
  const [showLoveLanguageModal, setShowLoveLanguageModal] = useState(false);
  const [savingLoveLanguage, setSavingLoveLanguage] = useState(false);

  // What the partner row DISPLAYS. The row edits the pet-name override
  // (users.partner_name), but the name shown must resolve the same way as
  // everywhere else: partner display_name > pet name > fallback.
  const { name: resolvedPartnerName, isFallback: partnerNameIsFallback } = usePartnerName();
  const partnerInitial = partnerNameIsFallback ? null : firstGrapheme(resolvedPartnerName);

  // Partner's love language — shared cache with the Us view.
  const { data: partnerLoveLanguage } = usePartnerLoveLanguage();

  if (!user) return null;

  const handleAnniversarySave = async (date: Date) => {
    try {
      await updateAnniversary.mutateAsync(date);
      hapticNotification(NotificationFeedbackType.Success);
      logEvent('anniversary_date_set');
    } catch (error) {
      logger.error('Error saving anniversary date:', error);
      Alert.alert(t('common.error'), t('profile.couldNotSaveAnniversary'));
    }
    setShowDatePicker(false);
  };

  const handleSaveLoveLanguage = async (value: string) => {
    setSavingLoveLanguage(true);
    try {
      const userRef = doc(db, 'users', user.id);
      await updateDoc(userRef, {
        love_language: value,
        updated_at: serverTimestamp(),
      });
      await refreshUser();
      hapticNotification(NotificationFeedbackType.Success);
      logEvent('love_language_set', { value });
    } catch (error) {
      logger.error('Error saving love language:', error);
      Alert.alert(t('common.error'), t('profile.couldNotSaveLoveLanguage'));
    } finally {
      setSavingLoveLanguage(false);
      setShowLoveLanguageModal(false);
    }
  };

  const handlePickUserPhoto = async () => {
    const picked = await pickImage();
    if (!picked) return; // user cancelled — say nothing
    if ('denied' in picked) {
      showPhotoAccessDeniedAlert(t);
      return;
    }

    setUploadingUser(true);
    hapticImpact(ImpactFeedbackStyle.Light);
    try {
      const downloadUrl = await uploadProfilePhoto(user.id, picked.uri);
      const userRef = doc(db, 'users', user.id);
      await updateDoc(userRef, {
        photo_url: downloadUrl,
        updated_at: serverTimestamp(),
      });
      await refreshUser();
      logEvent('profile_photo_uploaded', { type: 'user' });
    } catch (error) {
      // The storage error code goes into the message string because the
      // logger's production path only captures the first argument — this is
      // how telemetry tells a rules denial from a network drop.
      const code = (error as { code?: string }).code ?? 'unknown';
      logger.error(`Error uploading profile photo (code: ${code}):`, error);
      Alert.alert(t('profile.uploadFailed'), t('profile.couldNotUpload'));
    } finally {
      setUploadingUser(false);
    }
  };

  const handlePickPartnerPhoto = async () => {
    if (!user.coupleId) return;

    const picked = await pickImage();
    if (!picked) return; // user cancelled — say nothing
    if ('denied' in picked) {
      showPhotoAccessDeniedAlert(t);
      return;
    }

    setUploadingPartner(true);
    hapticImpact(ImpactFeedbackStyle.Light);
    try {
      const downloadUrl = await uploadPartnerPhoto(user.coupleId, user.id, picked.uri);
      const userRef = doc(db, 'users', user.id);
      await updateDoc(userRef, {
        partner_photo_url: downloadUrl,
        updated_at: serverTimestamp(),
      });
      await refreshUser();
      logEvent('profile_photo_uploaded', { type: 'partner' });
    } catch (error) {
      const code = (error as { code?: string }).code ?? 'unknown';
      logger.error(`Error uploading partner photo (code: ${code}):`, error);
      Alert.alert(t('profile.uploadFailed'), t('profile.couldNotUpload'));
    } finally {
      setUploadingPartner(false);
    }
  };

  const handleSaveDisplayName = async () => {
    const trimmed = displayName.trim();
    if (trimmed === (user.displayName || '')) return;
    setSavingName(true);
    try {
      const userRef = doc(db, 'users', user.id);
      await updateDoc(userRef, {
        display_name: trimmed || null,
        updated_at: serverTimestamp(),
      });
      await refreshUser();
      logEvent('profile_updated', { field: 'display_name' });
    } catch (error) {
      logger.error('Error updating display name:', error);
    } finally {
      setSavingName(false);
    }
  };

  const handleSavePartnerName = async () => {
    const trimmed = partnerName.trim();
    if (trimmed === (user.partnerName || '')) return;
    setSavingName(true);
    try {
      const userRef = doc(db, 'users', user.id);
      // partner_name is a pet-name override: in usePartnerName's precedence it
      // ranks below the partner's own display_name and above the generic fallback.
      await updateDoc(userRef, {
        partner_name: trimmed || null,
        updated_at: serverTimestamp(),
      });
      await refreshUser();
      logEvent('profile_updated', { field: 'partner_name' });
    } catch (error) {
      logger.error('Error updating partner name:', error);
    } finally {
      setSavingName(false);
    }
  };

  return (
    <View style={styles.card}>

      {/* You */}
      <Animated.View entering={FadeIn.duration(400)} style={styles.profileRow}>
        <TouchableOpacity
          style={styles.avatarContainer}
          onPress={handlePickUserPhoto}
          disabled={uploadingUser}
          activeOpacity={0.8}
        >
          {user.photoUrl ? (
            <Image source={{ uri: user.photoUrl }} style={styles.avatar} />
          ) : (
            <View style={[styles.avatar, styles.avatarYou]}>
              <Text style={styles.avatarText}>{getInitials(user.displayName)}</Text>
            </View>
          )}
          {uploadingUser ? (
            <View style={styles.cameraOverlay}>
              <ActivityIndicator color={colors.text.inverse} size="small" />
            </View>
          ) : (
            <View style={styles.cameraOverlay}>
              <Icon name="camera" size="xs" color={colors.text.inverse} weight="fill" />
            </View>
          )}
        </TouchableOpacity>

        <View style={styles.profileInfo}>
          <Text style={styles.profileLabel}>{t('profile.yourName')}</Text>
          <TextInput
            style={styles.nameInput}
            value={displayName}
            onChangeText={setDisplayName}
            onBlur={handleSaveDisplayName}
            placeholder={t('profile.yourNamePlaceholder')}
            placeholderTextColor={colors.text.secondary}
            maxLength={30}
            returnKeyType="done"
          />
          <Text style={styles.emailText}>{user.email}</Text>
        </View>
      </Animated.View>

      {/* Divider */}
      <View style={styles.divider} />

      {/* Partner */}
      <Animated.View entering={FadeInUp.duration(400).delay(100)} style={styles.profileRow}>
        <TouchableOpacity
          style={styles.avatarContainer}
          onPress={handlePickPartnerPhoto}
          disabled={uploadingPartner || !user.coupleId}
          activeOpacity={0.8}
        >
          {user.partnerPhotoUrl ? (
            <Image source={{ uri: user.partnerPhotoUrl }} style={styles.avatar} />
          ) : (
            <View style={[styles.avatar, styles.avatarPartner]}>
              {partnerInitial ? (
                <Text style={styles.avatarText}>{partnerInitial}</Text>
              ) : (
                // No real name yet — a neutral glyph, never a "?".
                <View testID="partner-avatar-fallback">
                  <Icon name="heart" size="sm" color={colors.text.inverse} weight="fill" />
                </View>
              )}
            </View>
          )}
          {uploadingPartner ? (
            <View style={styles.cameraOverlay}>
              <ActivityIndicator color={colors.text.inverse} size="small" />
            </View>
          ) : (
            <View style={styles.cameraOverlay}>
              <Icon name="camera" size="xs" color={colors.text.inverse} weight="fill" />
            </View>
          )}
        </TouchableOpacity>

        <View style={styles.profileInfo}>
          <Text style={styles.profileLabel}>{t('profile.partner')}</Text>
          {editingPartnerName ? (
            // The editor writes the pet-name override (users.partner_name) —
            // it never touches the partner's own display_name.
            <TextInput
              style={styles.nameInput}
              value={partnerName}
              onChangeText={setPartnerName}
              onBlur={() => {
                setEditingPartnerName(false);
                void handleSavePartnerName();
              }}
              placeholder={t('profile.partnerNicknamePlaceholder')}
              placeholderTextColor={colors.text.secondary}
              maxLength={30}
              returnKeyType="done"
              autoFocus
            />
          ) : (
            <TouchableOpacity
              accessibilityRole="button"
              disabled={!user.coupleId}
              activeOpacity={0.7}
              onPress={() => {
                setPartnerName(user.partnerName || '');
                setEditingPartnerName(true);
              }}
            >
              <Text
                style={[styles.nameInput, partnerNameIsFallback && styles.namePlaceholder]}
              >
                {partnerNameIsFallback ? t('profile.addPartnerName') : resolvedPartnerName}
              </Text>
            </TouchableOpacity>
          )}
          {!user.coupleId && (
            <Text style={styles.hintText}>{t('profile.linkWithPartner')}</Text>
          )}
        </View>
      </Animated.View>

      {/* Us — the couple view (alignment map over your scored answers) */}
      {FEATURES.usView && user.coupleId && (
        <>
          <View style={styles.divider} />
          <Animated.View entering={FadeInUp.duration(400).delay(150)}>
            <TouchableOpacity
              style={styles.anniversaryRow}
              onPress={() => {
                logEvent('us_view_opened', { source: 'settings' });
                router.push('/(app)/us');
              }}
              activeOpacity={0.7}
              accessibilityRole="button"
              testID="profile-us-row"
            >
              <Icon name="users" size="md" color={colors.accent.primary} />
              <View style={styles.anniversaryInfo}>
                <Text style={styles.anniversaryLabel}>{t('us.entryLabel')}</Text>
                <Text style={styles.anniversaryValue}>{t('us.entryValue')}</Text>
              </View>
              <Icon name="caret-right" size="sm" color={colors.text.muted} />
            </TouchableOpacity>
          </Animated.View>
        </>
      )}

      {/* Anniversary */}
      {user.coupleId && (
        <>
          <View style={styles.divider} />
          <Animated.View entering={FadeInUp.duration(400).delay(200)}>
            <TouchableOpacity
              style={styles.anniversaryRow}
              onPress={() => {
                setSelectedDate(couple?.anniversaryDate || new Date());
                setShowDatePicker(true);
              }}
              activeOpacity={0.7}
            >
              <Icon name="calendar" size="md" color={colors.accent.primary} />
              <View style={styles.anniversaryInfo}>
                <Text style={styles.anniversaryLabel}>{t('profile.anniversary')}</Text>
                <Text style={styles.anniversaryValue}>
                  {couple?.anniversaryDate
                    ? format(couple.anniversaryDate, 'MMM d, yyyy')
                    : t('profile.setYourDate')}
                </Text>
              </View>
              <Icon name="caret-right" size="sm" color={colors.text.muted} />
            </TouchableOpacity>
          </Animated.View>
        </>
      )}

      {/* Love Language */}
      <View style={styles.divider} />
      <Animated.View entering={FadeInUp.duration(400).delay(300)}>
        <TouchableOpacity
          style={styles.anniversaryRow}
          onPress={() => setShowLoveLanguageModal(true)}
          activeOpacity={0.7}
        >
          <Icon name="heart" size="md" color={colors.accent.primary} weight="fill" />
          <View style={styles.anniversaryInfo}>
            <Text style={styles.anniversaryLabel}>{t('profile.yourLoveLanguage')}</Text>
            <Text style={styles.anniversaryValue}>
              {user.loveLanguage
                ? getLoveLanguageDisplay(user.loveLanguage)?.label || t('common.setYours')
                : t('common.setYours')}
            </Text>
          </View>
          <Icon name="caret-right" size="sm" color={colors.text.muted} />
        </TouchableOpacity>

        {/* Partner's love language — informational only, no press affordance
            or chevron. Key lives in settings.* because ProfileCard renders
            only inside the settings screen (namespace ownership). */}
        {user.coupleId && (
          <View style={styles.partnerLangRow}>
            {partnerLoveLanguage ? (
              <>
                <Text style={styles.partnerLangLabel}>
                  {user.partnerName ? `${user.partnerName}'s` : "Partner's"}
                </Text>
                <Text style={styles.partnerLangValue}>
                  {getLoveLanguageDisplay(partnerLoveLanguage)?.label || ''}
                </Text>
              </>
            ) : (
              <Text style={styles.partnerLangValue}>
                {t('settings.partnerLoveLanguageNotSet')}
              </Text>
            )}
          </View>
        )}
      </Animated.View>

      {/* Love Language Modal */}
      <LoveLanguageModal
        visible={showLoveLanguageModal}
        currentValue={user.loveLanguage}
        saving={savingLoveLanguage}
        onSelect={handleSaveLoveLanguage}
        onClose={() => setShowLoveLanguageModal(false)}
        title={t('profile.loveLanguageTitle')}
        subtitle={t('profile.loveLanguageSubtitle')}
        cancelLabel={t('common.cancel')}
      />

      {/* Date Picker */}
      <AnniversaryPicker
        visible={showDatePicker}
        selectedDate={selectedDate}
        onDateChange={setSelectedDate}
        onSave={handleAnniversarySave}
        onClose={() => setShowDatePicker(false)}
        saving={updateAnniversary.isPending}
        title={t('profile.anniversaryTitle')}
        subtitle={t('profile.anniversarySubtitle')}
        cancelLabel={t('common.cancel')}
        saveLabel={t('common.save')}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface.card,
    borderRadius: 20,
    padding: spacing.lg,
    paddingTop: spacing.cardPad,
    overflow: 'hidden',
    shadowColor: colors.text.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 2,
    marginBottom: spacing.sm,
  },
  profileRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  avatarContainer: {
    position: 'relative',
  },
  avatar: {
    width: 72,
    height: 72,
    borderRadius: 36,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarYou: {
    backgroundColor: colors.accent.primary,
  },
  avatarPartner: {
    backgroundColor: colors.brand.purple,
  },
  avatarText: {
    color: colors.text.inverse,
    ...typography.display,
  },
  cameraOverlay: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(28, 25, 23, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: colors.surface.card,
  },
  cameraIcon: {
    ...typography.bodySm,
  },
  profileInfo: {
    flex: 1,
  },
  profileLabel: {
    ...typography.caption,
    color: colors.text.secondary,
    marginBottom: spacing.xs,
  },
  nameInput: {
    ...typography.h3,
    color: colors.text.primary,
    padding: 0,
    marginBottom: 2,
  },
  namePlaceholder: {
    color: colors.text.secondary,
  },
  emailText: {
    ...typography.bodySm,
    color: colors.text.secondary,
    marginTop: 2,
  },
  hintText: {
    ...typography.bodySm,
    color: colors.text.secondary,
    fontStyle: 'italic',
    marginTop: 2,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: colors.border.default,
    marginVertical: spacing.md,
  },
  anniversaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.smd,
  },
  anniversaryIcon: {
    ...typography.heading,
  },
  anniversaryInfo: {
    flex: 1,
  },
  anniversaryLabel: {
    ...typography.caption,
    color: colors.text.secondary,
    marginBottom: 2,
  },
  anniversaryValue: {
    ...typography.body,
    color: colors.text.primary,
  },
  anniversaryChevron: {
    ...typography.body,
    color: colors.text.secondary,
  },
  // Modal styles moved to LoveLanguageModal and AnniversaryPicker
  partnerLangRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: spacing.smd,
    paddingLeft: spacing.xl,
  },
  partnerLangLabel: {
    ...typography.caption,
    color: colors.text.secondary,
  },
  partnerLangValue: {
    ...typography.bodySm,
    color: colors.text.secondary,
  },
  // Love language modal styles moved to LoveLanguageModal
});
