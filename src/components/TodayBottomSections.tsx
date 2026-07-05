import React from 'react';
import { StyleSheet } from 'react-native';
import Animated, { FadeInUp } from 'react-native-reanimated';
import { GoalTracker, AddGoalModal, WishlistCard, AddWishlistModal, ExploreCategoryRow } from '@components';
import { DateNightCard } from '@/components/DateNightCard';
import { spacing } from '@config/theme';
import { FEATURES } from '@/config/features';

interface TodayBottomSectionsProps {
  showAddGoalModal: boolean;
  onOpenGoalModal: () => void;
  onCloseGoalModal: () => void;
  showAddWishlistModal: boolean;
  onOpenWishlistModal: () => void;
  onCloseWishlistModal: () => void;
  animationBaseDelay?: number;
}

export function TodayBottomSections({
  showAddGoalModal,
  onOpenGoalModal,
  onCloseGoalModal,
  showAddWishlistModal,
  onOpenWishlistModal,
  onCloseWishlistModal,
  animationBaseDelay = 400,
}: TodayBottomSectionsProps) {
  return (
    <>
      {FEATURES.explore && (
        <Animated.View entering={FadeInUp.duration(400).delay(animationBaseDelay)}>
          <ExploreCategoryRow />
        </Animated.View>
      )}

      {FEATURES.goals && (
        <Animated.View entering={FadeInUp.duration(500).delay(animationBaseDelay + 200)} style={styles.section}>
          <GoalTracker onAddGoal={onOpenGoalModal} />
        </Animated.View>
      )}

      {FEATURES.wishlist && (
        <Animated.View entering={FadeInUp.duration(500).delay(animationBaseDelay + 400)} style={styles.section}>
          <WishlistCard onAddItem={onOpenWishlistModal} />
        </Animated.View>
      )}

      {FEATURES.dateNights && (
        <Animated.View entering={FadeInUp.duration(500).delay(animationBaseDelay + 600)} style={styles.section}>
          <DateNightCard />
        </Animated.View>
      )}

      {FEATURES.goals && (
        <AddGoalModal
          visible={showAddGoalModal}
          onClose={onCloseGoalModal}
        />
      )}
      {FEATURES.wishlist && (
        <AddWishlistModal
          visible={showAddWishlistModal}
          onClose={onCloseWishlistModal}
        />
      )}
    </>
  );
}

const styles = StyleSheet.create({
  section: {
    marginTop: spacing.lg,
  },
});
