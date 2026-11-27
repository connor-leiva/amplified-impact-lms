// D-264: which templates a cohort observer may ever be sent, as a map that is total over `TemplateName`.
//
// A leaf, like `templates/payload.ts`: it imports core's two lists and the template names' type and nothing else, so
// the transport can refuse an observer copy of a personal email without importing the code that makes copies.
//
// Total on purpose: a seventeenth template is a compile error here until it says which side it is on, and
// `observers.test.ts` holds the two sides to core's `OBSERVER_COPY_TEMPLATES` and `OBSERVER_NEVER_TEMPLATES`.

import type { TemplateName } from './subjects';

/** `cohort`: one copy per cohort send. `never`: one person's own sign-in, password, invite, nudge or receipt. */
export type ObserverRule = 'cohort' | 'never';

export const OBSERVER_COPY: Record<TemplateName, ObserverRule> = {
  'sign-in': 'never',
  'set-password': 'never',
  'reset-password': 'never',
  'team-invite': 'never',
  'staff-invite': 'never',
  'learner-invite': 'never',
  'learner-nudge': 'never',
  'skill-purchase': 'never',
  announcement: 'cohort',
  'session-24h': 'cohort',
  'session-1h': 'cohort',
  'replay-ready': 'cohort',
  'build-reminder': 'cohort',
  'weekly-digest': 'cohort',
  'cohort-welcome': 'cohort',
  'week0-open': 'cohort',
};

/** Whether an observer may be sent a copy of this template at all. */
export const observerMayReceive = (template: TemplateName): boolean => OBSERVER_COPY[template] === 'cohort';
