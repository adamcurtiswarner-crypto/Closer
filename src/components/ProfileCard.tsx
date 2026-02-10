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
import * as Haptics from 'expo-haptics';
import { doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '@/config/firebase';
import { useAuth } from '@/hooks/useAuth';
import { pickImage, uploadProfilePhoto, uploadPartnerPhoto } from '@/services/imageUpload';
import { logEvent } from '@/services/analytics';
import { logger } from '@/utils/logger';

function getInitials(name: string | null): string {
  if (!name) return '?';
  return name.charAt(0).toUpperCase();
}

export function ProfileCard() {
  const { user, refreshUser } = useAuth();

  const [displayName, setDisplayName] = useState(user?.displayName || '');
  const [partnerName, setPartnerName] = useState(user?.partnerName || '');
  const [uploadingUser, setUploadingUser] = useState(false);
  const [uploadingPartner, setUploadingPartner] = useState(false);
  const [savingName, setSavingName] = useState(false);

  if (!user) return null;

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
});
