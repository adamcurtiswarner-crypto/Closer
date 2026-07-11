/**
 * Privacy & Data rows on the Profile screen:
 * - both rows carry explanatory subtitles (export vs anonymize confusion)
 * - the anonymize label uses the destructive color (matches delete account)
 * - the export handler shares the readable document first, JSON under a
 *   divider, titled "Stoke export"
 * - the anonymize confirmation copy states irreversibility plainly
 */
import React from 'react';
import { Share, StyleSheet } from 'react-native';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { colors } from '@/config/theme';
import { RAW_JSON_DIVIDER } from '@/utils/exportShare';

// ─── Mocks ───

jest.mock('expo-router', () => ({
  router: { push: jest.fn(), replace: jest.fn() },
}));

jest.mock('react-native-safe-area-context', () => {
  const { View } = require('react-native');
  return { SafeAreaView: View };
});

jest.mock('firebase/firestore', () => ({
  doc: jest.fn(),
  updateDoc: jest.fn(),
  serverTimestamp: jest.fn(),
}));

jest.mock('@/config/firebase', () => ({ db: {}, functions: {} }));
jest.mock('@/utils/logger', () => ({ logger: { error: jest.fn(), warn: jest.fn() } }));

jest.mock('expo-constants', () => ({
  __esModule: true,
  default: { expoConfig: { version: '1.0.0' } },
}));

jest.mock('@/components', () => ({
  PartnershipSection: () => null,
  Icon: () => null,
}));
jest.mock('@/components/ProfileCard', () => ({ ProfileCard: () => null }));
jest.mock('@/components/Paywall', () => ({ Paywall: () => null }));
jest.mock('@/components/ReauthModal', () => ({ ReauthModal: () => null }));

jest.mock('@/config/app', () => ({
  getSupportEmailUrl: jest.fn(() => 'mailto:support@example.com'),
  SUPPORT_EMAIL: 'support@example.com',
}));

jest.mock('@/hooks/useAuth', () => ({
  useAuth: () => ({
    user: { id: 'user-1', remindToRespond: true, notifyPartnerResponse: true },
    signOut: jest.fn(),
    refreshUser: jest.fn(),
  }),
}));

jest.mock('@/hooks/useCouple', () => ({
  useCouple: () => ({ data: { promptFrequency: 'daily' } }),
  useUpdatePromptFrequency: () => ({ mutateAsync: jest.fn(), isPending: false }),
}));

jest.mock('@/hooks/useSubscription', () => ({
  useSubscription: () => ({ isPremium: false }),
}));

jest.mock('@/hooks/useCalendar', () => ({
  useCalendarSync: () => ({
    synced: false,
    sync: { mutate: jest.fn(), isPending: false },
    remove: { mutate: jest.fn(), isPending: false },
  }),
}));

jest.mock('@/hooks/useBiometricAuth', () => ({
  useBiometricAuth: () => ({
    isBiometricAvailable: false,
    isBiometricEnabled: false,
    biometricType: null,
    enableBiometric: jest.fn(),
    disableBiometric: jest.fn(),
  }),
}));

const mockExportMutateAsync = jest.fn();
jest.mock('@/hooks/usePrivacy', () => ({
  useDeleteAccount: () => ({ mutateAsync: jest.fn(), isPending: false }),
  useExportData: () => ({ mutateAsync: mockExportMutateAsync, isPending: false }),
  useAnonymizeResponses: () => ({ mutateAsync: jest.fn(), isPending: false }),
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

import SettingsScreen from '../../app/(app)/settings';

const READABLE = 'Your Stoke export — July 11, 2026\n\nName: Adam';
const RAW = { profile: { email: 'adam@example.com' } };

describe('Privacy & Data rows', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockExportMutateAsync.mockResolvedValue({
      exported_at: '2026-07-11T00:00:00.000Z',
      readable: READABLE,
      raw: RAW,
    });
  });

  it('shows the export row with its subtitle', () => {
    const { getByText } = render(<SettingsScreen />);
    getByText('Export my data');
    getByText("A copy of everything you've written");
  });

  it('shows the anonymize row with its irreversibility subtitle', () => {
    const { getByText } = render(<SettingsScreen />);
    getByText('Anonymize my responses');
    getByText('Permanently removes your words. Cannot be undone.');
  });

  it('styles the anonymize label in the destructive color, like delete account', () => {
    const { getByText } = render(<SettingsScreen />);
    const anonymizeLabel = getByText('Anonymize my responses');
    const deleteLabel = getByText('Delete account');

    const anonymizeStyle = StyleSheet.flatten(anonymizeLabel.props.style);
    const deleteStyle = StyleSheet.flatten(deleteLabel.props.style);
    expect(anonymizeStyle.color).toBe(colors.semantic.destructive);
    expect(anonymizeStyle.color).toBe(deleteStyle.color);
  });

  it('shares the readable document first with the JSON copy under the divider', async () => {
    const shareSpy = jest.spyOn(Share, 'share').mockResolvedValue({ action: 'sharedAction' } as any);
    const { getByText } = render(<SettingsScreen />);

    fireEvent.press(getByText('Export my data'));

    await waitFor(() => expect(shareSpy).toHaveBeenCalledTimes(1));
    const [content, options] = shareSpy.mock.calls[0];
    expect(content.title).toBe('Stoke export');
    expect(options).toEqual({ subject: 'Stoke export' });
    expect(content.message!.startsWith(READABLE)).toBe(true);
    expect(content.message).toContain(RAW_JSON_DIVIDER);
    expect(content.message).toContain('adam@example.com');
  });

  it('states irreversibility plainly in the anonymize confirmation modal', () => {
    const { getByText } = render(<SettingsScreen />);
    fireEvent.press(getByText('Anonymize my responses'));

    getByText('Anonymize your responses');
    const en = require('../i18n/locales/en.json');
    expect(en.settings.anonymizeBody).toContain('cannot be recovered');
    expect(en.settings.anonymizeBody).toContain('This cannot be undone.');
    getByText(en.settings.anonymizeBody);
  });
});
