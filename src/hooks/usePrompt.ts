import { useEffect, useRef, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
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
import { AppState } from 'react-native';
import { db, functions } from '@/config/firebase';
import { logger } from '@/utils/logger';
import { todayLocalISO, localDateWindow } from '@utils/localDate';
import { useAuth } from './useAuth';
import { logEvent } from '@/services/analytics';
import { uploadResponsePhoto } from '@/services/imageUpload';
import { DEFAULT_SCALE_CONFIG, isValidScore } from '@/utils/scale';
import { containsCrisisLanguage } from '@/utils/safetyLexicon';
import type {
  AssignmentKind,
  ResponseFormat,
  ScaleConfig,
  FollowUpAssignmentInfo,
} from '@/types';

const OFFLINE_QUEUE_KEY = '@closer_offline_responses';
const SKIPPED_FOLLOW_UPS_KEY = '@closer_skipped_follow_ups';
const SKIPPED_RETENTION_DAYS = 14;

export interface PromptAssignment {
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
  /** User ids who set this follow-up aside for today (server-visible skip). */
  skippedBy: string[];
}

export type EmotionalResponse = 'positive' | 'neutral' | 'negative';

export interface PromptResponse {
  id: string;
  responseText: string;
  imageUrl: string | null;
  submittedAt: Date | null;
  status: 'draft' | 'submitted';
  responseScore: number | null;
  /**
   * "How did this feel?" answer already recorded on the response doc —
   * the source of truth that stops the Today screen re-asking on remount.
   */
  emotionalResponse: EmotionalResponse | null;
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

export function mapEmotionalResponse(raw: unknown): EmotionalResponse | null {
  return raw === 'positive' || raw === 'neutral' || raw === 'negative' ? raw : null;
}

export function mapResponse(id: string, data: Record<string, any>): PromptResponse {
  return {
    id,
    responseText: data.response_text,
    imageUrl: data.image_url || null,
    submittedAt: data.submitted_at?.toDate() || null,
    status: data.status,
    responseScore: typeof data.response_score === 'number' ? data.response_score : null,
    emotionalResponse: mapEmotionalResponse(data.emotional_response),
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
    skippedBy: data.skipped_by ? Object.keys(data.skipped_by) : [],
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
 *
 * The query feeds a device-local [yesterday, today, tomorrow] window (server
 * assigns in the USER'S timezone, so adjacent local dates can differ from the
 * device's). Within each tier, docs dated todayLocalISO() win over the rest
 * of the window. Only yesterday's expired leftovers return null — an empty
 * Today that lets the auto-trigger fetch the new day's prompt.
 */
export function selectAssignmentDoc(
  docs: AssignmentDocLike[],
  skippedIds: string[],
  todayISO?: string,
  myUserId?: string
): AssignmentDocLike | null {
  const candidates = docs.filter((d) => {
    const data = d.data();
    if (data.source === 'explore') return false;
    // Next-day follow-ups (repair/divergence) are 'scheduled' until the
    // delivery run activates them — never surface those early
    if (data.status === 'scheduled') return false;
    if (data.assignment_kind === 'follow_up') {
      // Set aside for today — locally (AsyncStorage, instant/offline) or
      // server-visibly (skipped_by map, synced across devices)
      if (skippedIds.includes(d.id)) return false;
      if (myUserId && data.skipped_by && data.skipped_by[myUserId]) return false;
    }
    return true;
  });
  if (candidates.length === 0) return null;

  const isActive = (d: AssignmentDocLike) =>
    d.data().status === 'delivered' || d.data().status === 'partial';
  const isFollowUp = (d: AssignmentDocLike) => d.data().assignment_kind === 'follow_up';
  const isCompleted = (d: AssignmentDocLike) => d.data().status === 'completed';
  // Without a reference date every candidate counts as "today" (single-day query)
  const isToday = (d: AssignmentDocLike) =>
    todayISO == null || d.data().assigned_date === todayISO;
  // Completed docs may surface for today or a timezone-shifted tomorrow, but
  // never for a PAST date — yesterday's reveal must not wear today's header
  // (it reads as "we're not synced"). A fresh local day gets a fresh prompt.
  const isTodayOrLater = (d: AssignmentDocLike) =>
    todayISO == null || d.data().assigned_date >= todayISO;

  return (
    candidates.find((d) => isActive(d) && isFollowUp(d) && isToday(d)) ??
    candidates.find((d) => isActive(d) && isToday(d)) ??
    candidates.find((d) => isActive(d) && isFollowUp(d)) ??
    candidates.find(isActive) ??
    candidates.find((d) => isCompleted(d) && isFollowUp(d) && isTodayOrLater(d)) ??
    candidates.find((d) => isCompleted(d) && isTodayOrLater(d)) ??
    // Anything left is expired — surface it only when it is today's doc
    candidates.find(isToday) ??
    null
  );
}

/**
 * The other live daily-flow day in the window, when one exists. With sealed
 * days coexisting ("the day always arrives"), yesterday's partial or freshly
 * completed assignment can sit alongside today's — at most TWO daily-flow
 * docs are ever live at once by design (yesterday + today).
 */
export interface SecondaryAssignmentInfo {
  assignment: PromptAssignment;
  /**
   * The secondary day's local assigned date (yyyy-MM-dd) — surfaced at the
   * top level so the open-day chip can speak truthfully about WHICH day is
   * still open. Usually yesterday, but a same-day secondary can exist (e.g.
   * a double-delivery displaced the first question), and calling that
   * "Yesterday" lies. Compare against todayLocalISO().
   */
  assignedDate: string;
  iAnswered: boolean;
  partnerAnswered: boolean;
  isComplete: boolean;
}

/**
 * Pick the OTHER open daily-flow assignment in the window snapshot — the one
 * selectAssignmentDoc did NOT surface. Mirrors its filter semantics (explore,
 * not-yet-activated 'scheduled' follow-ups, and skipped follow-ups are all
 * excluded) with two extra exclusions: expired docs never surface here (the
 * open-day chip only speaks to days that can still resolve), and neither do
 * docs dated after todayISO (a timezone-shifted tomorrow is never
 * "yesterday's open question").
 *
 * Answer-state is derived from the assignment doc's OWN fields — no second
 * response listener: 'completed' means both answered; 'partial' attributes
 * the single answer via first_responder_id. Untouched 'delivered' leftovers
 * are excluded — the chip has nothing honest to say about a day neither
 * partner started (the server expires those).
 */
export function selectSecondaryAssignment(
  docs: AssignmentDocLike[],
  primaryId: string | null,
  skippedIds: string[],
  todayISO?: string,
  myUserId?: string
): SecondaryAssignmentInfo | null {
  const candidate = docs.find((d) => {
    if (primaryId != null && d.id === primaryId) return false;
    const data = d.data();
    if (data.source === 'explore') return false;
    if (data.status === 'scheduled') return false;
    if (data.status !== 'partial' && data.status !== 'completed') return false;
    if (data.assignment_kind === 'follow_up') {
      if (skippedIds.includes(d.id)) return false;
      if (myUserId && data.skipped_by && data.skipped_by[myUserId]) return false;
    }
    if (
      todayISO != null &&
      typeof data.assigned_date === 'string' &&
      data.assigned_date > todayISO
    ) {
      return false;
    }
    return true;
  });
  if (!candidate) return null;

  const data = candidate.data();
  if (data.status === 'completed') {
    const assignment = mapAssignment(candidate.id, data);
    return {
      assignment,
      assignedDate: assignment.assignedDate,
      iAnswered: true,
      partnerAnswered: true,
      isComplete: true,
    };
  }
  // 'partial' — attribute the one answer. Without both first_responder_id
  // and my user id the state is unknowable; say nothing rather than guess.
  if (!myUserId || !data.first_responder_id) return null;
  const iAnswered = data.first_responder_id === myUserId;
  const assignment = mapAssignment(candidate.id, data);
  return {
    assignment,
    assignedDate: assignment.assignedDate,
    iAnswered,
    partnerAnswered: !iAnswered,
    isComplete: false,
  };
}

/**
 * True when nothing in the window makes today "handled": no live
 * (delivered/partial) daily-flow assignment, and no completed one dated
 * today or later. Yesterday's completed/expired leftovers do NOT count —
 * a new local day should fetch a new prompt. Explore assignments never
 * block the daily rhythm.
 */
export function needsDailyDelivery(
  docs: AssignmentDocLike[],
  todayISO: string
): boolean {
  return !docs.some((d) => {
    const data = d.data();
    if (data.source === 'explore') return false;
    if (data.status === 'delivered' || data.status === 'partial') return true;
    return (
      data.status === 'completed' &&
      typeof data.assigned_date === 'string' &&
      data.assigned_date >= todayISO
    );
  });
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
  // Prune stale entries — skipped assignments expire server-side anyway.
  // Device-local dates: these mark "skipped for the user's day".
  const cutoff = todayLocalISO(new Date(Date.now() - SKIPPED_RETENTION_DAYS * 86400000));
  const pruned = entries.filter((e) => e?.date && e.date >= cutoff);
  const next = [...pruned, { id: assignmentId, date: todayLocalISO() }];
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
  /**
   * The OTHER open daily-flow day in the window (sealed days coexist):
   * yesterday's partial or just-completed assignment sitting alongside the
   * primary. Null on 99% of days. Answer-state comes from the assignment
   * doc's own fields — no second response listener.
   */
  secondaryAssignment: SecondaryAssignmentInfo | null;
  /**
   * True when myResponse is an optimistic local write queued offline —
   * the UI shows the "saved on this phone" line instead of "sealed until".
   * Cleared naturally when the flushed response arrives via onSnapshot.
   */
  isMyResponseOffline?: boolean;
  /**
   * True when the assignment window has no live daily-flow assignment and
   * nothing completed for today — the Today screen may auto-trigger delivery.
   * Computed only from a real snapshot; defaults to false so a cold cache
   * never fires the trigger.
   */
  needsDailyDelivery?: boolean;
}

const EMPTY_TODAY: TodayPrompt = {
  assignment: null,
  myResponse: null,
  partnerResponse: null,
  partnerHasResponded: false,
  isComplete: false,
  nextPromptAt: null,
  reactions: null,
  secondaryAssignment: null,
  needsDailyDelivery: false,
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

  // Day rollover: the snapshot query is pinned to the local date captured at
  // subscribe time, so an app left open (or resumed from background) past
  // midnight would keep serving yesterday. Re-subscribe when the local
  // calendar day changes — checked once a minute and on foreground.
  const subscribedDayRef = useRef(todayLocalISO());
  useEffect(() => {
    const rolloverCheck = () => {
      const day = todayLocalISO();
      if (day !== subscribedDayRef.current) {
        subscribedDayRef.current = day;
        bumpPromptRefresh();
      }
    };
    const interval = setInterval(rolloverCheck, 60_000);
    const appStateSub = AppState.addEventListener('change', (state) => {
      if (state === 'active') rolloverCheck();
    });
    return () => {
      clearInterval(interval);
      appStateSub.remove();
    };
  }, []);

  // Set up real-time listeners
  useEffect(() => {
    if (!coupleId || !userId) {
      queryClient.setQueryData(['todayPrompt', coupleId], EMPTY_TODAY);
      return;
    }

    // Device-local calendar day — never UTC. The server dates assignments in
    // the user's timezone, and partners can sit on adjacent local dates, so
    // query the ±1-day window and prefer docs dated today.
    const today = todayLocalISO();
    subscribedDayRef.current = today;
    const dateWindow = localDateWindow();
    let unsubResponses: (() => void) | null = null;

    // Listen for assignments in the local-date window
    const assignmentsRef = collection(db, 'prompt_assignments');
    const assignmentQuery = query(
      assignmentsRef,
      where('couple_id', '==', coupleId),
      where('assigned_date', 'in', dateWindow)
    );

    const unsubAssignment = onSnapshot(assignmentQuery, async (assignmentSnap) => {
      // Clean up previous response listener before setting up a new one
      if (unsubResponses) {
        unsubResponses();
        unsubResponses = null;
      }
      // Exclude explore assignments and locally-skipped follow-ups, then pick
      // the assignment to surface (active follow-up > active daily > completed,
      // today's date preferred within each tier)
      const skippedIds = await getSkippedFollowUpIds();
      const assignmentDoc = selectAssignmentDoc(assignmentSnap.docs, skippedIds, today, userId);
      const needsDelivery = needsDailyDelivery(assignmentSnap.docs, today);
      const secondaryAssignment = selectSecondaryAssignment(
        assignmentSnap.docs,
        assignmentDoc?.id ?? null,
        skippedIds,
        today,
        userId
      );

      if (!assignmentDoc) {
        queryClient.setQueryData(['todayPrompt', coupleId], {
          ...EMPTY_TODAY,
          nextPromptAt: `${today}T${notificationTime || '19:00'}:00`,
          reactions: null,
          secondaryAssignment,
          needsDailyDelivery: needsDelivery,
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
          const response = mapResponse(responseDoc.id, data);

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
          secondaryAssignment,
          needsDailyDelivery: needsDelivery,
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

export interface AssignmentRevealData {
  myResponse: PromptResponse | null;
  partnerResponse: PromptResponse | null;
}

/**
 * Both responses for a COMPLETED assignment — the open-day chip's reveal
 * sheet (yesterday's finished question) reads through here. One-shot fetch,
 * not a listener: the assignment is already completed, nothing moves.
 * Reactions come from useCompletionReactions (shared with the explore
 * reveal) so a reaction tap settles through its existing invalidation.
 *
 * The couple_id filter is load-bearing — security rules only prove a
 * prompt_responses query safe when couple_id is pinned in the filters.
 */
export function useAssignmentReveal(assignmentId: string | null) {
  const { user } = useAuth();

  return useQuery<AssignmentRevealData | null>({
    queryKey: ['assignmentReveal', assignmentId],
    queryFn: async () => {
      if (!assignmentId || !user?.id || !user?.coupleId) return null;
      const responsesQuery = query(
        collection(db, 'prompt_responses'),
        where('couple_id', '==', user.coupleId),
        where('assignment_id', '==', assignmentId)
      );
      const snap = await getDocs(responsesQuery);

      let myResponse: PromptResponse | null = null;
      let partnerResponse: PromptResponse | null = null;
      for (const responseDoc of snap.docs) {
        const data = responseDoc.data();
        const mapped = mapResponse(responseDoc.id, data);
        if (data.user_id === user.id) {
          myResponse = mapped;
        } else {
          partnerResponse = mapped;
        }
      }
      return { myResponse, partnerResponse };
    },
    enabled: !!assignmentId && !!user?.coupleId,
  });
}

interface OfflineQueuedResponse {
  assignmentId: string;
  responseText: string;
  imageUri?: string;
  responseScore?: number;
}

/**
 * Dedupe the offline queue: the queue is per-device (one user), so one
 * response per assignment is the invariant. Same assignment queued twice
 * (user resubmitted while offline) → keep the LATEST entry.
 */
export function dedupeOfflineQueue(queue: OfflineQueuedResponse[]): OfflineQueuedResponse[] {
  const latestByAssignment = new Map<string, OfflineQueuedResponse>();
  for (const item of queue) {
    if (item?.assignmentId) {
      latestByAssignment.set(item.assignmentId, item);
    }
  }
  return [...latestByAssignment.values()];
}

/**
 * Deterministic response doc ID — one doc per user per assignment. A React
 * Query retry (or a connectivity flap mid-flush) that re-runs the write
 * overwrites the SAME doc instead of creating a duplicate, so the server's
 * onCreate trigger fires exactly once per (assignment, user) pair.
 */
export function responseDocId(assignmentId: string, userId: string): string {
  return `${assignmentId}_${userId}`;
}

/**
 * Returns the id of this user's existing response for the assignment on the
 * server, or null when none exists.
 *
 * The couple_id filter is load-bearing: security rules authorize
 * prompt_responses reads via isCoupleMember(resource.data.couple_id), and
 * Firestore can only prove a QUERY safe when couple_id is pinned in the
 * filters — without it every read is permission-denied (this exact omission
 * is what silently jammed the offline queue).
 */
async function findExistingResponseId(
  assignmentId: string,
  userId: string,
  coupleId: string
): Promise<string | null> {
  const existingQuery = query(
    collection(db, 'prompt_responses'),
    where('couple_id', '==', coupleId),
    where('assignment_id', '==', assignmentId),
    where('user_id', '==', userId)
  );
  const existingSnap = await getDocs(existingQuery);
  return existingSnap.empty ? null : existingSnap.docs[0].id;
}

// Single-flight guard: the flush is triggered from NetInfo listeners in every
// mounted useSubmitResponse (today + explore both mount one), so a reconnect
// fires it multiple times concurrently. All concurrent callers share one
// in-flight flush instead of racing duplicate writes.
let flushInFlight: Promise<void> | null = null;

// Flush any queued offline responses — at most one response per user per
// assignment ever leaves this client (dedupe within the queue + server check
// + deterministic doc ids). Failures are logged, never thrown: the queue is
// kept in AsyncStorage and retried on the next reconnect.
export function flushOfflineQueue(userId: string, coupleId: string): Promise<void> {
  if (flushInFlight) return flushInFlight;
  flushInFlight = performOfflineQueueFlush(userId, coupleId).finally(() => {
    flushInFlight = null;
  });
  return flushInFlight;
}

async function performOfflineQueueFlush(userId: string, coupleId: string): Promise<void> {
  try {
    const raw = await AsyncStorage.getItem(OFFLINE_QUEUE_KEY);
    if (!raw) return;
    const queue: OfflineQueuedResponse[] = dedupeOfflineQueue(JSON.parse(raw));
    if (queue.length === 0) {
      await AsyncStorage.removeItem(OFFLINE_QUEUE_KEY);
      return;
    }

    for (const item of queue) {
      const assignmentRef = doc(db, 'prompt_assignments', item.assignmentId);
      const assignmentSnap = await getDoc(assignmentRef);
      if (!assignmentSnap.exists()) continue;
      const assignmentData = assignmentSnap.data();

      // Drop queued items already answered by this user on the server
      if (await findExistingResponseId(item.assignmentId, userId, coupleId)) continue;

      // Upload queued photo if present
      let imageUrl: string | null = null;
      if (item.imageUri) {
        try {
          imageUrl = await uploadResponsePhoto(coupleId, item.assignmentId, userId, item.imageUri);
        } catch (photoError) {
          logger.warn('Offline queue: photo upload failed, submitting response without it', photoError);
        }
      }

      const responseRef = doc(db, 'prompt_responses', responseDocId(item.assignmentId, userId));
      await setDoc(responseRef, {
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
    // Never crash the app from a background flush — the queue stays in
    // AsyncStorage and the next reconnect retries. But never swallow it
    // either: an answer stuck on-device is a data-loss signal (Sentry).
    logger.reportQueryDenied('usePrompt.flushOfflineQueue', error);
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

      // Safety off-ramp: check the user's OWN text (never the partner's)
      // so the call site can quietly offer resources after submit. Runs
      // here so scale notes, text responses, and offline-queued submissions
      // are all covered by the same seam. Local only — nothing is logged.
      const safetyMatch = containsCrisisLanguage(responseText);

      // Check if offline — queue the response
      const netState = await NetInfo.fetch();
      if (!netState.isConnected) {
        const raw = await AsyncStorage.getItem(OFFLINE_QUEUE_KEY);
        const queue: OfflineQueuedResponse[] = raw ? JSON.parse(raw) : [];
        // At most one queued response per assignment — resubmits replace
        const nextQueue = dedupeOfflineQueue([
          ...queue,
          { assignmentId, responseText, imageUri, responseScore },
        ]);
        await AsyncStorage.setItem(OFFLINE_QUEUE_KEY, JSON.stringify(nextQueue));

        // Optimistically move today's cache to the answered state so the UI
        // seals the card instead of dropping back to unanswered (which used
        // to invite a duplicate resubmit). onSnapshot replaces this wholesale
        // once the flushed response lands on the server.
        const cacheKey = ['todayPrompt', user.coupleId];
        const current = queryClient.getQueryData<TodayPrompt>(cacheKey);
        if (current?.assignment?.id === assignmentId && !current.myResponse) {
          queryClient.setQueryData<TodayPrompt>(cacheKey, {
            ...current,
            assignment: { ...current.assignment, status: 'partial' },
            myResponse: {
              id: `offline-${assignmentId}`,
              responseText,
              imageUrl: null,
              submittedAt: new Date(),
              status: 'submitted',
              responseScore: responseScore ?? null,
              emotionalResponse: null,
            },
            isComplete: false,
            isMyResponseOffline: true,
          });
        }

        return {
          responseId: 'offline-queued',
          isComplete: false,
          isOffline: true,
          hasPhoto: false,
          safetyMatch,
        };
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

      // Existence check BEFORE the write (couple_id-filtered query — the only
      // rules-provable read shape). Non-null means this submit is an
      // overwrite: a mutation retry after the counter update threw, a queue
      // flush that already landed, or a legacy resubmit. Overwrites reuse the
      // existing doc id and MUST NOT increment response_count again — the
      // same person answering twice is still one response.
      const existingResponseId = await findExistingResponseId(
        assignmentId,
        user.id,
        user.coupleId
      );

      // Deterministic id: a retry of this mutation (React Query retries
      // mutations) rewrites the SAME doc instead of minting a duplicate.
      const responseRef = doc(
        db,
        'prompt_responses',
        existingResponseId ?? responseDocId(assignmentId, user.id)
      );
      await setDoc(responseRef, {
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

      if (existingResponseId) {
        // Overwrite — the counter already reflects this user (or the server
        // repair will settle it). Do not double-count one person.
        return {
          responseId: responseRef.id,
          isComplete:
            assignmentData.status === 'completed' || (assignmentData.response_count || 0) >= 2,
          isOffline: false,
          hasPhoto: !!imageUrl,
          safetyMatch,
        };
      }

      // Update assignment response count (server repairs authoritatively;
      // this keeps the UI immediate)
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

      return {
        responseId: responseRef.id,
        isComplete: newResponseCount === 2,
        isOffline: false,
        hasPhoto: !!imageUrl,
        safetyMatch,
      };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['todayPrompt'] });
      // Explore submissions flow through this same mutation — refresh the
      // explore card state and any cached responses so the card seals
      // instead of dropping back to "Respond".
      queryClient.invalidateQueries({ queryKey: ['exploreAssignments'] });
      queryClient.invalidateQueries({ queryKey: ['exploreResponses'] });
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
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({ assignmentId }: { assignmentId: string }) => {
      // Local first — instant filtering, works offline
      await addSkippedFollowUpId(assignmentId);
      // Then server-visible: the partner's client shows "set aside for
      // today" instead of an indefinite waiting state, and response
      // reminders stop for this user. Best-effort — the local skip
      // already covers this device if the write fails.
      if (user?.id) {
        try {
          await updateDoc(doc(db, 'prompt_assignments', assignmentId), {
            [`skipped_by.${user.id}`]: serverTimestamp(),
            updated_at: serverTimestamp(),
          });
        } catch {
          // Offline or rules hiccup — local skip still applies
        }
      }
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
