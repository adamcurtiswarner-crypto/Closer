# Games & Quizzes Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add 3 local/same-device game modes (Would You Rather, How Well Do You Know Me, Truth or Dare) accessible from a DateNightCard on the Today screen.

**Architecture:** Entirely client-side. Static question config file, no Firestore. DateNightCard on Today screen → hidden tab `games.tsx` → GameLauncher → game mode components. Each game is a self-contained component with local useState.

**Tech Stack:** React Native, Expo Router, react-native-reanimated, expo-haptics

---

### Task 1: Game Questions Config

**Files:**
- Create: `src/config/gameQuestions.ts`

**Step 1: Create the config file with types and question data**

```typescript
// src/config/gameQuestions.ts

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
  // ── Fun ──
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

  // ── Deep ──
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

  // ── Spicy ──
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
  // ── Personality ──
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

  // ── Preferences ──
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

  // ── Memories ──
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
  // ── Truths ──
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

  // ── Dares ──
  { id: 'td-31', type: 'dare', prompt: 'Give your partner the longest hug you can.', category: 'fun' },
  { id: 'td-32', type: 'dare', prompt: 'Do your best impression of your partner.', category: 'fun' },
  { id: 'td-33', type: 'dare', prompt: 'Serenade your partner with any song.', category: 'fun' },
  { id: 'td-34', type: 'dare', prompt: 'Show your partner the last 3 photos in your camera roll.', category: 'fun' },
  { id: 'td-35', type: 'dare', prompt: 'Let your partner post anything on your social media.', category: 'fun' },
  { id: 'td-36', type: 'dare', prompt: 'Give your partner a genuine compliment for 60 seconds straight.', category: 'deep' },
  { id: 'td-37', type: 'dare', prompt: 'Look into your partner\'s eyes for 2 minutes without talking.', category: 'deep' },
  { id: 'td-38', type: 'dare', prompt: 'Write a short love note to your partner right now.', category: 'deep' },
  { id: 'td-39', type: 'dare', prompt: 'Tell your partner 3 things you\'ve never told them before.', category: 'deep' },
  { id: 'td-40', type: 'dare', prompt: 'Describe your partner using only 5 words — make them count.', category: 'deep' },
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
  { id: 'td-56', type: 'dare', prompt: 'Share your screen time report — no deleting first.', category: 'fun' },
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
```

**Step 2: Verify no type errors**

Run: `cd /Users/adamwarner/stoke-app/app && npx tsc --noEmit 2>&1 | grep -c "gameQuestions"`
Expected: 0 errors from this file

**Step 3: Commit**

```bash
git add src/config/gameQuestions.ts
git commit -m "feat: add game questions config with 160 questions across 3 modes"
```

---

### Task 2: PassPhone Transition Component

**Files:**
- Create: `src/components/PassPhone.tsx`

**Step 1: Create the component**

```typescript
// src/components/PassPhone.tsx
import React, { useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import Animated, { FadeIn, FadeInUp } from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';

interface PassPhoneProps {
  partnerName: string;
  instruction?: string;
  onReady: () => void;
}

export function PassPhone({ partnerName, instruction, onReady }: PassPhoneProps) {
  useEffect(() => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
  }, []);

  return (
    <View style={styles.container}>
      <Animated.View entering={FadeInUp.duration(500)} style={styles.content}>
        <Text style={styles.emoji}>{'\uD83D\uDCF1'}</Text>
        <Text style={styles.title}>Pass to {partnerName}</Text>
        {instruction && (
          <Text style={styles.instruction}>{instruction}</Text>
        )}
      </Animated.View>

      <Animated.View entering={FadeIn.duration(400).delay(600)}>
        <TouchableOpacity
          style={styles.button}
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            onReady();
          }}
          activeOpacity={0.8}
        >
          <Text style={styles.buttonText}>I'm {partnerName}, ready</Text>
        </TouchableOpacity>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fef7f4',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  content: {
    alignItems: 'center',
    marginBottom: 48,
  },
  emoji: {
    fontSize: 48,
    marginBottom: 24,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#292524',
    textAlign: 'center',
    letterSpacing: -0.5,
  },
  instruction: {
    fontSize: 15,
    color: '#78716c',
    textAlign: 'center',
    marginTop: 12,
    lineHeight: 22,
  },
  button: {
    paddingVertical: 16,
    paddingHorizontal: 36,
    backgroundColor: '#c97454',
    borderRadius: 16,
  },
  buttonText: {
    fontSize: 17,
    fontWeight: '700',
    color: '#ffffff',
  },
});
```

**Step 2: Commit**

```bash
git add src/components/PassPhone.tsx
git commit -m "feat: add PassPhone transition overlay component"
```

---

### Task 3: GameComplete Summary Component

**Files:**
- Create: `src/components/GameComplete.tsx`

**Step 1: Create the component**

```typescript
// src/components/GameComplete.tsx
import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import Animated, { FadeIn, FadeInUp } from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';

interface GameCompleteProps {
  title: string;
  subtitle: string;
  rounds: number;
  score?: number;
  onPlayAgain: () => void;
  onExit: () => void;
}

export function GameComplete({
  title,
  subtitle,
  rounds,
  score,
  onPlayAgain,
  onExit,
}: GameCompleteProps) {
  return (
    <View style={styles.container}>
      <Animated.View entering={FadeInUp.duration(500)} style={styles.content}>
        <Text style={styles.emoji}>{'\u2728'}</Text>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.subtitle}>{subtitle}</Text>

        <View style={styles.statsRow}>
          <View style={styles.statBox}>
            <Text style={styles.statValue}>{rounds}</Text>
            <Text style={styles.statLabel}>Rounds</Text>
          </View>
          {score !== undefined && (
            <View style={styles.statBox}>
              <Text style={styles.statValue}>{score}</Text>
              <Text style={styles.statLabel}>Correct</Text>
            </View>
          )}
        </View>
      </Animated.View>

      <Animated.View entering={FadeIn.duration(400).delay(400)} style={styles.buttons}>
        <TouchableOpacity
          style={styles.primaryButton}
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            onPlayAgain();
          }}
          activeOpacity={0.8}
        >
          <Text style={styles.primaryButtonText}>Play again</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.secondaryButton}
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            onExit();
          }}
          activeOpacity={0.7}
        >
          <Text style={styles.secondaryButtonText}>Back to games</Text>
        </TouchableOpacity>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fafaf9',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  content: {
    alignItems: 'center',
    marginBottom: 48,
  },
  emoji: {
    fontSize: 48,
    marginBottom: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#292524',
    textAlign: 'center',
    letterSpacing: -0.5,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 15,
    color: '#78716c',
    textAlign: 'center',
    lineHeight: 22,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 24,
    marginTop: 28,
  },
  statBox: {
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 20,
    paddingHorizontal: 28,
    shadowColor: '#1c1917',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 1,
  },
  statValue: {
    fontSize: 28,
    fontWeight: '800',
    color: '#c97454',
  },
  statLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#a8a29e',
    marginTop: 4,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  buttons: {
    width: '100%',
    gap: 12,
  },
  primaryButton: {
    paddingVertical: 16,
    backgroundColor: '#c97454',
    borderRadius: 16,
    alignItems: 'center',
  },
  primaryButtonText: {
    fontSize: 17,
    fontWeight: '700',
    color: '#ffffff',
  },
  secondaryButton: {
    paddingVertical: 14,
    alignItems: 'center',
  },
  secondaryButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#78716c',
  },
});
```

**Step 2: Commit**

```bash
git add src/components/GameComplete.tsx
git commit -m "feat: add GameComplete summary screen component"
```

---

### Task 4: Would You Rather Game Component

**Files:**
- Create: `src/components/WouldYouRather.tsx`

**Step 1: Create the component**

This is the largest game component. Flow: question → Partner 1 picks → pass phone → Partner 2 picks → reveal side-by-side → next.

```typescript
// src/components/WouldYouRather.tsx
import React, { useState, useMemo } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import Animated, { FadeIn, FadeInUp } from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { wouldYouRather, getRandomQuestions, type WouldYouRatherQuestion } from '@/config/gameQuestions';
import { PassPhone } from './PassPhone';
import { GameComplete } from './GameComplete';

const ROUND_COUNT = 10;

type Phase = 'p1_pick' | 'pass_to_p2' | 'p2_pick' | 'reveal' | 'complete';

interface WouldYouRatherProps {
  userName: string;
  partnerName: string;
  onExit: () => void;
}

export function WouldYouRather({ userName, partnerName, onExit }: WouldYouRatherProps) {
  const questions = useMemo(() => getRandomQuestions(wouldYouRather, ROUND_COUNT), []);

  const [round, setRound] = useState(0);
  const [phase, setPhase] = useState<Phase>('p1_pick');
  const [p1Choice, setP1Choice] = useState<'A' | 'B' | null>(null);
  const [p2Choice, setP2Choice] = useState<'A' | 'B' | null>(null);
  const [matches, setMatches] = useState(0);

  const currentQ = questions[round];

  const handleP1Pick = (choice: 'A' | 'B') => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setP1Choice(choice);
    setPhase('pass_to_p2');
  };

  const handleP2Pick = (choice: 'A' | 'B') => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setP2Choice(choice);
    if (choice === p1Choice) setMatches((m) => m + 1);
    setPhase('reveal');
  };

  const handleNext = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (round + 1 >= ROUND_COUNT) {
      setPhase('complete');
    } else {
      setRound((r) => r + 1);
      setP1Choice(null);
      setP2Choice(null);
      setPhase('p1_pick');
    }
  };

  const handlePlayAgain = () => {
    // Questions are memoized per mount, so user must exit and re-enter for new set
    setRound(0);
    setP1Choice(null);
    setP2Choice(null);
    setMatches(0);
    setPhase('p1_pick');
  };

  const handleExit = () => {
    if (phase !== 'complete') {
      Alert.alert('End game?', 'Progress won\'t be saved.', [
        { text: 'Keep playing', style: 'cancel' },
        { text: 'End game', style: 'destructive', onPress: onExit },
      ]);
    } else {
      onExit();
    }
  };

  if (phase === 'pass_to_p2') {
    return (
      <PassPhone
        partnerName={partnerName}
        instruction="Don't peek at their answer"
        onReady={() => setPhase('p2_pick')}
      />
    );
  }

  if (phase === 'complete') {
    return (
      <GameComplete
        title="Great minds"
        subtitle={matches === ROUND_COUNT
          ? `You matched on every single one. You two really are in sync.`
          : `You matched on ${matches} out of ${ROUND_COUNT}. Every difference is something new to learn.`
        }
        rounds={ROUND_COUNT}
        score={matches}
        onPlayAgain={handlePlayAgain}
        onExit={onExit}
      />
    );
  }

  if (phase === 'reveal') {
    return (
      <View style={styles.container}>
        <ExitButton onPress={handleExit} />
        <RoundCounter round={round + 1} total={ROUND_COUNT} />

        <Animated.View entering={FadeInUp.duration(400)} style={styles.revealRow}>
          <View style={[styles.revealCard, p1Choice === p2Choice && styles.revealCardMatch]}>
            <Text style={styles.revealName}>{userName}</Text>
            <Text style={styles.revealChoice}>
              {p1Choice === 'A' ? currentQ.optionA : currentQ.optionB}
            </Text>
          </View>
          <View style={[styles.revealCard, p1Choice === p2Choice && styles.revealCardMatch]}>
            <Text style={styles.revealName}>{partnerName}</Text>
            <Text style={styles.revealChoice}>
              {p2Choice === 'A' ? currentQ.optionA : currentQ.optionB}
            </Text>
          </View>
        </Animated.View>

        <Animated.View entering={FadeIn.duration(300).delay(200)}>
          <Text style={styles.matchLabel}>
            {p1Choice === p2Choice ? 'You matched' : 'Different picks'}
          </Text>
        </Animated.View>

        <Animated.View entering={FadeIn.duration(300).delay(400)}>
          <TouchableOpacity style={styles.nextButton} onPress={handleNext} activeOpacity={0.8}>
            <Text style={styles.nextButtonText}>
              {round + 1 >= ROUND_COUNT ? 'See results' : 'Next question'}
            </Text>
          </TouchableOpacity>
        </Animated.View>
      </View>
    );
  }

  // p1_pick or p2_pick
  const currentPicker = phase === 'p1_pick' ? userName : partnerName;

  return (
    <View style={styles.container}>
      <ExitButton onPress={handleExit} />
      <RoundCounter round={round + 1} total={ROUND_COUNT} />

      <Animated.View entering={FadeIn.duration(300)} style={styles.pickerLabel}>
        <Text style={styles.pickerName}>{currentPicker}'s turn</Text>
      </Animated.View>

      <Animated.Text entering={FadeInUp.duration(400)} style={styles.questionLabel}>
        Would you rather...
      </Animated.Text>

      <View style={styles.optionsColumn}>
        <Animated.View entering={FadeInUp.duration(400).delay(100)}>
          <TouchableOpacity
            style={styles.optionButton}
            onPress={() => phase === 'p1_pick' ? handleP1Pick('A') : handleP2Pick('A')}
            activeOpacity={0.8}
          >
            <Text style={styles.optionText}>{currentQ.optionA}</Text>
          </TouchableOpacity>
        </Animated.View>

        <Text style={styles.orText}>or</Text>

        <Animated.View entering={FadeInUp.duration(400).delay(200)}>
          <TouchableOpacity
            style={styles.optionButton}
            onPress={() => phase === 'p1_pick' ? handleP1Pick('B') : handleP2Pick('B')}
            activeOpacity={0.8}
          >
            <Text style={styles.optionText}>{currentQ.optionB}</Text>
          </TouchableOpacity>
        </Animated.View>
      </View>
    </View>
  );
}

function RoundCounter({ round, total }: { round: number; total: number }) {
  return (
    <View style={styles.roundCounter}>
      <Text style={styles.roundText}>Question {round} of {total}</Text>
    </View>
  );
}

function ExitButton({ onPress }: { onPress: () => void }) {
  return (
    <TouchableOpacity style={styles.exitButton} onPress={onPress} activeOpacity={0.7}>
      <Text style={styles.exitText}>{'\u2715'}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fafaf9',
    paddingHorizontal: 24,
    paddingTop: 16,
  },
  exitButton: {
    position: 'absolute',
    top: 16,
    right: 20,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#f5f5f4',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  exitText: {
    fontSize: 16,
    color: '#78716c',
  },
  roundCounter: {
    alignItems: 'center',
    marginTop: 8,
    marginBottom: 24,
  },
  roundText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#a8a29e',
    letterSpacing: 0.3,
  },
  pickerLabel: {
    alignItems: 'center',
    marginBottom: 8,
  },
  pickerName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#c97454',
  },
  questionLabel: {
    fontSize: 22,
    fontWeight: '700',
    color: '#292524',
    textAlign: 'center',
    letterSpacing: -0.5,
    marginBottom: 28,
  },
  optionsColumn: {
    flex: 1,
    justifyContent: 'center',
    gap: 12,
    paddingBottom: 60,
  },
  optionButton: {
    backgroundColor: '#ffffff',
    borderRadius: 20,
    padding: 24,
    shadowColor: '#1c1917',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 2,
  },
  optionText: {
    fontSize: 17,
    fontWeight: '600',
    color: '#292524',
    textAlign: 'center',
    lineHeight: 24,
  },
  orText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#a8a29e',
    textAlign: 'center',
  },
  // ─── Reveal ───
  revealRow: {
    flex: 1,
    justifyContent: 'center',
    gap: 16,
    paddingBottom: 40,
  },
  revealCard: {
    backgroundColor: '#ffffff',
    borderRadius: 20,
    padding: 20,
    shadowColor: '#1c1917',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 1,
  },
  revealCardMatch: {
    borderWidth: 2,
    borderColor: '#c97454',
  },
  revealName: {
    fontSize: 12,
    fontWeight: '700',
    color: '#a8a29e',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  revealChoice: {
    fontSize: 16,
    fontWeight: '600',
    color: '#292524',
    lineHeight: 22,
  },
  matchLabel: {
    fontSize: 15,
    fontWeight: '700',
    color: '#c97454',
    textAlign: 'center',
    marginBottom: 16,
  },
  nextButton: {
    paddingVertical: 16,
    backgroundColor: '#c97454',
    borderRadius: 16,
    alignItems: 'center',
    marginBottom: 40,
  },
  nextButtonText: {
    fontSize: 17,
    fontWeight: '700',
    color: '#ffffff',
  },
});
```

**Step 2: Commit**

```bash
git add src/components/WouldYouRather.tsx
git commit -m "feat: add Would You Rather game component"
```

---

### Task 5: How Well Do You Know Me Game Component

**Files:**
- Create: `src/components/HowWellDoYouKnowMe.tsx`

**Step 1: Create the component**

Flow: question → Answerer types real answer → pass phone → Guesser types guess → reveal → honor-system score → next.

```typescript
// src/components/HowWellDoYouKnowMe.tsx
import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Keyboard,
} from 'react-native';
import Animated, { FadeIn, FadeInUp } from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { howWellDoYouKnowMe, getRandomQuestions, type HowWellQuestion } from '@/config/gameQuestions';
import { PassPhone } from './PassPhone';
import { GameComplete } from './GameComplete';

const ROUND_COUNT = 10;

type Phase = 'answer' | 'pass_to_guesser' | 'guess' | 'reveal' | 'pass_to_answerer' | 'complete';

interface HowWellDoYouKnowMeProps {
  userName: string;
  partnerName: string;
  onExit: () => void;
}

export function HowWellDoYouKnowMe({ userName, partnerName, onExit }: HowWellDoYouKnowMeProps) {
  const questions = useMemo(() => getRandomQuestions(howWellDoYouKnowMe, ROUND_COUNT), []);

  const [round, setRound] = useState(0);
  const [phase, setPhase] = useState<Phase>('answer');
  const [realAnswer, setRealAnswer] = useState('');
  const [guess, setGuess] = useState('');
  const [score, setScore] = useState(0);
  // Alternate who answers: even rounds = user, odd rounds = partner
  const isUserAnswerer = round % 2 === 0;
  const answerer = isUserAnswerer ? userName : partnerName;
  const guesser = isUserAnswerer ? partnerName : userName;

  const currentQ = questions[round];

  const handleSubmitAnswer = () => {
    if (!realAnswer.trim()) return;
    Keyboard.dismiss();
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setPhase('pass_to_guesser');
  };

  const handleSubmitGuess = () => {
    if (!guess.trim()) return;
    Keyboard.dismiss();
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setPhase('reveal');
  };

  const handleScore = (correct: boolean) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    if (correct) setScore((s) => s + 1);

    if (round + 1 >= ROUND_COUNT) {
      setPhase('complete');
    } else {
      setPhase('pass_to_answerer');
    }
  };

  const handleNextRound = () => {
    setRound((r) => r + 1);
    setRealAnswer('');
    setGuess('');
    setPhase('answer');
  };

  const handlePlayAgain = () => {
    setRound(0);
    setRealAnswer('');
    setGuess('');
    setScore(0);
    setPhase('answer');
  };

  const handleExit = () => {
    if (phase !== 'complete') {
      Alert.alert('End game?', 'Progress won\'t be saved.', [
        { text: 'Keep playing', style: 'cancel' },
        { text: 'End game', style: 'destructive', onPress: onExit },
      ]);
    } else {
      onExit();
    }
  };

  if (phase === 'pass_to_guesser') {
    return (
      <PassPhone
        partnerName={guesser}
        instruction="Time to guess the answer"
        onReady={() => setPhase('guess')}
      />
    );
  }

  if (phase === 'pass_to_answerer') {
    const nextAnswerer = round % 2 === 0 ? partnerName : userName;
    return (
      <PassPhone
        partnerName={nextAnswerer}
        instruction="Your turn to answer about yourself"
        onReady={handleNextRound}
      />
    );
  }

  if (phase === 'complete') {
    return (
      <GameComplete
        title="Well played"
        subtitle={score >= ROUND_COUNT * 0.7
          ? `${score} out of ${ROUND_COUNT} correct. You really know each other.`
          : `${score} out of ${ROUND_COUNT} correct. Plenty of new things to discover.`
        }
        rounds={ROUND_COUNT}
        score={score}
        onPlayAgain={handlePlayAgain}
        onExit={onExit}
      />
    );
  }

  if (phase === 'reveal') {
    return (
      <View style={styles.container}>
        <ExitButton onPress={handleExit} />
        <RoundCounter round={round + 1} total={ROUND_COUNT} />

        <Animated.View entering={FadeInUp.duration(400)} style={styles.revealContent}>
          <Text style={styles.revealQuestion}>{currentQ.question}</Text>

          <View style={styles.revealCard}>
            <Text style={styles.revealLabel}>{answerer}'s answer</Text>
            <Text style={styles.revealText}>{realAnswer}</Text>
          </View>

          <View style={styles.revealCard}>
            <Text style={styles.revealLabel}>{guesser}'s guess</Text>
            <Text style={styles.revealText}>{guess}</Text>
          </View>
        </Animated.View>

        <Animated.View entering={FadeIn.duration(300).delay(300)} style={styles.scorePrompt}>
          <Text style={styles.scoreQuestion}>Did {guesser} get it right?</Text>
          <View style={styles.scoreRow}>
            <TouchableOpacity
              style={[styles.scoreButton, styles.scoreButtonYes]}
              onPress={() => handleScore(true)}
              activeOpacity={0.8}
            >
              <Text style={styles.scoreButtonText}>Yes</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.scoreButton, styles.scoreButtonNo]}
              onPress={() => handleScore(false)}
              activeOpacity={0.8}
            >
              <Text style={[styles.scoreButtonText, styles.scoreButtonNoText]}>Not quite</Text>
            </TouchableOpacity>
          </View>
        </Animated.View>
      </View>
    );
  }

  // answer or guess phase
  const isAnswerPhase = phase === 'answer';
  const currentPlayer = isAnswerPhase ? answerer : guesser;
  const inputValue = isAnswerPhase ? realAnswer : guess;
  const setInputValue = isAnswerPhase ? setRealAnswer : setGuess;
  const handleSubmit = isAnswerPhase ? handleSubmitAnswer : handleSubmitGuess;
  const placeholder = isAnswerPhase ? 'Type your real answer...' : 'Type your guess...';

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ExitButton onPress={handleExit} />
      <RoundCounter round={round + 1} total={ROUND_COUNT} />

      <Animated.View entering={FadeIn.duration(300)} style={styles.pickerLabel}>
        <Text style={styles.pickerName}>
          {isAnswerPhase ? `${currentPlayer}, answer honestly` : `${currentPlayer}, take a guess`}
        </Text>
      </Animated.View>

      <Animated.Text entering={FadeInUp.duration(400)} style={styles.questionText}>
        {currentQ.question}
      </Animated.Text>

      <View style={styles.inputArea}>
        <TextInput
          style={styles.textInput}
          placeholder={placeholder}
          placeholderTextColor="#a8a29e"
          value={inputValue}
          onChangeText={setInputValue}
          multiline
          maxLength={200}
          autoFocus
        />
        <TouchableOpacity
          style={[styles.submitButton, !inputValue.trim() && styles.submitButtonDisabled]}
          onPress={handleSubmit}
          disabled={!inputValue.trim()}
          activeOpacity={0.8}
        >
          <Text style={styles.submitButtonText}>Done</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

function RoundCounter({ round, total }: { round: number; total: number }) {
  return (
    <View style={styles.roundCounter}>
      <Text style={styles.roundText}>Question {round} of {total}</Text>
    </View>
  );
}

function ExitButton({ onPress }: { onPress: () => void }) {
  return (
    <TouchableOpacity style={styles.exitButton} onPress={onPress} activeOpacity={0.7}>
      <Text style={styles.exitText}>{'\u2715'}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fafaf9',
    paddingHorizontal: 24,
    paddingTop: 16,
  },
  exitButton: {
    position: 'absolute',
    top: 16,
    right: 20,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#f5f5f4',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  exitText: {
    fontSize: 16,
    color: '#78716c',
  },
  roundCounter: {
    alignItems: 'center',
    marginTop: 8,
    marginBottom: 24,
  },
  roundText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#a8a29e',
    letterSpacing: 0.3,
  },
  pickerLabel: {
    alignItems: 'center',
    marginBottom: 16,
  },
  pickerName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#c97454',
  },
  questionText: {
    fontSize: 22,
    fontWeight: '700',
    color: '#292524',
    textAlign: 'center',
    letterSpacing: -0.5,
    marginBottom: 32,
    lineHeight: 30,
  },
  inputArea: {
    flex: 1,
    justifyContent: 'center',
    paddingBottom: 60,
    gap: 16,
  },
  textInput: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 20,
    fontSize: 16,
    color: '#292524',
    minHeight: 80,
    textAlignVertical: 'top',
    shadowColor: '#1c1917',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 1,
  },
  submitButton: {
    paddingVertical: 16,
    backgroundColor: '#c97454',
    borderRadius: 16,
    alignItems: 'center',
  },
  submitButtonDisabled: {
    opacity: 0.4,
  },
  submitButtonText: {
    fontSize: 17,
    fontWeight: '700',
    color: '#ffffff',
  },
  // ─── Reveal ───
  revealContent: {
    flex: 1,
    justifyContent: 'center',
    gap: 16,
    paddingBottom: 20,
  },
  revealQuestion: {
    fontSize: 18,
    fontWeight: '700',
    color: '#292524',
    textAlign: 'center',
    marginBottom: 8,
    lineHeight: 24,
  },
  revealCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 20,
    shadowColor: '#1c1917',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 1,
  },
  revealLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#a8a29e',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  revealText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#292524',
    lineHeight: 22,
  },
  scorePrompt: {
    paddingBottom: 40,
  },
  scoreQuestion: {
    fontSize: 15,
    fontWeight: '600',
    color: '#78716c',
    textAlign: 'center',
    marginBottom: 16,
  },
  scoreRow: {
    flexDirection: 'row',
    gap: 12,
  },
  scoreButton: {
    flex: 1,
    paddingVertical: 16,
    borderRadius: 16,
    alignItems: 'center',
  },
  scoreButtonYes: {
    backgroundColor: '#c97454',
  },
  scoreButtonNo: {
    backgroundColor: '#f5f5f4',
  },
  scoreButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#ffffff',
  },
  scoreButtonNoText: {
    color: '#78716c',
  },
});
```

**Step 2: Commit**

```bash
git add src/components/HowWellDoYouKnowMe.tsx
git commit -m "feat: add How Well Do You Know Me game component"
```

---

### Task 6: Truth or Dare Game Component

**Files:**
- Create: `src/components/TruthOrDare.tsx`

**Step 1: Create the component**

Flow: current player picks truth/dare → show prompt → mark done → swap turns.

```typescript
// src/components/TruthOrDare.tsx
import React, { useState, useMemo } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import Animated, { FadeIn, FadeInUp } from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { truthOrDare, getRandomQuestions, type TruthOrDarePrompt } from '@/config/gameQuestions';
import { GameComplete } from './GameComplete';

const ROUND_COUNT = 10;

type Phase = 'choose' | 'prompt' | 'complete';

interface TruthOrDareProps {
  userName: string;
  partnerName: string;
  onExit: () => void;
}

export function TruthOrDare({ userName, partnerName, onExit }: TruthOrDareProps) {
  const truths = useMemo(() => getRandomQuestions(
    truthOrDare.filter((q) => q.type === 'truth'),
    ROUND_COUNT,
  ), []);
  const dares = useMemo(() => getRandomQuestions(
    truthOrDare.filter((q) => q.type === 'dare'),
    ROUND_COUNT,
  ), []);

  const [round, setRound] = useState(0);
  const [phase, setPhase] = useState<Phase>('choose');
  const [currentPrompt, setCurrentPrompt] = useState<TruthOrDarePrompt | null>(null);
  const [truthIndex, setTruthIndex] = useState(0);
  const [dareIndex, setDareIndex] = useState(0);

  const isUserTurn = round % 2 === 0;
  const currentPlayer = isUserTurn ? userName : partnerName;

  const handleChoose = (type: 'truth' | 'dare') => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    if (type === 'truth') {
      setCurrentPrompt(truths[truthIndex % truths.length]);
      setTruthIndex((i) => i + 1);
    } else {
      setCurrentPrompt(dares[dareIndex % dares.length]);
      setDareIndex((i) => i + 1);
    }
    setPhase('prompt');
  };

  const handleDone = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (round + 1 >= ROUND_COUNT) {
      setPhase('complete');
    } else {
      setRound((r) => r + 1);
      setCurrentPrompt(null);
      setPhase('choose');
    }
  };

  const handlePlayAgain = () => {
    setRound(0);
    setPhase('choose');
    setCurrentPrompt(null);
    setTruthIndex(0);
    setDareIndex(0);
  };

  const handleExit = () => {
    if (phase !== 'complete') {
      Alert.alert('End game?', 'Progress won\'t be saved.', [
        { text: 'Keep playing', style: 'cancel' },
        { text: 'End game', style: 'destructive', onPress: onExit },
      ]);
    } else {
      onExit();
    }
  };

  if (phase === 'complete') {
    return (
      <GameComplete
        title="That was bold"
        subtitle={`${ROUND_COUNT} rounds of truths and dares. What a night.`}
        rounds={ROUND_COUNT}
        onPlayAgain={handlePlayAgain}
        onExit={onExit}
      />
    );
  }

  if (phase === 'prompt' && currentPrompt) {
    return (
      <View style={styles.container}>
        <ExitButton onPress={handleExit} />
        <RoundCounter round={round + 1} total={ROUND_COUNT} />

        <View style={styles.promptContent}>
          <Animated.View entering={FadeIn.duration(300)}>
            <View style={[
              styles.typeBadge,
              currentPrompt.type === 'dare' && styles.typeBadgeDare,
            ]}>
              <Text style={[
                styles.typeBadgeText,
                currentPrompt.type === 'dare' && styles.typeBadgeTextDare,
              ]}>
                {currentPrompt.type === 'truth' ? 'Truth' : 'Dare'}
              </Text>
            </View>
          </Animated.View>

          <Animated.Text entering={FadeInUp.duration(400).delay(100)} style={styles.promptText}>
            {currentPrompt.prompt}
          </Animated.Text>

          <Animated.View entering={FadeIn.duration(300).delay(100)}>
            <Text style={styles.forLabel}>for {currentPlayer}</Text>
          </Animated.View>
        </View>

        <Animated.View entering={FadeIn.duration(300).delay(400)}>
          <TouchableOpacity style={styles.doneButton} onPress={handleDone} activeOpacity={0.8}>
            <Text style={styles.doneButtonText}>Done</Text>
          </TouchableOpacity>
        </Animated.View>
      </View>
    );
  }

  // choose phase
  return (
    <View style={styles.container}>
      <ExitButton onPress={handleExit} />
      <RoundCounter round={round + 1} total={ROUND_COUNT} />

      <View style={styles.chooseContent}>
        <Animated.View entering={FadeIn.duration(300)} style={styles.turnLabel}>
          <Text style={styles.turnName}>{currentPlayer}'s turn</Text>
        </Animated.View>

        <Animated.Text entering={FadeInUp.duration(400)} style={styles.chooseTitle}>
          Truth or Dare?
        </Animated.Text>

        <View style={styles.chooseRow}>
          <Animated.View entering={FadeInUp.duration(400).delay(100)} style={styles.chooseButtonWrap}>
            <TouchableOpacity
              style={[styles.chooseButton, styles.chooseButtonTruth]}
              onPress={() => handleChoose('truth')}
              activeOpacity={0.8}
            >
              <Text style={styles.chooseEmoji}>{'\uD83E\uDD14'}</Text>
              <Text style={styles.chooseButtonText}>Truth</Text>
            </TouchableOpacity>
          </Animated.View>

          <Animated.View entering={FadeInUp.duration(400).delay(200)} style={styles.chooseButtonWrap}>
            <TouchableOpacity
              style={[styles.chooseButton, styles.chooseButtonDare]}
              onPress={() => handleChoose('dare')}
              activeOpacity={0.8}
            >
              <Text style={styles.chooseEmoji}>{'\uD83D\uDD25'}</Text>
              <Text style={styles.chooseButtonText}>Dare</Text>
            </TouchableOpacity>
          </Animated.View>
        </View>
      </View>
    </View>
  );
}

function RoundCounter({ round, total }: { round: number; total: number }) {
  return (
    <View style={styles.roundCounter}>
      <Text style={styles.roundText}>Round {round} of {total}</Text>
    </View>
  );
}

function ExitButton({ onPress }: { onPress: () => void }) {
  return (
    <TouchableOpacity style={styles.exitButton} onPress={onPress} activeOpacity={0.7}>
      <Text style={styles.exitText}>{'\u2715'}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fafaf9',
    paddingHorizontal: 24,
    paddingTop: 16,
  },
  exitButton: {
    position: 'absolute',
    top: 16,
    right: 20,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#f5f5f4',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  exitText: {
    fontSize: 16,
    color: '#78716c',
  },
  roundCounter: {
    alignItems: 'center',
    marginTop: 8,
    marginBottom: 24,
  },
  roundText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#a8a29e',
    letterSpacing: 0.3,
  },
  // ─── Choose Phase ───
  chooseContent: {
    flex: 1,
    justifyContent: 'center',
    paddingBottom: 60,
  },
  turnLabel: {
    alignItems: 'center',
    marginBottom: 8,
  },
  turnName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#c97454',
  },
  chooseTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: '#292524',
    textAlign: 'center',
    letterSpacing: -0.5,
    marginBottom: 36,
  },
  chooseRow: {
    flexDirection: 'row',
    gap: 16,
  },
  chooseButtonWrap: {
    flex: 1,
  },
  chooseButton: {
    borderRadius: 20,
    padding: 28,
    alignItems: 'center',
    gap: 12,
    shadowColor: '#1c1917',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 2,
  },
  chooseButtonTruth: {
    backgroundColor: '#fef7f4',
  },
  chooseButtonDare: {
    backgroundColor: '#fff7ed',
  },
  chooseEmoji: {
    fontSize: 36,
  },
  chooseButtonText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#292524',
  },
  // ─── Prompt Phase ───
  promptContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingBottom: 40,
  },
  typeBadge: {
    backgroundColor: '#fef7f4',
    paddingVertical: 6,
    paddingHorizontal: 16,
    borderRadius: 20,
    marginBottom: 20,
  },
  typeBadgeDare: {
    backgroundColor: '#fff7ed',
  },
  typeBadgeText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#c97454',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  typeBadgeTextDare: {
    color: '#c2410c',
  },
  promptText: {
    fontSize: 22,
    fontWeight: '700',
    color: '#292524',
    textAlign: 'center',
    lineHeight: 30,
    letterSpacing: -0.3,
    marginBottom: 16,
  },
  forLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#a8a29e',
  },
  doneButton: {
    paddingVertical: 16,
    backgroundColor: '#c97454',
    borderRadius: 16,
    alignItems: 'center',
    marginBottom: 40,
  },
  doneButtonText: {
    fontSize: 17,
    fontWeight: '700',
    color: '#ffffff',
  },
});
```

**Step 2: Commit**

```bash
git add src/components/TruthOrDare.tsx
git commit -m "feat: add Truth or Dare game component"
```

---

### Task 7: GameLauncher Component

**Files:**
- Create: `src/components/GameLauncher.tsx`

**Step 1: Create the component**

Grid of 3 game mode cards with emoji icons and descriptions.

```typescript
// src/components/GameLauncher.tsx
import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import Animated, { FadeInUp } from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';

export type GameMode = 'would-you-rather' | 'how-well' | 'truth-or-dare';

interface GameLauncherProps {
  onSelectMode: (mode: GameMode) => void;
}

const GAMES: { mode: GameMode; emoji: string; title: string; description: string; tint: string }[] = [
  {
    mode: 'would-you-rather',
    emoji: '\uD83E\uDD14',
    title: 'Would You Rather',
    description: 'Pick between two options and see if you match',
    tint: '#fef7f4',
  },
  {
    mode: 'how-well',
    emoji: '\uD83E\uDDE0',
    title: 'How Well Do You Know Me',
    description: 'Answer about yourself, then your partner guesses',
    tint: '#fef9f0',
  },
  {
    mode: 'truth-or-dare',
    emoji: '\uD83D\uDD25',
    title: 'Truth or Dare',
    description: 'Take turns picking truths and dares',
    tint: '#fff7ed',
  },
];

export function GameLauncher({ onSelectMode }: GameLauncherProps) {
  return (
    <View style={styles.container}>
      {GAMES.map((game, index) => (
        <Animated.View
          key={game.mode}
          entering={FadeInUp.duration(400).delay(100 + index * 100)}
        >
          <TouchableOpacity
            style={[styles.card, { backgroundColor: game.tint }]}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              onSelectMode(game.mode);
            }}
            activeOpacity={0.8}
          >
            <Text style={styles.emoji}>{game.emoji}</Text>
            <View style={styles.cardText}>
              <Text style={styles.title}>{game.title}</Text>
              <Text style={styles.description}>{game.description}</Text>
            </View>
            <Text style={styles.arrow}>{'\u203A'}</Text>
          </TouchableOpacity>
        </Animated.View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 12,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 20,
    padding: 20,
    gap: 16,
    shadowColor: '#1c1917',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 2,
  },
  emoji: {
    fontSize: 32,
  },
  cardText: {
    flex: 1,
    gap: 4,
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
    color: '#292524',
    letterSpacing: -0.3,
  },
  description: {
    fontSize: 13,
    color: '#78716c',
    lineHeight: 18,
  },
  arrow: {
    fontSize: 24,
    color: '#a8a29e',
    fontWeight: '300',
  },
});
```

**Step 2: Commit**

```bash
git add src/components/GameLauncher.tsx
git commit -m "feat: add GameLauncher mode selection component"
```

---

### Task 8: DateNightCard Component

**Files:**
- Create: `src/components/DateNightCard.tsx`

**Step 1: Create the component**

CTA card for the Today screen, matching WishlistCard pattern (accent bar, header, emoji icons, "Play now" link).

```typescript
// src/components/DateNightCard.tsx
import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import Animated, { FadeIn, FadeInUp } from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';

export function DateNightCard() {
  const handlePlay = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push('/(app)/games');
  };

  return (
    <View style={styles.card}>
      <View style={styles.accentBar} />

      <Animated.View entering={FadeIn.duration(400)} style={styles.header}>
        <View style={styles.headerLeft}>
          <Text style={styles.headerIcon}>{'\uD83C\uDFB2'}</Text>
          <Text style={styles.headerTitle}>Date Night</Text>
        </View>
      </Animated.View>

      <Animated.View entering={FadeInUp.duration(400).delay(100)} style={styles.body}>
        <View style={styles.emojiRow}>
          <Text style={styles.gameEmoji}>{'\uD83E\uDD14'}</Text>
          <Text style={styles.gameEmoji}>{'\uD83E\uDDE0'}</Text>
          <Text style={styles.gameEmoji}>{'\uD83D\uDD25'}</Text>
        </View>
        <Text style={styles.bodyText}>
          Games and quizzes to play together. Grab the couch.
        </Text>
      </Animated.View>

      <Animated.View entering={FadeIn.duration(300).delay(300)}>
        <TouchableOpacity style={styles.playButton} onPress={handlePlay} activeOpacity={0.7}>
          <Text style={styles.playText}>Play now</Text>
          <Text style={styles.playArrow}>{'\u2192'}</Text>
        </TouchableOpacity>
      </Animated.View>

      <View style={styles.footerDots}>
        <View style={styles.footerDot} />
        <View style={styles.footerDot} />
        <View style={styles.footerDot} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 20,
    padding: 24,
    paddingTop: 20,
    overflow: 'hidden',
    shadowColor: '#1c1917',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 2,
  },
  accentBar: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 3,
    backgroundColor: '#c97454',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerIcon: {
    fontSize: 16,
  },
  headerTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#292524',
    letterSpacing: -0.3,
  },
  body: {
    alignItems: 'center',
    paddingVertical: 4,
  },
  emojiRow: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 12,
  },
  gameEmoji: {
    fontSize: 28,
  },
  bodyText: {
    fontSize: 14,
    color: '#78716c',
    textAlign: 'center',
    lineHeight: 20,
  },
  playButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingVertical: 12,
    marginTop: 8,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#e7e5e4',
  },
  playText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#c97454',
  },
  playArrow: {
    fontSize: 14,
    color: '#c97454',
  },
  footerDots: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
    marginTop: 8,
  },
  footerDot: {
    width: 3,
    height: 3,
    borderRadius: 2,
    backgroundColor: '#e7e5e4',
  },
});
```

**Step 2: Commit**

```bash
git add src/components/DateNightCard.tsx
git commit -m "feat: add DateNightCard CTA for Today screen"
```

---

### Task 9: Games Screen (Hidden Tab)

**Files:**
- Create: `app/(app)/games.tsx`
- Modify: `app/(app)/_layout.tsx` — add games as hidden tab

**Step 1: Create the games screen**

```typescript
// app/(app)/games.tsx
import React, { useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { useAuth } from '@/hooks/useAuth';
import { GameLauncher, type GameMode } from '@/components/GameLauncher';
import { WouldYouRather } from '@/components/WouldYouRather';
import { HowWellDoYouKnowMe } from '@/components/HowWellDoYouKnowMe';
import { TruthOrDare } from '@/components/TruthOrDare';

export default function GamesScreen() {
  const { user } = useAuth();
  const [activeMode, setActiveMode] = useState<GameMode | null>(null);

  const userName = user?.displayName ?? 'You';
  const partnerName = user?.partnerName ?? 'Partner';

  const handleExit = () => setActiveMode(null);

  if (activeMode === 'would-you-rather') {
    return (
      <SafeAreaView style={styles.gameContainer}>
        <WouldYouRather userName={userName} partnerName={partnerName} onExit={handleExit} />
      </SafeAreaView>
    );
  }

  if (activeMode === 'how-well') {
    return (
      <SafeAreaView style={styles.gameContainer}>
        <HowWellDoYouKnowMe userName={userName} partnerName={partnerName} onExit={handleExit} />
      </SafeAreaView>
    );
  }

  if (activeMode === 'truth-or-dare') {
    return (
      <SafeAreaView style={styles.gameContainer}>
        <TruthOrDare userName={userName} partnerName={partnerName} onExit={handleExit} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <Animated.View entering={FadeIn.duration(300)} style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
          activeOpacity={0.7}
        >
          <Text style={styles.backArrow}>{'\u2190'}</Text>
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>Date Night</Text>
          <Text style={styles.headerSubtitle}>Games for two</Text>
        </View>
        <View style={styles.backButton} />
      </Animated.View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
      >
        <GameLauncher onSelectMode={setActiveMode} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fafaf9',
  },
  gameContainer: {
    flex: 1,
    backgroundColor: '#fafaf9',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#f5f5f4',
    justifyContent: 'center',
    alignItems: 'center',
  },
  backArrow: {
    fontSize: 20,
    color: '#57534e',
  },
  headerCenter: {
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1c1917',
    letterSpacing: -0.3,
  },
  headerSubtitle: {
    fontSize: 12,
    fontWeight: '500',
    color: '#a8a29e',
    marginTop: 2,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 40,
  },
});
```

**Step 2: Add games as hidden tab in _layout.tsx**

Add the following `<Tabs.Screen>` entry alongside the existing hidden tabs (wishlist, resources, chat):

```tsx
<Tabs.Screen
  name="games"
  options={{
    href: null,
  }}
/>
```

**Step 3: Commit**

```bash
git add app/(app)/games.tsx app/(app)/_layout.tsx
git commit -m "feat: add games screen as hidden tab with game mode routing"
```

---

### Task 10: Integration — Today Screen + Barrel Exports

**Files:**
- Modify: `app/(app)/today.tsx` — add DateNightCard
- Modify: `src/components/index.ts` — add new exports

**Step 1: Add DateNightCard to Today screen**

Import `DateNightCard` and add it to the Today screen. Place it after WishlistCard in each of the 3 prompt states (no-prompt, waiting, complete), wrapped in `<Animated.View entering={FadeInUp.duration(400).delay(...)}>`.

Add to imports:
```typescript
import { DateNightCard } from '@/components/DateNightCard';
```

Then place `<DateNightCard />` wrapped in an `Animated.View` with staggered delay after WishlistCard in each prompt state section:
- No prompt state: delay 1000 (after WishlistCard at 800)
- Waiting state: delay 800 (after WishlistCard at 600)
- Complete state: delay 1200 (after WishlistCard at 1000)

**Step 2: Add barrel exports**

Add to `src/components/index.ts`:
```typescript
// Games
export { DateNightCard } from './DateNightCard';
export { GameLauncher } from './GameLauncher';
export { GameComplete } from './GameComplete';
export { PassPhone } from './PassPhone';
export { WouldYouRather } from './WouldYouRather';
export { HowWellDoYouKnowMe } from './HowWellDoYouKnowMe';
export { TruthOrDare } from './TruthOrDare';
```

**Step 3: Commit**

```bash
git add app/(app)/today.tsx src/components/index.ts
git commit -m "feat: integrate DateNightCard on Today screen and add barrel exports"
```

---

### Task 11: Final Verification

**Step 1: TypeScript check**

Run: `cd /Users/adamwarner/stoke-app/app && npx tsc --noEmit 2>&1 | grep -v "admin/" | grep -v "node_modules"`

Expected: Only pre-existing errors (useExperiment test, useNetworkStatus analytics event, imageUpload MediaTypeOptions, firebase-functions-test). Zero new errors from games files.

**Step 2: Run tests**

Run: `cd /Users/adamwarner/stoke-app/app && npm test`

Expected: All existing tests pass (92/92).

**Step 3: Verify file count**

Run: `ls -la src/config/gameQuestions.ts src/components/DateNightCard.tsx src/components/GameLauncher.tsx src/components/WouldYouRather.tsx src/components/HowWellDoYouKnowMe.tsx src/components/TruthOrDare.tsx src/components/PassPhone.tsx src/components/GameComplete.tsx app/(app)/games.tsx`

Expected: All 9 files exist.
