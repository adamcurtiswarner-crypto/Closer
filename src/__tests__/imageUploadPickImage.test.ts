/**
 * Contract tests for pickImage (src/services/imageUpload.ts).
 *
 * The founder-reported bug: permission denial returned `null` — identical to
 * a user cancel — so photo updates failed with no feedback at all. The
 * contract is now a discriminated result:
 *   { uri }          — image selected
 *   { denied: true } — OS permission not granted (callers must surface it)
 *   null             — user cancelled (silence is correct)
 *
 * Also covers showPhotoAccessDeniedAlert — the single designed alert every
 * call site shows for the denied case, including the Open Settings action.
 */
import { Alert, Linking } from 'react-native';

jest.mock('expo-image-picker', () => ({
  requestMediaLibraryPermissionsAsync: jest.fn(),
  launchImageLibraryAsync: jest.fn(),
}));

jest.mock('expo-file-system/legacy', () => ({
  readAsStringAsync: jest.fn(),
  EncodingType: { Base64: 'base64' },
}));

jest.mock('firebase/storage', () => ({
  ref: jest.fn(),
  uploadBytesResumable: jest.fn(),
  getDownloadURL: jest.fn(),
}));

jest.mock('@/config/firebase', () => ({ storage: {} }));

jest.mock('@/utils/logger', () => ({
  logger: { error: jest.fn(), warn: jest.fn(), info: jest.fn() },
}));

import * as ImagePicker from 'expo-image-picker';
import { pickImage, showPhotoAccessDeniedAlert } from '../services/imageUpload';
import en from '../i18n/locales/en.json';

const requestPermissions =
  ImagePicker.requestMediaLibraryPermissionsAsync as jest.Mock;
const launchLibrary = ImagePicker.launchImageLibraryAsync as jest.Mock;

/** Resolve keys against the real en.json so tests assert shipped copy. */
const t = (key: string): string => {
  const value = key
    .split('.')
    .reduce<unknown>(
      (obj, part) => (obj == null ? obj : (obj as Record<string, unknown>)[part]),
      en
    );
  return typeof value === 'string' ? value : key;
};

beforeEach(() => {
  jest.clearAllMocks();
});

describe('pickImage result contract', () => {
  it('returns { uri } when permission is granted and an image is selected', async () => {
    requestPermissions.mockResolvedValue({ status: 'granted' });
    launchLibrary.mockResolvedValue({
      canceled: false,
      assets: [{ uri: 'file:///photos/selected.jpg' }],
    });

    await expect(pickImage()).resolves.toEqual({
      uri: 'file:///photos/selected.jpg',
    });
  });

  it('returns null when the user cancels the picker — silence is correct', async () => {
    requestPermissions.mockResolvedValue({ status: 'granted' });
    launchLibrary.mockResolvedValue({ canceled: true, assets: [] });

    await expect(pickImage()).resolves.toBeNull();
  });

  it('returns { denied: true } when permission is not granted — distinct from a cancel', async () => {
    requestPermissions.mockResolvedValue({ status: 'denied' });

    await expect(pickImage()).resolves.toEqual({ denied: true });
    // The picker must never open without permission.
    expect(launchLibrary).not.toHaveBeenCalled();
  });

  it('treats "undetermined" (any non-granted status) as denied', async () => {
    requestPermissions.mockResolvedValue({ status: 'undetermined' });

    await expect(pickImage()).resolves.toEqual({ denied: true });
  });
});

describe('showPhotoAccessDeniedAlert', () => {
  it('shows the designed alert with shipped copy and a cancel + Open Settings pair', () => {
    const alertSpy = jest.spyOn(Alert, 'alert').mockImplementation(() => {});

    showPhotoAccessDeniedAlert(t);

    expect(alertSpy).toHaveBeenCalledTimes(1);
    const [title, body, buttons] = alertSpy.mock.calls[0];
    expect(title).toBe(en.profile.photosAccessTitle);
    expect(body).toBe(en.profile.photosAccessBody);
    expect(buttons).toHaveLength(2);
    expect(buttons![0]).toMatchObject({ text: en.common.cancel, style: 'cancel' });
    expect(buttons![1]).toMatchObject({ text: en.profile.openSettings });

    alertSpy.mockRestore();
  });

  it('the Open Settings action opens the OS settings', () => {
    const alertSpy = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
    const openSettingsSpy = jest
      .spyOn(Linking, 'openSettings')
      .mockResolvedValue(undefined);

    showPhotoAccessDeniedAlert(t);
    const buttons = alertSpy.mock.calls[0][2]!;
    buttons[1].onPress?.();

    expect(openSettingsSpy).toHaveBeenCalledTimes(1);

    alertSpy.mockRestore();
    openSettingsSpy.mockRestore();
  });
});
