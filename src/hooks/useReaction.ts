import { useMutation, useQueryClient } from '@tanstack/react-query';
import { doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '@/config/firebase';
import { useAuth } from './useAuth';
import { logEvent } from '@/services/analytics';

export type ReactionType = 'heart' | 'fire' | 'laughing' | 'teary';

export type ReactionIconName = 'heart' | 'flame' | 'smiley' | 'drop';

// Phosphor icon names (see @components Icon map). Emoji glyphs rendered as
// missing-glyph boxes in iOS 26 release builds; SVG icons also match the
// design language (no emoji in system surfaces).
export const REACTIONS: { type: ReactionType; icon: ReactionIconName }[] = [
  { type: 'heart', icon: 'heart' },
  { type: 'fire', icon: 'flame' },
  { type: 'laughing', icon: 'smiley' },
  { type: 'teary', icon: 'drop' },
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
      // Explore reveals read reactions via useCompletionReactions
      queryClient.invalidateQueries({ queryKey: ['completionReactions'] });
    },
  });
}
