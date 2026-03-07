import React from 'react';
import { Text, TouchableOpacity, StyleSheet } from 'react-native';
import { hapticImpact, ImpactFeedbackStyle } from '@utils/haptics';
import { Icon } from './Icon';
import type { IconName } from './Icon';

export interface RecommendedItem {
  id: string;
  type: 'category' | 'activity';
  title: string;
  subtitle: string;
  icon: IconName;
  color: string;
  bgColor: string;
  targetId: string;
}

interface RecommendedCardProps {
  item: RecommendedItem;
  onPress: (item: RecommendedItem) => void;
}

export function RecommendedCard({ item, onPress }: RecommendedCardProps) {
  const handlePress = () => {
    hapticImpact(ImpactFeedbackStyle.Light);
    onPress(item);
  };

  return (
    <TouchableOpacity
      style={[styles.card, { backgroundColor: item.bgColor }]}
      onPress={handlePress}
      activeOpacity={0.85}
    >
      <Icon name={item.icon} size="lg" color={item.color} weight="light" />
      <Text style={styles.title} numberOfLines={1}>{item.title}</Text>
      <Text style={styles.subtitle} numberOfLines={1}>{item.subtitle}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    width: 140,
    height: 160,
    borderRadius: 18,
    padding: 16,
    justifyContent: 'space-between',
    marginRight: 12,
  },
  title: {
    fontSize: 15,
    fontFamily: 'Inter-SemiBold',
    color: '#1c1917',
    marginTop: 8,
  },
  subtitle: {
    fontSize: 11,
    fontFamily: 'Inter-Medium',
    color: 'rgba(28, 25, 23, 0.5)',
    letterSpacing: 0.3,
    textTransform: 'uppercase',
  },
});
