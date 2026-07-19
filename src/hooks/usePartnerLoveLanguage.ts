import { useQuery } from '@tanstack/react-query';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/config/firebase';
import { useAuth } from './useAuth';
import { useCouple } from './useCouple';

/**
 * The partner's love_language value (or null while unset / unpaired).
 * Shared by ProfileCard and the Us view so both read one cache entry.
 */
export function usePartnerLoveLanguage() {
  const { user } = useAuth();
  const { data: couple } = useCouple();

  const partnerId =
    couple?.memberIds?.find((id: string) => id !== user?.id) || null;

  return useQuery({
    queryKey: ['partnerLoveLanguage', partnerId, couple?.id],
    queryFn: async () => {
      if (!partnerId) return null;
      const partnerSnap = await getDoc(doc(db, 'users', partnerId));
      return partnerSnap.exists()
        ? (partnerSnap.data().love_language || null)
        : null;
    },
    enabled: !!partnerId,
    staleTime: 60 * 1000,
  });
}
