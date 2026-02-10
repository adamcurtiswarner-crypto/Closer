import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  collection,
  doc,
  getDoc,
  getDocs,
  addDoc,
  setDoc,
  updateDoc,
  query,
  where,
  serverTimestamp,
} from 'firebase/firestore';
import { httpsCallable } from 'firebase/functions';
import { db, functions } from '@/config/firebase';
import { useAuth } from './useAuth';
import { logEvent } from '@/services/analytics';
import { generateCoupleKey } from '@/services/encryption';

interface Couple {
  id: string;
  memberIds: string[];
  status: 'pending' | 'active' | 'paused' | 'deleted';
  linkedAt: Date | null;
  totalCompletions: number;
  currentWeekCompletions: number;
  promptFrequency: 'daily' | 'weekdays' | 'weekends';
  currentStreak: number;
  longestStreak: number;
  anniversaryDate: Date | null;
}

interface Invite {
  code: string;
  status: 'pending' | 'accepted' | 'expired' | 'cancelled';
  expiresAt: Date;
  createdAt: Date;
}

// Generate a random 6-character invite code
function generateInviteCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // Exclude confusing characters
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

export function useCouple() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['couple', user?.coupleId],
    queryFn: async (): Promise<Couple | null> => {
      if (!user?.coupleId) return null;

      const coupleRef = doc(db, 'couples', user.coupleId);
      const coupleSnap = await getDoc(coupleRef);

      if (!coupleSnap.exists()) return null;

      const data = coupleSnap.data();
      return {
        id: coupleSnap.id,
        memberIds: data.member_ids,
        status: data.status,
        linkedAt: data.linked_at?.toDate() || null,
        totalCompletions: data.total_completions || 0,
        currentWeekCompletions: data.current_week_completions || 0,
        promptFrequency: data.prompt_frequency || 'daily',
        currentStreak: data.current_streak || 0,
        longestStreak: data.longest_streak || 0,
        anniversaryDate: data.anniversary_date?.toDate() || null,
      };
    },
    enabled: !!user?.coupleId,
  });
}

export function usePendingInvite() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['pendingInvite', user?.id],
    queryFn: async (): Promise<Invite | null> => {
      if (!user?.id) return null;

      const invitesRef = collection(db, 'couple_invites');
      const inviteQuery = query(
        invitesRef,
        where('inviter_id', '==', user.id),
        where('status', '==', 'pending')
      );
      const inviteSnap = await getDocs(inviteQuery);

      if (inviteSnap.empty) return null;

      const inviteDoc = inviteSnap.docs[0];
      const data = inviteDoc.data();

      // Check if expired
      const expiresAt = data.expires_at.toDate();
      if (expiresAt < new Date()) {
        // Update status to expired
        await updateDoc(doc(db, 'couple_invites', inviteDoc.id), {
          status: 'expired',
        });
        return null;
      }

      return {
        code: inviteDoc.id,
        status: data.status,
        expiresAt,
        createdAt: data.created_at.toDate(),
      };
    },
    enabled: !!user?.id && !user?.coupleId,
  });
}

export function useCreateInvite() {
  const { user, refreshUser } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (): Promise<{ code: string; shareUrl: string }> => {
      if (!user?.id) throw new Error('Not authenticated');
      if (user.coupleId) throw new Error('Already in a couple');

      const code = generateInviteCode();
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 7); // 7 days expiry

      // Create pending couple
      const couplesRef = collection(db, 'couples');
      const coupleDoc = await addDoc(couplesRef, {
        member_ids: [user.id],
        member_emails: [user.email],
        status: 'pending',
        linked_at: null,
        prompt_frequency: 'daily',
        total_completions: 0,
        current_week_completions: 0,
        last_completion_at: null,
        created_at: serverTimestamp(),
        updated_at: serverTimestamp(),
        cohort_week: null,
        relationship_length: null,
      });

      // Create invite using code as the document ID
      const inviteRef = doc(db, 'couple_invites', code);
      await setDoc(inviteRef, {
        invite_code: code,
        inviter_id: user.id,
        inviter_email: user.email,
        couple_id: coupleDoc.id,
        status: 'pending',
        created_at: serverTimestamp(),
        expires_at: expiresAt,
        accepted_at: null,
        accepted_by: null,
      });

      // Update user's couple_id
      const userRef = doc(db, 'users', user.id);
      await updateDoc(userRef, {
        couple_id: coupleDoc.id,
        updated_at: serverTimestamp(),
      });

      // Generate encryption key for this couple
      await generateCoupleKey(coupleDoc.id);

      await refreshUser();

      return {
        code,
        shareUrl: `https://closer.app/join/${code}`,
      };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pendingInvite'] });
      queryClient.invalidateQueries({ queryKey: ['couple'] });
    },
  });
}

export function useAcceptInvite() {
  const { user, refreshUser } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (inviteCode: string): Promise<{ coupleId: string }> => {
      if (!user?.id) throw new Error('Not authenticated');
      if (user.coupleId) throw new Error('Already in a couple');

      // Look up invite by code (code is the document ID)
      const inviteRef = doc(db, 'couple_invites', inviteCode.toUpperCase());
      const inviteSnap = await getDoc(inviteRef);

      if (!inviteSnap.exists()) {
        throw new Error('Invalid invite code');
      }

      const inviteData = inviteSnap.data();

      if (inviteData.status !== 'pending') {
        throw new Error('This invite has already been used');
      }

      if (inviteData.expires_at.toDate() < new Date()) {
        throw new Error('This invite has expired');
      }

      if (inviteData.inviter_id === user.id) {
        throw new Error("You can't accept your own invite");
      }

      const inviteDoc = inviteSnap;

      const coupleId = inviteData.couple_id;

      // Update invite
      await updateDoc(inviteRef, {
        status: 'accepted',
        accepted_at: serverTimestamp(),
        accepted_by: user.id,
      });

      // Update couple
      const coupleRef = doc(db, 'couples', coupleId);
      const coupleDocSnap = await getDoc(coupleRef);
      const coupleData = coupleDocSnap.data();

      await updateDoc(coupleRef, {
        member_ids: [...coupleData!.member_ids, user.id],
        member_emails: [...coupleData!.member_emails, user.email],
        status: 'active',
        linked_at: serverTimestamp(),
        updated_at: serverTimestamp(),
        cohort_week: getISOWeek(),
      });

      // Update user's couple_id
      const userRef = doc(db, 'users', user.id);
      await updateDoc(userRef, {
        couple_id: coupleId,
        updated_at: serverTimestamp(),
      });

      // Generate encryption key for this couple
      await generateCoupleKey(coupleId);

      await refreshUser();

      return { coupleId };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['couple'] });
      logEvent('couple_linked', { couple_id: data.coupleId });
    },
  });
}

// Helper to get ISO week string
function getISOWeek(): string {
  const now = new Date();
  const year = now.getFullYear();
  const firstDayOfYear = new Date(year, 0, 1);
  const pastDaysOfYear = (now.getTime() - firstDayOfYear.getTime()) / 86400000;
  const weekNumber = Math.ceil((pastDaysOfYear + firstDayOfYear.getDay() + 1) / 7);
  return `${year}-W${weekNumber.toString().padStart(2, '0')}`;
}

export function useDisconnectPartner() {
  const { user, refreshUser } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (): Promise<void> => {
      if (!user?.id || !user?.coupleId) throw new Error('Not in a couple');

      const coupleRef = doc(db, 'couples', user.coupleId);
      const coupleSnap = await getDoc(coupleRef);

      if (!coupleSnap.exists()) throw new Error('Couple not found');

      const coupleData = coupleSnap.data();
      const memberIds: string[] = coupleData.member_ids || [];

      // Update couple status to deleted
      await updateDoc(coupleRef, {
        status: 'deleted',
        updated_at: serverTimestamp(),
      });

      // Clear couple_id from all members
      for (const memberId of memberIds) {
        const memberRef = doc(db, 'users', memberId);
        await updateDoc(memberRef, {
          couple_id: null,
          updated_at: serverTimestamp(),
        });
      }

      // Cancel any pending invites for this couple
      const invitesRef = collection(db, 'couple_invites');
      const inviteQuery = query(
        invitesRef,
        where('couple_id', '==', user.coupleId),
        where('status', '==', 'pending')
      );
      const inviteSnap = await getDocs(inviteQuery);

      for (const inviteDoc of inviteSnap.docs) {
        await updateDoc(doc(db, 'couple_invites', inviteDoc.id), {
          status: 'cancelled',
        });
      }

      await refreshUser();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['couple'] });
      queryClient.invalidateQueries({ queryKey: ['partner'] });
      queryClient.invalidateQueries({ queryKey: ['pendingInvite'] });
    },
  });
}

export function useUpdatePromptFrequency() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (frequency: 'daily' | 'weekdays' | 'weekends'): Promise<void> => {
      if (!user?.coupleId) throw new Error('Not in a couple');

      const coupleRef = doc(db, 'couples', user.coupleId);
      await updateDoc(coupleRef, {
        prompt_frequency: frequency,
        updated_at: serverTimestamp(),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['couple'] });
    },
  });
}

export function useUpdateAnniversaryDate() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (date: Date): Promise<void> => {
      if (!user?.coupleId) throw new Error('Not in a couple');

      const coupleRef = doc(db, 'couples', user.coupleId);
      await updateDoc(coupleRef, {
        anniversary_date: date,
        updated_at: serverTimestamp(),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['couple'] });
    },
  });
}

export function useCancelInvite() {
  const { user, refreshUser } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (): Promise<void> => {
      if (!user?.id) throw new Error('Not authenticated');

      // Find and cancel pending invite
      const invitesRef = collection(db, 'couple_invites');
      const inviteQuery = query(
        invitesRef,
        where('inviter_id', '==', user.id),
        where('status', '==', 'pending')
      );
      const inviteSnap = await getDocs(inviteQuery);

      if (inviteSnap.empty) return;

      const inviteDoc = inviteSnap.docs[0];
      const inviteData = inviteDoc.data();

      // Cancel the invite
      await updateDoc(doc(db, 'couple_invites', inviteDoc.id), {
        status: 'cancelled',
      });

      // Delete or update the pending couple
      if (inviteData.couple_id) {
        const coupleRef = doc(db, 'couples', inviteData.couple_id);
        await updateDoc(coupleRef, {
          status: 'deleted',
          updated_at: serverTimestamp(),
        });
      }

      // Clear user's couple_id
      if (user.coupleId) {
        const userRef = doc(db, 'users', user.id);
        await updateDoc(userRef, {
          couple_id: null,
          updated_at: serverTimestamp(),
        });
      }

      await refreshUser();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pendingInvite'] });
      queryClient.invalidateQueries({ queryKey: ['couple'] });
    },
  });
}
