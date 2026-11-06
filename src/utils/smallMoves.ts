// Small moves (PRODUCT-DIRECTION.md v1.5 #1): one quiet suggestion while the
// partner's answer is sealed. Seeded from the partner's love language + today's
// prompt category. Scaffolding, never a script — the user makes it their own.
//
// Design constraints (PRODUCT-DIRECTION.md §4):
// 1. Scaffold, never script
// 2. The receiving partner gets a human moment, not an assignment
// 3. Nothing one partner does privately is ever visible as a grade on the other
// 4. No guilt mechanics
// 5. Frameworks stay under the hood

export interface SmallMove {
  text: string;
  /** Short label for the move type — never shown to the partner. */
  kind: 'say' | 'do' | 'notice';
}

type LoveLanguage =
  | 'words_of_affirmation'
  | 'quality_time'
  | 'receiving_gifts'
  | 'acts_of_service'
  | 'physical_touch';

// Moves are keyed by love language, with category-aware variants where the
// intersection is meaningful. The pool is intentionally small — one move per
// wait, variety comes from the category rotation across days.

const MOVES_BY_LANGUAGE: Record<LoveLanguage, Record<string, SmallMove[]>> = {
  words_of_affirmation: {
    communication: [
      { text: 'Text them one thing they said recently that stuck with you', kind: 'say' },
    ],
    intimacy: [
      { text: 'Tell them something about them you find attractive — be specific', kind: 'say' },
    ],
    affection: [
      { text: 'Send a short message: "Thinking about you right now"', kind: 'say' },
    ],
    money: [
      { text: 'Thank them for something they handle that you rarely mention', kind: 'say' },
    ],
    family: [
      { text: 'Tell them one thing they do with your family that you appreciate', kind: 'say' },
    ],
    friends: [
      { text: 'Mention something they did for a friend that made you proud', kind: 'say' },
    ],
    fun_play: [
      { text: 'Remind them of a time you both laughed until it hurt', kind: 'say' },
    ],
    future_dreams: [
      { text: 'Share one thing about your future together you are looking forward to', kind: 'say' },
    ],
    everyday_life: [
      { text: 'Thank them for something in the daily grind they handle quietly', kind: 'say' },
    ],
    conflict_repair: [
      { text: 'Say the kind version of something you have been holding back', kind: 'say' },
    ],
    appreciation_trust: [
      { text: 'Name one way they have made you feel safe recently', kind: 'say' },
    ],
    growth_independence: [
      { text: 'Encourage something they are working on — "I see you growing"', kind: 'say' },
    ],
    _default: [
      { text: 'Send them three words that say how you feel right now', kind: 'say' },
    ],
  },
  quality_time: {
    communication: [
      { text: 'Put your phone down for the next conversation you have together', kind: 'do' },
    ],
    intimacy: [
      { text: 'Suggest 15 quiet minutes together tonight — no screens', kind: 'do' },
    ],
    affection: [
      { text: 'Sit next to them instead of across from them at the next meal', kind: 'do' },
    ],
    money: [
      { text: 'Suggest a walk to talk about something light — not logistics', kind: 'do' },
    ],
    family: [
      { text: 'Ask them about their family — and just listen', kind: 'do' },
    ],
    friends: [
      { text: 'Ask about their friends. Be curious, not catching up', kind: 'do' },
    ],
    fun_play: [
      { text: 'Propose something spontaneous for the next free hour you share', kind: 'do' },
    ],
    future_dreams: [
      { text: 'Start a conversation: "Where should we be in five years?"', kind: 'do' },
    ],
    everyday_life: [
      { text: 'Do a chore together instead of splitting it', kind: 'do' },
    ],
    conflict_repair: [
      { text: 'Make space: "Can we talk about the other day for a few minutes?"', kind: 'do' },
    ],
    appreciation_trust: [
      { text: 'Give them your full attention the next time they tell you something', kind: 'do' },
    ],
    growth_independence: [
      { text: 'Ask what they have been learning about themselves lately', kind: 'do' },
    ],
    _default: [
      { text: 'Find 10 minutes today where they have your full attention', kind: 'do' },
    ],
  },
  receiving_gifts: {
    _default: [
      { text: 'Bring them something small — their favorite drink, a note, a photo you saved', kind: 'do' },
    ],
    money: [
      { text: 'Find something free that would make them smile — a flower, a saved meme, a doodle', kind: 'do' },
    ],
    fun_play: [
      { text: 'Look up one thing to do together this weekend and save it to show them', kind: 'do' },
    ],
    affection: [
      { text: 'Leave a small note where they will find it — desk, pillow, mirror', kind: 'do' },
    ],
    future_dreams: [
      { text: 'Save a link to a place you want to take them someday', kind: 'do' },
    ],
  },
  acts_of_service: {
    everyday_life: [
      { text: 'Take one thing off their plate today without announcing it', kind: 'do' },
    ],
    money: [
      { text: 'Handle a bill or errand they usually carry', kind: 'do' },
    ],
    family: [
      { text: 'Offer to manage a family task they have been carrying', kind: 'do' },
    ],
    communication: [
      { text: 'Listen to what they are stressed about and handle one piece of it', kind: 'do' },
    ],
    conflict_repair: [
      { text: 'Do the thing they asked for last time — without being asked again', kind: 'do' },
    ],
    _default: [
      { text: 'Do something they usually do, before they have to ask', kind: 'do' },
    ],
  },
  physical_touch: {
    affection: [
      { text: 'Next time you pass them, touch their shoulder or back — small, quiet', kind: 'notice' },
    ],
    intimacy: [
      { text: 'Hold them a little longer the next time you hug', kind: 'notice' },
    ],
    communication: [
      { text: 'Reach for their hand during the next hard conversation', kind: 'notice' },
    ],
    conflict_repair: [
      { text: 'After you work through something, sit close — presence over words', kind: 'notice' },
    ],
    _default: [
      { text: 'Find one moment today to reach for them without a reason', kind: 'notice' },
    ],
  },
};

/**
 * Pick one small move for the current waiting state. Returns null if we
 * cannot generate a suggestion (no love language set, unknown category).
 *
 * The pick is deterministic for a given (loveLanguage, category, dayOffset)
 * triple — the same couple seeing the same category on the same day gets the
 * same suggestion, so a re-render doesn't shuffle. The day offset breaks ties
 * across days when the category repeats.
 */
export function pickSmallMove(
  partnerLoveLanguage: string | null,
  category: string | null,
  dayOffset: number = 0
): SmallMove | null {
  if (!partnerLoveLanguage) return null;

  const langMoves = MOVES_BY_LANGUAGE[partnerLoveLanguage as LoveLanguage];
  if (!langMoves) return null;

  const pool = (category && langMoves[category]) || langMoves._default;
  if (!pool || pool.length === 0) return null;

  const index = Math.abs(dayOffset) % pool.length;
  return pool[index];
}
