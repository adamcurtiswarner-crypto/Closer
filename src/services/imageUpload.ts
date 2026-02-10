import * as ImagePicker from 'expo-image-picker';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { storage } from '@/config/firebase';
import { logger } from '@/utils/logger';

/**
 * Open the image picker and return the selected image URI.
 * Returns null if the user cancels.
 */
export async function pickImage(): Promise<string | null> {
  const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (status !== 'granted') {
    return null;
  }

  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ['images'],
    allowsEditing: true,
    aspect: [1, 1],
    quality: 0.7,
  });

  if (result.canceled || !result.assets[0]) {
    return null;
  }

  return result.assets[0].uri;
}

/**
 * Upload a profile photo for the current user.
 * Returns the download URL.
 */
export async function uploadProfilePhoto(
  userId: string,
  uri: string
): Promise<string> {
  const storageRef = ref(storage, `avatars/${userId}.jpg`);
  const response = await fetch(uri);
  const blob = await response.blob();

  await uploadBytes(storageRef, blob);
  return getDownloadURL(storageRef);
}

/**
 * Upload a partner photo.
 * Stored under the couple's namespace to avoid conflicts.
 * Returns the download URL.
 */
export async function uploadPartnerPhoto(
  coupleId: string,
  userId: string,
  uri: string
): Promise<string> {
  const storageRef = ref(storage, `avatars/${coupleId}_partner_${userId}.jpg`);
  const response = await fetch(uri);
  const blob = await response.blob();

  await uploadBytes(storageRef, blob);
  return getDownloadURL(storageRef);
}
