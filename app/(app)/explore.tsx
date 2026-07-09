import React, { useEffect, useRef, useState } from 'react';
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
  isLiveExploreAssignment,
  ExplorePrompt,
  ExploreAssignment,
  NoCoupleLinkedError,
} from '@/hooks/useExplorePrompts';
import { useSubmitResponse } from '@/hooks/usePrompt';
import { useAuth } from '@/hooks/useAuth';
import { usePartner } from '@/hooks/usePartner';
import { usePersonalize } from '@/hooks/usePersonalize';
import { Icon } from '@/components/Icon';
import { QueryError } from '@/components/QueryError';
import { Skeleton } from '@/components/Skeleton';
import { SafetyResources } from '@/components/SafetyResources';
import { logEvent } from '@/services/analytics';
import { useTranslation } from 'react-i18next';
import { colors, radius, shadow, spacing, typography } from '@/config/theme';

type ScreenMode = 'browse' | 'responding';

export default function ExploreScreen() {
  const {
    category: initialCategory,
    assignmentId: paramAssignmentId,
    promptId: paramPromptId,
  } = useLocalSearchParams<{
    category?: string;
    assignmentId?: string;
    promptId?: string;
  }>();
  const router = useRouter();

  const [selectedCategory, setSelectedCategory] = useState(initialCategory || PROMPT_CATEGORIES[0].type);
  const [mode, setMode] = useState<ScreenMode>('browse');
  const [activePrompt, setActivePrompt] = useState<ExplorePrompt | null>(null);
  const [activeAssignmentId, setActiveAssignmentId] = useState<string | null>(null);
  const [responseText, setResponseText] = useState('');
  const [viewingAssignmentId, setViewingAssignmentId] = useState<string | null>(null);
  // Safety off-ramp: set once per submission whose text matched the safety lexicon
  const [showSafetyResources, setShowSafetyResources] = useState(false);
  // Quiet inline notice on the respond action when no couple is linked yet
  const [linkNoticePromptId, setLinkNoticePromptId] = useState<string | null>(null);

  const { t } = useTranslation();
  const { user } = useAuth();
  const { data: partner } = usePartner();
  const partnerName = partner?.displayName || t('explore.partnerFallback');
  // Display-time only: {partner}/{me} tokens render with real first names here,
  // while every write (useStartExplorePrompt copies prompt_text into the
  // assignment) keeps the canonical tokenized text.
  const personalize = usePersonalize();
  const {
    data: prompts,
    isLoading,
    isError: promptsFailed,
    refetch: refetchPrompts,
  } = usePromptsByCategory(selectedCategory);
  const { data: assignments } = useExploreAssignments();
  const startExplore = useStartExplorePrompt();
  const submitResponse = useSubmitResponse();
  const viewingAssignment = assignments?.find((a) => a.id === viewingAssignmentId) ?? null;
  const {
    data: viewingResponses,
    isLoading: responsesLoading,
    isError: responsesFailed,
    refetch: refetchResponses,
  } = useExploreResponses(viewingAssignmentId, viewingAssignment?.status);

  const submitScale = useSharedValue(1);
  const submitAnimStyle = useAnimatedStyle(() => ({
    transform: [{ scale: submitScale.value }],
  }));

  const currentCategory = getCategoryByType(selectedCategory);

  // The live (non-expired) explore assignment for a prompt, if any —
  // expired ones behave as if the prompt was never started.
  function getAssignmentForPrompt(promptId: string): ExploreAssignment | undefined {
    return assignments?.find((a) => a.promptId === promptId && isLiveExploreAssignment(a));
  }

  // Deep-link entry (partner-question card or push tap): auto-open the
  // target assignment once — respond flow while their question waits,
  // both-answers view once it is complete.
  const handledParamsRef = useRef(false);
  useEffect(() => {
    if (handledParamsRef.current) return;
    if (!paramAssignmentId && !paramPromptId) return;
    if (!assignments || !user?.id) return;
    const target = assignments.find(
      (a) =>
        (paramAssignmentId ? a.id === paramAssignmentId : a.promptId === paramPromptId) &&
        isLiveExploreAssignment(a)
    );
    if (!target) return;
    handledParamsRef.current = true;
    if (target.category) setSelectedCategory(target.category);
    const partnerAsked =
      target.status === 'partial' &&
      target.firstResponderId != null &&
      target.firstResponderId !== user.id;
    if (partnerAsked) {
      setActivePrompt({
        id: target.promptId,
        text: target.promptText,
        hint: target.promptHint,
        type: target.category,
        emotionalDepth: '',
      });
      setActiveAssignmentId(target.id);
      setMode('responding');
    } else if (target.status === 'completed') {
      setViewingAssignmentId(target.id);
    }
  }, [paramAssignmentId, paramPromptId, assignments, user?.id]);

  async function handleStartPrompt(prompt: ExplorePrompt) {
    // No couple linked — keep the user on the screen with a quiet inline
    // notice on this card instead of throwing a raw alert at them.
    if (!user?.coupleId) {
      setLinkNoticePromptId(prompt.id);
      return;
    }
    hapticImpact();
    try {
      const result = await startExplore.mutateAsync(prompt);
      setLinkNoticePromptId(null);
      setActivePrompt(prompt);
      setActiveAssignmentId(result.assignmentId);
      setMode('responding');
    } catch (error: unknown) {
      if (error instanceof NoCoupleLinkedError) {
        setLinkNoticePromptId(prompt.id);
        return;
      }
      Alert.alert(
        t('explore.startErrorTitle'),
        error instanceof Error && error.message ? error.message : t('explore.startErrorBody'),
      );
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
      Alert.alert(t('explore.saveErrorTitle'), t('explore.saveErrorBody'));
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
                {'\u201C'}{personalize(activePrompt.text)}{'\u201D'}
              </Text>
              {activePrompt.hint && (
                <Text style={styles.respondingHint}>{personalize(activePrompt.hint)}</Text>
              )}
            </Animated.View>

            <Animated.View entering={FadeInUp.duration(400).delay(100)}>
              <TextInput
                style={styles.textInput}
                placeholder={t('explore.placeholder')}
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
                  ? t('explore.moreCharacters', { count: 10 - responseText.length })
                  : t('explore.readyToShare')}
              </Text>

              <View style={styles.buttonRow}>
                <TouchableOpacity
                  style={styles.cancelButton}
                  onPress={() => {
                    setMode('browse');
                    setResponseText('');
                  }}
                >
                  <Text style={styles.cancelText} maxFontSizeMultiplier={1.4}>{t('explore.back')}</Text>
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
                      {submitResponse.isPending ? t('explore.sending') : t('explore.share')}
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
        <Text style={styles.headerEyebrow}>{t('explore.eyebrow')}</Text>
        <Text style={styles.headerTitle}>{t('explore.title')}</Text>
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
        ) : promptsFailed ? (
          // Quiet in-shell error — header and chips stay put above
          <QueryError
            message={t('explore.loadError')}
            onRetry={() => refetchPrompts()}
          />
        ) : !prompts || prompts.length === 0 ? (
          <Animated.View entering={FadeIn.duration(400)} style={styles.emptyState}>
            <Text style={styles.emptyText}>{t('explore.emptyCategory')}</Text>
          </Animated.View>
        ) : (
          prompts.map((prompt, index) => {
            const existing = getAssignmentForPrompt(prompt.id);
            const status = existing?.status;
            // Who is this partial waiting on? first_responder_id is the asker.
            const iAskedThis =
              status === 'partial' && !!existing?.firstResponderId &&
              existing.firstResponderId === user?.id;
            const partnerAskedThis =
              status === 'partial' && !!existing?.firstResponderId &&
              existing.firstResponderId !== user?.id;
            const isViewing = !!existing && viewingAssignmentId === existing.id;
            const toggleViewing = () =>
              setViewingAssignmentId(isViewing ? null : existing?.id ?? null);

            return (
              <Animated.View
                key={prompt.id}
                entering={FadeInUp.duration(400).delay(index * 80)}
              >
                <View style={styles.promptCard}>
                  {/* No accent bar on list cards — a cue on every card is a
                      cue on none. Only a primary/hero surface carries it. */}
                  <View style={styles.promptContent}>
                    <Text style={styles.promptText}>{personalize(prompt.text)}</Text>
                    {prompt.hint && (
                      <Text style={styles.promptHint}>{personalize(prompt.hint)}</Text>
                    )}
                    {/* No depth badge — "Surface/Medium/Deep" is internal
                        taxonomy, not user vocabulary. The action stands alone. */}
                    <View style={styles.promptFooter}>
                      {status === 'completed' ? (
                        <TouchableOpacity
                          style={styles.statusBadge}
                          onPress={toggleViewing}
                          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                          accessibilityRole="button"
                        >
                          <Icon name="checks" size={14} color={colors.semantic.success} />
                          <Text style={[styles.statusText, { color: colors.semantic.success }]}>
                            {isViewing ? t('explore.hide') : t('explore.seeBothAnswers')}
                          </Text>
                        </TouchableOpacity>
                      ) : iAskedThis ? (
                        // Sealed-waiting: tap re-reads YOUR OWN answer only —
                        // the partner's stays sealed until you both answered.
                        <TouchableOpacity
                          style={styles.statusBadge}
                          onPress={toggleViewing}
                          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                          accessibilityRole="button"
                        >
                          <Icon name="hourglass" size={14} color={colors.text.secondary} />
                          <Text style={[styles.statusText, { color: colors.text.secondary }]}>
                            {t('explore.waitingOn', { name: partnerName })}
                          </Text>
                        </TouchableOpacity>
                      ) : partnerAskedThis ? (
                        <View style={styles.askedRow}>
                          <Text style={styles.askedText}>
                            {t('explore.askedYouThis', { name: partnerName })}
                          </Text>
                          <TouchableOpacity
                            style={styles.respondButton}
                            onPress={() => handleStartPrompt(prompt)}
                            disabled={startExplore.isPending}
                          >
                            <Text style={styles.respondButtonText} maxFontSizeMultiplier={1.4}>
                              {t('explore.respond')}
                            </Text>
                          </TouchableOpacity>
                        </View>
                      ) : (
                        <TouchableOpacity
                          style={styles.respondButton}
                          onPress={() => handleStartPrompt(prompt)}
                          disabled={startExplore.isPending}
                        >
                          <Text style={styles.respondButtonText} maxFontSizeMultiplier={1.4}>
                            {t('explore.respond')}
                          </Text>
                        </TouchableOpacity>
                      )}
                    </View>
                    {iAskedThis && (
                      <Text style={styles.sealedLine}>{t('explore.sealedLine')}</Text>
                    )}
                    {/* Quiet notice on the respond action — no couple linked */}
                    {linkNoticePromptId === prompt.id && (
                      <Animated.View entering={FadeIn.duration(300)} style={styles.linkNotice}>
                        <Icon name="users" size={14} color={colors.text.secondary} />
                        <Text style={styles.linkNoticeText}>{t('explore.linkFirst')}</Text>
                      </Animated.View>
                    )}
                    {/* Show responses when tapped — while partial only YOUR
                        answer is exposed (the hook enforces the seal) */}
                    {isViewing &&
                      (responsesLoading ? (
                        <View style={styles.responsesSection} testID="explore-responses-loading">
                          <View style={styles.responseCard}>
                            <Skeleton width={48} height={12} />
                            <Skeleton height={16} />
                            <Skeleton height={16} width="70%" />
                          </View>
                          <View style={styles.responseCard}>
                            <Skeleton width={64} height={12} />
                            <Skeleton height={16} width="85%" />
                          </View>
                        </View>
                      ) : responsesFailed ? (
                        <View style={styles.responsesSection}>
                          <Text style={styles.responsesErrorText}>
                            {t('explore.answersLoadFailed')}
                          </Text>
                          <TouchableOpacity
                            onPress={() => refetchResponses()}
                            accessibilityRole="button"
                            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                          >
                            <Text style={styles.responsesRetryText}>{t('common.tryAgain')}</Text>
                          </TouchableOpacity>
                        </View>
                      ) : viewingResponses ? (
                        <Animated.View entering={FadeIn.duration(300)} style={styles.responsesSection}>
                          {viewingResponses.map((r) => (
                            <View key={r.id} style={styles.responseCard}>
                              <Text style={styles.responseAuthor}>
                                {r.isCurrentUser ? t('common.you') : partnerName}
                              </Text>
                              <Text style={styles.responseText}>{r.text}</Text>
                            </View>
                          ))}
                        </Animated.View>
                      ) : null)}
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
    justifyContent: 'flex-end',
    marginTop: spacing.xs,
  },

  // Quiet inline notice — respond needs a linked partner
  linkNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginTop: spacing.smd,
  },
  linkNoticeText: {
    ...typography.caption,
    color: colors.text.secondary,
    flex: 1,
  },

  // Status badges
  statusBadge: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  statusText: {
    ...typography.caption,
  },

  // Sealed-waiting quiet line (below the footer, my-answer prompts only)
  sealedLine: {
    ...typography.caption,
    color: colors.text.secondary,
    marginTop: spacing.sm,
  },

  // Answers failed to load — quiet inline notice + retry
  responsesErrorText: {
    ...typography.caption,
    color: colors.text.secondary,
  },
  responsesRetryText: {
    ...typography.bodySm,
    color: colors.accent.primary,
    marginTop: spacing.xs,
  },

  // "{name} asked you this" + Respond
  askedRow: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.smd,
  },
  askedText: {
    ...typography.caption,
    color: colors.accent.primary,
    flexShrink: 1,
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

  // Response viewer — two labeled answer cards (You / partner name)
  responsesSection: {
    marginTop: spacing.md,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border.default,
    gap: spacing.smd,
  },
  responseCard: {
    backgroundColor: colors.surface.background,
    borderRadius: radius.card,
    padding: spacing.md,
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
