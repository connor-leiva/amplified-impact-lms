// The router's half of stale-chunk recovery (D-170; the rule is `stale-chunk.ts`).
//
// A lazy route whose file a deploy removed rejects with "Failed to fetch dynamically imported module"
// (or Safari's and Firefox's wording, or Vite's "Unable to preload CSS"), and React Router hands that
// to the nearest error boundary. This boundary reloads the page once for exactly those errors and
// renders nothing while the reload happens.
//
// EVERYTHING ELSE KEEPS THE ERROR SCREEN IT HAD. The app has never had an error screen of its own:
// what a visitor saw was React Router's default ("Unexpected Application Error!"), which React Router
// draws only for the outermost route, and only when nothing below it has a boundary. So
// `withStaleChunkRecovery` puts two pathless routes around the app's routes (no path, no element,
// so every address matches and renders exactly as before):
//
//   outer: no boundary of its own, so React Router gives it its default error screen;
//   inner: this boundary, over every route.
//
// For any other error, or when the reload guard declines, this boundary rethrows; React passes an
// error thrown by a boundary's own fallback to the boundary above it, which is the outer route's
// default. No new screen, component or words.

import type { RouteObject } from 'react-router';
import { useRouteError } from 'react-router';
import { isStaleChunkError, reloadOnce, reloadPending } from './stale-chunk';

export function StaleChunkBoundary(): null {
  const error = useRouteError();
  // `reloadPending()` first: once Vite's `vite:preloadError` listener has started the reload, a lazy
  // route can still settle with a different error on the way out (its import resolving to nothing),
  // and the page is leaving anyway. Idempotent, so React rendering this twice reloads once.
  if (reloadPending() || (isStaleChunkError(error) && reloadOnce())) return null;
  throw error;
}

/** The app's routes, under the stale-chunk boundary and above React Router's default error screen. */
export function withStaleChunkRecovery(routes: RouteObject[]): RouteObject[] {
  return [{ children: [{ ErrorBoundary: StaleChunkBoundary, children: routes }] }];
}
