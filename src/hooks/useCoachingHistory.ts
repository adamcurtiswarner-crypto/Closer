import { useInfiniteQuery } from '@tanstack/react-query';
import {
  collection,
  query,
  orderBy,
  limit,
  getDocs,
  startAfter,
  QueryDocumentSnapshot,
} from 'firebase/firestore';
import { db } from '@/config/firebase';
import { useAuth } from './useAuth';

export interface CoachingInsightHistoryItem {
  id: string;
  pulseScore: number;
  insightText: string;
  actionType: string;
  actionText: string;
  createdAt: Date;
  dismissedAt: Date | null;
  actedOn: Date | null;
}

const PAGE_SIZE = 10;

export function useCoachingHistory() {
  const { user } = useAuth();

  return useInfiniteQuery({
    queryKey: ['coachingHistory', user?.coupleId],
    queryFn: async ({ pageParam }: { pageParam: QueryDocumentSnapshot | null }) => {
      if (!user?.coupleId) return { items: [], lastDoc: null };

      let q = query(
        collection(db, 'couples', user.coupleId, 'coaching_insights'),
        orderBy('created_at', 'desc'),
        limit(PAGE_SIZE),
      );

      if (pageParam) {
        q = query(
          collection(db, 'couples', user.coupleId, 'coaching_insights'),
          orderBy('created_at', 'desc'),
          startAfter(pageParam),
          limit(PAGE_SIZE),
        );
      }

      const snap = await getDocs(q);
      const items: CoachingInsightHistoryItem[] = snap.docs.map(d => {
        const data = d.data();
        return {
          id: d.id,
          pulseScore: data.pulse_score,
          insightText: data.insight_text,
          actionType: data.action_type,
          actionText: data.action_text,
          createdAt: data.created_at?.toDate(),
          dismissedAt: data.dismissed_at?.toDate() || null,
          actedOn: data.acted_on?.toDate() || null,
        };
      });

      const lastDoc = snap.docs[snap.docs.length - 1] || null;
      return { items, lastDoc };
    },
    initialPageParam: null as QueryDocumentSnapshot | null,
    getNextPageParam: (lastPage) => {
      if (lastPage.items.length < PAGE_SIZE) return undefined;
      return lastPage.lastDoc;
    },
    enabled: !!user?.coupleId,
    staleTime: 5 * 60 * 1000,
  });
}
