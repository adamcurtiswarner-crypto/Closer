import { useQuery } from '@tanstack/react-query';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { format } from 'date-fns';
import { db } from '@/config/firebase';
import { useAuth } from './useAuth';

/**
 * Track free-tier usage: how many follow-ups the couple has completed
 * (all time) and how many explore sends they have initiated this month.
 * Both counts come from Firestore — no local state to drift.
 */
export function useFreeUsage() {
  const { user } = useAuth();
  const coupleId = user?.coupleId;
  const currentMonth = format(new Date(), 'yyyy-MM');

  return useQuery({
    queryKey: ['freeUsage', coupleId, currentMonth],
    queryFn: async () => {
      if (!coupleId) return { followUpsCompleted: 0, exploreSendsThisMonth: 0 };

      // Count completed follow-up assignments (all time)
      const followUpSnap = await getDocs(
        query(
          collection(db, 'prompt_assignments'),
          where('couple_id', '==', coupleId),
          where('source', '==', 'follow_up'),
          where('status', '==', 'completed')
        )
      );

      // Count explore sends this calendar month
      const monthStart = `${currentMonth}-01`;
      const monthEnd = `${currentMonth}-31`;
      const exploreSnap = await getDocs(
        query(
          collection(db, 'prompt_assignments'),
          where('couple_id', '==', coupleId),
          where('source', '==', 'explore'),
          where('assigned_date', '>=', monthStart),
          where('assigned_date', '<=', monthEnd)
        )
      );

      return {
        followUpsCompleted: followUpSnap.size,
        exploreSendsThisMonth: exploreSnap.size,
      };
    },
    enabled: !!coupleId,
    staleTime: 2 * 60 * 1000,
  });
}
