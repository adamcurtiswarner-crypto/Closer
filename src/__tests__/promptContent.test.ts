/**
 * Content QA: every seed prompt and follow-up template must render cleanly
 * through personalizeText — with real names AND with the fallbacks — leaving
 * no stray braces (malformed tokens) and no double spaces.
 *
 * The seed JSON in app/data is the canonical prompt library; the same text
 * is what seedPrompts.ts / retokenizePrompts.ts put in Firestore.
 */
import { personalizeText, hasPersonalizationTokens } from '@/utils/personalize';

/* eslint-disable @typescript-eslint/no-var-requires */
const seedV4 = require('../../data/seed-prompts-v4.json') as {
  prompts: Array<{ id: string; text: string; hint: string | null }>;
};
const seedV5 = require('../../data/seed-prompts-v5.json') as {
  prompts: Array<{ id: string; text: string; hint: string | null }>;
};
const followUpTemplates = require('../../data/follow-up-templates-v1.json') as Array<{
  id: string;
  text: string;
  closing_text?: string | null;
}>;
/* eslint-enable @typescript-eslint/no-var-requires */

interface TextField {
  id: string;
  field: string;
  value: string;
}

function collectFields(): TextField[] {
  const fields: TextField[] = [];
  for (const prompt of [...seedV4.prompts, ...seedV5.prompts]) {
    fields.push({ id: prompt.id, field: 'text', value: prompt.text });
    if (typeof prompt.hint === 'string' && prompt.hint.length > 0) {
      fields.push({ id: prompt.id, field: 'hint', value: prompt.hint });
    }
  }
  for (const template of followUpTemplates) {
    fields.push({ id: template.id, field: 'text', value: template.text });
    if (typeof template.closing_text === 'string' && template.closing_text.length > 0) {
      fields.push({ id: template.id, field: 'closing_text', value: template.closing_text });
    }
  }
  return fields;
}

const NAME_SETS = [
  { label: 'real names', names: { partnerName: 'Sarah', selfName: 'Adam' } },
  { label: 'fallbacks', names: { partnerName: null, selfName: null } },
] as const;

describe('seed content personalization QA', () => {
  const fields = collectFields();

  it('covers the full library (~422 prompts, ~132 templates)', () => {
    expect(seedV4.prompts.length + seedV5.prompts.length).toBeGreaterThanOrEqual(400);
    expect(followUpTemplates.length).toBeGreaterThanOrEqual(130);
  });

  it.each(NAME_SETS)('every text field renders cleanly with $label', ({ names }) => {
    const problems: string[] = [];
    for (const { id, field, value } of fields) {
      const rendered = personalizeText(value, names);
      if (hasPersonalizationTokens(rendered)) {
        problems.push(`${id}.${field}: unreplaced token -> ${rendered}`);
      }
      if (/[{}]/.test(rendered)) {
        problems.push(`${id}.${field}: stray brace (malformed token?) -> ${rendered}`);
      }
      if (/ {2}/.test(rendered)) {
        problems.push(`${id}.${field}: double space -> ${rendered}`);
      }
    }
    expect(problems).toEqual([]);
  });

  it('never leaves a lowercase fallback opening a sentence', () => {
    const problems: string[] = [];
    for (const { id, field, value } of fields) {
      const rendered = personalizeText(value, { partnerName: null, selfName: null });
      if (/(^|[.!?]\s+)(your partner|you)\b/.test(rendered)) {
        problems.push(`${id}.${field}: uncapitalized fallback -> ${rendered}`);
      }
    }
    expect(problems).toEqual([]);
  });

  it('the library actually carries personalization tokens (guards de-tokenizing)', () => {
    const tokenizedPrompts = [...seedV4.prompts, ...seedV5.prompts].filter(
      (p) => hasPersonalizationTokens(p.text) || hasPersonalizationTokens(p.hint ?? '')
    );
    const tokenizedTemplates = followUpTemplates.filter(
      (t) => hasPersonalizationTokens(t.text) || hasPersonalizationTokens(t.closing_text ?? '')
    );
    expect(tokenizedPrompts.length).toBeGreaterThanOrEqual(1);
    expect(tokenizedTemplates.length).toBeGreaterThanOrEqual(38);
  });

  it('no raw "your partner" phrasing survives in tokenized collections', () => {
    // The retokenize pass converted every explicit partner phrase; a new
    // prompt written with the literal phrase should use {partner} instead.
    // ("your partnership" and similar words are fine — word boundary.)
    const offenders: string[] = [];
    for (const { id, field, value } of fields) {
      if (/\byour partner\b/i.test(value)) {
        offenders.push(`${id}.${field}: ${value}`);
      }
    }
    expect(offenders).toEqual([]);
  });
});
