import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  collection,
  doc,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  serverTimestamp,
  Timestamp,
} from 'firebase/firestore';
import { db } from '@/config/firebase';
import { useAuth } from './useAuth';
import { logEvent } from '@/services/analytics';
import {
  getWeeklyChallengeForWeek,
  getCurrentWeekString,
  type WeeklyChallenge,
} from '@/config/weeklyChallenges';

export type GoalType = 'custom' | 'challenge';
export type TargetFrequency = 'daily' | 'weekly' | 'monthly' | 'one_time';

export interface Goal {
  id: string;
  title: string;
  description: string;
  goalType: GoalType;
  targetFrequency: TargetFrequency;
  isCompleted: boolean;
  completedCount: number;
  targetCount: number;
  challengeId: string | null;
  challengeWeek: string | null;
  isArchived: boolean;
  createdAt: Date | null;
  updatedAt: Date | null;
}

export interface GoalCompletion {
  id: string;
  completedBy: string;
  completedAt: Date | null;
  date: string;
  week: string;
}

const MAX_ACTIVE_GOALS = 5;

export function useGoals() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['goals', user?.coupleId],
    queryFn: async (): Promise<Goal[]> => {
      if (!user?.coupleId) return [];

      const goalsRef = collection(db, 'couples', user.coupleId, 'goals');
      const goalsQuery = query(
        goalsRef,
        where('is_archived', '==', false),
        orderBy('created_at', 'desc')
      );
      const snap = await getDocs(goalsQuery);

      return snap.docs.map((d) => {
        const data = d.data();
        return {
          id: d.id,
          title: data.title,
          description: data.description || '',
          goalType: data.goal_type,
          targetFrequency: data.target_frequency,
          isCompleted: data.is_completed || false,
          completedCount: data.completed_count || 0,
          targetCount: data.target_count || 1,
          challengeId: data.challenge_id || null,
          challengeWeek: data.challenge_week || null,
          isArchived: data.is_archived || false,
          createdAt: data.created_at?.toDate() || null,
          updatedAt: data.updated_at?.toDate() || null,
        };
      });
    },
    enabled: !!user?.coupleId,
  });
}

export function useCreateGoal() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: {
      title: string;
      description?: string;
      targetFrequency: TargetFrequency;
    }): Promise<string> => {
      if (!user?.coupleId) throw new Error('Not in a couple');

      // Check active goal limit
      const goalsRef = collection(db, 'couples', user.coupleId, 'goals');
      const activeQuery = query(goalsRef, where('is_archived', '==', false));
      const activeSnap = await getDocs(activeQuery);
      if (activeSnap.size >= MAX_ACTIVE_GOALS) {
        throw new Error(`You can have at most ${MAX_ACTIVE_GOALS} active goals`);
      }

      const targetCount = params.targetFrequency === 'one_time' ? 1
        : params.targetFrequency === 'daily' ? 7
        : params.targetFrequency === 'weekly' ? 4
        : 1; // monthly

      const goalDoc = await addDoc(goalsRef, {
        title: params.title,
        description: params.description || '',
        goal_type: 'custom',
        target_frequency: params.targetFrequency,
        is_completed: false,
        completed_count: 0,
        target_count: targetCount,
        challenge_id: null,
        challenge_week: null,
        is_archived: false,
        created_by: user.id,
        created_at: serverTimestamp(),
        updated_at: serverTimestamp(),
      });

      logEvent('goal_created', {
        goal_id: goalDoc.id,
        goal_type: 'custom',
        target_frequency: params.targetFrequency,
      });

      return goalDoc.id;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['goals'] });
    },
  });
}

export function useToggleGoalCompletion() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: { goalId: string; currentCount: number; targetCount: number }): Promise<void> => {
      if (!user?.coupleId || !user?.id) throw new Error('Not in a couple');

      const today = new Date().toISOString().split('T')[0];
      const week = getCurrentWeekString();
      const completionsRef = collection(
        db, 'couples', user.coupleId, 'goals', params.goalId, 'completions'
      );

      // Check if already completed today
      const todayQuery = query(
        completionsRef,
        where('date', '==', today),
        where('completed_by', '==', user.id)
      );
      const todaySnap = await getDocs(todayQuery);

      const goalRef = doc(db, 'couples', user.coupleId, 'goals', params.goalId);

      if (todaySnap.empty) {
        // Add completion
        await addDoc(completionsRef, {
          completed_by: user.id,
          completed_at: serverTimestamp(),
          date: today,
          week,
        });

        const newCount = params.currentCount + 1;
        const isNowComplete = newCount >= params.targetCount;

        await updateDoc(goalRef, {
          completed_count: newCount,
          is_completed: isNowComplete,
          updated_at: serverTimestamp(),
        });

        logEvent('goal_completed', {
          goal_id: params.goalId,
          completed_count: newCount,
          target_count: params.targetCount,
        });
      } else {
        // Remove today's completion (undo)
        for (const completionDoc of todaySnap.docs) {
          await deleteDoc(completionDoc.ref);
        }

        const newCount = Math.max(0, params.currentCount - 1);
        await updateDoc(goalRef, {
          completed_count: newCount,
          is_completed: false,
          updated_at: serverTimestamp(),
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['goals'] });
    },
  });
}

export function useArchiveGoal() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (goalId: string): Promise<void> => {
      if (!user?.coupleId) throw new Error('Not in a couple');

      const goalRef = doc(db, 'couples', user.coupleId, 'goals', goalId);
      await updateDoc(goalRef, {
        is_archived: true,
        updated_at: serverTimestamp(),
      });

      logEvent('goal_archived', { goal_id: goalId });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['goals'] });
    },
  });
}

export function useActivateWeeklyChallenge() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (): Promise<string> => {
      if (!user?.coupleId) throw new Error('Not in a couple');

      const week = getCurrentWeekString();
      const challenge = getWeeklyChallengeForWeek(week);

      // Check if challenge already activated this week
      const goalsRef = collection(db, 'couples', user.coupleId, 'goals');
      const existingQuery = query(
        goalsRef,
        where('challenge_week', '==', week),
        where('goal_type', '==', 'challenge')
      );
      const existingSnap = await getDocs(existingQuery);
      if (!existingSnap.empty) {
        throw new Error('Challenge already activated for this week');
      }

      // Check active goal limit
      const activeQuery = query(goalsRef, where('is_archived', '==', false));
      const activeSnap = await getDocs(activeQuery);
      if (activeSnap.size >= MAX_ACTIVE_GOALS) {
        throw new Error(`You can have at most ${MAX_ACTIVE_GOALS} active goals`);
      }

      const goalDoc = await addDoc(goalsRef, {
        title: challenge.title,
        description: challenge.description,
        goal_type: 'challenge',
        target_frequency: 'weekly',
        is_completed: false,
        completed_count: 0,
        target_count: challenge.targetCount,
        challenge_id: challenge.id,
        challenge_week: week,
        is_archived: false,
        created_by: user.id,
        created_at: serverTimestamp(),
        updated_at: serverTimestamp(),
      });

      logEvent('weekly_challenge_activated', {
        goal_id: goalDoc.id,
        challenge_id: challenge.id,
        challenge_week: week,
      });

      return goalDoc.id;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['goals'] });
    },
  });
}

/**
 * Get current week's challenge info + whether it's already activated.
 */
export function useWeeklyChallenge() {
  const { data: goals } = useGoals();
  const week = getCurrentWeekString();
  const challenge = getWeeklyChallengeForWeek(week);

  const activeChallenge = goals?.find(
    (g) => g.goalType === 'challenge' && g.challengeWeek === week
  ) ?? null;

  return {
    challenge,
    activeChallenge,
    isActivated: !!activeChallenge,
    week,
  };
}
