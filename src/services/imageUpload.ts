import { Alert, Linking } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system/legacy';
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
 * Discriminated pick result so callers can tell "user changed their mind"
 * from "the OS said no":
 * - `{ uri }`        — an image was selected
 * - `{ denied: true }` — photo-library permission is not granted; callers
 *   must surface this (showPhotoAccessDeniedAlert), never swallow it
 * - `null`           — the user opened the picker and cancelled (no message)
 */
export type PickImageResult = { uri: string } | { denied: true } | null;

/**
 * Open the image picker and return the selected image.
 * Permission denial is reported distinctly — it used to be returned as
 * `null` (indistinguishable from a cancel), which made photo updates fail
 * silently for anyone who had denied photo access.
 */
export async function pickImage(): Promise<PickImageResult> {
  const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (status !== 'granted') {
    return { denied: true };
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

  return { uri: result.assets[0].uri };
}

/**
 * The one alert for a denied photo-library permission — same copy at every
 * pickImage call site. Takes the caller's `t` so the copy lives in i18n
 * (profile.photosAccessTitle / photosAccessBody / openSettings).
 */
export function showPhotoAccessDeniedAlert(t: (key: string) => string): void {
  Alert.alert(t('profile.photosAccessTitle'), t('profile.photosAccessBody'), [
    { text: t('common.cancel'), style: 'cancel' },
    {
      text: t('profile.openSettings'),
      onPress: () => {
        Linking.openSettings().catch((error) => {
          logger.error('Error opening settings from photo access alert:', error);
        });
      },
    },
  ]);
}

/**
 * Upload a profile photo for the current user.
 * Returns the download URL.
 */
export async function uploadProfilePhoto(
  userId: string,
  uri: string
): Promise<string> {
  const storageRef = ref(storage, `avatars/${userId}/profile.jpg`);
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
  const storageRef = ref(storage, `partner-photos/${coupleId}/${userId}.jpg`);
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
