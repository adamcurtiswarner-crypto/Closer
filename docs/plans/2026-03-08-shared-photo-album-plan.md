# Feature #7: Shared Photo Album Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Enhance the Memories tab with a Photos grid (aggregating response, chat, and standalone photos) and a Milestones timeline.

**Architecture:** Client-side aggregation from three existing Firestore sources (prompt_completions, messages, standalone photos subcollection) into a unified PhotoItem type. New subcollections for standalone uploads and milestones. No migration or backend changes needed.

**Tech Stack:** React Native, Expo Router, Firebase Firestore, Firebase Storage, React Query, react-native-reanimated

---

### Task 1: Add Analytics Events and Upload Functions

**Files:**
- Modify: `src/services/analytics.ts`
- Modify: `src/services/imageUpload.ts`
- Modify: `storage.rules`

**Step 1: Add new analytics event types**

In `src/services/analytics.ts`, add these events to the `AnalyticsEvent` union type, after `'date_night_calendar_added'`:

```typescript
  | 'photo_grid_viewed'
  | 'photo_standalone_uploaded'
  | 'photo_viewed'
  | 'milestone_created'
  | 'milestone_viewed';
```

**Step 2: Add upload functions**

In `src/services/imageUpload.ts`, add these two functions at the end of the file:

```typescript
/**
 * Upload a standalone photo to the couple's shared album.
 * Returns the download URL.
 */
export async function uploadStandalonePhoto(
  coupleId: string,
  photoId: string,
  uri: string
): Promise<string> {
  const storageRef = ref(storage, `photos/${coupleId}/${photoId}.jpg`);
  const bytes = await readFileAsBytes(uri);

  await uploadBytesResumable(storageRef, bytes, { contentType: 'image/jpeg' });
  return getDownloadURL(storageRef);
}

/**
 * Upload a milestone photo.
 * Returns the download URL.
 */
export async function uploadMilestonePhoto(
  coupleId: string,
  milestoneId: string,
  uri: string
): Promise<string> {
  const storageRef = ref(storage, `milestones/${coupleId}/${milestoneId}.jpg`);
  const bytes = await readFileAsBytes(uri);

  await uploadBytesResumable(storageRef, bytes, { contentType: 'image/jpeg' });
  return getDownloadURL(storageRef);
}
```

**Step 3: Add storage rules for new paths**

In `storage.rules`, add these rules inside the `match /b/{bucket}/o` block, after the chat rules:

```
    // Standalone album photos: authenticated users only.
    match /photos/{coupleId}/{fileName} {
      allow read, write: if request.auth != null;
    }

    // Milestone photos: authenticated users only.
    match /milestones/{coupleId}/{fileName} {
      allow read, write: if request.auth != null;
    }
```

**Step 4: Commit**

```bash
git add src/services/analytics.ts src/services/imageUpload.ts storage.rules
git commit -m "feat: add photo album analytics events, upload functions, and storage rules"
```

---

### Task 2: usePhotoGrid Hook

**Files:**
- Create: `src/hooks/usePhotoGrid.ts`

**Step 1: Create the hook**

```typescript
import { useInfiniteQuery } from '@tanstack/react-query';
import {
  collection,
  query,
  where,
  orderBy,
  limit,
  getDocs,
  startAfter,
  QueryDocumentSnapshot,
  Timestamp,
} from 'firebase/firestore';
import { db } from '@/config/firebase';
import { useAuth } from './useAuth';

export interface PhotoItem {
  id: string;
  imageUrl: string;
  source: 'response' | 'chat' | 'standalone';
  date: Date;
  context: string; // prompt text, chat date, or caption
}

const PAGE_SIZE = 30;

async function fetchResponsePhotos(coupleId: string): Promise<PhotoItem[]> {
  const q = query(
    collection(db, 'prompt_completions'),
    where('couple_id', '==', coupleId),
    orderBy('completed_at', 'desc'),
  );
  const snap = await getDocs(q);
  const photos: PhotoItem[] = [];

  for (const doc of snap.docs) {
    const data = doc.data();
    const responses = data.responses || [];
    for (const r of responses) {
      if (r.image_url) {
        photos.push({
          id: `response-${doc.id}-${r.user_id}`,
          imageUrl: r.image_url,
          source: 'response',
          date: data.completed_at?.toDate() || new Date(),
          context: data.prompt_text || '',
        });
      }
    }
  }
  return photos;
}

async function fetchChatPhotos(coupleId: string): Promise<PhotoItem[]> {
  const q = query(
    collection(db, 'couples', coupleId, 'messages'),
    where('type', '==', 'image'),
    where('is_deleted', '==', false),
    orderBy('created_at', 'desc'),
  );
  const snap = await getDocs(q);

  return snap.docs
    .filter(doc => doc.data().image_url)
    .map(doc => {
      const data = doc.data();
      return {
        id: `chat-${doc.id}`,
        imageUrl: data.image_url,
        source: 'chat' as const,
        date: data.created_at?.toDate() || new Date(),
        context: data.text || 'Chat photo',
      };
    });
}

async function fetchStandalonePhotos(coupleId: string): Promise<PhotoItem[]> {
  const q = query(
    collection(db, 'couples', coupleId, 'photos'),
    orderBy('created_at', 'desc'),
  );
  const snap = await getDocs(q);

  return snap.docs.map(doc => {
    const data = doc.data();
    return {
      id: `standalone-${doc.id}`,
      imageUrl: data.image_url,
      source: 'standalone' as const,
      date: data.created_at?.toDate() || new Date(),
      context: data.caption || '',
    };
  });
}

export function usePhotoGrid() {
  const { user } = useAuth();

  return useInfiniteQuery({
    queryKey: ['photoGrid', user?.coupleId],
    queryFn: async ({ pageParam = 0 }): Promise<{ items: PhotoItem[]; nextOffset: number | null }> => {
      if (!user?.coupleId) return { items: [], nextOffset: null };

      // Fetch all three sources on first load, then paginate client-side
      // This is acceptable for MVP — see design doc "Future Work" for server-side pagination
      const [responsePhotos, chatPhotos, standalonePhotos] = await Promise.all([
        fetchResponsePhotos(user.coupleId),
        fetchChatPhotos(user.coupleId),
        fetchStandalonePhotos(user.coupleId),
      ]);

      const allPhotos = [...responsePhotos, ...chatPhotos, ...standalonePhotos]
        .sort((a, b) => b.date.getTime() - a.date.getTime());

      const start = pageParam as number;
      const end = start + PAGE_SIZE;
      const page = allPhotos.slice(start, end);
      const nextOffset = end < allPhotos.length ? end : null;

      return { items: page, nextOffset };
    },
    initialPageParam: 0,
    getNextPageParam: (lastPage) => lastPage.nextOffset,
    enabled: !!user?.coupleId,
    staleTime: 5 * 60 * 1000,
  });
}
```

**Step 2: Commit**

```bash
git add src/hooks/usePhotoGrid.ts
git commit -m "feat: add usePhotoGrid hook aggregating response, chat, and standalone photos"
```

---

### Task 3: useMilestones Hook

**Files:**
- Create: `src/hooks/useMilestones.ts`

**Step 1: Create the hook**

```typescript
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  collection,
  query,
  orderBy,
  getDocs,
  addDoc,
  deleteDoc,
  doc,
  serverTimestamp,
} from 'firebase/firestore';
import { db } from '@/config/firebase';
import { useAuth } from './useAuth';
import { logEvent } from '@/services/analytics';
import { uploadMilestonePhoto } from '@/services/imageUpload';

export type MilestoneCategory =
  | 'anniversary'
  | 'trip'
  | 'new_home'
  | 'first_date'
  | 'holiday'
  | 'achievement'
  | 'surprise'
  | 'custom';

export const MILESTONE_CATEGORIES: { value: MilestoneCategory; label: string }[] = [
  { value: 'anniversary', label: 'Anniversary' },
  { value: 'trip', label: 'Trip together' },
  { value: 'new_home', label: 'New home' },
  { value: 'first_date', label: 'First date' },
  { value: 'holiday', label: 'Holiday' },
  { value: 'achievement', label: 'Achievement' },
  { value: 'surprise', label: 'Surprise' },
  { value: 'custom', label: 'Custom' },
];

export interface Milestone {
  id: string;
  title: string;
  category: MilestoneCategory;
  description: string | null;
  imageUrl: string | null;
  date: Date;
  createdBy: string;
  createdAt: Date;
}

export interface CreateMilestoneInput {
  title: string;
  category: MilestoneCategory;
  description?: string;
  imageUri?: string;
  date: Date;
}

export function useMilestones() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['milestones', user?.coupleId],
    queryFn: async (): Promise<Milestone[]> => {
      if (!user?.coupleId) return [];

      const q = query(
        collection(db, 'couples', user.coupleId, 'milestones'),
        orderBy('date', 'desc'),
      );
      const snap = await getDocs(q);

      return snap.docs.map(d => {
        const data = d.data();
        return {
          id: d.id,
          title: data.title,
          category: data.category,
          description: data.description || null,
          imageUrl: data.image_url || null,
          date: data.date?.toDate() || new Date(),
          createdBy: data.created_by,
          createdAt: data.created_at?.toDate() || new Date(),
        };
      });
    },
    enabled: !!user?.coupleId,
    staleTime: 5 * 60 * 1000,
  });
}

export function useCreateMilestone() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: CreateMilestoneInput) => {
      if (!user?.coupleId) throw new Error('No couple');

      // Create doc first to get ID for image upload
      const milestoneRef = await addDoc(
        collection(db, 'couples', user.coupleId, 'milestones'),
        {
          title: input.title,
          category: input.category,
          description: input.description || null,
          image_url: null,
          date: input.date,
          created_by: user.id,
          created_at: serverTimestamp(),
        },
      );

      // Upload image if provided
      if (input.imageUri) {
        const imageUrl = await uploadMilestonePhoto(user.coupleId, milestoneRef.id, input.imageUri);
        const { updateDoc } = await import('firebase/firestore');
        await updateDoc(
          doc(db, 'couples', user.coupleId, 'milestones', milestoneRef.id),
          { image_url: imageUrl },
        );
      }

      logEvent('milestone_created', { category: input.category });
      return milestoneRef.id;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['milestones'] });
    },
  });
}

export function useDeleteMilestone() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (milestoneId: string) => {
      if (!user?.coupleId) throw new Error('No couple');
      await deleteDoc(doc(db, 'couples', user.coupleId, 'milestones', milestoneId));
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['milestones'] });
    },
  });
}
```

**Step 2: Commit**

```bash
git add src/hooks/useMilestones.ts
git commit -m "feat: add useMilestones hook with CRUD and category config"
```

---

### Task 4: useAddPhoto Hook

**Files:**
- Create: `src/hooks/useAddPhoto.ts`

**Step 1: Create the hook**

```typescript
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { collection, addDoc, doc, serverTimestamp } from 'firebase/firestore';
import { db } from '@/config/firebase';
import { useAuth } from './useAuth';
import { uploadStandalonePhoto } from '@/services/imageUpload';
import { logEvent } from '@/services/analytics';

export interface AddPhotoInput {
  uri: string;
  caption?: string;
}

export function useAddPhoto() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: AddPhotoInput) => {
      if (!user?.coupleId) throw new Error('No couple');

      // Create doc first to get ID
      const photoRef = await addDoc(
        collection(db, 'couples', user.coupleId, 'photos'),
        {
          image_url: '',
          caption: input.caption || null,
          uploaded_by: user.id,
          created_at: serverTimestamp(),
        },
      );

      // Upload to storage
      const imageUrl = await uploadStandalonePhoto(user.coupleId, photoRef.id, input.uri);

      // Update doc with URL
      const { updateDoc } = await import('firebase/firestore');
      await updateDoc(
        doc(db, 'couples', user.coupleId, 'photos', photoRef.id),
        { image_url: imageUrl },
      );

      logEvent('photo_standalone_uploaded', {});
      return photoRef.id;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['photoGrid'] });
    },
  });
}
```

**Step 2: Commit**

```bash
git add src/hooks/useAddPhoto.ts
git commit -m "feat: add useAddPhoto hook for standalone photo uploads"
```

---

### Task 5: PhotoGrid Component

**Files:**
- Create: `src/components/PhotoGrid.tsx`

**Step 1: Create the component**

```typescript
import React from 'react';
import {
  View,
  Image,
  FlatList,
  TouchableOpacity,
  Dimensions,
  StyleSheet,
  ActivityIndicator,
  Text,
} from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';
import type { PhotoItem } from '@/hooks/usePhotoGrid';

const { width } = Dimensions.get('window');
const GAP = 2;
const COLUMNS = 3;
const THUMB_SIZE = (width - 48 - GAP * (COLUMNS - 1)) / COLUMNS;

interface PhotoGridProps {
  photos: PhotoItem[];
  onPhotoPress: (photo: PhotoItem) => void;
  onEndReached?: () => void;
  isLoadingMore?: boolean;
  ListHeaderComponent?: React.ReactElement;
}

export function PhotoGrid({ photos, onPhotoPress, onEndReached, isLoadingMore, ListHeaderComponent }: PhotoGridProps) {
  if (photos.length === 0) {
    return (
      <Animated.View entering={FadeIn.duration(400)} style={styles.empty}>
        <Text style={styles.emptyTitle}>No photos yet</Text>
        <Text style={styles.emptySubtitle}>
          Photos from your prompts, chats, and uploads will appear here.
        </Text>
      </Animated.View>
    );
  }

  return (
    <FlatList
      data={photos}
      numColumns={COLUMNS}
      keyExtractor={(item) => item.id}
      ListHeaderComponent={ListHeaderComponent}
      columnWrapperStyle={styles.row}
      contentContainerStyle={styles.grid}
      onEndReached={onEndReached}
      onEndReachedThreshold={0.5}
      renderItem={({ item }) => (
        <TouchableOpacity
          style={styles.thumb}
          onPress={() => onPhotoPress(item)}
          activeOpacity={0.8}
        >
          <Image source={{ uri: item.imageUrl }} style={styles.thumbImage} />
        </TouchableOpacity>
      )}
      ListFooterComponent={
        isLoadingMore ? (
          <View style={styles.loading}>
            <ActivityIndicator size="small" color="#ef5323" />
          </View>
        ) : null
      }
    />
  );
}

const styles = StyleSheet.create({
  grid: {
    paddingBottom: 24,
  },
  row: {
    gap: GAP,
    marginBottom: GAP,
  },
  thumb: {
    width: THUMB_SIZE,
    height: THUMB_SIZE,
    borderRadius: 4,
    overflow: 'hidden',
  },
  thumbImage: {
    width: '100%',
    height: '100%',
  },
  empty: {
    alignItems: 'center',
    paddingTop: 80,
    paddingHorizontal: 24,
  },
  emptyTitle: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#57534e',
    textAlign: 'center',
  },
  emptySubtitle: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#78716c',
    textAlign: 'center',
    marginTop: 8,
  },
  loading: {
    paddingVertical: 16,
    alignItems: 'center',
  },
});
```

**Step 2: Commit**

```bash
git add src/components/PhotoGrid.tsx
git commit -m "feat: add PhotoGrid component with 3-column thumbnail layout"
```

---

### Task 6: PhotoViewer Component

**Files:**
- Create: `src/components/PhotoViewer.tsx`

**Step 1: Create the component**

```typescript
import React from 'react';
import {
  View,
  Image,
  Text,
  Modal,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { FadeIn, FadeInUp } from 'react-native-reanimated';
import { Icon } from '@components';
import type { PhotoItem } from '@/hooks/usePhotoGrid';
import { format } from 'date-fns';

const { width, height } = Dimensions.get('window');

interface PhotoViewerProps {
  photo: PhotoItem | null;
  visible: boolean;
  onClose: () => void;
}

const SOURCE_LABELS: Record<string, string> = {
  response: 'From a prompt',
  chat: 'From chat',
  standalone: 'Album photo',
};

export function PhotoViewer({ photo, visible, onClose }: PhotoViewerProps) {
  if (!photo) return null;

  return (
    <Modal visible={visible} animationType="fade" transparent statusBarTranslucent>
      <View style={styles.overlay}>
        <SafeHeader onClose={onClose} />

        <Animated.View entering={FadeIn.duration(300)} style={styles.imageWrap}>
          <Image
            source={{ uri: photo.imageUrl }}
            style={styles.image}
            resizeMode="contain"
          />
        </Animated.View>

        <Animated.View entering={FadeInUp.duration(300).delay(100)} style={styles.info}>
          <Text style={styles.source}>{SOURCE_LABELS[photo.source] || 'Photo'}</Text>
          <Text style={styles.date}>{format(photo.date, 'MMMM d, yyyy')}</Text>
          {photo.context ? (
            <Text style={styles.context} numberOfLines={3}>{photo.context}</Text>
          ) : null}
        </Animated.View>
      </View>
    </Modal>
  );
}

function SafeHeader({ onClose }: { onClose: () => void }) {
  const insets = useSafeAreaInsets();
  return (
    <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
      <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
        <Icon name="x" size="sm" color="#ffffff" />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: '#000000',
  },
  header: {
    paddingHorizontal: 16,
    paddingBottom: 8,
    alignItems: 'flex-end',
  },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  imageWrap: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  image: {
    width: width,
    height: height * 0.6,
  },
  info: {
    paddingHorizontal: 24,
    paddingBottom: 40,
  },
  source: {
    fontSize: 11,
    fontWeight: '600',
    fontFamily: 'Inter-SemiBold',
    color: 'rgba(255,255,255,0.5)',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  date: {
    fontSize: 16,
    fontWeight: '600',
    fontFamily: 'Inter-SemiBold',
    color: '#ffffff',
    marginBottom: 6,
  },
  context: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: 'rgba(255,255,255,0.7)',
    lineHeight: 20,
  },
});
```

**Step 2: Commit**

```bash
git add src/components/PhotoViewer.tsx
git commit -m "feat: add PhotoViewer full-screen modal with context info"
```

---

### Task 7: MilestoneTimeline Component

**Files:**
- Create: `src/components/MilestoneTimeline.tsx`

**Step 1: Create the component**

```typescript
import React from 'react';
import {
  View,
  Text,
  Image,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import Animated, { FadeIn, FadeInUp } from 'react-native-reanimated';
import { format } from 'date-fns';
import { Icon } from '@components';
import { SwipeableRow } from '@components';
import type { Milestone } from '@/hooks/useMilestones';

const CATEGORY_ICONS: Record<string, string> = {
  anniversary: 'heart',
  trip: 'airplane',
  new_home: 'house-simple',
  first_date: 'star',
  holiday: 'gift',
  achievement: 'trophy',
  surprise: 'confetti',
  custom: 'note',
};

interface MilestoneTimelineProps {
  milestones: Milestone[];
  onAdd: () => void;
  onDelete: (id: string) => void;
  isPremium: boolean;
  onShowPaywall: () => void;
}

export function MilestoneTimeline({ milestones, onAdd, onDelete, isPremium, onShowPaywall }: MilestoneTimelineProps) {
  return (
    <View style={styles.container}>
      {/* Add button */}
      <Animated.View entering={FadeIn.duration(400)}>
        <TouchableOpacity
          style={styles.addBtn}
          onPress={isPremium ? onAdd : onShowPaywall}
          activeOpacity={0.8}
        >
          <Icon name="plus" size="sm" color="#ef5323" />
          <Text style={styles.addBtnText}>Add milestone</Text>
        </TouchableOpacity>
      </Animated.View>

      {milestones.length === 0 ? (
        <Animated.View entering={FadeIn.duration(400).delay(100)} style={styles.empty}>
          <Text style={styles.emptyTitle}>No milestones yet</Text>
          <Text style={styles.emptySubtitle}>
            Mark the moments that matter — anniversaries, trips, firsts.
          </Text>
        </Animated.View>
      ) : (
        milestones.map((milestone, index) => (
          <Animated.View
            key={milestone.id}
            entering={FadeInUp.duration(400).delay(Math.min(index * 80, 400))}
          >
            <SwipeableRow
              rightActions={[{
                label: 'Remove',
                color: '#ef4444',
                onPress: () => onDelete(milestone.id),
              }]}
            >
              <View style={styles.card}>
                <View style={styles.timeline}>
                  <View style={styles.dot} />
                  {index < milestones.length - 1 && <View style={styles.line} />}
                </View>
                <View style={styles.cardContent}>
                  <Text style={styles.dateText}>{format(milestone.date, 'MMMM d, yyyy')}</Text>
                  <Text style={styles.titleText}>{milestone.title}</Text>
                  {milestone.description ? (
                    <Text style={styles.descText}>{milestone.description}</Text>
                  ) : null}
                  {milestone.imageUrl ? (
                    <Image
                      source={{ uri: milestone.imageUrl }}
                      style={styles.milestoneImage}
                      resizeMode="cover"
                    />
                  ) : null}
                </View>
              </View>
            </SwipeableRow>
          </Animated.View>
        ))
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingBottom: 24,
  },
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    backgroundColor: '#fef3ee',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#f9a07a',
    marginBottom: 24,
  },
  addBtnText: {
    fontSize: 14,
    fontWeight: '600',
    fontFamily: 'Inter-SemiBold',
    color: '#ef5323',
  },
  empty: {
    alignItems: 'center',
    paddingTop: 48,
    paddingHorizontal: 24,
  },
  emptyTitle: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#57534e',
    textAlign: 'center',
  },
  emptySubtitle: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#78716c',
    textAlign: 'center',
    marginTop: 8,
  },
  card: {
    flexDirection: 'row',
    marginBottom: 4,
  },
  timeline: {
    width: 24,
    alignItems: 'center',
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#ef5323',
    marginTop: 4,
  },
  line: {
    width: 2,
    flex: 1,
    backgroundColor: '#f5f5f4',
    marginTop: 4,
  },
  cardContent: {
    flex: 1,
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 16,
    marginLeft: 8,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#f5f5f4',
  },
  dateText: {
    fontSize: 12,
    fontFamily: 'Inter-Medium',
    color: '#78716c',
    marginBottom: 4,
  },
  titleText: {
    fontSize: 16,
    fontWeight: '600',
    fontFamily: 'Inter-SemiBold',
    color: '#1c1917',
    marginBottom: 4,
  },
  descText: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#57534e',
    lineHeight: 20,
    marginBottom: 8,
  },
  milestoneImage: {
    width: '100%',
    height: 160,
    borderRadius: 12,
    marginTop: 4,
  },
});
```

**Step 2: Commit**

```bash
git add src/components/MilestoneTimeline.tsx
git commit -m "feat: add MilestoneTimeline component with vertical timeline layout"
```

---

### Task 8: AddMilestoneModal Component

**Files:**
- Create: `src/components/AddMilestoneModal.tsx`

**Step 1: Create the component**

```typescript
import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Modal,
  ScrollView,
  Image,
  StyleSheet,
  ActivityIndicator,
  Platform,
} from 'react-native';
import Animated, { FadeIn, FadeInUp } from 'react-native-reanimated';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Icon } from '@components';
import { pickImage } from '@/services/imageUpload';
import { MILESTONE_CATEGORIES, type MilestoneCategory, type CreateMilestoneInput } from '@/hooks/useMilestones';
import { hapticImpact, ImpactFeedbackStyle } from '@utils/haptics';

interface AddMilestoneModalProps {
  visible: boolean;
  onClose: () => void;
  onSubmit: (input: CreateMilestoneInput) => void;
  isSubmitting: boolean;
}

export function AddMilestoneModal({ visible, onClose, onSubmit, isSubmitting }: AddMilestoneModalProps) {
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState<MilestoneCategory>('anniversary');
  const [customTitle, setCustomTitle] = useState('');
  const [description, setDescription] = useState('');
  const [date, setDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [imageUri, setImageUri] = useState<string | null>(null);

  const reset = () => {
    setTitle('');
    setCategory('anniversary');
    setCustomTitle('');
    setDescription('');
    setDate(new Date());
    setImageUri(null);
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  const handleSubmit = () => {
    const finalTitle = category === 'custom' ? customTitle : title || MILESTONE_CATEGORIES.find(c => c.value === category)?.label || '';
    if (!finalTitle.trim()) return;

    hapticImpact(ImpactFeedbackStyle.Medium);
    onSubmit({
      title: finalTitle.trim(),
      category,
      description: description.trim() || undefined,
      imageUri: imageUri || undefined,
      date,
    });
    reset();
  };

  const handlePickImage = async () => {
    const uri = await pickImage();
    if (uri) setImageUri(uri);
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={handleClose}>
            <Text style={styles.cancelText}>Cancel</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>New Milestone</Text>
          <TouchableOpacity onPress={handleSubmit} disabled={isSubmitting}>
            {isSubmitting ? (
              <ActivityIndicator size="small" color="#ef5323" />
            ) : (
              <Text style={styles.saveText}>Save</Text>
            )}
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.form} contentContainerStyle={styles.formContent}>
          {/* Category picker */}
          <Text style={styles.label}>Type</Text>
          <View style={styles.categoryGrid}>
            {MILESTONE_CATEGORIES.map((cat) => (
              <TouchableOpacity
                key={cat.value}
                style={[styles.categoryPill, category === cat.value && styles.categoryPillActive]}
                onPress={() => {
                  setCategory(cat.value);
                  if (cat.value !== 'custom') setTitle(cat.label);
                }}
              >
                <Text style={[styles.categoryPillText, category === cat.value && styles.categoryPillTextActive]}>
                  {cat.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Custom title */}
          {category === 'custom' && (
            <Animated.View entering={FadeIn.duration(200)}>
              <Text style={styles.label}>Title</Text>
              <TextInput
                style={styles.input}
                value={customTitle}
                onChangeText={setCustomTitle}
                placeholder="What happened?"
                placeholderTextColor="#a8a29e"
              />
            </Animated.View>
          )}

          {/* Date */}
          <Text style={styles.label}>Date</Text>
          <TouchableOpacity style={styles.dateBtn} onPress={() => setShowDatePicker(true)}>
            <Icon name="calendar" size="sm" color="#78716c" />
            <Text style={styles.dateBtnText}>
              {date.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
            </Text>
          </TouchableOpacity>
          {showDatePicker && (
            <DateTimePicker
              value={date}
              mode="date"
              maximumDate={new Date()}
              onChange={(_, selectedDate) => {
                setShowDatePicker(Platform.OS === 'ios');
                if (selectedDate) setDate(selectedDate);
              }}
            />
          )}

          {/* Description */}
          <Text style={styles.label}>Description (optional)</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            value={description}
            onChangeText={setDescription}
            placeholder="A few words about this moment..."
            placeholderTextColor="#a8a29e"
            multiline
            numberOfLines={3}
          />

          {/* Photo */}
          <Text style={styles.label}>Photo (optional)</Text>
          {imageUri ? (
            <TouchableOpacity onPress={handlePickImage}>
              <Image source={{ uri: imageUri }} style={styles.previewImage} resizeMode="cover" />
              <Text style={styles.changePhotoText}>Tap to change</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity style={styles.photoBtn} onPress={handlePickImage}>
              <Icon name="camera" size="sm" color="#78716c" />
              <Text style={styles.photoBtnText}>Add a photo</Text>
            </TouchableOpacity>
          )}
        </ScrollView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fafaf9',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f5f5f4',
  },
  cancelText: {
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    color: '#78716c',
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '600',
    fontFamily: 'Inter-SemiBold',
    color: '#1c1917',
  },
  saveText: {
    fontSize: 16,
    fontWeight: '600',
    fontFamily: 'Inter-SemiBold',
    color: '#ef5323',
  },
  form: {
    flex: 1,
  },
  formContent: {
    padding: 20,
    paddingBottom: 40,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    fontFamily: 'Inter-SemiBold',
    color: '#78716c',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 8,
    marginTop: 20,
  },
  categoryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  categoryPill: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#f5f5f4',
  },
  categoryPillActive: {
    backgroundColor: '#ef5323',
  },
  categoryPillText: {
    fontSize: 14,
    fontFamily: 'Inter-Medium',
    color: '#57534e',
  },
  categoryPillTextActive: {
    color: '#ffffff',
  },
  input: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e7e5e4',
    padding: 14,
    fontSize: 15,
    fontFamily: 'Inter-Regular',
    color: '#1c1917',
  },
  textArea: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  dateBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#ffffff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e7e5e4',
    padding: 14,
  },
  dateBtnText: {
    fontSize: 15,
    fontFamily: 'Inter-Regular',
    color: '#1c1917',
  },
  photoBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 32,
    backgroundColor: '#ffffff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e7e5e4',
    borderStyle: 'dashed',
  },
  photoBtnText: {
    fontSize: 14,
    fontFamily: 'Inter-Medium',
    color: '#78716c',
  },
  previewImage: {
    width: '100%',
    height: 200,
    borderRadius: 12,
  },
  changePhotoText: {
    fontSize: 12,
    fontFamily: 'Inter-Regular',
    color: '#a8a29e',
    textAlign: 'center',
    marginTop: 6,
  },
});
```

**Note:** This component uses `@react-native-community/datetimepicker`. Check if it's installed:

```bash
npm ls @react-native-community/datetimepicker
```

If not installed, run:

```bash
npx expo install @react-native-community/datetimepicker
```

**Step 2: Commit**

```bash
git add src/components/AddMilestoneModal.tsx
git commit -m "feat: add AddMilestoneModal with category picker, date, photo, description"
```

---

### Task 9: Wire Up Memories Screen

**Files:**
- Modify: `app/(app)/memories.tsx`
- Modify: `src/components/index.ts`

**Step 1: Rewrite memories.tsx**

Replace the entire contents of `app/(app)/memories.tsx` with the updated version that has three sub-tabs. The key changes:

1. Change `type Tab = 'recap' | 'saved'` to `type Tab = 'recap' | 'photos' | 'milestones'`
2. Remove the old "saved" tab
3. Add "Photos" and "Milestones" tabs
4. Import and render `PhotoGrid`, `PhotoViewer`, `MilestoneTimeline`, `AddMilestoneModal`
5. Import `usePhotoGrid`, `useMilestones`, `useCreateMilestone`, `useDeleteMilestone`, `useAddPhoto`
6. Add photo viewer state (`selectedPhoto`, `showViewer`)
7. Add milestone modal state (`showAddMilestone`)
8. Add standalone photo upload button above the photo grid (premium-gated)
9. Fire analytics events: `photo_grid_viewed`, `photo_viewed`, `milestone_viewed`
10. Keep the existing `onRefresh` pattern, extending it to cover the new tabs

The "saved" memories functionality is being replaced by milestones. The save-to-memories button on This Week cards stays — it saves to `memory_artifacts` as before. But the dedicated "Saved" tab is replaced by "Photos" and "Milestones".

Key imports to add:

```typescript
import { usePhotoGrid, type PhotoItem } from '@/hooks/usePhotoGrid';
import { useMilestones, useCreateMilestone, useDeleteMilestone } from '@/hooks/useMilestones';
import { useAddPhoto } from '@/hooks/useAddPhoto';
import { PhotoGrid } from '@/components/PhotoGrid';
import { PhotoViewer } from '@/components/PhotoViewer';
import { MilestoneTimeline } from '@/components/MilestoneTimeline';
import { AddMilestoneModal } from '@/components/AddMilestoneModal';
import { pickImage } from '@/services/imageUpload';
```

State additions:

```typescript
const [selectedPhoto, setSelectedPhoto] = useState<PhotoItem | null>(null);
const [showViewer, setShowViewer] = useState(false);
const [showAddMilestone, setShowAddMilestone] = useState(false);
```

**Step 2: Add barrel exports**

In `src/components/index.ts`, add under the `// Home` section (or create a `// Photos` section):

```typescript
// Photos & Milestones
export { PhotoGrid } from './PhotoGrid';
export { PhotoViewer } from './PhotoViewer';
export { MilestoneTimeline } from './MilestoneTimeline';
export { AddMilestoneModal } from './AddMilestoneModal';
```

**Step 3: Commit**

```bash
git add "app/(app)/memories.tsx" src/components/index.ts
git commit -m "feat: wire photo grid and milestone timeline into Memories screen"
```

---

### Task 10: Verify and Push

**Step 1: Run type check**

```bash
npm run typecheck
```

Expect: Only pre-existing `admin/` errors. Zero errors in `src/` or `app/`.

**Step 2: Run tests**

```bash
npm test -- --silent
```

Expect: All suites pass. New hooks don't have tests yet (acceptable for MVP — they're thin Firestore wrappers).

**Step 3: Push**

```bash
git push origin main
```

**Step 4: Commit plan doc**

```bash
git add docs/plans/2026-03-08-shared-photo-album-plan.md
git commit -m "docs: add Feature #7 shared photo album implementation plan"
git push origin main
```
