export interface WouldYouRatherQuestion {
  id: string;
  optionA: string;
  optionB: string;
  category: 'fun' | 'deep' | 'spicy';
}

export interface HowWellQuestion {
  id: string;
  question: string;
  category: 'personality' | 'preferences' | 'memories';
}

export interface TruthOrDarePrompt {
  id: string;
  type: 'truth' | 'dare';
  prompt: string;
  category: 'fun' | 'deep' | 'spicy';
}

export const wouldYouRather: WouldYouRatherQuestion[] = [
  { id: 'wyr-1', optionA: 'Always have to cook dinner together', optionB: 'Always have to do the dishes together', category: 'fun' },
  { id: 'wyr-2', optionA: 'Only communicate through song lyrics for a day', optionB: 'Only communicate through movie quotes for a day', category: 'fun' },
  { id: 'wyr-3', optionA: 'Go on a spontaneous road trip right now', optionB: 'Have a perfectly planned vacation next month', category: 'fun' },
  { id: 'wyr-4', optionA: 'Have your partner plan every date night', optionB: 'Always be the one who plans date night', category: 'fun' },
  { id: 'wyr-5', optionA: 'Relive your first date exactly as it happened', optionB: 'Get to redo your first date knowing what you know now', category: 'fun' },
  { id: 'wyr-6', optionA: 'Only eat your partner\'s cooking for a year', optionB: 'Only eat at restaurants for a year (no home cooking)', category: 'fun' },
  { id: 'wyr-7', optionA: 'Have a pet that could talk about your relationship', optionB: 'Have a pet that could plan dates for you', category: 'fun' },
  { id: 'wyr-8', optionA: 'Star in a reality TV show about your relationship', optionB: 'Have a documentary made about how you met', category: 'fun' },
  { id: 'wyr-9', optionA: 'Always know what gift your partner wants', optionB: 'Always give surprises that turn out perfectly', category: 'fun' },
  { id: 'wyr-10', optionA: 'Dance together in public once a week', optionB: 'Sing karaoke together once a month', category: 'fun' },
  { id: 'wyr-11', optionA: 'Have matching outfits for every occasion', optionB: 'Have matching tattoos that change weekly', category: 'fun' },
  { id: 'wyr-12', optionA: 'Spend every weekend doing outdoor adventures', optionB: 'Spend every weekend having cozy nights in', category: 'fun' },
  { id: 'wyr-13', optionA: 'Be able to read your partner\'s mind for one hour a week', optionB: 'Have your partner read yours for one hour a week', category: 'fun' },
  { id: 'wyr-14', optionA: 'Live in a tiny home and travel the world together', optionB: 'Live in a dream house but never travel', category: 'fun' },
  { id: 'wyr-15', optionA: 'Have your love story turned into a bestselling book', optionB: 'Have your love story turned into a hit movie', category: 'fun' },
  { id: 'wyr-16', optionA: 'Always agree on what to watch', optionB: 'Always agree on where to eat', category: 'fun' },
  { id: 'wyr-17', optionA: 'Take a cooking class together every month', optionB: 'Take a dance class together every month', category: 'fun' },
  { id: 'wyr-18', optionA: 'Know exactly how your partner feels at all times', optionB: 'Always know the perfect thing to say to comfort them', category: 'deep' },
  { id: 'wyr-19', optionA: 'Never have another misunderstanding', optionB: 'Always resolve disagreements within an hour', category: 'deep' },
  { id: 'wyr-20', optionA: 'Grow old together in one place', optionB: 'Spend your lives exploring new places together', category: 'deep' },
  { id: 'wyr-21', optionA: 'Have a relationship where you never argue', optionB: 'Have a relationship where arguments always lead to growth', category: 'deep' },
  { id: 'wyr-22', optionA: 'Always feel butterflies when you see your partner', optionB: 'Always feel deeply at peace when you\'re together', category: 'deep' },
  { id: 'wyr-23', optionA: 'Be your partner\'s greatest source of comfort', optionB: 'Be your partner\'s greatest source of inspiration', category: 'deep' },
  { id: 'wyr-24', optionA: 'Know exactly what your future together looks like', optionB: 'Be surprised by every beautiful moment along the way', category: 'deep' },
  { id: 'wyr-25', optionA: 'Have your partner write you a heartfelt letter every week', optionB: 'Have your partner show love through small daily gestures', category: 'deep' },
  { id: 'wyr-26', optionA: 'Understand your partner\'s love language perfectly', optionB: 'Have your partner understand yours perfectly', category: 'deep' },
  { id: 'wyr-27', optionA: 'Be able to take away your partner\'s stress', optionB: 'Be able to double your partner\'s happiness', category: 'deep' },
  { id: 'wyr-28', optionA: 'Forget all your arguments but keep every happy memory', optionB: 'Remember everything, knowing it all made you stronger', category: 'deep' },
  { id: 'wyr-29', optionA: 'Have unlimited time together but always be busy', optionB: 'Have limited time together but fully present', category: 'deep' },
  { id: 'wyr-30', optionA: 'Be the one who loves more', optionB: 'Be the one who is loved more', category: 'deep' },
  { id: 'wyr-31', optionA: 'Change one thing about your past together', optionB: 'See one thing about your future together', category: 'deep' },
  { id: 'wyr-32', optionA: 'Always be your partner\'s first call in good times', optionB: 'Always be your partner\'s first call in hard times', category: 'deep' },
  { id: 'wyr-33', optionA: 'Have a love that\'s quiet and steady', optionB: 'Have a love that\'s passionate and intense', category: 'deep' },
  { id: 'wyr-34', optionA: 'Get a surprise weekend getaway planned by your partner', optionB: 'Plan a surprise weekend getaway for your partner', category: 'spicy' },
  { id: 'wyr-35', optionA: 'Recreate your most romantic moment together', optionB: 'Create an entirely new most romantic moment', category: 'spicy' },
  { id: 'wyr-36', optionA: 'Have a candlelit dinner at home every week', optionB: 'Have a spontaneous date night every week', category: 'spicy' },
  { id: 'wyr-37', optionA: 'Receive a handwritten love letter', optionB: 'Receive a surprise playlist made just for you', category: 'spicy' },
  { id: 'wyr-38', optionA: 'Take a couple\'s massage together', optionB: 'Take a couple\'s cooking class together', category: 'spicy' },
  { id: 'wyr-39', optionA: 'Always have the perfect anniversary surprise', optionB: 'Always have the perfect random Tuesday surprise', category: 'spicy' },
  { id: 'wyr-40', optionA: 'Slow dance in the kitchen whenever a good song comes on', optionB: 'Always hold hands when you walk together', category: 'spicy' },
  { id: 'wyr-41', optionA: 'Have breakfast in bed every Sunday', optionB: 'Have a stargazing date every month', category: 'spicy' },
  { id: 'wyr-42', optionA: 'Write your partner a poem (even if it\'s terrible)', optionB: 'Draw a portrait of your partner (even if it\'s terrible)', category: 'spicy' },
  { id: 'wyr-43', optionA: 'Watch the sunset together every evening for a week', optionB: 'Watch the sunrise together every morning for a week', category: 'spicy' },
  { id: 'wyr-44', optionA: 'Go skinny dipping together', optionB: 'Go on a midnight picnic together', category: 'spicy' },
  { id: 'wyr-45', optionA: 'Recreate your partner\'s favorite childhood date idea', optionB: 'Try something neither of you has ever done before', category: 'spicy' },
  { id: 'wyr-46', optionA: 'Have your partner whisper something sweet in your ear', optionB: 'Have your partner leave a sweet voicemail for you', category: 'spicy' },
  { id: 'wyr-47', optionA: 'Take a bath together with candles and music', optionB: 'Have a private rooftop dinner together', category: 'spicy' },
  { id: 'wyr-48', optionA: 'Give your partner a 30-minute massage', optionB: 'Receive a 30-minute massage from your partner', category: 'spicy' },
  { id: 'wyr-49', optionA: 'Fall asleep cuddling every night', optionB: 'Wake up to a good morning kiss every day', category: 'spicy' },
  { id: 'wyr-50', optionA: 'Plan a secret date your partner knows nothing about', optionB: 'Let your partner plan something totally out of your comfort zone', category: 'spicy' },
];

export const howWellDoYouKnowMe: HowWellQuestion[] = [
  { id: 'hw-1', question: 'What is my biggest pet peeve?', category: 'personality' },
  { id: 'hw-2', question: 'What am I most afraid of?', category: 'personality' },
  { id: 'hw-3', question: 'What makes me laugh the hardest?', category: 'personality' },
  { id: 'hw-4', question: 'What do I do when I\'m stressed?', category: 'personality' },
  { id: 'hw-5', question: 'What is my hidden talent?', category: 'personality' },
  { id: 'hw-6', question: 'What am I most proud of?', category: 'personality' },
  { id: 'hw-7', question: 'What\'s my go-to comfort activity?', category: 'personality' },
  { id: 'hw-8', question: 'What is my love language?', category: 'personality' },
  { id: 'hw-9', question: 'What do I value most in a friendship?', category: 'personality' },
  { id: 'hw-10', question: 'Am I a morning person or a night owl?', category: 'personality' },
  { id: 'hw-11', question: 'What would I change about myself if I could?', category: 'personality' },
  { id: 'hw-12', question: 'What topic could I talk about for hours?', category: 'personality' },
  { id: 'hw-13', question: 'How do I recharge after a long day?', category: 'personality' },
  { id: 'hw-14', question: 'What is my most unpopular opinion?', category: 'personality' },
  { id: 'hw-15', question: 'What makes me feel most appreciated?', category: 'personality' },
  { id: 'hw-16', question: 'What is the kindest thing someone has ever done for me?', category: 'personality' },
  { id: 'hw-17', question: 'What do I overthink the most?', category: 'personality' },
  { id: 'hw-18', question: 'What is my favorite meal of all time?', category: 'preferences' },
  { id: 'hw-19', question: 'What is my go-to takeout order?', category: 'preferences' },
  { id: 'hw-20', question: 'What is my favorite movie?', category: 'preferences' },
  { id: 'hw-21', question: 'What is my favorite song right now?', category: 'preferences' },
  { id: 'hw-22', question: 'What is my dream vacation destination?', category: 'preferences' },
  { id: 'hw-23', question: 'What would I do with a completely free Saturday?', category: 'preferences' },
  { id: 'hw-24', question: 'What is my ideal date night?', category: 'preferences' },
  { id: 'hw-25', question: 'Coffee, tea, or neither?', category: 'preferences' },
  { id: 'hw-26', question: 'What is my favorite season and why?', category: 'preferences' },
  { id: 'hw-27', question: 'What would I splurge on without any guilt?', category: 'preferences' },
  { id: 'hw-28', question: 'What is my guilty pleasure show?', category: 'preferences' },
  { id: 'hw-29', question: 'What is my favorite way to be surprised?', category: 'preferences' },
  { id: 'hw-30', question: 'What is my dream job if money didn\'t matter?', category: 'preferences' },
  { id: 'hw-31', question: 'What snack am I always craving?', category: 'preferences' },
  { id: 'hw-32', question: 'What is my go-to karaoke song?', category: 'preferences' },
  { id: 'hw-33', question: 'Mountains or beach?', category: 'preferences' },
  { id: 'hw-34', question: 'What is my favorite book or podcast?', category: 'preferences' },
  { id: 'hw-35', question: 'What was I most nervous about when we first met?', category: 'memories' },
  { id: 'hw-36', question: 'What is my favorite memory of us?', category: 'memories' },
  { id: 'hw-37', question: 'When did I first know I loved you?', category: 'memories' },
  { id: 'hw-38', question: 'What was the best trip we\'ve taken together?', category: 'memories' },
  { id: 'hw-39', question: 'What is the funniest thing that\'s happened to us?', category: 'memories' },
  { id: 'hw-40', question: 'What was I like when we first started dating?', category: 'memories' },
  { id: 'hw-41', question: 'What is the most thoughtful thing you\'ve done for me?', category: 'memories' },
  { id: 'hw-42', question: 'What was the hardest moment we\'ve gotten through together?', category: 'memories' },
  { id: 'hw-43', question: 'What was the first thing I ever cooked for you?', category: 'memories' },
  { id: 'hw-44', question: 'What song reminds me most of us?', category: 'memories' },
  { id: 'hw-45', question: 'What was our first big disagreement about?', category: 'memories' },
  { id: 'hw-46', question: 'What was the best gift I ever received?', category: 'memories' },
  { id: 'hw-47', question: 'What was my first impression of you?', category: 'memories' },
  { id: 'hw-48', question: 'What tradition of ours means the most to me?', category: 'memories' },
  { id: 'hw-49', question: 'What moment made me fall deeper in love with you?', category: 'memories' },
  { id: 'hw-50', question: 'What is the best compliment I\'ve ever given you?', category: 'memories' },
];

export const truthOrDare: TruthOrDarePrompt[] = [
  { id: 'td-1', type: 'truth', prompt: 'What was your very first thought when you saw me?', category: 'fun' },
  { id: 'td-2', type: 'truth', prompt: 'What is one thing I do that always makes you smile?', category: 'fun' },
  { id: 'td-3', type: 'truth', prompt: 'What is the most embarrassing thing you\'ve done to impress me?', category: 'fun' },
  { id: 'td-4', type: 'truth', prompt: 'Have you ever pretended to like something just because I liked it?', category: 'fun' },
  { id: 'td-5', type: 'truth', prompt: 'What is the silliest reason we\'ve ever argued about?', category: 'fun' },
  { id: 'td-6', type: 'truth', prompt: 'What is something you\'ve never told me but always wanted to?', category: 'deep' },
  { id: 'td-7', type: 'truth', prompt: 'What is the moment you felt most loved by me?', category: 'deep' },
  { id: 'td-8', type: 'truth', prompt: 'What is one thing you wish we did more of together?', category: 'deep' },
  { id: 'td-9', type: 'truth', prompt: 'What is the hardest thing about being in a relationship?', category: 'deep' },
  { id: 'td-10', type: 'truth', prompt: 'What is your favorite quality about our relationship?', category: 'deep' },
  { id: 'td-11', type: 'truth', prompt: 'What is one thing you admire about how I handle tough situations?', category: 'deep' },
  { id: 'td-12', type: 'truth', prompt: 'When do you feel closest to me?', category: 'deep' },
  { id: 'td-13', type: 'truth', prompt: 'What is one dream you haven\'t shared with me yet?', category: 'deep' },
  { id: 'td-14', type: 'truth', prompt: 'If you could relive one day from our relationship, which would it be?', category: 'deep' },
  { id: 'td-15', type: 'truth', prompt: 'What is one thing I\'ve taught you about love?', category: 'deep' },
  { id: 'td-16', type: 'truth', prompt: 'What is the most romantic thing you\'ve ever imagined doing together?', category: 'spicy' },
  { id: 'td-17', type: 'truth', prompt: 'What outfit of mine drives you the most crazy?', category: 'spicy' },
  { id: 'td-18', type: 'truth', prompt: 'What is the most attractive thing I do without realizing it?', category: 'spicy' },
  { id: 'td-19', type: 'truth', prompt: 'Where is the most adventurous place you\'d want to go on a date?', category: 'spicy' },
  { id: 'td-20', type: 'truth', prompt: 'What is a secret fantasy date you\'d love to go on?', category: 'spicy' },
  { id: 'td-21', type: 'truth', prompt: 'What is the boldest thing you\'ve ever done for love?', category: 'spicy' },
  { id: 'td-22', type: 'truth', prompt: 'What is one thing that always gives you butterflies about me?', category: 'spicy' },
  { id: 'td-23', type: 'truth', prompt: 'What song makes you think of us in a romantic way?', category: 'spicy' },
  { id: 'td-24', type: 'truth', prompt: 'What is the most spontaneous thing you\'d do for me right now?', category: 'spicy' },
  { id: 'td-25', type: 'truth', prompt: 'What part of your day do you most look forward to spending with me?', category: 'fun' },
  { id: 'td-26', type: 'truth', prompt: 'What habit of mine did you find weird at first but now love?', category: 'fun' },
  { id: 'td-27', type: 'truth', prompt: 'What small thing do I do that means the world to you?', category: 'deep' },
  { id: 'td-28', type: 'truth', prompt: 'If our relationship had a theme song, what would it be?', category: 'fun' },
  { id: 'td-29', type: 'truth', prompt: 'What is one way I\'ve changed for the better since we\'ve been together?', category: 'deep' },
  { id: 'td-30', type: 'truth', prompt: 'What would your perfect lazy Sunday with me look like?', category: 'fun' },
  { id: 'td-31', type: 'dare', prompt: 'Give your partner the longest hug you can.', category: 'fun' },
  { id: 'td-32', type: 'dare', prompt: 'Do your best impression of your partner.', category: 'fun' },
  { id: 'td-33', type: 'dare', prompt: 'Serenade your partner with any song.', category: 'fun' },
  { id: 'td-34', type: 'dare', prompt: 'Show your partner the last 3 photos in your camera roll.', category: 'fun' },
  { id: 'td-35', type: 'dare', prompt: 'Let your partner post anything on your social media.', category: 'fun' },
  { id: 'td-36', type: 'dare', prompt: 'Give your partner a genuine compliment for 60 seconds straight.', category: 'deep' },
  { id: 'td-37', type: 'dare', prompt: 'Look into your partner\'s eyes for 2 minutes without talking.', category: 'deep' },
  { id: 'td-38', type: 'dare', prompt: 'Write a short love note to your partner right now.', category: 'deep' },
  { id: 'td-39', type: 'dare', prompt: 'Tell your partner 3 things you\'ve never told them before.', category: 'deep' },
  { id: 'td-40', type: 'dare', prompt: 'Describe your partner using only 5 words \u2014 make them count.', category: 'deep' },
  { id: 'td-41', type: 'dare', prompt: 'Call or text a family member and brag about your partner.', category: 'deep' },
  { id: 'td-42', type: 'dare', prompt: 'Slow dance together to the next song that plays.', category: 'spicy' },
  { id: 'td-43', type: 'dare', prompt: 'Give your partner a 2-minute hand or shoulder massage.', category: 'spicy' },
  { id: 'td-44', type: 'dare', prompt: 'Whisper something sweet in your partner\'s ear.', category: 'spicy' },
  { id: 'td-45', type: 'dare', prompt: 'Recreate your first kiss right now.', category: 'spicy' },
  { id: 'td-46', type: 'dare', prompt: 'Feed your partner their favorite snack blindfolded.', category: 'spicy' },
  { id: 'td-47', type: 'dare', prompt: 'Make up a secret handshake together right now.', category: 'fun' },
  { id: 'td-48', type: 'dare', prompt: 'Tell your partner your favorite physical feature of theirs and why.', category: 'spicy' },
  { id: 'td-49', type: 'dare', prompt: 'Plan a surprise mini-date for sometime this week, right now.', category: 'spicy' },
  { id: 'td-50', type: 'dare', prompt: 'Draw a portrait of your partner in 30 seconds.', category: 'fun' },
  { id: 'td-51', type: 'dare', prompt: 'Do your best romantic movie scene reenactment.', category: 'fun' },
  { id: 'td-52', type: 'dare', prompt: 'Read the last text you sent about your partner out loud.', category: 'fun' },
  { id: 'td-53', type: 'dare', prompt: 'Give your partner a forehead kiss and say what you love most about them.', category: 'deep' },
  { id: 'td-54', type: 'dare', prompt: 'Take a silly selfie together right now.', category: 'fun' },
  { id: 'td-55', type: 'dare', prompt: 'Close your eyes and describe your partner\'s face in detail.', category: 'deep' },
  { id: 'td-56', type: 'dare', prompt: 'Share your screen time report \u2014 no deleting first.', category: 'fun' },
  { id: 'td-57', type: 'dare', prompt: 'Send a voice note to your partner right now saying what they mean to you.', category: 'deep' },
  { id: 'td-58', type: 'dare', prompt: 'Pick a song and dance to it together for the full chorus.', category: 'fun' },
  { id: 'td-59', type: 'dare', prompt: 'Let your partner choose your phone wallpaper for a week.', category: 'fun' },
  { id: 'td-60', type: 'dare', prompt: 'Give your partner a piggyback ride across the room.', category: 'fun' },
];

/**
 * Shuffle array using Fisher-Yates and return first `count` items.
 */
export function getRandomQuestions<T>(questions: T[], count: number): T[] {
  const shuffled = [...questions];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled.slice(0, count);
}
