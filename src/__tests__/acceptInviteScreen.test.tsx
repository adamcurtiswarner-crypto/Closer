import React from 'react';
import { render, fireEvent, act } from '@testing-library/react-native';

// ─── Mocks ───

const mockRouterReplace = jest.fn();
jest.mock('expo-router', () => ({
  // Lazy wrapper — the factory is hoisted above the const initializer
  router: {
    replace: (...args: unknown[]) => mockRouterReplace(...args),
    back: jest.fn(),
    push: jest.fn(),
  },
  useLocalSearchParams: () => ({}),
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

jest.mock('expo-clipboard', () => ({
  hasStringAsync: jest.fn().mockResolvedValue(false),
  getStringAsync: jest.fn().mockResolvedValue(''),
  setStringAsync: jest.fn().mockResolvedValue(true),
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

const mockAcceptInvite = jest.fn();
jest.mock('@/hooks/useCouple', () => ({
  useAcceptInvite: () => ({ mutateAsync: mockAcceptInvite, isPending: false }),
}));

jest.mock('@/hooks/usePartner', () => ({
  usePartner: () => ({ data: { id: 'p1', displayName: 'Jess Lee' } }),
}));

jest.mock('@/hooks/useAuth', () => ({
  useAuth: () => ({
    user: { id: 'user-1', displayName: 'Adam Warner', coupleId: null },
  }),
}));

const mockClearPendingInviteCode = jest.fn().mockResolvedValue(undefined);
jest.mock('@/hooks/useDeepLink', () => ({
  clearPendingInviteCode: () => mockClearPendingInviteCode(),
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

import AcceptInviteScreen from '../../app/(onboarding)/accept-invite';

// Enter a valid-length code and press Join
async function submitCode(utils: ReturnType<typeof render>) {
  fireEvent.changeText(utils.getByPlaceholderText('ABC123'), 'ABC123');
  await act(async () => {
    fireEvent.press(utils.getByText('Join'));
  });
}

describe('accept-invite screen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('inline error states (no system alerts)', () => {
    // The five callable error messages, matched by substring (useCouple.ts /
    // functions/src/invites.ts keep these strings in lockstep).
    const cases: Array<{ server: string; title: string; body: string }> = [
      {
        server: 'Already in a couple',
        title: 'Already paired',
        body: 'Your account is already linked to a partner. Disconnect first in Profile, then try again.',
      },
      {
        server: 'This invite has expired',
        title: 'Code expired',
        body: 'This invite code has expired. Ask your partner to create a new one.',
      },
      {
        server: 'This invite has already been used',
        title: 'Code already used',
        body: 'This invite code has already been accepted.',
      },
      {
        server: "You can't accept your own invite",
        title: 'Own code',
        body: 'This is your invite code. Share it with your partner instead.',
      },
      {
        server: 'Invalid invite code',
        title: 'Invalid code',
        body: "This code isn't valid or has expired. Ask your partner for a new one.",
      },
    ];

    it.each(cases)('renders "$title" inline for "$server"', async ({ server, title, body }) => {
      mockAcceptInvite.mockRejectedValueOnce(new Error(server));
      const utils = render(<AcceptInviteScreen />);
      await submitCode(utils);

      expect(utils.getByText(title)).toBeTruthy();
      expect(utils.getByText(body)).toBeTruthy();
      // Stays on the screen — no navigation on error
      expect(mockRouterReplace).not.toHaveBeenCalled();
    });

    it('clears the inline error when the code is edited', async () => {
      mockAcceptInvite.mockRejectedValueOnce(new Error('Invalid invite code'));
      const utils = render(<AcceptInviteScreen />);
      await submitCode(utils);
      expect(utils.getByText('Invalid code')).toBeTruthy();

      fireEvent.changeText(utils.getByPlaceholderText('ABC123'), 'XYZ12');
      expect(utils.queryByText('Invalid code')).toBeNull();
    });
  });

  describe('the pairing moment', () => {
    it('shows the pairing moment with both names on success instead of navigating silently', async () => {
      mockAcceptInvite.mockResolvedValueOnce({ coupleId: 'couple-1' });
      const utils = render(<AcceptInviteScreen />);
      await submitCode(utils);

      expect(mockClearPendingInviteCode).toHaveBeenCalledTimes(1);
      expect(utils.getByText('Adam & Jess')).toBeTruthy();
      expect(utils.getByText('The fire is lit.')).toBeTruthy();
      // The moment holds the screen — navigation waits for its beat
      expect(mockRouterReplace).not.toHaveBeenCalled();
    });

    it('advances to tone calibration after the moment', async () => {
      mockAcceptInvite.mockResolvedValueOnce({ coupleId: 'couple-1' });
      const utils = render(<AcceptInviteScreen />);
      await submitCode(utils);

      act(() => {
        jest.advanceTimersByTime(2500);
      });
      expect(mockRouterReplace).toHaveBeenCalledWith('/(onboarding)/tone-calibration');
    });

    it('advances immediately on tap', async () => {
      mockAcceptInvite.mockResolvedValueOnce({ coupleId: 'couple-1' });
      const utils = render(<AcceptInviteScreen />);
      await submitCode(utils);

      fireEvent.press(utils.getByTestId('pairing-moment'));
      expect(mockRouterReplace).toHaveBeenCalledTimes(1);
      expect(mockRouterReplace).toHaveBeenCalledWith('/(onboarding)/tone-calibration');
    });
  });
});
