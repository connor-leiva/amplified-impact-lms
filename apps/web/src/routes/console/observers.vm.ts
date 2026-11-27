// D-264: the Environment Flags page's "Cohort observer emails" card, as words. Pure: the card renders this, and the
// words are core's (`EMAIL_OBSERVERS_COPY`), so the API's audit label and the card cannot drift.
//
// Production only. The fixture answers no observer view (`emailObservers` resolves null), so the page the mockup
// draws, and its goldens, are unchanged; the card is the one net-new piece D-264 approves.

import { EMAIL_OBSERVERS_COPY as C, adminStamp, parseObserverAddresses } from '@ai/core';
import type { EmailObserversView } from '@ai/core';

export { C as OBSERVERS_COPY };

export interface ObserversVM {
  /** The field's starting value: one address per line. */
  text: string;
  /** Where the list in force came from, in a sentence. */
  source: string;
  /** Whether this viewer may save (`flags.write`); otherwise the field is read-only. */
  canEdit: boolean;
}

export function observersVM(v: EmailObserversView, caps: readonly string[]): ObserversVM {
  const saved = v.updatedAt !== null ? ` Saved${v.updatedBy ? ` by ${v.updatedBy}` : ''}, ${adminStamp(v.updatedAt)}.` : '';
  const source = v.source === 'env' ? C.fromEnv : v.source === 'none' ? `${C.none}${saved}` : saved.trim();
  return { text: v.addresses.join('\n'), source, canEdit: caps.includes('flags.write') };
}

/** What a save sends: the typed list, checked here first so a typo is said at once (the API checks it again). */
export function observersToSave(text: string): { ok: true; addresses: string[] } | { ok: false; error: string } {
  return parseObserverAddresses(text);
}
