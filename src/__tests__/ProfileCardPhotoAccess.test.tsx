/**
 * ProfileCard photo handlers (src/components/ProfileCard.tsx).
 *
 * Founder report: "cannot update the pictures in profile" — a denied photo
 * permission used to look exactly like a cancel, so tapping the avatar did
 * nothing. The handlers must now:
 *   - denied  → show the designed photos-access alert (never silent)
 *   - null    → stay silent (user cancelled on purpose)
 *   - { uri } → upload as before
 */
import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';

// ─── Mocks ───

const mockPickImage = jest.fn();
const mockShowDeniedAlert = jest.fn();
const mockUploadProfilePhoto = jest.fn();
const mockUploadPartnerPhoto = jest.fn();
jest.mock('@/services/imageUpload', () => ({
  pickImage: (...args: unknown[]) => mockPickImage(...args),
  showPhotoAccessDeniedAlert: (...args: unknown[]) => mockShowDeniedAlert(...args),
  uploadProfilePhoto: (...args: unknown[]) => mockUploadProfilePhoto(...args),
  uploadPartnerPhoto: (...args: unknown[]) => mockUploadPartnerPhoto(...args),
}));

jest.mock('firebase/firestore', () => ({
  doc: jest.fn(),
  getDoc: jest.fn().mockResolvedValue({ exists: () => false }),
  updateDoc: jest.fn().mockResolvedValue(undefined),
  serverTimestamp: jest.fn(),
}));

jest.mock('@/config/firebase', () => ({ db: {} }));

jest.mock('@tanstack/react-query', () => ({
  useQuery: () => ({ data: null }),
}));

const mockRefreshUser = jest.fn().mockResolvedValue(undefined);
jest.mock('@/hooks/useAuth', () => ({
  useAuth: () => ({
    user: {
      id: 'user-1',
      coupleId: 'couple-1',
      email: 'alex@example.com',
      displayName: 'Alex',
      partnerName: 'Blake',
      photoUrl: null,
      partnerPhotoUrl: null,
      loveLanguage: null,
    },
    refreshUser: mockRefreshUser,
  }),
}));

jest.mock('@/hooks/useCouple', () => ({
  useCouple: () => ({ data: { id: 'couple-1', memberIds: ['user-1', 'user-2'] } }),
  useUpdateAnniversaryDate: () => ({ mutateAsync: jest.fn(), isPending: false }),
}));

jest.mock('@/services/analytics', () => ({ logEvent: jest.fn() }));
jest.mock('@utils/haptics', () => ({
  hapticImpact: jest.fn(),
  hapticNotification: jest.fn(),
  ImpactFeedbackStyle: { Light: 'light', Medium: 'medium' },
  NotificationFeedbackType: { Success: 'success' },
}));
jest.mock('@/utils/logger', () => ({
  logger: { error: jest.fn(), warn: jest.fn(), info: jest.fn() },
}));
jest.mock('@/components/Icon', () => ({ Icon: () => null }));
jest.mock('@/components/LoveLanguageModal', () => ({ LoveLanguageModal: () => null }));
jest.mock('@/components/AnniversaryPicker', () => ({ AnniversaryPicker: () => null }));

// Resolve t() against the real en.json so tests assert shipped copy
jest.mock('react-i18next', () => {
  const en = require('../i18n/locales/en.json');
  const lookup = (key: string): unknown =>
    key.split('.').reduce<any>((obj, part) => (obj ? obj[part] : undefined), en);
  return {
    useTranslation: () => ({
      t: (key: string) => {
        const value = lookup(key);
        return typeof value === 'string' ? value : key;
      },
    }),
  };
});

import { ProfileCard } from '../components/ProfileCard';

beforeEach(() => {
  jest.clearAllMocks();
});

describe('ProfileCard photo access', () => {
  it('shows the photos-access alert when the user avatar pick is denied — never silent', async () => {
    mockPickImage.mockResolvedValue({ denied: true });
    const { getByText } = render(<ProfileCard />);

    // The "A" initial bubble is the user avatar touch target.
    fireEvent.press(getByText('A'));

    await waitFor(() => expect(mockShowDeniedAlert).toHaveBeenCalledTimes(1));
    expect(mockUploadProfilePhoto).not.toHaveBeenCalled();
  });

  it('shows the photos-access alert when the partner avatar pick is denied', async () => {
    mockPickImage.mockResolvedValue({ denied: true });
    const { getByText } = render(<ProfileCard />);

    fireEvent.press(getByText('B'));

    await waitFor(() => expect(mockShowDeniedAlert).toHaveBeenCalledTimes(1));
    expect(mockUploadPartnerPhoto).not.toHaveBeenCalled();
  });

  it('stays silent on cancel — no alert, no upload', async () => {
    mockPickImage.mockResolvedValue(null);
    const { getByText } = render(<ProfileCard />);

    fireEvent.press(getByText('A'));

    await waitFor(() => expect(mockPickImage).toHaveBeenCalledTimes(1));
    expect(mockShowDeniedAlert).not.toHaveBeenCalled();
    expect(mockUploadProfilePhoto).not.toHaveBeenCalled();
  });

  it('uploads the selected image uri on the happy path', async () => {
    mockPickImage.mockResolvedValue({ uri: 'file:///photos/new.jpg' });
    mockUploadProfilePhoto.mockResolvedValue('https://example.com/dl.jpg');
    const { getByText } = render(<ProfileCard />);

    fireEvent.press(getByText('A'));

    await waitFor(() =>
      expect(mockUploadProfilePhoto).toHaveBeenCalledWith(
        'user-1',
        'file:///photos/new.jpg'
      )
    );
    expect(mockShowDeniedAlert).not.toHaveBeenCalled();
    await waitFor(() => expect(mockRefreshUser).toHaveBeenCalled());
  });
});
