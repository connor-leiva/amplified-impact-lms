// D-247 (H-9): whether this server actually sends email, so a toast can say so instead of claiming a send.
//
// `transport.ts` has three modes. Test writes to the outbox (a send, as far as a test is concerned).
// Development only logs, so nothing reaches an inbox. Production sends through Resend, and needs
// `RESEND_API_KEY` and `EMAIL_FROM`: without either every send fails, so it is treated as not set up.
// Nothing here reads or prints a value; only whether one is there.

import { resolveMode } from './transport';

let forced: boolean | null = null;

/** True when a send can reach an inbox (or the test outbox). */
export function emailReady(env: NodeJS.ProcessEnv = process.env): boolean {
  if (forced !== null) return forced;
  const mode = resolveMode(env);
  if (mode === 'test') return true;
  if (mode === 'development') return false;
  return !!env.RESEND_API_KEY?.trim() && !!env.EMAIL_FROM?.trim();
}

/** Tests only: pretend email is (or isn't) set up; null goes back to the environment's answer. */
export function forceEmailReady(value: boolean | null): void {
  forced = value;
}
