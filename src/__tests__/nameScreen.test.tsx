import React from 'react';
import { Alert } from 'react-native';
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
}));

const mockUpdateDoc = jest.fn().mockResolvedValue(undefined);
jest.mock('firebase/firestore', () => ({
  doc: jest.fn((_db: unknown, collection: string, id: string) => ({ collection, id })),
  updateDoc: (...args: unknown[]) => mockUpdateDoc(...args),
  serverTimestamp: jest.fn(() => 'server-timestamp'),
}));
jest.mock('@/config/firebase', () => ({ db: {}, auth: {}, functions: {}, storage: {} }));

const mockLogEvent = jest.fn();
jest.mock('@/services/analytics', () => ({
  logEvent: (...args: unknown[]) => mockLogEvent(...args),
}));
jest.mock('@/utils/logger', () => ({
  logger: { error: jest.fn(), warn: jest.fn(), log: jest.fn() },
}));

jest.mock('react-native-safe-area-context', () => {
  const { View } = require('react-native');
  return { SafeAreaView: View };
});

// The @/components barrel drags in every feature component — expose only
// what the name screen renders.
jest.mock('@/components', () => ({
  Button: require('@/components/Button').Button,
  Input: require('@/components/Input').Input,
}));

const mockRefreshUser = jest.fn().mockResolvedValue(undefined);
let mockUser: Record<string, unknown> | null = {
  id: 'user-1',
  displayName: null,
  coupleId: null,
};
jest.mock('@/hooks/useAuth', () => ({
  useAuth: () => ({ user: mockUser, refreshUser: mockRefreshUser }),
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

import NameScreen from '../../app/(onboarding)/name';

const NAME_PLACEHOLDER = 'Your first name';

async function typeAndContinue(utils: ReturnType<typeof render>, name: string) {
  fireEvent.changeText(utils.getByPlaceholderText(NAME_PLACEHOLDER), name);
  await act(async () => {
    fireEvent.press(utils.getByText('Continue'));
  });
}

describe('NameScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockSearchParams = {};
    mockUser = { id: 'user-1', displayName: null, coupleId: null };
    mockUpdateDoc.mockResolvedValue(undefined);
  });

  it('shows the headline and the partner-visibility sub-line', () => {
    const { getByText } = render(<NameScreen />);
    expect(getByText('What should we call you?')).toBeTruthy();
    expect(getByText('Your partner sees this with every answer.')).toBeTruthy();
  });

  it('does nothing while the field is empty', async () => {
    const utils = render(<NameScreen />);
    await act(async () => {
      fireEvent.press(utils.getByText('Continue'));
    });
    expect(mockUpdateDoc).not.toHaveBeenCalled();
    expect(mockRouterReplace).not.toHaveBeenCalled();
  });

  it('treats whitespace-only input as empty', async () => {
    const utils = render(<NameScreen />);
    await typeAndContinue(utils, '   ');
    expect(mockUpdateDoc).not.toHaveBeenCalled();
    expect(mockRouterReplace).not.toHaveBeenCalled();
  });

  it('pre-fills from an existing display name (social auth)', () => {
    mockUser = { id: 'user-1', displayName: 'Adam', coupleId: null };
    const { getByDisplayValue } = render(<NameScreen />);
    expect(getByDisplayValue('Adam')).toBeTruthy();
  });

  it('saves the trimmed name, refreshes the user, and continues to value-prop', async () => {
    const utils = render(<NameScreen />);
    await typeAndContinue(utils, '  Maya  ');

    expect(mockUpdateDoc).toHaveBeenCalledWith(
      { collection: 'users', id: 'user-1' },
      { display_name: 'Maya', updated_at: 'server-timestamp' },
    );
    expect(mockRefreshUser).toHaveBeenCalled();
    expect(mockLogEvent).toHaveBeenCalledWith('onboarding_name_set', { prefilled: false });
    expect(mockRouterReplace).toHaveBeenCalledWith('/(onboarding)/value-prop');
  });

  it('carries a deep-link invite code forward to accept-invite', async () => {
    mockSearchParams = { code: 'ABC123' };
    const utils = render(<NameScreen />);
    await typeAndContinue(utils, 'Maya');

    expect(mockRouterReplace).toHaveBeenCalledWith({
      pathname: '/(onboarding)/accept-invite',
      params: { code: 'ABC123' },
    });
  });

  it('routes the accepter path to the join screen', async () => {
    mockSearchParams = { next: 'join' };
    const utils = render(<NameScreen />);
    await typeAndContinue(utils, 'Maya');

    expect(mockRouterReplace).toHaveBeenCalledWith('/(onboarding)/accept-invite');
  });

  it('sends already-paired users back to the root guard', async () => {
    mockUser = { id: 'user-1', displayName: null, coupleId: 'couple-1' };
    const utils = render(<NameScreen />);
    await typeAndContinue(utils, 'Maya');

    expect(mockRouterReplace).toHaveBeenCalledWith('/');
  });

  it('alerts and stays put when the save fails', async () => {
    const alertSpy = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
    mockUpdateDoc.mockRejectedValueOnce(new Error('offline'));

    const utils = render(<NameScreen />);
    await typeAndContinue(utils, 'Maya');

    expect(alertSpy).toHaveBeenCalledWith(
      "We couldn't save your name",
      'Check your connection and try again.',
    );
    expect(mockRouterReplace).not.toHaveBeenCalled();
    alertSpy.mockRestore();
  });
});
