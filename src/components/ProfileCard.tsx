import React, { useState } from 'react';
import {
  View,
  Text,
  Image,
  TextInput,
  TouchableOpacity,
  Modal,
  ScrollView,
  Platform,
  StyleSheet,
  ActivityIndicator,
  Alert,
} from 'react-native';
import Animated, { FadeIn, FadeInUp } from 'react-native-reanimated';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useQuery } from '@tanstack/react-query';
import * as Haptics from 'expo-haptics';
import { format } from 'date-fns';
import { doc, getDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '@/config/firebase';
import { useAuth } from '@/hooks/useAuth';
import { useCouple, useUpdateAnniversaryDate } from '@/hooks/useCouple';
import { pickImage, uploadProfilePhoto, uploadPartnerPhoto } from '@/services/imageUpload';
import { LOVE_LANGUAGES, getLoveLanguageDisplay } from '@/config/loveLanguages';
import { logEvent } from '@/services/analytics';
import { logger } from '@/utils/logger';

function getInitials(name: string | null): string {
  if (!name) return '?';
  return name.charAt(0).toUpperCase();
}

export function ProfileCard() {
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
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      logEvent('anniversary_date_set');
    } catch (error) {
      logger.error('Error saving anniversary date:', error);
      Alert.alert('Error', 'Could not save anniversary date.');
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
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      logEvent('love_language_set', { value });
    } catch (error) {
      logger.error('Error saving love language:', error);
      Alert.alert('Error', 'Could not save love language.');
    } finally {
      setSavingLoveLanguage(false);
      setShowLoveLanguageModal(false);
    }
  };

  const handlePickUserPhoto = async () => {
    const uri = await pickImage();
    if (!uri) return;

    setUploadingUser(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
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
      Alert.alert('Upload failed', 'Could not upload your photo. Please try again.');
    } finally {
      setUploadingUser(false);
    }
  };

  const handlePickPartnerPhoto = async () => {
    if (!user.coupleId) return;

    const uri = await pickImage();
    if (!uri) return;

    setUploadingPartner(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
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
      Alert.alert('Upload failed', 'Could not upload the photo. Please try again.');
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
              <Text style={styles.cameraIcon}>{'\uD83D\uDCF7'}</Text>
            </View>
          )}
        </TouchableOpacity>

        <View style={styles.profileInfo}>
          <Text style={styles.profileLabel}>YOUR NAME</Text>
          <TextInput
            style={styles.nameInput}
            value={displayName}
            onChangeText={setDisplayName}
            onBlur={handleSaveDisplayName}
            placeholder="Your name"
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
              <Text style={styles.cameraIcon}>{'\uD83D\uDCF7'}</Text>
            </View>
          )}
        </TouchableOpacity>

        <View style={styles.profileInfo}>
          <Text style={styles.profileLabel}>PARTNER</Text>
          <TextInput
            style={styles.nameInput}
            value={partnerName}
            onChangeText={setPartnerName}
            onBlur={handleSavePartnerName}
            placeholder="Partner's name"
            placeholderTextColor="#a8a29e"
            maxLength={30}
            returnKeyType="done"
            editable={!!user.coupleId}
          />
          {!user.coupleId && (
            <Text style={styles.hintText}>Link with a partner to edit</Text>
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
              <Text style={styles.anniversaryIcon}>{'\uD83D\uDCC5'}</Text>
              <View style={styles.anniversaryInfo}>
                <Text style={styles.anniversaryLabel}>Anniversary</Text>
                <Text style={styles.anniversaryValue}>
                  {couple?.anniversaryDate
                    ? format(couple.anniversaryDate, 'MMM d, yyyy')
                    : 'Set your date'}
                </Text>
              </View>
              <Text style={styles.anniversaryChevron}>{'>'}</Text>
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
          <Text style={styles.anniversaryIcon}>{'\u2764\uFE0F'}</Text>
          <View style={styles.anniversaryInfo}>
            <Text style={styles.anniversaryLabel}>YOUR LOVE LANGUAGE</Text>
            <Text style={styles.anniversaryValue}>
              {user.loveLanguage
                ? getLoveLanguageDisplay(user.loveLanguage)?.label || 'Set yours'
                : 'Set yours'}
            </Text>
          </View>
          <Text style={styles.anniversaryChevron}>{'>'}</Text>
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
                : 'Not set yet'}
            </Text>
          </View>
        )}
      </Animated.View>

      {/* Love Language Modal */}
      <Modal
        visible={showLoveLanguageModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowLoveLanguageModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Your Love Language</Text>
            <Text style={styles.modalSubtitle}>How do you most feel loved?</Text>
            <ScrollView style={styles.langList} showsVerticalScrollIndicator={false}>
              {LOVE_LANGUAGES.map((lang) => {
                const isActive = user.loveLanguage === lang.value;
                return (
                  <TouchableOpacity
                    key={lang.value}
                    style={[styles.langOption, isActive && styles.langOptionActive]}
                    onPress={() => handleSaveLoveLanguage(lang.value)}
                    disabled={savingLoveLanguage}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.langOptionIcon}>{lang.icon}</Text>
                    <View style={styles.langOptionInfo}>
                      <Text style={[styles.langOptionLabel, isActive && styles.langOptionLabelActive]}>
                        {lang.label}
                      </Text>
                      <Text style={[styles.langOptionDesc, isActive && styles.langOptionDescActive]}>
                        {lang.description}
                      </Text>
                    </View>
                    {isActive && <View style={styles.langCheck}><Text style={styles.langCheckText}>{'\u2713'}</Text></View>}
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
            <TouchableOpacity
              style={styles.modalCancelFull}
              onPress={() => setShowLoveLanguageModal(false)}
            >
              <Text style={styles.modalCancelText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Date Picker Modal */}
      {Platform.OS === 'ios' ? (
        <Modal
          visible={showDatePicker}
          transparent
          animationType="slide"
          onRequestClose={() => setShowDatePicker(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <Text style={styles.modalTitle}>Anniversary Date</Text>
              <Text style={styles.modalSubtitle}>When did your relationship begin?</Text>
              <DateTimePicker
                value={selectedDate}
                mode="date"
                display="spinner"
                maximumDate={new Date()}
                onChange={(_, date) => { if (date) setSelectedDate(date); }}
                style={styles.datePicker}
              />
              <View style={styles.modalButtons}>
                <TouchableOpacity
                  style={styles.modalCancel}
                  onPress={() => setShowDatePicker(false)}
                >
                  <Text style={styles.modalCancelText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.modalSave}
                  onPress={() => handleAnniversarySave(selectedDate)}
                  disabled={updateAnniversary.isPending}
                >
                  {updateAnniversary.isPending ? (
                    <ActivityIndicator color="#ffffff" size="small" />
                  ) : (
                    <Text style={styles.modalSaveText}>Save</Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      ) : (
        showDatePicker && (
          <DateTimePicker
            value={selectedDate}
            mode="date"
            maximumDate={new Date()}
            onChange={(_, date) => {
              setShowDatePicker(false);
              if (date) handleAnniversarySave(date);
            }}
          />
        )
      )}
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
    backgroundColor: '#8b7355',
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
    fontWeight: '700',
    color: '#a8a29e',
    letterSpacing: 0.8,
    marginBottom: 4,
  },
  nameInput: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1c1917',
    padding: 0,
    marginBottom: 2,
  },
  emailText: {
    fontSize: 13,
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
    color: '#1c1917',
    marginBottom: 4,
  },
  modalSubtitle: {
    fontSize: 14,
    color: '#78716c',
    marginBottom: 16,
  },
  datePicker: {
    height: 200,
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 16,
  },
  modalCancel: {
    flex: 1,
    paddingVertical: 14,
    alignItems: 'center',
    borderRadius: 12,
    backgroundColor: '#f5f5f4',
  },
  modalCancelText: {
    fontSize: 16,
    color: '#78716c',
    fontWeight: '500',
  },
  modalSave: {
    flex: 1,
    paddingVertical: 14,
    alignItems: 'center',
    borderRadius: 12,
    backgroundColor: '#c97454',
  },
  modalSaveText: {
    fontSize: 16,
    color: '#ffffff',
    fontWeight: '600',
  },
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
  langList: {
    maxHeight: 340,
  },
  langOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 12,
    marginBottom: 8,
    backgroundColor: '#fafaf9',
    gap: 12,
  },
  langOptionActive: {
    backgroundColor: '#fef7f4',
    borderWidth: 1,
    borderColor: '#e9b8a3',
  },
  langOptionIcon: {
    fontSize: 24,
  },
  langOptionInfo: {
    flex: 1,
  },
  langOptionLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1c1917',
  },
  langOptionLabelActive: {
    color: '#c97454',
  },
  langOptionDesc: {
    fontSize: 12,
    color: '#78716c',
    marginTop: 2,
  },
  langOptionDescActive: {
    color: '#c97454',
  },
  langCheck: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#c97454',
    justifyContent: 'center',
    alignItems: 'center',
  },
  langCheckText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '700',
  },
  modalCancelFull: {
    marginTop: 8,
    paddingVertical: 14,
    alignItems: 'center',
  },
});
