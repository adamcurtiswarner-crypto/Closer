import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import Animated, { FadeIn, FadeInUp } from 'react-native-reanimated';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { format } from 'date-fns';
import { Icon, Paywall } from '@components';
import type { IconName } from '@components';
import { useAuth } from '@/hooks/useAuth';
import { useCouple } from '@/hooks/useCouple';
import { useCoachingInsight } from '@/hooks/useCoachingInsight';
import { useCoachingHistory } from '@/hooks/useCoachingHistory';
import { useSubscription } from '@/hooks/useSubscription';
import { logEvent } from '@/services/analytics';
import { hapticImpact, ImpactFeedbackStyle } from '@utils/haptics';
import { ConversationStarterModal } from '@/components/ConversationStarterModal';

const TIER_COLORS: Record<string, string> = {
  thriving: '#22c55e',
  steady: '#c97454',
  cooling: '#f59e0b',
  needs_attention: '#ef4444',
};

const TIER_LABELS: Record<string, string> = {
  thriving: 'Thriving',
  steady: 'Steady',
  cooling: 'Cooling',
  needs_attention: 'Needs attention',
};

const ACTION_CONFIG: Record<string, { icon: IconName; label: string }> = {
  goal: { icon: 'target', label: 'Set a goal' },
  date_night: { icon: 'heart', label: 'Plan a date' },
  conversation: { icon: 'chat-circle', label: 'Start a conversation' },
  revisit: { icon: 'clock-counter-clockwise', label: 'Look back' },
  check_in: { icon: 'heart', label: 'Check in' },
};

function StatusIcon({ actedOn, dismissedAt }: { actedOn: Date | null; dismissedAt: Date | null }) {
  if (actedOn) return <Icon name="check" size="xs" color="#22c55e" />;
  if (dismissedAt) return <Icon name="x" size="xs" color="#a8a29e" />;
  return <Icon name="minus" size="xs" color="#d6d3d1" />;
}

export default function CoachingScreen() {
  const { user, refreshUser } = useAuth();
  const { data: couple } = useCouple();
  const { latestInsight, markActedOn, requestInsight } = useCoachingInsight();
  const { data: historyData, fetchNextPage, hasNextPage, isFetchingNextPage } = useCoachingHistory();
  const { isPremium } = useSubscription();
  const [showPaywall, setShowPaywall] = useState(false);
  const [showScoreTooltip, setShowScoreTooltip] = useState(false);
  const [expandedInsightId, setExpandedInsightId] = useState<string | null>(null);
  const [showConversationModal, setShowConversationModal] = useState(false);
  const [conversationStarterText, setConversationStarterText] = useState('');

  const pulseTier = couple?.currentPulseTier || 'steady';
  const pulseScore = couple?.currentPulseScore;
  const tierColor = TIER_COLORS[pulseTier] || TIER_COLORS.steady;
  const tierLabel = TIER_LABELS[pulseTier] || 'Steady';

  useEffect(() => {
    logEvent('coaching_screen_viewed', { pulse_tier: pulseTier });
  }, []);

  // Premium gate — show preview before paywall
  if (!isPremium) {
    return (
      <SafeAreaView style={styles.container}>
        {showPaywall ? (
          <Paywall visible={true} onClose={() => setShowPaywall(false)} />
        ) : (
          <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
            <Animated.View entering={FadeIn.duration(400)} style={styles.header}>
              <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
                <Icon name="arrow-left" size="sm" color="#292524" />
              </TouchableOpacity>
              <Text style={styles.title}>Coaching</Text>
              <View style={[styles.tierPill, { backgroundColor: tierColor + '18' }]}>
                <View style={[styles.tierDot, { backgroundColor: tierColor }]} />
                <Text style={[styles.tierText, { color: tierColor }]}>{tierLabel}</Text>
              </View>
            </Animated.View>

            <Animated.View entering={FadeInUp.duration(500).delay(100)} style={styles.previewCard}>
              <View style={styles.accentBar} />
              <View style={styles.cardHeader}>
                <Icon name="lightbulb" size="sm" color="#c97454" weight="light" />
                <Text style={styles.cardHeaderText}>Weekly insights</Text>
              </View>
              <Text style={styles.previewText}>
                Personalized reflections based on how you and your partner use Stoke together. Updated each week.
              </Text>
              <TouchableOpacity
                style={styles.unlockBtn}
                onPress={() => setShowPaywall(true)}
                activeOpacity={0.8}
              >
                <Icon name="lock" size="sm" color="#ffffff" weight="bold" />
                <Text style={styles.unlockBtnText}>Unlock coaching</Text>
              </TouchableOpacity>
            </Animated.View>

            <Animated.View entering={FadeInUp.duration(500).delay(300)} style={styles.previewFeatures}>
              {[
                { icon: 'sparkle' as const, text: 'Weekly pulse score tracking your connection' },
                { icon: 'lightbulb' as const, text: 'Personalized insights tailored to your relationship' },
                { icon: 'target' as const, text: 'Actionable suggestions to grow together' },
              ].map((item, i) => (
                <View key={i} style={styles.previewFeatureRow}>
                  <Icon name={item.icon} size="sm" color="#c97454" weight="light" />
                  <Text style={styles.previewFeatureText}>{item.text}</Text>
                </View>
              ))}
            </Animated.View>
          </ScrollView>
        )}
      </SafeAreaView>
    );
  }

  const handlePillTap = () => {
    setShowScoreTooltip(!showScoreTooltip);
    if (!showScoreTooltip && pulseScore != null) {
      logEvent('pulse_score_viewed', { score: pulseScore, tier: pulseTier });
    }
  };

  const handleAction = (actionType: string, actionText: string, insightId?: string) => {
    hapticImpact(ImpactFeedbackStyle.Medium);
    if (insightId) {
      markActedOn.mutate(insightId);
      logEvent('coaching_insight_acted', {
        action_type: actionType,
        pulse_tier: pulseTier,
        pulse_score: pulseScore,
        week_id: latestInsight?.id,
      });
      logEvent('coaching_action_confirmed', {
        action_type: actionType,
        insight_id: insightId,
      });
    }

    switch (actionType) {
      case 'goal':
        router.push('/(app)/wishlist');
        break;
      case 'date_night':
        router.push('/(app)/date-nights');
        break;
      case 'conversation':
        if (actionText) {
          setConversationStarterText(actionText);
          setShowConversationModal(true);
        }
        break;
      case 'revisit':
        router.push('/(app)/memories');
        break;
      case 'check_in':
        refreshUser();
        break;
    }
  };

  // Flatten paginated history, skip the latest (shown separately)
  const pastInsights = (historyData?.pages ?? [])
    .flatMap(p => p.items)
    .filter(i => i.id !== latestInsight?.id);

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        {/* Header */}
        <Animated.View entering={FadeIn.duration(400)} style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Icon name="arrow-left" size="sm" color="#292524" />
          </TouchableOpacity>
          <Text style={styles.title}>Coaching</Text>
          <TouchableOpacity onPress={handlePillTap} style={[styles.tierPill, { backgroundColor: tierColor + '18' }]}>
            <View style={[styles.tierDot, { backgroundColor: tierColor }]} />
            <Text style={[styles.tierText, { color: tierColor }]}>{tierLabel}</Text>
          </TouchableOpacity>
        </Animated.View>

        {/* Score tooltip */}
        {showScoreTooltip && pulseScore != null && (
          <Animated.View entering={FadeIn.duration(200)} style={styles.tooltip}>
            <Text style={styles.tooltipText}>Your pulse score: {pulseScore}</Text>
          </Animated.View>
        )}

        {/* Empty state */}
        {!latestInsight && (
          <Animated.View entering={FadeInUp.duration(500).delay(100)} style={styles.emptyState}>
            <Icon name="lightbulb" size="lg" color="#d6d3d1" weight="light" />
            <Text style={styles.emptyTitle}>No insights yet</Text>
            <Text style={styles.emptyBody}>
              Keep using Stoke together and we will share personalized reflections here each week.
            </Text>
            <TouchableOpacity
              style={styles.generateBtn}
              onPress={() => requestInsight.mutate()}
              disabled={requestInsight.isPending}
              activeOpacity={0.8}
            >
              {requestInsight.isPending ? (
                <ActivityIndicator size="small" color="#ffffff" />
              ) : (
                <Text style={styles.generateBtnText}>Generate your first insight</Text>
              )}
            </TouchableOpacity>
          </Animated.View>
        )}

        {/* Current insight */}
        {latestInsight && !latestInsight.dismissedAt && (
          <Animated.View entering={FadeInUp.duration(500).delay(100)} style={styles.currentCard}>
            <View style={styles.accentBar} />
            <View style={styles.cardHeader}>
              <Icon name="lightbulb" size="sm" color="#c97454" weight="light" />
              <Text style={styles.cardHeaderText}>This week</Text>
            </View>
            <Text style={styles.insightText}>{latestInsight.insightText}</Text>

            {latestInsight.actedOn ? (
              <View style={styles.actedRow}>
                <Icon name="check-circle" size="sm" color="#22c55e" weight="fill" />
                <Text style={styles.actedText}>
                  You did this on {format(latestInsight.actedOn, 'EEEE')}
                </Text>
              </View>
            ) : (
              <TouchableOpacity
                style={styles.actionBtn}
                onPress={() => handleAction(latestInsight.actionType, latestInsight.actionText, latestInsight.id)}
                activeOpacity={0.8}
              >
                <Icon
                  name={ACTION_CONFIG[latestInsight.actionType]?.icon || 'chat-circle'}
                  size="sm"
                  color="#ffffff"
                  weight="bold"
                />
                <View style={styles.actionTextWrap}>
                  <Text style={styles.actionLabel}>
                    {ACTION_CONFIG[latestInsight.actionType]?.label || 'Take action'}
                  </Text>
                  <Text style={styles.actionDetail} numberOfLines={2}>
                    {latestInsight.actionText || 'Take a moment to connect today'}
                  </Text>
                </View>
                <Icon name="arrow-right" size="sm" color="#ffffff" />
              </TouchableOpacity>
            )}
          </Animated.View>
        )}

        {/* Past insights */}
        {pastInsights.length > 0 && (
          <Animated.View entering={FadeInUp.duration(500).delay(300)}>
            <Text style={styles.sectionHeader}>Past insights</Text>
            {pastInsights.map((insight) => (
              <TouchableOpacity
                key={insight.id}
                style={styles.pastRow}
                onPress={() => setExpandedInsightId(
                  expandedInsightId === insight.id ? null : insight.id
                )}
                activeOpacity={0.7}
              >
                <View style={styles.pastRowTop}>
                  <Text style={styles.pastDate}>
                    {format(insight.createdAt, 'MMM d')}
                  </Text>
                  <Text style={styles.pastPreview} numberOfLines={expandedInsightId === insight.id ? 0 : 1}>
                    {insight.insightText}
                  </Text>
                  <StatusIcon actedOn={insight.actedOn} dismissedAt={insight.dismissedAt} />
                </View>
                {expandedInsightId === insight.id && (
                  <Animated.View entering={FadeIn.duration(200)} style={styles.pastExpanded}>
                    <Text style={styles.pastFullText}>{insight.insightText}</Text>
                    <View style={styles.pastActionRow}>
                      <Icon
                        name={ACTION_CONFIG[insight.actionType]?.icon || 'chat-circle'}
                        size="xs"
                        color="#78716c"
                      />
                      <Text style={styles.pastActionText}>{insight.actionText || 'Take a moment to connect today'}</Text>
                    </View>
                    {insight.actedOn && (
                      <Text style={styles.pastActedDate}>
                        Acted on {format(insight.actedOn, 'MMM d')}
                      </Text>
                    )}
                  </Animated.View>
                )}
              </TouchableOpacity>
            ))}

            {hasNextPage && (
              <TouchableOpacity
                style={styles.loadMoreBtn}
                onPress={() => fetchNextPage()}
                disabled={isFetchingNextPage}
              >
                {isFetchingNextPage ? (
                  <ActivityIndicator size="small" color="#c97454" />
                ) : (
                  <Text style={styles.loadMoreText}>Load more</Text>
                )}
              </TouchableOpacity>
            )}
          </Animated.View>
        )}

        {/* Disclaimer */}
        <View style={styles.disclaimerWrap}>
          <Text style={styles.disclaimerText}>
            Stoke offers reflections based on your activity together, not clinical or therapeutic advice. This is not a substitute for professional counseling. If you need support, please consult a licensed therapist or counselor.
          </Text>
        </View>
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
    backgroundColor: '#fef7f4',
  },
  scrollView: {
    flex: 1,
    paddingHorizontal: 24,
  },
  scrollContent: {
    paddingTop: 16,
    paddingBottom: 40,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
    gap: 12,
  },
  backBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#f5f5f4',
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: '600',
    fontFamily: 'Alexandria-SemiBold',
    color: '#1c1917',
    letterSpacing: -0.5,
    flex: 1,
  },
  tierPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    gap: 6,
  },
  tierDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  tierText: {
    fontSize: 13,
    fontWeight: '600',
    fontFamily: 'Inter-SemiBold',
  },
  tooltip: {
    alignSelf: 'flex-end',
    backgroundColor: '#292524',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    marginBottom: 12,
    marginTop: -16,
  },
  tooltipText: {
    color: '#ffffff',
    fontSize: 12,
    fontFamily: 'Inter-Medium',
  },
  currentCard: {
    backgroundColor: '#ffffff',
    borderRadius: 20,
    padding: 24,
    paddingTop: 20,
    overflow: 'hidden',
    shadowColor: '#1c1917',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 2,
    marginBottom: 24,
  },
  accentBar: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 3,
    backgroundColor: '#c97454',
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 16,
  },
  cardHeaderText: {
    fontSize: 15,
    fontWeight: '600',
    fontFamily: 'Alexandria-SemiBold',
    color: '#292524',
    letterSpacing: -0.3,
  },
  insightText: {
    fontSize: 15,
    fontFamily: 'Inter-Regular',
    color: '#57534e',
    lineHeight: 22,
    marginBottom: 16,
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#c97454',
    borderRadius: 14,
    padding: 16,
  },
  actionTextWrap: {
    flex: 1,
  },
  actionLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: 'rgba(255,255,255,0.7)',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
    marginBottom: 2,
  },
  actionDetail: {
    fontSize: 14,
    fontWeight: '600',
    fontFamily: 'Inter-SemiBold',
    color: '#ffffff',
    lineHeight: 19,
  },
  actedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 12,
  },
  actedText: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#a8a29e',
  },
  sectionHeader: {
    fontSize: 15,
    fontWeight: '600',
    fontFamily: 'Alexandria-SemiBold',
    color: '#78716c',
    letterSpacing: -0.3,
    marginBottom: 12,
  },
  pastRow: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 8,
  },
  pastRowTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  pastDate: {
    fontSize: 13,
    fontFamily: 'Inter-Medium',
    color: '#78716c',
    width: 48,
  },
  pastPreview: {
    flex: 1,
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#57534e',
    lineHeight: 19,
  },
  pastExpanded: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#f5f5f4',
  },
  pastFullText: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#57534e',
    lineHeight: 20,
    marginBottom: 8,
  },
  pastActionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  pastActionText: {
    fontSize: 13,
    fontFamily: 'Inter-Regular',
    color: '#78716c',
  },
  pastActedDate: {
    fontSize: 12,
    fontFamily: 'Inter-Regular',
    color: '#a8a29e',
    marginTop: 4,
  },
  loadMoreBtn: {
    alignItems: 'center',
    paddingVertical: 16,
  },
  loadMoreText: {
    fontSize: 14,
    fontFamily: 'Inter-Medium',
    color: '#c97454',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 64,
    paddingHorizontal: 32,
    gap: 12,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    fontFamily: 'Alexandria-SemiBold',
    color: '#78716c',
    letterSpacing: -0.3,
  },
  emptyBody: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#a8a29e',
    textAlign: 'center',
    lineHeight: 20,
  },
  generateBtn: {
    marginTop: 16,
    backgroundColor: '#c97454',
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 14,
    minWidth: 200,
    alignItems: 'center',
  },
  generateBtnText: {
    fontSize: 15,
    fontWeight: '600',
    fontFamily: 'Inter-SemiBold',
    color: '#ffffff',
  },
  previewCard: {
    backgroundColor: '#ffffff',
    borderRadius: 20,
    padding: 24,
    paddingTop: 20,
    overflow: 'hidden',
    shadowColor: '#1c1917',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 2,
    marginBottom: 24,
  },
  previewText: {
    fontSize: 15,
    fontFamily: 'Inter-Regular',
    color: '#57534e',
    lineHeight: 22,
    marginBottom: 20,
  },
  unlockBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    backgroundColor: '#c97454',
    borderRadius: 14,
    padding: 16,
  },
  unlockBtnText: {
    fontSize: 16,
    fontWeight: '600',
    fontFamily: 'Inter-SemiBold',
    color: '#ffffff',
  },
  previewFeatures: {
    gap: 16,
    paddingHorizontal: 4,
  },
  previewFeatureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  previewFeatureText: {
    flex: 1,
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#57534e',
    lineHeight: 20,
  },
  disclaimerWrap: {
    marginTop: 32,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#f5f5f4',
  },
  disclaimerText: {
    fontSize: 11,
    fontFamily: 'Inter-Regular',
    color: '#a8a29e',
    textAlign: 'center',
    lineHeight: 16,
  },
});
