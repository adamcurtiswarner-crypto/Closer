import { useCallback } from 'react';
import { useAuth } from './useAuth';
import { usePartner } from './usePartner';
import { personalizeText } from '@/utils/personalize';

/**
 * Returns a stable function that renders {partner}/{me} tokens in prompt
 * text with the couple's real first names (falling back to "your partner"
 * / "you"). Use at every surface that displays prompt text.
 */
export function usePersonalize(): (text: string) => string {
  const { user } = useAuth();
  const { data: partner } = usePartner();

  const partnerName = partner?.displayName ?? null;
  const selfName = user?.displayName ?? null;

  return useCallback(
    (text: string) => personalizeText(text, { partnerName, selfName }),
    [partnerName, selfName]
  );
}
