import React from 'react';
import { View, Text, ScrollView, Pressable, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { PROMPT_CATEGORIES } from '@/config/promptCategories';
import { Icon } from '@/components/Icon';
import { colors, radius, spacing, typography } from '@config/theme';
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
            style={styles.chip}
            onPress={() => {
              logEvent('explore_category_tapped', { category: cat.type });
              router.push(`/(app)/explore?category=${cat.type}`);
            }}
          >
            <Icon name={cat.icon} size={18} color={colors.accent.primary} />
            <Text style={styles.chipLabel}>{cat.label}</Text>
          </Pressable>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { marginTop: spacing.lg, marginBottom: spacing.sm },
  heading: {
    ...typography.eyebrow,
    color: colors.text.secondary,
    marginBottom: spacing.smd,
    paddingHorizontal: spacing.screen,
  },
  row: { paddingHorizontal: spacing.md, gap: spacing.smd },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.smd,
    borderRadius: radius.pill,
    backgroundColor: colors.surface.card,
    borderWidth: 1.5,
    borderColor: colors.border.default,
    gap: spacing.sm,
  },
  chipLabel: {
    ...typography.caption,
    color: colors.text.secondary,
  },
});
