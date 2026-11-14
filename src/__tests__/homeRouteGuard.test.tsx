/**
 * The flagged-off home screen must be unreachable, not merely un-tabbed.
 *
 * On 2026-11-14 a founder backed out of a dimension and landed here. The
 * dimension route is a hidden tab, and going "back" from a tab returns to
 * the first screen declared in the navigator — which is this one, flagged
 * off since v1 scope was set. Two things followed:
 *
 *  1. he saw a screen that does not exist in this product, including
 *     "16 best streak" and "1 day streak" — and the product doctrine bans
 *     streak language anywhere, not just on shipped surfaces;
 *  2. mounting it attached `useGoals`, whose composite index was never
 *     deployed because goals is a disabled feature. That threw
 *     FAILED_PRECONDITION straight into production Sentry.
 *
 * Hiding a tab hides the entrance. It does not make the route unreachable,
 * and a flag that only hides the entrance is not a flag.
 */
import React from 'react';
import { render } from '@testing-library/react-native';

const mockRedirect = jest.fn();
jest.mock('expo-router', () => ({
  Redirect: (props: { href: string }) => {
    mockRedirect(props.href);
    return null;
  },
  router: { push: jest.fn(), replace: jest.fn(), back: jest.fn() },
  useRouter: () => ({ push: jest.fn(), replace: jest.fn(), back: jest.fn() }),
  useLocalSearchParams: () => ({}),
  Stack: { Screen: () => null },
}));

jest.mock('@/config/features', () => ({
  FEATURES: {
    home: false,
    memories: false,
    insights: false,
    wishlist: false,
    games: false,
    resources: false,
    dateNights: false,
    coaching: false,
    streaks: false,
    goals: false,
    chat: false,
    engines: false,
    checkIns: false,
  },
}));

// If any of these run, the guard has already failed — the whole point is
// that a flagged-off screen attaches no listeners and fires no queries.
const mockUseGoals = jest.fn(() => ({ data: [] }));
const mockUseDateNights = jest.fn(() => ({ data: [] }));
const mockUseStreak = jest.fn(() => ({ currentStreak: 0, isStreakActive: false }));
jest.mock('@/hooks/useGoals', () => ({
  useGoals: () => mockUseGoals(),
  useCompleteGoal: () => ({ mutate: jest.fn() }),
  useCreateGoal: () => ({ mutate: jest.fn() }),
}));
jest.mock('@/hooks/useDateNights', () => ({
  useDateNights: () => mockUseDateNights(),
  useCreateDateNight: () => ({ mutate: jest.fn() }),
  useCompleteDateNight: () => ({ mutate: jest.fn() }),
}));
jest.mock('@/hooks/useStreak', () => ({ useStreak: () => mockUseStreak() }));

jest.mock('@/config/firebase', () => ({ db: {} }));
// home.tsx reaches firebase/auth through useAuth at module load.
jest.mock('@/hooks/useAuth', () => ({ useAuth: () => ({ user: null }) }));
jest.mock('@/hooks/useCouple', () => ({ useCouple: () => ({ data: null }) }));
jest.mock('@/hooks/useMonthlyActivity', () => ({
  useMonthlyActivity: () => ({
    days: [],
    completedCount: 0,
    month: 0,
    year: 2026,
    startDayOffset: 0,
  }),
}));
jest.mock('@/hooks/usePrompt', () => ({ useTodayPrompt: () => ({ data: null }) }));
jest.mock('@/components/StreakRing', () => ({ StreakRing: () => null }));
jest.mock('@/components/CoupleHero', () => ({ CoupleHero: () => null }));
jest.mock('@/components/RelationshipStats', () => ({ RelationshipStats: () => null }));
jest.mock('@/components/MilestoneBadges', () => ({ MilestoneBadges: () => null }));
jest.mock('@/components/Icon', () => ({ Icon: () => null }));
jest.mock('firebase/firestore', () => ({
  doc: jest.fn(),
  onSnapshot: jest.fn(() => jest.fn()),
}));

import TogetherScreen from '../../app/(app)/home';

/**
 * Structural guard: every flagged-off route is wrapped in featureRoute.
 *
 * home was not special — it was just the screen the navigator happened to
 * fall back to. Seven more v1-disabled screens were reachable the same way
 * on 2026-11-14, each able to mount a disabled feature's listeners; one of
 * them put FAILED_PRECONDITION into production Sentry.
 *
 * Checked at the source rather than by rendering: these screens pull in
 * native modules (haptics, firebase, reanimated) that a unit environment
 * cannot load, and a guard that only works when every mock is present is
 * not a guard. The behavioural proof — that the wrapper redirects and runs
 * no hooks — is the home suite below.
 */
describe('every flagged-off route is guarded', () => {
  const fs = require('fs');
  const path = require('path');

  // route file -> the FEATURES key it must be gated on
  const ROUTE_FLAGS: Record<string, string> = {
    'home.tsx': 'home',
    'memories.tsx': 'memories',
    'insights.tsx': 'insights',
    'wishlist.tsx': 'wishlist',
    'games.tsx': 'games',
    'resources.tsx': 'resources',
    'date-nights.tsx': 'dateNights',
    'coaching.tsx': 'coaching',
  };

  const appDir = path.join(__dirname, '..', '..', 'app', '(app)');

  it.each(Object.entries(ROUTE_FLAGS))(
    '%s exports its screen through featureRoute',
    (file, flag) => {
      const src = fs.readFileSync(path.join(appDir, file), 'utf8');

      expect(src).toContain(`export default featureRoute('${flag}'`);
    }
  );

  it('flags every route file that is off but unguarded', () => {
    const { FEATURES } = jest.requireActual('@/config/features');
    const offenders: string[] = [];

    for (const [file, flag] of Object.entries(ROUTE_FLAGS)) {
      if (FEATURES[flag as keyof typeof FEATURES]) continue; // shipped — no guard needed
      const src = fs.readFileSync(path.join(appDir, file), 'utf8');
      if (!src.includes('featureRoute(')) offenders.push(file);
    }

    expect(offenders).toEqual([]);
  });

  it('detects an unguarded screen', () => {
    // A guard that cannot fail is not a guard.
    const guarded = "export default featureRoute('games', GamesScreen);";
    const unguarded = 'export default function GamesScreen() {}';

    expect(guarded).toContain("featureRoute('games'");
    expect(unguarded).not.toContain('featureRoute(');
  });
});

describe('the flagged-off home route', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('redirects to Today instead of rendering', () => {
    render(<TogetherScreen />);

    expect(mockRedirect).toHaveBeenCalledWith('/(app)/today');
  });

  it('attaches no listeners and runs no queries for disabled features', () => {
    render(<TogetherScreen />);

    // useGoals is what threw FAILED_PRECONDITION into production Sentry:
    // its composite index was never deployed, because the feature is off.
    expect(mockUseGoals).not.toHaveBeenCalled();
    expect(mockUseDateNights).not.toHaveBeenCalled();
    expect(mockUseStreak).not.toHaveBeenCalled();
  });

  it('renders no streak language, which the doctrine bans outright', () => {
    const { queryByText } = render(<TogetherScreen />);

    expect(queryByText(/streak/i)).toBeNull();
  });
});
