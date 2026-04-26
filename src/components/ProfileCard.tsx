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
import { useQuery } from '@tanstack/react-query';
import { hapticImpact, hapticNotification, ImpactFeedbackStyle, NotificationFeedbackType } from '@utils/haptics';
import { format } from 'date-fns';
import { doc, getDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '@/config/firebase';
import { useAuth } from '@/hooks/useAuth';
import { useCouple, useUpdateAnniversaryDate } from '@/hooks/useCouple';
import { pickImage, uploadProfilePhoto, uploadPartnerPhoto } from '@/services/imageUpload';
import { getLoveLanguageDisplay } from '@/config/loveLanguages';
import { logEvent } from '@/services/analytics';
import { useTranslation } from 'react-i18next';
import { logger } from '@/utils/logger';
import { Icon } from './Icon';
import { LoveLanguageModal } from './LoveLanguageModal';
import { AnniversaryPicker } from './AnniversaryPicker';

function getInitials(name: string | null): string {
  if (!name) return '?';
  return name.charAt(0).toUpperCase();
}

export function ProfileCard() {
  const { t } = useTranslation();
  const { user, refreshUser } = useAuth();
  const { data: couple } = useCouple();
  const updateAnniversary = useUpdateAnniversaryDate();

  const [displayName, setDisplayName] = useState(user?.displayName || '');
  const [partnerName, setPartnerName] = useState(user?.partnerName || '');
  const [uploadingUser, setUploadingUser] = useState(false);
  const [uploadingPartner, setUploadingPartner] = useState(false);
  const [savingName, setSavingName] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date>(couple?.anniversaryDate || new Date());
  const [showLoveLanguageModal, setShowLoveLanguageModal] = useState(false);
  const [savingLoveLanguage, setSavingLoveLanguage] = useState(false);

  // Fetch partner's love language
  const partnerId = couple?.memberIds?.find((id: string) => id !== user?.id) || null;
  const { data: partnerLoveLanguage } = useQuery({
    queryKey: ['partnerLoveLanguage', partnerId],
    queryFn: async () => {
      if (!partnerId) return null;
      const partnerSnap = await getDoc(doc(db, 'users', partnerId));
      return partnerSnap.exists() ? (partnerSnap.data().love_language || null) : null;
    },
    enabled: !!partnerId,
    staleTime: 5 * 60 * 1000,
  });

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
    const uri = await pickImage();
    if (!uri) return;

    setUploadingUser(true);
    hapticImpact(ImpactFeedbackStyle.Light);
    try {
      const downloadUrl = await uploadProfilePhoto(user.id, uri);
      const userRef = doc(db, 'users', user.id);
      await updateDoc(userRef, {
        photo_url: downloadUrl,
        updated_at: serverTimestamp(),
      });
      await refreshUser();
      logEvent('profile_photo_uploaded', { type: 'user' });
    } catch (error) {
      logger.error('Error uploading profile photo:', error);
      Alert.alert(t('profile.uploadFailed'), t('profile.couldNotUpload'));
    } finally {
      setUploadingUser(false);
    }
  };

  const handlePickPartnerPhoto = async () => {
    if (!user.coupleId) return;

    const uri = await pickImage();
    if (!uri) return;

    setUploadingPartner(true);
    hapticImpact(ImpactFeedbackStyle.Light);
    try {
      const downloadUrl = await uploadPartnerPhoto(user.coupleId, user.id, uri);
      const userRef = doc(db, 'users', user.id);
      await updateDoc(userRef, {
        partner_photo_url: downloadUrl,
        updated_at: serverTimestamp(),
      });
      await refreshUser();
      logEvent('profile_photo_uploaded', { type: 'partner' });
    } catch (error) {
      logger.error('Error uploading partner photo:', error);
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
      <View style={styles.accentBar} />

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
              <ActivityIndicator color="#ffffff" size="small" />
            </View>
          ) : (
            <View style={styles.cameraOverlay}>
              <Icon name="camera" size="xs" color="#ffffff" weight="fill" />
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
            placeholderTextColor="#a8a29e"
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
              <Text style={styles.avatarText}>{getInitials(user.partnerName)}</Text>
            </View>
          )}
          {uploadingPartner ? (
            <View style={styles.cameraOverlay}>
              <ActivityIndicator color="#ffffff" size="small" />
            </View>
          ) : (
            <View style={styles.cameraOverlay}>
              <Icon name="camera" size="xs" color="#ffffff" weight="fill" />
            </View>
          )}
        </TouchableOpacity>

        <View style={styles.profileInfo}>
          <Text style={styles.profileLabel}>{t('profile.partner')}</Text>
          <TextInput
            style={styles.nameInput}
            value={partnerName}
            onChangeText={setPartnerName}
            onBlur={handleSavePartnerName}
            placeholder={t('profile.partnerPlaceholder')}
            placeholderTextColor="#a8a29e"
            maxLength={30}
            returnKeyType="done"
            editable={!!user.coupleId}
          />
          {!user.coupleId && (
            <Text style={styles.hintText}>{t('profile.linkWithPartner')}</Text>
          )}
        </View>
      </Animated.View>

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
              <Icon name="calendar" size="md" color="#c97454" />
              <View style={styles.anniversaryInfo}>
                <Text style={styles.anniversaryLabel}>{t('profile.anniversary')}</Text>
                <Text style={styles.anniversaryValue}>
                  {couple?.anniversaryDate
                    ? format(couple.anniversaryDate, 'MMM d, yyyy')
                    : t('profile.setYourDate')}
                </Text>
              </View>
              <Icon name="caret-right" size="sm" color="#a8a29e" />
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
          <Icon name="heart" size="md" color="#c97454" weight="fill" />
          <View style={styles.anniversaryInfo}>
            <Text style={styles.anniversaryLabel}>{t('profile.yourLoveLanguage')}</Text>
            <Text style={styles.anniversaryValue}>
              {user.loveLanguage
                ? getLoveLanguageDisplay(user.loveLanguage)?.label || t('common.setYours')
                : t('common.setYours')}
            </Text>
          </View>
          <Icon name="caret-right" size="sm" color="#a8a29e" />
        </TouchableOpacity>

        {/* Partner's love language (read-only) */}
        {user.coupleId && (
          <View style={styles.partnerLangRow}>
            <Text style={styles.partnerLangLabel}>
              {user.partnerName ? `${user.partnerName}'s` : "Partner's"}
            </Text>
            <Text style={styles.partnerLangValue}>
              {partnerLoveLanguage
                ? (getLoveLanguageDisplay(partnerLoveLanguage)?.icon || '') + ' ' + (getLoveLanguageDisplay(partnerLoveLanguage)?.label || '')
                : t('common.notSetYet')}
            </Text>
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
    backgroundColor: '#ffffff',
    borderRadius: 20,
    padding: 24,
    paddingTop: 20,
    overflow: 'hidden',
    shadowColor: '#1c1917',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 2,
    marginBottom: 8,
  },
  accentBar: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 3,
    backgroundColor: '#c97454',
  },
  profileRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
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
    backgroundColor: '#c97454',
  },
  avatarPartner: {
    backgroundColor: '#490f5f',
  },
  avatarText: {
    color: '#ffffff',
    fontSize: 28,
    fontWeight: '700',
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
    borderColor: '#ffffff',
  },
  cameraIcon: {
    fontSize: 13,
  },
  profileInfo: {
    flex: 1,
  },
  profileLabel: {
    fontSize: 10,
    fontWeight: '500',
    fontFamily: 'Inter-Medium',
    color: '#a8a29e',
    letterSpacing: 0.8,
    marginBottom: 4,
  },
  nameInput: {
    fontSize: 18,
    fontWeight: '600',
    fontFamily: 'Inter-SemiBold',
    color: '#1c1917',
    padding: 0,
    marginBottom: 2,
  },
  emailText: {
    fontSize: 13,
    fontFamily: 'Inter-Regular',
    color: '#a8a29e',
    marginTop: 2,
  },
  hintText: {
    fontSize: 13,
    color: '#a8a29e',
    fontStyle: 'italic',
    marginTop: 2,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: '#e7e5e4',
    marginVertical: 18,
  },
  anniversaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  anniversaryIcon: {
    fontSize: 20,
  },
  anniversaryInfo: {
    flex: 1,
  },
  anniversaryLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: '#a8a29e',
    letterSpacing: 0.8,
    marginBottom: 2,
  },
  anniversaryValue: {
    fontSize: 16,
    fontWeight: '500',
    color: '#1c1917',
  },
  anniversaryChevron: {
    fontSize: 16,
    color: '#a8a29e',
  },
  // Modal styles moved to LoveLanguageModal and AnniversaryPicker
  partnerLangRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 12,
    paddingLeft: 32,
  },
  partnerLangLabel: {
    fontSize: 12,
    color: '#a8a29e',
    fontWeight: '500',
  },
  partnerLangValue: {
    fontSize: 13,
    color: '#57534e',
    fontWeight: '500',
  },
  // Love language modal styles moved to LoveLanguageModal
});
