import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  collection,
  doc,
  getDocs,
  addDoc,
  updateDoc,
  query,
  where,
  orderBy,
  serverTimestamp,
} from 'firebase/firestore';
import { db } from '@/config/firebase';
import { useAuth } from './useAuth';
import { logEvent } from '@/services/analytics';
import type { DateNight, DateNightCategory } from '@/types';

const STATUS_SORT_ORDER: Record<DateNight['status'], number> = {
  scheduled: 0,
  saved: 1,
  completed: 2,
  skipped: 3,
};

export function useDateNights() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['dateNights', user?.coupleId],
    queryFn: async (): Promise<DateNight[]> => {
      if (!user?.coupleId) return [];

      const ref = collection(db, 'couples', user.coupleId, 'date_nights');
      const q = query(
        ref,
        where('is_archived', '==', false),
        orderBy('created_at', 'desc')
      );
      const snap = await getDocs(q);

      const nights = snap.docs.map((d) => {
        const data = d.data();
        return {
          id: d.id,
          title: data.title,
          description: data.description || '',
          category: data.category as DateNightCategory,
          costTier: data.cost_tier,
          durationMinutes: data.duration_minutes ?? null,
          source: data.source,
          sourceId: data.source_id ?? null,
          status: data.status,
          addedBy: data.added_by,
          scheduledDate: data.scheduled_date?.toDate() ?? null,
          scheduledTime: data.scheduled_time ?? null,
          completedAt: data.completed_at?.toDate() ?? null,
          reflectionRating: data.reflection_rating ?? null,
          reflectionNote: data.reflection_note ?? null,
          isArchived: data.is_archived || false,
          createdAt: data.created_at?.toDate() ?? null,
          updatedAt: data.updated_at?.toDate() ?? null,
        } as DateNight;
      });

      // Sort: scheduled first, then saved, then completed/skipped
      nights.sort(
        (a, b) => STATUS_SORT_ORDER[a.status] - STATUS_SORT_ORDER[b.status]
      );

      return nights;
    },
    enabled: !!user?.coupleId,
  });
}

export function useAddDateNight() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: {
      title: string;
      description?: string;
      category: DateNightCategory;
      costTier: 'free' | '$' | '$$' | '$$$';
      durationMinutes?: number | null;
      source: 'library' | 'custom';
      sourceId?: string | null;
      scheduledDate?: Date | null;
      scheduledTime?: string | null;
    }): Promise<string> => {
      if (!user?.coupleId) throw new Error('Not in a couple');

      const ref = collection(db, 'couples', user.coupleId, 'date_nights');

      const status =
        params.scheduledDate ? 'scheduled' : 'saved';

      const nightDoc = await addDoc(ref, {
        title: params.title,
        description: params.description || '',
        category: params.category,
        cost_tier: params.costTier,
        duration_minutes: params.durationMinutes ?? null,
        source: params.source,
        source_id: params.sourceId ?? null,
        status,
        added_by: user.id,
        scheduled_date: params.scheduledDate ?? null,
        scheduled_time: params.scheduledTime ?? null,
        completed_at: null,
        reflection_rating: null,
        reflection_note: null,
        is_archived: false,
        created_at: serverTimestamp(),
        updated_at: serverTimestamp(),
      });

      const eventName = status === 'scheduled' ? 'date_night_scheduled' : 'date_idea_saved';
      logEvent(eventName, {
        date_night_id: nightDoc.id,
        category: params.category,
        source: params.source,
      });

      return nightDoc.id;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dateNights'] });
    },
  });
}

export function useUpdateDateNight() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: {
      dateNightId: string;
      title?: string;
      description?: string;
      category?: DateNightCategory;
      costTier?: 'free' | '$' | '$$' | '$$$';
      durationMinutes?: number | null;
      status?: 'saved' | 'scheduled' | 'skipped';
      scheduledDate?: Date | null;
      scheduledTime?: string | null;
    }): Promise<void> => {
      if (!user?.coupleId) throw new Error('Not in a couple');

      const ref = doc(
        db,
        'couples',
        user.coupleId,
        'date_nights',
        params.dateNightId
      );

      const updates: Record<string, any> = {
        updated_at: serverTimestamp(),
      };

      if (params.title !== undefined) updates.title = params.title;
      if (params.description !== undefined) updates.description = params.description;
      if (params.category !== undefined) updates.category = params.category;
      if (params.costTier !== undefined) updates.cost_tier = params.costTier;
      if (params.durationMinutes !== undefined) updates.duration_minutes = params.durationMinutes;
      if (params.status !== undefined) updates.status = params.status;
      if (params.scheduledDate !== undefined) updates.scheduled_date = params.scheduledDate;
      if (params.scheduledTime !== undefined) updates.scheduled_time = params.scheduledTime;

      await updateDoc(ref, updates);

      if (params.status === 'scheduled') {
        logEvent('date_night_scheduled', {
          date_night_id: params.dateNightId,
        });
      }
      if (params.status === 'skipped') {
        logEvent('date_night_skipped', {
          date_night_id: params.dateNightId,
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dateNights'] });
    },
  });
}

export function useCompleteDateNight() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: {
      dateNightId: string;
      reflectionRating?: 'warm' | 'okay' | 'not_great';
      reflectionNote?: string;
    }): Promise<void> => {
      if (!user?.coupleId) throw new Error('Not in a couple');

      const ref = doc(
        db,
        'couples',
        user.coupleId,
        'date_nights',
        params.dateNightId
      );

      await updateDoc(ref, {
        status: 'completed',
        completed_at: serverTimestamp(),
        reflection_rating: params.reflectionRating ?? null,
        reflection_note: params.reflectionNote ?? null,
        updated_at: serverTimestamp(),
      });

      logEvent('date_night_completed', {
        date_night_id: params.dateNightId,
      });

      if (params.reflectionRating) {
        logEvent('date_night_reflected', {
          date_night_id: params.dateNightId,
          rating: params.reflectionRating,
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dateNights'] });
    },
  });
}

export function useArchiveDateNight() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (dateNightId: string): Promise<void> => {
      if (!user?.coupleId) throw new Error('Not in a couple');

      const ref = doc(
        db,
        'couples',
        user.coupleId,
        'date_nights',
        dateNightId
      );

      await updateDoc(ref, {
        is_archived: true,
        updated_at: serverTimestamp(),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dateNights'] });
    },
  });
}
