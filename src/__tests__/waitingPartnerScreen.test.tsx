import React from 'react';
import { render, act } from '@testing-library/react-native';

// ─── Mocks ───

const mockRouterReplace = jest.fn();
jest.mock('expo-router', () => ({
  // Lazy wrapper — the factory is hoisted above the const initializer
  router: {
    replace: (...args: unknown[]) => mockRouterReplace(...args),
    back: jest.fn(),
    push: jest.fn(),
  },
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

const mockCoupleQuery = jest.fn();
jest.mock('@/hooks/useCouple', () => ({
  useCouple: () => mockCoupleQuery(),
}));

const mockPartnerQuery = jest.fn();
jest.mock('@/hooks/usePartner', () => ({
  usePartner: () => mockPartnerQuery(),
}));

jest.mock('@/hooks/useAuth', () => ({
  useAuth: () => ({
    user: { id: 'user-1', displayName: 'Adam Warner', coupleId: 'couple-1' },
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

import WaitingPartnerScreen from '../../app/(onboarding)/waiting-partner';

describe('waiting-partner screen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockPartnerQuery.mockReturnValue({ data: null });
  });

  it('shows the waiting state while the couple is pending', () => {
    mockCoupleQuery.mockReturnValue({
      data: { id: 'couple-1', status: 'pending' },
      refetch: jest.fn(),
    });
    const { getByText, queryByTestId } = render(<WaitingPartnerScreen />);

    expect(getByText('Waiting for your partner')).toBeTruthy();
    expect(queryByTestId('pairing-moment')).toBeNull();
    expect(mockRouterReplace).not.toHaveBeenCalled();
  });

  it('shows the pairing moment when the partner joins instead of redirecting silently', () => {
    mockCoupleQuery.mockReturnValue({
      data: { id: 'couple-1', status: 'active' },
      refetch: jest.fn(),
    });
    mockPartnerQuery.mockReturnValue({ data: { id: 'p1', displayName: 'Jess Lee' } });

    const { getByText, queryByText } = render(<WaitingPartnerScreen />);

    expect(getByText('Adam & Jess')).toBeTruthy();
    expect(getByText('The fire is lit.')).toBeTruthy();
    expect(queryByText('Waiting for your partner')).toBeNull();
    // The moment holds the screen — navigation waits for its beat
    expect(mockRouterReplace).not.toHaveBeenCalled();
  });

  it('advances to tone calibration via the long fallback when nobody taps', () => {
    mockCoupleQuery.mockReturnValue({
      data: { id: 'couple-1', status: 'active' },
      refetch: jest.fn(),
    });
    mockPartnerQuery.mockReturnValue({ data: { id: 'p1', displayName: 'Jess Lee' } });

    render(<WaitingPartnerScreen />);
    // The moment waits for the tap; the 10s fallback is the safety net.
    act(() => {
      jest.advanceTimersByTime(9999);
    });
    expect(mockRouterReplace).not.toHaveBeenCalled();

    act(() => {
      jest.advanceTimersByTime(1);
    });
    expect(mockRouterReplace).toHaveBeenCalledWith('/(onboarding)/tone-calibration');
  });

  it('falls back to "You & your partner" when the partner name has not loaded yet', () => {
    mockCoupleQuery.mockReturnValue({
      data: { id: 'couple-1', status: 'active' },
      refetch: jest.fn(),
    });
    mockPartnerQuery.mockReturnValue({ data: null });

    const { getByText } = render(<WaitingPartnerScreen />);
    // My name is still known here — only the partner falls back
    expect(getByText('Adam & your partner')).toBeTruthy();
  });
});
