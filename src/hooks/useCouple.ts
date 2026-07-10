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
import { getIdToken, getIdTokenResult } from 'firebase/auth';
import { httpsCallable } from 'firebase/functions';
import { auth, db, functions } from '@/config/firebase';
import { getShareMessage } from '@/config/app';
import { useAuth } from './useAuth';
import { logEvent } from '@/services/analytics';
import { logger } from '@/utils/logger';

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
  premiumUntil: Date | null;
  premiumSource: string | null;
  currentPulseTier: string | null;
  currentPulseScore: number | null;
  dateNightsCompleted?: number;
  wishlistItemsFulfilled?: number;
  checkInsCompleted?: number;
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

// Storage security rules verify couple membership via the `coupleId` custom
// auth claim, set server-side when the couple activates and cleared on
// unlink/delete. Claims only reach the client on ID token refresh, so after
// any pairing change we force one (natural propagation takes up to ~1 hour).
// Best-effort: a failed refresh just means Storage access catches up on the
// next natural token refresh.
async function refreshCoupleClaim(): Promise<void> {
  try {
    if (auth.currentUser) {
      await getIdToken(auth.currentUser, true);
    }
  } catch (error) {
    logger.warn('Could not force-refresh ID token for couple claim:', error);
  }
}

// Self-heal for the inviter (and any stale session): if the couple is active
// but the cached ID token doesn't carry its coupleId claim yet, refresh the
// token. getIdTokenResult reads the cached token, so this is cheap when the
// claim already matches.
async function ensureCoupleClaim(coupleId: string): Promise<void> {
  try {
    if (!auth.currentUser) return;
    const tokenResult = await getIdTokenResult(auth.currentUser);
    if (tokenResult.claims.coupleId !== coupleId) {
      await getIdToken(auth.currentUser, true);
    }
  } catch (error) {
    logger.warn('Could not verify couple claim on ID token:', error);
  }
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

      // Fire-and-forget: make sure this session's ID token carries the
      // active couple's claim (covers the inviter, whose claim is set by
      // the partner's acceptInvite call on another device).
      if (data.status === 'active') {
        void ensureCoupleClaim(coupleSnap.id);
      }

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
        premiumUntil: data.premium_until?.toDate() || null,
        premiumSource: data.premium_source || null,
        currentPulseTier: data.current_pulse_tier || null,
        currentPulseScore: data.current_pulse_score ?? null,
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
    enabled: !!user?.id,
  });
}

export function useCreateInvite() {
  const { user, refreshUser } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (): Promise<{ code: string; shareMessage: string }> => {
      if (!user?.id) throw new Error('Not authenticated');

      // Check if existing coupleId points to an active couple
      if (user.coupleId) {
        const existingCouple = await getDoc(doc(db, 'couples', user.coupleId));
        if (existingCouple.exists() && existingCouple.data().status === 'active') {
          throw new Error('Already in a couple');
        }
        // Stale couple — clear it before creating a new one
        await updateDoc(doc(db, 'users', user.id), {
          couple_id: null,
          updated_at: serverTimestamp(),
        });
      }

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

      await refreshUser();

      return {
        code,
        shareMessage: getShareMessage(code, user.displayName),
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

      // Invite acceptance is server-side: security rules deny clients any
      // read/update of invites they didn't create (enumeration fix), and the
      // callable performs the whole join atomically with the Admin SDK. Its
      // error messages intentionally match the strings the accept-invite
      // screen maps to its error copies ('Already in a couple', 'expired',
      // 'already been used', 'your own invite', 'Invalid invite code').
      const accept = httpsCallable<{ code: string }, { coupleId: string }>(
        functions,
        'acceptInvite'
      );
      const result = await accept({ code: inviteCode.toUpperCase() });
      const coupleId = result.data.coupleId;

      // Pairing set a coupleId custom claim server-side — pick it up now so
      // Storage rules admit this device immediately.
      await refreshCoupleClaim();
      await refreshUser();

      return { coupleId };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['couple'] });
      logEvent('couple_linked', { couple_id: data.coupleId });
    },
  });
}

export function useDisconnectPartner() {
  const { user, refreshUser } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (): Promise<void> => {
      if (!user?.id || !user?.coupleId) throw new Error('Not in a couple');

      // Unlink is server-side: users docs are owner-write-only, so a client
      // could only ever clear its OWN couple_id and left the partner
      // half-linked. The callable dissolves the couple, clears BOTH users'
      // couple_id and coupleId claims, cancels pending invites, and quietly
      // notifies the partner.
      const unlink = httpsCallable<void, { success: boolean }>(functions, 'unlinkCouple');
      await unlink();

      // Our coupleId claim was cleared server-side — drop it from this
      // device's token now.
      await refreshCoupleClaim();
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
