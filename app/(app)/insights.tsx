import React, { useEffect, useMemo } from 'react';
import { View, Text, ScrollView, TouchableOpacity, RefreshControl, StyleSheet } from 'react-native';
import Animated, {
  FadeIn,
  FadeInUp,
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withDelay,
  withSpring,
  Easing,
} from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useInsights, formatWeekLabel } from '@/hooks/useInsights';
import { useCouple } from '@/hooks/useCouple';
import { usePulseScore } from '@/hooks/usePulseScore';
import { InsightCard } from '@/components/InsightCard';
import { AnimatedProgressBar, AnimatedCounter, Icon, PulseIndicator } from '@components';
import { Skeleton } from '@/components/Skeleton';
import { logEvent } from '@/services/analytics';
import { getBadgeStatus, getAnniversaryCountdown } from '@/config/milestones';
import type { BadgeCheckData } from '@/config/milestones';
import { getLoveLanguageDisplay } from '@/config/loveLanguages';
import { useAuth } from '@/hooks/useAuth';
import { useQuery } from '@tanstack/react-query';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/config/firebase';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';

function StatPill({ value, label }: { value: number; label: string }) {
  return (
    <View style={styles.statPill}>
      <AnimatedCounter value={value} style={styles.statValue} />
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

function InsightsSkeleton() {
  return (
    <View style={styles.skeletonContainer}>
      <View style={styles.heroRow}>
        {[1, 2, 3].map((i) => (
          <View key={i} style={styles.statPill}>
            <Skeleton width={40} height={28} style={{ alignSelf: 'center', marginBottom: 6 }} />
            <Skeleton width={50} height={12} style={{ alignSelf: 'center' }} />
          </View>
        ))}
      </View>
      {[1, 2, 3, 4].map((i) => (
        <View key={i} style={styles.skeletonCard}>
          <Skeleton width={120} height={16} style={{ marginBottom: 16 }} />
          <Skeleton height={12} style={{ marginBottom: 8 }} />
          <Skeleton height={12} width="80%" style={{ marginBottom: 8 }} />
          <Skeleton height={12} width="60%" />
        </View>
      ))}
    </View>
  );
}

function EmptyState() {
  const { t } = useTranslation();
  return (
    <View style={styles.empty}>
      <Icon name="binoculars" size="xl" color="#D4522A" weight="light" />
      <Text style={styles.emptyTitle}>{t('insights.emptyTitle')}</Text>
      <Text style={styles.emptySubtitle}>
        {t('insights.emptySubtitle')}
      </Text>
    </View>
  );
}

function AnimatedBarRow({ week, index }: { week: { week: string; positive: number; neutral: number; negative: number; total: number }; index: number }) {
  const scaleX = useSharedValue(0);

  useEffect(() => {
    scaleX.value = withDelay(
      index * 60,
      withTiming(1, { duration: 500, easing: Easing.out(Easing.cubic) })
    );
  }, []);

  const barAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scaleX: scaleX.value }],
  }));

  return (
    <Animated.View
      entering={FadeInUp.duration(300).delay(index * 60)}
      style={styles.emotionRow}
    >
      <Text style={styles.weekLabel}>{formatWeekLabel(week.week)}</Text>
      {week.total > 0 ? (
        <Animated.View style={[styles.barContainer, barAnimatedStyle]}>
          {week.positive > 0 && (
            <View style={[styles.barSegment, styles.barPositive, { flex: week.positive }]} />
          )}
          {week.neutral > 0 && (
            <View style={[styles.barSegment, styles.barNeutral, { flex: week.neutral }]} />
          )}
          {week.negative > 0 && (
            <View style={[styles.barSegment, styles.barNegative, { flex: week.negative }]} />
          )}
        </Animated.View>
      ) : (
        <Animated.View style={[styles.barContainer, barAnimatedStyle]}>
          <View style={[styles.barSegment, styles.barEmpty, { flex: 1 }]} />
        </Animated.View>
      )}
    </Animated.View>
  );
}

function AnimatedTrendBar({ targetHeight, index, week }: { targetHeight: number; index: number; week: string }) {
  const height = useSharedValue(4);

  useEffect(() => {
    height.value = withDelay(
      index * 80,
      withTiming(targetHeight, { duration: 600, easing: Easing.out(Easing.cubic) })
    );
  }, []);

  const animatedStyle = useAnimatedStyle(() => ({
    height: height.value,
  }));

  return (
    <View style={styles.trendColumn}>
      <Animated.View style={[styles.trendBar, animatedStyle]} />
      <Text style={styles.trendWeekLabel}>{formatWeekLabel(week)}</Text>
    </View>
  );
}

function AnimatedLoveLanguageCircle({ children, delay }: { children: React.ReactNode; delay: number }) {
  const scale = useSharedValue(0.8);

  useEffect(() => {
    scale.value = withDelay(
      delay,
      withSpring(1, { damping: 12, stiffness: 150 })
    );
  }, []);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <Animated.View
      entering={FadeInUp.duration(400).delay(delay)}
      style={[animatedStyle, { flex: 1 }]}
    >
      {children}
    </Animated.View>
  );
}

export default function InsightsScreen() {
  const { user } = useAuth();
  const { t } = useTranslation();
  const { data: insights, isLoading, refetch, isRefetching } = useInsights();
  const { data: couple } = useCouple();
  const { data: pulseData } = usePulseScore();

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

  const userLang = getLoveLanguageDisplay(user?.loveLanguage || null);
  const partnerLang = getLoveLanguageDisplay(partnerLoveLanguage || null);

  const milestones = useMemo(() => {
    if (!insights) return null;
    const checkData: BadgeCheckData = {
      totalCompletions: insights.totalCompletions,
      longestStreak: insights.longestStreak,
      daysAsCouple: insights.daysAsCouple,
      memoriesSaved: insights.memoriesSaved,
      dateNightsCompleted: insights.dateNightsCompleted ?? 0,
      wishlistItemsFulfilled: insights.wishlistItemsFulfilled ?? 0,
      checkInsCompleted: insights.checkInsCompleted ?? 0,
    };
    return getBadgeStatus(checkData);
  }, [insights]);

  const anniversary = useMemo(() => {
    if (!couple?.anniversaryDate) return null;
    return getAnniversaryCountdown(couple.anniversaryDate);
  }, [couple?.anniversaryDate]);

  useEffect(() => {
    if (insights) {
      logEvent('insights_viewed', {
        total_completions: insights.totalCompletions,
        days_as_couple: insights.daysAsCouple,
      });
    }
  }, [insights]);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>{t('insights.title')}</Text>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isRefetching}
            onRefresh={refetch}
            tintColor="#D4522A"
          />
        }
      >
        {isLoading ? (
          <InsightsSkeleton />
        ) : !insights || insights.totalCompletions === 0 ? (
          <EmptyState />
        ) : (
          <>
            {/* Relationship Pulse */}
            {pulseData?.current && (
              <PulseIndicator
                score={pulseData.current.score}
                tier={pulseData.current.tier}
                trend={pulseData.trend}
                history={pulseData.history}
              />
            )}

            {/* Hero Stats */}
            <Animated.View entering={FadeIn.duration(400)} style={styles.heroRow}>
              <StatPill value={insights.totalCompletions} label={t('insights.prompts')} />
              <StatPill value={insights.daysAsCouple} label={t('insights.days')} />
              <StatPill value={insights.memoriesSaved} label={t('insights.memoriesLabel')} />
            </Animated.View>

            {/* Milestones */}
            {milestones && (
              <InsightCard icon={<Icon name="trophy" size="md" color="#D4522A" />} title="Milestones" accentColor="#b8860b" delay={50}>
                {/* Achieved badges */}
                {milestones.earned.length > 0 && (
                  <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    style={styles.badgeScroll}
                    contentContainerStyle={styles.badgeScrollContent}
                  >
                    {milestones.earned.map((m) => (
                      <View key={m.id} style={styles.badge}>
                        <View style={styles.badgeCircle}>
                          <Text style={styles.badgeIcon}>{m.icon}</Text>
                        </View>
                        <Text style={styles.badgeTitle} numberOfLines={1}>{m.title}</Text>
                      </View>
                    ))}
                    {milestones.locked.slice(0, 2).map((m) => (
                      <View key={m.id} style={styles.badge}>
                        <View style={[styles.badgeCircle, styles.badgeCircleLocked]}>
                          <Text style={styles.badgeIconLocked}>{m.icon}</Text>
                          <View style={styles.lockOverlay}>
                            <Icon name="lock" size={10} color="#B8B8C4" weight="fill" />
                          </View>
                        </View>
                        <Text style={[styles.badgeTitle, styles.badgeTitleLocked]} numberOfLines={1}>{m.title}</Text>
                      </View>
                    ))}
                  </ScrollView>
                )}

                {/* Next milestone progress */}
                {milestones.next && (
                  <View style={styles.nextMilestone}>
                    <View style={styles.nextMilestoneHeader}>
                      <Text style={styles.nextMilestoneLabel}>Next</Text>
                      <Text style={styles.nextMilestoneTitle}>{milestones.next.title}</Text>
                    </View>
                    <Text style={styles.nextMilestoneDesc}>{milestones.next.description}</Text>
                    <View style={styles.nextMilestoneBar}>
                      <AnimatedProgressBar
                        progress={milestones.next.current / milestones.next.threshold}
                        color="#D4522A"
                        trackColor="#E2DED8"
                        height={6}
                        style={{ flex: 1, borderRadius: 3 }}
                      />
                      <Text style={styles.nextMilestoneCount}>
                        {milestones.next.current}/{milestones.next.threshold}
                      </Text>
                    </View>
                  </View>
                )}

                {/* Anniversary countdown */}
                {anniversary && (
                  <View style={styles.anniversarySection}>
                    {anniversary.isToday ? (
                      <View style={styles.anniversaryRow}>
                        <Icon name="sparkle" size="sm" color="#D4522A" weight="fill" />
                        <Text style={styles.anniversaryText}>Today's your anniversary</Text>
                      </View>
                    ) : (
                      <View style={styles.anniversaryRow}>
                        <Icon name="calendar" size="sm" color="#D4522A" />
                        <Text style={styles.anniversaryText}>{anniversary.days} {anniversary.days === 1 ? 'day' : 'days'} until your anniversary</Text>
                      </View>
                    )}
                  </View>
                )}

                {/* Empty state for brand new users */}
                {milestones.earned.length === 0 && !milestones.next && (
                  <Text style={styles.cardEmpty}>
                    Complete prompts together to earn milestones.
                  </Text>
                )}
              </InsightCard>
            )}

            {/* Love Languages */}
            <InsightCard icon={<Icon name="heart" size="md" color="#D4522A" weight="fill" />} title="Love Languages" accentColor="#c97474" delay={75}>
              <View style={styles.loveLanguageRow}>
                <AnimatedLoveLanguageCircle delay={0}>
                  <View style={styles.loveLanguageItem}>
                    <View style={[styles.loveLanguageCircle, userLang && styles.loveLanguageCircleSet]}>
                      <Text style={styles.loveLanguageEmoji}>
                        {userLang ? userLang.icon : '?'}
                      </Text>
                    </View>
                    <Text style={styles.loveLanguageWho}>You</Text>
                    <Text style={styles.loveLanguageName} numberOfLines={2}>
                      {userLang ? userLang.label : 'Not set'}
                    </Text>
                    {!userLang && (
                      <TouchableOpacity onPress={() => router.push('/(app)/settings')} activeOpacity={0.7}>
                        <Text style={styles.loveLanguageSetLink}>Set yours</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                </AnimatedLoveLanguageCircle>
                <AnimatedLoveLanguageCircle delay={100}>
                  <View style={styles.loveLanguageItem}>
                    <View style={[styles.loveLanguageCircle, partnerLang && styles.loveLanguageCirclePartner]}>
                      <Text style={styles.loveLanguageEmoji}>
                        {partnerLang ? partnerLang.icon : '?'}
                      </Text>
                    </View>
                    <Text style={styles.loveLanguageWho}>{user?.partnerName || 'Partner'}</Text>
                    <Text style={styles.loveLanguageName} numberOfLines={2}>
                      {partnerLang ? partnerLang.label : 'Not set yet'}
                    </Text>
                  </View>
                </AnimatedLoveLanguageCircle>
              </View>
            </InsightCard>

            {/* Emotional Journey */}
            <InsightCard icon={<Icon name="sun-dim" size="md" color="#f59e0b" />} title="Emotional Journey" delay={200}>
              {insights.emotionalJourney.some((w) => w.total > 0) ? (
                <>
                  {insights.emotionalJourney.map((week, index) => (
                    <AnimatedBarRow key={week.week} week={week} index={index} />
                  ))}
                  <View style={styles.legend}>
                    <View style={styles.legendItem}>
                      <View style={[styles.legendDot, styles.barPositive]} />
                      <Text style={styles.legendText}>Warm</Text>
                    </View>
                    <View style={styles.legendItem}>
                      <View style={[styles.legendDot, styles.barNeutral]} />
                      <Text style={styles.legendText}>Okay</Text>
                    </View>
                    <View style={styles.legendItem}>
                      <View style={[styles.legendDot, styles.barNegative]} />
                      <Text style={styles.legendText}>Hard</Text>
                    </View>
                  </View>
                  {insights.overallPositiveRate > 0 && (
                    <Text style={styles.sentimentSummary}>
                      {insights.overallPositiveRate}% of your reflections felt warm
                    </Text>
                  )}
                </>
              ) : (
                <Text style={styles.cardEmpty}>
                  Complete more prompts to see your emotional journey.
                </Text>
              )}
            </InsightCard>

            {/* Communication */}
            <InsightCard icon={<Icon name="chat-circle" size="md" color="#D4522A" />} title="Communication" accentColor="#3D2870" delay={300}>
              <View style={styles.commStatRow}>
                <Text style={styles.commStatLabel}>Avg. response length</Text>
                <AnimatedCounter value={insights.avgResponseWords} style={styles.commStatValue} prefix="~" suffix=" words" />
              </View>
              <View style={[styles.commStatRow, styles.commStatRowLast]}>
                <Text style={styles.commStatLabel}>Talked about it after</Text>
                <AnimatedCounter value={insights.talkedAboutItRate} style={styles.commStatValue} suffix="%" />
              </View>
              {insights.responseLengthTrend.some((w) => w.avgWords > 0) && (
                <View style={styles.trendRow}>
                  {insights.responseLengthTrend.map((w, index) => {
                    const maxWords = Math.max(...insights.responseLengthTrend.map((t) => t.avgWords), 1);
                    const targetHeight = w.avgWords > 0
                      ? 20 + (w.avgWords / maxWords) * 40
                      : 4;
                    return (
                      <AnimatedTrendBar
                        key={w.week}
                        targetHeight={targetHeight}
                        index={index}
                        week={w.week}
                      />
                    );
                  })}
                </View>
              )}
            </InsightCard>

            {/* Prompt Categories */}
            {insights.promptCategories.length > 0 && (
              <InsightCard icon={<Icon name="target" size="md" color="#D4522A" />} title="Prompt Categories" accentColor="#7b6fa0" delay={400}>
                {insights.promptCategories.map((cat) => (
                  <View key={cat.type} style={styles.categoryRow}>
                    <View style={styles.categoryLabel}>
                      <Text style={styles.categoryIcon}>{cat.icon}</Text>
                      <Text style={styles.categoryName} numberOfLines={1}>{cat.label}</Text>
                    </View>
                    <AnimatedProgressBar
                      progress={cat.percentage / 100}
                      color="#D4522A"
                      trackColor="#E2DED8"
                      height={8}
                      style={{ flex: 1, borderRadius: 4 }}
                    />
                    <Text style={styles.categoryCount}>{cat.count}</Text>
                  </View>
                ))}
              </InsightCard>
            )}

            {/* Check-In Trends */}
            {insights.checkInTrend.length > 0 && (
              <InsightCard icon={<Icon name="heartbeat" size="md" color="#D4522A" />} title="Weekly Check-In" accentColor="#c97474" delay={450}>
                {(['connection', 'communication', 'satisfaction'] as const).map((dim) => {
                  const scores = insights.checkInTrend
                    .map(w => w[dim])
                    .filter((s): s is number => s !== null);
                  if (scores.length === 0) return null;
                  const avg = Math.round((scores.reduce((a, b) => a + b, 0) / scores.length) * 10) / 10;
                  const latest = scores[scores.length - 1];
                  const label = dim.charAt(0).toUpperCase() + dim.slice(1);
                  return (
                    <View key={dim} style={styles.checkInDimRow}>
                      <Text style={styles.checkInDimLabel}>{label}</Text>
                      <View style={styles.checkInScoreRow}>
                        {insights.checkInTrend.map((w, i) => {
                          const score = w[dim];
                          if (score === null) return (
                            <View key={i} style={styles.checkInDot}>
                              <View style={[styles.checkInDotInner, styles.checkInDotEmpty]} />
                            </View>
                          );
                          return (
                            <View key={i} style={styles.checkInDot}>
                              <View style={[
                                styles.checkInDotInner,
                                { opacity: 0.3 + (score / 5) * 0.7 },
                              ]} />
                            </View>
                          );
                        })}
                        <Text style={styles.checkInAvgText}>{avg.toFixed(1)}</Text>
                      </View>
                    </View>
                  );
                })}
                <Text style={styles.checkInFooter}>
                  Based on your last {insights.checkInTrend.length} check-in{insights.checkInTrend.length !== 1 ? 's' : ''}
                </Text>
              </InsightCard>
            )}

            {/* Streak & Consistency */}
            <InsightCard icon={<Icon name="flame" size="md" color="#D4522A" weight="fill" />} title="Streak & Consistency" delay={500}>
              <View style={styles.streakRow}>
                <View style={styles.streakStat}>
                  <AnimatedCounter value={insights.currentStreak} style={styles.streakValue} />
                  <Text style={styles.streakStatLabel}>Current</Text>
                </View>
                <View style={styles.streakDivider} />
                <View style={styles.streakStat}>
                  <AnimatedCounter value={insights.longestStreak} style={styles.streakValue} />
                  <Text style={styles.streakStatLabel}>Longest</Text>
                </View>
              </View>
              <View style={styles.weeklyRateRow}>
                <Text style={styles.weeklyRateLabel}>This week</Text>
                <AnimatedProgressBar
                  progress={Math.min(insights.weeklyCompletionRate, 1)}
                  color="#D4522A"
                  trackColor="#E2DED8"
                  height={8}
                  style={{ flex: 1, borderRadius: 4 }}
                />
                <Text style={styles.weeklyRateText}>
                  {Math.round(insights.weeklyCompletionRate * 100)}%
                </Text>
              </View>
              {insights.totalWeeksActive > 0 && (
                <Text style={styles.weeksActiveText}>
                  {insights.totalWeeksActive} {insights.totalWeeksActive === 1 ? 'week' : 'weeks'} of growing together
                </Text>
              )}
            </InsightCard>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F2EE',
  },
  header: {
    paddingHorizontal: 24,
    paddingTop: 32,
    paddingBottom: 16,
  },
  title: {
    fontSize: 28,
    fontWeight: '900',
    fontFamily: 'Nunito-Black',
    color: '#1E1E2E',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 24,
    paddingTop: 4,
    paddingBottom: 40,
    gap: 20,
  },

  // Hero Stats
  heroRow: {
    flexDirection: 'row',
    gap: 12,
  },
  statPill: {
    flex: 1,
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderRadius: 16,
    paddingVertical: 20,
    shadowColor: '#1E1E2E',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 1,
  },
  statValue: {
    fontSize: 24,
    fontWeight: '800',
    fontFamily: 'Nunito-Bold',
    color: '#D4522A',
  },
  statLabel: {
    fontSize: 12,
    color: '#6B6B7A',
    marginTop: 4,
    fontWeight: '500',
    fontFamily: 'Nunito-SemiBold',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },

  // Milestones
  badgeScroll: {
    marginHorizontal: -4,
    marginBottom: 16,
  },
  badgeScrollContent: {
    paddingHorizontal: 4,
    gap: 16,
  },
  badge: {
    alignItems: 'center',
    width: 56,
  },
  badgeCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#FDF1ED',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#D4522A',
    marginBottom: 6,
  },
  badgeCircleLocked: {
    backgroundColor: '#E2DED8',
    borderColor: '#d6d3d1',
    borderStyle: 'dashed',
  },
  badgeIcon: {
    fontSize: 18,
  },
  badgeIconLocked: {
    fontSize: 18,
    opacity: 0.4,
  },
  badgeTitle: {
    fontSize: 10,
    fontWeight: '600',
    color: '#6B6B7A',
    textAlign: 'center',
  },
  badgeTitleLocked: {
    color: '#B8B8C4',
  },
  lockOverlay: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: '#ffffff',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  lockIcon: {
    fontSize: 8,
  },
  nextMilestone: {
    backgroundColor: '#F5F2EE',
    borderRadius: 12,
    padding: 14,
  },
  nextMilestoneHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  nextMilestoneLabel: {
    fontSize: 10,
    fontWeight: '500',
    fontFamily: 'Nunito-SemiBold',
    color: '#D4522A',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  nextMilestoneTitle: {
    fontSize: 14,
    fontWeight: '600',
    fontFamily: 'Nunito-Bold',
    color: '#1E1E2E',
  },
  nextMilestoneDesc: {
    fontSize: 12,
    color: '#6B6B7A',
    fontFamily: 'Nunito-Regular',
    marginBottom: 10,
  },
  nextMilestoneBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  nextMilestoneTrack: {
    flex: 1,
    height: 6,
    backgroundColor: '#E2DED8',
    borderRadius: 3,
    overflow: 'hidden',
  },
  nextMilestoneFill: {
    height: 6,
    backgroundColor: '#D4522A',
    borderRadius: 3,
  },
  nextMilestoneCount: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6B6B7A',
  },
  anniversarySection: {
    marginTop: 14,
    paddingTop: 14,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#E2DED8',
  },
  anniversaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  anniversaryText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#6B6B7A',
    textAlign: 'center',
  },

  // Love Languages
  loveLanguageRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: 8,
  },
  loveLanguageItem: {
    alignItems: 'center',
    flex: 1,
  },
  loveLanguageCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#E2DED8',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
    borderWidth: 2,
    borderColor: '#E2DED8',
  },
  loveLanguageCircleSet: {
    backgroundColor: '#FDF1ED',
    borderColor: '#D4522A',
  },
  loveLanguageCirclePartner: {
    backgroundColor: '#faf8f5',
    borderColor: '#3D2870',
  },
  loveLanguageEmoji: {
    fontSize: 24,
  },
  loveLanguageWho: {
    fontSize: 10,
    fontWeight: '700',
    color: '#B8B8C4',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  loveLanguageName: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6B6B7A',
    textAlign: 'center',
  },
  loveLanguageSetLink: {
    fontSize: 12,
    color: '#D4522A',
    fontWeight: '500',
    marginTop: 4,
  },

  // Emotional Journey
  emotionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 8,
  },
  weekLabel: {
    width: 32,
    fontSize: 12,
    color: '#6B6B7A',
    fontWeight: '500',
    fontFamily: 'Nunito-SemiBold',
  },
  barContainer: {
    flex: 1,
    flexDirection: 'row',
    height: 12,
    borderRadius: 6,
    overflow: 'hidden',
    gap: 1,
  },
  barSegment: {
    height: 12,
  },
  barPositive: {
    backgroundColor: '#22c55e',
  },
  barNeutral: {
    backgroundColor: '#f59e0b',
  },
  barNegative: {
    backgroundColor: '#ef4444',
  },
  barEmpty: {
    backgroundColor: '#E2DED8',
  },
  legend: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 20,
    marginTop: 12,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  legendText: {
    fontSize: 12,
    color: '#6B6B7A',
    fontFamily: 'Nunito-Regular',
  },
  sentimentSummary: {
    textAlign: 'center',
    fontSize: 13,
    color: '#6B6B7A',
    marginTop: 12,
    fontStyle: 'italic',
  },
  cardEmpty: {
    fontSize: 14,
    color: '#B8B8C4',
    textAlign: 'center',
    paddingVertical: 8,
  },

  // Communication
  commStatRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#E2DED8',
  },
  commStatRowLast: {
    borderBottomWidth: 0,
  },
  commStatLabel: {
    fontSize: 14,
    color: '#6B6B7A',
    fontFamily: 'Nunito-Regular',
  },
  commStatValue: {
    fontSize: 16,
    fontWeight: '600',
    fontFamily: 'Nunito-Bold',
    color: '#1E1E2E',
  },
  trendRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'flex-end',
    height: 80,
    marginTop: 16,
    paddingTop: 12,
  },
  trendColumn: {
    alignItems: 'center',
    flex: 1,
  },
  trendBar: {
    width: 24,
    backgroundColor: '#D4522A',
    borderRadius: 4,
    minHeight: 4,
  },
  trendWeekLabel: {
    fontSize: 10,
    color: '#B8B8C4',
    marginTop: 6,
  },

  // Prompt Categories
  categoryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 12,
  },
  categoryLabel: {
    width: 100,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  categoryIcon: {
    fontSize: 14,
  },
  categoryName: {
    fontSize: 12,
    color: '#6B6B7A',
    fontWeight: '500',
    flex: 1,
  },
  categoryBarTrack: {
    flex: 1,
    height: 8,
    backgroundColor: '#E2DED8',
    borderRadius: 4,
    overflow: 'hidden',
  },
  categoryBarFill: {
    height: 8,
    backgroundColor: '#D4522A',
    borderRadius: 4,
  },
  categoryCount: {
    width: 24,
    fontSize: 12,
    fontWeight: '600',
    color: '#6B6B7A',
    textAlign: 'right',
  },

  // Streak & Consistency
  streakRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  streakStat: {
    flex: 1,
    alignItems: 'center',
  },
  streakValue: {
    fontSize: 32,
    fontWeight: '800',
    fontFamily: 'Nunito-Bold',
    color: '#D4522A',
  },
  streakStatLabel: {
    fontSize: 12,
    color: '#6B6B7A',
    fontWeight: '500',
    fontFamily: 'Nunito-SemiBold',
    marginTop: 4,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  streakDivider: {
    width: 1,
    height: 40,
    backgroundColor: '#E2DED8',
  },
  weeklyRateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  weeklyRateLabel: {
    fontSize: 13,
    color: '#6B6B7A',
    width: 70,
  },
  weeklyRateTrack: {
    flex: 1,
    height: 8,
    backgroundColor: '#E2DED8',
    borderRadius: 4,
    overflow: 'hidden',
  },
  weeklyRateFill: {
    height: 8,
    backgroundColor: '#D4522A',
    borderRadius: 4,
  },
  weeklyRateText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#6B6B7A',
    width: 36,
    textAlign: 'right',
  },
  weeksActiveText: {
    textAlign: 'center',
    fontSize: 13,
    color: '#B8B8C4',
    marginTop: 16,
    fontStyle: 'italic',
  },

  // Check-In Trends
  checkInDimRow: {
    marginBottom: 14,
  },
  checkInDimLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#6B6B7A',
    marginBottom: 6,
  },
  checkInScoreRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  checkInDot: {
    width: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkInDotInner: {
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: '#D4522A',
  },
  checkInDotEmpty: {
    backgroundColor: '#E2DED8',
    opacity: 1,
  },
  checkInAvgText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#6B6B7A',
    marginLeft: 4,
  },
  checkInFooter: {
    textAlign: 'center',
    fontSize: 12,
    color: '#B8B8C4',
    marginTop: 8,
    fontStyle: 'italic',
  },

  // Empty State
  empty: {
    alignItems: 'center',
    paddingTop: 80,
    paddingHorizontal: 32,
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '900',
    fontFamily: 'Nunito-Black',
    color: '#1E1E2E',
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 15,
    color: '#6B6B7A',
    fontFamily: 'Nunito-Regular',
    textAlign: 'center',
    lineHeight: 22,
  },

  // Skeleton
  skeletonContainer: {
    gap: 20,
  },
  skeletonCard: {
    backgroundColor: '#ffffff',
    borderRadius: 20,
    padding: 24,
    shadowColor: '#1E1E2E',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 2,
  },
});
