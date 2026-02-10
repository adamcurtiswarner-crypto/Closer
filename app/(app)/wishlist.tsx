import React, { useState, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import Animated, { FadeIn, FadeInUp } from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import {
  useWishlistItems,
  useToggleWishlistItem,
  useDeleteWishlistItem,
  type WishlistItem,
} from '@/hooks/useWishlist';
import { useAuth } from '@/hooks/useAuth';
import { getCategoryDisplay } from '@/config/wishlistCategories';
import { logEvent } from '@/services/analytics';
import { AddWishlistModal } from '@/components/AddWishlistModal';

export default function WishlistScreen() {
  const { user } = useAuth();
  const { data: items, isLoading, refetch } = useWishlistItems();
  const toggleItem = useToggleWishlistItem();
  const deleteItem = useDeleteWishlistItem();

  const [refreshing, setRefreshing] = useState(false);
  const [showDone, setShowDone] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);

  const activeItems = items?.filter((i) => !i.isCompleted) ?? [];
  const doneItems = items?.filter((i) => i.isCompleted) ?? [];

  useEffect(() => {
    logEvent('wishlist_viewed');
  }, []);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  }, [refetch]);

  const handleToggle = (item: WishlistItem) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    toggleItem.mutate({
      itemId: item.id,
      isCurrentlyCompleted: item.isCompleted,
    });
  };

  const handleDelete = (itemId: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    deleteItem.mutate(itemId);
  };

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator color="#c97454" size="large" />
        </View>
      </SafeAreaView>
    );
  }

  const isEmpty = (items?.length ?? 0) === 0;

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <Animated.View entering={FadeIn.duration(300)} style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
          activeOpacity={0.7}
        >
          <Text style={styles.backArrow}>{'\u2190'}</Text>
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>Wishlist</Text>
          {!isEmpty && (
            <Text style={styles.headerCount}>
              {doneItems.length}/{items?.length ?? 0} done
            </Text>
          )}
        </View>
        <View style={styles.backButton} />
      </Animated.View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#c97454" />
        }
      >
        {/* Empty state */}
        {isEmpty && (
          <Animated.View entering={FadeInUp.duration(500).delay(100)} style={styles.emptyCard}>
            <Text style={styles.emptyIcon}>{'\u2728'}</Text>
            <Text style={styles.emptyTitle}>Start your wishlist together</Text>
            <Text style={styles.emptySubtitle}>
              Add experiences, trips, and dreams you want to share with each other
            </Text>
            <TouchableOpacity
              style={styles.emptyButton}
              onPress={() => setShowAddModal(true)}
              activeOpacity={0.8}
            >
              <Text style={styles.emptyButtonText}>Add your first wish</Text>
            </TouchableOpacity>
          </Animated.View>
        )}

        {/* Active items */}
        {activeItems.length > 0 && (
          <Animated.View entering={FadeIn.duration(400)}>
            <Text style={styles.sectionLabel}>
              {activeItems.length} {activeItems.length === 1 ? 'wish' : 'wishes'}
            </Text>
          </Animated.View>
        )}

        {activeItems.map((item, index) => (
          <Animated.View
            key={item.id}
            entering={FadeInUp.duration(400).delay(50 + index * 60)}
          >
            <WishlistRow
              item={item}
              isCurrentUser={item.addedBy === user?.id}
              onToggle={handleToggle}
              onDelete={handleDelete}
            />
          </Animated.View>
        ))}

        {/* Done section */}
        {doneItems.length > 0 && (
          <Animated.View entering={FadeIn.duration(400).delay(300)}>
            <TouchableOpacity
              style={styles.doneHeader}
              onPress={() => setShowDone(!showDone)}
              activeOpacity={0.7}
            >
              <Text style={styles.doneHeaderText}>
                Done ({doneItems.length})
              </Text>
              <Text style={styles.doneChevron}>
                {showDone ? '\u25B2' : '\u25BC'}
              </Text>
            </TouchableOpacity>

            {showDone && doneItems.map((item, index) => (
              <Animated.View
                key={item.id}
                entering={FadeInUp.duration(300).delay(index * 40)}
              >
                <WishlistRow
                  item={item}
                  isCurrentUser={item.addedBy === user?.id}
                  onToggle={handleToggle}
                  onDelete={handleDelete}
                />
              </Animated.View>
            ))}
          </Animated.View>
        )}

        {/* Add button at bottom */}
        {!isEmpty && (
          <Animated.View entering={FadeIn.duration(400).delay(400)}>
            <TouchableOpacity
              style={styles.addRow}
              onPress={() => setShowAddModal(true)}
              activeOpacity={0.8}
            >
              <View style={styles.addIconWrap}>
                <Text style={styles.addIcon}>+</Text>
              </View>
              <Text style={styles.addText}>Add something new</Text>
            </TouchableOpacity>
          </Animated.View>
        )}
      </ScrollView>

      <AddWishlistModal
        visible={showAddModal}
        onClose={() => setShowAddModal(false)}
      />
    </SafeAreaView>
  );
}

function WishlistRow({
  item,
  isCurrentUser,
  onToggle,
  onDelete,
}: {
  item: WishlistItem;
  isCurrentUser: boolean;
  onToggle: (item: WishlistItem) => void;
  onDelete: (itemId: string) => void;
}) {
  const cat = getCategoryDisplay(item.category);

  return (
    <View style={styles.rowCard}>
      {/* Checkbox */}
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

      {/* Content */}
      <View style={styles.rowContent}>
        <View style={styles.rowTitleRow}>
          <Text style={styles.rowIcon}>{cat?.icon ?? '\uD83D\uDCAB'}</Text>
          <Text
            style={[styles.rowTitle, item.isCompleted && styles.rowTitleDone]}
            numberOfLines={1}
          >
            {item.title}
          </Text>
        </View>
        {item.description ? (
          <Text style={styles.rowDescription} numberOfLines={2}>
            {item.description}
          </Text>
        ) : null}
        <Text style={styles.rowMeta}>
          Added by {isCurrentUser ? 'you' : item.addedByName}
        </Text>
      </View>

      {/* Delete */}
      <TouchableOpacity
        style={styles.deleteButton}
        onPress={() => onDelete(item.id)}
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        activeOpacity={0.6}
      >
        <Text style={styles.deleteIcon}>{'\u00D7'}</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fafaf9',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  // ─── Header ───
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#f5f5f4',
    justifyContent: 'center',
    alignItems: 'center',
  },
  backArrow: {
    fontSize: 20,
    color: '#57534e',
  },
  headerCenter: {
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1c1917',
    letterSpacing: -0.3,
  },
  headerCount: {
    fontSize: 12,
    fontWeight: '500',
    color: '#a8a29e',
    marginTop: 2,
  },
  // ─── Scroll ───
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 40,
  },
  // ─── Empty State ───
  emptyCard: {
    backgroundColor: '#ffffff',
    borderRadius: 20,
    padding: 36,
    alignItems: 'center',
    marginTop: 40,
    shadowColor: '#1c1917',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 2,
  },
  emptyIcon: {
    fontSize: 40,
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#292524',
    marginBottom: 8,
    textAlign: 'center',
  },
  emptySubtitle: {
    fontSize: 15,
    color: '#78716c',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 24,
  },
  emptyButton: {
    paddingVertical: 14,
    paddingHorizontal: 28,
    backgroundColor: '#c97454',
    borderRadius: 14,
  },
  emptyButtonText: {
    color: '#ffffff',
    fontWeight: '700',
    fontSize: 16,
  },
  // ─── Section Label ───
  sectionLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#a8a29e',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
    marginBottom: 12,
    marginTop: 8,
  },
  // ─── Row Card ───
  rowCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 16,
    marginBottom: 8,
    shadowColor: '#1c1917',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 1,
    gap: 12,
  },
  checkbox: {
    width: 28,
    height: 28,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 2,
  },
  checkboxEmpty: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#d6d3d1',
  },
  checkboxFilled: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#22c55e',
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkmark: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '700',
    marginTop: -1,
  },
  rowContent: {
    flex: 1,
    gap: 4,
  },
  rowTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  rowIcon: {
    fontSize: 16,
  },
  rowTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#292524',
    flex: 1,
  },
  rowTitleDone: {
    color: '#a8a29e',
    textDecorationLine: 'line-through',
  },
  rowDescription: {
    fontSize: 13,
    color: '#78716c',
    lineHeight: 18,
    marginLeft: 24,
  },
  rowMeta: {
    fontSize: 11,
    color: '#a8a29e',
    fontWeight: '500',
    marginLeft: 24,
    marginTop: 2,
  },
  deleteButton: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#fafaf9',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 4,
  },
  deleteIcon: {
    fontSize: 16,
    color: '#a8a29e',
    fontWeight: '600',
    marginTop: -1,
  },
  // ─── Done Section ───
  doneHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
    marginTop: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#e7e5e4',
  },
  doneHeaderText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#a8a29e',
    letterSpacing: 0.3,
  },
  doneChevron: {
    fontSize: 10,
    color: '#a8a29e',
  },
  // ─── Add Row ───
  addRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 20,
    marginTop: 8,
  },
  addIconWrap: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: '#c97454',
    borderStyle: 'dashed',
    justifyContent: 'center',
    alignItems: 'center',
  },
  addIcon: {
    fontSize: 17,
    color: '#c97454',
    fontWeight: '600',
    marginTop: -1,
  },
  addText: {
    fontSize: 15,
    color: '#c97454',
    fontWeight: '600',
  },
});
