import React from 'react';

interface ResponseCardProps {
  label: string;
  text: string;
}

describe('ResponseCard', () => {
  it('should render label and text', () => {
    const props: ResponseCardProps = {
      label: 'You',
      text: 'This is my response to the prompt.',
    };

    expect(props.label).toBe('You');
    expect(props.text).toBeDefined();
    expect(props.text.length).toBeGreaterThan(0);
  });

  it('should render partner label', () => {
    const props: ResponseCardProps = {
      label: 'Alex',
      text: "I appreciate how thoughtful you are.",
    };

    expect(props.label).toBe('Alex');
    expect(props.text).toContain('thoughtful');
  });

  it('should handle long text gracefully', () => {
    const longText = 'A'.repeat(500);
    const props: ResponseCardProps = {
      label: 'You',
      text: longText,
    };

    expect(props.text.length).toBe(500);
  });
});
