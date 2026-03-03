import React from 'react';
import { StyleSheet } from 'react-native';
import Animated, { FadeInUp } from 'react-native-reanimated';
import { GoalTracker, AddGoalModal, WishlistCard, AddWishlistModal, ExploreCategoryRow } from '@components';
import { DateNightCard } from '@/components/DateNightCard';

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
      <ExploreCategoryRow />

      <Animated.View entering={FadeInUp.duration(500).delay(animationBaseDelay)} style={styles.section}>
        <GoalTracker onAddGoal={onOpenGoalModal} />
      </Animated.View>

      <Animated.View entering={FadeInUp.duration(500).delay(animationBaseDelay + 200)} style={styles.section}>
        <WishlistCard onAddItem={onOpenWishlistModal} />
      </Animated.View>

      <Animated.View entering={FadeInUp.duration(500).delay(animationBaseDelay + 400)} style={styles.section}>
        <DateNightCard />
      </Animated.View>

      <AddGoalModal
        visible={showAddGoalModal}
        onClose={onCloseGoalModal}
      />
      <AddWishlistModal
        visible={showAddWishlistModal}
        onClose={onCloseWishlistModal}
      />
    </>
  );
}

const styles = StyleSheet.create({
  section: {
    marginTop: 24,
  },
});
