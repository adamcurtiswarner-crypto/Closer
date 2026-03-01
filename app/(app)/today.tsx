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
import { router } from 'expo-router';
import { pickImage } from '@/services/imageUpload';

const logo = require('@/assets/logo.png');
import Animated, { FadeIn, FadeInUp, FadeInDown, useSharedValue, useAnimatedStyle, withSpring, withTiming } from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { SafeAreaView } from 'react-native-safe-area-context';
import { format } from 'date-fns';
import { PromptCard, CompletionMoment, GoalTracker, AddGoalModal, WishlistCard, AddWishlistModal, PulsingDots, Icon } from '@components';
import { DateNightCard } from '@/components/DateNightCard';
import { ConnectionHeader } from '@/components/ConnectionHeader';
import { StreakRing } from '@/components/StreakRing';
import { usePresence } from '@/hooks/usePresence';
import { useAuth } from '@/hooks/useAuth';
import { useTodayPrompt, useSubmitResponse, useSubmitFeedback, useTriggerPrompt } from '@/hooks/usePrompt';
import { useStreak } from '@/hooks/useStreak';
import { useCouple } from '@/hooks/useCouple';
import { updateWidgetData, buildWidgetData } from '@/services/widgetBridge';
import { getAnniversaryCountdown } from '@/config/milestones';
import { logEvent } from '@/services/analytics';
import { QueryError } from '@/components/QueryError';
import { PromptCardSkeleton } from '@/components/Skeleton';
import { logger } from '@/utils/logger';
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
  const { data: couple } = useCouple();
  const { t } = useTranslation();

  const [isResponding, setIsResponding] = useState(false);
  const [responseText, setResponseText] = useState('');
  const [feedbackGiven, setFeedbackGiven] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [showStreakDetail, setShowStreakDetail] = useState(false);
  const [showAddGoalModal, setShowAddGoalModal] = useState(false);
  const [showAddWishlistModal, setShowAddWishlistModal] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);

  const submitScale = useSharedValue(1);
  const submitAnimStyle = useAnimatedStyle(() => ({
    transform: [{ scale: submitScale.value }],
  }));

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
      currentStreak,
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
    const imageUri = selectedImage || undefined;
    setSelectedImage(null);
    try {
      await submitResponse.mutateAsync({
        assignmentId: assignment.id,
        responseText,
        imageUri,
      });
    } catch (err) {
      logger.error('Error submitting response:', err);
    }
  };

  const handleAddPhoto = async () => {
    const uri = await pickImage();
    if (uri) setSelectedImage(uri);
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
              <Text style={styles.greeting}>{getGreeting(t)}</Text>
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
            <Icon name="coffee" size="xl" color="#c97454" weight="light" />
            <Text style={styles.emptyTitle}>{t('today.promptOnWay')}</Text>
            <Text style={styles.emptySubtitle}>
              {nextPromptAt
                ? t('today.arrivingAround', { time: format(new Date(nextPromptAt), 'h:mm a') })
                : t('today.checkBackSoon')}
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

          {/* Date Night Games */}
          <Animated.View entering={FadeInUp.duration(500).delay(1000)} style={styles.goalSection}>
            <DateNightCard />
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
                placeholder={t('today.sharePlaceholder')}
                placeholderTextColor="#a8a29e"
                multiline
                textAlignVertical="top"
                value={responseText}
                onChangeText={handleTextChange}
                autoFocus
              />
            </Animated.View>

            {selectedImage ? (
              <View style={styles.imagePreview}>
                <Image source={{ uri: selectedImage }} style={styles.previewImage} resizeMode="cover" />
                <TouchableOpacity style={styles.removeImage} onPress={() => setSelectedImage(null)}>
                  <Icon name="x" size="xs" color="#ffffff" weight="bold" />
                </TouchableOpacity>
              </View>
            ) : (
              <TouchableOpacity style={styles.attachPhotoButton} onPress={handleAddPhoto}>
                <Icon name="camera" size="md" color="#78716c" />
                <Text style={styles.attachPhotoText}>{t('today.addPhoto')}</Text>
              </TouchableOpacity>
            )}

            <View style={styles.respondingFooter}>
              <Text style={styles.charHint}>
                {responseText.length < 10
                  ? t('today.moreCharacters', { count: 10 - responseText.length })
                  : t('today.readyToShare')}
              </Text>

              <View style={styles.buttonRow}>
                <TouchableOpacity
                  style={styles.cancelButton}
                  onPress={() => { setIsResponding(false); setResponseText(''); }}
                >
                  <Text style={styles.cancelText}>Back</Text>
                </TouchableOpacity>
                <Animated.View style={[{ flex: 1 }, submitAnimStyle]}>
                  <TouchableOpacity
                    style={[styles.submitButton, (responseText.length < 10 || submitResponse.isPending) && styles.disabled]}
                    onPress={handleSubmit}
                    onPressIn={() => { submitScale.value = withTiming(0.96, { duration: 100 }); }}
                    onPressOut={() => { submitScale.value = withSpring(1, { damping: 12, stiffness: 200 }); }}
                    disabled={responseText.length < 10 || submitResponse.isPending}
                    activeOpacity={0.8}
                  >
                    <Text style={styles.submitText}>
                      {submitResponse.isPending ? t('today.sending') : t('today.share')}
                    </Text>
                    {!submitResponse.isPending && <Icon name="arrow-right" size="sm" color="#ffffff" />}
                  </TouchableOpacity>
                </Animated.View>
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
              <Text style={styles.greeting}>{t('today.niceOne')}</Text>
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

            {/* Sealed response card */}
            <Animated.View entering={FadeIn.duration(400)} style={styles.sealedCard}>
              <Icon name="lock" size="md" color="#c97454" weight="light" />
              <Text style={styles.sealedTitle}>Your answer is saved</Text>
              <Text style={styles.sealedSubtitle}>
                Waiting for {partnerName ?? 'your partner'}...
              </Text>
            </Animated.View>

            <View style={styles.waitingDivider} />

            {isPartnerTyping && partnerTypingContext === 'prompt' ? (
              <Animated.View entering={FadeIn.duration(300)} style={styles.typingRow}>
                <PulsingDots color="#c97454" size={5} />
                <Text style={styles.typingText}>{t('today.isResponding', { name: partnerName })}</Text>
              </Animated.View>
            ) : (
              <View style={styles.waitingMessageRow}>
                <Icon name="hourglass" size={16} color="#a8a29e" />
                <Text style={styles.waitingMessage}>{t('today.waitingFor', { name: partnerName.toLowerCase() })}</Text>
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

          {/* Date Night Games */}
          <Animated.View entering={FadeInUp.duration(500).delay(800)} style={styles.goalSection}>
            <DateNightCard />
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
              <Text style={styles.greeting}>{t('today.beautiful')}</Text>
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
              yourImageUrl={myResponse!.imageUrl}
              partnerImageUrl={partnerResponse?.imageUrl}
            />
          </Animated.View>

          {/* Emotional Feedback */}
          {myResponse && !feedbackGiven && (
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
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
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
          {currentStreak > 0 && (
            <Animated.View entering={FadeInUp.duration(500).delay(700)}>
              <TouchableOpacity
                style={styles.streakCelebration}
                onPress={() => setShowStreakDetail(!showStreakDetail)}
                activeOpacity={0.8}
              >
                <Icon name="flame" size="md" color="#c97454" weight="fill" />
                <Text style={styles.streakCelebrationText}>
                  {currentStreak === 1 ? t('today.streakStarted') : t('today.dayStreak', { count: currentStreak })}
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

          {/* Date Night Games */}
          <Animated.View entering={FadeInUp.duration(500).delay(1200)} style={styles.goalSection}>
            <DateNightCard />
          </Animated.View>

          <Animated.View entering={FadeIn.duration(400).delay(1300)}>
            <View style={styles.doneRow}>
              <View style={styles.doneDot} />
              <Text style={styles.doneText}>{t('today.seeYouTomorrow')}</Text>
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
              <Text style={styles.greeting}>{getGreeting(t)}</Text>
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
  attachPhotoButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 12,
    paddingVertical: 10,
    paddingHorizontal: 16,
    alignSelf: 'flex-start',
    backgroundColor: '#f5f5f4',
    borderRadius: 10,
  },
  attachPhotoIcon: {
    fontSize: 14,
  },
  attachPhotoText: {
    fontSize: 14,
    color: '#78716c',
    fontWeight: '500',
  },
  imagePreview: {
    marginTop: 12,
    position: 'relative',
    alignSelf: 'flex-start',
  },
  previewImage: {
    width: 120,
    height: 120,
    borderRadius: 12,
  },
  removeImage: {
    position: 'absolute',
    top: -8,
    right: -8,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#57534e',
    alignItems: 'center',
    justifyContent: 'center',
  },
  removeImageText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '700',
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
  sealedCard: {
    backgroundColor: '#fef7f4',
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    gap: 8,
    marginBottom: 16,
  },
  sealedTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1c1917',
  },
  sealedSubtitle: {
    fontSize: 13,
    color: '#a8a29e',
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
  feedbackIconWrap: {
    alignItems: 'center',
    justifyContent: 'center',
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
