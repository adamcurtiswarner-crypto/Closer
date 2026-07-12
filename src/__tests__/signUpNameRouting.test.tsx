import React from 'react';
import { render, fireEvent, act } from '@testing-library/react-native';

// ─── Mocks ───

const mockRouterReplace = jest.fn();
let mockSearchParams: Record<string, string> = {};
jest.mock('expo-router', () => ({
  router: {
    replace: (...args: unknown[]) => mockRouterReplace(...args),
    back: jest.fn(),
    push: jest.fn(),
  },
  useLocalSearchParams: () => mockSearchParams,
  Link: ({ children }: { children: React.ReactNode }) => children,
}));

jest.mock('react-native-safe-area-context', () => {
  const { View } = require('react-native');
  return { SafeAreaView: View };
});

// The @/components barrel drags in every feature component — expose only
// what the sign-up screen renders. Social buttons get their own suite.
jest.mock('@/components', () => ({
  Button: require('@/components/Button').Button,
  Input: require('@/components/Input').Input,
  SocialAuthButtons: () => null,
}));

const mockSignUp = jest.fn().mockResolvedValue(undefined);
jest.mock('@/hooks/useAuth', () => ({
  useAuth: () => ({ signUp: mockSignUp }),
}));

let mockPendingInviteCode: string | null = null;
const mockClearPendingInviteCode = jest.fn().mockResolvedValue(undefined);
jest.mock('@/hooks/useDeepLink', () => ({
  getPendingInviteCode: () => Promise.resolve(mockPendingInviteCode),
  clearPendingInviteCode: () => mockClearPendingInviteCode(),
}));

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

import SignUpScreen from '../../app/(auth)/sign-up';

async function signUp(utils: ReturnType<typeof render>) {
  fireEvent.changeText(utils.getByPlaceholderText('you@example.com'), 'a@b.com');
  fireEvent.changeText(utils.getByPlaceholderText('At least 8 characters'), 'password123');
  await act(async () => {
    fireEvent.press(utils.getByText('Create account'));
  });
}

describe('sign-up post-account routing (name step insertion)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockSearchParams = {};
    mockPendingInviteCode = null;
  });

  it('creator path: routes to the name step first', async () => {
    const utils = render(<SignUpScreen />);
    await signUp(utils);

    expect(mockSignUp).toHaveBeenCalledWith('a@b.com', 'password123');
    expect(mockRouterReplace).toHaveBeenCalledWith('/(onboarding)/name');
  });

  it('accepter path ("I have an invite code"): routes to the name step with the join branch', async () => {
    mockSearchParams = { invite: 'true' };
    const utils = render(<SignUpScreen />);
    await signUp(utils);

    expect(mockRouterReplace).toHaveBeenCalledWith({
      pathname: '/(onboarding)/name',
      params: { next: 'join' },
    });
  });

  it('deep-link path: routes to the name step carrying the pending code', async () => {
    mockPendingInviteCode = 'XYZ789';
    const utils = render(<SignUpScreen />);
    await signUp(utils);

    expect(mockClearPendingInviteCode).toHaveBeenCalled();
    expect(mockRouterReplace).toHaveBeenCalledWith({
      pathname: '/(onboarding)/name',
      params: { code: 'XYZ789' },
    });
  });
});
