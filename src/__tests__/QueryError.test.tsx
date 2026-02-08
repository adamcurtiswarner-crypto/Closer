import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { QueryError } from '../components/QueryError';

describe('QueryError', () => {
  it('renders default message', () => {
    const { getByText } = render(<QueryError />);
    expect(getByText('Something went wrong.')).toBeTruthy();
  });

  it('renders custom message', () => {
    const { getByText } = render(
      <QueryError message="Custom error message" />
    );
    expect(getByText('Custom error message')).toBeTruthy();
  });

  it('shows retry button when onRetry provided', () => {
    const onRetry = jest.fn();
    const { getByText } = render(<QueryError onRetry={onRetry} />);
    const button = getByText('Retry');
    expect(button).toBeTruthy();
    fireEvent.press(button);
    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it('hides retry button when onRetry not provided', () => {
    const { queryByText } = render(<QueryError />);
    expect(queryByText('Retry')).toBeNull();
  });
});
