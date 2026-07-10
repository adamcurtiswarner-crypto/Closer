import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { ScalePromptCard } from '../components/ScalePromptCard';
import type { ScaleConfig } from '../types';

// ScaleSlider fires a light haptic per value change
jest.mock('@utils/haptics', () => ({
  hapticImpact: jest.fn(),
  hapticNotification: jest.fn(),
  ImpactFeedbackStyle: { Light: 'light', Medium: 'medium', Heavy: 'heavy' },
  NotificationFeedbackType: { Success: 'success' },
}));

// Resolve t() against the real en.json so tests assert shipped copy;
// missing keys return the key itself (i18next's default behavior).
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

describe('ScalePromptCard', () => {
  const scaleConfig: ScaleConfig = {
    min: 1,
    max: 10,
    lowThreshold: 4,
    highThreshold: 9,
    divergenceGap: 4,
    minLabel: 'Struggling',
    maxLabel: 'Thriving',
  };

  const defaultProps = {
    promptText: 'How connected did you feel to each other this week?',
    scaleConfig,
    value: null as number | null,
    onChangeValue: jest.fn(),
    note: '',
    onChangeNote: jest.fn(),
    onSubmit: jest.fn(),
    isPending: false,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders the prompt text', () => {
    const { getByText } = render(<ScalePromptCard {...defaultProps} />);
    expect(getByText('How connected did you feel to each other this week?')).toBeTruthy();
  });

  it('renders the slider instead of a free-text response flow', () => {
    const { getByTestId, queryByPlaceholderText } = render(
      <ScalePromptCard {...defaultProps} />
    );
    expect(getByTestId('scale-slider')).toBeTruthy();
    // No text-flow share input — only the optional note
    expect(queryByPlaceholderText('Share what comes to mind...')).toBeNull();
  });

  it('renders anchored end labels from scale config', () => {
    const { getByText } = render(<ScalePromptCard {...defaultProps} />);
    expect(getByText('Struggling')).toBeTruthy();
    expect(getByText('Thriving')).toBeTruthy();
  });

  it('renders the note field visible by default with the gentle nudge placeholder', () => {
    const { getByPlaceholderText, getByTestId } = render(
      <ScalePromptCard {...defaultProps} />
    );
    // Visible (not behind a tap) and carrying the default i18n nudge
    expect(getByTestId('scale-note-input')).toBeTruthy();
    expect(
      getByPlaceholderText("What's one moment behind that number?")
    ).toBeTruthy();
  });

  it('uses the per-category placeholder when one exists in i18n', () => {
    const { getByPlaceholderText } = render(
      <ScalePromptCard {...defaultProps} category="communication" />
    );
    expect(
      getByPlaceholderText('What conversation is behind that number?')
    ).toBeTruthy();
  });

  it('falls back to the default placeholder for categories without an override', () => {
    const { getByPlaceholderText } = render(
      <ScalePromptCard {...defaultProps} category="everyday_life" />
    );
    expect(
      getByPlaceholderText("What's one moment behind that number?")
    ).toBeTruthy();
  });

  it('the note stays optional — submit works with a score and an empty note', () => {
    const { getByTestId, queryByText } = render(
      <ScalePromptCard {...defaultProps} value={6} note="" />
    );
    fireEvent.press(getByTestId('scale-submit'));
    expect(defaultProps.onSubmit).toHaveBeenCalledTimes(1);
    // No validation nagging anywhere on the card
    expect(queryByText(/required/i)).toBeNull();
  });

  it('reports slider selection through onChangeValue', () => {
    const { getByTestId } = render(<ScalePromptCard {...defaultProps} />);
    fireEvent.press(getByTestId('scale-dot-8'));
    expect(defaultProps.onChangeValue).toHaveBeenCalledWith(8);
  });

  it('does not submit until a score is selected', () => {
    const { getByTestId } = render(<ScalePromptCard {...defaultProps} value={null} />);
    fireEvent.press(getByTestId('scale-submit'));
    expect(defaultProps.onSubmit).not.toHaveBeenCalled();
  });

  it('submits once a score is selected', () => {
    const { getByTestId } = render(<ScalePromptCard {...defaultProps} value={6} />);
    fireEvent.press(getByTestId('scale-submit'));
    expect(defaultProps.onSubmit).toHaveBeenCalledTimes(1);
  });

  it('notifies onNoteFocus when the note field gains focus', () => {
    const onNoteFocus = jest.fn();
    const { getByTestId } = render(
      <ScalePromptCard {...defaultProps} onNoteFocus={onNoteFocus} />
    );
    fireEvent(getByTestId('scale-note-input'), 'focus');
    expect(onNoteFocus).toHaveBeenCalledTimes(1);
  });

  it('renders without an onNoteFocus handler (prop is optional)', () => {
    const { getByTestId } = render(<ScalePromptCard {...defaultProps} />);
    expect(() => fireEvent(getByTestId('scale-note-input'), 'focus')).not.toThrow();
  });

  it('falls back to default 1-10 config when scaleConfig is null', () => {
    const { getByTestId, getByText } = render(
      <ScalePromptCard {...defaultProps} scaleConfig={null} />
    );
    expect(getByTestId('scale-dot-10')).toBeTruthy();
    expect(getByText('Struggling')).toBeTruthy();
    expect(getByText('Thriving')).toBeTruthy();
  });
});
