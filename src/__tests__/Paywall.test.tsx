jest.mock('@/services/analytics', () => ({ logEvent: jest.fn() }));

import React from 'react';
import { render, fireEvent, act } from '@testing-library/react-native';
import { Paywall } from '../components/Paywall';
import { logEvent } from '@/services/analytics';

jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, opts?: Record<string, unknown>) => {
      const en = require('../i18n/locales/en.json');
      const value = key
        .split('.')
        .reduce<unknown>((acc, part) => (acc as Record<string, unknown>)?.[part], en);
      if (typeof value !== 'string') return key;
      return value.replace(/\{\{(\w+)\}\}/g, (_, name: string) =>
        String(opts?.[name] ?? '')
      );
    },
  }),
}));

jest.mock('@/components/Icon', () => {
  const { View } = require('react-native');
  return { Icon: (props: Record<string, unknown>) => <View {...props} /> };
});

jest.mock('@/components/ToneShapes', () => {
  const { View } = require('react-native');
  return { ToneShapes: (props: Record<string, unknown>) => <View {...props} /> };
});

const mockUseSubscription = jest.fn();
jest.mock('@/hooks/useSubscription', () => ({
  useSubscription: () => mockUseSubscription(),
}));

const annualPackage = { identifier: '$rc_annual', product: { priceString: '$49.99' } };
const monthlyPackage = { identifier: '$rc_monthly', product: { priceString: '$9.99' } };

function subscriptionState(overrides: Record<string, unknown> = {}) {
  return {
    isPremium: false,
    isLoading: false,
    offering: null,
    offeringError: false,
    refreshOffering: jest.fn(),
    purchase: jest.fn(),
    restore: jest.fn(),
    ...overrides,
  };
}

function loadedState(overrides: Record<string, unknown> = {}) {
  return subscriptionState({
    offering: { annual: annualPackage, monthly: monthlyPackage },
    ...overrides,
  });
}

describe('Paywall', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('loading state (offering not yet available)', () => {
    it('renders skeleton placeholders instead of prices or a washed CTA', () => {
      mockUseSubscription.mockReturnValue(subscriptionState());
      const { getByTestId, queryByText } = render(
        <Paywall visible onClose={jest.fn()} />
      );

      expect(getByTestId('paywall-plans-loading')).toBeTruthy();
      expect(getByTestId('paywall-cta-loading')).toBeTruthy();
      expect(queryByText('Try 14 days free')).toBeNull();
      expect(queryByText(/\$49\.99/)).toBeNull();
      expect(queryByText(/\$9\.99/)).toBeNull();
    });

    it('keeps restore purchases and not now available', () => {
      mockUseSubscription.mockReturnValue(subscriptionState());
      const { getByText } = render(<Paywall visible onClose={jest.fn()} />);

      expect(getByText('Restore purchases')).toBeTruthy();
      expect(getByText('Not now')).toBeTruthy();
    });

    it('falls into the failure state after the 8s timeout', () => {
      mockUseSubscription.mockReturnValue(subscriptionState());
      const { getByTestId, getByText, queryByTestId } = render(
        <Paywall visible onClose={jest.fn()} />
      );

      expect(queryByTestId('paywall-error')).toBeNull();

      act(() => {
        jest.advanceTimersByTime(8000);
      });

      expect(getByTestId('paywall-error')).toBeTruthy();
      expect(getByText("Plans aren't loading right now.")).toBeTruthy();
      expect(queryByTestId('paywall-plans-loading')).toBeNull();
    });
  });

  describe('loaded state', () => {
    it('renders the trial CTA with subline and package prices', () => {
      mockUseSubscription.mockReturnValue(loadedState());
      const { getByText, queryByTestId } = render(
        <Paywall visible onClose={jest.fn()} />
      );

      expect(getByText('Try 14 days free')).toBeTruthy();
      expect(getByText('then $49.99/year, cancel anytime')).toBeTruthy();
      expect(getByText('$49.99/year')).toBeTruthy();
      expect(getByText('$9.99/month')).toBeTruthy();
      expect(getByText('Billed monthly')).toBeTruthy();
      expect(
        getByText('One subscription covers you both. Your partner unlocks automatically.')
      ).toBeTruthy();
      expect(queryByTestId('paywall-plans-loading')).toBeNull();
      expect(queryByTestId('paywall-error')).toBeNull();
    });

    it('falls back to constant prices when the package has no priceString', () => {
      mockUseSubscription.mockReturnValue(
        loadedState({ offering: { annual: { product: {} }, monthly: null } })
      );
      const { getByText } = render(<Paywall visible onClose={jest.fn()} />);

      expect(getByText('$49.99/year')).toBeTruthy();
      expect(getByText('$9.99/month')).toBeTruthy();
    });

    it('updates the subline when the monthly plan is selected', () => {
      mockUseSubscription.mockReturnValue(loadedState());
      const { getByText } = render(<Paywall visible onClose={jest.fn()} />);

      fireEvent.press(getByText('$9.99/month'));
      expect(getByText('then $9.99/month, cancel anytime')).toBeTruthy();
    });

    it('purchases the selected package on CTA press', () => {
      const state = loadedState();
      mockUseSubscription.mockReturnValue(state);
      const { getByText } = render(<Paywall visible onClose={jest.fn()} />);

      fireEvent.press(getByText('Try 14 days free'));
      expect(state.purchase).toHaveBeenCalledWith(annualPackage);
    });

    it('triggers restore on restore press', () => {
      const state = loadedState();
      mockUseSubscription.mockReturnValue(state);
      const { getByText } = render(<Paywall visible onClose={jest.fn()} />);

      fireEvent.press(getByText('Restore purchases'));
      expect(state.restore).toHaveBeenCalled();
    });

    it('calls onClose from not now', () => {
      mockUseSubscription.mockReturnValue(loadedState());
      const onClose = jest.fn();
      const { getByText } = render(<Paywall visible onClose={onClose} />);

      fireEvent.press(getByText('Not now'));
      expect(onClose).toHaveBeenCalled();
    });
  });

  describe('analytics', () => {
    it('logs paywall_shown with its source when presented', () => {
      mockUseSubscription.mockReturnValue(loadedState());
      render(<Paywall visible onClose={jest.fn()} source="pairing_complete" />);

      expect(logEvent).toHaveBeenCalledWith('paywall_shown', {
        source: 'pairing_complete',
      });
    });

    it('does not log paywall_shown while hidden', () => {
      mockUseSubscription.mockReturnValue(loadedState());
      render(<Paywall visible={false} onClose={jest.fn()} source="follow_up" />);

      expect(logEvent).not.toHaveBeenCalled();
    });

    it('logs paywall_dismissed on not now and still closes', () => {
      mockUseSubscription.mockReturnValue(loadedState());
      const onClose = jest.fn();
      const { getByText } = render(
        <Paywall visible onClose={onClose} source="explore_send" />
      );

      fireEvent.press(getByText('Not now'));
      expect(logEvent).toHaveBeenCalledWith('paywall_dismissed', {
        source: 'explore_send',
      });
      expect(onClose).toHaveBeenCalled();
    });
  });

  describe('failure state', () => {
    it('shows the quiet error message with retry and keeps restore visible', () => {
      const state = subscriptionState({ offeringError: true });
      mockUseSubscription.mockReturnValue(state);
      const { getByTestId, getByText, queryByText, queryByTestId } = render(
        <Paywall visible onClose={jest.fn()} />
      );

      expect(getByTestId('paywall-error')).toBeTruthy();
      expect(getByText("Plans aren't loading right now.")).toBeTruthy();
      expect(getByText('Restore purchases')).toBeTruthy();
      expect(queryByText('Try 14 days free')).toBeNull();
      expect(queryByTestId('paywall-cta-loading')).toBeNull();

      fireEvent.press(getByText('Try again'));
      expect(state.refreshOffering).toHaveBeenCalled();
    });
  });
});
