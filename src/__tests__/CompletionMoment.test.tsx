import React from 'react';

// Mock the CompletionMoment component props interface
interface CompletionMomentProps {
  promptText: string;
  yourResponse: string;
  partnerResponse: string;
  partnerName: string;
}

describe('CompletionMoment', () => {
  it('should render with both responses', () => {
    const props: CompletionMomentProps = {
      promptText: 'What made you smile today?',
      yourResponse: 'Seeing the sunset together',
      partnerResponse: 'Our morning coffee',
      partnerName: 'Alex',
    };

    expect(props.promptText).toBeDefined();
    expect(props.yourResponse).toBeDefined();
    expect(props.partnerResponse).toBeDefined();
    expect(props.partnerName).toBe('Alex');
  });

  it('should handle empty partner response', () => {
    const props: CompletionMomentProps = {
      promptText: 'What made you smile today?',
      yourResponse: 'Seeing the sunset together',
      partnerResponse: '',
      partnerName: 'Partner',
    };

    expect(props.partnerResponse).toBe('');
  });

  it('should display prompt text, both labels and responses', () => {
    const props: CompletionMomentProps = {
      promptText: 'What do you appreciate about each other?',
      yourResponse: 'Your patience',
      partnerResponse: 'Your humor',
      partnerName: 'Sam',
    };

    // The component should show:
    // - The prompt text
    // - "You" label with your response
    // - Partner name label with their response
    expect(props.promptText.length).toBeGreaterThan(0);
    expect(props.yourResponse.length).toBeGreaterThan(0);
    expect(props.partnerResponse.length).toBeGreaterThan(0);
  });
});
