// The mutation catalog, as types.
//
// Declared once here so that the web app's repository seam and the API's request schemas cannot
// disagree about what a mutation is called or what it takes. Both derive these from the real
// `mutations.ts` module, so a renamed mutation or a changed argument type is a typecheck failure
// on both sides rather than a 400 in production.
//
// Type-only: `import type * as` is erased, so this file adds nothing at runtime and does not make
// `mutations.ts` a dependency of anything that only wants the names.
import type * as M from './mutations';

/** Every exported mutation name. `MutationError` is a class, not a mutation, so it is excluded. */
export type MutationName = {
  [K in keyof typeof M]: (typeof M)[K] extends (...args: never[]) => unknown ? K : never;
}[keyof typeof M];

/** The third parameter of a mutation: its arguments. */
export type MutationArgs<K extends MutationName> = Parameters<(typeof M)[K]>[2];
