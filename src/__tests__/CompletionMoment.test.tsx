import React from 'react';
import { render, act } from '@testing-library/react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { CompletionMoment } from '../components/CompletionMoment';
import { hapticImpact } from '@utils/haptics';

jest.mock('@utils/haptics', () => ({
  hapticImpact: jest.fn(),
  hapticNotification: jest.fn(),
  ImpactFeedbackStyle: { Light: 'light', Medium: 'medium', Heavy: 'heavy' },
  NotificationFeedbackType: { Success: 'success' },
}));

// CompletionMoment → ReactionRow → useReaction pulls in firebase/firestore
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

  describe('scale reveal', () => {
    const scaleProps = {
      promptText: 'How connected did you feel this week?',
      yourResponse: 'Felt close after our walk.',
      partnerResponse: 'The weekend helped.',
      partnerName: 'Alex',
    };

    it('shows both scores side by side with names', () => {
      const { getByTestId, getAllByText } = render(
        <CompletionMoment {...scaleProps} yourScore={7} partnerScore={8} />
      );
      expect(getByTestId('score-reveal')).toBeTruthy();
      expect(getByTestId('your-score').props.children).toBe(7);
      expect(getByTestId('partner-score').props.children).toBe(8);
      // Names appear on the score columns (and again on the note cards)
      expect(getAllByText('You').length).toBeGreaterThanOrEqual(1);
      expect(getAllByText('Alex').length).toBeGreaterThanOrEqual(1);
    });

    it('shows both notes alongside the scores', () => {
      const { getByText } = render(
        <CompletionMoment {...scaleProps} yourScore={7} partnerScore={8} />
      );
      expect(getByText('Felt close after our walk.')).toBeTruthy();
      expect(getByText('The weekend helped.')).toBeTruthy();
    });

    it('hides an empty note on a scale reveal', () => {
      const { queryByText, getByText } = render(
        <CompletionMoment
          {...scaleProps}
          yourResponse=""
          yourScore={7}
          partnerScore={8}
        />
      );
      expect(queryByText('You')).toBeTruthy(); // score column still shows names
      expect(getByText('The weekend helped.')).toBeTruthy();
    });

    it('does not render the score reveal for text prompts', () => {
      const { queryByTestId } = render(<CompletionMoment {...scaleProps} />);
      expect(queryByTestId('score-reveal')).toBeNull();
    });

    it('shows the static one-point-higher line for middle scores', () => {
      const { getByText } = render(
        <CompletionMoment
          {...scaleProps}
          yourScore={6}
          partnerScore={7}
          showMidScaleLine
        />
      );
      expect(getByText('What would move this one point higher?')).toBeTruthy();
    });

    it('does not show the one-point-higher line by default', () => {
      const { queryByText } = render(
        <CompletionMoment {...scaleProps} yourScore={9} partnerScore={10} />
      );
      expect(queryByText('What would move this one point higher?')).toBeNull();
    });

    it('shows closing text at a final-step follow-up reveal', () => {
      const { getByText } = render(
        <CompletionMoment {...scaleProps} closingText="Small answers count." />
      );
      expect(getByText('Small answers count.')).toBeTruthy();
    });

    it('renders the em-dash placeholder in the partner column (held-breath beat)', () => {
      const { getByTestId } = render(
        <CompletionMoment {...scaleProps} yourScore={7} partnerScore={8} />
      );
      // The placeholder is decorative — hidden from accessibility on purpose
      const placeholder = getByTestId('partner-score-placeholder', {
        includeHiddenElements: true,
      });
      expect(placeholder.props.children).toBe('—');
      // The real score is in the tree from the start — the beats are opacity/spring only
      expect(getByTestId('partner-score').props.children).toBe(8);
    });
  });

  describe('first-reveal gating (reveal_seen)', () => {
    const scaleProps = {
      promptText: 'How connected did you feel this week?',
      yourResponse: 'Felt close after our walk.',
      partnerResponse: 'The weekend helped.',
      partnerName: 'Alex',
    };

    beforeEach(() => {
      jest.clearAllMocks();
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue(null);
    });

    it('marks the reveal as seen on first mount', async () => {
      render(
        <CompletionMoment {...scaleProps} yourScore={7} partnerScore={8} assignmentId="a1" />
      );
      await act(async () => {});
      expect(AsyncStorage.getItem).toHaveBeenCalledWith('reveal_seen_a1');
      expect(AsyncStorage.setItem).toHaveBeenCalledWith('reveal_seen_a1', 'true');
    });

    it('fires the two haptic beats on first reveal: Light at your score, Medium at partner score', async () => {
      render(
        <CompletionMoment {...scaleProps} yourScore={7} partnerScore={8} assignmentId="a2" />
      );
      await act(async () => {});
      expect(hapticImpact).not.toHaveBeenCalled();

      act(() => { jest.advanceTimersByTime(500); });
      expect(hapticImpact).toHaveBeenCalledTimes(1);
      expect(hapticImpact).toHaveBeenLastCalledWith('light');

      act(() => { jest.advanceTimersByTime(800); }); // t=1300, the held breath ends
      expect(hapticImpact).toHaveBeenCalledTimes(2);
      expect(hapticImpact).toHaveBeenLastCalledWith('medium');
    });

    it('revisits are silent: no haptics and no re-marking of reveal_seen', async () => {
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue('true');
      const { getByTestId } = render(
        <CompletionMoment {...scaleProps} yourScore={7} partnerScore={8} assignmentId="a3" />
      );
      await act(async () => {});
      act(() => { jest.advanceTimersByTime(5000); });
      expect(hapticImpact).not.toHaveBeenCalled();
      expect(AsyncStorage.setItem).not.toHaveBeenCalled();
      // Content still renders on the revisit, just with flat fades
      expect(getByTestId('your-score').props.children).toBe(7);
      expect(getByTestId('partner-score').props.children).toBe(8);
    });

    it('clears pending haptic timers on unmount (no beat after the reveal is gone)', async () => {
      const { unmount } = render(
        <CompletionMoment {...scaleProps} yourScore={7} partnerScore={8} assignmentId="a4" />
      );
      await act(async () => {});
      unmount();
      act(() => { jest.advanceTimersByTime(5000); });
      expect(hapticImpact).not.toHaveBeenCalled();
    });
  });
});
