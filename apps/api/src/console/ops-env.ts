// Env presence and modes, PR 9 (D-168, spec § 7.13): `GET /api/console/env`'s `env` and `modes`, and
// the env switches the Feature flags card lists read-only (D10).
//
// BUILT ONLY FROM THE EXISTING READERS, and only as booleans and modes. Each entry is set or not by
// the rule its reader applies (a value that is blank after trimming is not set, as `readOfferConfig`,
// `readGhlConfig`, `readGoogleConfig` and `readS3Config` all read it), and the readers decide the
// modes: `keyMode` for Stripe, `resolveMode` for email, `readGhlConfig` and `ghlSyncPaused` for
// GoHighLevel. Nothing here returns, logs or throws a value, a prefix, a suffix, a length or a hash:
// a reader's own error (which can quote a value) is caught and never read, and `readSessionSecret` is
// never called (it warns with a short secret's length). `console-ops-sentinel.test.ts` sets every one
// of these variables to a sentinel and proves none of it leaves.
//
// No Replace and no Reveal (D9). Never Railway's list-variables: the process's own environment only.

import { keyMode, readOfferConfig } from '../billing/config';
import { readGoogleConfig } from '../auth/google';
import { resolveMode } from '../email/transport';
import { ghlSyncPaused, readGhlConfig } from '../integrations/ghl';
import { readS3Config } from '../storage';
import type { ConsoleFlagView, EnvPresence, EnvState, OpsModes } from '@ai/core';
import { readConsoleTokens } from './ops-deploys';

type Env = NodeJS.ProcessEnv;

/** Set, by every reader's rule: present and not blank once trimmed. */
export const isSet = (env: Env, name: string): boolean => (env[name] ?? '').trim() !== '';

const state = (on: boolean): EnvState => (on ? 'present' : 'not_configured');

/**
 * `readOfferConfig` reads the dates and links too, and refuses a malformed date with a message that
 * quotes it; it is given only the three variables asked about here, so it never reads anything else.
 */
const offer = (env: Env) => readOfferConfig({ STRIPE_SECRET_KEY: env.STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET: env.STRIPE_WEBHOOK_SECRET, OFFER_OPEN: env.OFFER_OPEN });

/** Whether the bucket is configured: `readS3Config` answers, or throws (its message is never read). */
export function storageConfigured(env: Env): boolean {
  try {
    readS3Config(env);
    return true;
  } catch {
    return false;
  }
}

/**
 * Each secret the app reads, by the name the page prints, its group, and whether it is set. The
 * variables behind each name are in D-168. In the mockup's order, then the Console's two tokens.
 */
export function envPresence(env: Env = process.env): EnvPresence[] {
  const o = offer(env);
  const tokens = readConsoleTokens(env);
  return [
    { name: 'Stripe secret key', group: 'Stripe', state: state(o.stripeSecretKey !== null) },
    { name: 'Stripe webhook signing secret', group: 'Stripe', state: state(o.stripeWebhookSecret !== null) },
    // `email/transport.ts` reads `RESEND_API_KEY` when it sends.
    { name: 'Resend API key', group: 'Resend', state: state(isSet(env, 'RESEND_API_KEY')) },
    // `readGhlConfig` needs both; each is shown, so a half-set pair says which half is missing.
    { name: 'GoHighLevel access token', group: 'GoHighLevel', state: state(isSet(env, 'GHL_TOKEN')) },
    { name: 'GoHighLevel location ID', group: 'GoHighLevel', state: state(isSet(env, 'GHL_LOCATION_ID')) },
    { name: 'Google OAuth client secret', group: 'Google', state: state(isSet(env, 'GOOGLE_CLIENT_SECRET')) },
    // `readSessionSecret`'s variable; the reader itself is not called.
    { name: 'Session signing secret', group: 'Session', state: state(isSet(env, 'SESSION_SECRET')) },
    // `readS3Config`'s pair.
    { name: 'Storage access key', group: 'Storage', state: state(isSet(env, 'S3_ACCESS_KEY_ID') && isSet(env, 'S3_SECRET_ACCESS_KEY')) },
    // Spec § 7.11's optional, read-only deploy tokens.
    { name: 'Console GitHub token', group: 'Deploys', state: state(tokens.github) },
    { name: 'Console Railway token', group: 'Deploys', state: state(tokens.railway) },
  ];
}

/** The modes, each from its reader. */
export function opsModes(env: Env = process.env): OpsModes {
  const mode = resolveMode(env);
  return {
    environment: mode,
    stripe: keyMode(offer(env).stripeSecretKey),
    email: mode,
    ghl: readGhlConfig(env) === null ? 'off' : ghlSyncPaused(env) ? 'paused' : 'on',
  };
}

/**
 * The env switches the Feature flags card lists read-only (D10), from their existing readers: the
 * offer's carts (`readOfferConfig().open`) and the GoHighLevel loop's pause switch (`ghlSyncPaused`).
 * Each is a boolean; neither can be changed here.
 */
export function envSwitches(env: Env = process.env): ConsoleFlagView[] {
  const sw = (key: string, label: string, on: boolean): ConsoleFlagView => ({ key, label, on, source: 'env', sensitive: false, updatedAt: null, updatedBy: null });
  return [sw('OFFER_OPEN', 'Open the carts on the offer pages', offer(env).open), sw('GHL_SYNC_ENABLED', 'Run the GoHighLevel sync loop', !ghlSyncPaused(env))];
}

/** Whether Google sign-in is configured, by its reader. */
export const googleConfigured = (env: Env): boolean => readGoogleConfig(env) !== null;
