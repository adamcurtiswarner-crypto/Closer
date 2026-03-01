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
      <View style={styles.accentBar} />

      {/* Header */}
      <Animated.View entering={FadeIn.duration(400)} style={styles.header}>
        <View style={styles.headerLeft}>
          <Icon name="sparkle" size="sm" color="#c97454" weight="regular" />
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
          <Icon name="star" size="lg" color="#c97454" weight="light" />
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
            <Icon name="arrow-right" size="xs" color="#c97454" />
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
        : <Icon name="sparkle" size="sm" color="#8b7355" />
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
  },
  accentBar: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 3,
    backgroundColor: '#c97454',
  },
  // ─── Header ───
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerIcon: {
    fontSize: 16,
  },
  headerTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#292524',
    letterSpacing: -0.3,
  },
  countBadge: {
    backgroundColor: '#fef7f4',
    paddingVertical: 3,
    paddingHorizontal: 10,
    borderRadius: 20,
  },
  countText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#c97454',
  },
  // ─── Empty State ───
  emptyState: {
    alignItems: 'center',
    paddingVertical: 8,
  },
  emptyIcon: {
    fontSize: 28,
    marginBottom: 8,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#292524',
    marginBottom: 4,
  },
  emptySubtitle: {
    fontSize: 13,
    color: '#a8a29e',
    textAlign: 'center',
  },
  // ─── Item Rows ───
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#e7e5e4',
  },
  checkbox: {
    width: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  itemIcon: {
    fontSize: 14,
  },
  itemTitle: {
    fontSize: 14,
    fontWeight: '500',
    color: '#292524',
    flex: 1,
  },
  itemTitleDone: {
    color: '#a8a29e',
    textDecorationLine: 'line-through',
  },
  moreHint: {
    fontSize: 12,
    color: '#a8a29e',
    fontWeight: '500',
    textAlign: 'center',
    paddingVertical: 6,
  },
  // ─── See All ───
  seeAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingVertical: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#e7e5e4',
  },
  seeAllText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#c97454',
  },
  seeAllArrow: {
    fontSize: 14,
    color: '#c97454',
  },
  // ─── Add Button ───
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    marginTop: 4,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#e7e5e4',
  },
  addIconWrap: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#c97454',
    borderStyle: 'dashed',
    justifyContent: 'center',
    alignItems: 'center',
  },
  addIcon: {
    fontSize: 15,
    color: '#c97454',
    fontWeight: '600',
    marginTop: -1,
  },
  addText: {
    fontSize: 14,
    color: '#c97454',
    fontWeight: '600',
  },
  // ─── Footer ───
  footerDots: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
    marginTop: 12,
  },
  footerDot: {
    width: 3,
    height: 3,
    borderRadius: 2,
    backgroundColor: '#e7e5e4',
  },
});
