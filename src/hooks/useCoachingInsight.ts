import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  collection,
  query,
  orderBy,
  limit,
  getDocs,
  doc,
  updateDoc,
  serverTimestamp,
} from 'firebase/firestore';
import { db } from '@/config/firebase';
import { useAuth } from './useAuth';

export function useCoachingInsight() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: latestInsight, isLoading } = useQuery({
    queryKey: ['coachingInsight', user?.coupleId],
    queryFn: async () => {
      if (!user?.coupleId) return null;

      const q = query(
        collection(db, 'couples', user.coupleId, 'coaching_insights'),
        orderBy('created_at', 'desc'),
        limit(1),
      );
      const snap = await getDocs(q);

      if (snap.empty) return null;

      const data = snap.docs[0].data();
      return {
        id: snap.docs[0].id,
        pulseScore: data.pulse_score,
        insightText: data.insight_text,
        actionType: data.action_type,
        actionText: data.action_text,
        createdAt: data.created_at?.toDate(),
        dismissedAt: data.dismissed_at?.toDate() || null,
        actedOn: data.acted_on?.toDate() || null,
      };
    },
    enabled: !!user?.coupleId,
    staleTime: 5 * 60 * 1000,
  });

  const dismissInsight = useMutation({
    mutationFn: async (insightId: string) => {
      if (!user?.coupleId) throw new Error('No couple');
      await updateDoc(
        doc(db, 'couples', user.coupleId, 'coaching_insights', insightId),
        { dismissed_at: serverTimestamp() },
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['coachingInsight'] });
    },
  });

  const markActedOn = useMutation({
    mutationFn: async (insightId: string) => {
      if (!user?.coupleId) throw new Error('No couple');
      await updateDoc(
        doc(db, 'couples', user.coupleId, 'coaching_insights', insightId),
        { acted_on: serverTimestamp() },
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['coachingInsight'] });
    },
  });

  return {
    latestInsight,
    isLoading,
    dismissInsight,
    markActedOn,
  };
}
