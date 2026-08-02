import React, { useEffect, useMemo } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import Animated, { FadeIn, FadeInUp, ReduceMotion } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { format } from 'date-fns';
import { usePersonalize } from '@/hooks/usePersonalize';
import { useYourWords, type YourWordsEntry } from '@/hooks/useYourWords';
import { getCategoryByType } from '@/config/promptCategories';
import { Icon } from '@/components/Icon';
import { Skeleton } from '@/components/Skeleton';
import { logEvent } from '@/services/analytics';
import { colors, radius, shadow, spacing, typography } from '@/config/theme';

/**
 * "Your words" — a personal journal of everything the user has written
 * (Hooked audit 2026-08-02). Answers used to vanish when an assignment
 * expired without the partner's response; this keeps them. Deliberately
 * partner-free: no partner answers, no partner state, no "they never
 * answered" labels — the user's own investment, nothing else.
 */
export default function YourWordsScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const personalize = usePersonalize();
  const { data: entries = [], isLoading, isError, refetch } = useYourWords();

  useEffect(() => {
    logEvent('your_words_viewed');
  }, []);

  const personalized = useMemo(
    () =>
      entries.map((entry) => ({
        ...entry,
        promptText: personalize(entry.promptText),
      })),
    [entries, personalize]
  );

  const renderEntry = (entry: YourWordsEntry, index: number) => {
    const category = entry.category ? getCategoryByType(entry.category) : undefined;
    const metaLine = [
      entry.submittedAt ? format(entry.submittedAt, 'MMM d, yyyy') : null,
      category?.label ?? null,
    ]
      .filter((segment): segment is string => segment != null)
      .join(' · ');

    return (
      <Animated.View
        key={entry.id}
        entering={FadeInUp.duration(400)
          .delay(Math.min(index, 6) * 60)
          .reduceMotion(ReduceMotion.System)}
        style={styles.entryCard}
        testID={`your-words-entry-${entry.id}`}
      >
        {metaLine.length > 0 && (
          <Text style={styles.entryMeta} maxFontSizeMultiplier={1.4}>
            {metaLine}
          </Text>
        )}
        {entry.promptText.length > 0 && (
          <Text style={styles.entryPrompt} maxFontSizeMultiplier={1.4}>
            {entry.promptText}
          </Text>
        )}
        {entry.responseScore != null && (
          <Text style={styles.entryScore} maxFontSizeMultiplier={1.4}>
            {t('yourWords.saidScore', { score: entry.responseScore })}
          </Text>
        )}
        {entry.responseText.length > 0 && (
          <Text style={styles.entryText}>{entry.responseText}</Text>
        )}
      </Animated.View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <Stack.Screen options={{ headerShown: false }} />
      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
        <Animated.View entering={FadeIn.duration(400)}>
          <TouchableOpacity
            onPress={() => router.back()}
            style={styles.backButton}
            accessibilityRole="button"
            testID="your-words-back"
          >
            <Icon name="caret-left" size="md" color={colors.text.primary} />
          </TouchableOpacity>

          <Text style={styles.eyebrow} maxFontSizeMultiplier={1.4}>
            {t('yourWords.eyebrow')}
          </Text>
          <Text style={styles.title}>{t('yourWords.title')}</Text>
          <Text style={styles.subtitle} maxFontSizeMultiplier={1.4}>
            {t('yourWords.subtitle')}
          </Text>
        </Animated.View>

        {isLoading ? (
          <View style={styles.list} testID="your-words-loading">
            {Array.from({ length: 3 }, (_, i) => (
              <Skeleton key={i} height={120} borderRadius={radius.card} />
            ))}
          </View>
        ) : isError ? (
          <View style={styles.emptyCard} testID="your-words-error">
            <Text style={styles.emptyTitle}>{t('yourWords.errorTitle')}</Text>
            <TouchableOpacity
              onPress={() => refetch()}
              style={styles.retryButton}
              accessibilityRole="button"
            >
              <Text style={styles.retryText}>{t('common.tryAgain')}</Text>
            </TouchableOpacity>
          </View>
        ) : personalized.length === 0 ? (
          <View style={styles.emptyCard} testID="your-words-empty">
            <View style={styles.emptyIcon}>
              <Icon name="note" size="xl" color={colors.text.muted} weight="light" />
            </View>
            <Text style={styles.emptyTitle}>{t('yourWords.empty')}</Text>
            <Text style={styles.emptySub}>{t('yourWords.emptySub')}</Text>
          </View>
        ) : (
          <View style={styles.list}>{personalized.map(renderEntry)}</View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.surface.background,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: spacing.screen,
    paddingTop: spacing.sm,
    paddingBottom: spacing.xl,
  },
  backButton: {
    minWidth: 44,
    minHeight: 44,
    justifyContent: 'center',
    marginBottom: spacing.sm,
  },
  eyebrow: {
    ...typography.eyebrow,
    color: colors.text.secondary,
    marginBottom: spacing.sm,
  },
  title: {
    ...typography.display,
    color: colors.text.primary,
  },
  subtitle: {
    ...typography.bodySm,
    color: colors.text.secondary,
    marginTop: spacing.xs,
    marginBottom: spacing.md,
  },

  list: {
    gap: spacing.smd,
  },
  entryCard: {
    backgroundColor: colors.surface.card,
    borderRadius: radius.card,
    padding: spacing.md,
    gap: spacing.xs,
    ...shadow.cardSubtle,
  },
  entryMeta: {
    ...typography.caption,
    color: colors.text.secondary,
  },
  entryPrompt: {
    ...typography.heading,
    color: colors.text.primary,
  },
  entryScore: {
    ...typography.bodySm,
    color: colors.accent.primary,
  },
  entryText: {
    ...typography.body,
    color: colors.text.primary,
  },

  emptyCard: {
    marginTop: spacing.md,
    backgroundColor: colors.surface.warmTint,
    borderRadius: radius.hero,
    padding: spacing.xl,
    alignItems: 'center',
    gap: spacing.smd,
  },
  emptyIcon: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: colors.surface.card,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.xs,
  },
  emptyTitle: {
    ...typography.heading,
    color: colors.text.primary,
    textAlign: 'center',
  },
  emptySub: {
    ...typography.bodySm,
    color: colors.text.secondary,
    textAlign: 'center',
  },
  retryButton: {
    minHeight: 44,
    justifyContent: 'center',
    paddingHorizontal: spacing.md,
  },
  retryText: {
    ...typography.bodySm,
    color: colors.accent.primary,
  },
});
