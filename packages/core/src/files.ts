// File and calendar output: skill-file previews, iCalendar feeds and CSV exports.
// Ported verbatim from design-reference/lms-data.js `skillPreview`, `ics` and `csv`
// (lines 316-329 and 342). Pure: `ics` takes its DTSTAMP in rather than reading the clock.

import type { SkillFile } from './types';

/**
 * A skill file to preview. Assignable from {@link SkillFile}; `steps` stays optional because the
 * reference guards it (`f.steps && f.steps.length`) and falls back to the module's outputs.
 */
export interface SkillPreviewFile {
  name: string;
  type: SkillFile['type'];
  steps?: readonly string[];
  size?: string;
  desc?: string;
}

/** The owning AI Employee. Assignable from `AIEmployee`. */
export interface SkillPreviewModule {
  name: string;
  outputs?: readonly string[];
}

export function skillPreview(f: SkillPreviewFile, m: SkillPreviewModule): string {
  const slug = f.name.replace(/\.(skill\.)?(json|ya?ml)$/i, '');
  const steps = f.steps && f.steps.length ? f.steps : m.outputs || [];
  if (f.type === 'YAML')
    return [
      `name: ${slug}`,
      'version: 1.0.0',
      `employee: "${m.name}"`,
      'trigger: manual',
      'steps:',
      ...steps.map((s) => `  - "${s}"`),
      'checks:',
      '  - fair_housing_language',
      '  - no_contact_info_in_public_remarks',
      'output: markdown',
    ].join('\n');
  if (f.type === 'JSON')
    return JSON.stringify(
      {
        name: slug,
        version: '1.0.0',
        employee: m.name,
        trigger: 'manual',
        steps,
        checks: ['fair_housing_language'],
        output: 'markdown',
      },
      null,
      2,
    );
  return `# ${f.name}\n\nNotion template · Duplicate into your workspace\n\n${steps.map((s) => '- [ ] ' + s).join('\n')}`;
}

export interface IcsEvent {
  id: string;
  title: string;
  start: number;
  end: number;
  url?: string;
  desc?: string;
}

/**
 * One iCalendar document for the given events, CRLF-joined as RFC 5545 requires.
 *
 * `stamp` is the only deliberate deviation from the reference, which reads `Date.now()` for
 * DTSTAMP. Core is pure, so the stamp is injected; the default of `0` still emits a well-formed
 * `DTSTAMP:19700101T000000Z`.
 */
export function ics(events: readonly IcsEvent[], stamp = 0): string {
  const f = (t: number) =>
    new Date(t)
      .toISOString()
      .replace(/[-:]/g, '')
      .replace(/\.\d{3}/, '');
  const L = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Amplified Impact//LMS//EN'];
  events.forEach((e) =>
    L.push(
      'BEGIN:VEVENT',
      `UID:${e.id}@amplified-impact`,
      `DTSTAMP:${f(stamp)}`,
      `DTSTART:${f(e.start)}`,
      `DTEND:${f(e.end)}`,
      `SUMMARY:${e.title}`,
      `LOCATION:${e.url || ''}`,
      `DESCRIPTION:${e.desc || ''}`,
      'END:VEVENT',
    ),
  );
  L.push('END:VCALENDAR');
  return L.join('\r\n');
}

export type CsvCell = string | number | null | undefined;

/** Every cell quoted, inner quotes doubled, rows LF-joined (not CRLF, unlike {@link ics}). */
export const csv = (rows: readonly CsvCell[][]): string =>
  rows.map((r) => r.map((c) => `"${String(c ?? '').replace(/"/g, '""')}"`).join(',')).join('\n');
