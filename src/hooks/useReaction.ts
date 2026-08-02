import { useMutation, useQueryClient } from '@tanstack/react-query';
import { doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '@/config/firebase';
import { useAuth } from './useAuth';
import { logEvent } from '@/services/analytics';

export type ReactionType = 'heart' | 'fire' | 'laughing' | 'teary';

/** A stored reaction: one of the four curated keys, or a raw emoji string
 *  (any-emoji reactions, founder ask 2026-08-02). */
export type ReactionValue = ReactionType | (string & {});

export type ReactionIconName = 'heart' | 'flame' | 'smiley' | 'drop';

// Phosphor icon names (see @components Icon map) for the curated four. The
// curated row stays SVG (system surface); CUSTOM reactions are user-chosen
// emoji and render as text — user content, not system text. Note: emoji may
// render as boxes on the iOS 26 SIMULATOR (facebook/react-native#56183);
// physical devices are unaffected.
export const REACTIONS: { type: ReactionType; icon: ReactionIconName }[] = [
  { type: 'heart', icon: 'heart' },
  { type: 'fire', icon: 'flame' },
  { type: 'laughing', icon: 'smiley' },
  { type: 'teary', icon: 'drop' },
];

const CURATED = new Set<string>(REACTIONS.map((r) => r.type));

/** Longest UTF-16 length we accept for a custom emoji (covers ZWJ families). */
export const MAX_CUSTOM_REACTION_LENGTH = 16;

export function isCuratedReaction(value: string): value is ReactionType {
  return CURATED.has(value);
}

/** True for a storable custom emoji reaction (non-curated, short, non-empty). */
export function isValidCustomReaction(value: string): boolean {
  return (
    value.length > 0 &&
    value.length <= MAX_CUSTOM_REACTION_LENGTH &&
    !isCuratedReaction(value)
  );
}

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
      reaction: ReactionValue | null;
      promptType: string;
    }) => {
      if (!user?.id) throw new Error('Not authenticated');
      if (
        reaction !== null &&
        !isCuratedReaction(reaction) &&
        !isValidCustomReaction(reaction)
      ) {
        throw new Error('Invalid reaction');
      }

      const completionRef = doc(db, 'prompt_completions', assignmentId);
      await updateDoc(completionRef, {
        [`reactions.${user.id}`]: reaction,
        updated_at: serverTimestamp(),
      });

      if (reaction) {
        logEvent('prompt_reaction_added', {
          reaction: isCuratedReaction(reaction) ? reaction : 'custom_emoji',
          prompt_type: promptType,
        });
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
