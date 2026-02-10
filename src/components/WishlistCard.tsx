import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import Animated, { FadeIn, FadeInUp } from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import {
  useWishlistItems,
  useToggleWishlistItem,
  type WishlistItem,
} from '@/hooks/useWishlist';
import { getCategoryDisplay } from '@/config/wishlistCategories';

interface WishlistCardProps {
  onAddItem: () => void;
}

export function WishlistCard({ onAddItem }: WishlistCardProps) {
  const { data: items, isLoading } = useWishlistItems();
  const toggleItem = useToggleWishlistItem();

  const activeItems = items?.filter((i) => !i.isCompleted) ?? [];
  const completedCount = items?.filter((i) => i.isCompleted).length ?? 0;
  const totalCount = items?.length ?? 0;
  const previewItems = activeItems.slice(0, 3);

  const handleToggle = (item: WishlistItem) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    toggleItem.mutate({
      itemId: item.id,
      isCurrentlyCompleted: item.isCompleted,
    });
  };

  const handleSeeAll = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push('/(app)/wishlist');
  };

  if (isLoading) {
    return (
      <View style={styles.card}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator color="#c97454" size="small" />
        </View>
      </View>
    );
  }

  return (
    <View style={styles.card}>
      {/* Accent bar */}
      <View style={styles.accentBar} />

      {/* Header */}
      <Animated.View entering={FadeIn.duration(400)} style={styles.header}>
        <View style={styles.headerLeft}>
          <Text style={styles.headerIcon}>{'\u2728'}</Text>
          <Text style={styles.headerTitle}>Wishlist</Text>
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
          <Text style={styles.emptyIcon}>{'\uD83C\uDF1F'}</Text>
          <Text style={styles.emptyTitle}>Dream together</Text>
          <Text style={styles.emptySubtitle}>Add things you'd love to do as a couple</Text>
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
            +{activeItems.length - 3} more {activeItems.length - 3 === 1 ? 'wish' : 'wishes'}
          </Text>
        </Animated.View>
      )}

      {/* See all link */}
      {totalCount > 0 && (
        <Animated.View entering={FadeIn.duration(300).delay(400)}>
          <TouchableOpacity style={styles.seeAllButton} onPress={handleSeeAll} activeOpacity={0.7}>
            <Text style={styles.seeAllText}>See all</Text>
            <Text style={styles.seeAllArrow}>{'\u2192'}</Text>
          </TouchableOpacity>
        </Animated.View>
      )}

      {/* Add button */}
      <Animated.View entering={FadeIn.duration(300).delay(totalCount > 0 ? 500 : 200)}>
        <TouchableOpacity style={styles.addButton} onPress={onAddItem} activeOpacity={0.8}>
          <View style={styles.addIconWrap}>
            <Text style={styles.addIcon}>+</Text>
          </View>
          <Text style={styles.addText}>Add something</Text>
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
        {item.isCompleted ? (
          <View style={styles.checkboxFilled}>
            <Text style={styles.checkmark}>{'\u2713'}</Text>
          </View>
        ) : (
          <View style={styles.checkboxEmpty} />
        )}
      </TouchableOpacity>
      <Text style={styles.itemIcon}>{cat?.icon ?? '\uD83D\uDCAB'}</Text>
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
  loadingContainer: {
    paddingVertical: 20,
    alignItems: 'center',
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
  checkboxEmpty: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#d6d3d1',
  },
  checkboxFilled: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#c97454',
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkmark: {
    color: '#ffffff',
    fontSize: 10,
    fontWeight: '700',
    marginTop: -1,
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
