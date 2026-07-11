jest.mock('firebase/firestore', () => ({
  collection: jest.fn(),
  doc: jest.fn(),
  query: jest.fn(),
  where: jest.fn(),
  orderBy: jest.fn(),
  limit: jest.fn(),
  onSnapshot: jest.fn(),
  updateDoc: jest.fn(),
  serverTimestamp: jest.fn(),
}));
jest.mock('@/config/firebase', () => ({ db: {} }));
jest.mock('@/hooks/useAuth', () => ({ useAuth: () => ({ user: null }) }));
jest.mock('@/services/analytics', () => ({ logEvent: jest.fn() }));
jest.mock('@/components/Icon', () => ({ Icon: () => null }));
jest.mock('@/components/ToneShapes', () => ({ ToneShapes: () => null }));

const mockHapticImpact = jest.fn();
jest.mock('@utils/haptics', () => ({
  hapticImpact: (...args: unknown[]) => mockHapticImpact(...args),
  ImpactFeedbackStyle: { Light: 'light', Medium: 'medium', Heavy: 'heavy' },
}));

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

import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { HearthTalkSheet } from '../components/HearthTalkSheet';
import { logEvent } from '@/services/analytics';
import type { HearthCompletion } from '../hooks/useHearth';

function makeCompletion(overrides: Partial<HearthCompletion> = {}): HearthCompletion {
  return {
    id: 'c1',
    category: 'money',
    promptText: 'How fair does the money feel right now?',
    isScale: true,
    responses: [
      {
        userId: 'me',
        responseText: 'Mine',
        responseScore: 3,
        imageUrl: null,
        submittedAt: new Date('2026-07-01'),
      },
      {
        userId: 'partner',
        responseText: 'Theirs',
        responseScore: 8,
        imageUrl: null,
        submittedAt: new Date('2026-07-01'),
      },
    ],
    signal: 'divergence',
    discussed: {},
    discussedAt: null,
    couchFlagged: false,
    couchFlaggedBy: null,
    completedAt: new Date('2026-07-01'),
    ...overrides,
  };
}

function renderSheet(completion: HearthCompletion, props: Record<string, unknown> = {}) {
  const onMarkDiscussed = jest.fn();
  const onClose = jest.fn();
  const utils = render(
    <HearthTalkSheet
      visible
      completion={completion}
      myUid="me"
      partnerName="Sam"
      onMarkDiscussed={onMarkDiscussed}
      onClose={onClose}
      {...props}
    />
  );
  return { ...utils, onMarkDiscussed, onClose };
}

describe('HearthTalkSheet', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders the couch eyebrow, quoted prompt, and both score chips', () => {
    const { getByText } = renderSheet(makeCompletion());
    expect(getByText('Take it to the couch')).toBeTruthy();
    expect(getByText(/How fair does the money feel right now\?/)).toBeTruthy();
    expect(getByText('You · 3')).toBeTruthy();
    expect(getByText('Sam · 8')).toBeTruthy();
  });

  it('shows the divergence starter for a divergence entry', () => {
    const { getByText } = renderSheet(makeCompletion({ signal: 'divergence' }));
    expect(getByText(/You two see this one differently/)).toBeTruthy();
    expect(getByText('Read it out loud. No screens after this line.')).toBeTruthy();
  });

  it('shows the repair starter for a repair entry', () => {
    const { getByText } = renderSheet(
      makeCompletion({
        signal: 'repair',
        responses: [
          { userId: 'me', responseText: '', responseScore: 3, imageUrl: null, submittedAt: null },
          { userId: 'partner', responseText: '', responseScore: 4, imageUrl: null, submittedAt: null },
        ],
      })
    );
    expect(getByText(/What does the hard part look like from where you sit/)).toBeTruthy();
  });

  it('shows the warm generic starter for a couch-flagged steady entry (no repair framing)', () => {
    const { getByText, queryByText } = renderSheet(
      makeCompletion({ signal: 'steady', couchFlagged: true, couchFlaggedBy: 'me' })
    );
    expect(getByText(/kept this one for the couch/)).toBeTruthy();
    expect(queryByText(/What does the hard part look like/)).toBeNull();
  });

  it('a couch-flagged null-signal entry also gets the generic starter', () => {
    const { getByText } = renderSheet(
      makeCompletion({ signal: null, couchFlagged: true, couchFlaggedBy: 'partner' })
    );
    expect(getByText(/kept this one for the couch/)).toBeTruthy();
  });

  it('a flagged REPAIR entry keeps the repair starter (signal wins)', () => {
    const { getByText } = renderSheet(
      makeCompletion({ signal: 'repair', couchFlagged: true })
    );
    expect(getByText(/What does the hard part look like from where you sit/)).toBeTruthy();
  });

  it('unmarked: pressing the pill marks my side', () => {
    const { getByTestId, onMarkDiscussed } = renderSheet(makeCompletion());
    fireEvent.press(getByTestId('talk-sheet-mark-button'));
    expect(onMarkDiscussed).toHaveBeenCalledWith('c1');
  });

  it('mine-first: shows the quiet waiting state and hides the pill', () => {
    const { getByText, queryByTestId } = renderSheet(
      makeCompletion({ discussed: { me: new Date('2026-07-02') } })
    );
    expect(getByText('You marked it — waiting for Sam')).toBeTruthy();
    expect(getByText('They get a quiet nudge.')).toBeTruthy();
    expect(queryByTestId('talk-sheet-mark-button')).toBeNull();
  });

  it('partner-first: asks whether we talked and keeps the pill', () => {
    const { getByText, getByTestId } = renderSheet(
      makeCompletion({ discussed: { partner: new Date('2026-07-02') } })
    );
    expect(getByText('Sam marked it — were you two able to talk?')).toBeTruthy();
    expect(getByTestId('talk-sheet-mark-button')).toBeTruthy();
  });

  it('settle moment: turns sage, fades in the settle card, and beats the medium haptic once', () => {
    const untended = makeCompletion({ discussed: { me: new Date('2026-07-02') } });
    const { rerender, getByText, getByTestId, queryByTestId } = renderSheet(untended);

    expect(queryByTestId('talk-sheet-tended')).toBeNull();
    expect(mockHapticImpact).not.toHaveBeenCalled();

    const tended = makeCompletion({
      discussed: { me: new Date('2026-07-02'), partner: new Date('2026-07-03') },
      discussedAt: new Date('2026-07-03'),
    });
    rerender(
      <HearthTalkSheet
        visible
        completion={tended}
        myUid="me"
        partnerName="Sam"
        onMarkDiscussed={jest.fn()}
        onClose={jest.fn()}
      />
    );

    expect(getByTestId('talk-sheet-tended')).toBeTruthy();
    expect(getByText('Tended, together')).toBeTruthy();
    expect(getByTestId('talk-sheet-settle-card')).toBeTruthy();
    expect(getByText('Tended. This ember settles into your hearth.')).toBeTruthy();
    expect(mockHapticImpact).toHaveBeenCalledTimes(1);
    expect(mockHapticImpact).toHaveBeenCalledWith('medium');
    expect(logEvent).toHaveBeenCalledWith('completion_tended', { completion_id: 'c1' });

    // Re-render again — the tended beat never repeats
    rerender(
      <HearthTalkSheet
        visible
        completion={tended}
        myUid="me"
        partnerName="Sam"
        onMarkDiscussed={jest.fn()}
        onClose={jest.fn()}
      />
    );
    expect(mockHapticImpact).toHaveBeenCalledTimes(1);
  });

  it('closes from the quiet x', () => {
    const { getByTestId, onClose } = renderSheet(makeCompletion());
    fireEvent.press(getByTestId('talk-sheet-close'));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('renders nothing without a completion', () => {
    const { toJSON } = render(
      <HearthTalkSheet
        visible={false}
        completion={null}
        myUid="me"
        partnerName="Sam"
        onMarkDiscussed={jest.fn()}
        onClose={jest.fn()}
      />
    );
    expect(toJSON()).toBeNull();
  });
});
