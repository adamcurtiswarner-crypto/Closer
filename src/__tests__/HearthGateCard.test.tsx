jest.mock('@/services/analytics', () => ({ logEvent: jest.fn() }));
jest.mock('@/components/Icon', () => ({ Icon: () => null }));

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

import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { HearthGateCard } from '../components/HearthGateCard';
import { logEvent } from '@/services/analytics';

describe('HearthGateCard', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders the quiet gate copy — history and trends only', () => {
    const { getByText } = render(<HearthGateCard onSeePremium={jest.fn()} />);

    expect(getByText('Your full history lives in Premium')).toBeTruthy();
    expect(getByText(/Past months and your trends are kept for you in Premium/)).toBeTruthy();
  });

  it('never claims the couch queue is gated — the current-month queue is free', () => {
    const en = require('../i18n/locales/en.json');
    expect(en.gates.hearthBody).not.toMatch(/couch queue/i);
    expect(en.gates.hearthTitle).not.toMatch(/couch queue/i);
  });

  it('opens the paywall from the button', () => {
    const onSeePremium = jest.fn();
    const { getByTestId } = render(<HearthGateCard onSeePremium={onSeePremium} />);

    fireEvent.press(getByTestId('hearth-gate-cta'));
    expect(onSeePremium).toHaveBeenCalledTimes(1);
  });

  it('logs gate_hit for the hearth_history surface once on mount', () => {
    render(<HearthGateCard onSeePremium={jest.fn()} />);

    expect(logEvent).toHaveBeenCalledWith('gate_hit', { surface: 'hearth_history' });
    expect(logEvent).toHaveBeenCalledTimes(1);
  });
});
