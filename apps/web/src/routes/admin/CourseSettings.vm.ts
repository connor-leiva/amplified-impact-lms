// Course settings (D-174, learner build PR 2c): what the cohort holds for the whole course. Pure
// helpers for the screen: the release plan as its inputs show it, the label-and-text lists as staff
// type them, and the copy strings in key order. No course words here, only labels.

import { COURSE_TZ, zonedInputs } from '@ai/core';
import type { Cohort, CopyString, Db } from '@ai/core';
import type { LabelHint, LabelText } from '@ai/core/course-types';

/** The cohort the course belongs to: cohort one (`dec26`), the only production cohort. */
export const courseCohort = (db: Pick<Db, 'cohorts'>, id = 'dec26'): Cohort | null => db.cohorts.find((c) => c.id === id) ?? null;

export interface PlanForm {
  name: string;
  cadence: string;
  previewDate: string;
  previewTime: string;
  defaultOpenTime: string;
  welcomeDate: string;
  welcomeTime: string;
}

/** The release plan's inputs, in Mountain Time; a week opens at noon unless the cohort says otherwise. */
export function planForm(co: Cohort): PlanForm {
  const p = co.previewOpensAt ? zonedInputs(co.previewOpensAt, co.timezone ?? COURSE_TZ) : { date: '', time: '' };
  const w = co.welcomeSendsAt ? zonedInputs(co.welcomeSendsAt, co.timezone ?? COURSE_TZ) : { date: '', time: '' };
  return { name: co.name, cadence: co.cadence, previewDate: p.date, previewTime: p.time, defaultOpenTime: co.defaultOpenTime ?? '12:00', welcomeDate: w.date, welcomeTime: w.time };
}

/** What `saveCohortPlan` takes, from the form. */
export const planArgs = (cohortId: string, f: PlanForm) => ({
  cohortId,
  name: f.name,
  cadence: f.cadence,
  previewOpens: f.previewDate ? { date: f.previewDate, time: f.previewTime || '12:00' } : null,
  defaultOpenTime: f.defaultOpenTime,
  welcomeSends: f.welcomeDate ? { date: f.welcomeDate, time: f.welcomeTime || '12:00' } : null,
});

/** A list of label-and-text pairs as staff type them: one per line, "Label: text". */
export const pairsText = (rows: readonly (LabelText | LabelHint)[]): string => rows.map((r) => `${r.label}: ${'text' in r ? r.text : r.hint}`).join('\n');

const splitPair = (line: string): [string, string] | null => {
  const at = line.indexOf(':');
  if (at <= 0) return null;
  const label = line.slice(0, at).trim();
  const rest = line.slice(at + 1).trim();
  return label && rest ? [label, rest] : null;
};

export const textPairs = (text: string): LabelText[] =>
  text
    .split('\n')
    .map(splitPair)
    .filter((x): x is [string, string] => x !== null)
    .map(([label, t]) => ({ label, text: t }));

export const hintPairs = (text: string): LabelHint[] =>
  text
    .split('\n')
    .map(splitPair)
    .filter((x): x is [string, string] => x !== null)
    .map(([label, hint]) => ({ label, hint }));

/** The copy strings, by key. */
export const copyRows = (db: Pick<Db, 'copy'>): CopyString[] => [...(db.copy ?? [])].sort((a, b) => a.key.localeCompare(b.key));
