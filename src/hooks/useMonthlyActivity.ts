import { useQuery } from '@tanstack/react-query';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '@/config/firebase';
import { useAuth } from './useAuth';
import {
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  format,
  isToday,
  isBefore,
  startOfDay,
  getDay,
} from 'date-fns';

export type DayStatus =
  | 'completed'      // Both partners answered — orange with gold outline
  | 'partial-you'    // You answered, partner hasn't — blue check
  | 'partial-partner' // Partner answered, you haven't — blue check
  | 'missed'         // Past day, no completion — pink with X
  | 'today'          // Today, not yet completed
  | 'upcoming';      // Future day

export interface DayActivity {
  date: string;       // YYYY-MM-DD
  dayNumber: number;  // 1-31
  status: DayStatus;
}

export interface MonthlyActivity {
  days: DayActivity[];
  completedCount: number;
  partialCount: number;
  month: string;      // "May"
  year: number;       // 2026
  startDayOffset: number; // 0=Mon, 1=Tue... for grid alignment
}

export function useMonthlyActivity(): MonthlyActivity & { isLoading: boolean } {
  const { user } = useAuth();
  const coupleId = user?.coupleId;
  const userId = user?.id;

  const now = new Date();
  const monthStart = startOfMonth(now);
  const monthEnd = endOfMonth(now);

  const { data, isLoading } = useQuery({
    queryKey: ['monthlyActivity', coupleId, format(now, 'yyyy-MM')],
    queryFn: async (): Promise<MonthlyActivity> => {
      if (!coupleId || !userId) return getEmptyMonth();

      const startStr = format(monthStart, 'yyyy-MM-dd');
      const endStr = format(monthEnd, 'yyyy-MM-dd');

      // Query all assignments for the month
      const assignmentsRef = collection(db, 'prompt_assignments');
      const q = query(
        assignmentsRef,
        where('couple_id', '==', coupleId),
        where('assigned_date', '>=', startStr),
        where('assigned_date', '<=', endStr),
      );
      const snap = await getDocs(q);

      // Build a map of date -> assignment data
      const assignmentMap = new Map<string, { status: string; firstResponderId: string | null; source: string }>();
      snap.docs.forEach((doc) => {
        const d = doc.data();
        if (d.source === 'explore') return; // Skip explore prompts
        assignmentMap.set(d.assigned_date, {
          status: d.status,
          firstResponderId: d.first_responder_id || null,
          source: d.source,
        });
      });

      const today = startOfDay(new Date());
      const allDays = eachDayOfInterval({ start: monthStart, end: monthEnd });
      const days: DayActivity[] = [];
      let completedCount = 0;
      let partialCount = 0;

      for (const day of allDays) {
        const dateStr = format(day, 'yyyy-MM-dd');
        const dayNumber = day.getDate();
        const isDayToday = isToday(day);
        const isPast = isBefore(day, today);
        const assignment = assignmentMap.get(dateStr);

        let status: DayStatus;

        if (assignment?.status === 'completed') {
          status = 'completed';
          completedCount++;
        } else if (assignment?.status === 'partial') {
          if (assignment.firstResponderId === userId) {
            status = 'partial-you';
          } else {
            status = 'partial-partner';
          }
          partialCount++;
        } else if (isDayToday) {
          status = 'today';
        } else if (isPast) {
          status = 'missed';
        } else {
          status = 'upcoming';
        }

        days.push({ date: dateStr, dayNumber, status });
      }

      // Monday = 0, Tuesday = 1, ... Sunday = 6
      const firstDayOfWeek = getDay(monthStart);
      const startDayOffset = firstDayOfWeek === 0 ? 6 : firstDayOfWeek - 1; // Convert Sun=0 to Mon-based

      return {
        days,
        completedCount,
        partialCount,
        month: format(now, 'MMMM'),
        year: now.getFullYear(),
        startDayOffset,
      };
    },
    enabled: !!coupleId,
    staleTime: 2 * 60 * 1000,
  });

  return {
    days: data?.days ?? [],
    completedCount: data?.completedCount ?? 0,
    partialCount: data?.partialCount ?? 0,
    month: data?.month ?? format(now, 'MMMM'),
    year: data?.year ?? now.getFullYear(),
    startDayOffset: data?.startDayOffset ?? 0,
    isLoading,
  };
}

function getEmptyMonth(): MonthlyActivity {
  const now = new Date();
  const firstDayOfWeek = getDay(startOfMonth(now));
  return {
    days: [],
    completedCount: 0,
    partialCount: 0,
    month: format(now, 'MMMM'),
    year: now.getFullYear(),
    startDayOffset: firstDayOfWeek === 0 ? 6 : firstDayOfWeek - 1,
  };
}
