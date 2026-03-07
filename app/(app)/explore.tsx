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
  ExplorePrompt,
} from '@/hooks/useExplorePrompts';
import { useSubmitResponse } from '@/hooks/usePrompt';
import { Icon } from '@/components/Icon';
import { logEvent } from '@/services/analytics';

type ScreenMode = 'browse' | 'responding';

export default function ExploreScreen() {
  const { category: initialCategory } = useLocalSearchParams<{ category?: string }>();
  const router = useRouter();

  const [selectedCategory, setSelectedCategory] = useState(initialCategory || PROMPT_CATEGORIES[0].type);
  const [mode, setMode] = useState<ScreenMode>('browse');
  const [activePrompt, setActivePrompt] = useState<ExplorePrompt | null>(null);
  const [activeAssignmentId, setActiveAssignmentId] = useState<string | null>(null);
  const [responseText, setResponseText] = useState('');

  const { data: prompts, isLoading } = usePromptsByCategory(selectedCategory);
  const { data: assignments } = useExploreAssignments();
  const startExplore = useStartExplorePrompt();
  const submitResponse = useSubmitResponse();

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
    } catch {
      // mutation error handled by React Query
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
      // handled by mutation
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
                placeholderTextColor="#a8a29e"
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
                      <Icon name="arrow-right" size="sm" color="#ffffff" />
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

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Icon name="arrow-left" size="md" color="#1c1917" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Explore</Text>
        <View style={{ width: 40 }} />
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
                color={isActive ? '#ffffff' : cat.color}
              />
              <Text
                style={[
                  styles.categoryChipLabel,
                  { color: isActive ? '#ffffff' : cat.color },
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
            <ActivityIndicator size="small" color="#ef5323" />
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
                  <View style={[styles.promptAccent, { backgroundColor: currentCategory?.color || '#ef5323' }]} />
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
                        <View style={styles.statusBadge}>
                          <Icon name="checks" size={14} color="#22c55e" />
                          <Text style={[styles.statusText, { color: '#22c55e' }]}>
                            Completed
                          </Text>
                        </View>
                      ) : status === 'partial' ? (
                        <View style={styles.statusBadge}>
                          <Icon name="hourglass" size={14} color="#d97706" />
                          <Text style={[styles.statusText, { color: '#d97706' }]}>
                            Waiting for partner
                          </Text>
                        </View>
                      ) : (
                        <TouchableOpacity
                          style={[
                            styles.respondButton,
                            { backgroundColor: currentCategory?.color || '#ef5323' },
                          ]}
                          onPress={() => handleStartPrompt(prompt)}
                          disabled={startExplore.isPending}
                        >
                          <Text style={styles.respondButtonText}>Respond</Text>
                        </TouchableOpacity>
                      )}
                    </View>
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
  container: { flex: 1, backgroundColor: '#faf9f7' },
  flex: { flex: 1 },
  scrollView: { flex: 1 },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  backButton: { padding: 8 },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    fontFamily: 'Alexandria-SemiBold',
    color: '#1c1917',
  },

  // Category tabs
  categoryScrollContainer: { flexShrink: 0 },
  categoryRow: { paddingHorizontal: 16, gap: 8, paddingBottom: 12 },
  categoryChip: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    gap: 6,
  },
  categoryChipLabel: { fontSize: 13, fontWeight: '500', fontFamily: 'Inter-Medium' },

  // Category description
  categoryDesc: { paddingHorizontal: 20, paddingBottom: 12 },
  categoryDescText: { fontSize: 14, color: '#78716c', fontFamily: 'Inter-Regular' },

  // Prompt list
  promptList: { paddingHorizontal: 16, paddingBottom: 40, gap: 12 },
  loadingContainer: { paddingTop: 40, alignItems: 'center' },
  emptyState: { paddingTop: 40, alignItems: 'center' },
  emptyText: { fontSize: 15, color: '#a8a29e' },

  // Prompt card
  promptCard: {
    backgroundColor: '#ffffff',
    borderRadius: 20,
    shadowColor: '#1c1917',
    shadowOpacity: 0.06,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 2 },
    elevation: 3,
    overflow: 'hidden',
  },
  promptAccent: { height: 3 },
  promptContent: { padding: 20 },
  promptText: {
    fontSize: 16,
    fontWeight: '500',
    fontFamily: 'Inter-Medium',
    color: '#1c1917',
    lineHeight: 24,
    marginBottom: 8,
  },
  promptHint: {
    fontSize: 13,
    color: '#78716c',
    fontFamily: 'Inter-Regular',
    fontStyle: 'italic',
    marginBottom: 12,
  },
  promptFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 4,
  },
  depthBadge: {
    backgroundColor: '#f5f5f0',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  depthText: { fontSize: 12, color: '#78716c', textTransform: 'capitalize' },

  // Status badges
  statusBadge: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  statusText: { fontSize: 13, fontWeight: '500' },

  // Respond button
  respondButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  respondButtonText: { color: '#ffffff', fontSize: 14, fontWeight: '600', fontFamily: 'Inter-SemiBold' },

  // Responding mode
  respondingScroll: { padding: 20, flexGrow: 1 },
  respondingHeader: { marginBottom: 24 },
  respondingPrompt: {
    fontSize: 20,
    fontWeight: '600',
    fontFamily: 'Alexandria-SemiBold',
    color: '#1c1917',
    lineHeight: 30,
    fontStyle: 'italic',
  },
  respondingHint: {
    fontSize: 14,
    color: '#78716c',
    marginTop: 8,
  },
  textInput: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 16,
    fontSize: 16,
    color: '#1c1917',
    minHeight: 160,
    textAlignVertical: 'top',
    shadowColor: '#1c1917',
    shadowOpacity: 0.04,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 1 },
  },
  respondingFooter: { marginTop: 16 },
  charHint: { fontSize: 13, color: '#a8a29e', marginBottom: 12 },
  buttonRow: { flexDirection: 'row', gap: 12, alignItems: 'center' },
  cancelButton: { paddingVertical: 14, paddingHorizontal: 16 },
  cancelText: { fontSize: 16, color: '#78716c', fontWeight: '500' },
  submitButton: {
    backgroundColor: '#ef5323',
    borderRadius: 16,
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  submitText: { color: '#ffffff', fontSize: 16, fontWeight: '600', fontFamily: 'Inter-SemiBold' },
  disabled: { opacity: 0.5 },
});
