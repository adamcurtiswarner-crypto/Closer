// Love language pairing tips: specific, actionable suggestions for how
// to show love in your PARTNER's language, not your own. The insight is
// in the translation — "you feel loved by X, but they feel loved by Y,
// so here's how to bridge that."

export interface LoveLanguageTip {
  /** What your partner's language means in practice. */
  theyNeed: string;
  /** One specific thing you can do this week. */
  tryThis: string;
  /** The common mistake when your languages differ. */
  watchFor: string;
}

type Language =
  | 'words_of_affirmation'
  | 'quality_time'
  | 'receiving_gifts'
  | 'acts_of_service'
  | 'physical_touch';

const LANGUAGE_LABELS: Record<Language, string> = {
  words_of_affirmation: 'Words',
  quality_time: 'Time',
  receiving_gifts: 'Gifts',
  acts_of_service: 'Service',
  physical_touch: 'Touch',
};

// Tips keyed by YOUR language → PARTNER's language.
// When languages match, the tips are about deepening rather than translating.
const TIPS: Record<Language, Record<Language, LoveLanguageTip>> = {
  words_of_affirmation: {
    words_of_affirmation: {
      theyNeed: 'Words land for both of you. That is rare and powerful.',
      tryThis: 'Write each other a three-sentence note about something specific you noticed this week.',
      watchFor: 'You both need to hear it — make sure the words flow both ways, not just one direction.',
    },
    quality_time: {
      theyNeed: 'You express love by saying it. They feel it by being with you — fully present, no distractions.',
      tryThis: 'Put your phone away for 20 minutes and give them your full attention. That is louder than any words.',
      watchFor: 'Saying "I love you" while scrolling does not register for them the way it does for you.',
    },
    receiving_gifts: {
      theyNeed: 'You say it with words. They feel it through thoughtful gestures — something that says "I was thinking of you."',
      tryThis: 'Bring home something small that shows you remembered — their favorite drink, a saved photo, a note.',
      watchFor: 'For them, a surprise is worth a thousand compliments. Do not skip the gesture and double the words.',
    },
    acts_of_service: {
      theyNeed: 'You express love verbally. They feel it when you do something without being asked.',
      tryThis: 'Handle one thing on their plate this week without announcing it. They will notice.',
      watchFor: 'Telling them you appreciate them is nice. Taking something off their list is love.',
    },
    physical_touch: {
      theyNeed: 'You reach for words. They reach for contact — a hand, a hug, sitting close.',
      tryThis: 'Next time you want to say something kind, say it while touching their arm or holding their hand.',
      watchFor: 'They might not hear your words as clearly as they feel your presence. Close the distance.',
    },
  },
  quality_time: {
    words_of_affirmation: {
      theyNeed: 'You show love by being there. They need to hear it said out loud.',
      tryThis: 'During your next quiet moment together, tell them one specific thing you admire about them.',
      watchFor: 'Sitting together in silence feels like love to you. They might need words to know you are in it.',
    },
    quality_time: {
      theyNeed: 'You both feel most loved when you have each other\'s full attention.',
      tryThis: 'Protect one evening this week from plans, screens, and logistics. Just be together.',
      watchFor: 'You both crave presence, so distracted time together can feel worse than time apart.',
    },
    receiving_gifts: {
      theyNeed: 'You give your time. They feel loved through thoughtful tokens.',
      tryThis: 'Combine both: plan a small outing together and bring them something that marks the moment.',
      watchFor: 'Being present is your gift. A small memento is theirs. Both matter.',
    },
    acts_of_service: {
      theyNeed: 'You show love by showing up. They feel it when something gets handled.',
      tryThis: 'Spend time together on a task they have been dreading. Your presence plus progress equals love.',
      watchFor: 'Hanging out feels like love to you. For them, helping out feels like love.',
    },
    physical_touch: {
      theyNeed: 'You value being together. They value being close — physically, not just in the same room.',
      tryThis: 'During your next shared moment, sit closer than you normally would. Let contact happen naturally.',
      watchFor: 'You might be in the same room and feel connected. They need to feel you, not just see you.',
    },
  },
  receiving_gifts: {
    words_of_affirmation: {
      theyNeed: 'You show love through gestures. They need to hear the feeling behind them.',
      tryThis: 'Next time you give them something, include a note that says why. The words are the real gift.',
      watchFor: 'A gift without an explanation might not land. Tell them what it means.',
    },
    quality_time: {
      theyNeed: 'You think in gestures. They think in moments together.',
      tryThis: 'Instead of a thing, give them an experience — a planned hour together doing something they love.',
      watchFor: 'They do not need the gift. They need you, undistracted, choosing them.',
    },
    receiving_gifts: {
      theyNeed: 'You both speak the same language — thoughtful tokens that say "you were on my mind."',
      tryThis: 'Surprise each other with something small this week. It does not have to cost anything.',
      watchFor: 'The thought counts more than the price. A saved meme or a picked flower can outweigh a purchase.',
    },
    acts_of_service: {
      theyNeed: 'You express love through giving. They feel it through doing.',
      tryThis: 'Replace a gift with an act: handle their errand, make their morning easier, solve a small problem.',
      watchFor: 'What you see as a loving surprise, they might see as stuff. What they need is help.',
    },
    physical_touch: {
      theyNeed: 'You give gifts. They need closeness — contact, warmth, physical presence.',
      tryThis: 'Next time you want to show love, reach for them instead of reaching for something to give.',
      watchFor: 'A hug held a little longer might mean more than the most thoughtful present.',
    },
  },
  acts_of_service: {
    words_of_affirmation: {
      theyNeed: 'You show love by doing. They need to hear that you see them and value them.',
      tryThis: 'After you do something for them, say why: "I did this because I know your week has been heavy."',
      watchFor: 'They might not notice what you did unless you name it — not for credit, but so they feel seen.',
    },
    quality_time: {
      theyNeed: 'You express love through action. They need your time, not your tasks.',
      tryThis: 'Stop doing for one evening and just be with them. That is the hardest and most loving act of service.',
      watchFor: 'You might show love by cleaning the kitchen. They would rather you sat down and talked.',
    },
    receiving_gifts: {
      theyNeed: 'You handle things. They feel loved through thoughtful surprises.',
      tryThis: 'Pick up something small for them on the way home — it says "I thought of you" in their language.',
      watchFor: 'Doing everything for them is your instinct. A small gesture might speak louder.',
    },
    acts_of_service: {
      theyNeed: 'You both feel loved when things get done. That is efficient and beautiful.',
      tryThis: 'Take turns choosing one thing to handle for the other this week, without asking.',
      watchFor: 'You both default to doing. Make sure you also stop and appreciate what the other did.',
    },
    physical_touch: {
      theyNeed: 'You show love through helpfulness. They need warmth — literal, physical closeness.',
      tryThis: 'After finishing a task, sit next to them. Touch their shoulder. Let the doing lead to being.',
      watchFor: 'They appreciate what you do, but what they crave is contact. End the task with a touch.',
    },
  },
  physical_touch: {
    words_of_affirmation: {
      theyNeed: 'You show love through contact. They need to hear the words behind it.',
      tryThis: 'Next time you reach for them, say what you are feeling: "I am glad you are here."',
      watchFor: 'A hug is your sentence. They need the actual sentence too.',
    },
    quality_time: {
      theyNeed: 'You express love through closeness. They need your undivided time.',
      tryThis: 'Sit close, but also make eye contact and ask a real question. Presence plus attention.',
      watchFor: 'Physical closeness while distracted does not register as love for them.',
    },
    receiving_gifts: {
      theyNeed: 'You reach for people. They feel loved through thoughtful surprises.',
      tryThis: 'Give them something small and hand it to them — the giving and the touch together.',
      watchFor: 'They love a thoughtful gesture. You love a long hug. Give theirs first.',
    },
    acts_of_service: {
      theyNeed: 'You show love through touch. They feel it when something gets handled.',
      tryThis: 'Do a chore they dislike, then come find them and sit close. Both languages in one move.',
      watchFor: 'Cuddling when the dishes are piled up might stress them out. Timing matters.',
    },
    physical_touch: {
      theyNeed: 'You both feel most loved through closeness, contact, and warmth.',
      tryThis: 'Hold each other a little longer this week. No reason needed.',
      watchFor: 'You both need it, so neither of you should wait for the other to initiate.',
    },
  },
};

/**
 * Get specific love language tips based on the pairing of both partners'
 * languages. Returns null if either language is unknown or not set.
 */
export function getLoveLanguageTips(
  myLanguage: string | null,
  partnerLanguage: string | null
): LoveLanguageTip | null {
  if (!myLanguage || !partnerLanguage) return null;
  const myTips = TIPS[myLanguage as Language];
  if (!myTips) return null;
  return myTips[partnerLanguage as Language] ?? null;
}

export function getLanguageShortLabel(language: string): string {
  return LANGUAGE_LABELS[language as Language] ?? language;
}
