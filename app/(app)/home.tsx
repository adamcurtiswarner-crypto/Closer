import React, { useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import { router } from 'expo-router';
import Animated, { FadeIn, FadeInUp } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '@/hooks/useAuth';
import { useCouple } from '@/hooks/useCouple';
import { useStreak } from '@/hooks/useStreak';
import { useDateNights } from '@/hooks/useDateNights';
import { useGoals } from '@/hooks/useGoals';
import { useTodayPrompt } from '@/hooks/usePrompt';
import { getAnniversaryCountdown } from '@/config/milestones';
import { StreakRing } from '@/components/StreakRing';
import { ProfileCard } from '@/components/ProfileCard';
import { Icon } from '@/components/Icon';
import { format, differenceInDays } from 'date-fns';

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
}

function getDaysAsCouple(linkedAt: Date | null): number {
  if (!linkedAt) return 0;
  return differenceInDays(new Date(), linkedAt) + 1;
}

function getPulseText(opts: {
  currentStreak: number;
  weeklyCompletions: number;
  isComplete: boolean;
  partnerHasResponded: boolean;
  partnerName: string;
  daysAsCouple: number;
}): string {
  const { currentStreak, weeklyCompletions, isComplete, partnerHasResponded, partnerName, daysAsCouple } = opts;

  if (isComplete && currentStreak >= 3) {
    return `${currentStreak}-day streak. You two are on fire.`;
  }
  if (isComplete) {
    return 'Both responded today. Another moment shared.';
  }
  if (partnerHasResponded) {
    return `${partnerName} already responded. Your turn.`;
  }
  if (weeklyCompletions >= 5) {
    return `${weeklyCompletions} prompts this week. Quiet consistency.`;
  }
  if (currentStreak > 0) {
    return `${currentStreak}-day streak. Keep it going.`;
  }
  if (daysAsCouple > 7) {
    return `${daysAsCouple} days growing together on Stoke.`;
  }
  return 'A small moment today can mean a lot.';
}

const QUICK_ACTIONS = [
  { key: 'chat', icon: 'chat-text' as const, label: 'Chat', route: '/(app)/chat' },
  { key: 'wishlist', icon: 'heart' as const, label: 'Wishlist', route: '/(app)/wishlist' },
  { key: 'datenight', icon: 'coffee' as const, label: 'Date Night', route: '/(app)/date-nights' },
  { key: 'goals', icon: 'target' as const, label: 'Goals', route: '/(app)/games' },
];

export default function HomeScreen() {
  const { user } = useAuth();
  const { data: couple } = useCouple();
  const { currentStreak, weeklyCompletions, isStreakActive } = useStreak();
  const { data: dateNights } = useDateNights();
  const { data: goals } = useGoals();
  const todayPrompt = useTodayPrompt();
  const isComplete = todayPrompt.data?.isComplete ?? false;
  const partnerHasResponded = todayPrompt.data?.partnerHasResponded ?? false;

  const firstName = user?.displayName?.split(' ')[0] || 'there';
  const partnerName = user?.partnerName || 'Partner';
  const daysAsCouple = getDaysAsCouple(couple?.linkedAt ?? null);

  const pulseText = useMemo(() => getPulseText({
    currentStreak,
    weeklyCompletions,
    isComplete,
    partnerHasResponded,
    partnerName,
    daysAsCouple,
  }), [currentStreak, weeklyCompletions, isComplete, partnerHasResponded, partnerName, daysAsCouple]);

  // Upcoming: next scheduled date night
  const upcomingDateNight = useMemo(() => {
    if (!dateNights) return null;
    const now = new Date();
    return dateNights
      .filter((dn) => dn.status === 'scheduled' && dn.scheduledDate && dn.scheduledDate > now)
      .sort((a, b) => (a.scheduledDate!.getTime() - b.scheduledDate!.getTime()))[0] ?? null;
  }, [dateNights]);

  // Anniversary countdown
  const anniversary = useMemo(() => {
    if (!couple?.anniversaryDate) return null;
    return getAnniversaryCountdown(couple.anniversaryDate);
  }, [couple?.anniversaryDate]);

  // Active goals count
  const activeGoalsCount = useMemo(() => {
    if (!goals) return 0;
    return goals.filter((g) => !g.isCompleted && !g.isArchived).length;
  }, [goals]);

  const showUpcoming = upcomingDateNight || (anniversary && !anniversary.isToday && anniversary.days <= 30) || activeGoalsCount > 0;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >
        {/* 1. Profile Card */}
        <Animated.View entering={FadeIn.duration(500)}>
          <ProfileCard />
        </Animated.View>

        {/* 2. Today's Pulse */}
        <Animated.View entering={FadeInUp.duration(400).delay(100)}>
          <View style={styles.pulseCard}>
            <Text style={styles.greeting}>{getGreeting()}, {firstName}</Text>
            <Text style={styles.pulseText}>{pulseText}</Text>
          </View>
        </Animated.View>

        {/* 3. Quick Actions */}
        <Animated.View entering={FadeInUp.duration(400).delay(200)} style={styles.quickActions}>
          {QUICK_ACTIONS.map((action) => (
            <TouchableOpacity
              key={action.key}
              style={styles.quickAction}
              onPress={() => router.push(action.route as any)}
              activeOpacity={0.7}
            >
              <View style={styles.quickActionIcon}>
                <Icon name={action.icon} size="md" color="#c97454" weight="light" />
              </View>
              <Text style={styles.quickActionLabel}>{action.label}</Text>
            </TouchableOpacity>
          ))}
        </Animated.View>

        {/* 4. This Week Together */}
        <Animated.View entering={FadeInUp.duration(400).delay(300)}>
          <Text style={styles.sectionTitle}>This week</Text>
          <StreakRing
            currentStreak={currentStreak}
            weeklyCompletions={weeklyCompletions}
            isStreakActive={isStreakActive}
          />
        </Animated.View>

        {/* 7. Upcoming */}
        {showUpcoming && (
          <Animated.View entering={FadeInUp.duration(400).delay(400)}>
            <Text style={[styles.sectionTitle, styles.sectionTitleSpaced]}>Coming up</Text>
            <View style={styles.upcomingCard}>
              {/* Anniversary countdown */}
              {anniversary && !anniversary.isToday && anniversary.days <= 30 && (
                <View style={styles.upcomingRow}>
                  <View style={[styles.upcomingIcon, { backgroundColor: '#fef3ee' }]}>
                    <Icon name="heart" size="sm" color="#c97454" weight="fill" />
                  </View>
                  <View style={styles.upcomingContent}>
                    <Text style={styles.upcomingTitle}>
                      {anniversary.days === 1 ? 'Anniversary tomorrow' : `Anniversary in ${anniversary.days} days`}
                    </Text>
                  </View>
                </View>
              )}

              {anniversary?.isToday && (
                <View style={styles.upcomingRow}>
                  <View style={[styles.upcomingIcon, { backgroundColor: '#fef3ee' }]}>
                    <Icon name="heart" size="sm" color="#c97454" weight="fill" />
                  </View>
                  <View style={styles.upcomingContent}>
                    <Text style={styles.upcomingTitle}>Happy Anniversary</Text>
                  </View>
                </View>
              )}

              {/* Next date night */}
              {upcomingDateNight && (
                <TouchableOpacity
                  style={styles.upcomingRow}
                  onPress={() => router.push('/(app)/date-nights')}
                  activeOpacity={0.7}
                >
                  <View style={[styles.upcomingIcon, { backgroundColor: '#f0fdf4' }]}>
                    <Icon name="coffee" size="sm" color="#16a34a" weight="light" />
                  </View>
                  <View style={styles.upcomingContent}>
                    <Text style={styles.upcomingTitle}>{upcomingDateNight.title}</Text>
                    <Text style={styles.upcomingSubtitle}>
                      {format(upcomingDateNight.scheduledDate!, 'EEEE, MMM d')}
                    </Text>
                  </View>
                  <Text style={styles.upcomingChevron}>{'>'}</Text>
                </TouchableOpacity>
              )}

              {/* Active goals */}
              {activeGoalsCount > 0 && (
                <TouchableOpacity
                  style={[styles.upcomingRow, styles.upcomingRowLast]}
                  onPress={() => router.push('/(app)/games' as any)}
                  activeOpacity={0.7}
                >
                  <View style={[styles.upcomingIcon, { backgroundColor: '#ede9fe' }]}>
                    <Icon name="target" size="sm" color="#7c3aed" weight="light" />
                  </View>
                  <View style={styles.upcomingContent}>
                    <Text style={styles.upcomingTitle}>
                      {activeGoalsCount} active {activeGoalsCount === 1 ? 'goal' : 'goals'}
                    </Text>
                  </View>
                  <Text style={styles.upcomingChevron}>{'>'}</Text>
                </TouchableOpacity>
              )}
            </View>
          </Animated.View>
        )}

        <View style={styles.bottomSpacer} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fef7f4',
  },
  scroll: {
    paddingHorizontal: 20,
    paddingBottom: 24,
  },

  // 2. Pulse
  pulseCard: {
    backgroundColor: '#ffffff',
    borderRadius: 20,
    padding: 20,
    marginBottom: 20,
    shadowColor: '#1c1917',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 1,
  },
  greeting: {
    fontSize: 22,
    fontFamily: 'Alexandria-SemiBold',
    color: '#1c1917',
    letterSpacing: -0.3,
    marginBottom: 6,
  },
  pulseText: {
    fontSize: 15,
    fontFamily: 'Inter-Regular',
    color: '#57534e',
    lineHeight: 22,
  },

  // 3. Quick Actions
  quickActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 28,
  },
  quickAction: {
    alignItems: 'center',
    flex: 1,
  },
  quickActionIcon: {
    width: 52,
    height: 52,
    borderRadius: 16,
    backgroundColor: '#ffffff',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#1c1917',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
    marginBottom: 6,
  },
  quickActionLabel: {
    fontSize: 12,
    fontFamily: 'Inter-Medium',
    color: '#57534e',
  },

  // 4. This Week
  sectionTitle: {
    fontSize: 18,
    fontFamily: 'Alexandria-SemiBold',
    color: '#1c1917',
    letterSpacing: -0.3,
    marginBottom: 12,
  },
  sectionTitleSpaced: {
    marginTop: 28,
  },

  // 7. Upcoming
  upcomingCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#1c1917',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 1,
  },
  upcomingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#f5f5f4',
  },
  upcomingRowLast: {
    borderBottomWidth: 0,
  },
  upcomingIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  upcomingContent: {
    flex: 1,
  },
  upcomingTitle: {
    fontSize: 15,
    fontFamily: 'Inter-Medium',
    color: '#1c1917',
  },
  upcomingSubtitle: {
    fontSize: 13,
    fontFamily: 'Inter-Regular',
    color: '#78716c',
    marginTop: 2,
  },
  upcomingChevron: {
    fontSize: 16,
    color: '#a8a29e',
    marginLeft: 8,
  },
  bottomSpacer: {
    height: 24,
  },
});
