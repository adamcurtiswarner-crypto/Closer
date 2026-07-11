import React from 'react';
import { render as rtlRender, act, fireEvent } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  CompletionMoment,
  FIRST_REVEAL_LIFETIME_KEY,
  FIRST_EVER_EXTRA_HOLD_MS,
} from '../components/CompletionMoment';
import { hapticImpact } from '@utils/haptics';

// CompletionMoment now owns the couch-flag hooks (React Query) — every
// render needs a QueryClientProvider.
function render(ui: React.ReactElement) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return rtlRender(
    <QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>
  );
}

// Resolve t() against the real en.json so tests assert shipped copy
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

/** Seed AsyncStorage.getItem responses by key; unknown keys resolve null. */
function seedStorage(store: Record<string, string>) {
  (AsyncStorage.getItem as jest.Mock).mockImplementation((key: string) =>
    Promise.resolve(store[key] ?? null)
  );
}

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
      // A couple with reveal history — the lifetime first-of-many beat is
      // covered separately below.
      seedStorage({ [FIRST_REVEAL_LIFETIME_KEY]: 'true' });
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
      seedStorage({ reveal_seen_a3: 'true', [FIRST_REVEAL_LIFETIME_KEY]: 'true' });
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

    it('shows the standard quiet footer once the lifetime flag is set', async () => {
      const { getByText } = render(
        <CompletionMoment {...scaleProps} yourScore={7} partnerScore={8} assignmentId="a5" />
      );
      await act(async () => {});
      expect(getByText('Another moment saved')).toBeTruthy();
    });
  });

  describe('first-ever reveal (lifetime @stoke_first_reveal_seen flag)', () => {
    const scaleProps = {
      promptText: 'How connected did you feel this week?',
      yourResponse: 'Felt close after our walk.',
      partnerResponse: 'The weekend helped.',
      partnerName: 'Alex',
    };

    beforeEach(() => {
      jest.clearAllMocks();
      // Nothing seen yet — brand-new couple, first completed reveal ever
      seedStorage({});
    });

    it('shows "The first of many" and marks the lifetime flag', async () => {
      const { getByText, queryByText } = render(
        <CompletionMoment {...scaleProps} yourScore={7} partnerScore={8} assignmentId="f1" />
      );
      await act(async () => {});
      expect(getByText('The first of many')).toBeTruthy();
      expect(queryByText('Another moment saved')).toBeNull();
      expect(AsyncStorage.setItem).toHaveBeenCalledWith(FIRST_REVEAL_LIFETIME_KEY, 'true');
      expect(AsyncStorage.setItem).toHaveBeenCalledWith('reveal_seen_f1', 'true');
    });

    it('holds the breath one extra beat: Medium haptic lands late by the extra hold', async () => {
      render(
        <CompletionMoment {...scaleProps} yourScore={7} partnerScore={8} assignmentId="f2" />
      );
      await act(async () => {});

      // Your-score beat is unchanged
      act(() => { jest.advanceTimersByTime(500); });
      expect(hapticImpact).toHaveBeenCalledTimes(1);
      expect(hapticImpact).toHaveBeenLastCalledWith('light');

      // The usual 800ms held breath passes — the partner beat has NOT landed yet
      act(() => { jest.advanceTimersByTime(800); });
      expect(hapticImpact).toHaveBeenCalledTimes(1);

      // The extra held beat ends — now the only Medium haptic of the day fires
      act(() => { jest.advanceTimersByTime(FIRST_EVER_EXTRA_HOLD_MS); });
      expect(hapticImpact).toHaveBeenCalledTimes(2);
      expect(hapticImpact).toHaveBeenLastCalledWith('medium');
    });

    it('every reveal after the first uses the standard footer and timing', async () => {
      seedStorage({ [FIRST_REVEAL_LIFETIME_KEY]: 'true' });
      const { getByText, queryByText } = render(
        <CompletionMoment {...scaleProps} yourScore={7} partnerScore={8} assignmentId="f3" />
      );
      await act(async () => {});
      expect(getByText('Another moment saved')).toBeTruthy();
      expect(queryByText('The first of many')).toBeNull();
      // The lifetime flag is never re-written
      expect(AsyncStorage.setItem).not.toHaveBeenCalledWith(FIRST_REVEAL_LIFETIME_KEY, 'true');

      act(() => { jest.advanceTimersByTime(1300); });
      expect(hapticImpact).toHaveBeenCalledTimes(2);
      expect(hapticImpact).toHaveBeenLastCalledWith('medium');
    });

    it('a REVISIT of an already-seen reveal never claims first-of-many (flags untouched)', async () => {
      seedStorage({ reveal_seen_f4: 'true' });
      const { getByText } = render(
        <CompletionMoment {...scaleProps} yourScore={7} partnerScore={8} assignmentId="f4" />
      );
      await act(async () => {});
      expect(getByText('Another moment saved')).toBeTruthy();
      expect(AsyncStorage.setItem).not.toHaveBeenCalled();
    });

    it('previews without an assignmentId never trigger the lifetime beat', async () => {
      const { getByText } = render(
        <CompletionMoment {...scaleProps} yourScore={7} partnerScore={8} />
      );
      await act(async () => {});
      expect(getByText('Another moment saved')).toBeTruthy();
      expect(AsyncStorage.setItem).not.toHaveBeenCalled();
    });
  });

  describe('keep it for the couch (mid-scale reveal)', () => {
    const scaleProps = {
      promptText: 'How connected did you feel this week?',
      yourResponse: 'Felt close after our walk.',
      partnerResponse: 'The weekend helped.',
      partnerName: 'Alex',
    };

    const snap = (data: Record<string, unknown>) => ({
      exists: () => true,
      data: () => data,
    });

    beforeEach(() => {
      jest.clearAllMocks();
      seedStorage({ [FIRST_REVEAL_LIFETIME_KEY]: 'true' });
      const { doc, getDoc, updateDoc } = require('firebase/firestore');
      (doc as jest.Mock).mockReturnValue('completion-ref');
      (getDoc as jest.Mock).mockResolvedValue(snap({}));
      (updateDoc as jest.Mock).mockResolvedValue(undefined);
    });

    const flush = async () => {
      // Let the queryFn's getDoc promise settle, then run React Query's
      // batched notify timers (globally-enabled fake timers), then settle
      // the resulting state updates.
      await act(async () => {});
      await act(async () => {
        jest.runOnlyPendingTimers();
      });
    };

    it('renders the question as a closing thought AFTER the reaction row', async () => {
      const { toJSON, getByText } = render(
        <CompletionMoment
          {...scaleProps}
          yourScore={6}
          partnerScore={7}
          showMidScaleLine
          assignmentId="m1"
          onReact={jest.fn()}
        />
      );
      await flush();
      expect(getByText('What would move this one point higher?')).toBeTruthy();
      const flat = JSON.stringify(toJSON());
      const reactionsIdx = flat.indexOf("React to Alex's answer");
      const lineIdx = flat.indexOf('What would move this one point higher?');
      expect(reactionsIdx).toBeGreaterThan(-1);
      expect(lineIdx).toBeGreaterThan(reactionsIdx);
    });

    it('shows the tappable keep-for-couch row when unflagged', async () => {
      const { getByTestId, getByText, queryByTestId } = render(
        <CompletionMoment
          {...scaleProps}
          yourScore={6}
          partnerScore={7}
          showMidScaleLine
          assignmentId="m2"
        />
      );
      await flush();
      expect(getByTestId('couch-flag-button')).toBeTruthy();
      expect(getByText('Keep it for the couch')).toBeTruthy();
      expect(queryByTestId('couch-kept')).toBeNull();
    });

    it('tapping writes the flag — seeding discussed: {} on a doc without it — and settles into the confirmation', async () => {
      const { getDoc, updateDoc } = require('firebase/firestore');
      (getDoc as jest.Mock)
        .mockResolvedValueOnce(snap({})) // initial flag-state read
        .mockResolvedValue(snap({ couch_flagged: true, couch_flagged_by: 'user-1' }));

      const { getByTestId, getByText, queryByTestId } = render(
        <CompletionMoment
          {...scaleProps}
          yourScore={6}
          partnerScore={7}
          showMidScaleLine
          assignmentId="m3"
        />
      );
      await flush();

      fireEvent.press(getByTestId('couch-flag-button'));
      await flush();

      expect(updateDoc).toHaveBeenCalledWith(
        'completion-ref',
        expect.objectContaining({
          couch_flagged: true,
          couch_flagged_by: 'user-1',
          discussed: {},
        })
      );
      expect(getByText("Kept for the couch — it's in the Hearth.")).toBeTruthy();
      expect(queryByTestId('couch-flag-button')).toBeNull();
    });

    it('never writes discussed when the doc already has the field', async () => {
      const { getDoc, updateDoc } = require('firebase/firestore');
      (getDoc as jest.Mock).mockResolvedValue(
        snap({ discussed: {}, signal: 'steady' })
      );

      const { getByTestId } = render(
        <CompletionMoment
          {...scaleProps}
          yourScore={6}
          partnerScore={7}
          showMidScaleLine
          assignmentId="m4"
        />
      );
      await flush();
      fireEvent.press(getByTestId('couch-flag-button'));
      await flush();

      const written = (updateDoc as jest.Mock).mock.calls[0][1];
      expect(written.couch_flagged).toBe(true);
      expect('discussed' in written).toBe(false);
    });

    it('shows the quiet confirmation when already flagged by the PARTNER', async () => {
      const { getDoc } = require('firebase/firestore');
      (getDoc as jest.Mock).mockResolvedValue(
        snap({ couch_flagged: true, couch_flagged_by: 'user-2' })
      );

      const { getByText, queryByTestId, getByTestId } = render(
        <CompletionMoment
          {...scaleProps}
          yourScore={6}
          partnerScore={7}
          showMidScaleLine
          assignmentId="m5"
        />
      );
      await flush();
      expect(getByTestId('couch-kept')).toBeTruthy();
      expect(getByText("Kept for the couch — it's in the Hearth.")).toBeTruthy();
      expect(queryByTestId('couch-flag-button')).toBeNull();
    });

    it('previews without an assignmentId show the line but no flag row', async () => {
      const { getByText, queryByTestId } = render(
        <CompletionMoment
          {...scaleProps}
          yourScore={6}
          partnerScore={7}
          showMidScaleLine
        />
      );
      await flush();
      expect(getByText('What would move this one point higher?')).toBeTruthy();
      expect(queryByTestId('couch-flag-button')).toBeNull();
      expect(queryByTestId('couch-kept')).toBeNull();
    });
  });
});
