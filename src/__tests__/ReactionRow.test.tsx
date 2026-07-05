import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { ReactionRow } from '../components/ReactionRow';

jest.mock('@utils/haptics', () => ({
  hapticImpact: jest.fn(),
  hapticNotification: jest.fn(),
  ImpactFeedbackStyle: { Light: 'light', Medium: 'medium', Heavy: 'heavy' },
  NotificationFeedbackType: { Success: 'success' },
}));

// ReactionRow → useReaction pulls in firebase/firestore
jest.mock('firebase/firestore', () => ({
  collection: jest.fn(),
  doc: jest.fn(),
  getDoc: jest.fn(),
  addDoc: jest.fn(),
  updateDoc: jest.fn(),
  query: jest.fn(),
  where: jest.fn(),
  serverTimestamp: jest.fn(),
  onSnapshot: jest.fn(),
}));

jest.mock('@/config/firebase', () => ({
  db: {},
  functions: {},
}));

jest.mock('@/services/analytics', () => ({
  logEvent: jest.fn(),
}));

jest.mock('@/hooks/useAuth', () => ({
  useAuth: () => ({
    user: { id: 'user-1', coupleId: 'couple-1' },
  }),
}));

describe('ReactionRow', () => {
  const defaultProps = {
    myReaction: null,
    partnerReaction: null,
    onReact: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('exposes each reaction to VoiceOver with a named button', () => {
    const { getByLabelText } = render(<ReactionRow {...defaultProps} />);
    for (const label of ['Heart', 'Flame', 'Smile', 'Tear']) {
      const button = getByLabelText(label);
      expect(button).toBeTruthy();
      expect(button.props.accessibilityRole).toBe('button');
    }
  });

  it('marks the selected reaction in accessibilityState', () => {
    const { getByLabelText } = render(
      <ReactionRow {...defaultProps} myReaction="fire" />
    );
    expect(getByLabelText('Flame').props.accessibilityState).toMatchObject({ selected: true });
    expect(getByLabelText('Heart').props.accessibilityState).toMatchObject({ selected: false });
  });

  it('reports the tapped reaction through onReact', () => {
    const onReact = jest.fn();
    const { getByLabelText } = render(
      <ReactionRow {...defaultProps} onReact={onReact} />
    );
    fireEvent.press(getByLabelText('Heart'));
    expect(onReact).toHaveBeenCalledWith('heart');
  });

  it('toggles off when the current reaction is tapped again', () => {
    const onReact = jest.fn();
    const { getByLabelText } = render(
      <ReactionRow {...defaultProps} myReaction="heart" onReact={onReact} />
    );
    fireEvent.press(getByLabelText('Heart'));
    expect(onReact).toHaveBeenCalledWith(null);
  });

  it('ignores taps when disabled', () => {
    const onReact = jest.fn();
    const { getByLabelText } = render(
      <ReactionRow {...defaultProps} onReact={onReact} disabled />
    );
    fireEvent.press(getByLabelText('Heart'));
    expect(onReact).not.toHaveBeenCalled();
  });

  it('labels the partner reaction with the partner name and reaction noun', () => {
    const { getByLabelText } = render(
      <ReactionRow {...defaultProps} partnerReaction="fire" partnerName="Alex" />
    );
    expect(getByLabelText('Alex reacted with a flame')).toBeTruthy();
  });

  it('falls back to "Partner" when no name is available', () => {
    const { getByLabelText } = render(
      <ReactionRow {...defaultProps} partnerReaction="heart" />
    );
    expect(getByLabelText('Partner reacted with a heart')).toBeTruthy();
  });
});
