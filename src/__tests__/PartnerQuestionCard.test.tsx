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

import { PartnerQuestionCard } from '../components/PartnerQuestionCard';

describe('PartnerQuestionCard', () => {
  it('shows the eyebrow and the question text for a single waiting question', () => {
    const { getByText } = render(
      <PartnerQuestionCard
        partnerName="Jordan"
        promptText="What made you smile today?"
        questionCount={1}
        onPress={jest.fn()}
      />
    );
    // Eyebrow copy is sentence case in i18n; the eyebrow style uppercases it
    expect(getByText('From Jordan')).toBeTruthy();
    expect(getByText('What made you smile today?')).toBeTruthy();
  });

  it('collapses multiple questions into a quiet count line', () => {
    const { getByText, queryByText } = render(
      <PartnerQuestionCard
        partnerName="Jordan"
        promptText="What made you smile today?"
        questionCount={3}
        onPress={jest.fn()}
      />
    );
    expect(getByText('3 questions waiting')).toBeTruthy();
    expect(queryByText('What made you smile today?')).toBeNull();
  });

  it('fires onPress from the card', () => {
    const onPress = jest.fn();
    const { getByText } = render(
      <PartnerQuestionCard
        partnerName="Jordan"
        promptText="Q?"
        questionCount={1}
        onPress={onPress}
      />
    );
    fireEvent.press(getByText('Q?'));
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('renders nothing when no questions are waiting', () => {
    const { queryByText } = render(
      <PartnerQuestionCard
        partnerName="Jordan"
        promptText=""
        questionCount={0}
        onPress={jest.fn()}
      />
    );
    expect(queryByText('From Jordan')).toBeNull();
  });
});
