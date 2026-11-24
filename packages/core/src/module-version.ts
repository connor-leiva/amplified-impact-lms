// D-246 (H-6): the version of an AI Employee or a course week, as the Module Builder's base version.
//
// The builder sends the version of the module it started from with every save; the save refuses
// (`MutationError('conflict')`, a 409 over HTTP) when the stored module is no longer that version, so
// a second tab, a second editor or a repeated request can't silently overwrite a newer save. No column
// stores it: it is a hash of the module itself, computed the same way in the browser (from the
// snapshot) and on the server (from `loadDb`).
//
// The hash reads a canonical form: object keys sorted, and a key whose value is null or absent read
// the same way, because `codec.ts` turns a null column into an absent key and jsonb reorders keys. So
// a module and its round trip through Postgres have the same version.

import type { AIEmployee } from './types';

/** A value as canonical JSON: sorted keys, null and undefined object members dropped. */
export function canonicalJson(value: unknown): string {
  if (value === null || value === undefined) return 'null';
  if (Array.isArray(value)) return `[${value.map((v) => canonicalJson(v)).join(',')}]`;
  if (typeof value === 'object') {
    const obj = value as Record<string, unknown>;
    const keys = Object.keys(obj)
      .filter((k) => obj[k] !== null && obj[k] !== undefined)
      .sort();
    return `{${keys.map((k) => `${JSON.stringify(k)}:${canonicalJson(obj[k])}`).join(',')}}`;
  }
  return JSON.stringify(value) ?? 'null';
}

/** Two 32-bit FNV-1a style hashes over the UTF-16 code units, as 16 hex characters. */
function hash64(text: string): string {
  let a = 0x811c9dc5;
  let b = 0x9747b28c;
  for (let i = 0; i < text.length; i++) {
    const c = text.charCodeAt(i);
    a = Math.imul(a ^ c, 0x01000193);
    b = Math.imul(b ^ c, 0x5bd1e995);
    b ^= b >>> 15;
  }
  const hex = (n: number) => (n >>> 0).toString(16).padStart(8, '0');
  return hex(a) + hex(b);
}

/** The module's version: the same for the same stored module, different after any change to it. */
export const moduleVersion = (m: AIEmployee): string => hash64(canonicalJson(m));
