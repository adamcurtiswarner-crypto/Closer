import { useQuery } from '@tanstack/react-query';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/config/firebase';
import { useAuth } from './useAuth';
import { useCouple } from './useCouple';

export interface Partner {
  id: string;
  email: string;
  displayName: string | null;
}

export function usePartner() {
  const { user } = useAuth();
  const { data: couple } = useCouple();

  return useQuery({
    queryKey: ['partner', couple?.id, user?.id],
    queryFn: async (): Promise<Partner | null> => {
      if (!couple || !user?.id) return null;
      if (couple.status !== 'active') return null;

      // Find partner ID (the member that isn't the current user)
      const partnerId = couple.memberIds.find((id) => id !== user.id);
      if (!partnerId) return null;

      const partnerRef = doc(db, 'users', partnerId);
      const partnerSnap = await getDoc(partnerRef);

      if (!partnerSnap.exists()) return null;

      const data = partnerSnap.data();
      return {
        id: partnerId,
        email: data.email,
        displayName: data.display_name,
      };
    },
    enabled: !!couple?.id && !!user?.id && couple?.status === 'active',
  });
}
