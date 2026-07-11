/**
 * Human-first data export formatting — pure helpers for exportUserData
 * (functions/src/users.ts). No Firestore access happens here: users.ts
 * fetches and joins, this module shapes the two artifacts the export
 * returns:
 *
 *   readable — a plain-text document a person can actually read
 *   raw      — the full JSON, sanitized (ISO timestamps, no tokened URLs)
 */

// ---------------------------------------------------------------------------
// Shared copy
// ---------------------------------------------------------------------------

export const QUESTION_UNAVAILABLE = '(question unavailable)';
export const EXPLORE_MARKER = '(a question between you two)';
export const PHOTOS_NOTE =
  'Photo links are omitted from this export. Your photos can be re-downloaded in the app.';

// ---------------------------------------------------------------------------
// Timestamp + URL sanitization for the raw JSON copy
// ---------------------------------------------------------------------------

interface TimestampLike {
  toDate: () => Date;
}

function isTimestampLike(value: unknown): value is TimestampLike {
  return (
    typeof value === 'object' &&
    value !== null &&
    typeof (value as TimestampLike).toDate === 'function'
  );
}

/** Already-serialized Firestore timestamps ({_seconds, _nanoseconds}). */
function isSerializedTimestamp(value: unknown): value is { _seconds: number } {
  return (
    typeof value === 'object' &&
    value !== null &&
    typeof (value as { _seconds?: unknown })._seconds === 'number'
  );
}

function isStorageUrlKey(key: string): boolean {
  return key === 'photo_url' || key.endsWith('_url');
}

/**
 * Deep-converts a Firestore payload for the machine-readable export copy:
 * - Firestore Timestamps (live or serialized) → ISO 8601 strings
 * - tokened storage URL fields (photo_url, image_url, any *_url) → null
 * Always returns new objects — the input is never mutated.
 */
export function sanitizeRawExport(value: unknown): unknown {
  if (isTimestampLike(value)) {
    return value.toDate().toISOString();
  }
  if (isSerializedTimestamp(value)) {
    return new Date(value._seconds * 1000).toISOString();
  }
  if (Array.isArray(value)) {
    return value.map((item) => sanitizeRawExport(item));
  }
  if (typeof value === 'object' && value !== null) {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>).map(([key, v]) => {
        if (isStorageUrlKey(key) && typeof v === 'string' && v.startsWith('http')) {
          return [key, null];
        }
        return [key, sanitizeRawExport(v)];
      })
    );
  }
  return value;
}

// ---------------------------------------------------------------------------
// Readable document
// ---------------------------------------------------------------------------

export interface ReadableProfile {
  name: string | null;
  email: string | null;
  joinedAt: Date | null;
}

export interface ReadableResponseItem {
  /** Sortable calendar date "2026-07-10"; empty string when unknown. */
  dateKey: string;
  /** Question text, already personalized for the exporter. */
  question: string;
  text: string;
  score: number | null;
  isExplore: boolean;
}

/** "2026-07-10" for a Firestore timestamp-like value, or '' when absent. */
export function dateKeyFromTimestamp(value: unknown): string {
  if (isTimestampLike(value)) {
    return value.toDate().toISOString().slice(0, 10);
  }
  if (isSerializedTimestamp(value)) {
    return new Date(value._seconds * 1000).toISOString().slice(0, 10);
  }
  return '';
}

/** "July 10, 2026" from a "2026-07-10" key (UTC-safe, no TZ rollover). */
function formatDateKey(dateKey: string): string {
  const [year, month, day] = dateKey.split('-').map((part) => parseInt(part, 10));
  if (!year || !month || !day) return 'Date unknown';
  return new Date(Date.UTC(year, month - 1, day)).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    timeZone: 'UTC',
  });
}

function formatDate(date: Date): string {
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    timeZone: 'UTC',
  });
}

function renderResponse(item: ReadableResponseItem): string {
  const lines = [item.isExplore ? `${item.question} ${EXPLORE_MARKER}` : item.question];
  lines.push(`You wrote: ${item.text || '(no written text)'}`);
  if (typeof item.score === 'number') {
    lines.push(`Score: ${item.score}/10`);
  }
  return lines.join('\n');
}

/**
 * Renders the plain-text export: header, profile basics in plain words,
 * then responses grouped by calendar date, newest day first. No internal
 * ids, couple ids, or URLs appear here.
 */
export function buildReadableExport(args: {
  exportedAt: Date;
  profile: ReadableProfile;
  responses: ReadableResponseItem[];
}): string {
  const { exportedAt, profile, responses } = args;

  const profileLines = [
    `Name: ${profile.name || '(not set)'}`,
    `Email: ${profile.email || '(not set)'}`,
    `Joined: ${profile.joinedAt ? formatDate(profile.joinedAt) : '(unknown)'}`,
  ];

  const sections: string[] = [
    `Your Stoke export — ${formatDate(exportedAt)}`,
    profileLines.join('\n'),
    'Your responses',
  ];

  if (responses.length === 0) {
    sections.push('No responses yet.');
    return sections.join('\n\n');
  }

  // Group by calendar date, newest first; unknown dates sink to the end.
  const byDate = new Map<string, ReadableResponseItem[]>();
  for (const item of responses) {
    const existing = byDate.get(item.dateKey) || [];
    byDate.set(item.dateKey, [...existing, item]);
  }
  const orderedKeys = [...byDate.keys()].sort((a, b) => {
    if (a === '') return 1;
    if (b === '') return -1;
    return b.localeCompare(a);
  });

  for (const dateKey of orderedKeys) {
    const dayBlock = [
      formatDateKey(dateKey),
      ...byDate.get(dateKey)!.map((item) => renderResponse(item)),
    ];
    sections.push(dayBlock.join('\n\n'));
  }

  return sections.join('\n\n');
}
