// @ai/core — every rule the prototype encodes, ported from design-reference/lms-data.js.
// The web app and the API both import this, so the portal, the admin console and the backend
// cannot disagree. Pure functions only: no window, document or localStorage lives here.

export * from './types';
export * from './constants';
export * from './icons';
export * from './time';
export * from './status';
export * from './sessions';
export * from './cards';
export * from './files';
export * from './tiers';
export * from './seed';
export * from './can';
export * from './scope';
export * from './vtt';
export { MutationError } from './mutations';
export type { Ctx, Actor, Effect, Outcome } from './mutations';
export type { MutationName, MutationArgs } from './catalog';
