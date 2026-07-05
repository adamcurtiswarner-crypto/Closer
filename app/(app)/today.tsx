import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  RefreshControl,
  Keyboard,
  Alert,
} from 'react-native';
import { router } from 'expo-router';
import { pickImage } from '@/services/imageUpload';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '@/config/firebase';
import Animated, { FadeIn, FadeInUp, FadeInDown, useSharedValue, useAnimatedStyle, withSpring } from 'react-native-reanimated';
import { hapticImpact, hapticNotification, NotificationFeedbackType } from '@utils/haptics';
import { SafeAreaView } from 'react-native-safe-area-context';
import { format } from 'date-fns';
import {
  PromptCard,
  CompletionMoment,
  PulsingDots,
  Icon,
  TodayScreenHeader,
  RelationshipStagePrompt,
  EngagementCards,
  RespondingScreen,
  TodayBottomSections,
  ConversationStarterModal,
  ScalePromptCard,
  FollowUpContextLine,
  FollowUpSkip,
  getFollowUpContextLine,
} from '@components';
import type { RelationshipStage } from '@components';
import { StreakRing } from '@/components/StreakRing';
import { usePresence } from '@/hooks/usePresence';
import { useAuth } from '@/hooks/useAuth';
import { useTodayPrompt, useSubmitResponse, useSubmitFeedback, useTriggerPrompt, useSkipFollowUp } from '@/hooks/usePrompt';
import { isMiddleScaleOutcome } from '@/utils/scale';
import { useReaction, type ReactionType } from '@/hooks/useReaction';
import { useStreak } from '@/hooks/useStreak';
import { useMonthlyActivity } from '@/hooks/useMonthlyActivity';
import { useCouple } from '@/hooks/useCouple';
import { useCheckIn } from '@/hooks/useCheckIn';
import { useCoachingInsight } from '@/hooks/useCoachingInsight';
import { useSubscription } from '@/hooks/useSubscription';
import { updateWidgetData, buildWidgetData } from '@/services/widgetBridge';
import { getAnniversaryCountdown } from '@/config/milestones';
import { logEvent } from '@/services/analytics';
import { QueryError } from '@/components/QueryError';
import { PromptCardSkeleton } from '@/components/Skeleton';
import { logger } from '@/utils/logger';
import { FEATURES } from '@/config/features';
import { useTranslation } from 'react-i18next';

// Greeting based on time of day
function getGreeting(t: (key: string) => string): string {
  const hour = new Date().getHours();
  if (hour < 12) return t('today.goodMorning');
  if (hour < 17) return t('today.goodAfternoon');
  return t('today.goodEvening');
}

function AnimatedFeedbackButton({ option, onPress, isSelected, style }: {
  option: { value: string; label: string; icon: React.ReactNode };
  onPress: () => void;
  isSelected: boolean;
  style: any;
}) {
  const scale = useSharedValue(1);
  const animStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));
  return (
    <Animated.View style={animStyle}>
      <TouchableOpacity
        style={style}
        onPressIn={() => { scale.value = withSpring(1.15, { damping: 12, stiffness: 200 }); }}
        onPressOut={() => { scale.value = withSpring(1, { damping: 12, stiffness: 200 }); }}
        onPress={onPress}
      >
        <View style={styles.feedbackIconWrap}>{option.icon}</View>
        <Text style={styles.feedbackOptionText}>{option.label}</Text>
      </TouchableOpacity>
    </Animated.View>
  );
}

export default function TodayScreen() {
  const { user, refreshUser } = useAuth();
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
  const reaction = useReaction();
  const { currentStreak, isStreakActive } = useStreak();
  const { days: monthDays, completedCount: monthCompletedCount, month, year, startDayOffset } = useMonthlyActivity();
  const { data: couple } = useCouple();
  const { hasPendingCheckIn, submitCheckIn, dismissCheckIn } = useCheckIn();
  const { latestInsight, dismissInsight, markActedOn } = useCoachingInsight();
  const { isPremium } = useSubscription();
  const { t } = useTranslation();

  const skipFollowUp = useSkipFollowUp();

  const [isResponding, setIsResponding] = useState(false);
  const [responseText, setResponseText] = useState('');
  const [scaleValue, setScaleValue] = useState<number | null>(null);
  const [scaleNote, setScaleNote] = useState('');
  const [feedbackGiven, setFeedbackGiven] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const STREAK_MILESTONES = [3, 7, 14, 30, 50, 100];
  const [showStreakDetail, setShowStreakDetail] = useState(
    STREAK_MILESTONES.includes(currentStreak)
  );
  const [showAddGoalModal, setShowAddGoalModal] = useState(false);
  const [showAddWishlistModal, setShowAddWishlistModal] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [stageDismissed, setStageDismissed] = useState(true); // Start true to avoid flash
  const [showConversationModal, setShowConversationModal] = useState(false);
  const [conversationStarterText, setConversationStarterText] = useState('');

  useEffect(() => {
    AsyncStorage.getItem('stage_prompt_dismissed').then(val => {
      if (val !== 'true') setStageDismissed(false);
    });
  }, []);

  const handleSetStage = async (stage: RelationshipStage) => {
    if (!user?.id) return;
    hapticImpact();
    await updateDoc(doc(db, 'users', user.id), {
      relationship_stage: stage,
      updated_at: serverTimestamp(),
    });
    await refreshUser();
    setStageDismissed(true);
    AsyncStorage.setItem('stage_prompt_dismissed', 'true');
  };

  const handleDismissStage = () => {
    setStageDismissed(true);
    AsyncStorage.setItem('stage_prompt_dismissed', 'true');
  };

  const handleCoachingAction = (actionType: string, actionText: string) => {
    if (latestInsight?.id) {
      markActedOn.mutate(latestInsight.id);
      logEvent('coaching_insight_acted', {
        action_type: actionType,
        pulse_tier: couple?.currentPulseTier,
        pulse_score: couple?.currentPulseScore,
        week_id: latestInsight?.createdAt ? format(latestInsight.createdAt, "yyyy-'W'ww") : undefined,
      });
    }

    switch (actionType) {
      case 'goal':
        if (FEATURES.goals) setShowAddGoalModal(true);
        break;
      case 'date_night':
        if (FEATURES.wishlist) router.push('/(app)/wishlist');
        break;
      case 'conversation':
        setConversationStarterText(actionText);
        setShowConversationModal(true);
        break;
      case 'revisit':
        if (FEATURES.memories) router.push('/(app)/memories');
        break;
      case 'check_in':
        refreshUser();
        break;
    }
  };

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

  // Scored prompts & follow-ups
  const isScalePrompt = assignment?.responseFormat === 'scale';
  const isFollowUp = assignment?.assignmentKind === 'follow_up';
  const followUpContextText = isFollowUp && assignment?.followUp
    ? getFollowUpContextLine(assignment.followUp.branch)
    : null;

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

  // Auto-fetch today's prompt if none exists
  const hasAutoTriggered = useRef(false);
  useEffect(() => {
    if (
      mode === 'no-prompt' &&
      user?.coupleId &&
      !triggerPrompt.isPending &&
      !hasAutoTriggered.current
    ) {
      hasAutoTriggered.current = true;
      triggerPrompt.mutate();
    }
  }, [mode, user?.coupleId, triggerPrompt.isPending]);

  // Log prompt_viewed when assignment first loads
  const viewedRef = useRef<string | null>(null);
  useEffect(() => {
    if (assignment && assignment.id !== viewedRef.current) {
      viewedRef.current = assignment.id;
      // New assignment (e.g. a same-session follow-up) — reset scale inputs
      setScaleValue(null);
      setScaleNote('');
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

  // Update iOS home screen widget data
  useEffect(() => {
    if (!user || !couple) return;

    const daysAsCouple = couple.linkedAt
      ? Math.floor((Date.now() - couple.linkedAt.getTime()) / 86400000)
      : 0;

    let anniversaryDaysLeft = -1;
    let anniversaryIsToday = false;
    if (couple.anniversaryDate) {
      const countdown = getAnniversaryCountdown(couple.anniversaryDate);
      anniversaryDaysLeft = countdown.days;
      anniversaryIsToday = countdown.isToday;
    }

    let promptStatus: 'none' | 'your_turn' | 'waiting_partner' | 'complete' = 'none';
    if (assignment) {
      if (isComplete) {
        promptStatus = 'complete';
      } else if (!myResponse) {
        promptStatus = 'your_turn';
      } else {
        promptStatus = 'waiting_partner';
      }
    }

    const widgetData = buildWidgetData({
      currentStreak: FEATURES.streaks ? currentStreak : 0,
      daysAsCouple,
      userName: user.displayName || '',
      partnerName: user.partnerName || 'Partner',
      promptStatus,
      promptText: assignment?.promptText || '',
      anniversaryDaysLeft,
      anniversaryIsToday,
    });

    updateWidgetData(widgetData);
  }, [user, couple, currentStreak, assignment, myResponse, isComplete]);

  const handleRespond = () => {
    hapticImpact();
    setIsResponding(true);
    if (assignment) {
      logEvent('prompt_started', { assignment_id: assignment.id });
    }
  };

  const handleSubmit = async () => {
    if (responseText.length < 10 || !assignment) return;
    hapticNotification(NotificationFeedbackType.Success);
    Keyboard.dismiss();
    setTyping(false);
    const imageUri = selectedImage || undefined;
    try {
      await submitResponse.mutateAsync({
        assignmentId: assignment.id,
        responseText,
        imageUri,
      });
      setIsResponding(false);
      setSelectedImage(null);
    } catch (err) {
      logger.error('Error submitting response:', err);
      Alert.alert('Could not save your response', 'Please check your connection and try again.');
    }
  };

  const handleAddPhoto = async () => {
    const uri = await pickImage();
    if (uri) setSelectedImage(uri);
  };

  // Scale prompts: score is required, the note is optional
  const handleScaleSubmit = async () => {
    if (scaleValue === null || !assignment) return;
    hapticNotification(NotificationFeedbackType.Success);
    Keyboard.dismiss();
    try {
      await submitResponse.mutateAsync({
        assignmentId: assignment.id,
        responseText: scaleNote.trim(),
        responseScore: scaleValue,
      });
    } catch (err) {
      logger.error('Error submitting score:', err);
      Alert.alert('Could not save your response', 'Please check your connection and try again.');
    }
  };

  // Skipping a follow-up dismisses it locally for the day — no nagging, no penalty
  const handleSkipFollowUp = () => {
    if (!assignment) return;
    hapticImpact();
    skipFollowUp.mutate({ assignmentId: assignment.id });
  };

  const partnerName = user?.partnerName || 'Partner';
  const userName = user?.displayName || null;

  const showStagePrompt = !user?.relationshipStage && user?.isOnboarded && !stageDismissed;

  // Shared props for header component
  const headerProps = {
    userName,
    partnerName,
    isPartnerOnline,
    isPartnerTyping,
    typingContext: partnerTypingContext,
    lastSeen: partnerLastSeen,
    currentStreak: FEATURES.streaks ? currentStreak : 0,
    isStreakActive,
    userPhotoUrl: user?.photoUrl,
    partnerPhotoUrl: user?.partnerPhotoUrl,
  };

  // Shared props for engagement cards (check-in and coaching are feature-flagged for v1)
  const engagementProps = {
    hasPendingCheckIn: FEATURES.checkIns && hasPendingCheckIn,
    partnerName: user?.partnerName ?? 'your partner',
    onCheckInSubmit: (responses: any) => submitCheckIn.mutate(responses),
    onCheckInDismiss: () => dismissCheckIn.mutate(),
    isPremium,
    latestInsight: FEATURES.coaching ? latestInsight : null,
    onCoachingAction: () => latestInsight && handleCoachingAction(latestInsight.actionType, latestInsight.actionText),
    onCoachingDismiss: () => {
      if (latestInsight?.id) {
        dismissInsight.mutate(latestInsight.id);
        logEvent('coaching_insight_dismissed', {
          pulse_tier: couple?.currentPulseTier,
        });
      }
    },
    onViewCoaching: () => {
      if (FEATURES.coaching) router.push('/(app)/coaching');
    },
    pulseTier: couple?.currentPulseTier ?? undefined,
  };

  // Shared props for bottom sections
  const bottomProps = {
    showAddGoalModal,
    onOpenGoalModal: () => setShowAddGoalModal(true),
    onCloseGoalModal: () => setShowAddGoalModal(false),
    showAddWishlistModal,
    onOpenWishlistModal: () => setShowAddWishlistModal(true),
    onCloseWishlistModal: () => setShowAddWishlistModal(false),
  };

  // ─── Loading ───
  if (mode === 'loading') {
    return (
      <SafeAreaView style={styles.container}>
        {error ? (
          <View style={styles.centered}>
            <QueryError
              message={t('today.errorLoading')}
              onRetry={() => refetch()}
            />
          </View>
        ) : (
          <View style={styles.scrollView}>
            <View style={styles.greetingRow}>
              <Text style={styles.greeting}>{getGreeting(t)}</Text>
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

  // ─── Responding ───
  if (mode === 'responding') {
    return (
      <RespondingScreen
        promptText={assignment!.promptText}
        contextText={followUpContextText}
        responseText={responseText}
        onChangeText={handleTextChange}
        onSubmit={handleSubmit}
        onCancel={() => { setIsResponding(false); setResponseText(''); }}
        onAddPhoto={handleAddPhoto}
        selectedImage={selectedImage}
        onRemovePhoto={() => setSelectedImage(null)}
        isPending={submitResponse.isPending}
      />
    );
  }

  // ─── No prompt yet ───
  if (mode === 'no-prompt') {
    return (
      <SafeAreaView style={styles.container}>
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#D4522A" />}
        >
          <TodayScreenHeader greeting={getGreeting(t)} {...headerProps} />

          {showStagePrompt && (
            <RelationshipStagePrompt onSelectStage={handleSetStage} onDismiss={handleDismissStage} />
          )}

          <Animated.View entering={FadeInUp.duration(500).delay(200)} style={styles.emptyCard}>
            <View style={styles.accentBar} />
            <Icon name="coffee" size="xl" color="#D4522A" weight="light" />
            <Text style={styles.emptyTitle}>{t('today.emptyTitle')}</Text>
            <Text style={styles.emptySubtitle}>
              {nextPromptAt
                ? t('today.arrivingAround', { time: format(new Date(nextPromptAt), 'h:mm a') })
                : t('today.emptySubtitle')}
            </Text>
            {user?.coupleId && (
              <TouchableOpacity
                style={[styles.triggerButton, triggerPrompt.isPending && styles.disabled]}
                onPress={() => triggerPrompt.mutate()}
                disabled={triggerPrompt.isPending}
                activeOpacity={0.8}
              >
                <Text style={styles.triggerButtonText}>
                  {triggerPrompt.isPending ? t('common.loading') : t('today.getTodaysPrompt')}
                </Text>
              </TouchableOpacity>
            )}
          </Animated.View>

          {FEATURES.streaks && (currentStreak > 0 || monthCompletedCount > 0) && (
            <Animated.View entering={FadeInUp.duration(500).delay(400)} style={styles.streakSection}>
              <StreakRing
                currentStreak={currentStreak}
                days={monthDays}
                completedCount={monthCompletedCount}
                isStreakActive={isStreakActive}
                month={month}
                year={year}
                startDayOffset={startDayOffset}
              />
            </Animated.View>
          )}

          <TodayBottomSections {...bottomProps} animationBaseDelay={600} />
        </ScrollView>
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
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#D4522A" />}
        >
          <TodayScreenHeader greeting={t('today.niceOne')} {...headerProps} />

          {showStagePrompt && (
            <RelationshipStagePrompt onSelectStage={handleSetStage} onDismiss={handleDismissStage} />
          )}

          <EngagementCards {...engagementProps} />

          <Animated.View entering={FadeInUp.duration(500).delay(200)} style={styles.waitingCard}>
            <View style={styles.accentBar} />
            <Text style={styles.waitingPrompt}>
              {'\u201C'}{assignment!.promptText}{'\u201D'}
            </Text>

            <Animated.View entering={FadeIn.duration(400)} style={styles.sealedCard}>
              <Icon name="lock" size="md" color="#D4522A" weight="light" />
              <Text style={styles.sealedTitle}>Your answer is saved</Text>
              <Text style={styles.sealedSubtitle}>
                Waiting for {partnerName ?? 'your partner'}...
              </Text>
            </Animated.View>

            <View style={styles.waitingDivider} />

            {isPartnerTyping && partnerTypingContext === 'prompt' ? (
              <Animated.View entering={FadeIn.duration(300)} style={styles.typingRow}>
                <PulsingDots color="#D4522A" size={5} />
                <Text style={styles.typingText}>{t('today.isResponding', { name: partnerName })}</Text>
              </Animated.View>
            ) : (
              <View style={styles.waitingMessageRow}>
                <Icon name="hourglass" size={16} color="#B8B8C4" />
                <Text style={styles.waitingMessage}>{t('today.waitingFor', { name: partnerName })}</Text>
              </View>
            )}
          </Animated.View>

          <TodayBottomSections {...bottomProps} animationBaseDelay={400} />
        </ScrollView>
        <ConversationStarterModal
          visible={showConversationModal}
          onClose={() => setShowConversationModal(false)}
          starterText={conversationStarterText}
        />
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
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#D4522A" />}
        >
          <TodayScreenHeader greeting={t('today.beautiful')} {...headerProps} />

          {showStagePrompt && (
            <RelationshipStagePrompt onSelectStage={handleSetStage} onDismiss={handleDismissStage} />
          )}

          <Animated.View entering={FadeInUp.duration(500).delay(200)} style={styles.completionSection}>
            <CompletionMoment
              promptText={assignment!.promptText}
              yourResponse={myResponse!.responseText}
              partnerResponse={partnerResponse?.responseText || ''}
              partnerName={partnerName}
              yourImageUrl={myResponse!.imageUrl}
              partnerImageUrl={partnerResponse?.imageUrl}
              myReaction={todayData?.reactions?.[user!.id] as ReactionType | undefined ?? null}
              partnerReaction={
                todayData?.reactions
                  ? (Object.entries(todayData.reactions).find(([k]) => k !== user!.id)?.[1] as ReactionType | undefined ?? null)
                  : null
              }
              onReact={(r) => reaction.mutate({
                assignmentId: assignment!.id,
                reaction: r,
                promptType: assignment!.promptType,
              })}
              yourScore={isScalePrompt ? myResponse!.responseScore : null}
              partnerScore={isScalePrompt ? partnerResponse?.responseScore ?? null : null}
              showMidScaleLine={
                isScalePrompt &&
                isMiddleScaleOutcome(
                  myResponse!.responseScore,
                  partnerResponse?.responseScore,
                  assignment!.scaleConfig
                )
              }
              closingText={isFollowUp ? assignment!.closingText : null}
            />
          </Animated.View>

          <EngagementCards {...engagementProps} />

          {/* Emotional Feedback */}
          {myResponse && !feedbackGiven && (
            <Animated.View entering={FadeInUp.duration(400).delay(500)} style={styles.feedbackCard}>
              <View style={styles.accentBar} />
              <Text style={styles.feedbackTitle}>{t('today.howDidThisFeel')}</Text>
              <View style={styles.feedbackRow}>
                {([
                  { value: 'positive' as const, label: t('today.warm'), icon: <Icon name="sun-dim" size="md" /> },
                  { value: 'neutral' as const, label: t('today.okay'), icon: <Icon name="cloud" size="md" /> },
                  { value: 'negative' as const, label: t('today.hard'), icon: <Icon name="cloud-rain" size="md" /> },
                ]).map((option) => (
                  <AnimatedFeedbackButton
                    key={option.value}
                    option={option}
                    style={styles.feedbackOption}
                    isSelected={false}
                    onPress={() => {
                      hapticImpact();
                      submitFeedback.mutate({
                        responseId: myResponse.id,
                        emotionalResponse: option.value,
                      });
                      setFeedbackGiven(true);
                    }}
                  />
                ))}
              </View>
            </Animated.View>
          )}

          {feedbackGiven && (
            <Animated.View entering={FadeIn.duration(400)}>
              <Text style={styles.feedbackThanks}>{t('today.thanksForSharing')}</Text>
            </Animated.View>
          )}

          {/* Streak celebration */}
          {FEATURES.streaks && currentStreak > 0 && (
            <Animated.View entering={FadeInUp.duration(500).delay(700)}>
              <TouchableOpacity
                style={styles.streakCelebration}
                onPress={() => setShowStreakDetail(!showStreakDetail)}
                activeOpacity={0.8}
              >
                <Icon name="flame" size="md" color="#D4522A" weight="fill" />
                <Text style={styles.streakCelebrationText}>
                  {currentStreak === 1 ? t('today.streakStarted') : t('today.dayStreak', { count: currentStreak })}
                </Text>
              </TouchableOpacity>
            </Animated.View>
          )}

          {FEATURES.streaks && showStreakDetail && (
            <Animated.View entering={FadeInDown.duration(400)} style={styles.streakDetailSection}>
              <StreakRing
                currentStreak={currentStreak}
                days={monthDays}
                completedCount={monthCompletedCount}
                isStreakActive={isStreakActive}
                month={month}
                year={year}
                startDayOffset={startDayOffset}
                celebrate
              />
            </Animated.View>
          )}

          <TodayBottomSections {...bottomProps} animationBaseDelay={800} />

          <Animated.View entering={FadeIn.duration(400).delay(1300)}>
            <View style={styles.doneRow}>
              <View style={styles.doneDot} />
              <Text style={styles.doneText}>{t('today.seeYouTomorrow')}</Text>
              <View style={styles.doneDot} />
            </View>
          </Animated.View>
        </ScrollView>
        <ConversationStarterModal
          visible={showConversationModal}
          onClose={() => setShowConversationModal(false)}
          starterText={conversationStarterText}
        />
      </SafeAreaView>
    );
  }

  // ─── Default: Show prompt ───
  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        <Animated.View entering={FadeIn.duration(400)}>
          <TodayScreenHeader greeting={getGreeting(t)} {...headerProps} />
        </Animated.View>

        {showStagePrompt && (
          <RelationshipStagePrompt onSelectStage={handleSetStage} onDismiss={handleDismissStage} />
        )}

        {FEATURES.engines && (
          <Animated.View entering={FadeInUp.duration(500).delay(150)}>
            <TouchableOpacity
              style={styles.sparkCard}
              onPress={() => router.push('/(app)/todays-spark')}
              activeOpacity={0.8}
            >
              <View style={styles.sparkAccent} />
              <View style={styles.sparkContent}>
                <Icon name="sparkle" size="sm" color="#D4522A" weight="fill" />
                <View style={styles.sparkTextWrap}>
                  <Text style={styles.sparkTitle}>Today's Spark</Text>
                  <Text style={styles.sparkSubtitle}>A quick moment to connect</Text>
                </View>
                <Icon name="arrow-right" size="sm" color="#B8B8C4" />
              </View>
            </TouchableOpacity>
          </Animated.View>
        )}

        <Animated.View entering={FadeInUp.duration(600).delay(300)} style={styles.promptSection}>
          {isFollowUp && assignment!.followUp && (
            <FollowUpContextLine branch={assignment!.followUp.branch} />
          )}
          {isScalePrompt ? (
            <ScalePromptCard
              promptText={assignment!.promptText}
              scaleConfig={assignment!.scaleConfig}
              value={scaleValue}
              onChangeValue={setScaleValue}
              note={scaleNote}
              onChangeNote={setScaleNote}
              onSubmit={handleScaleSubmit}
              isPending={submitResponse.isPending}
            />
          ) : (
            <PromptCard
              promptText={assignment!.promptText}
              promptHint={assignment!.promptHint}
              promptType={assignment!.promptType}
              onRespond={handleRespond}
            />
          )}
          {isFollowUp && (
            <FollowUpSkip onSkip={handleSkipFollowUp} disabled={skipFollowUp.isPending} />
          )}
        </Animated.View>

        <EngagementCards {...engagementProps} />
      </ScrollView>
      <ConversationStarterModal
        visible={showConversationModal}
        onClose={() => setShowConversationModal(false)}
        starterText={conversationStarterText}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F2EE',
  },
  accentBar: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 3,
    backgroundColor: '#D4522A',
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
  // ─── Spark card ───
  sparkCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: 16,
    shadowColor: '#1E1E2E',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  sparkAccent: {
    height: 3,
    backgroundColor: '#D4522A',
  },
  sparkContent: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    gap: 12,
  },
  sparkTextWrap: {
    flex: 1,
  },
  sparkTitle: {
    fontSize: 15,
    fontWeight: '900',
    fontFamily: 'Nunito-Black',
    color: '#1E1E2E',
    letterSpacing: -0.3,
  },
  sparkSubtitle: {
    fontSize: 13,
    fontFamily: 'Nunito-Regular',
    color: '#6B6B7A',
    marginTop: 2,
  },
  // ─── Loading greeting (no logo) ───
  greetingRow: {
    marginBottom: 8,
  },
  greeting: {
    fontSize: 28,
    fontWeight: '900',
    color: '#1E1E2E',
    letterSpacing: -0.5,
    fontFamily: 'Nunito-Black',
  },
  dateText: {
    fontSize: 15,
    color: '#6B6B7A',
    marginTop: 2,
    fontFamily: 'Nunito-Regular',
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
    overflow: 'hidden',
    shadowColor: '#1E1E2E',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 1,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '900',
    color: '#292524',
    marginBottom: 8,
    textAlign: 'center',
    fontFamily: 'Nunito-Black',
  },
  emptySubtitle: {
    fontSize: 15,
    color: '#6B6B7A',
    textAlign: 'center',
    lineHeight: 22,
    fontFamily: 'Nunito-Regular',
  },
  triggerButton: {
    marginTop: 24,
    paddingVertical: 14,
    paddingHorizontal: 28,
    backgroundColor: 'transparent',
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: '#D4522A',
  },
  triggerButtonText: {
    color: '#D4522A',
    fontWeight: '600',
    fontSize: 16,
    fontFamily: 'Nunito-Bold',
  },
  disabled: {
    opacity: 0.5,
  },
  streakSection: {
    marginTop: 24,
  },
  // ─── Waiting ───
  waitingCard: {
    marginTop: 20,
    backgroundColor: '#ffffff',
    borderRadius: 20,
    padding: 24,
    overflow: 'hidden',
    shadowColor: '#1E1E2E',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 1,
  },
  waitingPrompt: {
    fontSize: 16,
    color: '#6B6B7A',
    fontStyle: 'italic',
    textAlign: 'center',
    marginBottom: 20,
    lineHeight: 24,
    fontFamily: 'Nunito-Regular',
  },
  sealedCard: {
    backgroundColor: '#FDF1ED',
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    gap: 8,
    marginBottom: 16,
  },
  sealedTitle: {
    fontSize: 15,
    fontWeight: '900',
    color: '#1E1E2E',
    fontFamily: 'Nunito-Black',
  },
  sealedSubtitle: {
    fontSize: 13,
    color: '#B8B8C4',
    fontFamily: 'Nunito-Regular',
  },
  waitingDivider: {
    height: 1,
    backgroundColor: '#E2DED8',
    marginVertical: 20,
  },
  typingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  typingText: {
    color: '#D4522A',
    fontStyle: 'italic',
    fontSize: 14,
    fontFamily: 'Nunito-Regular',
  },
  waitingMessageRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  waitingMessage: {
    color: '#6B6B7A',
    fontSize: 14,
    fontFamily: 'Nunito-Regular',
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
    overflow: 'hidden',
    shadowColor: '#1E1E2E',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 1,
  },
  feedbackTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#6B6B7A',
    marginBottom: 16,
    fontFamily: 'Nunito-SemiBold',
  },
  feedbackRow: {
    flexDirection: 'row',
    gap: 12,
  },
  feedbackOption: {
    paddingVertical: 12,
    paddingHorizontal: 20,
    backgroundColor: '#F5F2EE',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E2DED8',
    alignItems: 'center',
    gap: 4,
  },
  feedbackIconWrap: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  feedbackOptionText: {
    fontSize: 13,
    color: '#6B6B7A',
    fontWeight: '500',
    fontFamily: 'Nunito-SemiBold',
  },
  feedbackThanks: {
    marginTop: 16,
    fontSize: 14,
    color: '#B8B8C4',
    textAlign: 'center',
    fontFamily: 'Nunito-Regular',
  },
  streakCelebration: {
    marginTop: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FDF1ED',
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 16,
    gap: 8,
    alignSelf: 'center',
  },
  streakCelebrationText: {
    fontSize: 17,
    fontWeight: '600',
    color: '#D4522A',
    fontFamily: 'Nunito-Bold',
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
    color: '#B8B8C4',
    fontSize: 14,
    fontWeight: '400',
    fontFamily: 'Nunito-Regular',
  },
});
