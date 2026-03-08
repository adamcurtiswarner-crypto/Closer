export interface ConversationStarter {
  id: string;
  topic: string;
  description: string;
  durationMinutes: number;
  category: 'connection' | 'dreams' | 'gratitude' | 'growth' | 'intimacy' | 'memories' | 'fun' | 'values' | 'future' | 'daily';
}

export const CONVERSATION_STARTERS: ConversationStarter[] = [
  // --- Original 20 starters (cs-001 through cs-020) ---
  {
    id: 'cs-001',
    topic: 'What is one thing I do that makes you feel most loved?',
    description: 'Explore how your partner experiences love',
    durationMinutes: 5,
    category: 'gratitude',
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
    category: 'memories',
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
    category: 'memories',
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
    category: 'gratitude',
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
    category: 'growth',
  },
  {
    id: 'cs-013',
    topic: 'What is one way I have surprised you since we have been together?',
    description: 'Discover unexpected sides',
    durationMinutes: 3,
    category: 'gratitude',
  },
  {
    id: 'cs-014',
    topic: 'If you could relive one day from our relationship, which would it be?',
    description: 'Revisit your highlights',
    durationMinutes: 5,
    category: 'memories',
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
    category: 'gratitude',
  },
  {
    id: 'cs-020',
    topic: 'Where do you see us five years from now?',
    description: 'Align on the future',
    durationMinutes: 10,
    category: 'future',
  },

  // --- New starters (cs-021 through cs-070) ---

  // Connection
  {
    id: 'cs-021',
    topic: 'What is something I do that you never want me to stop doing?',
    description: 'Name the things that matter most',
    durationMinutes: 3,
    category: 'connection',
  },
  {
    id: 'cs-022',
    topic: 'When was the last time you felt truly heard by me?',
    description: 'Understand what being listened to looks like',
    durationMinutes: 5,
    category: 'connection',
  },
  {
    id: 'cs-023',
    topic: 'What is one thing we used to do together that you miss?',
    description: 'Reconnect with what brought you closer',
    durationMinutes: 5,
    category: 'connection',
  },
  {
    id: 'cs-024',
    topic: 'Is there anything weighing on you that I might not know about?',
    description: 'Make room for what is unspoken',
    durationMinutes: 10,
    category: 'connection',
  },
  {
    id: 'cs-025',
    topic: 'What is the best way for me to comfort you when you are having a hard day?',
    description: 'Learn how to show up when it counts',
    durationMinutes: 5,
    category: 'connection',
  },

  // Dreams
  {
    id: 'cs-026',
    topic: 'What is something you have always wanted to learn but never started?',
    description: 'Uncover hidden curiosities',
    durationMinutes: 5,
    category: 'dreams',
  },
  {
    id: 'cs-027',
    topic: 'If money were not a factor, how would you spend your days?',
    description: 'Imagine life without limits',
    durationMinutes: 5,
    category: 'dreams',
  },
  {
    id: 'cs-028',
    topic: 'What is a trip we have not taken yet that you think about often?',
    description: 'Put a dream on the map',
    durationMinutes: 5,
    category: 'dreams',
  },
  {
    id: 'cs-029',
    topic: 'What is a skill or hobby you would love for us to pick up together?',
    description: 'Find your next shared adventure',
    durationMinutes: 3,
    category: 'dreams',
  },

  // Gratitude
  {
    id: 'cs-030',
    topic: 'What is something I did recently that meant more to you than I probably realized?',
    description: 'Surface the quiet gestures',
    durationMinutes: 3,
    category: 'gratitude',
  },
  {
    id: 'cs-031',
    topic: 'What is a quality of mine that you are grateful for, even if you do not say it often?',
    description: 'Name the things you treasure',
    durationMinutes: 5,
    category: 'gratitude',
  },
  {
    id: 'cs-032',
    topic: 'When did you last think "I am glad I have this person" and what prompted it?',
    description: 'Trace back a moment of appreciation',
    durationMinutes: 5,
    category: 'gratitude',
  },
  {
    id: 'cs-033',
    topic: 'What is one way our relationship has made you a better person?',
    description: 'Acknowledge how you shape each other',
    durationMinutes: 5,
    category: 'gratitude',
  },

  // Growth
  {
    id: 'cs-034',
    topic: 'What is something you have changed your mind about since we have been together?',
    description: 'Notice how you have evolved',
    durationMinutes: 5,
    category: 'growth',
  },
  {
    id: 'cs-035',
    topic: 'What is a hard conversation we had that ultimately made us stronger?',
    description: 'Honor the difficult moments',
    durationMinutes: 10,
    category: 'growth',
  },
  {
    id: 'cs-036',
    topic: 'What is one area of your life where you feel like you are still figuring things out?',
    description: 'Share what is still in progress',
    durationMinutes: 5,
    category: 'growth',
  },
  {
    id: 'cs-037',
    topic: 'What is a habit you would like to build and how can I help?',
    description: 'Grow together on purpose',
    durationMinutes: 5,
    category: 'growth',
  },
  {
    id: 'cs-038',
    topic: 'What is something you handled differently this year than you would have a few years ago?',
    description: 'Recognize your own growth',
    durationMinutes: 5,
    category: 'growth',
  },

  // Intimacy
  {
    id: 'cs-039',
    topic: 'What makes you feel closest to me — and is it different now than it was early on?',
    description: 'Understand what closeness means today',
    durationMinutes: 10,
    category: 'intimacy',
  },
  {
    id: 'cs-040',
    topic: 'What is a way I can show you affection that would really land right now?',
    description: 'Fine-tune how you express care',
    durationMinutes: 5,
    category: 'intimacy',
  },
  {
    id: 'cs-041',
    topic: 'What is a moment this week where you wanted to be close but did not say anything?',
    description: 'Bridge the gap between wanting and asking',
    durationMinutes: 5,
    category: 'intimacy',
  },
  {
    id: 'cs-042',
    topic: 'What does a really good evening together look like to you right now?',
    description: 'Sync up on what quality time means',
    durationMinutes: 5,
    category: 'intimacy',
  },
  {
    id: 'cs-043',
    topic: 'Is there a kind of touch or gesture that always makes you feel connected to me?',
    description: 'Learn each other\'s language of closeness',
    durationMinutes: 5,
    category: 'intimacy',
  },

  // Memories
  {
    id: 'cs-044',
    topic: 'What is the funniest thing that has happened to us that we still bring up?',
    description: 'Revisit the stories that define you',
    durationMinutes: 3,
    category: 'memories',
  },
  {
    id: 'cs-045',
    topic: 'What was going through your mind the first time you realized you loved me?',
    description: 'Go back to the beginning',
    durationMinutes: 5,
    category: 'memories',
  },
  {
    id: 'cs-046',
    topic: 'What is a meal or place from our past that you think about more than you would expect?',
    description: 'Uncover the memories that stuck',
    durationMinutes: 3,
    category: 'memories',
  },
  {
    id: 'cs-047',
    topic: 'What is a challenge we faced together that you are proud we got through?',
    description: 'Remember your resilience as a team',
    durationMinutes: 5,
    category: 'memories',
  },
  {
    id: 'cs-048',
    topic: 'What is a photo of us that always makes you feel something when you see it?',
    description: 'Relive a frozen moment',
    durationMinutes: 3,
    category: 'memories',
  },

  // Fun
  {
    id: 'cs-049',
    topic: 'What is the most ridiculous thing you have ever seen me do?',
    description: 'Laugh at yourselves together',
    durationMinutes: 3,
    category: 'fun',
  },
  {
    id: 'cs-050',
    topic: 'If we started a business together, what would it be?',
    description: 'Dream up something unexpected',
    durationMinutes: 5,
    category: 'fun',
  },
  {
    id: 'cs-051',
    topic: 'What is a movie or show we should rewatch together?',
    description: 'Queue up your next couch night',
    durationMinutes: 3,
    category: 'fun',
  },
  {
    id: 'cs-052',
    topic: 'If you had to describe me using only three words, what would they be?',
    description: 'Distill each other down',
    durationMinutes: 3,
    category: 'fun',
  },
  {
    id: 'cs-053',
    topic: 'What would our couple superpower be if we were in a movie?',
    description: 'Get playful about your strengths',
    durationMinutes: 3,
    category: 'fun',
  },

  // Values
  {
    id: 'cs-054',
    topic: 'What is a value you hold that has become more important to you over time?',
    description: 'Share what guides you',
    durationMinutes: 5,
    category: 'values',
  },
  {
    id: 'cs-055',
    topic: 'What does a meaningful life look like to you, and has that definition shifted?',
    description: 'Get to the heart of what matters',
    durationMinutes: 10,
    category: 'values',
  },
  {
    id: 'cs-056',
    topic: 'What is something you want to make sure we never lose sight of as a couple?',
    description: 'Protect what you care about most',
    durationMinutes: 5,
    category: 'values',
  },
  {
    id: 'cs-057',
    topic: 'What is a lesson from your family growing up that you want to carry forward — or leave behind?',
    description: 'Choose your own path together',
    durationMinutes: 10,
    category: 'values',
  },
  {
    id: 'cs-058',
    topic: 'What does generosity look like in a relationship to you?',
    description: 'Define giving on your own terms',
    durationMinutes: 5,
    category: 'values',
  },

  // Future
  {
    id: 'cs-059',
    topic: 'What is something you want us to prioritize in the next six months?',
    description: 'Set a shared direction',
    durationMinutes: 5,
    category: 'future',
  },
  {
    id: 'cs-060',
    topic: 'What does growing old together look like in your mind?',
    description: 'Picture the long view',
    durationMinutes: 10,
    category: 'future',
  },
  {
    id: 'cs-061',
    topic: 'What is a tradition you would love for us to start?',
    description: 'Build something that lasts',
    durationMinutes: 5,
    category: 'future',
  },
  {
    id: 'cs-062',
    topic: 'Is there a big decision coming up that you want us to think through together?',
    description: 'Get ahead of what is next',
    durationMinutes: 10,
    category: 'future',
  },
  {
    id: 'cs-063',
    topic: 'What kind of home do you picture for us in ten years?',
    description: 'Dream about where you will land',
    durationMinutes: 5,
    category: 'future',
  },

  // Daily
  {
    id: 'cs-064',
    topic: 'What is one thing on your mind right now that you have not said out loud yet?',
    description: 'Clear the air before the day moves on',
    durationMinutes: 3,
    category: 'daily',
  },
  {
    id: 'cs-065',
    topic: 'What are you looking forward to this week?',
    description: 'Find something to anticipate together',
    durationMinutes: 3,
    category: 'daily',
  },
  {
    id: 'cs-066',
    topic: 'What was the best part of your day so far?',
    description: 'End on a high note',
    durationMinutes: 3,
    category: 'daily',
  },
  {
    id: 'cs-067',
    topic: 'What is something that frustrated you today, and is there anything I can do?',
    description: 'Be a safe place to land',
    durationMinutes: 5,
    category: 'daily',
  },
  {
    id: 'cs-068',
    topic: 'What made you laugh today?',
    description: 'Share the lightness',
    durationMinutes: 3,
    category: 'daily',
  },
  {
    id: 'cs-069',
    topic: 'If you could change one thing about how today went, what would it be?',
    description: 'Reflect without overthinking',
    durationMinutes: 3,
    category: 'daily',
  },
  {
    id: 'cs-070',
    topic: 'What is something kind that someone did for you recently?',
    description: 'Notice the good around you',
    durationMinutes: 3,
    category: 'daily',
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
