import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  collection,
  doc,
  getDocs,
  addDoc,
  updateDoc,
  query,
  where,
  orderBy,
  serverTimestamp,
  Timestamp,
} from 'firebase/firestore';
import { db } from '@/config/firebase';
import { useAuth } from './useAuth';
import { logEvent } from '@/services/analytics';

export interface WishlistItem {
  id: string;
  title: string;
  description: string;
  category: string;
  addedBy: string;
  addedByName: string;
  isCompleted: boolean;
  completedAt: Date | null;
  completedBy: string | null;
  isArchived: boolean;
  createdAt: Date | null;
  updatedAt: Date | null;
}

const MAX_ACTIVE_ITEMS = 20;

export function useWishlistItems() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['wishlist', user?.coupleId],
    queryFn: async (): Promise<WishlistItem[]> => {
      if (!user?.coupleId) return [];

      const itemsRef = collection(db, 'couples', user.coupleId, 'wishlist_items');
      const itemsQuery = query(
        itemsRef,
        where('is_archived', '==', false),
        orderBy('created_at', 'desc')
      );
      const snap = await getDocs(itemsQuery);

      return snap.docs.map((d) => {
        const data = d.data();
        return {
          id: d.id,
          title: data.title,
          description: data.description || '',
          category: data.category || 'other',
          addedBy: data.added_by,
          addedByName: data.added_by_name || '',
          isCompleted: data.is_completed || false,
          completedAt: data.completed_at?.toDate() || null,
          completedBy: data.completed_by || null,
          isArchived: data.is_archived || false,
          createdAt: data.created_at?.toDate() || null,
          updatedAt: data.updated_at?.toDate() || null,
        };
      });
    },
    enabled: !!user?.coupleId,
  });
}

export function useAddWishlistItem() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: {
      title: string;
      description?: string;
      category: string;
    }): Promise<string> => {
      if (!user?.coupleId) throw new Error('Not in a couple');

      // Check active item limit
      const itemsRef = collection(db, 'couples', user.coupleId, 'wishlist_items');
      const activeQuery = query(itemsRef, where('is_archived', '==', false));
      const activeSnap = await getDocs(activeQuery);
      if (activeSnap.size >= MAX_ACTIVE_ITEMS) {
        throw new Error(`You can have at most ${MAX_ACTIVE_ITEMS} wishlist items`);
      }

      const itemDoc = await addDoc(itemsRef, {
        title: params.title,
        description: params.description || '',
        category: params.category,
        added_by: user.id,
        added_by_name: user.displayName || 'You',
        is_completed: false,
        completed_at: null,
        completed_by: null,
        is_archived: false,
        created_at: serverTimestamp(),
        updated_at: serverTimestamp(),
      });

      logEvent('wishlist_item_added', {
        item_id: itemDoc.id,
        category: params.category,
      });

      return itemDoc.id;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['wishlist'] });
    },
  });
}

export function useToggleWishlistItem() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: {
      itemId: string;
      isCurrentlyCompleted: boolean;
    }): Promise<void> => {
      if (!user?.coupleId) throw new Error('Not in a couple');

      const itemRef = doc(db, 'couples', user.coupleId, 'wishlist_items', params.itemId);

      if (params.isCurrentlyCompleted) {
        // Uncomplete
        await updateDoc(itemRef, {
          is_completed: false,
          completed_at: null,
          completed_by: null,
          updated_at: serverTimestamp(),
        });
      } else {
        // Complete
        await updateDoc(itemRef, {
          is_completed: true,
          completed_at: serverTimestamp(),
          completed_by: user.id,
          updated_at: serverTimestamp(),
        });

        logEvent('wishlist_item_completed', {
          item_id: params.itemId,
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['wishlist'] });
    },
  });
}

export function useDeleteWishlistItem() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (itemId: string): Promise<void> => {
      if (!user?.coupleId) throw new Error('Not in a couple');

      const itemRef = doc(db, 'couples', user.coupleId, 'wishlist_items', itemId);
      await updateDoc(itemRef, {
        is_archived: true,
        updated_at: serverTimestamp(),
      });

      logEvent('wishlist_item_deleted', { item_id: itemId });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['wishlist'] });
    },
  });
}
