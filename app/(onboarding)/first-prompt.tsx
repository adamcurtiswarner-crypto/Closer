import React, { useState } from 'react';
import {
  View,
  Text,
  SafeAreaView,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { router } from 'expo-router';
import { Button } from '@/components';
import { logger } from '@/utils/logger';
import { useAuth } from '@/hooks/useAuth';
import { useTriggerPrompt } from '@/hooks/usePrompt';

export default function FirstPromptScreen() {
  const { user } = useAuth();
  const triggerPrompt = useTriggerPrompt();
  const [showResponse, setShowResponse] = useState(false);

  const handleContinue = async () => {
    // Trigger the first real prompt for this couple
    if (user?.coupleId) {
      try {
        await triggerPrompt.mutateAsync();
      } catch (error) {
        // Non-blocking — the prompt can also be triggered from Today screen
        logger.warn('Could not deliver first prompt:', error);
      }
    }
    router.push('/(onboarding)/ready');
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>Here's how it works</Text>

        <View style={styles.cardArea}>
          {/* Sample prompt card */}
          <View style={styles.card}>
            <Text style={styles.promptText}>
              What's one thing your partner did this week that made your day better?
            </Text>
          </View>

          <Text style={styles.explanation}>
            Each day, you both answer privately. Then you see each other's response.
          </Text>

          {!showResponse ? (
            <TouchableOpacity
              style={styles.showButton}
              onPress={() => setShowResponse(true)}
            >
              <Text style={styles.showButtonText}>Show Me</Text>
            </TouchableOpacity>
          ) : (
            <View style={styles.responseCard}>
              <Text style={styles.responseLabel}>Their response</Text>
              <Text style={styles.responseText}>
                "When you made coffee before I asked. I noticed, even if I didn't say anything."
              </Text>
            </View>
          )}
        </View>

        {showResponse && (
          <View style={styles.tagline}>
            <Text style={styles.taglineText}>That's it. Small moments, shared.</Text>
          </View>
        )}

        <View style={styles.spacer} />

        <View style={styles.buttonContainer}>
          <Button
            title={showResponse ? "I get it" : "Show me an example"}
            onPress={showResponse ? handleContinue : () => setShowResponse(true)}
          />
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fafaf9',
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 48,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1c1917',
  },
  cardArea: {
    marginTop: 32,
  },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
    borderWidth: 1,
    borderColor: '#f5f5f4',
  },
  promptText: {
    color: '#1c1917',
    fontSize: 20,
    fontWeight: '500',
    textAlign: 'center',
    lineHeight: 28,
  },
  explanation: {
    color: '#78716c',
    textAlign: 'center',
    marginTop: 16,
    marginBottom: 24,
    fontSize: 15,
    lineHeight: 22,
  },
  showButton: {
    backgroundColor: '#c97454',
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 24,
    alignSelf: 'center',
  },
  showButtonText: {
    color: '#ffffff',
    textAlign: 'center',
    fontWeight: '600',
    fontSize: 15,
  },
  responseCard: {
    backgroundColor: '#fef3ee',
    borderRadius: 12,
    padding: 16,
  },
  responseLabel: {
    color: '#c97454',
    fontSize: 12,
    fontWeight: '500',
    marginBottom: 8,
  },
  responseText: {
    color: '#44403c',
    fontSize: 16,
    fontStyle: 'italic',
    lineHeight: 24,
  },
  tagline: {
    marginTop: 32,
  },
  taglineText: {
    color: '#78716c',
    textAlign: 'center',
    fontSize: 15,
  },
  spacer: {
    flex: 1,
  },
  buttonContainer: {
    marginBottom: 32,
  },
});
