import React from 'react';
import { render, fireEvent, act } from '@testing-library/react-native';

// ─── Mocks ───

jest.mock('expo-router', () => ({
  router: { replace: jest.fn(), back: jest.fn(), push: jest.fn() },
}));

// The @/components barrel pulls firebase-backed hooks — stub the SDK modules
jest.mock('firebase/firestore', () => ({
  collection: jest.fn(),
  doc: jest.fn(),
  getDoc: jest.fn(),
  getDocs: jest.fn(),
  addDoc: jest.fn(),
  setDoc: jest.fn(),
  updateDoc: jest.fn(),
  query: jest.fn(),
  where: jest.fn(),
  orderBy: jest.fn(),
  limit: jest.fn(),
  serverTimestamp: jest.fn(),
  onSnapshot: jest.fn(),
}));
jest.mock('firebase/functions', () => ({ httpsCallable: jest.fn() }));
jest.mock('@/config/firebase', () => ({ db: {}, auth: {}, functions: {}, storage: {} }));
jest.mock('@/services/analytics', () => ({ logEvent: jest.fn() }));

jest.mock('react-native-gesture-handler', () => {
  const { View } = require('react-native');
  return { Swipeable: View, GestureHandlerRootView: View };
});

jest.mock('react-native-safe-area-context', () => {
  const { View } = require('react-native');
  return { SafeAreaView: View };
});

const mockSetStringAsync = jest.fn().mockResolvedValue(true);
jest.mock('expo-clipboard', () => ({
  setStringAsync: (value: string) => mockSetStringAsync(value),
  hasStringAsync: jest.fn().mockResolvedValue(false),
  getStringAsync: jest.fn().mockResolvedValue(''),
}));

jest.mock('firebase/auth', () => ({
  sendEmailVerification: jest.fn(),
}));

jest.mock('@utils/haptics', () => ({
  hapticImpact: jest.fn(),
  hapticNotification: jest.fn(),
  ImpactFeedbackStyle: { Light: 'light', Medium: 'medium' },
  NotificationFeedbackType: { Success: 'success', Warning: 'warning' },
}));

jest.mock('@/components/Icon', () => ({ Icon: () => null }));

// The @/components barrel drags in every feature component (gesture-handler,
// image-picker, ...) — expose only what these onboarding screens render.
jest.mock('@/components', () => ({
  Button: require('@/components/Button').Button,
  Icon: () => null,
  PairingMoment: require('@/components/PairingMoment').PairingMoment,
}));

jest.mock('@/utils/onboarding', () => ({
  completeOnboarding: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('@/hooks/useCouple', () => ({
  useCreateInvite: () => ({ mutateAsync: jest.fn(), isPending: false }),
  usePendingInvite: () => ({
    data: {
      code: 'ABC123',
      status: 'pending',
      expiresAt: new Date('2099-01-01'),
      createdAt: new Date('2026-01-01'),
    },
  }),
}));

jest.mock('@/hooks/useAuth', () => ({
  useAuth: () => ({
    user: { id: 'user-1', displayName: 'Adam Warner', email: 'a@b.c', coupleId: 'couple-1' },
    firebaseUser: { emailVerified: true },
    refreshUser: jest.fn(),
  }),
}));

// Resolve t() against the real en.json so tests assert shipped copy
jest.mock('react-i18next', () => {
  const en = require('../i18n/locales/en.json');
  const lookup = (key: string): unknown =>
    key.split('.').reduce<any>((obj, part) => (obj ? obj[part] : undefined), en);
  return {
    useTranslation: () => ({
      t: (key: string, options?: Record<string, unknown>) => {
        let value = lookup(key);
        if (typeof value !== 'string') return key;
        if (options) {
          Object.entries(options).forEach(([name, v]) => {
            value = (value as string).replace(`{{${name}}}`, String(v));
          });
        }
        return value;
      },
    }),
  };
});

import InvitePartnerScreen from '../../app/(onboarding)/invite-partner';
import { hapticImpact } from '@utils/haptics';

describe('invite-partner copied state', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('shows the invite code with the tap-to-copy hint', () => {
    const { getByText } = render(<InvitePartnerScreen />);
    expect(getByText('ABC123')).toBeTruthy();
    expect(getByText('Tap to copy')).toBeTruthy();
  });

  it('copies the code and shows a quiet inline "Copied" instead of an alert', async () => {
    const { getByText, queryByText } = render(<InvitePartnerScreen />);

    await act(async () => {
      fireEvent.press(getByText('ABC123'));
    });

    expect(mockSetStringAsync).toHaveBeenCalledWith('ABC123');
    expect(getByText('Copied')).toBeTruthy();
    expect(queryByText('Tap to copy')).toBeNull();
    expect(hapticImpact).toHaveBeenCalledWith('light');
  });

  it('fades the confirmation back to the hint after two seconds', async () => {
    const { getByText, queryByText } = render(<InvitePartnerScreen />);

    await act(async () => {
      fireEvent.press(getByText('ABC123'));
    });
    expect(getByText('Copied')).toBeTruthy();

    act(() => {
      jest.advanceTimersByTime(2000);
    });
    expect(queryByText('Copied')).toBeNull();
    expect(getByText('Tap to copy')).toBeTruthy();
  });
});
