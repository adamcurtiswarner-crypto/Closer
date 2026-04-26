import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Animated, { FadeIn, FadeInUp } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { TouchableOpacity } from 'react-native';
import { Icon } from '@components';

export default function ChatScreen() {
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Icon name="arrow-left" size="sm" color="#292524" />
        </TouchableOpacity>
        <Text style={styles.title}>Chat</Text>
      </View>

      <Animated.View entering={FadeInUp.duration(500).delay(100)} style={styles.emptyState}>
        <Icon name="chat-circle" size="lg" color="#d6d3d1" weight="light" />
        <Text style={styles.emptyTitle}>Coming soon</Text>
        <Text style={styles.emptyBody}>
          A quiet space for you and your partner to talk, share, and stay close throughout the day.
        </Text>
      </Animated.View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fef7f4',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 24,
    paddingTop: 16,
    marginBottom: 24,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#f5f5f4',
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: '600',
    fontFamily: 'Alexandria-SemiBold',
    color: '#1c1917',
    letterSpacing: -0.5,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 64,
    paddingHorizontal: 32,
    gap: 12,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    fontFamily: 'Alexandria-SemiBold',
    color: '#78716c',
    letterSpacing: -0.3,
  },
  emptyBody: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#a8a29e',
    textAlign: 'center',
    lineHeight: 20,
  },
});
