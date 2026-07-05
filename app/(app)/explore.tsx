import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  TouchableOpacity,
  Pressable,
  Keyboard,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import Animated, {
  FadeIn,
  FadeInUp,
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { hapticImpact, hapticNotification, NotificationFeedbackType } from '@utils/haptics';
import { SafeAreaView } from 'react-native-safe-area-context';
import { PROMPT_CATEGORIES, getCategoryByType } from '@/config/promptCategories';
import {
  usePromptsByCategory,
  useExploreAssignments,
  useStartExplorePrompt,
  useExploreResponses,
  ExplorePrompt,
} from '@/hooks/useExplorePrompts';
import { useSubmitResponse } from '@/hooks/usePrompt';
import { useAuth } from '@/hooks/useAuth';
import { Icon } from '@/components/Icon';
import { logEvent } from '@/services/analytics';
import { colors, radius, shadow, spacing, typography } from '@/config/theme';

type ScreenMode = 'browse' | 'responding';

export default function ExploreScreen() {
  const { category: initialCategory } = useLocalSearchParams<{ category?: string }>();
  const router = useRouter();

  const [selectedCategory, setSelectedCategory] = useState(initialCategory || PROMPT_CATEGORIES[0].type);
  const [mode, setMode] = useState<ScreenMode>('browse');
  const [activePrompt, setActivePrompt] = useState<ExplorePrompt | null>(null);
  const [activeAssignmentId, setActiveAssignmentId] = useState<string | null>(null);
  const [responseText, setResponseText] = useState('');
  const [viewingAssignmentId, setViewingAssignmentId] = useState<string | null>(null);

  const { user } = useAuth();
  const { data: prompts, isLoading } = usePromptsByCategory(selectedCategory);
  const { data: assignments } = useExploreAssignments();
  const startExplore = useStartExplorePrompt();
  const submitResponse = useSubmitResponse();
  const { data: viewingResponses } = useExploreResponses(viewingAssignmentId);

  const submitScale = useSharedValue(1);
  const submitAnimStyle = useAnimatedStyle(() => ({
    transform: [{ scale: submitScale.value }],
  }));

  const currentCategory = getCategoryByType(selectedCategory);

  // Check if a prompt already has an explore assignment
  function getAssignmentForPrompt(promptId: string) {
    return assignments?.find((a) => a.promptId === promptId);
  }

  async function handleStartPrompt(prompt: ExplorePrompt) {
    hapticImpact();
    try {
      const result = await startExplore.mutateAsync(prompt);
      setActivePrompt(prompt);
      setActiveAssignmentId(result.assignmentId);
      setMode('responding');
    } catch (error: any) {
      Alert.alert('Unable to start', error?.message || 'Something went wrong. Please try again.');
    }
  }

  async function handleSubmit() {
    if (!activeAssignmentId || responseText.length < 10) return;
    hapticNotification(NotificationFeedbackType.Success);
    Keyboard.dismiss();
    try {
      await submitResponse.mutateAsync({
        assignmentId: activeAssignmentId,
        responseText,
      });
      setMode('browse');
      setActivePrompt(null);
      setActiveAssignmentId(null);
      setResponseText('');
    } catch {
      Alert.alert('Could not save your response', 'Please check your connection and try again.');
    }
  }

  // ─── Responding mode ───
  if (mode === 'responding' && activePrompt) {
    return (
      <SafeAreaView style={styles.container}>
        <Stack.Screen options={{ headerShown: false }} />
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.flex}
        >
          <ScrollView
            style={styles.scrollView}
            contentContainerStyle={styles.respondingScroll}
            keyboardShouldPersistTaps="handled"
          >
            <Animated.View entering={FadeIn.duration(300)} style={styles.respondingHeader}>
              <Text style={styles.respondingPrompt}>
                {'\u201C'}{activePrompt.text}{'\u201D'}
              </Text>
              {activePrompt.hint && (
                <Text style={styles.respondingHint}>{activePrompt.hint}</Text>
              )}
            </Animated.View>

            <Animated.View entering={FadeInUp.duration(400).delay(100)}>
              <TextInput
                style={styles.textInput}
                placeholder="Share your thoughts..."
                placeholderTextColor={colors.text.muted}
                multiline
                textAlignVertical="top"
                value={responseText}
                onChangeText={setResponseText}
                autoFocus
              />
            </Animated.View>

            <View style={styles.respondingFooter}>
              <Text style={styles.charHint}>
                {responseText.length < 10
                  ? `${10 - responseText.length} more characters`
                  : 'Ready to share'}
              </Text>

              <View style={styles.buttonRow}>
                <TouchableOpacity
                  style={styles.cancelButton}
                  onPress={() => {
                    setMode('browse');
                    setResponseText('');
                  }}
                >
                  <Text style={styles.cancelText}>Back</Text>
                </TouchableOpacity>
                <Animated.View style={[{ flex: 1 }, submitAnimStyle]}>
                  <TouchableOpacity
                    style={[
                      styles.submitButton,
                      (responseText.length < 10 || submitResponse.isPending) &&
                        styles.disabled,
                    ]}
                    onPress={handleSubmit}
                    onPressIn={() => {
                      submitScale.value = withTiming(0.96, { duration: 100 });
                    }}
                    onPressOut={() => {
                      submitScale.value = withSpring(1, {
                        damping: 12,
                        stiffness: 200,
                      });
                    }}
                    disabled={responseText.length < 10 || submitResponse.isPending}
                    activeOpacity={0.8}
                  >
                    <Text style={styles.submitText}>
                      {submitResponse.isPending ? 'Sending...' : 'Share'}
                    </Text>
                    {!submitResponse.isPending && (
                      <Icon name="arrow-right" size="sm" color={colors.text.inverse} />
                    )}
                  </TouchableOpacity>
                </Animated.View>
              </View>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    );
  }

  // ─── Browse mode ───
  return (
    <SafeAreaView style={styles.container}>
      <Stack.Screen options={{ headerShown: false }} />

      {/* Header — eyebrow + Nunito-Black headline */}
      <View style={styles.header}>
        {router.canGoBack() && (
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Icon name="arrow-left" size="md" color={colors.text.primary} />
          </TouchableOpacity>
        )}
        <Text style={styles.headerEyebrow}>Browse by category</Text>
        <Text style={styles.headerTitle}>Categories</Text>
      </View>

      {/* Category tabs */}
      <View style={styles.categoryScrollContainer}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.categoryRow}
        >
        {PROMPT_CATEGORIES.map((cat) => {
          const isActive = cat.type === selectedCategory;
          return (
            <Pressable
              key={cat.type}
              style={[
                styles.categoryChip,
                isActive
                  ? { backgroundColor: cat.color }
                  : { backgroundColor: cat.bgColor },
              ]}
              onPress={() => setSelectedCategory(cat.type)}
            >
              <Icon
                name={cat.icon}
                size={18}
                color={isActive ? colors.text.inverse : cat.color}
              />
              <Text
                style={[
                  styles.categoryChipLabel,
                  { color: isActive ? colors.text.inverse : cat.color },
                ]}
              >
                {cat.label}
              </Text>
            </Pressable>
          );
        })}
        </ScrollView>
      </View>

      {/* Category description */}
      {currentCategory && (
        <Animated.View entering={FadeIn.duration(300)} style={styles.categoryDesc}>
          <Text style={styles.categoryDescText}>{currentCategory.description}</Text>
        </Animated.View>
      )}

      {/* Prompt list */}
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.promptList}
      >
        {isLoading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="small" color={colors.accent.primary} />
          </View>
        ) : !prompts || prompts.length === 0 ? (
          <Animated.View entering={FadeIn.duration(400)} style={styles.emptyState}>
            <Text style={styles.emptyText}>No prompts in this category yet</Text>
          </Animated.View>
        ) : (
          prompts.map((prompt, index) => {
            const existing = getAssignmentForPrompt(prompt.id);
            const status = existing?.status;

            return (
              <Animated.View
                key={prompt.id}
                entering={FadeInUp.duration(400).delay(index * 80)}
              >
                <View style={styles.promptCard}>
                  <View style={[styles.promptAccent, { backgroundColor: currentCategory?.color || colors.accent.primary }]} />
                  <View style={styles.promptContent}>
                    <Text style={styles.promptText}>{prompt.text}</Text>
                    {prompt.hint && (
                      <Text style={styles.promptHint}>{prompt.hint}</Text>
                    )}
                    <View style={styles.promptFooter}>
                      <View style={styles.depthBadge}>
                        <Text style={styles.depthText}>{prompt.emotionalDepth}</Text>
                      </View>
                      {status === 'completed' ? (
                        <TouchableOpacity
                          style={styles.statusBadge}
                          onPress={() => {
                            const existing = getAssignmentForPrompt(prompt.id);
                            const aid = existing?.id || null;
                            setViewingAssignmentId(viewingAssignmentId === aid ? null : aid);
                          }}
                        >
                          <Icon name="checks" size={14} color={colors.semantic.success} />
                          <Text style={[styles.statusText, { color: colors.semantic.success }]}>
                            {viewingAssignmentId === getAssignmentForPrompt(prompt.id)?.id ? 'Hide' : 'View responses'}
                          </Text>
                        </TouchableOpacity>
                      ) : status === 'partial' ? (
                        <View style={styles.statusBadge}>
                          <Icon name="hourglass" size={14} color={colors.semantic.neutral} />
                          <Text style={[styles.statusText, { color: colors.semantic.neutral }]}>
                            Waiting for partner
                          </Text>
                        </View>
                      ) : (
                        <TouchableOpacity
                          style={[
                            styles.respondButton,
                            { backgroundColor: currentCategory?.color || colors.accent.primary },
                          ]}
                          onPress={() => handleStartPrompt(prompt)}
                          disabled={startExplore.isPending}
                        >
                          <Text style={styles.respondButtonText}>Respond</Text>
                        </TouchableOpacity>
                      )}
                    </View>
                    {/* Show responses when tapped */}
                    {viewingAssignmentId === getAssignmentForPrompt(prompt.id)?.id && viewingResponses && (
                      <Animated.View entering={FadeIn.duration(300)} style={styles.responsesSection}>
                        {viewingResponses.map((r) => (
                          <View key={r.id} style={styles.responseRow}>
                            <Text style={styles.responseAuthor}>
                              {r.isCurrentUser ? 'You' : 'Partner'}
                            </Text>
                            <Text style={styles.responseText}>{r.text}</Text>
                          </View>
                        ))}
                      </Animated.View>
                    )}
                  </View>
                </View>
              </Animated.View>
            );
          })
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.surface.background },
  flex: { flex: 1 },
  scrollView: { flex: 1 },

  // Header — eyebrow + Nunito-Black headline
  header: {
    paddingHorizontal: spacing.screen,
    paddingTop: spacing.sm,
    paddingBottom: spacing.md,
  },
  backButton: {
    padding: spacing.sm,
    marginLeft: -spacing.sm,
    marginBottom: spacing.xs,
    alignSelf: 'flex-start',
  },
  headerEyebrow: {
    ...typography.eyebrow,
    color: colors.text.muted,
    marginBottom: spacing.sm,
  },
  headerTitle: {
    ...typography.display,
    color: colors.text.primary,
  },

  // Category tabs
  categoryScrollContainer: { flexShrink: 0 },
  categoryRow: { paddingHorizontal: spacing.screen, gap: spacing.itemGap, paddingBottom: 12 },
  categoryChip: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: radius.pill,
    gap: 6,
  },
  categoryChipLabel: {
    fontSize: 12,
    fontWeight: '800',
    fontFamily: 'Nunito-ExtraBold',
  },

  // Category description
  categoryDesc: { paddingHorizontal: spacing.screen, paddingBottom: 12 },
  categoryDescText: {
    ...typography.body,
    color: colors.text.secondary,
  },

  // Prompt list
  promptList: { paddingHorizontal: spacing.screen, paddingBottom: 40, gap: 12 },
  loadingContainer: { paddingTop: 40, alignItems: 'center' },
  emptyState: { paddingTop: 40, alignItems: 'center' },
  emptyText: {
    ...typography.body,
    color: colors.text.muted,
  },

  // Prompt card
  promptCard: {
    backgroundColor: colors.surface.card,
    borderRadius: radius.hero,
    ...shadow.card,
    overflow: 'hidden',
  },
  promptAccent: { height: 3 },
  promptContent: { padding: spacing.cardPad },
  promptText: {
    fontSize: 16,
    fontWeight: '600',
    fontFamily: 'Nunito-SemiBold',
    color: colors.text.primary,
    lineHeight: 24,
    marginBottom: spacing.sm,
  },
  promptHint: {
    ...typography.caption,
    color: colors.text.secondary,
    fontStyle: 'italic',
    marginBottom: 12,
  },
  promptFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: spacing.xs,
  },
  depthBadge: {
    backgroundColor: colors.surface.background,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: radius.pill,
  },
  depthText: {
    fontSize: 11,
    fontWeight: '600',
    fontFamily: 'Nunito-SemiBold',
    color: colors.text.secondary,
    textTransform: 'capitalize',
  },

  // Status badges
  statusBadge: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  statusText: {
    fontSize: 12,
    fontWeight: '700',
    fontFamily: 'Nunito-Bold',
  },

  // Respond button — pill, uppercase letterspaced label
  respondButton: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.pill,
  },
  respondButtonText: {
    ...typography.btn,
    fontSize: 11,
    color: colors.text.inverse,
  },

  // Response viewer
  responsesSection: {
    marginTop: spacing.md,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border.default,
    gap: 12,
  },
  responseRow: {
    gap: 4,
  },
  responseAuthor: {
    ...typography.eyebrow,
    color: colors.text.muted,
  },
  responseText: {
    ...typography.body,
    fontSize: 15,
    lineHeight: 22,
    color: colors.text.primary,
  },

  // Responding mode
  respondingScroll: { padding: spacing.screen, flexGrow: 1 },
  respondingHeader: { marginBottom: spacing.lg },
  respondingPrompt: {
    ...typography.heading,
    color: colors.text.primary,
    lineHeight: 30,
    fontStyle: 'italic',
  },
  respondingHint: {
    ...typography.body,
    color: colors.text.secondary,
    marginTop: spacing.sm,
  },
  textInput: {
    backgroundColor: colors.surface.card,
    borderRadius: radius.card,
    padding: spacing.md,
    fontSize: 16,
    fontFamily: 'Nunito-SemiBold',
    fontWeight: '600',
    color: colors.text.primary,
    minHeight: 160,
    textAlignVertical: 'top',
    ...shadow.cardSubtle,
  },
  respondingFooter: { marginTop: spacing.md },
  charHint: {
    ...typography.caption,
    color: colors.text.muted,
    marginBottom: 12,
  },
  buttonRow: { flexDirection: 'row', gap: 12, alignItems: 'center' },
  cancelButton: { paddingVertical: 14, paddingHorizontal: spacing.md },
  cancelText: {
    fontSize: 15,
    fontWeight: '600',
    fontFamily: 'Nunito-SemiBold',
    color: colors.text.secondary,
  },
  submitButton: {
    backgroundColor: colors.accent.primary,
    borderRadius: radius.pill,
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
  },
  submitText: {
    ...typography.btn,
    color: colors.text.inverse,
  },
  disabled: { opacity: 0.5 },
});
