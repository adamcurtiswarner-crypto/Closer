import React, { useMemo, useState, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  RefreshControl,
} from 'react-native';
import { router } from 'expo-router';
import { useQueryClient } from '@tanstack/react-query';
import Animated, { FadeInUp } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/config/firebase';
import { useAuth } from '@/hooks/useAuth';
import { useCouple } from '@/hooks/useCouple';
import { useStreak } from '@/hooks/useStreak';
import { useDateNights } from '@/hooks/useDateNights';
import { useGoals } from '@/hooks/useGoals';
import { useTodayPrompt } from '@/hooks/usePrompt';
import { getAnniversaryCountdown } from '@/config/milestones';
import { getLoveLanguageDisplay } from '@/config/loveLanguages';
import { StreakRing } from '@/components/StreakRing';
import { CoupleHero } from '@/components/CoupleHero';
import { RelationshipStats } from '@/components/RelationshipStats';
import { MilestoneBadges } from '@/components/MilestoneBadges';
import { Icon } from '@/components/Icon';
import { format, differenceInDays } from 'date-fns';

function getDaysAsCouple(linkedAt: Date | null): number {
  if (!linkedAt) return 0;
  return differenceInDays(new Date(), linkedAt) + 1;
}

function getWarmText(opts: {
  totalCompletions: number;
  currentStreak: number;
  daysAsCouple: number;
}): string {
  const { totalCompletions, currentStreak, daysAsCouple } = opts;
  if (totalCompletions >= 100) return `${totalCompletions} conversations deep`;
  if (currentStreak >= 7) return `${currentStreak} days of showing up for each other`;
  if (totalCompletions >= 10) return `${totalCompletions} moments shared and counting`;
  if (daysAsCouple >= 30) return 'Growing closer, one prompt at a time';
  return 'Every conversation matters';
}

const QUICK_ACTIONS = [
  { key: 'chat', icon: 'chat-text' as const, label: 'Chat', route: '/(app)/chat' },
  { key: 'wishlist', icon: 'heart' as const, label: 'Wishlist', route: '/(app)/wishlist' },
  { key: 'datenight', icon: 'coffee' as const, label: 'Date Night', route: '/(app)/date-nights' },
  { key: 'games', icon: 'game-controller' as const, label: 'Games', route: '/(app)/games' },
];

export default function TogetherScreen() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { data: couple } = useCouple();
  const { currentStreak, weeklyCompletions, isStreakActive } = useStreak();
  const { data: dateNights } = useDateNights();
  const { data: goals } = useGoals();

  const partnerName = user?.partnerName || 'Partner';
  const daysAsCouple = getDaysAsCouple(couple?.linkedAt ?? null);

  // Fetch partner's love language
  const partnerId = couple?.memberIds?.find((id: string) => id !== user?.id) || null;
  const { data: partnerLoveLanguage } = useQuery({
    queryKey: ['partnerLoveLanguage', partnerId],
    queryFn: async () => {
      if (!partnerId) return null;
      const partnerSnap = await getDoc(doc(db, 'users', partnerId));
      return partnerSnap.exists() ? (partnerSnap.data().love_language || null) : null;
    },
    enabled: !!partnerId,
    staleTime: 5 * 60 * 1000,
  });

  const userLang = getLoveLanguageDisplay(user?.loveLanguage ?? null);
  const partnerLang = getLoveLanguageDisplay(partnerLoveLanguage ?? null);

  const warmText = useMemo(() => getWarmText({
    totalCompletions: couple?.totalCompletions ?? 0,
    currentStreak,
    daysAsCouple,
  }), [couple?.totalCompletions, currentStreak, daysAsCouple]);

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

  // Milestone data
  const milestoneData = useMemo(() => ({
    totalCompletions: couple?.totalCompletions ?? 0,
    longestStreak: couple?.longestStreak ?? 0,
    daysAsCouple,
    memoriesSaved: 0, // TODO: add memories count
  }), [couple?.totalCompletions, couple?.longestStreak, daysAsCouple]);

  const [refreshing, setRefreshing] = useState(false);
  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ['couple'] }),
      queryClient.invalidateQueries({ queryKey: ['todayPrompt'] }),
      queryClient.invalidateQueries({ queryKey: ['streak'] }),
      queryClient.invalidateQueries({ queryKey: ['dateNights'] }),
      queryClient.invalidateQueries({ queryKey: ['goals'] }),
    ]);
    setRefreshing(false);
  }, [queryClient]);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor="#c97454" />
        }
      >
        {/* 1. Couple Hero */}
        <CoupleHero
          userName={user?.displayName ?? null}
          partnerName={user?.partnerName ?? null}
          userPhotoUrl={user?.photoUrl ?? null}
          partnerPhotoUrl={user?.partnerPhotoUrl ?? null}
          linkedAt={couple?.linkedAt ?? null}
        />

        {/* 2. Relationship Stats */}
        <RelationshipStats
          daysAsCouple={daysAsCouple}
          totalCompletions={couple?.totalCompletions ?? 0}
          longestStreak={couple?.longestStreak ?? 0}
          warmText={warmText}
          animationDelay={200}
        />

        {/* Love Languages */}
        {(userLang || partnerLang) && (
          <Animated.View entering={FadeInUp.duration(400).delay(300)} style={styles.loveLanguageSection}>
            <Text style={styles.sectionTitle}>Love languages</Text>
            <View style={styles.loveLanguageCard}>
              <View style={styles.loveLanguageRow}>
                <View style={styles.loveLanguagePerson}>
                  <Text style={styles.loveLanguageName}>{user?.displayName?.split(' ')[0] || 'You'}</Text>
                  <Text style={styles.loveLanguageValue}>{userLang?.label || 'Not set yet'}</Text>
                </View>
                <View style={styles.loveLanguageDivider} />
                <View style={styles.loveLanguagePerson}>
                  <Text style={styles.loveLanguageName}>{partnerName}</Text>
                  <Text style={styles.loveLanguageValue}>{partnerLang?.label || 'Not set yet'}</Text>
                </View>
              </View>
            </View>
          </Animated.View>
        )}

        {/* 3. This Week Together */}
        <Animated.View entering={FadeInUp.duration(400).delay(500)} style={styles.streakSection}>
          <Text style={styles.sectionTitle}>This week, together</Text>
          <StreakRing
            currentStreak={currentStreak}
            weeklyCompletions={weeklyCompletions}
            isStreakActive={isStreakActive}
          />
        </Animated.View>

        {/* 4. Quick Actions (2x2 grid) */}
        <Animated.View entering={FadeInUp.duration(400).delay(600)} style={styles.quickActionsSection}>
          <View style={styles.quickActionsGrid}>
            {QUICK_ACTIONS.map((action) => (
              <TouchableOpacity
                key={action.key}
                style={styles.quickActionCard}
                onPress={() => router.push(action.route as any)}
                activeOpacity={0.7}
              >
                <Icon name={action.icon} size="md" color="#c97454" weight="light" />
                <Text style={styles.quickActionLabel}>{action.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </Animated.View>

        {/* 5. Milestones */}
        <MilestoneBadges data={milestoneData} animationDelay={700} />

        {/* 6. Coming Up */}
        {showUpcoming && (
          <Animated.View entering={FadeInUp.duration(400).delay(800)} style={styles.upcomingSection}>
            <Text style={styles.sectionTitle}>Coming up</Text>
            <View style={styles.upcomingCard}>
              {anniversary && !anniversary.isToday && anniversary.days <= 30 && (
                <View style={styles.upcomingRow}>
                  <View style={[styles.upcomingIcon, { backgroundColor: '#fef3ee' }]}>
                    <Icon name="heart" size="sm" color="#c97454" weight="fill" />
                  </View>
                  <Text style={styles.upcomingTitle}>
                    {anniversary.days === 1 ? t('home.anniversaryTomorrow') : t('home.anniversaryInDays', { count: anniversary.days })}
                  </Text>
                </View>
              )}

              {anniversary?.isToday && (
                <View style={styles.upcomingRow}>
                  <View style={[styles.upcomingIcon, { backgroundColor: '#fef3ee' }]}>
                    <Icon name="heart" size="sm" color="#c97454" weight="fill" />
                  </View>
                  <Text style={styles.upcomingTitle}>{t('home.happyAnniversary')}</Text>
                </View>
              )}

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
                  <Icon name="caret-right" size="sm" color="#a8a29e" />
                </TouchableOpacity>
              )}

              {activeGoalsCount > 0 && (
                <TouchableOpacity
                  style={styles.upcomingRow}
                  onPress={() => router.push('/(app)/games' as any)}
                  activeOpacity={0.7}
                >
                  <View style={[styles.upcomingIcon, { backgroundColor: '#ede9fe' }]}>
                    <Icon name="target" size="sm" color="#7c3aed" weight="light" />
                  </View>
                  <Text style={styles.upcomingTitle}>
                    {t('home.activeGoals', { count: activeGoalsCount })}
                  </Text>
                  <Icon name="caret-right" size="sm" color="#a8a29e" />
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
    paddingBottom: 24,
  },

  // Love Languages
  loveLanguageSection: {
    marginTop: 24,
    paddingHorizontal: 20,
  },
  loveLanguageCard: {
    backgroundColor: '#ffffff',
    borderRadius: 20,
    padding: 20,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 1,
  },
  loveLanguageRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  loveLanguagePerson: {
    flex: 1,
  },
  loveLanguageName: {
    fontSize: 12,
    fontFamily: 'Inter-Medium',
    fontWeight: '500',
    color: '#78716c',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  loveLanguageValue: {
    fontSize: 14,
    fontFamily: 'Inter-SemiBold',
    fontWeight: '600',
    color: '#1c1917',
    marginTop: 2,
  },
  loveLanguageDivider: {
    width: 1,
    height: 40,
    backgroundColor: '#e7e5e4',
    marginHorizontal: 12,
  },

  // Sections
  streakSection: {
    marginTop: 24,
    paddingHorizontal: 20,
  },
  sectionTitle: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    fontWeight: '600',
    color: '#1c1917',
    marginBottom: 12,
  },

  // Quick Actions (2x2 grid)
  quickActionsSection: {
    marginTop: 24,
    paddingHorizontal: 20,
  },
  quickActionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  quickActionCard: {
    width: '48%',
    flexGrow: 1,
    flexBasis: '46%',
    backgroundColor: '#ffffff',
    borderRadius: 16,
    paddingVertical: 20,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 1,
  },
  quickActionLabel: {
    fontSize: 14,
    fontFamily: 'Inter-Medium',
    fontWeight: '500',
    color: '#57534e',
  },

  // Upcoming
  upcomingSection: {
    marginTop: 24,
    paddingHorizontal: 20,
  },
  upcomingCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 1 },
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
    fontWeight: '500',
    color: '#1c1917',
    flex: 1,
  },
  upcomingSubtitle: {
    fontSize: 13,
    fontFamily: 'Inter-Regular',
    color: '#78716c',
    marginTop: 2,
  },

  bottomSpacer: {
    height: 24,
  },
});
