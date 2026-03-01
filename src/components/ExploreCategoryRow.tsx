import React from 'react';
import { View, Text, ScrollView, Pressable, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { PROMPT_CATEGORIES } from '@/config/promptCategories';
import { Icon } from '@/components/Icon';
import { logEvent } from '@/services/analytics';

export function ExploreCategoryRow() {
  const router = useRouter();

  return (
    <View style={styles.container}>
      <Text style={styles.heading}>Explore prompts</Text>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.row}
      >
        {PROMPT_CATEGORIES.map((cat) => (
          <Pressable
            key={cat.type}
            style={[styles.chip, { backgroundColor: cat.bgColor }]}
            onPress={() => {
              logEvent('explore_category_tapped', { category: cat.type });
              router.push(`/(app)/explore?category=${cat.type}`);
            }}
          >
            <Icon name={cat.icon} size={20} color={cat.color} />
            <Text style={[styles.chipLabel, { color: cat.color }]}>
              {cat.label}
            </Text>
          </Pressable>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { marginTop: 24, marginBottom: 8 },
  heading: {
    fontSize: 15,
    fontWeight: '600',
    color: '#6b7280',
    marginBottom: 12,
    paddingHorizontal: 20,
  },
  row: { paddingHorizontal: 16, gap: 10 },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 16,
    gap: 6,
  },
  chipLabel: { fontSize: 14, fontWeight: '500' },
});
