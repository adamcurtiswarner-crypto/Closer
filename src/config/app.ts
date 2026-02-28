export const APP_DOMAIN = 'stoke.app';

export function getShareUrl(code: string): string {
  return `https://${APP_DOMAIN}/join/${code}`;
}
