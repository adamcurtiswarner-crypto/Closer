jest.mock('react-i18next', () => {
  const en = require('../i18n/locales/en.json');
  const translate = (key: string, opts?: Record<string, unknown>) => {
    const value = key
      .split('.')
      .reduce((acc: any, part: string) => (acc == null ? acc : acc[part]), en);
    if (typeof value !== 'string') return key;
    return value.replace(/\{\{(\w+)\}\}/g, (_m: string, name: string) =>
      String(opts?.[name] ?? '')
    );
  };
  return { useTranslation: () => ({ t: translate }) };
});

import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { NotificationPrePrompt } from '../components/NotificationPrePrompt';

describe('NotificationPrePrompt', () => {
  const defaultProps = {
    visible: true,
    partnerName: 'Sam',
    onAccept: jest.fn(),
    onDismiss: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders the brand copy with the partner name', () => {
    const { getByText } = render(<NotificationPrePrompt {...defaultProps} />);
    expect(getByText('Know the moment they answer')).toBeTruthy();
    expect(
      getByText(
        "We'll only nudge when it matters — when Sam answers, and when a new question is ready."
      )
    ).toBeTruthy();
  });

  it('fires onAccept from the primary pill', () => {
    const { getByText } = render(<NotificationPrePrompt {...defaultProps} />);
    fireEvent.press(getByText('Turn on notifications'));
    expect(defaultProps.onAccept).toHaveBeenCalledTimes(1);
  });

  it('fires onDismiss from the ghost action', () => {
    const { getByText } = render(<NotificationPrePrompt {...defaultProps} />);
    fireEvent.press(getByText('Not now'));
    expect(defaultProps.onDismiss).toHaveBeenCalledTimes(1);
  });

  it('renders nothing when not visible', () => {
    const { queryByText } = render(
      <NotificationPrePrompt {...defaultProps} visible={false} />
    );
    expect(queryByText('Know the moment they answer')).toBeNull();
  });
});
