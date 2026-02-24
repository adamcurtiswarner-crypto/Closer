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
