import React from 'react';
import { render } from '@testing-library/react-native';

// ─── Mocks ───

jest.mock('expo-router', () => {
  const { Text } = require('react-native');
  return {
    Redirect: ({ href }: { href: string }) => <Text>{`redirect:${href}`}</Text>,
  };
});

let mockAuthState: {
  isLoading: boolean;
  isAuthenticated: boolean;
  user: Record<string, unknown> | null;
} = { isLoading: false, isAuthenticated: false, user: null };

jest.mock('@hooks/useAuth', () => ({
  useAuth: () => mockAuthState,
}));

import Index from '../../app/index';

function expectRedirect(target: string) {
  const { getByText } = render(<Index />);
  expect(getByText(`redirect:${target}`)).toBeTruthy();
}

describe('index route guard — name step', () => {
  beforeEach(() => {
    mockAuthState = { isLoading: false, isAuthenticated: false, user: null };
  });

  it('unauthenticated users go to welcome', () => {
    expectRedirect('/(auth)/welcome');
  });

  it('un-named, un-onboarded users go to the name step before anything else', () => {
    mockAuthState = {
      isLoading: false,
      isAuthenticated: true,
      user: { id: 'u1', displayName: null, coupleId: null, isOnboarded: false },
    };
    expectRedirect('/(onboarding)/name');
  });

  it('whitespace-only names count as un-named', () => {
    mockAuthState = {
      isLoading: false,
      isAuthenticated: true,
      user: { id: 'u1', displayName: '   ', coupleId: 'c1', isOnboarded: false },
    };
    expectRedirect('/(onboarding)/name');
  });

  it('named but unpaired users continue to invite-partner', () => {
    mockAuthState = {
      isLoading: false,
      isAuthenticated: true,
      user: { id: 'u1', displayName: 'Adam', coupleId: null, isOnboarded: false },
    };
    expectRedirect('/(onboarding)/invite-partner');
  });

  it('named and paired users continue to tone-calibration', () => {
    mockAuthState = {
      isLoading: false,
      isAuthenticated: true,
      user: { id: 'u1', displayName: 'Adam', coupleId: 'c1', isOnboarded: false },
    };
    expectRedirect('/(onboarding)/tone-calibration');
  });

  it('never re-shows the name step to already-onboarded users, even un-named ones', () => {
    mockAuthState = {
      isLoading: false,
      isAuthenticated: true,
      user: { id: 'u1', displayName: null, coupleId: 'c1', isOnboarded: true },
    };
    expectRedirect('/(app)/today');
  });
});
