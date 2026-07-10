import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  RefreshControl,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native';
import { router } from 'expo-router';
import { pickImage } from '@/services/imageUpload';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '@/config/firebase';
import Animated, {
  FadeIn,
  FadeInUp,
  FadeInDown,
  FadeOut,
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  withSequence,
  withRepeat,
  cancelAnimation,
  Easing,
  ReduceMotion,
} from 'react-native-reanimated';
import {
  hapticImpact,
  hapticNotification,
  ImpactFeedbackStyle,
  NotificationFeedbackType,
} from '@utils/haptics';
import { SafeAreaView } from 'react-native-safe-area-context';
import { format } from 'date-fns';
import {
  AccentBar,
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
  SafetyResources,
  ScalePromptCard,
  FollowUpContextLine,
  FollowUpSkip,
  FollowUpLockedCard,
  getFollowUpContextLine,
  PartnerQuestionCard,
  Paywall,
} from '@components';
import type { RelationshipStage } from '@components';
import { StreakRing } from '@/components/StreakRing';
import { usePresence } from '@/hooks/usePresence';
import { useAuth } from '@/hooks/useAuth';
import { useTodayPrompt, useSubmitResponse, useSubmitFeedback, useTriggerPrompt, useSkipFollowUp } from '@/hooks/usePrompt';
import { usePersonalize } from '@/hooks/usePersonalize';
import { useExploreAssignments, pendingPartnerQuestions } from '@/hooks/useExplorePrompts';
import { isMiddleScaleOutcome } from '@/utils/scale';
import {
  isSameSessionDeepener,
  deepenerEntranceDelay,
  shouldOfferStagePrompt,
} from '@/utils/revealGate';
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
import { PromptCardSkeleton } from '@/components/Skeleton';
import { UnpairedTodayCard } from '@/components/UnpairedTodayCard';
import { NotificationPrePrompt } from '@/components/NotificationPrePrompt';
import { useNotificationPrePrompt } from '@/hooks/useNotificationPrePrompt';
import { logger } from '@/utils/logger';
import { premiumGates } from '@/utils/premiumGates';
import { colors, radius, shadow, spacing, typography } from '@config/theme';
import { FEATURES } from '@/config/features';
import { useTranslation } from 'react-i18next';

const STAGE_PROMPT_DISMISSED_KEY = 'stage_prompt_dismissed';
const STAGE_PROMPT_VIEW_COUNT_KEY = 'stage_prompt_view_count';
/** Wait for the keyboard show animation before scrolling the note into view. */
const KEYBOARD_SETTLE_MS = 250;
/** How much of the scale card's tail (note + CTA) to keep above the keyboard. */
const SCALE_CARD_TAIL_PX = 320;

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
        accessibilityRole="button"
        accessibilityLabel={option.label}
        accessibilityState={{ selected: isSelected }}
      >
        <View style={styles.feedbackIconWrap}>{option.icon}</View>
        <Text style={styles.feedbackOptionText}>{option.label}</Text>
      </TouchableOpacity>
    </Animated.View>
  );
}

/** Quiet breathing loop on the sealed-card lock while waiting for the partner. */
function BreathingLockIcon() {
  const scale = useSharedValue(1);

  useEffect(() => {
    scale.value = withRepeat(
      withSequence(
        withTiming(1.06, {
          duration: 1600,
          easing: Easing.inOut(Easing.ease),
          reduceMotion: ReduceMotion.System,
        }),
        withTiming(1, {
          duration: 1600,
          easing: Easing.inOut(Easing.ease),
          reduceMotion: ReduceMotion.System,
        })
      ),
      -1,
      false,
      undefined,
      ReduceMotion.System
    );
    return () => {
      cancelAnimation(scale);
    };
  }, [scale]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <Animated.View style={animatedStyle}>
      <Icon name="lock" size="md" color={colors.accent.primary} weight="light" />
    </Animated.View>
  );
}

type TodayData = NonNullable<ReturnType<typeof useTodayPrompt>['data']>;
type TodayAssignment = NonNullable<TodayData['assignment']>;
type TodayResponse = TodayData['myResponse'];

/** Snapshot of a just-completed scored reveal, held while its deepener arrives. */
interface HeldReveal {
  assignment: TodayAssignment;
  myResponse: NonNullable<TodayResponse>;
  partnerResponse: TodayResponse;
  reactions: TodayData['reactions'];
  mountedAt: number;
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
  const { isPremium, isLoading: premiumLoading } = useSubscription();
  const { t } = useTranslation();

  const skipFollowUp = useSkipFollowUp();
  const prePrompt = useNotificationPrePrompt(user?.id);
  const { data: exploreAssignments } = useExploreAssignments();
  // Renders {partner}/{me} tokens with real first names at display time only —
  // canonical tokenized text stays in Firestore and in every write path.
  const personalize = usePersonalize();

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
  // Safety off-ramp: set once per submission whose text matched the safety
  // lexicon; dismissing it is the end of it — no re-show, no follow-up.
  const [showSafetyResources, setShowSafetyResources] = useState(false);
  // Premium gate (SEV-0 #8): the daily loop is always free; the follow-up
  // QUESTION is premium. Opened from the locked follow-up card only.
  const [showPaywall, setShowPaywall] = useState(false);

  // Stage prompt is offered at most 3 times before it quietly stops asking.
  useEffect(() => {
    (async () => {
      try {
        const [dismissed, countRaw] = await Promise.all([
          AsyncStorage.getItem(STAGE_PROMPT_DISMISSED_KEY),
          AsyncStorage.getItem(STAGE_PROMPT_VIEW_COUNT_KEY),
        ]);
        const viewCount = Number.parseInt(countRaw ?? '0', 10) || 0;
        if (shouldOfferStagePrompt(dismissed === 'true', viewCount)) {
          setStageDismissed(false);
          await AsyncStorage.setItem(STAGE_PROMPT_VIEW_COUNT_KEY, String(viewCount + 1));
        }
      } catch {
        // Storage failure — keep the stage prompt hidden; it is optional
      }
    })();
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
    AsyncStorage.setItem(STAGE_PROMPT_DISMISSED_KEY, 'true');
  };

  const handleDismissStage = () => {
    setStageDismissed(true);
    AsyncStorage.setItem(STAGE_PROMPT_DISMISSED_KEY, 'true');
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
  // Follow-up gate: context stays visible, the question locks (never the
  // daily prompt — dailyPromptLocked is hard-wired false in premiumGates).
  const gates = premiumGates({
    gatesEnabled: FEATURES.premiumGates,
    isPremium,
    isPremiumLoading: premiumLoading,
  });
  const followUpLocked = isFollowUp && gates.followUpLocked;

  // ─── Reveal dwell gate (P0) ───
  // When both partners answer a scored prompt, the server immediately creates
  // the deepener follow-up; its snapshot swap used to unmount the reveal before
  // the couple dwelled on it. Hold the completed reveal on screen and let the
  // deepener land BELOW it as its own card. Next-day follow-ups are unaffected
  // (no reveal is held across sessions).
  const heldRevealRef = useRef<HeldReveal | null>(null);
  const heldReveal = heldRevealRef.current;
  const deepenerHold =
    !isLoading &&
    !error &&
    !!assignment &&
    !myResponse &&
    heldReveal != null &&
    isSameSessionDeepener(assignment, heldReveal.assignment.id);

  type Mode = 'loading' | 'error' | 'no-prompt' | 'prompt' | 'responding' | 'waiting' | 'complete';

  let mode: Mode;
  if (isLoading) {
    mode = 'loading';
  } else if (error) {
    mode = 'error';
  } else if (!assignment) {
    mode = 'no-prompt';
  } else if (isResponding) {
    mode = 'responding';
  } else if (!myResponse) {
    // Keep the just-completed reveal mounted while its same-session deepener
    // arrives — the deepener renders below the CompletionMoment instead.
    mode = deepenerHold ? 'complete' : 'prompt';
  } else if (!isComplete) {
    mode = 'waiting';
  } else {
    mode = 'complete';
  }

  // What the completion reveal shows: the live completed assignment, or the
  // held one while the deepener is on screen underneath it.
  const revealAssignment = deepenerHold && heldReveal ? heldReveal.assignment : assignment;
  const revealMyResponse = deepenerHold && heldReveal ? heldReveal.myResponse : myResponse;
  const revealPartnerResponse = deepenerHold && heldReveal ? heldReveal.partnerResponse : partnerResponse;
  const revealReactions = deepenerHold && heldReveal ? heldReveal.reactions : todayData?.reactions ?? null;
  const isRevealScale = revealAssignment?.responseFormat === 'scale';
  const isRevealFollowUp = revealAssignment?.assignmentKind === 'follow_up';

  // Capture the completed scored reveal (deepener parents are always scored)
  useEffect(() => {
    if (mode === 'complete' && !deepenerHold && assignment && myResponse && isScalePrompt) {
      const prev = heldRevealRef.current;
      heldRevealRef.current = {
        assignment,
        myResponse,
        partnerResponse,
        reactions: todayData?.reactions ?? null,
        // Keep the original reveal mount time across snapshot refreshes
        mountedAt: prev?.assignment.id === assignment.id ? prev.mountedAt : Date.now(),
      };
    }
  }, [mode, deepenerHold, assignment, myResponse, partnerResponse, todayData?.reactions, isScalePrompt]);

  // The deepener card never lands earlier than ~2.6s after the reveal mounted;
  // compute its entrance delay once per deepener assignment.
  const deepenerEntranceRef = useRef<{ id: string; delay: number } | null>(null);
  if (deepenerHold && assignment && deepenerEntranceRef.current?.id !== assignment.id) {
    deepenerEntranceRef.current = {
      id: assignment.id,
      delay: heldReveal ? deepenerEntranceDelay(heldReveal.mountedAt, Date.now()) : 0,
    };
  }

  // Light haptic as the deepener card lands
  const deepenerHapticFiredRef = useRef<string | null>(null);
  const deepenerId = deepenerHold && assignment ? assignment.id : null;
  useEffect(() => {
    if (!deepenerId || deepenerHapticFiredRef.current === deepenerId) return;
    const delay = deepenerEntranceRef.current?.delay ?? 0;
    const timer = setTimeout(() => {
      deepenerHapticFiredRef.current = deepenerId;
      hapticImpact(ImpactFeedbackStyle.Light);
    }, delay);
    return () => clearTimeout(timer);
  }, [deepenerId]);

  // Auto-fetch today's prompt when the local-date window has no live daily
  // assignment (and nothing already completed for today). Keyed off the
  // snapshot-derived flag rather than mode: a leftover completed doc from
  // yesterday can render as a reveal while today's prompt is still missing.
  const hasAutoTriggered = useRef(false);
  const needsDelivery = todayData?.needsDailyDelivery ?? false;
  useEffect(() => {
    if (
      needsDelivery &&
      !isLoading &&
      !error &&
      user?.coupleId &&
      !triggerPrompt.isPending &&
      !hasAutoTriggered.current
    ) {
      hasAutoTriggered.current = true;
      triggerPrompt.mutate();
    }
  }, [needsDelivery, isLoading, error, user?.coupleId, triggerPrompt.isPending]);

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

  // The reveal is the second (and last) chance to offer the push pre-prompt —
  // the value of "know when they answer" is most concrete right here.
  // Gating lives in useNotificationPrePrompt (undetermined permission only,
  // once per session, two lifetime exposures, never after the system dialog).
  useEffect(() => {
    if (mode === 'complete') {
      prePrompt.offer('reveal');
    }
  }, [mode, prePrompt.offer]); // eslint-disable-line react-hooks/exhaustive-deps

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
      promptText: personalize(assignment?.promptText || ''),
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
      const result = await submitResponse.mutateAsync({
        assignmentId: assignment.id,
        responseText,
        imageUri,
      });
      setIsResponding(false);
      setSelectedImage(null);
      if (result.safetyMatch) {
        setShowSafetyResources(true);
      } else {
        // First-submission seam: offer the push pre-prompt (gated internally).
        // Skipped when safety resources are up — never stack over that moment.
        prePrompt.offer('first_submit');
      }
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
    hapticImpact(ImpactFeedbackStyle.Medium);
    Keyboard.dismiss();
    try {
      const result = await submitResponse.mutateAsync({
        assignmentId: assignment.id,
        responseText: scaleNote.trim(),
        responseScore: scaleValue,
      });
      // Success only once the write actually lands
      hapticNotification(NotificationFeedbackType.Success);
      if (result.safetyMatch) {
        setShowSafetyResources(true);
      } else {
        prePrompt.offer('first_submit');
      }
    } catch (err) {
      logger.error('Error submitting score:', err);
      Alert.alert('Could not save your response', 'Please check your connection and try again.');
    }
  };

  // Keyboard handling for the scale note field: the KeyboardAvoidingView
  // shrinks the viewport, and these scroll the note + CTA above the keyboard.
  const promptScrollRef = useRef<ScrollView>(null);
  const completeScrollRef = useRef<ScrollView>(null);
  const deepenerLayoutRef = useRef({ y: 0, height: 0 });

  const handlePromptNoteFocus = () => {
    setTimeout(() => {
      promptScrollRef.current?.scrollToEnd({ animated: true });
    }, KEYBOARD_SETTLE_MS);
  };

  const handleDeepenerNoteFocus = () => {
    setTimeout(() => {
      const { y, height } = deepenerLayoutRef.current;
      completeScrollRef.current?.scrollTo({
        y: y + Math.max(0, height - SCALE_CARD_TAIL_PX),
        animated: true,
      });
    }, KEYBOARD_SETTLE_MS);
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

  // The stage prompt is quiet by design: it renders BELOW the day's main card
  // (prompt, reveal, waiting, or empty state), never above it.
  const stagePromptCard = showStagePrompt ? (
    <View style={styles.stagePromptSection}>
      <RelationshipStagePrompt onSelectStage={handleSetStage} onDismiss={handleDismissStage} />
    </View>
  ) : null;

  // Explore questions the partner answered that are waiting on you — a quiet
  // discovery card below the day's main card. Tapping a single question opens
  // its respond flow on the explore tab; multiple land on the tab itself.
  const partnerQuestions = pendingPartnerQuestions(exploreAssignments, user?.id);
  const partnerQuestionCard = partnerQuestions.length > 0 ? (
    <PartnerQuestionCard
      partnerName={partnerName}
      promptText={personalize(partnerQuestions[0].promptText)}
      questionCount={partnerQuestions.length}
      onPress={() => {
        hapticImpact(ImpactFeedbackStyle.Light);
        if (partnerQuestions.length === 1) {
          router.push({
            pathname: '/(app)/explore',
            params: { assignmentId: partnerQuestions[0].id },
          });
        } else {
          router.push('/(app)/explore');
        }
      }}
    />
  ) : null;

  // ─── Responding (full-screen editor, outside the crossfade wrapper) ───
  if (mode === 'responding') {
    return (
      <>
        <RespondingScreen
          promptText={personalize(assignment!.promptText)}
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
        <SafetyResources
          visible={showSafetyResources}
          onClose={() => setShowSafetyResources(false)}
        />
      </>
    );
  }

  // ─── Per-mode content (rendered inside the shared crossfade wrapper) ───

  const renderLoading = () => (
    <View style={styles.scrollView}>
      <View style={styles.greetingRow}>
        <Text style={styles.greeting}>{getGreeting(t)}</Text>
        <Text style={styles.dateText}>{format(new Date(), 'EEEE, MMMM d')}</Text>
      </View>
      <View style={styles.promptSection}>
        <PromptCardSkeleton />
      </View>
    </View>
  );

  // Error keeps the shell — header stays, tabs stay, just a quiet card
  const renderError = () => (
    <ScrollView
      style={styles.scrollView}
      contentContainerStyle={styles.scrollContent}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.accent.primary} />}
    >
      <TodayScreenHeader greeting={getGreeting(t)} {...headerProps} />

      <Animated.View entering={FadeInUp.duration(500).delay(200)} style={styles.emptyCard}>
        <AccentBar />
        <Icon name="cloud" size="xl" color={colors.text.muted} weight="light" />
        <Text style={styles.emptyTitle}>{t('today.errorLoading')}</Text>
        <TouchableOpacity
          style={styles.triggerButton}
          onPress={() => refetch()}
          activeOpacity={0.8}
          accessibilityRole="button"
          accessibilityLabel={t('today.retry')}
        >
          <Text style={styles.triggerButtonText} maxFontSizeMultiplier={1.4}>
            {t('today.retry')}
          </Text>
        </TouchableOpacity>
      </Animated.View>
    </ScrollView>
  );

  // No couple yet — daily delivery needs a partner, so say so and offer the fix
  const renderUnpaired = () => (
    <ScrollView
      style={styles.scrollView}
      contentContainerStyle={styles.scrollContent}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.accent.primary} />}
    >
      <TodayScreenHeader greeting={getGreeting(t)} {...headerProps} />
      <UnpairedTodayCard
        onInvite={() => router.push('/(onboarding)/invite-partner')}
        onBrowse={() => router.push('/(app)/explore')}
      />
    </ScrollView>
  );

  const renderNoPrompt = () => (
    <ScrollView
      style={styles.scrollView}
      contentContainerStyle={styles.scrollContent}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.accent.primary} />}
    >
      <TodayScreenHeader greeting={getGreeting(t)} {...headerProps} />

      <Animated.View entering={FadeInUp.duration(500).delay(200)} style={styles.emptyCard}>
        <AccentBar />
        <Icon name="coffee" size="xl" color={colors.accent.primary} weight="light" />
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
            <Text style={styles.triggerButtonText} maxFontSizeMultiplier={1.4}>
              {triggerPrompt.isPending ? t('common.loading') : t('today.getTodaysPrompt')}
            </Text>
          </TouchableOpacity>
        )}
      </Animated.View>

      {partnerQuestionCard}

      {stagePromptCard}

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
  );

  // The partner set today's follow-up aside (server-visible skip) — show the
  // truth instead of an indefinite "we'll let you know" waiting line.
  const partnerSetAside =
    assignment?.assignmentKind === 'follow_up' &&
    (assignment.skippedBy ?? []).some((id) => id !== user?.id);

  const renderWaiting = () => (
    <ScrollView
      style={styles.scrollView}
      contentContainerStyle={styles.scrollContent}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.accent.primary} />}
    >
      <TodayScreenHeader greeting={t('today.niceOne')} {...headerProps} />

      <EngagementCards {...engagementProps} />

      <Animated.View entering={FadeInUp.duration(500).delay(200)} style={styles.waitingCard}>
        <AccentBar />
        <Text style={styles.waitingPrompt}>
          {'“'}{personalize(assignment!.promptText)}{'”'}
        </Text>

        <Animated.View entering={FadeIn.duration(400)} style={styles.sealedCard}>
          <BreathingLockIcon />
          <Text style={styles.sealedTitle}>{t('today.answerSaved')}</Text>
          <Text style={styles.sealedSubtitle}>
            {todayData?.isMyResponseOffline
              ? t('today.savedOffline')
              : t('today.sealedUntil', { name: partnerName ?? 'your partner' })}
          </Text>
        </Animated.View>

        <View style={styles.waitingDivider} />

        {partnerSetAside ? (
          <Animated.View
            entering={FadeIn.duration(300)}
            style={styles.waitingMessageRow}
          >
            <Icon name="hourglass" size={16} color={colors.text.muted} />
            <Text style={styles.waitingMessage}>
              {t('today.partnerSetAside', { name: partnerName ?? t('explore.partnerFallback') })}
            </Text>
          </Animated.View>
        ) : isPartnerTyping && partnerTypingContext === 'prompt' ? (
          <Animated.View
            entering={FadeIn.duration(300)}
            exiting={FadeOut.duration(200)}
            style={styles.typingRow}
          >
            <PulsingDots color={colors.accent.primary} size={5} />
            <Text style={styles.typingText}>{t('today.isResponding', { name: partnerName })}</Text>
          </Animated.View>
        ) : (
          <Animated.View
            entering={FadeIn.duration(300)}
            exiting={FadeOut.duration(200)}
            style={styles.waitingMessageRow}
          >
            <Icon name="hourglass" size={16} color={colors.text.muted} />
            <Text style={styles.waitingMessage}>{t('today.notifyWhenAnswered')}</Text>
          </Animated.View>
        )}
      </Animated.View>

      {partnerQuestionCard}

      {stagePromptCard}

      <TodayBottomSections {...bottomProps} animationBaseDelay={400} />
    </ScrollView>
  );

  const renderComplete = () => (
    <ScrollView
      ref={completeScrollRef}
      style={styles.scrollView}
      contentContainerStyle={styles.scrollContent}
      keyboardShouldPersistTaps="handled"
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.accent.primary} />}
    >
      <TodayScreenHeader greeting={t('today.beautiful')} {...headerProps} />

      <Animated.View entering={FadeInUp.duration(500).delay(200)} style={styles.completionSection}>
        <CompletionMoment
          key={revealAssignment!.id}
          assignmentId={revealAssignment!.id}
          promptText={personalize(revealAssignment!.promptText)}
          yourResponse={revealMyResponse!.responseText}
          partnerResponse={revealPartnerResponse?.responseText || ''}
          partnerName={partnerName}
          yourImageUrl={revealMyResponse!.imageUrl}
          partnerImageUrl={revealPartnerResponse?.imageUrl}
          myReaction={revealReactions?.[user!.id] as ReactionType | undefined ?? null}
          partnerReaction={
            revealReactions
              ? (Object.entries(revealReactions).find(([k]) => k !== user!.id)?.[1] as ReactionType | undefined ?? null)
              : null
          }
          onReact={(r) => reaction.mutate({
            assignmentId: revealAssignment!.id,
            reaction: r,
            promptType: revealAssignment!.promptType,
          })}
          yourScore={isRevealScale ? revealMyResponse!.responseScore : null}
          partnerScore={isRevealScale ? revealPartnerResponse?.responseScore ?? null : null}
          showMidScaleLine={
            isRevealScale &&
            isMiddleScaleOutcome(
              revealMyResponse!.responseScore,
              revealPartnerResponse?.responseScore,
              revealAssignment!.scaleConfig
            )
          }
          closingText={
            isRevealFollowUp && revealAssignment!.closingText
              ? personalize(revealAssignment!.closingText)
              : null
          }
        />
      </Animated.View>

      {/* Same-session deepener lands quietly below the reveal — the couple keeps
          dwelling on the moment, then answers the follow-up from this card. */}
      {deepenerHold && assignment && (
        <Animated.View
          key={`deepener-${assignment.id}`}
          entering={FadeInUp.duration(500)
            .delay(deepenerEntranceRef.current?.delay ?? 0)
            .springify()}
          style={styles.promptSection}
          onLayout={(e) => {
            deepenerLayoutRef.current = {
              y: e.nativeEvent.layout.y,
              height: e.nativeEvent.layout.height,
            };
          }}
        >
          {gates.followUpLocked ? (
            // Same-session deepener, free couple: the reveal above stays,
            // the follow-up lands locked. Skipping stays free below.
            <FollowUpLockedCard
              branch={assignment.followUp?.branch}
              promptText={personalize(assignment.promptText)}
              onSeePremium={() => setShowPaywall(true)}
            />
          ) : (
            <>
              {assignment.followUp && (
                <FollowUpContextLine branch={assignment.followUp.branch} />
              )}
              {isScalePrompt ? (
                <ScalePromptCard
                  promptText={personalize(assignment.promptText)}
                  scaleConfig={assignment.scaleConfig}
                  value={scaleValue}
                  onChangeValue={setScaleValue}
                  note={scaleNote}
                  onChangeNote={setScaleNote}
                  onNoteFocus={handleDeepenerNoteFocus}
                  onSubmit={handleScaleSubmit}
                  isPending={submitResponse.isPending}
                />
              ) : (
                <PromptCard
                  promptText={personalize(assignment.promptText)}
                  promptHint={assignment.promptHint && personalize(assignment.promptHint)}
                  promptType={assignment.promptType}
                  onRespond={handleRespond}
                />
              )}
            </>
          )}
          <FollowUpSkip onSkip={handleSkipFollowUp} disabled={skipFollowUp.isPending} />
        </Animated.View>
      )}

      {partnerQuestionCard}

      {stagePromptCard}

      <EngagementCards {...engagementProps} />

      {/* Emotional Feedback */}
      {revealMyResponse && !feedbackGiven && (
        <Animated.View entering={FadeInUp.duration(400).delay(500)} style={styles.feedbackCard}>
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
                    responseId: revealMyResponse.id,
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
            <Icon name="flame" size="md" color={colors.accent.primary} weight="fill" />
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
  );

  const renderPrompt = () => (
    <ScrollView
      ref={promptScrollRef}
      style={styles.scrollView}
      contentContainerStyle={styles.scrollContent}
      keyboardShouldPersistTaps="handled"
    >
      <Animated.View entering={FadeIn.duration(400)}>
        <TodayScreenHeader greeting={getGreeting(t)} {...headerProps} />
      </Animated.View>

      {FEATURES.engines && (
        <Animated.View entering={FadeInUp.duration(500).delay(150)}>
          <TouchableOpacity
            style={styles.sparkCard}
            onPress={() => router.push('/(app)/todays-spark')}
            activeOpacity={0.8}
          >
            <View style={styles.sparkAccent} />
            <View style={styles.sparkContent}>
              <Icon name="sparkle" size="sm" color={colors.accent.primary} weight="fill" />
              <View style={styles.sparkTextWrap}>
                <Text style={styles.sparkTitle}>Today's Spark</Text>
                <Text style={styles.sparkSubtitle}>A quick moment to connect</Text>
              </View>
              <Icon name="arrow-right" size="sm" color={colors.text.muted} />
            </View>
          </TouchableOpacity>
        </Animated.View>
      )}

      <Animated.View entering={FadeInUp.duration(600).delay(300)} style={styles.promptSection}>
        {followUpLocked ? (
          // Locked follow-up (free couple, premiumGates on): the context
          // line stays, the question blurs. Skipping below remains free.
          <FollowUpLockedCard
            branch={assignment!.followUp?.branch}
            promptText={personalize(assignment!.promptText)}
            onSeePremium={() => setShowPaywall(true)}
          />
        ) : (
          <>
            {isFollowUp && assignment!.followUp && (
              <FollowUpContextLine branch={assignment!.followUp.branch} />
            )}
            {isScalePrompt ? (
              <ScalePromptCard
                promptText={personalize(assignment!.promptText)}
                scaleConfig={assignment!.scaleConfig}
                value={scaleValue}
                onChangeValue={setScaleValue}
                note={scaleNote}
                onChangeNote={setScaleNote}
                onNoteFocus={handlePromptNoteFocus}
                onSubmit={handleScaleSubmit}
                isPending={submitResponse.isPending}
              />
            ) : (
              <PromptCard
                promptText={personalize(assignment!.promptText)}
                promptHint={assignment!.promptHint && personalize(assignment!.promptHint)}
                promptType={assignment!.promptType}
                onRespond={handleRespond}
              />
            )}
          </>
        )}
        {isFollowUp && (
          <FollowUpSkip onSkip={handleSkipFollowUp} disabled={skipFollowUp.isPending} />
        )}
      </Animated.View>

      {partnerQuestionCard}

      {stagePromptCard}

      <EngagementCards {...engagementProps} />
    </ScrollView>
  );

  // ─── Shared shell: one SafeAreaView, modes crossfade inside it ───
  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.modeContainer}
      >
        <Animated.View
          key={mode}
          entering={FadeIn.duration(300)}
          exiting={FadeOut.duration(180)}
          style={styles.modeContainer}
        >
          {mode === 'loading' && renderLoading()}
          {mode === 'error' && renderError()}
          {mode === 'no-prompt' && (user?.coupleId ? renderNoPrompt() : renderUnpaired())}
          {mode === 'waiting' && renderWaiting()}
          {mode === 'complete' && renderComplete()}
          {mode === 'prompt' && renderPrompt()}
        </Animated.View>
      </KeyboardAvoidingView>

      <ConversationStarterModal
        visible={showConversationModal}
        onClose={() => setShowConversationModal(false)}
        starterText={conversationStarterText}
      />
      <SafetyResources
        visible={showSafetyResources}
        onClose={() => setShowSafetyResources(false)}
      />
      <NotificationPrePrompt
        visible={prePrompt.visible}
        partnerName={partnerName}
        onAccept={prePrompt.accept}
        onDismiss={prePrompt.dismiss}
      />
      <Paywall
        visible={showPaywall}
        onClose={() => setShowPaywall(false)}
        source="follow_up"
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.surface.background,
  },
  modeContainer: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
    paddingHorizontal: spacing.screen,
  },
  scrollContent: {
    paddingTop: spacing.cardPad,
    paddingBottom: spacing.xl,
  },
  // ─── Spark card ───
  sparkCard: {
    backgroundColor: colors.surface.card,
    borderRadius: radius.card,
    overflow: 'hidden',
    marginBottom: spacing.md,
    ...shadow.cardSubtle,
  },
  sparkAccent: {
    height: 3,
    backgroundColor: colors.accent.primary,
  },
  sparkContent: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    gap: spacing.smd,
  },
  sparkTextWrap: {
    flex: 1,
  },
  sparkTitle: {
    ...typography.h3,
    color: colors.text.primary,
  },
  sparkSubtitle: {
    ...typography.bodySm,
    color: colors.text.secondary,
    marginTop: 2,
  },
  // ─── Loading greeting (no logo) ───
  greetingRow: {
    marginBottom: spacing.sm,
  },
  greeting: {
    ...typography.display,
    color: colors.text.primary,
    letterSpacing: -0.5,
  },
  dateText: {
    ...typography.body,
    color: colors.text.secondary,
    marginTop: 2,
  },
  // ─── Prompt ───
  promptSection: {
    marginTop: spacing.lg,
  },
  // ─── Empty / No prompt ───
  emptyCard: {
    marginTop: spacing.lg,
    backgroundColor: colors.surface.card,
    borderRadius: radius.hero,
    padding: spacing.xl,
    alignItems: 'center',
    overflow: 'hidden',
    ...shadow.card,
  },
  emptyTitle: {
    ...typography.heading,
    color: colors.text.primary,
    marginBottom: spacing.sm,
    textAlign: 'center',
  },
  emptySubtitle: {
    ...typography.body,
    color: colors.text.secondary,
    textAlign: 'center',
  },
  triggerButton: {
    marginTop: spacing.lg,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xl,
    backgroundColor: colors.accent.primary,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  triggerButtonText: {
    ...typography.btn,
    color: colors.text.inverse,
  },
  disabled: {
    opacity: 0.4,
  },
  streakSection: {
    marginTop: spacing.lg,
  },
  // ─── Waiting ───
  waitingCard: {
    marginTop: spacing.screen,
    backgroundColor: colors.surface.card,
    borderRadius: radius.hero,
    padding: spacing.lg,
    overflow: 'hidden',
    ...shadow.card,
  },
  waitingPrompt: {
    ...typography.body,
    color: colors.text.secondary,
    fontStyle: 'italic',
    textAlign: 'center',
    marginBottom: spacing.screen,
  },
  sealedCard: {
    backgroundColor: colors.accent.primaryLight,
    borderRadius: radius.card,
    padding: spacing.lg,
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  sealedTitle: {
    ...typography.h3,
    color: colors.text.primary,
  },
  sealedSubtitle: {
    ...typography.bodySm,
    color: colors.text.secondary,
  },
  waitingDivider: {
    height: 1,
    backgroundColor: colors.border.default,
    marginVertical: spacing.screen,
  },
  typingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
  },
  typingText: {
    ...typography.bodySm,
    color: colors.accent.primary,
    fontStyle: 'italic',
  },
  waitingMessageRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
  },
  waitingMessage: {
    ...typography.bodySm,
    color: colors.text.secondary,
  },
  // ─── Complete ───
  completionSection: {
    marginTop: spacing.screen,
  },
  stagePromptSection: {
    marginTop: spacing.md,
  },
  feedbackCard: {
    marginTop: spacing.screen,
    backgroundColor: colors.surface.card,
    borderRadius: radius.hero,
    padding: spacing.lg,
    alignItems: 'center',
    overflow: 'hidden',
    ...shadow.card,
  },
  feedbackTitle: {
    ...typography.eyebrow,
    color: colors.text.secondary,
    marginBottom: spacing.md,
  },
  feedbackRow: {
    flexDirection: 'row',
    gap: spacing.smd,
  },
  feedbackOption: {
    paddingVertical: spacing.smd,
    paddingHorizontal: spacing.screen,
    backgroundColor: colors.surface.background,
    borderRadius: radius.choice,
    borderWidth: 1.5,
    borderColor: colors.border.default,
    alignItems: 'center',
    gap: spacing.xs,
  },
  feedbackIconWrap: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  feedbackOptionText: {
    ...typography.bodySm,
    color: colors.text.secondary,
  },
  feedbackThanks: {
    ...typography.bodySm,
    marginTop: spacing.md,
    color: colors.text.secondary,
    textAlign: 'center',
  },
  streakCelebration: {
    marginTop: spacing.screen,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.accent.primaryLight,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.pill,
    gap: spacing.sm,
    alignSelf: 'center',
  },
  streakCelebrationText: {
    ...typography.h3,
    color: colors.accent.primary,
  },
  streakDetailSection: {
    marginTop: spacing.md,
  },
  doneRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.smd,
    marginTop: spacing.xl,
    marginBottom: spacing.md,
  },
  doneDot: {
    width: 3,
    height: 3,
    borderRadius: 2,
    backgroundColor: colors.border.default,
  },
  doneText: {
    ...typography.bodySm,
    color: colors.text.secondary,
  },
});
