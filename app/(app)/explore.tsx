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
import { SafetyResources } from '@/components/SafetyResources';
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
  // Safety off-ramp: set once per submission whose text matched the safety lexicon
  const [showSafetyResources, setShowSafetyResources] = useState(false);

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
      const result = await submitResponse.mutateAsync({
        assignmentId: activeAssignmentId,
        responseText,
      });
      setMode('browse');
      setActivePrompt(null);
      setActiveAssignmentId(null);
      setResponseText('');
      if (result.safetyMatch) setShowSafetyResources(true);
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
                placeholderTextColor={colors.text.secondary}
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
                  <Text style={styles.cancelText} maxFontSizeMultiplier={1.4}>Back</Text>
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
                    <Text style={styles.submitText} maxFontSizeMultiplier={1.4}>
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
        <SafetyResources
          visible={showSafetyResources}
          onClose={() => setShowSafetyResources(false)}
        />
      </SafeAreaView>
    );
  }

  // ─── Browse mode ───
  return (
    <SafeAreaView style={styles.container}>
      <Stack.Screen options={{ headerShown: false }} />

      {/* Header — eyebrow + Nunito-Black headline. No back button: this is a
          root tab in v1 (canGoBack() is true from the launch redirect). */}
      <View style={styles.header}>
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
                isActive ? styles.categoryChipActive : styles.categoryChipInactive,
              ]}
              onPress={() => setSelectedCategory(cat.type)}
            >
              <Icon
                name={cat.icon}
                size={18}
                color={isActive ? colors.text.inverse : colors.accent.primary}
              />
              <Text
                style={[
                  styles.categoryChipLabel,
                  isActive
                    ? styles.categoryChipLabelActive
                    : styles.categoryChipLabelInactive,
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
                  {/* No accent bar on list cards — a cue on every card is a
                      cue on none. Only a primary/hero surface carries it. */}
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
                          style={styles.respondButton}
                          onPress={() => handleStartPrompt(prompt)}
                          disabled={startExplore.isPending}
                        >
                          <Text style={styles.respondButtonText} maxFontSizeMultiplier={1.4}>Respond</Text>
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
      <SafetyResources
        visible={showSafetyResources}
        onClose={() => setShowSafetyResources(false)}
      />
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
    color: colors.text.secondary,
    marginBottom: spacing.sm,
  },
  headerTitle: {
    ...typography.display,
    color: colors.text.primary,
  },

  // Category tabs
  categoryScrollContainer: { flexShrink: 0 },
  categoryRow: { paddingHorizontal: spacing.screen, gap: spacing.itemGap, paddingBottom: spacing.smd },
  // Chips — identity is carried by the icon, not a per-category hue.
  // Unselected: warm tint + coral. Selected: coral + white.
  categoryChip: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.pill,
    gap: spacing.sm,
  },
  categoryChipActive: {
    backgroundColor: colors.accent.primary,
  },
  categoryChipInactive: {
    backgroundColor: colors.surface.warmTint,
  },
  categoryChipLabel: {
    ...typography.caption,
  },
  categoryChipLabelActive: {
    color: colors.text.inverse,
  },
  categoryChipLabelInactive: {
    color: colors.accent.primary,
  },

  // Category description
  categoryDesc: { paddingHorizontal: spacing.screen, paddingBottom: spacing.smd },
  categoryDescText: {
    ...typography.bodySm,
    color: colors.text.secondary,
  },

  // Prompt list
  promptList: { paddingHorizontal: spacing.screen, paddingBottom: spacing.xl, gap: spacing.smd },
  loadingContainer: { paddingTop: spacing.xl, alignItems: 'center' },
  emptyState: { paddingTop: spacing.xl, alignItems: 'center' },
  emptyText: {
    ...typography.bodySm,
    color: colors.text.secondary,
  },

  // Prompt card
  promptCard: {
    backgroundColor: colors.surface.card,
    borderRadius: radius.hero,
    ...shadow.card,
    overflow: 'hidden',
  },
  promptContent: { padding: spacing.cardPad },
  promptText: {
    ...typography.body,
    color: colors.text.primary,
    marginBottom: spacing.sm,
  },
  promptHint: {
    ...typography.caption,
    color: colors.text.secondary,
    fontStyle: 'italic',
    marginBottom: spacing.smd,
  },
  promptFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: spacing.xs,
  },
  depthBadge: {
    backgroundColor: colors.surface.background,
    paddingHorizontal: spacing.smd,
    paddingVertical: spacing.xs,
    borderRadius: radius.pill,
  },
  depthText: {
    ...typography.caption,
    color: colors.text.secondary,
  },

  // Status badges
  statusBadge: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  statusText: {
    ...typography.caption,
  },

  // Respond button — coral pill, uppercase letterspaced label
  respondButton: {
    backgroundColor: colors.accent.primary,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.pill,
  },
  respondButtonText: {
    ...typography.btn,
    color: colors.text.inverse,
  },

  // Response viewer
  responsesSection: {
    marginTop: spacing.md,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border.default,
    gap: spacing.smd,
  },
  responseRow: {
    gap: spacing.xs,
  },
  responseAuthor: {
    ...typography.eyebrow,
    color: colors.text.secondary,
  },
  responseText: {
    ...typography.body,
    color: colors.text.primary,
  },

  // Responding mode
  respondingScroll: { padding: spacing.screen, flexGrow: 1 },
  respondingHeader: { marginBottom: spacing.lg },
  respondingPrompt: {
    ...typography.heading,
    color: colors.text.primary,
    fontStyle: 'italic',
  },
  respondingHint: {
    ...typography.bodySm,
    color: colors.text.secondary,
    marginTop: spacing.sm,
  },
  textInput: {
    backgroundColor: colors.surface.card,
    borderRadius: radius.card,
    padding: spacing.md,
    ...typography.body,
    color: colors.text.primary,
    minHeight: 160,
    textAlignVertical: 'top',
    ...shadow.cardSubtle,
  },
  respondingFooter: { marginTop: spacing.md },
  charHint: {
    ...typography.caption,
    color: colors.text.secondary,
    marginBottom: spacing.smd,
  },
  buttonRow: { flexDirection: 'row', gap: spacing.smd, alignItems: 'center' },
  cancelButton: { paddingVertical: spacing.md, paddingHorizontal: spacing.md },
  cancelText: {
    ...typography.body,
    color: colors.text.secondary,
  },
  submitButton: {
    backgroundColor: colors.accent.primary,
    borderRadius: radius.pill,
    paddingVertical: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
  },
  submitText: {
    ...typography.btn,
    color: colors.text.inverse,
  },
  disabled: { opacity: 0.4 },
});
