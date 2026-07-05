import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import {
  FollowUpContextLine,
  FollowUpSkip,
  getFollowUpContextLine,
} from '../components/FollowUpContext';

describe('FollowUpContextLine', () => {
  it('renders the deepener context line', () => {
    const { getByText } = render(<FollowUpContextLine branch="deepener" />);
    expect(getByText('You both scored this high. One more question.')).toBeTruthy();
  });

  it('renders the repair context line', () => {
    const { getByText } = render(<FollowUpContextLine branch="repair" />);
    expect(getByText('About yesterday’s answer. Take it slow.')).toBeTruthy();
  });

  it('renders the divergence context line', () => {
    const { getByText } = render(<FollowUpContextLine branch="divergence" />);
    expect(
      getByText('You two saw this one differently. That’s information, not a problem.')
    ).toBeTruthy();
  });
});

describe('getFollowUpContextLine', () => {
  it('returns the same copy the component renders', () => {
    expect(getFollowUpContextLine('deepener')).toBe(
      'You both scored this high. One more question.'
    );
    expect(getFollowUpContextLine('repair')).toBe('About yesterday’s answer. Take it slow.');
    expect(getFollowUpContextLine('divergence')).toBe(
      'You two saw this one differently. That’s information, not a problem.'
    );
  });
});

describe('FollowUpSkip', () => {
  it('renders the quiet skip affordance', () => {
    const { getByText } = render(<FollowUpSkip onSkip={jest.fn()} />);
    expect(getByText('Skip this one')).toBeTruthy();
    expect(getByText('It’ll keep.')).toBeTruthy();
  });

  it('calls onSkip when pressed', () => {
    const onSkip = jest.fn();
    const { getByTestId } = render(<FollowUpSkip onSkip={onSkip} />);
    fireEvent.press(getByTestId('follow-up-skip'));
    expect(onSkip).toHaveBeenCalledTimes(1);
  });

  it('does not call onSkip when disabled', () => {
    const onSkip = jest.fn();
    const { getByTestId } = render(<FollowUpSkip onSkip={onSkip} disabled />);
    fireEvent.press(getByTestId('follow-up-skip'));
    expect(onSkip).not.toHaveBeenCalled();
  });
});
