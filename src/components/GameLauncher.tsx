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
