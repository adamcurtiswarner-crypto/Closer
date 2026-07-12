import React from 'react';
import { render, fireEvent, act } from '@testing-library/react-native';

// ─── Mocks ───

const mockRouterReplace = jest.fn();
jest.mock('expo-router', () => ({
  router: {
    replace: (...args: unknown[]) => mockRouterReplace(...args),
    back: jest.fn(),
    push: jest.fn(),
  },
}));

jest.mock('@expo/vector-icons', () => ({ AntDesign: () => null }));

let mockIsNewUser = true;
const mockSignInWithGoogle = jest.fn(() => Promise.resolve({ isNewUser: mockIsNewUser }));
jest.mock('@/hooks/useAuth', () => ({
  useAuth: () => ({
    signInWithGoogle: mockSignInWithGoogle,
    signInWithApple: jest.fn(() => Promise.resolve({ isNewUser: mockIsNewUser })),
  }),
}));

let mockPendingInviteCode: string | null = null;
const mockClearPendingInviteCode = jest.fn().mockResolvedValue(undefined);
jest.mock('@/hooks/useDeepLink', () => ({
  getPendingInviteCode: () => Promise.resolve(mockPendingInviteCode),
  clearPendingInviteCode: () => mockClearPendingInviteCode(),
}));

import { SocialAuthButtons } from '../components/SocialAuthButtons';

async function pressGoogle(utils: ReturnType<typeof render>) {
  await act(async () => {
    fireEvent.press(utils.getByText('Continue with Google'));
  });
}

describe('social auth post-account routing (name step insertion)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockIsNewUser = true;
    mockPendingInviteCode = null;
  });

  it('new social users route to the name step (pre-filled confirm)', async () => {
    const utils = render(<SocialAuthButtons />);
    await pressGoogle(utils);

    expect(mockRouterReplace).toHaveBeenCalledWith('/(onboarding)/name');
  });

  it('existing users skip the name step and go home', async () => {
    mockIsNewUser = false;
    const utils = render(<SocialAuthButtons />);
    await pressGoogle(utils);

    expect(mockRouterReplace).toHaveBeenCalledWith('/');
  });

  it('new users with a pending invite code carry it through the name step', async () => {
    mockPendingInviteCode = 'ABC123';
    const utils = render(<SocialAuthButtons />);
    await pressGoogle(utils);

    expect(mockClearPendingInviteCode).toHaveBeenCalled();
    expect(mockRouterReplace).toHaveBeenCalledWith({
      pathname: '/(onboarding)/name',
      params: { code: 'ABC123' },
    });
  });

  it('existing users with a pending invite code are never asked their name again', async () => {
    mockIsNewUser = false;
    mockPendingInviteCode = 'ABC123';
    const utils = render(<SocialAuthButtons />);
    await pressGoogle(utils);

    expect(mockRouterReplace).toHaveBeenCalledWith({
      pathname: '/(onboarding)/accept-invite',
      params: { code: 'ABC123' },
    });
  });
});
