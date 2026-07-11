import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';

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

import { OpenDayChip, openDayChipState } from '../components/OpenDayChip';

const baseProps = {
  partnerName: 'Jordan',
  onOpenResponding: jest.fn(),
  onOpenReveal: jest.fn(),
};

describe('openDayChipState (chip state machine)', () => {
  it('completed → reveal', () => {
    expect(
      openDayChipState({ iAnswered: true, partnerAnswered: true, isComplete: true })
    ).toBe('reveal');
  });

  it('I answered, partner pending → sealed', () => {
    expect(
      openDayChipState({ iAnswered: true, partnerAnswered: false, isComplete: false })
    ).toBe('sealed');
  });

  it('partner answered, waiting on me → open', () => {
    expect(
      openDayChipState({ iAnswered: false, partnerAnswered: true, isComplete: false })
    ).toBe('open');
  });

  it('neither answered → null (nothing honest to say)', () => {
    expect(
      openDayChipState({ iAnswered: false, partnerAnswered: false, isComplete: false })
    ).toBe(null);
  });
});

describe('OpenDayChip', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('sealed state: static line with the partner name, non-interactive', () => {
    const { getByText, getByTestId, queryByTestId } = render(
      <OpenDayChip
        {...baseProps}
        iAnswered={true}
        partnerAnswered={false}
        isComplete={false}
      />
    );
    expect(getByText('Yesterday · sealed until Jordan answers')).toBeTruthy();
    expect(getByTestId('open-day-chip-sealed')).toBeTruthy();
    // Not a button — pressing must do nothing
    expect(queryByTestId('open-day-chip-open')).toBeNull();
    fireEvent.press(getByText('Yesterday · sealed until Jordan answers'));
    expect(baseProps.onOpenResponding).not.toHaveBeenCalled();
    expect(baseProps.onOpenReveal).not.toHaveBeenCalled();
  });

  it('open state: tappable row routes into the responding flow', () => {
    const { getByText, getByTestId } = render(
      <OpenDayChip
        {...baseProps}
        iAnswered={false}
        partnerAnswered={true}
        isComplete={false}
      />
    );
    expect(getByText("Yesterday's question is still open")).toBeTruthy();
    const row = getByTestId('open-day-chip-open');
    expect(row.props.accessibilityRole).toBe('button');
    fireEvent.press(row);
    expect(baseProps.onOpenResponding).toHaveBeenCalledTimes(1);
    expect(baseProps.onOpenReveal).not.toHaveBeenCalled();
  });

  it('reveal state: tappable row opens the finished day', () => {
    const { getByText, getByTestId } = render(
      <OpenDayChip
        {...baseProps}
        iAnswered={true}
        partnerAnswered={true}
        isComplete={true}
      />
    );
    expect(getByText('Yesterday · you both answered — see it')).toBeTruthy();
    const row = getByTestId('open-day-chip-reveal');
    expect(row.props.accessibilityRole).toBe('button');
    fireEvent.press(row);
    expect(baseProps.onOpenReveal).toHaveBeenCalledTimes(1);
    expect(baseProps.onOpenResponding).not.toHaveBeenCalled();
  });

  it('renders nothing when there is no state to speak to', () => {
    const { toJSON } = render(
      <OpenDayChip
        {...baseProps}
        iAnswered={false}
        partnerAnswered={false}
        isComplete={false}
      />
    );
    expect(toJSON()).toBeNull();
  });

  it('every state carries an accessibility label', () => {
    const sealed = render(
      <OpenDayChip {...baseProps} iAnswered partnerAnswered={false} isComplete={false} />
    );
    expect(
      sealed.getByTestId('open-day-chip-sealed').props.accessibilityLabel
    ).toBe('Yesterday · sealed until Jordan answers');

    const open = render(
      <OpenDayChip {...baseProps} iAnswered={false} partnerAnswered isComplete={false} />
    );
    expect(open.getByTestId('open-day-chip-open').props.accessibilityLabel).toBe(
      "Yesterday's question is still open"
    );

    const reveal = render(
      <OpenDayChip {...baseProps} iAnswered partnerAnswered isComplete />
    );
    expect(reveal.getByTestId('open-day-chip-reveal').props.accessibilityLabel).toBe(
      'Yesterday · you both answered — see it'
    );
  });
});
