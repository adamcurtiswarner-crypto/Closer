import { useEffect, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  collection,
  doc,
  getDoc,
  getDocs,
  addDoc,
  updateDoc,
  query,
  where,
  orderBy,
  serverTimestamp,
  Timestamp,
  onSnapshot,
} from 'firebase/firestore';
import { httpsCallable } from 'firebase/functions';
import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from '@react-native-community/netinfo';
import { db, functions } from '@/config/firebase';
import { useAuth } from './useAuth';
import { logEvent } from '@/services/analytics';
import { uploadResponsePhoto } from '@/services/imageUpload';
import { DEFAULT_SCALE_CONFIG, isValidScore } from '@/utils/scale';
import type {
  AssignmentKind,
  ResponseFormat,
  ScaleConfig,
  FollowUpAssignmentInfo,
} from '@/types';

const OFFLINE_QUEUE_KEY = '@closer_offline_responses';
const SKIPPED_FOLLOW_UPS_KEY = '@closer_skipped_follow_ups';
const SKIPPED_RETENTION_DAYS = 14;

interface PromptAssignment {
  id: string;
  coupleId: string;
  promptId: string;
  promptText: string;
  promptHint: string | null;
  promptType: string;
  requiresConversation: boolean;
  assignedDate: string;
  source?: 'daily' | 'explore';
  status: 'delivered' | 'partial' | 'completed' | 'expired';
  assignmentKind: AssignmentKind;
  responseFormat: ResponseFormat;
  scaleConfig: ScaleConfig | null;
  followUp: FollowUpAssignmentInfo | null;
  closingText: string | null;
}

interface PromptResponse {
  id: string;
  responseText: string;
  imageUrl: string | null;
  submittedAt: Date | null;
  status: 'draft' | 'submitted';
  responseScore: number | null;
}

// ─── Read-boundary mapping (Firestore snake_case → app camelCase) ───

export function mapScaleConfig(raw: Record<string, any> | null | undefined): ScaleConfig | null {
  if (!raw) return null;
  return {
    min: typeof raw.min === 'number' ? raw.min : DEFAULT_SCALE_CONFIG.min,
    max: typeof raw.max === 'number' ? raw.max : DEFAULT_SCALE_CONFIG.max,
    lowThreshold: typeof raw.low_threshold === 'number' ? raw.low_threshold : DEFAULT_SCALE_CONFIG.lowThreshold,
    highThreshold: typeof raw.high_threshold === 'number' ? raw.high_threshold : DEFAULT_SCALE_CONFIG.highThreshold,
    divergenceGap: typeof raw.divergence_gap === 'number' ? raw.divergence_gap : DEFAULT_SCALE_CONFIG.divergenceGap,
    minLabel: raw.min_label || DEFAULT_SCALE_CONFIG.minLabel,
    maxLabel: raw.max_label || DEFAULT_SCALE_CONFIG.maxLabel,
  };
}

export function mapFollowUpInfo(raw: Record<string, any> | null | undefined): FollowUpAssignmentInfo | null {
  if (!raw || !raw.branch) return null;
  return {
    branch: raw.branch,
    step: raw.step === 2 ? 2 : 1,
    parentAssignmentId: raw.parent_assignment_id ?? '',
    templateId: raw.template_id ?? '',
  };
}

export function mapAssignment(id: string, data: Record<string, any>): PromptAssignment {
  const assignmentKind: AssignmentKind = data.assignment_kind === 'follow_up' ? 'follow_up' : 'daily';
  return {
    id,
    coupleId: data.couple_id,
    promptId: data.prompt_id,
    promptText: data.prompt_text,
    promptHint: data.prompt_hint ?? null,
    // Follow-up assignments carry prompt_type: null (template-based, no /prompts doc)
    promptType: data.prompt_type ?? '',
    requiresConversation: data.requires_conversation,
    assignedDate: data.assigned_date,
    status: data.status,
    assignmentKind,
    responseFormat: data.response_format === 'scale' ? 'scale' : 'text',
    scaleConfig: mapScaleConfig(data.scale_config),
    followUp: assignmentKind === 'follow_up' ? mapFollowUpInfo(data.follow_up) : null,
    closingText: data.closing_text ?? null,
  };
}

interface AssignmentDocLike {
  id: string;
  data: () => Record<string, any>;
}

/**
 * Pick which of today's assignment docs to surface. Explore assignments,
 * not-yet-activated ('scheduled') follow-ups, and locally-skipped follow-ups
 * are excluded. Preference order:
 * 1. An active (delivered/partial) follow-up — so a same-session deepener or
 *    a next-day repair surfaces first (skipping it falls back to the daily).
 * 2. An active daily assignment.
 * 3. A completed follow-up (its reveal carries the closing text).
 * 4. A completed daily, then anything left (expired).
 *
 * Deepener day means TWO docs share today's assigned_date (the completed daily
 * scale prompt + the immediately-delivered deepener): the daily reveal shows
 * while the daily is the only doc, then the deepener surfaces same-session
 * when it arrives via onSnapshot.
 */
export function selectAssignmentDoc(
  docs: AssignmentDocLike[],
  skippedIds: string[]
): AssignmentDocLike | null {
  const candidates = docs.filter((d) => {
    const data = d.data();
    if (data.source === 'explore') return false;
    // Next-day follow-ups (repair/divergence) are 'scheduled' until the
    // delivery run activates them — never surface those early
    if (data.status === 'scheduled') return false;
    if (data.assignment_kind === 'follow_up' && skippedIds.includes(d.id)) return false;
    return true;
  });
  if (candidates.length === 0) return null;

  const isActive = (d: AssignmentDocLike) =>
    d.data().status === 'delivered' || d.data().status === 'partial';
  const isFollowUp = (d: AssignmentDocLike) => d.data().assignment_kind === 'follow_up';

  return (
    candidates.find((d) => isActive(d) && isFollowUp(d)) ??
    candidates.find(isActive) ??
    candidates.find((d) => d.data().status === 'completed' && isFollowUp(d)) ??
    candidates.find((d) => d.data().status === 'completed') ??
    candidates[0]
  );
}

// ─── Local follow-up skip list (dismiss for the day; assignment expires server-side) ───

async function getSkippedFollowUpIds(): Promise<string[]> {
  try {
    const raw = await AsyncStorage.getItem(SKIPPED_FOLLOW_UPS_KEY);
    if (!raw) return [];
    const entries: { id: string; date: string }[] = JSON.parse(raw);
    if (!Array.isArray(entries)) return [];
    return entries.map((e) => e?.id).filter(Boolean);
  } catch {
    return [];
  }
}

async function addSkippedFollowUpId(assignmentId: string): Promise<void> {
  const raw = await AsyncStorage.getItem(SKIPPED_FOLLOW_UPS_KEY);
  let entries: { id: string; date: string }[] = [];
  try {
    entries = raw ? JSON.parse(raw) : [];
    if (!Array.isArray(entries)) entries = [];
  } catch {
    entries = [];
  }
  // Prune stale entries — skipped assignments expire server-side anyway
  const cutoff = new Date(Date.now() - SKIPPED_RETENTION_DAYS * 86400000)
    .toISOString()
    .split('T')[0];
  const pruned = entries.filter((e) => e?.date && e.date >= cutoff);
  const today = new Date().toISOString().split('T')[0];
  const next = [...pruned, { id: assignmentId, date: today }];
  await AsyncStorage.setItem(SKIPPED_FOLLOW_UPS_KEY, JSON.stringify(next));
}

interface TodayPrompt {
  assignment: PromptAssignment | null;
  myResponse: PromptResponse | null;
  partnerResponse: PromptResponse | null;
  partnerHasResponded: boolean;
  isComplete: boolean;
  nextPromptAt: string | null;
  reactions: Record<string, string> | null;
}

const EMPTY_TODAY: TodayPrompt = {
  assignment: null,
  myResponse: null,
  partnerResponse: null,
  partnerHasResponded: false,
  isComplete: false,
  nextPromptAt: null,
  reactions: null,
};

// Shared counter to force onSnapshot re-subscribe with fresh date
let promptRefreshCounter = 0;
const promptRefreshListeners = new Set<() => void>();

function bumpPromptRefresh() {
  promptRefreshCounter++;
  promptRefreshListeners.forEach((fn) => fn());
}

export function useTodayPrompt() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const coupleId = user?.coupleId;
  const userId = user?.id;
  const notificationTime = user?.notificationTime;
  const [refreshKey, setRefreshKey] = useState(promptRefreshCounter);

  // Listen for external refresh signals (from useTriggerPrompt)
  useEffect(() => {
    const listener = () => setRefreshKey(promptRefreshCounter);
    promptRefreshListeners.add(listener);
    return () => { promptRefreshListeners.delete(listener); };
  }, []);

  // Set up real-time listeners
  useEffect(() => {
    if (!coupleId || !userId) {
      queryClient.setQueryData(['todayPrompt', coupleId], EMPTY_TODAY);
      return;
    }

    const today = new Date().toISOString().split('T')[0];
    let unsubResponses: (() => void) | null = null;

    // Listen for today's assignment
    const assignmentsRef = collection(db, 'prompt_assignments');
    const assignmentQuery = query(
      assignmentsRef,
      where('couple_id', '==', coupleId),
      where('assigned_date', '==', today)
    );

    const unsubAssignment = onSnapshot(assignmentQuery, async (assignmentSnap) => {
      // Clean up previous response listener before setting up a new one
      if (unsubResponses) {
        unsubResponses();
        unsubResponses = null;
      }
      // Exclude explore assignments and locally-skipped follow-ups, then pick
      // the assignment to surface (active follow-up > active daily > completed)
      const skippedIds = await getSkippedFollowUpIds();
      const assignmentDoc = selectAssignmentDoc(assignmentSnap.docs, skippedIds);

      if (!assignmentDoc) {
        queryClient.setQueryData(['todayPrompt', coupleId], {
          ...EMPTY_TODAY,
          nextPromptAt: `${today}T${notificationTime || '19:00'}:00`,
          reactions: null,
        });
        return;
      }

      const assignment = mapAssignment(assignmentDoc.id, assignmentDoc.data());

      // Listen for responses on this assignment
      const responsesRef = collection(db, 'prompt_responses');
      const responsesQuery = query(
        responsesRef,
        where('couple_id', '==', coupleId),
        where('assignment_id', '==', assignment.id)
      );

      // Nested listener for responses
      unsubResponses = onSnapshot(responsesQuery, async (responsesSnap) => {
        let myResponse: PromptResponse | null = null;
        let partnerResponse: PromptResponse | null = null;

        for (const responseDoc of responsesSnap.docs) {
          const data = responseDoc.data();
          const response: PromptResponse = {
            id: responseDoc.id,
            responseText: data.response_text,
            imageUrl: data.image_url || null,
            submittedAt: data.submitted_at?.toDate() || null,
            status: data.status,
            responseScore: typeof data.response_score === 'number' ? data.response_score : null,
          };

          if (data.user_id === userId) {
            myResponse = response;
          } else {
            partnerResponse = response;
          }
        }

        // Re-read assignment status from the latest snapshot
        const latestStatus = assignmentDoc.data()?.status || assignment.status;

        // Fetch reactions from completion doc when complete
        let reactions: Record<string, string> | null = null;
        if (latestStatus === 'completed') {
          try {
            const completionDoc = await getDoc(doc(db, 'prompt_completions', assignment.id));
            if (completionDoc.exists()) {
              reactions = completionDoc.data().reactions || null;
            }
          } catch {
            // Reactions are non-critical
          }
        }

        queryClient.setQueryData(['todayPrompt', coupleId], {
          assignment: { ...assignment, status: latestStatus },
          myResponse,
          partnerResponse,
          partnerHasResponded: !!partnerResponse?.submittedAt,
          isComplete: latestStatus === 'completed',
          nextPromptAt: null,
          reactions,
        } as TodayPrompt);
      });

    });

    return () => {
      unsubAssignment();
      if (unsubResponses) unsubResponses();
    };
  }, [coupleId, userId, notificationTime, queryClient, refreshKey]);

  // useQuery reads from the cache populated by onSnapshot above
  return useQuery({
    queryKey: ['todayPrompt', coupleId],
    queryFn: (): TodayPrompt => {
      // Return whatever is already in cache, or empty
      return queryClient.getQueryData(['todayPrompt', coupleId]) || EMPTY_TODAY;
    },
    enabled: !!coupleId,
    // No refetchInterval — real-time updates handle this
    staleTime: Infinity,
  });
}

// Flush any queued offline responses
async function flushOfflineQueue(userId: string, coupleId: string) {
  try {
    const raw = await AsyncStorage.getItem(OFFLINE_QUEUE_KEY);
    if (!raw) return;
    const queue: {
      assignmentId: string;
      responseText: string;
      imageUri?: string;
      responseScore?: number;
    }[] = JSON.parse(raw);
    if (queue.length === 0) return;

    for (const item of queue) {
      const assignmentRef = doc(db, 'prompt_assignments', item.assignmentId);
      const assignmentSnap = await getDoc(assignmentRef);
      if (!assignmentSnap.exists()) continue;
      const assignmentData = assignmentSnap.data();

      // Upload queued photo if present
      let imageUrl: string | null = null;
      if (item.imageUri) {
        try {
          imageUrl = await uploadResponsePhoto(coupleId, item.assignmentId, userId, item.imageUri);
        } catch {
          // Photo upload failed — continue without it
        }
      }

      const responsesRef = collection(db, 'prompt_responses');
      await addDoc(responsesRef, {
        assignment_id: item.assignmentId,
        couple_id: coupleId,
        user_id: userId,
        prompt_id: assignmentData.prompt_id,
        response_text: item.responseText,
        response_score: typeof item.responseScore === 'number' ? item.responseScore : null,
        image_url: imageUrl,
        status: 'submitted',
        submitted_at: serverTimestamp(),
        emotional_response: null,
        talked_about_it: null,
        response_length: item.responseText.length,
        time_to_respond_seconds: null,
        created_at: serverTimestamp(),
        updated_at: serverTimestamp(),
      });

      const newCount = (assignmentData.response_count || 0) + 1;
      const updates: Record<string, any> = {
        response_count: newCount,
        updated_at: serverTimestamp(),
      };
      if (newCount === 1) {
        updates.first_response_at = serverTimestamp();
        updates.first_responder_id = userId;
        updates.status = 'partial';
      } else if (newCount === 2) {
        updates.second_response_at = serverTimestamp();
        updates.status = 'completed';
        updates.completed_at = serverTimestamp();
      }
      await updateDoc(assignmentRef, updates);
    }

    await AsyncStorage.removeItem(OFFLINE_QUEUE_KEY);
  } catch (error) {
    // Silently fail — will retry next reconnect
  }
}

export function useSubmitResponse() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // Listen for reconnection to flush offline queue
  useEffect(() => {
    if (!user?.id || !user?.coupleId) return;

    const unsubscribe = NetInfo.addEventListener((state) => {
      if (state.isConnected) {
        flushOfflineQueue(user.id, user.coupleId!);
      }
    });

    return () => unsubscribe();
  }, [user?.id, user?.coupleId]);

  return useMutation({
    mutationFn: async ({
      assignmentId,
      responseText,
      imageUri,
      responseScore,
    }: {
      assignmentId: string;
      responseText: string;
      imageUri?: string;
      responseScore?: number;
    }) => {
      if (!user?.coupleId) throw new Error('No couple linked');

      // Validate score at the boundary — whole number 1–10
      if (responseScore !== undefined && !isValidScore(responseScore)) {
        throw new Error('Score must be a whole number between 1 and 10');
      }

      // Check if offline — queue the response
      const netState = await NetInfo.fetch();
      if (!netState.isConnected) {
        const raw = await AsyncStorage.getItem(OFFLINE_QUEUE_KEY);
        const queue = raw ? JSON.parse(raw) : [];
        queue.push({ assignmentId, responseText, imageUri, responseScore });
        await AsyncStorage.setItem(OFFLINE_QUEUE_KEY, JSON.stringify(queue));
        return { responseId: 'offline-queued', isComplete: false, isOffline: true };
      }

      // Upload photo if provided
      let imageUrl: string | null = null;
      if (imageUri) {
        imageUrl = await uploadResponsePhoto(user.coupleId, assignmentId, user.id, imageUri);
      }

      // Get the assignment to get prompt_id
      const assignmentRef = doc(db, 'prompt_assignments', assignmentId);
      const assignmentSnap = await getDoc(assignmentRef);

      if (!assignmentSnap.exists()) {
        throw new Error('Assignment not found');
      }

      const assignmentData = assignmentSnap.data();

      // Create response
      const responsesRef = collection(db, 'prompt_responses');
      const responseDoc = await addDoc(responsesRef, {
        assignment_id: assignmentId,
        couple_id: user.coupleId,
        user_id: user.id,
        prompt_id: assignmentData.prompt_id,
        response_text: responseText,
        response_score: responseScore ?? null,
        image_url: imageUrl,
        status: 'submitted',
        submitted_at: serverTimestamp(),
        emotional_response: null,
        talked_about_it: null,
        response_length: responseText.length,
        time_to_respond_seconds: null,
        created_at: serverTimestamp(),
        updated_at: serverTimestamp(),
      });

      // Update assignment response count
      const newResponseCount = (assignmentData.response_count || 0) + 1;
      const updates: Record<string, any> = {
        response_count: newResponseCount,
        updated_at: serverTimestamp(),
      };

      if (newResponseCount === 1) {
        updates.first_response_at = serverTimestamp();
        updates.first_responder_id = user.id;
        updates.status = 'partial';
      } else if (newResponseCount === 2) {
        updates.second_response_at = serverTimestamp();
        updates.status = 'completed';
        updates.completed_at = serverTimestamp();
      }

      await updateDoc(assignmentRef, updates);

      return { responseId: responseDoc.id, isComplete: newResponseCount === 2, hasPhoto: !!imageUrl };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['todayPrompt'] });
      logEvent('prompt_response_submitted', { response_id: data.responseId });
      if (data.hasPhoto) {
        logEvent('response_photo_attached', { response_id: data.responseId });
      }
      if (data.isComplete) {
        logEvent('prompt_completed', { response_id: data.responseId });
      }
    },
  });
}

/**
 * Skip a follow-up assignment for the day. Least-invasive path: mark it
 * locally dismissed (AsyncStorage) and let the existing expireStalePrompts
 * machinery expire it server-side — no writes, no nagging, no penalty.
 */
export function useSkipFollowUp() {
  return useMutation({
    mutationFn: async ({ assignmentId }: { assignmentId: string }) => {
      await addSkippedFollowUpId(assignmentId);
      return { assignmentId };
    },
    onSuccess: (data) => {
      logEvent('follow_up_skipped', { assignment_id: data.assignmentId });
      // Re-run listeners so the skipped follow-up is filtered out
      bumpPromptRefresh();
    },
  });
}

export function useSubmitFeedback() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      responseId,
      emotionalResponse,
      talkedAboutIt,
    }: {
      responseId: string;
      emotionalResponse: 'positive' | 'neutral' | 'negative';
      talkedAboutIt?: boolean;
    }) => {
      const responseRef = doc(db, 'prompt_responses', responseId);
      await updateDoc(responseRef, {
        emotional_response: emotionalResponse,
        talked_about_it: talkedAboutIt ?? null,
        updated_at: serverTimestamp(),
      });
      return { responseId, emotionalResponse };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['todayPrompt'] });
      logEvent('emotional_response_submitted', {
        response_id: data.responseId,
        emotional_response: data.emotionalResponse,
      });
    },
  });
}

export function useTriggerPrompt() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      const triggerPrompt = httpsCallable(functions, 'triggerPromptDelivery');
      const result = await triggerPrompt();
      return result.data as { success: boolean; coupleId: string };
    },
    onSuccess: () => {
      bumpPromptRefresh();
      queryClient.invalidateQueries({ queryKey: ['todayPrompt'] });
    },
  });
}
