import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  collection,
  query,
  where,
  orderBy,
  limit,
  getDocs,
  addDoc,
  serverTimestamp,
  doc,
  updateDoc,
} from 'firebase/firestore';
import { db } from '@/config/firebase';
import { useAuth } from './useAuth';

export function useCheckIn() {
  const { user, refreshUser } = useAuth();
  const queryClient = useQueryClient();

  // Check if user has a pending check-in
  const hasPendingCheckIn = user?.pendingCheckIn === true;

  // Fetch latest check-in for this user
  const { data: latestCheckIn, isLoading } = useQuery({
    queryKey: ['checkIn', 'latest', user?.id],
    queryFn: async () => {
      if (!user?.coupleId) return null;
      const q = query(
        collection(db, 'couples', user.coupleId, 'check_ins'),
        where('user_id', '==', user.id),
        orderBy('created_at', 'desc'),
        limit(1),
      );
      const snap = await getDocs(q);
      if (snap.empty) return null;
      const data = snap.docs[0].data();
      return {
        id: snap.docs[0].id,
        responses: data.responses,
        createdAt: data.created_at?.toDate(),
      };
    },
    enabled: !!user?.coupleId,
  });

  // Submit check-in
  const submitCheckIn = useMutation({
    mutationFn: async (responses: { questionId: string; dimension: string; score: number }[]) => {
      if (!user?.coupleId || !user?.id) throw new Error('Not authenticated');

      await addDoc(collection(db, 'couples', user.coupleId, 'check_ins'), {
        user_id: user.id,
        responses,
        created_at: serverTimestamp(),
      });

      // Clear pending flag
      await updateDoc(doc(db, 'users', user.id), {
        pending_check_in: false,
      });

      await refreshUser();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['checkIn'] });
    },
  });

  return {
    hasPendingCheckIn,
    latestCheckIn,
    isLoading,
    submitCheckIn,
  };
}
