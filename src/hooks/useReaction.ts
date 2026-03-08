import { useMutation, useQueryClient } from '@tanstack/react-query';
import { doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '@/config/firebase';
import { useAuth } from './useAuth';
import { logEvent } from '@/services/analytics';

export type ReactionType = 'heart' | 'fire' | 'laughing' | 'teary';

export const REACTIONS: { type: ReactionType; emoji: string }[] = [
  { type: 'heart', emoji: '\u2764\uFE0F' },
  { type: 'fire', emoji: '\uD83D\uDD25' },
  { type: 'laughing', emoji: '\uD83D\uDE02' },
  { type: 'teary', emoji: '\uD83E\uDD7A' },
];

export function useReaction() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      assignmentId,
      reaction,
      promptType,
    }: {
      assignmentId: string;
      reaction: ReactionType | null;
      promptType: string;
    }) => {
      if (!user?.id) throw new Error('Not authenticated');

      const completionRef = doc(db, 'prompt_completions', assignmentId);
      await updateDoc(completionRef, {
        [`reactions.${user.id}`]: reaction,
        updated_at: serverTimestamp(),
      });

      if (reaction) {
        logEvent('prompt_reaction_added', { reaction, prompt_type: promptType });
      }

      return { reaction };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['todayPrompt'] });
    },
  });
}
