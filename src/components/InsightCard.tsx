import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Animated, { FadeInUp } from 'react-native-reanimated';

interface InsightCardProps {
  icon: string;
  title: string;
  accentColor?: string;
  children: React.ReactNode;
  delay?: number;
}

export function InsightCard({
  icon,
  title,
  accentColor = '#c97454',
  children,
  delay = 0,
}: InsightCardProps) {
  return (
    <Animated.View entering={FadeInUp.duration(500).delay(delay)} style={styles.card}>
      <View style={[styles.accentBar, { backgroundColor: accentColor }]} />
      <View style={styles.header}>
        <Text style={styles.headerIcon}>{icon}</Text>
        <Text style={styles.headerTitle}>{title}</Text>
      </View>
      {children}
    </Animated.View>
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
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 16,
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
});
