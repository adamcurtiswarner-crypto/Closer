import { useMutation, useQueryClient } from '@tanstack/react-query';
import { doc, serverTimestamp, updateDoc } from 'firebase/firestore';
import { db } from '@/config/firebase';
import { logEvent } from '@/services/analytics';
import { useAuth } from './useAuth';

// Clarify exchange (founder feature 2026-08-02): one question about your
// partner's answer, one answer back — never a thread. Entries live on the
// completion doc keyed by the ASKER's uid; security rules enforce the
// one-question / one-answer shape (firestore.rules isClarifyAsk/Answer).

export const CLARIFY_QUESTION_MAX = 280;
export const CLARIFY_ANSWER_MAX = 1000;

export interface ClarifyExchange {
  askerId: string;
  question: string;
  askedAt: Date | null;
  /** Raw stored asked_at (Firestore Timestamp) — the answer write must echo
   *  it verbatim (rules require question/asked_at preserved). */
  askedAtRaw: unknown;
  answer: string | null;
  answeredAt: Date | null;
}

function toDate(value: unknown): Date | null {
  if (
    value &&
    typeof value === 'object' &&
    typeof (value as { toDate?: unknown }).toDate === 'function'
  ) {
    return (value as { toDate: () => Date }).toDate();
  }
  return null;
}

/** Read-boundary mapping for a completion doc's clarify field. */
export function mapClarify(raw: unknown): ClarifyExchange[] {
  if (!raw || typeof raw !== 'object') return [];
  const out: ClarifyExchange[] = [];
  for (const [askerId, entry] of Object.entries(raw as Record<string, unknown>)) {
    if (!entry || typeof entry !== 'object') continue;
    const e = entry as Record<string, unknown>;
    if (typeof e.question !== 'string' || e.question.length === 0) continue;
    out.push({
      askerId,
      question: e.question,
      askedAt: toDate(e.asked_at),
      askedAtRaw: e.asked_at,
      answer: typeof e.answer === 'string' && e.answer.length > 0 ? e.answer : null,
      answeredAt: toDate(e.answered_at),
    });
  }
  return out;
}

/** The exchange I started (if any), and the one waiting on me (if any). */
export function splitClarify(
  exchanges: ClarifyExchange[],
  myUid: string
): { mine: ClarifyExchange | null; pendingForMe: ClarifyExchange | null } {
  const mine = exchanges.find((e) => e.askerId === myUid) ?? null;
  const pendingForMe =
    exchanges.find((e) => e.askerId !== myUid && e.answer === null) ?? null;
  return { mine, pendingForMe };
}

function invalidate(queryClient: ReturnType<typeof useQueryClient>) {
  queryClient.invalidateQueries({ queryKey: ['todayPrompt'] });
  queryClient.invalidateQueries({ queryKey: ['completionReactions'] });
  queryClient.invalidateQueries({ queryKey: ['pending-clarify'] });
}

/** Ask one question about your partner's answer on a completion. */
export function useAskClarify() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      completionId,
      question,
    }: {
      completionId: string;
      question: string;
    }) => {
      if (!user?.id) throw new Error('Not authenticated');
      const trimmed = question.trim();
      if (trimmed.length === 0 || trimmed.length > CLARIFY_QUESTION_MAX) {
        throw new Error('Invalid question');
      }
      await updateDoc(doc(db, 'prompt_completions', completionId), {
        [`clarify.${user.id}`]: {
          question: trimmed,
          asked_at: serverTimestamp(),
          answer: null,
          answered_at: null,
        },
        updated_at: serverTimestamp(),
      });
      logEvent('clarify_asked', { completion_id: completionId });
    },
    onSuccess: () => invalidate(queryClient),
  });
}

/** Answer the one question your partner asked about your answer. */
export function useAnswerClarify() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      completionId,
      exchange,
      answer,
    }: {
      completionId: string;
      /** The partner's pending exchange, as mapped from the live doc. */
      exchange: { askerId: string; question: string; askedAtRaw: unknown };
      answer: string;
    }) => {
      if (!user?.id) throw new Error('Not authenticated');
      if (exchange.askerId === user.id) throw new Error('Cannot answer own question');
      const trimmed = answer.trim();
      if (trimmed.length === 0 || trimmed.length > CLARIFY_ANSWER_MAX) {
        throw new Error('Invalid answer');
      }
      // The rules require question/asked_at preserved verbatim — send the
      // raw stored values back unchanged.
      await updateDoc(doc(db, 'prompt_completions', completionId), {
        [`clarify.${exchange.askerId}`]: {
          question: exchange.question,
          asked_at: exchange.askedAtRaw,
          answer: trimmed,
          answered_at: serverTimestamp(),
        },
        updated_at: serverTimestamp(),
      });
      logEvent('clarify_answered', { completion_id: completionId });
    },
    onSuccess: () => invalidate(queryClient),
  });
}
