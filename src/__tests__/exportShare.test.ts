/**
 * buildExportShareMessage — the readable document leads, the machine-readable
 * JSON copy trails under a divider, and oversized payloads fall back to
 * readable-only.
 */
import {
  buildExportShareMessage,
  EXPORT_SHARE_TITLE,
  RAW_JSON_DIVIDER,
} from '@/utils/exportShare';

const READABLE = 'Your Stoke export — July 11, 2026\n\nName: Adam\nEmail: adam@example.com';
const RAW = { profile: { email: 'adam@example.com' }, prompt_responses: [] };

describe('buildExportShareMessage', () => {
  it('puts the readable document first', () => {
    const message = buildExportShareMessage(READABLE, RAW);
    expect(message.startsWith(READABLE)).toBe(true);
  });

  it('appends the raw JSON under the divider', () => {
    const message = buildExportShareMessage(READABLE, RAW);
    const dividerIndex = message.indexOf(RAW_JSON_DIVIDER);
    expect(dividerIndex).toBeGreaterThan(0);

    const jsonPart = message.slice(dividerIndex + RAW_JSON_DIVIDER.length).trim();
    expect(JSON.parse(jsonPart)).toEqual(RAW);
  });

  it('shares readable-only when the combined payload is unwieldy', () => {
    const hugeRaw = { blob: 'x'.repeat(500_000) };
    const message = buildExportShareMessage(READABLE, hugeRaw);
    expect(message).toBe(READABLE);
    expect(message).not.toContain(RAW_JSON_DIVIDER);
  });

  it('uses the quiet share title', () => {
    expect(EXPORT_SHARE_TITLE).toBe('Stoke export');
  });
});
