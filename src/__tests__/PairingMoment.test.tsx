import React from 'react';
import { render, fireEvent, act } from '@testing-library/react-native';

// ─── Mocks ───

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

import { PairingMoment } from '../components/PairingMoment';
import { hapticNotification } from '@utils/haptics';

describe('PairingMoment', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('shows both first names and the fire line', () => {
    const { getByText } = render(
      <PairingMoment myName="Adam Warner" partnerName="Jess Lee" onDone={jest.fn()} />
    );
    expect(getByText('Adam & Jess')).toBeTruthy();
    expect(getByText('The fire is lit.')).toBeTruthy();
  });

  it('falls back to "You & your partner" when names are missing', () => {
    const { getByText } = render(<PairingMoment onDone={jest.fn()} />);
    expect(getByText('You & your partner')).toBeTruthy();
  });

  it('uses "You" with the partner name when only theirs is known', () => {
    const { getByText } = render(
      <PairingMoment partnerName="Sam Field" onDone={jest.fn()} />
    );
    expect(getByText('You & Sam')).toBeTruthy();
  });

  it('treats whitespace-only names as missing', () => {
    const { getByText } = render(
      <PairingMoment myName="   " partnerName="" onDone={jest.fn()} />
    );
    expect(getByText('You & your partner')).toBeTruthy();
  });

  it('fires exactly one Success haptic on mount', () => {
    render(<PairingMoment onDone={jest.fn()} />);
    expect(hapticNotification).toHaveBeenCalledTimes(1);
    expect(hapticNotification).toHaveBeenCalledWith('success');
  });

  it('shows the quiet tap affordance line', () => {
    const { getByText } = render(<PairingMoment onDone={jest.fn()} />);
    expect(getByText('Tap to continue')).toBeTruthy();
  });

  it('WAITS for the tap — the old 2.5s beat passes without advancing', () => {
    const onDone = jest.fn();
    render(<PairingMoment onDone={onDone} />);

    // The live two-sim rerun showed 2.5s made the moment missable entirely.
    act(() => {
      jest.advanceTimersByTime(9999);
    });
    expect(onDone).not.toHaveBeenCalled();
  });

  it('the 10s fallback advances exactly once if nobody taps', () => {
    const onDone = jest.fn();
    render(<PairingMoment onDone={onDone} />);

    act(() => {
      jest.advanceTimersByTime(10000);
    });
    expect(onDone).toHaveBeenCalledTimes(1);

    act(() => {
      jest.advanceTimersByTime(20000);
    });
    expect(onDone).toHaveBeenCalledTimes(1);
  });

  it('advances on tap and does not double-fire when the fallback lands', () => {
    const onDone = jest.fn();
    const { getByTestId } = render(<PairingMoment onDone={onDone} />);

    fireEvent.press(getByTestId('pairing-moment'));
    expect(onDone).toHaveBeenCalledTimes(1);

    act(() => {
      jest.advanceTimersByTime(20000);
    });
    expect(onDone).toHaveBeenCalledTimes(1);
  });

  it('does not advance after unmount', () => {
    const onDone = jest.fn();
    const { unmount } = render(<PairingMoment onDone={onDone} />);
    unmount();
    act(() => {
      jest.advanceTimersByTime(20000);
    });
    expect(onDone).not.toHaveBeenCalled();
  });
});
