import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  collection,
  query,
  orderBy,
  getDocs,
  addDoc,
  deleteDoc,
  updateDoc,
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

      if (input.imageUri) {
        const imageUrl = await uploadMilestonePhoto(user.coupleId, milestoneRef.id, input.imageUri);
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
