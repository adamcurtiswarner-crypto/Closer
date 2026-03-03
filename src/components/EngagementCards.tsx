import React from 'react';
import Animated, { FadeInUp } from 'react-native-reanimated';
import { CheckInCard, CoachingCard } from '@components';

interface CoachingInsight {
  id?: string;
  insightText: string;
  actionType: string;
  actionText: string;
  dismissedAt?: Date | null;
}

interface EngagementCardsProps {
  hasPendingCheckIn: boolean;
  partnerName: string;
  onCheckInSubmit: (responses: any) => void;
  onCheckInDismiss: () => void;
  isPremium: boolean;
  latestInsight: CoachingInsight | null | undefined;
  onCoachingAction: () => void;
  onCoachingDismiss: () => void;
}

export function EngagementCards({
  hasPendingCheckIn,
  partnerName,
  onCheckInSubmit,
  onCheckInDismiss,
  isPremium,
  latestInsight,
  onCoachingAction,
  onCoachingDismiss,
}: EngagementCardsProps) {
  const hasCoachingInsight = isPremium && latestInsight && !latestInsight.dismissedAt;

  if (!hasPendingCheckIn && !hasCoachingInsight) {
    return null;
  }

  return (
    <Animated.View entering={FadeInUp.duration(500).delay(200)} style={{ gap: 16, marginTop: 16 }}>
      {hasPendingCheckIn && (
        <CheckInCard
          partnerName={partnerName}
          onSubmit={onCheckInSubmit}
          onDismiss={onCheckInDismiss}
        />
      )}
      {hasCoachingInsight && latestInsight && (
        <CoachingCard
          insightText={latestInsight.insightText}
          actionType={latestInsight.actionType}
          actionText={latestInsight.actionText}
          onAction={onCoachingAction}
          onDismiss={onCoachingDismiss}
        />
      )}
    </Animated.View>
  );
}
