import { useInfiniteQuery } from '@tanstack/react-query';
import {
  collection,
  query,
  where,
  orderBy,
  getDocs,
} from 'firebase/firestore';
import { db } from '@/config/firebase';
import { useAuth } from './useAuth';

export interface PhotoItem {
  id: string;
  imageUrl: string;
  source: 'response' | 'chat' | 'standalone';
  date: Date;
  context: string;
}

const PAGE_SIZE = 30;

async function fetchResponsePhotos(coupleId: string): Promise<PhotoItem[]> {
  const q = query(
    collection(db, 'prompt_completions'),
    where('couple_id', '==', coupleId),
    orderBy('completed_at', 'desc'),
  );
  const snap = await getDocs(q);
  const photos: PhotoItem[] = [];

  for (const doc of snap.docs) {
    const data = doc.data();
    const responses = data.responses || [];
    for (const r of responses) {
      if (r.image_url) {
        photos.push({
          id: `response-${doc.id}-${r.user_id}`,
          imageUrl: r.image_url,
          source: 'response',
          date: data.completed_at?.toDate() || new Date(),
          context: data.prompt_text || '',
        });
      }
    }
  }
  return photos;
}

async function fetchChatPhotos(coupleId: string): Promise<PhotoItem[]> {
  const q = query(
    collection(db, 'couples', coupleId, 'messages'),
    where('type', '==', 'image'),
    where('is_deleted', '==', false),
    orderBy('created_at', 'desc'),
  );
  const snap = await getDocs(q);

  return snap.docs
    .filter(doc => doc.data().image_url)
    .map(doc => {
      const data = doc.data();
      return {
        id: `chat-${doc.id}`,
        imageUrl: data.image_url,
        source: 'chat' as const,
        date: data.created_at?.toDate() || new Date(),
        context: data.text || 'Chat photo',
      };
    });
}

async function fetchStandalonePhotos(coupleId: string): Promise<PhotoItem[]> {
  const q = query(
    collection(db, 'couples', coupleId, 'photos'),
    orderBy('created_at', 'desc'),
  );
  const snap = await getDocs(q);

  return snap.docs.map(doc => {
    const data = doc.data();
    return {
      id: `standalone-${doc.id}`,
      imageUrl: data.image_url,
      source: 'standalone' as const,
      date: data.created_at?.toDate() || new Date(),
      context: data.caption || '',
    };
  });
}

export function usePhotoGrid() {
  const { user } = useAuth();

  return useInfiniteQuery({
    queryKey: ['photoGrid', user?.coupleId],
    queryFn: async ({ pageParam = 0 }): Promise<{ items: PhotoItem[]; nextOffset: number | null }> => {
      if (!user?.coupleId) return { items: [], nextOffset: null };

      const [responsePhotos, chatPhotos, standalonePhotos] = await Promise.all([
        fetchResponsePhotos(user.coupleId),
        fetchChatPhotos(user.coupleId),
        fetchStandalonePhotos(user.coupleId),
      ]);

      const allPhotos = [...responsePhotos, ...chatPhotos, ...standalonePhotos]
        .sort((a, b) => b.date.getTime() - a.date.getTime());

      const start = pageParam as number;
      const end = start + PAGE_SIZE;
      const page = allPhotos.slice(start, end);
      const nextOffset = end < allPhotos.length ? end : null;

      return { items: page, nextOffset };
    },
    initialPageParam: 0,
    getNextPageParam: (lastPage) => lastPage.nextOffset,
    enabled: !!user?.coupleId,
    staleTime: 5 * 60 * 1000,
  });
}
