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
import { hapticImpact, hapticNotification, NotificationFeedbackType } from '@utils/haptics';
import Animated, { FadeIn, FadeInUp } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';
import { format } from 'date-fns';
import { useAuth } from '@/hooks/useAuth';
import { useWeeklyRecap, useSaveMemory } from '@/hooks/useMemories';
import { usePhotoGrid, type PhotoItem } from '@/hooks/usePhotoGrid';
import { useMilestones, useCreateMilestone, useDeleteMilestone } from '@/hooks/useMilestones';
import { useAddPhoto } from '@/hooks/useAddPhoto';
import { useSubscription } from '@/hooks/useSubscription';
import { Paywall } from '@/components/Paywall';
import { logEvent } from '@/services/analytics';
import { QueryError } from '@/components/QueryError';
import { MemoryCardSkeleton } from '@/components/Skeleton';
import { PhotoGrid } from '@/components/PhotoGrid';
import { PhotoViewer } from '@/components/PhotoViewer';
import { MilestoneTimeline } from '@/components/MilestoneTimeline';
import { AddMilestoneModal } from '@/components/AddMilestoneModal';
import { Icon } from '@components';
import { pickImage } from '@/services/imageUpload';
import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';

type Tab = 'recap' | 'photos' | 'milestones';

export default function MemoriesScreen() {
  const { user } = useAuth();
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState<Tab>('recap');

  // This Week
  const { data: completions, isLoading: recapLoading, error: recapError, refetch: refetchRecap } = useWeeklyRecap();
  const saveMemory = useSaveMemory();

  // Photos
  const photoGrid = usePhotoGrid();
  const allPhotos = photoGrid.data?.pages.flatMap(p => p.items) || [];
  const addPhoto = useAddPhoto();
  const [selectedPhoto, setSelectedPhoto] = useState<PhotoItem | null>(null);
  const [showViewer, setShowViewer] = useState(false);

  // Milestones
  const { data: milestones, isLoading: milestonesLoading, refetch: refetchMilestones } = useMilestones();
  const createMilestone = useCreateMilestone();
  const deleteMilestone = useDeleteMilestone();
  const [showAddMilestone, setShowAddMilestone] = useState(false);

  const { isPremium } = useSubscription();
  const [showPaywall, setShowPaywall] = useState(false);

  const partnerName = user?.partnerName || 'Partner';
  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    if (activeTab === 'recap') {
      await refetchRecap();
    } else if (activeTab === 'photos') {
      await photoGrid.refetch();
    } else {
      await refetchMilestones();
    }
    setRefreshing(false);
  }, [activeTab, refetchRecap, photoGrid.refetch, refetchMilestones]);

  // Analytics
  useEffect(() => {
    if (activeTab === 'recap' && completions && completions.length > 0) {
      logEvent('recap_viewed', { completion_count: completions.length });
    }
    if (activeTab === 'photos') {
      logEvent('photo_grid_viewed', {});
    }
    if (activeTab === 'milestones') {
      logEvent('milestone_viewed', {});
    }
  }, [activeTab, completions]);

  const getDisplayName = (userId: string) => {
    if (userId === user?.id) return 'You';
    return partnerName;
  };

  const handlePhotoPress = (photo: PhotoItem) => {
    setSelectedPhoto(photo);
    setShowViewer(true);
    logEvent('photo_viewed', { source: photo.source });
  };

  const handleAddStandalonePhoto = async () => {
    if (!isPremium) {
      setShowPaywall(true);
      return;
    }
    const uri = await pickImage();
    if (uri) {
      addPhoto.mutate({ uri });
    }
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
          style={[styles.tab, activeTab === 'photos' && styles.activeTab]}
          onPress={() => setActiveTab('photos')}
        >
          <Text style={[styles.tabText, activeTab === 'photos' && styles.activeTabText]}>
            Photos
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'milestones' && styles.activeTab]}
          onPress={() => setActiveTab('milestones')}
        >
          <Text style={[styles.tabText, activeTab === 'milestones' && styles.activeTabText]}>
            Milestones
          </Text>
        </TouchableOpacity>
      </Animated.View>

      {activeTab === 'recap' ? (
        <ScrollView style={styles.scrollView} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#c97454" />}>
          {recapLoading ? (
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
                <View style={styles.cardAccentBar} />
                <Text style={styles.promptText}>{'\u201C'}{completion.promptText}{'\u201D'}</Text>

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
                    onPress={() => { hapticNotification(NotificationFeedbackType.Success); saveMemory.mutate(completion); }}
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
          )}
        </ScrollView>
      ) : activeTab === 'photos' ? (
        <View style={styles.photosContainer}>
          <PhotoGrid
            photos={allPhotos}
            onPhotoPress={handlePhotoPress}
            isLoading={photoGrid.isLoading}
            onEndReached={() => {
              if (photoGrid.hasNextPage && !photoGrid.isFetchingNextPage) {
                photoGrid.fetchNextPage();
              }
            }}
            isLoadingMore={photoGrid.isFetchingNextPage}
            ListHeaderComponent={
              <TouchableOpacity
                style={styles.addPhotoBtn}
                onPress={handleAddStandalonePhoto}
                activeOpacity={0.8}
              >
                {addPhoto.isPending ? (
                  <ActivityIndicator size="small" color="#c97454" />
                ) : (
                  <>
                    <Icon name={isPremium ? 'plus' : 'lock'} size="sm" color="#c97454" />
                    <Text style={styles.addPhotoBtnText}>
                      {isPremium ? 'Add photo' : 'Add photo — Premium'}
                    </Text>
                  </>
                )}
              </TouchableOpacity>
            }
          />
        </View>
      ) : (
        <ScrollView style={styles.scrollView} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#c97454" />}>
          {milestonesLoading ? (
            <View>
              <MemoryCardSkeleton />
              <MemoryCardSkeleton />
            </View>
          ) : (
            <MilestoneTimeline
              milestones={milestones || []}
              onAdd={() => setShowAddMilestone(true)}
              onDelete={(id) => {
                hapticImpact();
                deleteMilestone.mutate(id);
              }}
              isPremium={isPremium}
              onShowPaywall={() => setShowPaywall(true)}
            />
          )}
        </ScrollView>
      )}

      <PhotoViewer
        photo={selectedPhoto}
        visible={showViewer}
        onClose={() => {
          setShowViewer(false);
          setSelectedPhoto(null);
        }}
      />

      <AddMilestoneModal
        visible={showAddMilestone}
        onClose={() => setShowAddMilestone(false)}
        onSubmit={(input) => {
          createMilestone.mutate(input, {
            onSuccess: () => setShowAddMilestone(false),
          });
        }}
        isSubmitting={createMilestone.isPending}
      />

      <Paywall visible={showPaywall} onClose={() => setShowPaywall(false)} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fef7f4',
  },
  header: {
    paddingHorizontal: 24,
    paddingTop: 32,
    paddingBottom: 8,
  },
  title: {
    fontSize: 28,
    fontWeight: '600',
    fontFamily: 'Alexandria-SemiBold',
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
    fontFamily: 'Inter-Medium',
    color: '#78716c',
  },
  activeTabText: {
    color: '#ffffff',
  },
  scrollView: {
    flex: 1,
    paddingHorizontal: 24,
  },
  photosContainer: {
    flex: 1,
    paddingHorizontal: 24,
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
    fontFamily: 'Inter-SemiBold',
    textAlign: 'center',
  },
  emptySubtitle: {
    fontSize: 14,
    color: '#78716c',
    fontFamily: 'Inter-Regular',
    textAlign: 'center',
    marginTop: 8,
  },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 20,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 2,
    overflow: 'hidden',
  },
  cardAccentBar: {
    height: 3,
    backgroundColor: '#c97454',
    marginHorizontal: -20,
    marginTop: -20,
    marginBottom: 20,
  },
  promptText: {
    fontSize: 16,
    color: '#57534e',
    fontFamily: 'Inter-Regular',
    fontStyle: 'italic',
    textAlign: 'center',
    marginBottom: 16,
  },
  responseBlock: {
    backgroundColor: '#fef7f4',
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
  },
  responseLabel: {
    fontSize: 12,
    color: '#78716c',
    fontWeight: '500',
    fontFamily: 'Inter-Medium',
    marginBottom: 4,
  },
  responseText: {
    fontSize: 15,
    color: '#292524',
    fontFamily: 'Inter-Regular',
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
    borderColor: '#f9a07a',
    alignItems: 'center',
  },
  saveButtonText: {
    fontSize: 14,
    color: '#c97454',
    fontWeight: '600',
    fontFamily: 'Inter-SemiBold',
  },
  savedLabel: {
    marginTop: 12,
    fontSize: 13,
    color: '#a8a29e',
    textAlign: 'center',
  },
  addPhotoBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    backgroundColor: '#fef3ee',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#f9a07a',
    marginBottom: 16,
  },
  addPhotoBtnText: {
    fontSize: 14,
    fontWeight: '600',
    fontFamily: 'Inter-SemiBold',
    color: '#c97454',
  },
});
