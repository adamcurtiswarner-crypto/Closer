import { renderHook, waitFor } from '@testing-library/react-native';
import { getDocs } from 'firebase/firestore';
import { useCoachingHistory } from '@hooks/useCoachingHistory';

// Mock firebase
jest.mock('firebase/firestore', () => ({
  collection: jest.fn(),
  query: jest.fn(),
  orderBy: jest.fn(),
  limit: jest.fn(),
  startAfter: jest.fn(),
  getDocs: jest.fn(),
}));

jest.mock('@/config/firebase', () => ({
  db: {},
}));

jest.mock('@/hooks/useAuth', () => ({
  useAuth: () => ({
    user: { coupleId: 'couple-123' },
  }),
}));

// Mock React Query wrapper
const { QueryClient, QueryClientProvider } = jest.requireActual('@tanstack/react-query');
const React = require('react');

let queryClient: InstanceType<typeof QueryClient>;

function createWrapper() {
  return ({ children }: { children: React.ReactNode }) =>
    React.createElement(QueryClientProvider, { client: queryClient }, children);
}

describe('useCoachingHistory', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
  });

  afterEach(() => {
    queryClient.clear();
  });

  it('returns empty items when no insights exist', async () => {
    (getDocs as jest.Mock).mockResolvedValue({
      docs: [],
    });

    const { result } = renderHook(() => useCoachingHistory(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.pages[0].items).toEqual([]);
  });

  it('maps Firestore documents to CoachingInsightHistoryItem', async () => {
    const mockDate = new Date('2026-03-01');
    (getDocs as jest.Mock).mockResolvedValue({
      docs: [
        {
          id: 'insight-1',
          data: () => ({
            pulse_score: 72,
            insight_text: 'You had a steady week.',
            action_type: 'conversation',
            action_text: 'Try asking about their day.',
            created_at: { toDate: () => mockDate },
            dismissed_at: null,
            acted_on: null,
          }),
        },
      ],
    });

    const { result } = renderHook(() => useCoachingHistory(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    const item = result.current.data?.pages[0].items[0];
    expect(item).toEqual({
      id: 'insight-1',
      pulseScore: 72,
      insightText: 'You had a steady week.',
      actionType: 'conversation',
      actionText: 'Try asking about their day.',
      createdAt: mockDate,
      dismissedAt: null,
      actedOn: null,
    });
  });
});
