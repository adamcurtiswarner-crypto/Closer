import React, { useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { useAuth } from '@/hooks/useAuth';
import { Icon } from '@/components';
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
          <Icon name="arrow-left" size="md" color="#1c1917" />
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
    backgroundColor: '#fef7f4',
  },
  gameContainer: {
    flex: 1,
    backgroundColor: '#fef7f4',
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
    fontFamily: 'Alexandria-SemiBold',
    color: '#1c1917',
    letterSpacing: -0.3,
  },
  headerSubtitle: {
    fontSize: 12,
    fontWeight: '500',
    fontFamily: 'Inter-Medium',
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
