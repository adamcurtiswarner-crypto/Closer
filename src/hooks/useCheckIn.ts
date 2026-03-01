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
import { logEvent } from '@/services/analytics';

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
    onSuccess: (_data, responses) => {
      const scores = responses.map(r => r.score);
      const avgScore = scores.reduce((a, b) => a + b, 0) / scores.length;
      const dimensionScores: Record<string, number> = {};
      for (const r of responses) {
        dimensionScores[r.dimension] = r.score;
      }
      logEvent('checkin_submitted', {
        avg_score: Math.round(avgScore * 10) / 10,
        dimension_scores: dimensionScores,
      });
      queryClient.invalidateQueries({ queryKey: ['checkIn'] });
    },
  });

  // Dismiss check-in (clear flag without submitting)
  const dismissCheckIn = useMutation({
    mutationFn: async () => {
      if (!user?.id) throw new Error('Not authenticated');

      await updateDoc(doc(db, 'users', user.id), {
        pending_check_in: false,
      });

      logEvent('checkin_dismissed');
      await refreshUser();
    },
  });

  return {
    hasPendingCheckIn,
    latestCheckIn,
    isLoading,
    submitCheckIn,
    dismissCheckIn,
  };
}
