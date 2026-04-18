import { useMutation, useQueryClient } from '@tanstack/react-query';
import { httpsCallable } from 'firebase/functions';
import * as SecureStore from 'expo-secure-store';
import { functions } from '@/config/firebase';
import { useAuth } from './useAuth';
import { logEvent } from '@/services/analytics';
import { BIOMETRIC_ENABLED_KEY } from './useBiometricAuth';
import { logger } from '@/utils/logger';

interface DeleteAccountResult {
  success: boolean;
  purge_date: string;
}

interface ExportDataResult {
  exported_at: string;
  profile: Record<string, any>;
  prompt_responses: any[];
  events: any[];
  memories: any[];
  goals: any[];
  wishlist_items: any[];
}

interface AnonymizeResult {
  anonymized_count: number;
}

export function useDeleteAccount() {
  const { signOut, user } = useAuth();

  return useMutation({
    mutationFn: async (): Promise<DeleteAccountResult> => {
      const fn = httpsCallable<void, DeleteAccountResult>(functions, 'deleteAccount');
      const result = await fn();
      return result.data;
    },
    onSuccess: async () => {
      await logEvent('account_deleted');
      // Clean up SecureStore keys
      try {
        await SecureStore.deleteItemAsync(BIOMETRIC_ENABLED_KEY);
      } catch (err) {
        logger.warn('SecureStore cleanup on delete:', err);
      }
      await signOut();
    },
  });
}

export function useExportData() {
  return useMutation({
    mutationFn: async (): Promise<ExportDataResult> => {
      const fn = httpsCallable<void, ExportDataResult>(functions, 'exportUserData');
      const result = await fn();
      return result.data;
    },
    onSuccess: () => {
      logEvent('data_exported');
    },
  });
}

export function useAnonymizeResponses() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (): Promise<AnonymizeResult> => {
      const fn = httpsCallable<void, AnonymizeResult>(functions, 'anonymizeMyResponses');
      const result = await fn();
      return result.data;
    },
    onSuccess: (data) => {
      logEvent('responses_anonymized', { count: data.anonymized_count });
      queryClient.invalidateQueries({ queryKey: ['memories'] });
      queryClient.invalidateQueries({ queryKey: ['prompt'] });
      queryClient.invalidateQueries({ queryKey: ['insights'] });
    },
  });
}
