import React, { useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import Animated, { FadeIn, FadeInUp } from 'react-native-reanimated';
import { hapticImpact, hapticNotification, ImpactFeedbackStyle, NotificationFeedbackType } from '@utils/haptics';
import { Icon } from './Icon';

interface PassPhoneProps {
  partnerName: string;
  instruction?: string;
  onReady: () => void;
}

export function PassPhone({ partnerName, instruction, onReady }: PassPhoneProps) {
  useEffect(() => {
    hapticNotification(NotificationFeedbackType.Warning);
  }, []);

  return (
    <View style={styles.container}>
      <Animated.View entering={FadeInUp.duration(500)} style={styles.content}>
        <Icon name="device-mobile" size="xl" color="#c97454" weight="light" />
        <Text style={styles.title}>Pass to {partnerName}</Text>
        {instruction && (
          <Text style={styles.instruction}>{instruction}</Text>
        )}
      </Animated.View>

      <Animated.View entering={FadeIn.duration(400).delay(600)}>
        <TouchableOpacity
          style={styles.button}
          onPress={() => {
            hapticImpact(ImpactFeedbackStyle.Light);
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
    backgroundColor: '#fef5f0',
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
    fontWeight: '600',
    fontFamily: 'Alexandria-SemiBold',
    color: '#292524',
    textAlign: 'center',
    letterSpacing: -0.5,
  },
  instruction: {
    fontSize: 15,
    fontFamily: 'Inter-Regular',
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
    fontWeight: '600',
    fontFamily: 'Inter-SemiBold',
    color: '#ffffff',
  },
});
