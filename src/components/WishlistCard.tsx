import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import Animated, { FadeIn, FadeInUp } from 'react-native-reanimated';
import { hapticImpact } from '@utils/haptics';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import {
  useWishlistItems,
  useToggleWishlistItem,
  type WishlistItem,
} from '@/hooks/useWishlist';
import { getCategoryDisplay } from '@/config/wishlistCategories';
import { AnimatedCheckbox } from './AnimatedCheckbox';
import { Icon } from './Icon';
import { WishlistCardSkeleton } from './Skeleton';

import { colors, spacing, typography } from '@/config/theme';
interface WishlistCardProps {
  onAddItem: () => void;
}

export function WishlistCard({ onAddItem }: WishlistCardProps) {
  const { t } = useTranslation();
  const { data: items, isLoading } = useWishlistItems();
  const toggleItem = useToggleWishlistItem();

  const activeItems = items?.filter((i) => !i.isCompleted) ?? [];
  const completedCount = items?.filter((i) => i.isCompleted).length ?? 0;
  const totalCount = items?.length ?? 0;
  const previewItems = activeItems.slice(0, 3);

  const handleToggle = (item: WishlistItem) => {
    hapticImpact();
    toggleItem.mutate({
      itemId: item.id,
      isCurrentlyCompleted: item.isCompleted,
    });
  };

  const handleSeeAll = () => {
    hapticImpact();
    router.push('/(app)/wishlist');
  };

  if (isLoading) {
    return <WishlistCardSkeleton />;
  }

  return (
    <View style={styles.card}>
      {/* Accent bar */}

      {/* Header */}
      <Animated.View entering={FadeIn.duration(400)} style={styles.header}>
        <View style={styles.headerLeft}>
          <Icon name="sparkle" size="sm" color={colors.accent.primary} weight="regular" />
          <Text style={styles.headerTitle}>{t('wishlist.title')}</Text>
        </View>
        {totalCount > 0 && (
          <View style={styles.countBadge}>
            <Text style={styles.countText}>
              {completedCount}/{totalCount}
            </Text>
          </View>
        )}
      </Animated.View>

      {/* Empty state */}
      {totalCount === 0 && (
        <Animated.View entering={FadeInUp.duration(400).delay(100)} style={styles.emptyState}>
          <Icon name="star" size="lg" color={colors.accent.primary} weight="light" />
          <Text style={styles.emptyTitle}>{t('wishlist.dreamTogether')}</Text>
          <Text style={styles.emptySubtitle}>{t('wishlist.emptySubtitle')}</Text>
        </Animated.View>
      )}

      {/* Preview items */}
      {previewItems.map((item, index) => (
        <Animated.View
          key={item.id}
          entering={FadeInUp.duration(400).delay(100 + index * 80)}
        >
          <WishlistRow item={item} onToggle={handleToggle} />
        </Animated.View>
      ))}

      {/* "More items" hint */}
      {activeItems.length > 3 && (
        <Animated.View entering={FadeIn.duration(300).delay(340)}>
          <Text style={styles.moreHint}>
            {t('wishlist.moreWishes', { count: activeItems.length - 3 })}
          </Text>
        </Animated.View>
      )}

      {/* See all link */}
      {totalCount > 0 && (
        <Animated.View entering={FadeIn.duration(300).delay(400)}>
          <TouchableOpacity style={styles.seeAllButton} onPress={handleSeeAll} activeOpacity={0.7}>
            <Text style={styles.seeAllText}>{t('wishlist.seeAll')}</Text>
            <Icon name="arrow-right" size="xs" color={colors.accent.primary} />
          </TouchableOpacity>
        </Animated.View>
      )}

      {/* Add button */}
      <Animated.View entering={FadeIn.duration(300).delay(totalCount > 0 ? 500 : 200)}>
        <TouchableOpacity style={styles.addButton} onPress={onAddItem} activeOpacity={0.8}>
          <View style={styles.addIconWrap}>
            <Text style={styles.addIcon}>+</Text>
          </View>
          <Text style={styles.addText}>{t('wishlist.addSomethingCta')}</Text>
        </TouchableOpacity>
      </Animated.View>

      {/* Decorative footer */}
      <View style={styles.footerDots}>
        <View style={styles.footerDot} />
        <View style={styles.footerDot} />
        <View style={styles.footerDot} />
      </View>
    </View>
  );
}

function WishlistRow({
  item,
  onToggle,
}: {
  item: WishlistItem;
  onToggle: (item: WishlistItem) => void;
}) {
  const cat = getCategoryDisplay(item.category);
  return (
    <View style={styles.itemRow}>
      <TouchableOpacity
        style={styles.checkbox}
        onPress={() => onToggle(item)}
        activeOpacity={0.6}
      >
        <AnimatedCheckbox checked={item.isCompleted} size={20} />
      </TouchableOpacity>
      {cat?.icon
        ? <Text style={styles.itemIcon}>{cat.icon}</Text>
        : <Icon name="sparkle" size="sm" color={colors.brand.purple} />
      }
      <Text
        style={[styles.itemTitle, item.isCompleted && styles.itemTitleDone]}
        numberOfLines={1}
      >
        {item.title}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface.card,
    borderRadius: 20,
    padding: spacing.lg,
    paddingTop: spacing.cardPad,
    overflow: 'hidden',
    shadowColor: colors.text.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 2,
  },
  // ─── Header ───
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  headerIcon: {
    ...typography.body,
  },
  headerTitle: {
    ...typography.h3,
    color: colors.text.primary,
  },
  countBadge: {
    backgroundColor: colors.surface.warmTint,
    paddingVertical: 3,
    paddingHorizontal: spacing.smd,
    borderRadius: 20,
  },
  countText: {
    ...typography.caption,
    color: colors.accent.primary,
  },
  // ─── Empty State ───
  emptyState: {
    alignItems: 'center',
    paddingVertical: spacing.sm,
  },
  emptyIcon: {
    ...typography.display,
    marginBottom: spacing.sm,
  },
  emptyTitle: {
    ...typography.h3,
    color: colors.text.primary,
    marginBottom: spacing.xs,
  },
  emptySubtitle: {
    ...typography.bodySm,
    color: colors.text.secondary,
    textAlign: 'center',
  },
  // ─── Item Rows ───
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.smd,
    paddingVertical: spacing.smd,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border.default,
  },
  checkbox: {
    width: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  itemIcon: {
    ...typography.bodySm,
  },
  itemTitle: {
    ...typography.bodySm,
    color: colors.text.primary,
    flex: 1,
  },
  itemTitleDone: {
    color: colors.text.secondary,
    textDecorationLine: 'line-through',
  },
  moreHint: {
    ...typography.caption,
    color: colors.text.secondary,
    textAlign: 'center',
    paddingVertical: spacing.sm,
  },
  // ─── See All ───
  seeAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.smd,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border.default,
  },
  seeAllText: {
    ...typography.bodySm,
    color: colors.accent.primary,
  },
  seeAllArrow: {
    ...typography.bodySm,
    color: colors.accent.primary,
  },
  // ─── Add Button ───
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.md,
    marginTop: spacing.xs,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border.default,
  },
  addIconWrap: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: colors.accent.primary,
    borderStyle: 'dashed',
    justifyContent: 'center',
    alignItems: 'center',
  },
  addIcon: {
    ...typography.body,
    color: colors.accent.primary,
    marginTop: -1,
  },
  addText: {
    ...typography.bodySm,
    color: colors.accent.primary,
  },
  // ─── Footer ───
  footerDots: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: spacing.sm,
    marginTop: spacing.smd,
  },
  footerDot: {
    width: 3,
    height: 3,
    borderRadius: 2,
    backgroundColor: colors.border.default,
  },
});
