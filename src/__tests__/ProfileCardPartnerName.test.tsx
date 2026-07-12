/**
 * ProfileCard partner row naming (src/components/ProfileCard.tsx).
 *
 * Live-audit finding: the top partner card showed the placeholder
 * "Partner's name" + "?" avatar even when the partner had a display_name,
 * because the row rendered the user's own partner_name pet-name field.
 * The row must now DISPLAY the name resolved by usePartnerName
 * (partner display_name > pet name > fallback) while staying tappable
 * to edit the pet-name override.
 */
import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';

// ─── Mocks ───

jest.mock('@/services/imageUpload', () => ({
  pickImage: jest.fn(),
  showPhotoAccessDeniedAlert: jest.fn(),
  uploadProfilePhoto: jest.fn(),
  uploadPartnerPhoto: jest.fn(),
}));

const mockUpdateDoc = jest.fn().mockResolvedValue(undefined);
jest.mock('firebase/firestore', () => ({
  doc: jest.fn(),
  getDoc: jest.fn().mockResolvedValue({ exists: () => false }),
  updateDoc: (...args: unknown[]) => mockUpdateDoc(...args),
  serverTimestamp: jest.fn(() => 'server-ts'),
}));

jest.mock('@/config/firebase', () => ({ db: {} }));

// Love-language query inside ProfileCard — not under test here.
jest.mock('@tanstack/react-query', () => ({
  useQuery: () => ({ data: null }),
}));

interface MockUser {
  id: string;
  coupleId: string | null;
  email: string;
  displayName: string | null;
  partnerName: string | null;
  photoUrl: string | null;
  partnerPhotoUrl: string | null;
  loveLanguage: string | null;
}

const baseUser: MockUser = {
  id: 'user-1',
  coupleId: 'couple-1',
  email: 'alex@example.com',
  displayName: 'Alex',
  partnerName: null,
  photoUrl: null,
  partnerPhotoUrl: null,
  loveLanguage: null,
};

let mockUser: MockUser = baseUser;
const mockRefreshUser = jest.fn().mockResolvedValue(undefined);
jest.mock('@/hooks/useAuth', () => ({
  useAuth: () => ({ user: mockUser, refreshUser: mockRefreshUser }),
}));

interface MockPartner {
  id: string;
  email: string;
  displayName: string | null;
}

let mockPartner: MockPartner | null = null;
jest.mock('@/hooks/usePartner', () => ({
  usePartner: () => ({ data: mockPartner }),
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

// usePartnerName is intentionally NOT mocked — the row must resolve
// through the real precedence logic (display_name > pet name > fallback).
import { ProfileCard } from '../components/ProfileCard';

beforeEach(() => {
  jest.clearAllMocks();
  mockUser = { ...baseUser };
  mockPartner = null;
});

describe('ProfileCard partner row naming', () => {
  it('shows the partner display_name (Casey) with a C avatar initial', () => {
    mockPartner = { id: 'user-2', email: 'casey@example.com', displayName: 'Casey' };
    const { getByText, queryByText, queryByTestId } = render(<ProfileCard />);

    expect(getByText('Casey')).toBeTruthy();
    expect(getByText('C')).toBeTruthy();
    expect(queryByText('Add their name')).toBeNull();
    expect(queryByText('?')).toBeNull();
    expect(queryByTestId('partner-avatar-fallback')).toBeNull();
  });

  it('falls back to the pet-name override when the partner has no display_name', () => {
    mockPartner = { id: 'user-2', email: 'casey@example.com', displayName: null };
    mockUser = { ...baseUser, partnerName: 'Pooh' };
    const { getByText, queryByText } = render(<ProfileCard />);

    expect(getByText('Pooh')).toBeTruthy();
    expect(getByText('P')).toBeTruthy();
    expect(queryByText('Add their name')).toBeNull();
  });

  it('shows "Add their name" and a neutral glyph — never "Partner\'s name" or "?" — when nothing resolves', () => {
    const { getByText, getByTestId, queryByText } = render(<ProfileCard />);

    expect(getByText('Add their name')).toBeTruthy();
    expect(getByTestId('partner-avatar-fallback')).toBeTruthy();
    expect(queryByText("Partner's name")).toBeNull();
    expect(queryByText('?')).toBeNull();
  });

  it('keeps the row tappable to edit the pet name — saves partner_name as an override', async () => {
    mockPartner = { id: 'user-2', email: 'casey@example.com', displayName: 'Casey' };
    const { getByText, getByPlaceholderText } = render(<ProfileCard />);

    fireEvent.press(getByText('Casey'));

    const input = getByPlaceholderText('What you call them (optional)');
    fireEvent.changeText(input, 'Sunshine');
    fireEvent(input, 'blur');

    await waitFor(() =>
      expect(mockUpdateDoc).toHaveBeenCalledWith(
        undefined,
        expect.objectContaining({ partner_name: 'Sunshine' })
      )
    );
    await waitFor(() => expect(mockRefreshUser).toHaveBeenCalled());
  });
});
