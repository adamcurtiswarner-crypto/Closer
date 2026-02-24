import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  Image,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
  RefreshControl,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import Animated, { FadeIn, FadeInUp } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';
import { format } from 'date-fns';
import { useAuth } from '@/hooks/useAuth';
import { useWeeklyRecap, useSavedMemories, useSaveMemory, useRemoveMemory } from '@/hooks/useMemories';
import { useSubscription } from '@/hooks/useSubscription';
import { Paywall } from '@/components/Paywall';
import { logEvent } from '@/services/analytics';
import { QueryError } from '@/components/QueryError';
import { MemoryCardSkeleton } from '@/components/Skeleton';
import { SwipeableRow } from '@/components/SwipeableRow';
import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';

type Tab = 'recap' | 'saved';

export default function MemoriesScreen() {
  const { user } = useAuth();
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState<Tab>('recap');

  const { data: completions, isLoading: recapLoading, error: recapError, refetch: refetchRecap } = useWeeklyRecap();
  const { data: memories, isLoading: memoriesLoading, error: memoriesError, refetch: refetchMemories } = useSavedMemories();
  const saveMemory = useSaveMemory();
  const removeMemory = useRemoveMemory();
  const { isPremium } = useSubscription();
  const [showPaywall, setShowPaywall] = useState(false);

  const FREE_MEMORY_LIMIT = 3;

  const partnerName = user?.partnerName || 'Partner';
  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    if (activeTab === 'recap') {
      await refetchRecap();
    } else {
      await refetchMemories();
    }
    setRefreshing(false);
  }, [activeTab, refetchRecap, refetchMemories]);

  // Log recap_viewed when tab is shown
  useEffect(() => {
    if (activeTab === 'recap' && completions && completions.length > 0) {
      logEvent('recap_viewed', { completion_count: completions.length });
    }
  }, [activeTab, completions]);

  const getDisplayName = (userId: string) => {
    if (userId === user?.id) return 'You';
    return partnerName;
  };

  return (
    <SafeAreaView style={styles.container}>
      <Animated.View entering={FadeIn.duration(400)} style={styles.header}>
        <Text style={styles.title}>{t('memories.title')}</Text>
      </Animated.View>

      {/* Tabs */}
      <Animated.View entering={FadeIn.duration(400).delay(100)} style={styles.tabs}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'recap' && styles.activeTab]}
          onPress={() => setActiveTab('recap')}
        >
          <Text style={[styles.tabText, activeTab === 'recap' && styles.activeTabText]}>
            {t('memories.thisWeek')}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'saved' && styles.activeTab]}
          onPress={() => setActiveTab('saved')}
        >
          <Text style={[styles.tabText, activeTab === 'saved' && styles.activeTabText]}>
            {t('memories.saved')}
          </Text>
        </TouchableOpacity>
      </Animated.View>

      <ScrollView style={styles.scrollView} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#c97454" />}>
        {activeTab === 'recap' ? (
          recapLoading ? (
            <View>
              <MemoryCardSkeleton />
              <MemoryCardSkeleton />
            </View>
          ) : recapError ? (
            <QueryError
              message={t('memories.errorLoading')}
              onRetry={() => refetchRecap()}
            />
          ) : !completions || completions.length === 0 ? (
            <Animated.View entering={FadeIn.duration(500).delay(200)} style={styles.empty}>
              <Text style={styles.emptyTitle}>{t('memories.noCompletions')}</Text>
              <Text style={styles.emptySubtitle}>
                {t('memories.noCompletionsSubtitle')}
              </Text>
            </Animated.View>
          ) : (
            completions.map((completion, index) => (
              <Animated.View key={completion.id} entering={FadeInUp.duration(400).delay(Math.min(index * 80, 400))} style={styles.card}>
                <Text style={styles.promptText}>"{completion.promptText}"</Text>

                {completion.responses.map((response, idx) => (
                  <View key={idx} style={styles.responseBlock}>
                    <Text style={styles.responseLabel}>
                      {getDisplayName(response.user_id)}
                    </Text>
                    <Text style={styles.responseText}>{response.response_text}</Text>
                    {response.image_url ? (
                      <Image source={{ uri: response.image_url }} style={styles.responseImage} resizeMode="cover" />
                    ) : null}
                  </View>
                ))}

                {completion.completedAt && (
                  <Text style={styles.timestamp}>
                    {format(completion.completedAt, 'EEEE, MMM d')}
                  </Text>
                )}

                {!completion.isMemorySaved ? (
                  <TouchableOpacity
                    style={styles.saveButton}
                    onPress={() => { Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success); saveMemory.mutate(completion); }}
                    disabled={saveMemory.isPending}
                  >
                    <Text style={styles.saveButtonText}>
                      {saveMemory.isPending ? t('memories.saving') : t('memories.saveToMemories')}
                    </Text>
                  </TouchableOpacity>
                ) : (
                  <Text style={styles.savedLabel}>{t('memories.savedLabel')}</Text>
                )}
              </Animated.View>
            ))
          )
        ) : (
          memoriesLoading ? (
            <View>
              <MemoryCardSkeleton />
              <MemoryCardSkeleton />
            </View>
          ) : memoriesError ? (
            <QueryError
              message={t('memories.errorLoadingSaved')}
              onRetry={() => refetchMemories()}
            />
          ) : !memories || memories.length === 0 ? (
            <Animated.View entering={FadeIn.duration(500).delay(200)} style={styles.empty}>
              <Text style={styles.emptyTitle}>{t('memories.emptySavedTitle')}</Text>
              <Text style={styles.emptySubtitle}>
                {t('memories.emptySavedSubtitle')}
              </Text>
            </Animated.View>
          ) : (
            <>
              {(isPremium ? memories : memories.slice(0, FREE_MEMORY_LIMIT)).map((memory, index) => (
                <Animated.View key={memory.id} entering={FadeInUp.duration(400).delay(Math.min(index * 80, 400))}>
                  <SwipeableRow
                    rightActions={[{
                      label: 'Remove',
                      color: '#ef4444',
                      onPress: () => {
                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                        removeMemory.mutate(memory.id);
                      },
                    }]}
                  >
                    <View style={styles.card}>
                      <Text style={styles.promptText}>"{memory.promptText}"</Text>

                      {memory.responses.map((response, idx) => (
                        <View key={idx} style={styles.responseBlock}>
                          <Text style={styles.responseLabel}>
                            {response.userId === user?.id ? 'You' : (response.displayName || partnerName)}
                          </Text>
                          <Text style={styles.responseText}>{response.responseText}</Text>
                          {response.imageUrl ? (
                            <Image source={{ uri: response.imageUrl }} style={styles.responseImage} resizeMode="cover" />
                          ) : null}
                        </View>
                      ))}

                      {memory.completedAt && (
                        <Text style={styles.timestamp}>
                          {format(memory.completedAt, 'EEEE, MMM d')}
                        </Text>
                      )}
                    </View>
                  </SwipeableRow>
                </Animated.View>
              ))}
              {!isPremium && memories.length > FREE_MEMORY_LIMIT && (
                <TouchableOpacity
                  style={styles.unlockButton}
                  onPress={() => setShowPaywall(true)}
                >
                  <Text style={styles.unlockText}>
                    {t('memories.unlockMore', { count: memories.length - FREE_MEMORY_LIMIT })}
                  </Text>
                </TouchableOpacity>
              )}
            </>
          )
        )}
      </ScrollView>

      <Paywall visible={showPaywall} onClose={() => setShowPaywall(false)} />
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
    paddingBottom: 8,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#1c1917',
  },
  tabs: {
    flexDirection: 'row',
    paddingHorizontal: 24,
    paddingBottom: 16,
    gap: 8,
  },
  tab: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    backgroundColor: '#f5f5f4',
  },
  activeTab: {
    backgroundColor: '#c97454',
  },
  tabText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#78716c',
  },
  activeTabText: {
    color: '#ffffff',
  },
  scrollView: {
    flex: 1,
    paddingHorizontal: 24,
  },
  centered: {
    paddingTop: 48,
    alignItems: 'center',
  },
  empty: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 80,
    paddingHorizontal: 24,
  },
  emptyTitle: {
    fontSize: 16,
    color: '#57534e',
    textAlign: 'center',
  },
  emptySubtitle: {
    fontSize: 14,
    color: '#78716c',
    textAlign: 'center',
    marginTop: 8,
  },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#f5f5f4',
  },
  promptText: {
    fontSize: 16,
    color: '#57534e',
    fontStyle: 'italic',
    textAlign: 'center',
    marginBottom: 16,
  },
  responseBlock: {
    backgroundColor: '#fafaf9',
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
  },
  responseLabel: {
    fontSize: 12,
    color: '#78716c',
    fontWeight: '500',
    marginBottom: 4,
  },
  responseText: {
    fontSize: 15,
    color: '#292524',
    lineHeight: 22,
  },
  responseImage: {
    width: '100%',
    height: 200,
    borderRadius: 12,
    marginTop: 8,
  },
  timestamp: {
    fontSize: 12,
    color: '#a8a29e',
    textAlign: 'center',
    marginTop: 8,
  },
  saveButton: {
    marginTop: 12,
    paddingVertical: 10,
    backgroundColor: '#fef3ee',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#e9b8a3',
    alignItems: 'center',
  },
  saveButtonText: {
    fontSize: 14,
    color: '#c97454',
    fontWeight: '600',
  },
  savedLabel: {
    marginTop: 12,
    fontSize: 13,
    color: '#a8a29e',
    textAlign: 'center',
  },
  unlockButton: {
    marginTop: 8,
    marginBottom: 24,
    paddingVertical: 14,
    backgroundColor: '#fef3ee',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e9b8a3',
    alignItems: 'center',
  },
  unlockText: {
    fontSize: 14,
    color: '#c97454',
    fontWeight: '600',
  },
});
