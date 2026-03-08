import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system';
import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import { storage } from '@/config/firebase';
import { logger } from '@/utils/logger';

/**
 * Read a local file URI as a Uint8Array for Firebase Storage upload.
 * More reliable than fetch(uri).blob() on React Native / Hermes.
 */
async function readFileAsBytes(uri: string): Promise<Uint8Array> {
  const base64 = await FileSystem.readAsStringAsync(uri, {
    encoding: FileSystem.EncodingType.Base64,
  });
  const binaryString = atob(base64);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

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
  const bytes = await readFileAsBytes(uri);

  await uploadBytesResumable(storageRef, bytes, { contentType: 'image/jpeg' });
  return getDownloadURL(storageRef);
}

/**
 * Upload a photo attached to a prompt response.
 * Returns the download URL.
 */
export async function uploadResponsePhoto(
  coupleId: string,
  assignmentId: string,
  userId: string,
  uri: string
): Promise<string> {
  const storageRef = ref(storage, `responses/${coupleId}/${assignmentId}/${userId}.jpg`);
  const bytes = await readFileAsBytes(uri);

  await uploadBytesResumable(storageRef, bytes, { contentType: 'image/jpeg' });
  return getDownloadURL(storageRef);
}

/**
 * Upload a chat image.
 * Returns the download URL.
 */
export async function uploadChatImage(
  coupleId: string,
  userId: string,
  uri: string
): Promise<string> {
  const messageId = Date.now().toString(36);
  const storageRef = ref(storage, `chat/${coupleId}/${messageId}_${userId}.jpg`);
  const bytes = await readFileAsBytes(uri);

  await uploadBytesResumable(storageRef, bytes, { contentType: 'image/jpeg' });
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
  const bytes = await readFileAsBytes(uri);

  await uploadBytesResumable(storageRef, bytes, { contentType: 'image/jpeg' });
  return getDownloadURL(storageRef);
}

/**
 * Upload a standalone photo to the couple's shared album.
 * Returns the download URL.
 */
export async function uploadStandalonePhoto(
  coupleId: string,
  photoId: string,
  uri: string
): Promise<string> {
  const storageRef = ref(storage, `photos/${coupleId}/${photoId}.jpg`);
  const bytes = await readFileAsBytes(uri);

  await uploadBytesResumable(storageRef, bytes, { contentType: 'image/jpeg' });
  return getDownloadURL(storageRef);
}

/**
 * Upload a milestone photo.
 * Returns the download URL.
 */
export async function uploadMilestonePhoto(
  coupleId: string,
  milestoneId: string,
  uri: string
): Promise<string> {
  const storageRef = ref(storage, `milestones/${coupleId}/${milestoneId}.jpg`);
  const bytes = await readFileAsBytes(uri);

  await uploadBytesResumable(storageRef, bytes, { contentType: 'image/jpeg' });
  return getDownloadURL(storageRef);
}
