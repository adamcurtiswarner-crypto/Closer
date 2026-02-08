import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
  RefreshControl,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { SafeAreaView } from 'react-native-safe-area-context';
import { format } from 'date-fns';
import { useAuth } from '@/hooks/useAuth';
import { useWeeklyRecap, useSavedMemories, useSaveMemory } from '@/hooks/useMemories';
import { logEvent } from '@/services/analytics';
import { QueryError } from '@/components/QueryError';
import { MemoryCardSkeleton } from '@/components/Skeleton';
import { useEffect } from 'react';

type Tab = 'recap' | 'saved';

export default function MemoriesScreen() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<Tab>('recap');

  const { data: completions, isLoading: recapLoading, error: recapError, refetch: refetchRecap } = useWeeklyRecap();
  const { data: memories, isLoading: memoriesLoading, error: memoriesError, refetch: refetchMemories } = useSavedMemories();
  const saveMemory = useSaveMemory();

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
      <View style={styles.header}>
        <Text style={styles.title}>Memories</Text>
      </View>

      {/* Tabs */}
      <View style={styles.tabs}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'recap' && styles.activeTab]}
          onPress={() => setActiveTab('recap')}
        >
          <Text style={[styles.tabText, activeTab === 'recap' && styles.activeTabText]}>
            This Week
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'saved' && styles.activeTab]}
          onPress={() => setActiveTab('saved')}
        >
          <Text style={[styles.tabText, activeTab === 'saved' && styles.activeTabText]}>
            Saved
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.scrollView} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#c97454" />}>
        {activeTab === 'recap' ? (
          recapLoading ? (
            <View>
              <MemoryCardSkeleton />
              <MemoryCardSkeleton />
            </View>
          ) : recapError ? (
            <QueryError
              message="Couldn't load this week's recap."
              onRetry={() => refetchRecap()}
            />
          ) : !completions || completions.length === 0 ? (
            <View style={styles.empty}>
              <Text style={styles.emptyTitle}>No completions this week yet.</Text>
              <Text style={styles.emptySubtitle}>
                Complete a prompt together to see it here.
              </Text>
            </View>
          ) : (
            completions.map((completion) => (
              <View key={completion.id} style={styles.card}>
                <Text style={styles.promptText}>"{completion.promptText}"</Text>

                {completion.responses.map((response, idx) => (
                  <View key={idx} style={styles.responseBlock}>
                    <Text style={styles.responseLabel}>
                      {getDisplayName(response.user_id)}
                    </Text>
                    <Text style={styles.responseText}>{response.response_text}</Text>
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
                    onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); saveMemory.mutate(completion); }}
                    disabled={saveMemory.isPending}
                  >
                    <Text style={styles.saveButtonText}>
                      {saveMemory.isPending ? 'Saving...' : 'Save to Memories'}
                    </Text>
                  </TouchableOpacity>
                ) : (
                  <Text style={styles.savedLabel}>Saved</Text>
                )}
              </View>
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
              message="Couldn't load saved memories."
              onRetry={() => refetchMemories()}
            />
          ) : !memories || memories.length === 0 ? (
            <View style={styles.empty}>
              <Text style={styles.emptyTitle}>Your saved memories will appear here.</Text>
              <Text style={styles.emptySubtitle}>
                Each week, pick your favorite moment to save.
              </Text>
            </View>
          ) : (
            memories.map((memory) => (
              <View key={memory.id} style={styles.card}>
                <Text style={styles.promptText}>"{memory.promptText}"</Text>

                {memory.responses.map((response, idx) => (
                  <View key={idx} style={styles.responseBlock}>
                    <Text style={styles.responseLabel}>
                      {response.userId === user?.id ? 'You' : (response.displayName || partnerName)}
                    </Text>
                    <Text style={styles.responseText}>{response.responseText}</Text>
                  </View>
                ))}

                {memory.completedAt && (
                  <Text style={styles.timestamp}>
                    {format(memory.completedAt, 'EEEE, MMM d')}
                  </Text>
                )}
              </View>
            ))
          )
        )}
      </ScrollView>
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
});
