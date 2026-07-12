import { useTranslation } from 'react-i18next';
import { useAuth } from './useAuth';
import { usePartner } from './usePartner';

/**
 * THE single source of truth for what to call the partner on screen.
 *
 * Preference order:
 * 1. The partner's OWN display_name (what they call themselves — via usePartner)
 * 2. The pet name this user gave them (users.partner_name, set in Profile)
 * 3. The lowercase fallback "your partner" (never capital-P "Partner" —
 *    sim walkthrough 2026-07-12 showed the robotic register everywhere)
 *
 * Returns { name, isFallback } so call sites that need sentence-position
 * casing can apply it themselves (personalize.ts handles that for prompt
 * text; UI labels should be written to read correctly with lowercase).
 */
export function usePartnerName(): { name: string; isFallback: boolean } {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { data: partner } = usePartner();

  const resolved =
    partner?.displayName?.trim() || user?.partnerName?.trim() || null;

  return {
    name: resolved ?? t('explore.partnerFallback'),
    isFallback: resolved == null,
  };
}
