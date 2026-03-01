import { useQuery } from '@tanstack/react-query';
import { collection, query, orderBy, limit, getDocs } from 'firebase/firestore';
import { db } from '@/config/firebase';
import { useAuth } from './useAuth';

export function usePulseScore() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['pulseScore', user?.coupleId],
    queryFn: async () => {
      if (!user?.coupleId) return null;

      const q = query(
        collection(db, 'couples', user.coupleId, 'pulse_scores'),
        orderBy('created_at', 'desc'),
        limit(4),
      );
      const snap = await getDocs(q);

      if (snap.empty) return null;

      const scores = snap.docs.map(d => ({
        weekId: d.id,
        score: d.data().score as number,
        tier: d.data().tier as string,
        breakdown: d.data().breakdown,
        createdAt: d.data().created_at?.toDate(),
      }));

      return {
        current: scores[0],
        history: scores,
        trend: scores.length >= 2 ? scores[0].score - scores[1].score : 0,
      };
    },
    enabled: !!user?.coupleId,
    staleTime: 5 * 60 * 1000,
  });
}
