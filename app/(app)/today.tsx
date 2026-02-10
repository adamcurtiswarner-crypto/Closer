import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  Image,
  ScrollView,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  TouchableOpacity,
  RefreshControl,
  Keyboard,
} from 'react-native';

const logo = require('@/assets/logo.png');
import Animated, { FadeIn, FadeInUp, FadeInDown } from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { SafeAreaView } from 'react-native-safe-area-context';
import { format } from 'date-fns';
import { PromptCard, CompletionMoment, GoalTracker, AddGoalModal, WishlistCard, AddWishlistModal } from '@components';
import { ConnectionHeader } from '@/components/ConnectionHeader';
import { StreakRing } from '@/components/StreakRing';
import { usePresence } from '@/hooks/usePresence';
import { useAuth } from '@/hooks/useAuth';
import { useTodayPrompt, useSubmitResponse, useSubmitFeedback, useTriggerPrompt } from '@/hooks/usePrompt';
import { useStreak } from '@/hooks/useStreak';
import { logEvent } from '@/services/analytics';
import { QueryError } from '@/components/QueryError';
import { PromptCardSkeleton } from '@/components/Skeleton';
import { logger } from '@/utils/logger';

// Greeting based on time of day
function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
}

export default function TodayScreen() {
  const { user } = useAuth();
  const {
    isPartnerOnline,
    isPartnerTyping,
    partnerTypingContext,
    partnerLastSeen,
    setTyping,
    markResponseViewed,
  } = usePresence();

  const { data: todayData, isLoading, error, refetch } = useTodayPrompt();
  const submitResponse = useSubmitResponse();
  const submitFeedback = useSubmitFeedback();
  const triggerPrompt = useTriggerPrompt();
  const { currentStreak, weeklyCompletions, isStreakActive } = useStreak();

  const [isResponding, setIsResponding] = useState(false);
  const [responseText, setResponseText] = useState('');
  const [feedbackGiven, setFeedbackGiven] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [showStreakDetail, setShowStreakDetail] = useState(false);
  const [showAddGoalModal, setShowAddGoalModal] = useState(false);
  const [showAddWishlistModal, setShowAddWishlistModal] = useState(false);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  }, [refetch]);

  // Derive mode from real data
  const assignment = todayData?.assignment ?? null;
  const myResponse = todayData?.myResponse ?? null;
  const partnerResponse = todayData?.partnerResponse ?? null;
  const isComplete = todayData?.isComplete ?? false;
  const nextPromptAt = todayData?.nextPromptAt ?? null;

  type Mode = 'loading' | 'no-prompt' | 'prompt' | 'responding' | 'waiting' | 'complete';

  let mode: Mode;
  if (isLoading) {
    mode = 'loading';
  } else if (error) {
    mode = 'loading';
  } else if (!assignment) {
    mode = 'no-prompt';
  } else if (isResponding) {
    mode = 'responding';
  } else if (!myResponse) {
    mode = 'prompt';
  } else if (!isComplete) {
    mode = 'waiting';
  } else {
    mode = 'complete';
  }

  // Log prompt_viewed when assignment first loads
  const viewedRef = useRef<string | null>(null);
  useEffect(() => {
    if (assignment && assignment.id !== viewedRef.current) {
      viewedRef.current = assignment.id;
      logEvent('prompt_viewed', {
        assignment_id: assignment.id,
        prompt_type: assignment.promptType,
      });
    }
  }, [assignment]);

  // Handle text change with typing indicator
  const handleTextChange = (text: string) => {
    setResponseText(text);
    if (text.length > 0) {
      setTyping(true, 'prompt');
    } else {
      setTyping(false);
    }
  };

  // Clear typing when leaving responding mode
  useEffect(() => {
    if (mode !== 'responding') {
      setTyping(false);
    }
  }, [mode, setTyping]);

  // Mark response as viewed when entering complete mode
  useEffect(() => {
    if (mode === 'complete') {
      markResponseViewed();
    }
  }, [mode, markResponseViewed]);

  const handleRespond = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setIsResponding(true);
    if (assignment) {
      logEvent('prompt_started', { assignment_id: assignment.id });
    }
  };

  const handleSubmit = async () => {
    if (responseText.length < 10 || !assignment) return;
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    Keyboard.dismiss();
    setTyping(false);
    setIsResponding(false);
    try {
      await submitResponse.mutateAsync({
        assignmentId: assignment.id,
        responseText,
      });
    } catch (err) {
      logger.error('Error submitting response:', err);
    }
  };

  const partnerName = user?.partnerName || 'Partner';
  const userName = user?.displayName || null;

  // ─── Loading ───
  if (mode === 'loading') {
    return (
      <SafeAreaView style={styles.container}>
        {error ? (
          <View style={styles.centered}>
            <QueryError
              message="Couldn't load today's prompt."
              onRetry={() => refetch()}
            />
          </View>
        ) : (
          <View style={styles.scrollView}>
            <View style={styles.greetingRow}>
              <Text style={styles.greeting}>{getGreeting()}</Text>
              <Text style={styles.dateText}>{format(new Date(), 'EEEE, MMMM d')}</Text>
            </View>
            <View style={styles.promptSection}>
              <PromptCardSkeleton />
            </View>
          </View>
        )}
      </SafeAreaView>
    );
  }

  // ─── No prompt yet ───
  if (mode === 'no-prompt') {
    return (
      <SafeAreaView style={styles.container}>
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#c97454" />}
        >
          <View style={styles.greetingRow}>
            <View style={styles.greetingTop}>
              <Image source={logo} style={styles.logoMark} resizeMode="contain" />
              <Text style={styles.greeting}>{getGreeting()}</Text>
            </View>
            <Text style={styles.dateText}>{format(new Date(), 'EEEE, MMMM d')}</Text>
          </View>

          <ConnectionHeader
            userName={userName}
            partnerName={partnerName}
            isPartnerOnline={isPartnerOnline}
            isPartnerTyping={isPartnerTyping}
            typingContext={partnerTypingContext}
            lastSeen={partnerLastSeen}
            currentStreak={currentStreak}
            isStreakActive={isStreakActive}
            userPhotoUrl={user?.photoUrl}
            partnerPhotoUrl={user?.partnerPhotoUrl}
          />

          <Animated.View entering={FadeInUp.duration(500).delay(200)} style={styles.emptyCard}>
            <Text style={styles.emptyIcon}>{'\u2604\uFE0F'}</Text>
            <Text style={styles.emptyTitle}>Your prompt is on its way</Text>
            <Text style={styles.emptySubtitle}>
              {nextPromptAt
                ? `Arriving around ${format(new Date(nextPromptAt), 'h:mm a')}`
                : 'Check back soon'}
            </Text>
            {user?.coupleId && (
              <TouchableOpacity
                style={[styles.triggerButton, triggerPrompt.isPending && styles.disabled]}
                onPress={() => triggerPrompt.mutate()}
                disabled={triggerPrompt.isPending}
                activeOpacity={0.8}
              >
                <Text style={styles.triggerButtonText}>
                  {triggerPrompt.isPending ? 'Loading...' : "Get today's prompt"}
                </Text>
              </TouchableOpacity>
            )}
          </Animated.View>

          {/* Streak section */}
          {(currentStreak > 0 || weeklyCompletions > 0) && (
            <Animated.View entering={FadeInUp.duration(500).delay(400)} style={styles.streakSection}>
              <StreakRing
                currentStreak={currentStreak}
                weeklyCompletions={weeklyCompletions}
                isStreakActive={isStreakActive}
              />
            </Animated.View>
          )}

          {/* Goal Tracker */}
          <Animated.View entering={FadeInUp.duration(500).delay(600)} style={styles.goalSection}>
            <GoalTracker onAddGoal={() => setShowAddGoalModal(true)} />
          </Animated.View>

          {/* Wishlist */}
          <Animated.View entering={FadeInUp.duration(500).delay(800)} style={styles.goalSection}>
            <WishlistCard onAddItem={() => setShowAddWishlistModal(true)} />
          </Animated.View>

          <AddGoalModal
            visible={showAddGoalModal}
            onClose={() => setShowAddGoalModal(false)}
          />
          <AddWishlistModal
            visible={showAddWishlistModal}
            onClose={() => setShowAddWishlistModal(false)}
          />
        </ScrollView>
      </SafeAreaView>
    );
  }

  // ─── Responding ───
  if (mode === 'responding') {
    return (
      <SafeAreaView style={styles.container}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.flex}
        >
          <ScrollView style={styles.scrollView} contentContainerStyle={styles.respondingScroll} keyboardShouldPersistTaps="handled">
            <Animated.View entering={FadeIn.duration(300)} style={styles.respondingHeader}>
              <Text style={styles.respondingPrompt}>
                {'\u201C'}{assignment!.promptText}{'\u201D'}
              </Text>
            </Animated.View>

            <Animated.View entering={FadeInUp.duration(400).delay(100)}>
              <TextInput
                style={styles.textInput}
                placeholder="Share what comes to mind..."
                placeholderTextColor="#a8a29e"
                multiline
                textAlignVertical="top"
                value={responseText}
                onChangeText={handleTextChange}
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
                  onPress={() => { setIsResponding(false); setResponseText(''); }}
                >
                  <Text style={styles.cancelText}>Back</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.submitButton, (responseText.length < 10 || submitResponse.isPending) && styles.disabled]}
                  onPress={handleSubmit}
                  disabled={responseText.length < 10 || submitResponse.isPending}
                  activeOpacity={0.8}
                >
                  <Text style={styles.submitText}>
                    {submitResponse.isPending ? 'Sending...' : 'Share'}
                  </Text>
                  {!submitResponse.isPending && <Text style={styles.submitArrow}>{'\u2192'}</Text>}
                </TouchableOpacity>
              </View>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    );
  }

  // ─── Waiting for partner ───
  if (mode === 'waiting') {
    return (
      <SafeAreaView style={styles.container}>
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#c97454" />}
        >
          <View style={styles.greetingRow}>
            <View style={styles.greetingTop}>
              <Image source={logo} style={styles.logoMark} resizeMode="contain" />
              <Text style={styles.greeting}>Nice one</Text>
            </View>
            <Text style={styles.dateText}>{format(new Date(), 'EEEE, MMMM d')}</Text>
          </View>

          <ConnectionHeader
            userName={userName}
            partnerName={partnerName}
            isPartnerOnline={isPartnerOnline}
            isPartnerTyping={isPartnerTyping}
            typingContext={partnerTypingContext}
            lastSeen={partnerLastSeen}
            currentStreak={currentStreak}
            isStreakActive={isStreakActive}
            userPhotoUrl={user?.photoUrl}
            partnerPhotoUrl={user?.partnerPhotoUrl}
          />

          <Animated.View entering={FadeInUp.duration(500).delay(200)} style={styles.waitingCard}>
            <Text style={styles.waitingPrompt}>
              {'\u201C'}{assignment!.promptText}{'\u201D'}
            </Text>

            <View style={styles.yourResponseSection}>
              <View style={styles.responseLabel}>
                <View style={[styles.labelDot, { backgroundColor: '#a8a29e' }]} />
                <Text style={styles.labelText}>Your response</Text>
              </View>
              <Text style={styles.responseBody}>{myResponse!.responseText}</Text>
            </View>

            <View style={styles.waitingDivider} />

            {isPartnerTyping && partnerTypingContext === 'prompt' ? (
              <Animated.View entering={FadeIn.duration(300)} style={styles.typingRow}>
                <View style={styles.typingDots}>
                  <View style={[styles.typingDot, { opacity: 0.4 }]} />
                  <View style={[styles.typingDot, { opacity: 0.7 }]} />
                  <View style={[styles.typingDot, { opacity: 1 }]} />
                </View>
                <Text style={styles.typingText}>{partnerName} is responding...</Text>
              </Animated.View>
            ) : (
              <View style={styles.waitingMessageRow}>
                <Text style={styles.waitingIcon}>{'\u23F3'}</Text>
                <Text style={styles.waitingMessage}>Waiting for {partnerName.toLowerCase()}...</Text>
              </View>
            )}
          </Animated.View>

          {/* Goal Tracker */}
          <Animated.View entering={FadeInUp.duration(500).delay(400)} style={styles.goalSection}>
            <GoalTracker onAddGoal={() => setShowAddGoalModal(true)} />
          </Animated.View>

          {/* Wishlist */}
          <Animated.View entering={FadeInUp.duration(500).delay(600)} style={styles.goalSection}>
            <WishlistCard onAddItem={() => setShowAddWishlistModal(true)} />
          </Animated.View>

          <AddGoalModal
            visible={showAddGoalModal}
            onClose={() => setShowAddGoalModal(false)}
          />
          <AddWishlistModal
            visible={showAddWishlistModal}
            onClose={() => setShowAddWishlistModal(false)}
          />
        </ScrollView>
      </SafeAreaView>
    );
  }

  // ─── Complete ───
  if (mode === 'complete') {
    return (
      <SafeAreaView style={styles.container}>
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#c97454" />}
        >
          <View style={styles.greetingRow}>
            <View style={styles.greetingTop}>
              <Image source={logo} style={styles.logoMark} resizeMode="contain" />
              <Text style={styles.greeting}>Beautiful</Text>
            </View>
            <Text style={styles.dateText}>{format(new Date(), 'EEEE, MMMM d')}</Text>
          </View>

          <ConnectionHeader
            userName={userName}
            partnerName={partnerName}
            isPartnerOnline={isPartnerOnline}
            isPartnerTyping={isPartnerTyping}
            typingContext={partnerTypingContext}
            lastSeen={partnerLastSeen}
            currentStreak={currentStreak}
            isStreakActive={isStreakActive}
            userPhotoUrl={user?.photoUrl}
            partnerPhotoUrl={user?.partnerPhotoUrl}
          />

          <Animated.View entering={FadeInUp.duration(500).delay(200)} style={styles.completionSection}>
            <CompletionMoment
              promptText={assignment!.promptText}
              yourResponse={myResponse!.responseText}
              partnerResponse={partnerResponse?.responseText || ''}
              partnerName={partnerName}
            />
          </Animated.View>

          {/* Emotional Feedback */}
          {myResponse && !feedbackGiven && (
            <Animated.View entering={FadeInUp.duration(400).delay(500)} style={styles.feedbackCard}>
              <Text style={styles.feedbackTitle}>How did this feel?</Text>
              <View style={styles.feedbackRow}>
                {([
                  { value: 'positive', label: 'Warm', icon: '\u2600\uFE0F' },
                  { value: 'neutral', label: 'Okay', icon: '\u2601\uFE0F' },
                  { value: 'negative', label: 'Hard', icon: '\uD83C\uDF27\uFE0F' },
                ] as const).map((option) => (
                  <TouchableOpacity
                    key={option.value}
                    style={styles.feedbackOption}
                    onPress={() => {
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                      submitFeedback.mutate({
                        responseId: myResponse.id,
                        emotionalResponse: option.value,
                      });
                      setFeedbackGiven(true);
                    }}
                    disabled={submitFeedback.isPending}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.feedbackIcon}>{option.icon}</Text>
                    <Text style={styles.feedbackOptionText}>{option.label}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </Animated.View>
          )}

          {feedbackGiven && (
            <Animated.View entering={FadeIn.duration(400)}>
              <Text style={styles.feedbackThanks}>Thanks for sharing</Text>
            </Animated.View>
          )}

          {/* Streak celebration */}
          {currentStreak > 0 && (
            <Animated.View entering={FadeInUp.duration(500).delay(700)}>
              <TouchableOpacity
                style={styles.streakCelebration}
                onPress={() => setShowStreakDetail(!showStreakDetail)}
                activeOpacity={0.8}
              >
                <Text style={styles.streakCelebrationIcon}>{'\uD83D\uDD25'}</Text>
                <Text style={styles.streakCelebrationText}>
                  {currentStreak === 1 ? 'Streak started!' : `${currentStreak} day streak!`}
                </Text>
              </TouchableOpacity>
            </Animated.View>
          )}

          {showStreakDetail && (
            <Animated.View entering={FadeInDown.duration(400)} style={styles.streakDetailSection}>
              <StreakRing
                currentStreak={currentStreak}
                weeklyCompletions={weeklyCompletions}
                isStreakActive={isStreakActive}
              />
            </Animated.View>
          )}

          {/* Goal Tracker */}
          <Animated.View entering={FadeInUp.duration(500).delay(800)} style={styles.goalSection}>
            <GoalTracker onAddGoal={() => setShowAddGoalModal(true)} />
          </Animated.View>

          {/* Wishlist */}
          <Animated.View entering={FadeInUp.duration(500).delay(1000)} style={styles.goalSection}>
            <WishlistCard onAddItem={() => setShowAddWishlistModal(true)} />
          </Animated.View>

          <Animated.View entering={FadeIn.duration(400).delay(1100)}>
            <View style={styles.doneRow}>
              <View style={styles.doneDot} />
              <Text style={styles.doneText}>See you tomorrow</Text>
              <View style={styles.doneDot} />
            </View>
          </Animated.View>

          <AddGoalModal
            visible={showAddGoalModal}
            onClose={() => setShowAddGoalModal(false)}
          />
          <AddWishlistModal
            visible={showAddWishlistModal}
            onClose={() => setShowAddWishlistModal(false)}
          />
        </ScrollView>
      </SafeAreaView>
    );
  }

  // ─── Default: Show prompt ───
  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        <Animated.View entering={FadeIn.duration(400)}>
          <View style={styles.greetingRow}>
            <View style={styles.greetingTop}>
              <Image source={logo} style={styles.logoMark} resizeMode="contain" />
              <Text style={styles.greeting}>{getGreeting()}</Text>
            </View>
            <Text style={styles.dateText}>{format(new Date(), 'EEEE, MMMM d')}</Text>
          </View>
        </Animated.View>

        <Animated.View entering={FadeIn.duration(500).delay(100)}>
          <ConnectionHeader
            userName={userName}
            partnerName={partnerName}
            isPartnerOnline={isPartnerOnline}
            isPartnerTyping={isPartnerTyping}
            typingContext={partnerTypingContext}
            lastSeen={partnerLastSeen}
            currentStreak={currentStreak}
            isStreakActive={isStreakActive}
            userPhotoUrl={user?.photoUrl}
            partnerPhotoUrl={user?.partnerPhotoUrl}
          />
        </Animated.View>

        <Animated.View entering={FadeInUp.duration(600).delay(300)} style={styles.promptSection}>
          <PromptCard
            promptText={assignment!.promptText}
            promptHint={assignment!.promptHint}
            promptType={assignment!.promptType}
            onRespond={handleRespond}
          />
        </Animated.View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fafaf9',
  },
  flex: {
    flex: 1,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollView: {
    flex: 1,
    paddingHorizontal: 24,
  },
  scrollContent: {
    paddingTop: 20,
    paddingBottom: 40,
  },
  // ─── Header / Greeting ───
  greetingRow: {
    marginBottom: 8,
  },
  greetingTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  logoMark: {
    width: 32,
    height: 32,
  },
  greeting: {
    fontSize: 28,
    fontWeight: '700',
    color: '#1c1917',
    letterSpacing: -0.5,
  },
  dateText: {
    fontSize: 15,
    color: '#78716c',
    marginTop: 2,
  },
  // ─── Prompt ───
  promptSection: {
    marginTop: 24,
  },
  // ─── Empty / No prompt ───
  emptyCard: {
    marginTop: 24,
    backgroundColor: '#ffffff',
    borderRadius: 20,
    padding: 32,
    alignItems: 'center',
    shadowColor: '#1c1917',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 1,
  },
  emptyIcon: {
    fontSize: 36,
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#292524',
    marginBottom: 8,
    textAlign: 'center',
  },
  emptySubtitle: {
    fontSize: 15,
    color: '#78716c',
    textAlign: 'center',
    lineHeight: 22,
  },
  triggerButton: {
    marginTop: 24,
    paddingVertical: 14,
    paddingHorizontal: 28,
    backgroundColor: '#c97454',
    borderRadius: 14,
  },
  triggerButtonText: {
    color: '#ffffff',
    fontWeight: '700',
    fontSize: 16,
  },
  disabled: {
    opacity: 0.5,
  },
  streakSection: {
    marginTop: 24,
  },
  goalSection: {
    marginTop: 24,
  },
  // ─── Responding ───
  respondingScroll: {
    paddingTop: 32,
    paddingBottom: 32,
    flexGrow: 1,
  },
  respondingHeader: {
    marginBottom: 24,
  },
  respondingPrompt: {
    fontSize: 18,
    color: '#57534e',
    fontStyle: 'italic',
    textAlign: 'center',
    lineHeight: 26,
  },
  textInput: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 20,
    fontSize: 17,
    color: '#1c1917',
    borderWidth: 1.5,
    borderColor: '#e7e5e4',
    minHeight: 140,
    maxHeight: 240,
    lineHeight: 24,
  },
  respondingFooter: {
    marginTop: 12,
  },
  charHint: {
    color: '#a8a29e',
    fontSize: 13,
    textAlign: 'center',
    marginBottom: 16,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 12,
  },
  cancelButton: {
    paddingVertical: 16,
    paddingHorizontal: 24,
    backgroundColor: '#f5f5f4',
    borderRadius: 14,
  },
  cancelText: {
    color: '#57534e',
    fontWeight: '600',
    fontSize: 16,
  },
  submitButton: {
    flex: 1,
    paddingVertical: 16,
    backgroundColor: '#c97454',
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 6,
  },
  submitText: {
    color: '#ffffff',
    fontWeight: '700',
    fontSize: 16,
  },
  submitArrow: {
    color: '#ffffff',
    fontSize: 17,
  },
  // ─── Waiting ───
  waitingCard: {
    marginTop: 20,
    backgroundColor: '#ffffff',
    borderRadius: 20,
    padding: 24,
    shadowColor: '#1c1917',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 1,
  },
  waitingPrompt: {
    fontSize: 16,
    color: '#57534e',
    fontStyle: 'italic',
    textAlign: 'center',
    marginBottom: 20,
    lineHeight: 24,
  },
  yourResponseSection: {
    backgroundColor: '#fafaf9',
    borderRadius: 14,
    padding: 16,
  },
  responseLabel: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 8,
  },
  labelDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  labelText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#78716c',
    letterSpacing: 0.3,
    textTransform: 'uppercase',
  },
  responseBody: {
    fontSize: 16,
    color: '#292524',
    lineHeight: 24,
  },
  waitingDivider: {
    height: 1,
    backgroundColor: '#f5f5f4',
    marginVertical: 20,
  },
  typingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  typingDots: {
    flexDirection: 'row',
    gap: 3,
  },
  typingDot: {
    width: 5,
    height: 5,
    borderRadius: 3,
    backgroundColor: '#c97454',
  },
  typingText: {
    color: '#c97454',
    fontStyle: 'italic',
    fontSize: 14,
  },
  waitingMessageRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  waitingIcon: {
    fontSize: 16,
  },
  waitingMessage: {
    color: '#78716c',
    fontSize: 14,
  },
  // ─── Complete ───
  completionSection: {
    marginTop: 20,
  },
  feedbackCard: {
    marginTop: 20,
    backgroundColor: '#ffffff',
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
    shadowColor: '#1c1917',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 1,
  },
  feedbackTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#57534e',
    marginBottom: 16,
  },
  feedbackRow: {
    flexDirection: 'row',
    gap: 12,
  },
  feedbackOption: {
    paddingVertical: 12,
    paddingHorizontal: 20,
    backgroundColor: '#fafaf9',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#f5f5f4',
    alignItems: 'center',
    gap: 4,
  },
  feedbackIcon: {
    fontSize: 20,
  },
  feedbackOptionText: {
    fontSize: 13,
    color: '#57534e',
    fontWeight: '500',
  },
  feedbackThanks: {
    marginTop: 16,
    fontSize: 14,
    color: '#a8a29e',
    textAlign: 'center',
  },
  streakCelebration: {
    marginTop: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fef7f4',
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 16,
    gap: 8,
    alignSelf: 'center',
  },
  streakCelebrationIcon: {
    fontSize: 20,
  },
  streakCelebrationText: {
    fontSize: 17,
    fontWeight: '700',
    color: '#c97454',
  },
  streakDetailSection: {
    marginTop: 16,
  },
  doneRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    marginTop: 32,
    marginBottom: 16,
  },
  doneDot: {
    width: 3,
    height: 3,
    borderRadius: 2,
    backgroundColor: '#d6d3d1',
  },
  doneText: {
    color: '#a8a29e',
    fontSize: 14,
    fontWeight: '500',
  },
});
