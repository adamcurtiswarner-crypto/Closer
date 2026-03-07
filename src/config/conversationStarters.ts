export interface ConversationStarter {
  id: string;
  topic: string;
  description: string;
  durationMinutes: number;
  category: 'connection' | 'appreciation' | 'dreams' | 'fun' | 'reflection';
}

export const CONVERSATION_STARTERS: ConversationStarter[] = [
  {
    id: 'cs-001',
    topic: 'What is one thing I do that makes you feel most loved?',
    description: 'Explore how your partner experiences love',
    durationMinutes: 5,
    category: 'appreciation',
  },
  {
    id: 'cs-002',
    topic: 'If we could live anywhere in the world for a year, where would you choose and why?',
    description: 'Dream together about adventures',
    durationMinutes: 5,
    category: 'dreams',
  },
  {
    id: 'cs-003',
    topic: 'What is a small moment from this week that made you smile?',
    description: 'Notice the little things together',
    durationMinutes: 3,
    category: 'reflection',
  },
  {
    id: 'cs-004',
    topic: 'What is something you have been wanting to tell me but have not found the right moment?',
    description: 'Create space for openness',
    durationMinutes: 10,
    category: 'connection',
  },
  {
    id: 'cs-005',
    topic: 'What is your favorite memory of us from the past month?',
    description: 'Relive your best moments',
    durationMinutes: 5,
    category: 'reflection',
  },
  {
    id: 'cs-006',
    topic: 'If we had a free weekend with no responsibilities, what would your ideal day together look like?',
    description: 'Plan your perfect day',
    durationMinutes: 5,
    category: 'dreams',
  },
  {
    id: 'cs-007',
    topic: 'What is one thing I could do this week to make your life easier?',
    description: 'Show up for each other',
    durationMinutes: 3,
    category: 'connection',
  },
  {
    id: 'cs-008',
    topic: 'What song reminds you of us and why?',
    description: 'Share your soundtrack',
    durationMinutes: 5,
    category: 'fun',
  },
  {
    id: 'cs-009',
    topic: 'What are you most proud of about our relationship?',
    description: 'Celebrate what you have built',
    durationMinutes: 5,
    category: 'appreciation',
  },
  {
    id: 'cs-010',
    topic: 'What is a fear you have that you rarely talk about?',
    description: 'Build deeper trust',
    durationMinutes: 10,
    category: 'connection',
  },
  {
    id: 'cs-011',
    topic: 'What is one new thing you would like us to try together?',
    description: 'Keep things fresh',
    durationMinutes: 5,
    category: 'fun',
  },
  {
    id: 'cs-012',
    topic: 'How do you think we have grown as a couple in the last year?',
    description: 'Reflect on your journey',
    durationMinutes: 5,
    category: 'reflection',
  },
  {
    id: 'cs-013',
    topic: 'What is one way I have surprised you since we have been together?',
    description: 'Discover unexpected sides',
    durationMinutes: 3,
    category: 'appreciation',
  },
  {
    id: 'cs-014',
    topic: 'If you could relive one day from our relationship, which would it be?',
    description: 'Revisit your highlights',
    durationMinutes: 5,
    category: 'reflection',
  },
  {
    id: 'cs-015',
    topic: 'What does feeling safe in our relationship look like to you?',
    description: 'Define your foundation',
    durationMinutes: 10,
    category: 'connection',
  },
  {
    id: 'cs-016',
    topic: 'What is a goal you have for yourself this year that I can support?',
    description: 'Be each other\'s champion',
    durationMinutes: 5,
    category: 'dreams',
  },
  {
    id: 'cs-017',
    topic: 'What is something silly that always makes us laugh together?',
    description: 'Lean into your joy',
    durationMinutes: 3,
    category: 'fun',
  },
  {
    id: 'cs-018',
    topic: 'How are you really doing right now — not the polite answer, the real one?',
    description: 'Check in honestly',
    durationMinutes: 10,
    category: 'connection',
  },
  {
    id: 'cs-019',
    topic: 'What is something you admire about how I handle difficult situations?',
    description: 'Affirm each other\'s strengths',
    durationMinutes: 3,
    category: 'appreciation',
  },
  {
    id: 'cs-020',
    topic: 'Where do you see us five years from now?',
    description: 'Align on the future',
    durationMinutes: 10,
    category: 'dreams',
  },
];

/**
 * Deterministically pick today's conversation starter.
 * Uses date string + coupleId to generate a stable index so both partners see the same one.
 */
export function getTodayStarter(coupleId: string | null): ConversationStarter {
  const dateStr = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
  const seed = `${dateStr}-${coupleId || 'solo'}`;
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    const char = seed.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash |= 0; // Convert to 32-bit int
  }
  const index = Math.abs(hash) % CONVERSATION_STARTERS.length;
  return CONVERSATION_STARTERS[index];
}
