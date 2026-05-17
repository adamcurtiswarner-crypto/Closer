import { useQuery } from '@tanstack/react-query';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '@/config/firebase';
import { useAuth } from './useAuth';
import { startOfWeek, addDays, format, isToday, isBefore, startOfDay } from 'date-fns';

export type DayStatus = 'completed' | 'missed' | 'today' | 'upcoming';

export interface DayActivity {
  date: string; // YYYY-MM-DD
  label: string; // Mon, Tue, etc.
  status: DayStatus;
}

export interface WeeklyActivity {
  days: DayActivity[];
  completedCount: number;
}

export function useWeeklyActivity(): WeeklyActivity & { isLoading: boolean } {
  const { user } = useAuth();
  const coupleId = user?.coupleId;

  const { data, isLoading } = useQuery({
    queryKey: ['weeklyActivity', coupleId],
    queryFn: async (): Promise<WeeklyActivity> => {
      if (!coupleId) return { days: getEmptyWeek(), completedCount: 0 };

      // Get Monday of current week
      const monday = startOfWeek(new Date(), { weekStartsOn: 1 });
      const sunday = addDays(monday, 6);
      const mondayStr = format(monday, 'yyyy-MM-dd');
      const sundayStr = format(sunday, 'yyyy-MM-dd');

      // Query completed assignments for this week
      const assignmentsRef = collection(db, 'prompt_assignments');
      const q = query(
        assignmentsRef,
        where('couple_id', '==', coupleId),
        where('assigned_date', '>=', mondayStr),
        where('assigned_date', '<=', sundayStr),
      );
      const snap = await getDocs(q);

      // Build a set of completed dates (exclude explore prompts)
      const completedDates = new Set<string>();
      snap.docs.forEach((doc) => {
        const data = doc.data();
        if (data.status === 'completed' && data.source !== 'explore') {
          completedDates.add(data.assigned_date);
        }
      });

      // Build the 7-day array
      const today = startOfDay(new Date());
      const days: DayActivity[] = [];
      let completedCount = 0;

      for (let i = 0; i < 7; i++) {
        const day = addDays(monday, i);
        const dateStr = format(day, 'yyyy-MM-dd');
        const label = format(day, 'EEE'); // Mon, Tue, Wed...
        const isDayToday = isToday(day);
        const isPast = isBefore(day, today);

        let status: DayStatus;
        if (completedDates.has(dateStr)) {
          status = 'completed';
          completedCount++;
        } else if (isDayToday) {
          status = 'today';
        } else if (isPast) {
          status = 'missed';
        } else {
          status = 'upcoming';
        }

        days.push({ date: dateStr, label, status });
      }

      return { days, completedCount };
    },
    enabled: !!coupleId,
    staleTime: 2 * 60 * 1000, // 2 min
  });

  return {
    days: data?.days ?? getEmptyWeek(),
    completedCount: data?.completedCount ?? 0,
    isLoading,
  };
}

function getEmptyWeek(): DayActivity[] {
  const monday = startOfWeek(new Date(), { weekStartsOn: 1 });
  return Array.from({ length: 7 }, (_, i) => {
    const day = addDays(monday, i);
    return {
      date: format(day, 'yyyy-MM-dd'),
      label: format(day, 'EEE'),
      status: (isToday(day) ? 'today' : isBefore(day, startOfDay(new Date())) ? 'missed' : 'upcoming') as DayStatus,
    };
  });
}
