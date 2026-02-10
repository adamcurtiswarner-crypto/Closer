import React, { useEffect, useMemo } from 'react';
import { View, Text, ScrollView, TouchableOpacity, RefreshControl, StyleSheet } from 'react-native';
import Animated, { FadeIn, FadeInUp } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useInsights, formatWeekLabel } from '@/hooks/useInsights';
import { useCouple } from '@/hooks/useCouple';
import { InsightCard } from '@/components/InsightCard';
import { Skeleton } from '@/components/Skeleton';
import { logEvent } from '@/services/analytics';
import { getMilestoneStatus, getAnniversaryCountdown } from '@/config/milestones';
import type { MilestoneCheckData } from '@/config/milestones';
import { getLoveLanguageDisplay } from '@/config/loveLanguages';
import { useAuth } from '@/hooks/useAuth';
import { useQuery } from '@tanstack/react-query';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/config/firebase';
import { router } from 'expo-router';

function StatPill({ value, label }: { value: number; label: string }) {
  return (
    <View style={styles.statPill}>
      <Text style={styles.statValue}>{value}</Text>
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
  return (
    <View style={styles.empty}>
      <Text style={styles.emptyIcon}>{'\uD83D\uDD2D'}</Text>
      <Text style={styles.emptyTitle}>Your insights are brewing</Text>
      <Text style={styles.emptySubtitle}>
        Complete a few prompts together and your relationship insights will appear here.
      </Text>
    </View>
  );
}

export default function InsightsScreen() {
  const { user } = useAuth();
  const { data: insights, isLoading, refetch, isRefetching } = useInsights();
  const { data: couple } = useCouple();

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
    const checkData: MilestoneCheckData = {
      totalCompletions: insights.totalCompletions,
      longestStreak: insights.longestStreak,
      daysAsCouple: insights.daysAsCouple,
      memoriesSaved: insights.memoriesSaved,
    };
    return getMilestoneStatus(checkData);
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
        <Text style={styles.title}>Insights</Text>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isRefetching}
            onRefresh={refetch}
            tintColor="#c97454"
          />
        }
      >
        {isLoading ? (
          <InsightsSkeleton />
        ) : !insights || insights.totalCompletions === 0 ? (
          <EmptyState />
        ) : (
          <>
            {/* Hero Stats */}
            <Animated.View entering={FadeIn.duration(400)} style={styles.heroRow}>
              <StatPill value={insights.totalCompletions} label="Prompts" />
              <StatPill value={insights.daysAsCouple} label="Days" />
              <StatPill value={insights.memoriesSaved} label="Memories" />
            </Animated.View>

            {/* Milestones */}
            {milestones && (
              <InsightCard icon={'\uD83C\uDFC6'} title="Milestones" accentColor="#b8860b" delay={50}>
                {/* Achieved badges */}
                {milestones.achieved.length > 0 && (
                  <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    style={styles.badgeScroll}
                    contentContainerStyle={styles.badgeScrollContent}
                  >
                    {milestones.achieved.map((m) => (
                      <View key={m.id} style={styles.badge}>
                        <View style={styles.badgeCircle}>
                          <Text style={styles.badgeIcon}>{m.icon}</Text>
                        </View>
                        <Text style={styles.badgeTitle} numberOfLines={1}>{m.title}</Text>
                      </View>
                    ))}
                    {milestones.upcoming.slice(0, 2).map((m) => (
                      <View key={m.id} style={styles.badge}>
                        <View style={[styles.badgeCircle, styles.badgeCircleLocked]}>
                          <Text style={styles.badgeIconLocked}>{m.icon}</Text>
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
                      <View style={styles.nextMilestoneTrack}>
                        <View
                          style={[
                            styles.nextMilestoneFill,
                            { width: `${Math.round((milestones.next.current / milestones.next.threshold) * 100)}%` },
                          ]}
                        />
                      </View>
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
                      <Text style={styles.anniversaryText}>
                        {'\uD83C\uDF89'} Happy Anniversary!
                      </Text>
                    ) : (
                      <Text style={styles.anniversaryText}>
                        {'\uD83D\uDCC5'} {anniversary.days} {anniversary.days === 1 ? 'day' : 'days'} until your anniversary
                      </Text>
                    )}
                  </View>
                )}

                {/* Empty state for brand new users */}
                {milestones.achieved.length === 0 && !milestones.next && (
                  <Text style={styles.cardEmpty}>
                    Complete prompts together to earn milestones.
                  </Text>
                )}
              </InsightCard>
            )}

            {/* Love Languages */}
            <InsightCard icon={'\u2764\uFE0F'} title="Love Languages" accentColor="#c97474" delay={75}>
              <View style={styles.loveLanguageRow}>
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
              </View>
            </InsightCard>

            {/* Emotional Journey */}
            <InsightCard icon={'\u2600\uFE0F'} title="Emotional Journey" delay={200}>
              {insights.emotionalJourney.some((w) => w.total > 0) ? (
                <>
                  {insights.emotionalJourney.map((week) => (
                    <View key={week.week} style={styles.emotionRow}>
                      <Text style={styles.weekLabel}>{formatWeekLabel(week.week)}</Text>
                      {week.total > 0 ? (
                        <View style={styles.barContainer}>
                          {week.positive > 0 && (
                            <View style={[styles.barSegment, styles.barPositive, { flex: week.positive }]} />
                          )}
                          {week.neutral > 0 && (
                            <View style={[styles.barSegment, styles.barNeutral, { flex: week.neutral }]} />
                          )}
                          {week.negative > 0 && (
                            <View style={[styles.barSegment, styles.barNegative, { flex: week.negative }]} />
                          )}
                        </View>
                      ) : (
                        <View style={styles.barContainer}>
                          <View style={[styles.barSegment, styles.barEmpty, { flex: 1 }]} />
                        </View>
                      )}
                    </View>
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
            <InsightCard icon={'\uD83D\uDCAC'} title="Communication" accentColor="#8b7355" delay={300}>
              <View style={styles.commStatRow}>
                <Text style={styles.commStatLabel}>Avg. response length</Text>
                <Text style={styles.commStatValue}>~{insights.avgResponseWords} words</Text>
              </View>
              <View style={[styles.commStatRow, styles.commStatRowLast]}>
                <Text style={styles.commStatLabel}>Talked about it after</Text>
                <Text style={styles.commStatValue}>{insights.talkedAboutItRate}%</Text>
              </View>
              {insights.responseLengthTrend.some((w) => w.avgWords > 0) && (
                <View style={styles.trendRow}>
                  {insights.responseLengthTrend.map((w) => {
                    const maxWords = Math.max(...insights.responseLengthTrend.map((t) => t.avgWords), 1);
                    const height = w.avgWords > 0
                      ? 20 + (w.avgWords / maxWords) * 40
                      : 4;
                    return (
                      <View key={w.week} style={styles.trendColumn}>
                        <View style={[styles.trendBar, { height }]} />
                        <Text style={styles.trendWeekLabel}>{formatWeekLabel(w.week)}</Text>
                      </View>
                    );
                  })}
                </View>
              )}
            </InsightCard>

            {/* Prompt Categories */}
            {insights.promptCategories.length > 0 && (
              <InsightCard icon={'\uD83C\uDFAF'} title="Prompt Categories" accentColor="#7b6fa0" delay={400}>
                {insights.promptCategories.map((cat) => (
                  <View key={cat.type} style={styles.categoryRow}>
                    <View style={styles.categoryLabel}>
                      <Text style={styles.categoryIcon}>{cat.icon}</Text>
                      <Text style={styles.categoryName} numberOfLines={1}>{cat.label}</Text>
                    </View>
                    <View style={styles.categoryBarTrack}>
                      <View style={[styles.categoryBarFill, { width: `${cat.percentage}%` }]} />
                    </View>
                    <Text style={styles.categoryCount}>{cat.count}</Text>
                  </View>
                ))}
              </InsightCard>
            )}

            {/* Streak & Consistency */}
            <InsightCard icon={'\uD83D\uDD25'} title="Streak & Consistency" delay={500}>
              <View style={styles.streakRow}>
                <View style={styles.streakStat}>
                  <Text style={styles.streakValue}>{insights.currentStreak}</Text>
                  <Text style={styles.streakStatLabel}>Current</Text>
                </View>
                <View style={styles.streakDivider} />
                <View style={styles.streakStat}>
                  <Text style={styles.streakValue}>{insights.longestStreak}</Text>
                  <Text style={styles.streakStatLabel}>Longest</Text>
                </View>
              </View>
              <View style={styles.weeklyRateRow}>
                <Text style={styles.weeklyRateLabel}>This week</Text>
                <View style={styles.weeklyRateTrack}>
                  <View
                    style={[
                      styles.weeklyRateFill,
                      { width: `${Math.min(Math.round(insights.weeklyCompletionRate * 100), 100)}%` },
                    ]}
                  />
                </View>
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
    backgroundColor: '#fafaf9',
  },
  header: {
    paddingHorizontal: 24,
    paddingTop: 32,
    paddingBottom: 16,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#1c1917',
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
    shadowColor: '#1c1917',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 1,
  },
  statValue: {
    fontSize: 24,
    fontWeight: '800',
    color: '#c97454',
  },
  statLabel: {
    fontSize: 12,
    color: '#78716c',
    marginTop: 4,
    fontWeight: '500',
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
    backgroundColor: '#fef7f4',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#c97454',
    marginBottom: 6,
  },
  badgeCircleLocked: {
    backgroundColor: '#f5f5f4',
    borderColor: '#e7e5e4',
  },
  badgeIcon: {
    fontSize: 18,
  },
  badgeIconLocked: {
    fontSize: 18,
    opacity: 0.3,
  },
  badgeTitle: {
    fontSize: 10,
    fontWeight: '600',
    color: '#57534e',
    textAlign: 'center',
  },
  badgeTitleLocked: {
    color: '#a8a29e',
  },
  nextMilestone: {
    backgroundColor: '#fafaf9',
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
    fontWeight: '700',
    color: '#c97454',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  nextMilestoneTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1c1917',
  },
  nextMilestoneDesc: {
    fontSize: 12,
    color: '#78716c',
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
    backgroundColor: '#e7e5e4',
    borderRadius: 3,
    overflow: 'hidden',
  },
  nextMilestoneFill: {
    height: 6,
    backgroundColor: '#c97454',
    borderRadius: 3,
  },
  nextMilestoneCount: {
    fontSize: 12,
    fontWeight: '600',
    color: '#78716c',
  },
  anniversarySection: {
    marginTop: 14,
    paddingTop: 14,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#e7e5e4',
  },
  anniversaryText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#57534e',
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
    backgroundColor: '#f5f5f4',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
    borderWidth: 2,
    borderColor: '#e7e5e4',
  },
  loveLanguageCircleSet: {
    backgroundColor: '#fef7f4',
    borderColor: '#c97454',
  },
  loveLanguageCirclePartner: {
    backgroundColor: '#faf8f5',
    borderColor: '#8b7355',
  },
  loveLanguageEmoji: {
    fontSize: 24,
  },
  loveLanguageWho: {
    fontSize: 10,
    fontWeight: '700',
    color: '#a8a29e',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  loveLanguageName: {
    fontSize: 12,
    fontWeight: '600',
    color: '#57534e',
    textAlign: 'center',
  },
  loveLanguageSetLink: {
    fontSize: 12,
    color: '#c97454',
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
    color: '#78716c',
    fontWeight: '500',
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
    backgroundColor: '#f5f5f4',
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
    color: '#78716c',
  },
  sentimentSummary: {
    textAlign: 'center',
    fontSize: 13,
    color: '#57534e',
    marginTop: 12,
    fontStyle: 'italic',
  },
  cardEmpty: {
    fontSize: 14,
    color: '#a8a29e',
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
    borderBottomColor: '#e7e5e4',
  },
  commStatRowLast: {
    borderBottomWidth: 0,
  },
  commStatLabel: {
    fontSize: 14,
    color: '#57534e',
  },
  commStatValue: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1c1917',
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
    backgroundColor: '#c97454',
    borderRadius: 4,
    minHeight: 4,
  },
  trendWeekLabel: {
    fontSize: 10,
    color: '#a8a29e',
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
    color: '#57534e',
    fontWeight: '500',
    flex: 1,
  },
  categoryBarTrack: {
    flex: 1,
    height: 8,
    backgroundColor: '#f5f5f4',
    borderRadius: 4,
    overflow: 'hidden',
  },
  categoryBarFill: {
    height: 8,
    backgroundColor: '#c97454',
    borderRadius: 4,
  },
  categoryCount: {
    width: 24,
    fontSize: 12,
    fontWeight: '600',
    color: '#78716c',
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
    color: '#c97454',
  },
  streakStatLabel: {
    fontSize: 12,
    color: '#78716c',
    fontWeight: '500',
    marginTop: 4,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  streakDivider: {
    width: 1,
    height: 40,
    backgroundColor: '#e7e5e4',
  },
  weeklyRateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  weeklyRateLabel: {
    fontSize: 13,
    color: '#57534e',
    width: 70,
  },
  weeklyRateTrack: {
    flex: 1,
    height: 8,
    backgroundColor: '#f5f5f4',
    borderRadius: 4,
    overflow: 'hidden',
  },
  weeklyRateFill: {
    height: 8,
    backgroundColor: '#c97454',
    borderRadius: 4,
  },
  weeklyRateText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#78716c',
    width: 36,
    textAlign: 'right',
  },
  weeksActiveText: {
    textAlign: 'center',
    fontSize: 13,
    color: '#a8a29e',
    marginTop: 16,
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
    fontWeight: '600',
    color: '#1c1917',
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 15,
    color: '#78716c',
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
    shadowColor: '#1c1917',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 2,
  },
});
