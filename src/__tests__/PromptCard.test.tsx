import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { PromptCard } from '../components/PromptCard';

describe('PromptCard', () => {
  const defaultProps = {
    promptText: 'What made you smile today?',
    promptType: 'appreciation_expression',
  };

  it('renders prompt text', () => {
    const { getByText } = render(<PromptCard {...defaultProps} />);
    expect(getByText('What made you smile today?')).toBeTruthy();
  });

  it('renders hint when provided', () => {
    const { getByText } = render(
      <PromptCard {...defaultProps} promptHint="Think of small moments" />
    );
    expect(getByText('Think of small moments')).toBeTruthy();
  });

  it('does not render hint when null', () => {
    const { queryByText } = render(
      <PromptCard {...defaultProps} promptHint={null} />
    );
    expect(queryByText('Think of small moments')).toBeNull();
  });

  it('renders respond button and handles press', () => {
    const onRespond = jest.fn();
    const { getByText } = render(
      <PromptCard {...defaultProps} onRespond={onRespond} />
    );
    const button = getByText('Respond');
    fireEvent.press(button);
    expect(onRespond).toHaveBeenCalledTimes(1);
  });

  it('hides respond button when showRespondButton is false', () => {
    const { queryByText } = render(
      <PromptCard
        {...defaultProps}
        onRespond={() => {}}
        showRespondButton={false}
      />
    );
    expect(queryByText('Respond')).toBeNull();
  });
});
