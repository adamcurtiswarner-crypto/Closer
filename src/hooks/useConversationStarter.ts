import { useMemo } from 'react';
import { useAuth } from './useAuth';
import { getTodayStarter, ConversationStarter } from '@/config/conversationStarters';

export function useConversationStarter(): ConversationStarter {
  const { user } = useAuth();
  return useMemo(() => getTodayStarter(user?.coupleId ?? null), [user?.coupleId]);
}
