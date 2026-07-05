import { buildInviteLink } from '@/utils/inviteLink';

export function getShareMessage(code: string, inviterName?: string | null): string {
  const opening = inviterName
    ? `${inviterName} is inviting you to Stoke`
    : 'Join me on Stoke';
  return `${opening} — one question a day, answered together. Join here: ${buildInviteLink(code)}`;
}
