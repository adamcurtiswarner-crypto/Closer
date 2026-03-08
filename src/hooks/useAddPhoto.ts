import { useMutation, useQueryClient } from '@tanstack/react-query';
import { collection, addDoc, doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '@/config/firebase';
import { useAuth } from './useAuth';
import { uploadStandalonePhoto } from '@/services/imageUpload';
import { logEvent } from '@/services/analytics';

export interface AddPhotoInput {
  uri: string;
  caption?: string;
}

export function useAddPhoto() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: AddPhotoInput) => {
      if (!user?.coupleId) throw new Error('No couple');

      const photoRef = await addDoc(
        collection(db, 'couples', user.coupleId, 'photos'),
        {
          image_url: '',
          caption: input.caption || null,
          uploaded_by: user.id,
          created_at: serverTimestamp(),
        },
      );

      const imageUrl = await uploadStandalonePhoto(user.coupleId, photoRef.id, input.uri);

      await updateDoc(
        doc(db, 'couples', user.coupleId, 'photos', photoRef.id),
        { image_url: imageUrl },
      );

      logEvent('photo_standalone_uploaded', {});
      return photoRef.id;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['photoGrid'] });
    },
  });
}
