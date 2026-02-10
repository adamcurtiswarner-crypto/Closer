import { useQuery } from '@tanstack/react-query';
import {
  collection,
  getDocs,
  query,
  where,
} from 'firebase/firestore';
import { db } from '@/config/firebase';
import { useAuth } from './useAuth';
import { useCouple } from './useCouple';

const PROMPT_TYPE_LABELS: Record<string, { label: string; icon: string }> = {
  love_map_update: { label: 'Love Map', icon: '\u{1F5FA}\u{FE0F}' },
  conflict_navigation: { label: 'Navigate Together', icon: '\u{1F6E4}\u{FE0F}' },
  bid_for_connection: { label: 'Connection', icon: '\u{1F91D}' },
  appreciation_expression: { label: 'Appreciation', icon: '\u{2728}' },
  dream_exploration: { label: 'Dreams', icon: '\u{1F30C}' },
  repair_attempt: { label: 'Repair', icon: '\u{1F495}' },
};

interface EmotionalWeek {
  week: string;
  positive: number;
  neutral: number;
  negative: number;
  total: number;
}

interface ResponseTrendWeek {
  week: string;
  avgWords: number;
}

interface PromptCategory {
  type: string;
  label: string;
  icon: string;
  count: number;
  percentage: number;
}

export interface InsightsData {
  totalCompletions: number;
  daysAsCouple: number;
  memoriesSaved: number;
  emotionalJourney: EmotionalWeek[];
  overallPositiveRate: number;
  avgResponseWords: number;
  talkedAboutItRate: number;
  responseLengthTrend: ResponseTrendWeek[];
  promptCategories: PromptCategory[];
  currentStreak: number;
  longestStreak: number;
  weeklyCompletionRate: number;
  totalWeeksActive: number;
}

function getISOWeek(date: Date = new Date()): string {
  const year = date.getFullYear();
  const firstDayOfYear = new Date(year, 0, 1);
  const pastDaysOfYear = (date.getTime() - firstDayOfYear.getTime()) / 86400000;
  const weekNumber = Math.ceil((pastDaysOfYear + firstDayOfYear.getDay() + 1) / 7);
  return `${year}-W${weekNumber.toString().padStart(2, '0')}`;
}

function getRecentWeeks(count: number): string[] {
  const weeks: string[] = [];
  const now = new Date();
  for (let i = 0; i < count; i++) {
    const d = new Date(now);
    d.setDate(d.getDate() - i * 7);
    weeks.push(getISOWeek(d));
  }
  return weeks;
}

function formatWeekLabel(week: string): string {
  const match = week.match(/^(\d{4})-W(\d{2})$/);
  if (!match) return week;
  return `W${parseInt(match[2], 10)}`;
}

export { formatWeekLabel };

export function useInsights() {
  const { user } = useAuth();
  const { data: couple } = useCouple();

  return useQuery({
    queryKey: ['insights', user?.coupleId],
    queryFn: async (): Promise<InsightsData> => {
      const coupleId = user!.coupleId!;

      const [completionsSnap, assignmentsSnap, memoriesSnap] = await Promise.all([
        getDocs(
          query(collection(db, 'prompt_completions'), where('couple_id', '==', coupleId))
        ),
        getDocs(
          query(
            collection(db, 'prompt_assignments'),
            where('couple_id', '==', coupleId),
            where('status', '==', 'completed')
          )
        ),
        getDocs(
          query(
            collection(db, 'memory_artifacts'),
            where('couple_id', '==', coupleId),
            where('is_deleted', '==', false)
          )
        ),
      ]);

      // --- Hero Stats ---
      const totalCompletions = couple?.totalCompletions ?? completionsSnap.size;
      const daysAsCouple = couple?.linkedAt
        ? Math.floor((Date.now() - couple.linkedAt.getTime()) / 86400000)
        : 0;
      const memoriesSaved = memoriesSnap.size;

      // --- Emotional Journey (last 4 weeks) ---
      const recentWeeks = getRecentWeeks(4);
      const emotionByWeek: Record<string, { positive: number; neutral: number; negative: number }> = {};
      for (const w of recentWeeks) {
        emotionByWeek[w] = { positive: 0, neutral: 0, negative: 0 };
      }

      let totalPositive = 0;
      let totalEmotional = 0;
      let totalResponseLength = 0;
      let talkedCount = 0;
      let talkedTotal = 0;
      const weekResponseLengths: Record<string, number[]> = {};
      const allWeeks = new Set<string>();

      for (const doc of completionsSnap.docs) {
        const data = doc.data();
        const week: string = data.week || '';
        allWeeks.add(week);

        // Emotional responses
        const emotions: { user_id: string; response: string }[] = data.emotional_responses || [];
        for (const e of emotions) {
          if (e.response === 'positive') totalPositive++;
          if (e.response) totalEmotional++;

          if (emotionByWeek[week]) {
            if (e.response === 'positive') emotionByWeek[week].positive++;
            else if (e.response === 'neutral') emotionByWeek[week].neutral++;
            else if (e.response === 'negative') emotionByWeek[week].negative++;
          }
        }

        // Communication stats
        const responseLength = data.total_response_length || 0;
        totalResponseLength += responseLength;

        if (data.talked_about_it !== null && data.talked_about_it !== undefined) {
          talkedTotal++;
          if (data.talked_about_it) talkedCount++;
        }

        // Response length by week (for trend)
        if (recentWeeks.includes(week)) {
          if (!weekResponseLengths[week]) weekResponseLengths[week] = [];
          weekResponseLengths[week].push(responseLength);
        }
      }

      const emotionalJourney: EmotionalWeek[] = recentWeeks
        .reverse()
        .map((week) => {
          const e = emotionByWeek[week];
          return {
            week,
            positive: e.positive,
            neutral: e.neutral,
            negative: e.negative,
            total: e.positive + e.neutral + e.negative,
          };
        });

      const overallPositiveRate = totalEmotional > 0
        ? Math.round((totalPositive / totalEmotional) * 100)
        : 0;

      // --- Communication ---
      const completionCount = completionsSnap.size;
      const avgResponseWords = completionCount > 0
        ? Math.round(totalResponseLength / completionCount / 5)
        : 0;
      const talkedAboutItRate = talkedTotal > 0
        ? Math.round((talkedCount / talkedTotal) * 100)
        : 0;

      const responseLengthTrend: ResponseTrendWeek[] = recentWeeks.map((week) => {
        const lengths = weekResponseLengths[week] || [];
        const avg = lengths.length > 0
          ? Math.round(lengths.reduce((a, b) => a + b, 0) / lengths.length / 5)
          : 0;
        return { week, avgWords: avg };
      });

      // --- Prompt Categories ---
      const typeCounts: Record<string, number> = {};
      for (const doc of assignmentsSnap.docs) {
        const type = doc.data().prompt_type || 'unknown';
        typeCounts[type] = (typeCounts[type] || 0) + 1;
      }

      const totalAssignments = assignmentsSnap.size;
      const promptCategories: PromptCategory[] = Object.entries(typeCounts)
        .map(([type, count]) => ({
          type,
          label: PROMPT_TYPE_LABELS[type]?.label || type,
          icon: PROMPT_TYPE_LABELS[type]?.icon || '\u{1F4AC}',
          count,
          percentage: totalAssignments > 0 ? Math.round((count / totalAssignments) * 100) : 0,
        }))
        .sort((a, b) => b.count - a.count);

      // --- Streak & Consistency ---
      const currentStreak = couple?.currentStreak ?? 0;
      const longestStreak = couple?.longestStreak ?? 0;
      const weeklyCompletionRate = (couple?.currentWeekCompletions ?? 0) / 7;
      const totalWeeksActive = allWeeks.size;

      return {
        totalCompletions,
        daysAsCouple,
        memoriesSaved,
        emotionalJourney,
        overallPositiveRate,
        avgResponseWords,
        talkedAboutItRate,
        responseLengthTrend,
        promptCategories,
        currentStreak,
        longestStreak,
        weeklyCompletionRate,
        totalWeeksActive,
      };
    },
    enabled: !!user?.coupleId && !!couple,
    staleTime: 5 * 60 * 1000,
  });
}
