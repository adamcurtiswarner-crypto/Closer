import { useQuery } from '@tanstack/react-query';
import { httpsCallable } from 'firebase/functions';
import { functions } from '@/config/firebase';
import { useAuth } from './useAuth';

interface ExperimentResult {
  variant: string | null;
  isInExperiment: boolean;
  isLoading: boolean;
}

export function useExperiment(experimentId: string): ExperimentResult {
  const { user } = useAuth();

  const { data, isLoading } = useQuery({
    queryKey: ['experiment', experimentId, user?.id],
    queryFn: async () => {
      const assignVariant = httpsCallable(functions, 'assignExperimentVariant');
      const result = await assignVariant({ experimentId });
      return result.data as {
        experimentId: string;
        variant: string | null;
        isInExperiment: boolean;
      };
    },
    enabled: !!user?.id && !!experimentId,
    staleTime: Infinity, // Assignment doesn't change
  });

  return {
    variant: data?.variant ?? null,
    isInExperiment: data?.isInExperiment ?? false,
    isLoading,
  };
}

export function useFeatureFlag(flagName: string): { isEnabled: boolean; isLoading: boolean } {
  const { variant, isInExperiment, isLoading } = useExperiment(flagName);

  return {
    isEnabled: isInExperiment && variant === 'enabled',
    isLoading,
  };
}
