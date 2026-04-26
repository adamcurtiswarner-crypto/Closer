import React, { useState, useCallback, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  RefreshControl,
  ActivityIndicator,
  Alert,
  Linking,
} from 'react-native';
import Animated, { FadeIn, FadeInUp } from 'react-native-reanimated';
import { hapticImpact } from '@utils/haptics';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { format, isPast, isToday } from 'date-fns';
import {
  useDateNights,
  useArchiveDateNight,
} from '@/hooks/useDateNights';
import { useAuth } from '@/hooks/useAuth';
import {
  DATE_NIGHT_CATEGORIES,
  DATE_NIGHT_IDEAS,
  getIdeasByCategory,
} from '@/config/dateNightIdeas';
import { logEvent } from '@/services/analytics';
import {
  requestCalendarPermission,
  getOrCreateStokeCalendar,
  addDateNightEvent,
} from '@/services/calendar';
import { logger } from '@/utils/logger';
import { AddDateNightModal } from '@/components/AddDateNightModal';
import { CompleteDateNightModal } from '@/components/CompleteDateNightModal';
import { SwipeableRow } from '@/components/SwipeableRow';
import { Icon } from '@/components';

import type { DateNight, DateNightCategory, DateNightIdea } from '@/types';

export default function DateNightsScreen() {
  const { user } = useAuth();
  const { data: dateNights, isLoading, refetch } = useDateNights();
  const archiveDateNight = useArchiveDateNight();

  const [refreshing, setRefreshing] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedIdea, setSelectedIdea] = useState<DateNightIdea | undefined>(undefined);
  const [activeCategory, setActiveCategory] = useState<DateNightCategory | 'all'>('all');
  const [showPast, setShowPast] = useState(false);
  const [completingDateNight, setCompletingDateNight] = useState<DateNight | null>(null);

  const scheduled = useMemo(
    () => dateNights?.filter((d) => d.status === 'scheduled').sort(
      (a, b) => (a.scheduledDate?.getTime() ?? 0) - (b.scheduledDate?.getTime() ?? 0)
    ) ?? [],
    [dateNights]
  );

  const saved = useMemo(
    () => dateNights?.filter((d) => d.status === 'saved') ?? [],
    [dateNights]
  );

  const completed = useMemo(
    () => dateNights?.filter((d) => d.status === 'completed') ?? [],
    [dateNights]
  );

  const filteredIdeas = useMemo(() => {
    if (activeCategory === 'all') return DATE_NIGHT_IDEAS;
    return getIdeasByCategory(activeCategory);
  }, [activeCategory]);

  useEffect(() => {
    logEvent('date_idea_viewed');
  }, []);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  }, [refetch]);

  const handleIdeaTap = (idea: DateNightIdea) => {
    hapticImpact();
    setSelectedIdea(idea);
    setShowAddModal(true);
  };

  const handleAddCustom = () => {
    hapticImpact();
    setSelectedIdea(undefined);
    setShowAddModal(true);
  };

  const handleComplete = (item: DateNight) => {
    hapticImpact();
    setCompletingDateNight(item);
  };

  const handleArchive = (dateNightId: string) => {
    hapticImpact();
    archiveDateNight.mutate(dateNightId);
  };

  const handleCloseModal = () => {
    setShowAddModal(false);
    setSelectedIdea(undefined);
  };

  const handleCloseCompleteModal = () => {
    setCompletingDateNight(null);
  };

  const handleAddToCalendar = async (item: DateNight) => {
    hapticImpact();
    try {
      const granted = await requestCalendarPermission();
      if (!granted) {
        Alert.alert(
          'Calendar access needed',
          'Enable calendar access in your device Settings to add date nights.',
          [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Open Settings', onPress: () => Linking.openSettings() },
          ]
        );
        return;
      }

      const calendarId = await getOrCreateStokeCalendar();
      const eventId = await addDateNightEvent(
        calendarId,
        item.title,
        item.scheduledDate!,
        item.scheduledTime
      );

      if (eventId) {
        Alert.alert('Added to calendar', 'Your date night has been added to the Stoke calendar.');
        logEvent('date_night_calendar_added', { date_night_id: item.id });
      } else {
        Alert.alert('Could not add to calendar', 'Something went wrong. Please try again.');
      }
    } catch (error) {
      logger.warn('Error adding date night to calendar:', error);
      Alert.alert('Could not add to calendar', 'Something went wrong. Please try again.');
    }
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

  const getCategoryIcon = (cat: DateNightCategory): string => {
    const found = DATE_NIGHT_CATEGORIES.find((c) => c.key === cat);
    return found?.icon ?? '✨';
  };

  const getCostLabel = (tier: string): string => {
    if (tier === 'free') return 'Free';
    return tier;
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <Animated.View entering={FadeIn.duration(300)} style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
          activeOpacity={0.7}
        >
          <Icon name="arrow-left" size="md" color="#1c1917" />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>Date Nights</Text>
          {(scheduled.length > 0 || saved.length > 0) && (
            <Text style={styles.headerCount}>
              {scheduled.length} scheduled, {saved.length} saved
            </Text>
          )}
        </View>
        <TouchableOpacity
          style={styles.addHeaderButton}
          onPress={handleAddCustom}
          activeOpacity={0.7}
        >
          <Text style={styles.addHeaderIcon}>+</Text>
        </TouchableOpacity>
      </Animated.View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#c97454" />
        }
      >
        {/* ── Upcoming Section ── */}
        {scheduled.length > 0 && (
          <Animated.View entering={FadeIn.duration(400)}>
            <Text style={styles.sectionLabel}>Upcoming</Text>
          </Animated.View>
        )}

        {scheduled.map((item, index) => (
          <Animated.View
            key={item.id}
            entering={FadeInUp.duration(400).delay(50 + index * 60)}
          >
            <SwipeableRow
              rightActions={[
                {
                  label: 'Done',
                  color: '#22c55e',
                  onPress: () => handleComplete(item),
                },
                {
                  label: 'Remove',
                  color: '#ef4444',
                  onPress: () => handleArchive(item.id),
                },
              ]}
            >
              <DateNightRow
                item={item}
                getCategoryIcon={getCategoryIcon}
                onAddToCalendar={() => handleAddToCalendar(item)}
                onMarkDone={() => handleComplete(item)}
              />
            </SwipeableRow>
          </Animated.View>
        ))}

        {/* ── Saved Section ── */}
        {saved.length > 0 && (
          <Animated.View entering={FadeIn.duration(400).delay(200)}>
            <Text style={[styles.sectionLabel, scheduled.length > 0 && styles.sectionLabelSpaced]}>
              Saved ideas
            </Text>
          </Animated.View>
        )}

        {saved.map((item, index) => (
          <Animated.View
            key={item.id}
            entering={FadeInUp.duration(400).delay(100 + index * 60)}
          >
            <SwipeableRow
              rightActions={[
                {
                  label: 'Remove',
                  color: '#ef4444',
                  onPress: () => handleArchive(item.id),
                },
              ]}
            >
              <DateNightRow item={item} getCategoryIcon={getCategoryIcon} />
            </SwipeableRow>
          </Animated.View>
        ))}

        {/* ── Ideas Library Section ── */}
        <Animated.View entering={FadeIn.duration(400).delay(300)}>
          <Text style={[styles.sectionLabel, styles.sectionLabelSpaced]}>
            Ideas to try
          </Text>
        </Animated.View>

        {/* Category chips */}
        <Animated.View entering={FadeIn.duration(400).delay(350)}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.categoryChipRow}
            style={styles.categoryScroll}
          >
            <TouchableOpacity
              style={[styles.categoryChip, activeCategory === 'all' && styles.categoryChipActive]}
              onPress={() => {
                hapticImpact();
                setActiveCategory('all');
              }}
              activeOpacity={0.7}
            >
              <Text style={[styles.categoryChipText, activeCategory === 'all' && styles.categoryChipTextActive]}>
                All
              </Text>
            </TouchableOpacity>
            {DATE_NIGHT_CATEGORIES.map((cat) => (
              <TouchableOpacity
                key={cat.key}
                style={[styles.categoryChip, activeCategory === cat.key && styles.categoryChipActive]}
                onPress={() => {
                  hapticImpact();
                  setActiveCategory(cat.key);
                }}
                activeOpacity={0.7}
              >
                <Text style={styles.categoryChipIcon}>{cat.icon}</Text>
                <Text style={[styles.categoryChipText, activeCategory === cat.key && styles.categoryChipTextActive]}>
                  {cat.label}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </Animated.View>

        {/* Ideas grid */}
        {filteredIdeas.map((idea, index) => (
          <Animated.View
            key={idea.id}
            entering={FadeInUp.duration(350).delay(400 + index * 40)}
          >
            <TouchableOpacity
              style={styles.ideaCard}
              onPress={() => handleIdeaTap(idea)}
              activeOpacity={0.7}
            >
              <View style={styles.ideaCardHeader}>
                <Text style={styles.ideaCategoryIcon}>{getCategoryIcon(idea.category)}</Text>
                <View style={styles.ideaMeta}>
                  <Text style={styles.ideaCost}>{getCostLabel(idea.costTier)}</Text>
                  {idea.durationMinutes && (
                    <>
                      <View style={styles.ideaMetaDot} />
                      <Text style={styles.ideaDuration}>
                        {idea.durationMinutes >= 60
                          ? `${Math.round(idea.durationMinutes / 60)}h`
                          : `${idea.durationMinutes}m`}
                      </Text>
                    </>
                  )}
                </View>
              </View>
              <Text style={styles.ideaTitle} numberOfLines={2}>{idea.title}</Text>
              <Text style={styles.ideaDescription} numberOfLines={2}>{idea.description}</Text>
              <View style={styles.ideaSaveRow}>
                <Icon name="arrow-right" size="xs" color="#c97454" />
                <Text style={styles.ideaSaveText}>Save this idea</Text>
              </View>
            </TouchableOpacity>
          </Animated.View>
        ))}

        {/* ── Past Section ── */}
        {completed.length > 0 && (
          <Animated.View entering={FadeIn.duration(400).delay(300)}>
            <TouchableOpacity
              style={styles.pastHeader}
              onPress={() => setShowPast(!showPast)}
              activeOpacity={0.7}
            >
              <Text style={styles.pastHeaderText}>
                Past ({completed.length})
              </Text>
              {showPast ? (
                <Icon name="sort-ascending" size="sm" />
              ) : (
                <Icon name="sort-descending" size="sm" />
              )}
            </TouchableOpacity>

            {showPast && completed.map((item, index) => (
              <Animated.View
                key={item.id}
                entering={FadeInUp.duration(300).delay(index * 40)}
              >
                <DateNightRow
                  item={item}
                  getCategoryIcon={getCategoryIcon}
                  isCompleted
                />
              </Animated.View>
            ))}
          </Animated.View>
        )}

        {/* Empty state when no data at all */}
        {(dateNights?.length ?? 0) === 0 && filteredIdeas.length === 0 && (
          <Animated.View entering={FadeInUp.duration(500).delay(100)} style={styles.emptyCard}>
            <Icon name="calendar" size="xl" color="#c97454" weight="light" />
            <Text style={styles.emptyTitle}>No date nights yet</Text>
            <Text style={styles.emptySubtitle}>
              Browse ideas above or plan something custom.
            </Text>
          </Animated.View>
        )}

        {/* Add custom CTA at bottom */}
        <Animated.View entering={FadeIn.duration(400).delay(500)}>
          <TouchableOpacity
            style={styles.addRow}
            onPress={handleAddCustom}
            activeOpacity={0.8}
          >
            <View style={styles.addIconWrap}>
              <Text style={styles.addIcon}>+</Text>
            </View>
            <Text style={styles.addText}>Plan something custom</Text>
          </TouchableOpacity>
        </Animated.View>
      </ScrollView>

      <AddDateNightModal
        visible={showAddModal}
        onClose={handleCloseModal}
        idea={selectedIdea}
      />

      <CompleteDateNightModal
        visible={completingDateNight !== null}
        onClose={handleCloseCompleteModal}
        dateNight={completingDateNight}
      />
    </SafeAreaView>
  );
}

function DateNightRow({
  item,
  getCategoryIcon,
  isCompleted,
  onAddToCalendar,
  onMarkDone,
}: {
  item: DateNight;
  getCategoryIcon: (cat: DateNightCategory) => string;
  isCompleted?: boolean;
  onAddToCalendar?: () => void;
  onMarkDone?: () => void;
}) {
  const isPastDue =
    item.status === 'scheduled' &&
    item.scheduledDate &&
    isPast(item.scheduledDate) &&
    !isToday(item.scheduledDate);

  return (
    <View style={styles.rowCard}>
      {/* Category icon */}
      <View style={[styles.rowIconWrap, isCompleted && styles.rowIconWrapDone]}>
        <Text style={styles.rowCategoryIcon}>{getCategoryIcon(item.category)}</Text>
      </View>

      {/* Content */}
      <View style={styles.rowContent}>
        <Text
          style={[styles.rowTitle, isCompleted && styles.rowTitleDone]}
          numberOfLines={1}
        >
          {item.title}
        </Text>

        <View style={styles.rowMetaRow}>
          {/* Status badge */}
          {item.status === 'scheduled' && item.scheduledDate && (
            <Text style={[styles.rowDate, isPastDue && styles.rowDatePastDue]}>
              {isToday(item.scheduledDate)
                ? 'Tonight'
                : format(item.scheduledDate, 'MMM d')}
              {isPastDue ? ' (past due)' : ''}
            </Text>
          )}
          {item.status === 'saved' && (
            <Text style={styles.rowStatusSaved}>Saved</Text>
          )}
          {item.status === 'completed' && item.completedAt && (
            <Text style={styles.rowStatusDone}>
              {format(item.completedAt, 'MMM d')}
            </Text>
          )}
          {item.scheduledTime && (
            <>
              <View style={styles.rowMetaDot} />
              <Text style={styles.rowTime}>{item.scheduledTime}</Text>
            </>
          )}
        </View>

        {/* Action links */}
        <View style={styles.rowActions}>
          {isPastDue && onMarkDone && (
            <TouchableOpacity onPress={onMarkDone} activeOpacity={0.7}>
              <Text style={styles.rowActionLink}>Mark as done</Text>
            </TouchableOpacity>
          )}
          {item.status === 'scheduled' && item.scheduledDate && onAddToCalendar && (
            <TouchableOpacity onPress={onAddToCalendar} activeOpacity={0.7}>
              <Text style={styles.rowActionLink}>Add to calendar</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Reflection badge if completed */}
      {item.reflectionRating && (
        <View style={styles.reflectionBadge}>
          <Text style={styles.reflectionEmoji}>
            {item.reflectionRating === 'warm' ? '🔥' : item.reflectionRating === 'okay' ? '👍' : '🤔'}
          </Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fef7f4',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  // --- Header ---
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
  headerCenter: {
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    fontFamily: 'Alexandria-SemiBold',
    color: '#1c1917',
    letterSpacing: -0.3,
  },
  headerCount: {
    fontSize: 12,
    fontWeight: '500',
    fontFamily: 'Inter-Medium',
    color: '#a8a29e',
    marginTop: 2,
  },
  addHeaderButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#c97454',
    justifyContent: 'center',
    alignItems: 'center',
  },
  addHeaderIcon: {
    fontSize: 22,
    color: '#ffffff',
    fontWeight: '600',
    marginTop: -1,
  },
  // --- Scroll ---
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 40,
  },
  // --- Section Labels ---
  sectionLabel: {
    fontSize: 12,
    fontWeight: '500',
    fontFamily: 'Inter-Medium',
    color: '#a8a29e',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
    marginBottom: 12,
    marginTop: 8,
  },
  sectionLabelSpaced: {
    marginTop: 28,
  },
  // --- Row Card ---
  rowCard: {
    flexDirection: 'row',
    alignItems: 'center',
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
  rowIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#fef5f0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  rowIconWrapDone: {
    backgroundColor: '#f5f5f4',
  },
  rowCategoryIcon: {
    fontSize: 18,
  },
  rowContent: {
    flex: 1,
    gap: 2,
  },
  rowTitle: {
    fontSize: 15,
    fontWeight: '600',
    fontFamily: 'Inter-SemiBold',
    color: '#292524',
  },
  rowTitleDone: {
    color: '#a8a29e',
  },
  rowMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  rowDate: {
    fontSize: 12,
    fontWeight: '600',
    fontFamily: 'Inter-SemiBold',
    color: '#c97454',
  },
  rowDatePastDue: {
    color: '#ef4444',
  },
  rowStatusSaved: {
    fontSize: 12,
    fontWeight: '500',
    color: '#a8a29e',
  },
  rowStatusDone: {
    fontSize: 12,
    fontWeight: '500',
    color: '#22c55e',
  },
  rowTime: {
    fontSize: 12,
    color: '#a8a29e',
    fontWeight: '500',
  },
  rowMetaDot: {
    width: 3,
    height: 3,
    borderRadius: 1.5,
    backgroundColor: '#d6d3d1',
  },
  rowActions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 4,
  },
  rowActionLink: {
    fontSize: 12,
    fontWeight: '600',
    fontFamily: 'Inter-SemiBold',
    color: '#c97454',
  },
  reflectionBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#fef5f0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  reflectionEmoji: {
    fontSize: 14,
  },
  // --- Category Chips ---
  categoryScroll: {
    marginBottom: 16,
  },
  categoryChipRow: {
    gap: 8,
    paddingRight: 20,
  },
  categoryChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 20,
    backgroundColor: '#ffffff',
    borderWidth: 1.5,
    borderColor: '#e7e5e4',
  },
  categoryChipActive: {
    backgroundColor: '#fef5f0',
    borderColor: '#c97454',
  },
  categoryChipIcon: {
    fontSize: 14,
  },
  categoryChipText: {
    fontSize: 13,
    fontWeight: '600',
    fontFamily: 'Inter-SemiBold',
    color: '#78716c',
  },
  categoryChipTextActive: {
    color: '#c97454',
  },
  // --- Idea Cards ---
  ideaCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 16,
    marginBottom: 8,
    shadowColor: '#1c1917',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 1,
  },
  ideaCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  ideaCategoryIcon: {
    fontSize: 20,
  },
  ideaMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  ideaCost: {
    fontSize: 11,
    fontWeight: '700',
    color: '#a8a29e',
    letterSpacing: 0.3,
  },
  ideaMetaDot: {
    width: 3,
    height: 3,
    borderRadius: 1.5,
    backgroundColor: '#d6d3d1',
  },
  ideaDuration: {
    fontSize: 11,
    fontWeight: '500',
    color: '#a8a29e',
  },
  ideaTitle: {
    fontSize: 15,
    fontWeight: '600',
    fontFamily: 'Inter-SemiBold',
    color: '#292524',
    marginBottom: 4,
  },
  ideaDescription: {
    fontSize: 13,
    color: '#78716c',
    fontFamily: 'Inter-Regular',
    lineHeight: 18,
    marginBottom: 10,
  },
  ideaSaveRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  ideaSaveText: {
    fontSize: 13,
    fontWeight: '600',
    fontFamily: 'Inter-SemiBold',
    color: '#c97454',
  },
  // --- Past Section ---
  pastHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
    marginTop: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#e7e5e4',
  },
  pastHeaderText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#a8a29e',
    letterSpacing: 0.3,
  },
  // --- Empty State ---
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
  emptyTitle: {
    fontSize: 20,
    fontWeight: '600',
    fontFamily: 'Alexandria-SemiBold',
    color: '#292524',
    marginTop: 16,
    marginBottom: 8,
    textAlign: 'center',
  },
  emptySubtitle: {
    fontSize: 15,
    color: '#78716c',
    fontFamily: 'Inter-Regular',
    textAlign: 'center',
    lineHeight: 22,
  },
  // --- Add Row ---
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
    fontFamily: 'Inter-SemiBold',
  },
});
