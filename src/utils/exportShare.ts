/**
 * Builds the text shared from Profile → "Export my data".
 *
 * The readable document leads; the machine-readable JSON copy is appended
 * under a divider so one shared file carries both. If the combined payload
 * would be unwieldy for the share sheet, we share the readable document
 * alone — the JSON copy stays available via a later export.
 */

export const EXPORT_SHARE_TITLE = 'Stoke export';

export const RAW_JSON_DIVIDER = '--- Machine-readable copy (JSON) ---';

// iOS share extensions get flaky with very large text payloads; cap the
// combined document well below that point.
const MAX_COMBINED_LENGTH = 400_000;

export function buildExportShareMessage(readable: string, raw: unknown): string {
  const rawJson = JSON.stringify(raw, null, 2);
  const combined = `${readable}\n\n${RAW_JSON_DIVIDER}\n\n${rawJson}`;
  return combined.length > MAX_COMBINED_LENGTH ? readable : combined;
}
