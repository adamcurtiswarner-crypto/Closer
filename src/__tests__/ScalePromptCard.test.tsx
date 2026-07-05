import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { ScalePromptCard } from '../components/ScalePromptCard';
import type { ScaleConfig } from '../types';

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

  it('renders the optional note input with the quiet placeholder', () => {
    const { getByPlaceholderText } = render(<ScalePromptCard {...defaultProps} />);
    expect(getByPlaceholderText('A sentence about why, if you want.')).toBeTruthy();
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

  it('falls back to default 1-10 config when scaleConfig is null', () => {
    const { getByTestId, getByText } = render(
      <ScalePromptCard {...defaultProps} scaleConfig={null} />
    );
    expect(getByTestId('scale-dot-10')).toBeTruthy();
    expect(getByText('Struggling')).toBeTruthy();
    expect(getByText('Thriving')).toBeTruthy();
  });
});
