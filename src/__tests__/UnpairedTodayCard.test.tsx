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
import { UnpairedTodayCard } from '../components/UnpairedTodayCard';

describe('UnpairedTodayCard', () => {
  const defaultProps = {
    onInvite: jest.fn(),
    onBrowse: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('tells the truth about needing a partner', () => {
    const { getByText } = render(<UnpairedTodayCard {...defaultProps} />);
    expect(getByText('One more person')).toBeTruthy();
    expect(getByText('Stoke needs both of you')).toBeTruthy();
    expect(getByText('Daily questions unlock when your partner joins.')).toBeTruthy();
  });

  it('renders the invite CTA and fires onInvite', () => {
    const { getByText } = render(<UnpairedTodayCard {...defaultProps} />);
    fireEvent.press(getByText('Invite your partner'));
    expect(defaultProps.onInvite).toHaveBeenCalledTimes(1);
  });

  it('offers browsing questions as the quiet secondary path', () => {
    const { getByText } = render(<UnpairedTodayCard {...defaultProps} />);
    fireEvent.press(getByText('Browse questions'));
    expect(defaultProps.onBrowse).toHaveBeenCalledTimes(1);
  });
});
