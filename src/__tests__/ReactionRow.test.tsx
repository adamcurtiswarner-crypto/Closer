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

  it('exposes each reaction to VoiceOver with its visible caption', () => {
    const { getByLabelText } = render(<ReactionRow {...defaultProps} />);
    for (const label of ['Love', 'Spark', 'Smile', 'Moved']) {
      const button = getByLabelText(label);
      expect(button).toBeTruthy();
      expect(button.props.accessibilityRole).toBe('button');
    }
  });

  it('marks the selected reaction in accessibilityState', () => {
    const { getByLabelText } = render(
      <ReactionRow {...defaultProps} myReaction="fire" />
    );
    expect(getByLabelText('Spark').props.accessibilityState).toMatchObject({ selected: true });
    expect(getByLabelText('Love').props.accessibilityState).toMatchObject({ selected: false });
  });

  it('reports the tapped reaction through onReact', () => {
    const onReact = jest.fn();
    const { getByLabelText } = render(
      <ReactionRow {...defaultProps} onReact={onReact} />
    );
    fireEvent.press(getByLabelText('Love'));
    expect(onReact).toHaveBeenCalledWith('heart');
  });

  it('toggles off when the current reaction is tapped again', () => {
    const onReact = jest.fn();
    const { getByLabelText } = render(
      <ReactionRow {...defaultProps} myReaction="heart" onReact={onReact} />
    );
    fireEvent.press(getByLabelText('Love'));
    expect(onReact).toHaveBeenCalledWith(null);
  });

  it('ignores taps when disabled', () => {
    const onReact = jest.fn();
    const { getByLabelText } = render(
      <ReactionRow {...defaultProps} onReact={onReact} disabled />
    );
    fireEvent.press(getByLabelText('Love'));
    expect(onReact).not.toHaveBeenCalled();
  });

  it('shows the partner reaction as a warm sentence with their name', () => {
    const { getByLabelText, getByText } = render(
      <ReactionRow {...defaultProps} partnerReaction="fire" partnerName="Alex" />
    );
    expect(getByLabelText('Alex felt the spark')).toBeTruthy();
    expect(getByText('Alex felt the spark')).toBeTruthy();
  });

  it('falls back to "your partner" when no name is available', () => {
    const { getByText } = render(
      <ReactionRow {...defaultProps} partnerReaction="heart" />
    );
    expect(getByText('your partner loved this')).toBeTruthy();
  });

  it('shows a visible caption under every reaction', () => {
    const { getByText } = render(<ReactionRow {...defaultProps} />);
    for (const caption of ['Love', 'Spark', 'Smile', 'Moved']) {
      expect(getByText(caption)).toBeTruthy();
    }
  });

  it('shows the eyebrow naming whose answer the reactions belong to', () => {
    const { getByText } = render(
      <ReactionRow {...defaultProps} partnerName="Alex" />
    );
    expect(getByText("React to Alex's answer")).toBeTruthy();
  });

  it('eyebrow falls back to "your partner" when no name is available', () => {
    const { getByText } = render(<ReactionRow {...defaultProps} />);
    expect(getByText("React to your partner's answer")).toBeTruthy();
  });
});
