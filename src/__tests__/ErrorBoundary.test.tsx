import React from 'react';
import { render } from '@testing-library/react-native';
import { Text } from 'react-native';
import { ErrorBoundary } from '../components/ErrorBoundary';

function ProblemChild(): React.JSX.Element {
  throw new Error('Test error');
}

function GoodChild() {
  return <Text>All good</Text>;
}

describe('ErrorBoundary', () => {
  // Suppress console.error for expected errors in tests
  const originalError = console.error;
  beforeAll(() => {
    console.error = jest.fn();
  });
  afterAll(() => {
    console.error = originalError;
  });

  it('renders children when no error', () => {
    const { getByText } = render(
      <ErrorBoundary>
        <GoodChild />
      </ErrorBoundary>
    );
    expect(getByText('All good')).toBeTruthy();
  });

  it('renders error UI when child throws', () => {
    const { getByText } = render(
      <ErrorBoundary>
        <ProblemChild />
      </ErrorBoundary>
    );
    expect(getByText('Something went wrong')).toBeTruthy();
    expect(getByText('Test error')).toBeTruthy();
    expect(getByText('Try Again')).toBeTruthy();
  });

  it('renders custom fallback when provided', () => {
    const fallback = <Text>Custom fallback</Text>;
    const { getByText } = render(
      <ErrorBoundary fallback={fallback}>
        <ProblemChild />
      </ErrorBoundary>
    );
    expect(getByText('Custom fallback')).toBeTruthy();
  });
});
