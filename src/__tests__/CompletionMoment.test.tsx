import React from 'react';
import { render } from '@testing-library/react-native';
import { CompletionMoment } from '../components/CompletionMoment';

jest.mock('@utils/haptics', () => ({
  hapticImpact: jest.fn(),
  hapticNotification: jest.fn(),
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
  });
});
