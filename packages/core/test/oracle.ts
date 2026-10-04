/* eslint-disable @typescript-eslint/no-explicit-any */
// The reference prototype is the test oracle. It is plain ES-module JavaScript, so `allowJs`
// resolves it but infers STRUCTURALLY LOOSER types than the domain types (`status: string` rather
// than the literal union, for instance). Feeding those inferred shapes back into the strictly typed
// port would not compile, and sprinkling casts through every suite would obscure what is actually
// being asserted.
//
// So the oracle is widened once, here. Every test imports `ref` from this module instead of
// importing the reference directly. The widening is deliberate: these tests assert runtime
// equality against the prototype, and type-checking the prototype is explicitly not their job
// (`checkJs: false` in tsconfig.json).
import * as refModule from '../../../design-reference/lms-data.js';

export type Oracle = Record<string, any>;

export const ref: Oracle = refModule as unknown as Oracle;

/** The three demo timeline phases, in the order the handoff fixtures use. */
export const PHASES = ['week0', 'live', 'post'] as const;

/** The 7 US zones the profile menu offers, excluding the `''` Auto entry. */
export const ZONE_IDS = [
  'America/Chicago',
  'America/New_York',
  'America/Denver',
  'America/Phoenix',
  'America/Los_Angeles',
  'America/Anchorage',
  'Pacific/Honolulu',
] as const;
