import { phaseNow, type Phase } from '@ai/core';
import { clock } from '../lib/clock';
import { loadPrefs, savePrefs } from '../lib/prefs';
import { createFixtureRepository, type FixtureRole } from './fixture';
import { createHttpRepository } from './http';
import { readPreviewAs, withPreview } from './preview';
import type { LmsRepository, PreviewAs } from './repository';

/**
 * Choose the data source once, at boot.
 *
 * PRODUCTION SAFETY: `as`, `phase` and `now` are honoured ONLY in fixture mode, and `demoMode` is
 * always false in http mode. That is what keeps persona switching and the timeline controls
 * impossible against real data, no matter what someone puts in the URL (CLAUDE.md).
 */

const ROLES: FixtureRole[] = ['agent', 'owner', 'admin'];
const PHASES: Phase[] = ['week0', 'live', 'post'];

const source = (import.meta.env.VITE_DATA_SOURCE as string | undefined) ?? 'http';
export const isFixture = source === 'fixture';

const qs = new URLSearchParams(typeof location === 'undefined' ? '' : location.search);

function readRole(): FixtureRole {
  const fromUrl = qs.get('as');
  if (fromUrl && (ROLES as string[]).includes(fromUrl)) return fromUrl as FixtureRole;
  let stored: string | null = null;
  try {
    stored = sessionStorage.getItem('ai-lms-role');
  } catch {
    /* session storage unavailable */
  }
  return stored && (ROLES as string[]).includes(stored) ? (stored as FixtureRole) : 'agent';
}

function readPhase(): Phase {
  const fromUrl = qs.get('phase');
  if (fromUrl && (PHASES as string[]).includes(fromUrl)) return fromUrl as Phase;
  const stored = loadPrefs().phase;
  return stored && (PHASES as string[]).includes(stored) ? stored : 'live';
}

export let repo: LmsRepository;
export let fixtureRole: FixtureRole = 'agent';
export let fixturePhase: Phase = 'live';

if (isFixture) {
  fixtureRole = readRole();
  fixturePhase = readPhase();
  try {
    sessionStorage.setItem('ai-lms-role', fixtureRole);
  } catch {
    /* session storage unavailable */
  }
  savePrefs({ phase: fixturePhase });
  // `?now=<ISO>` exists only so an e2e test can pin the clock to a specific moment, such as the
  // edge of the join window.
  const pinned = qs.get('now');
  clock.useDemo(pinned ? Date.parse(pinned) : phaseNow(fixturePhase));
  // The R2 parity snapshot (D-160 R2-2): the mockup's Build data, for `parity:admin-r2` only. Loaded
  // behind the build-time constant, so the http build has no trace of it (`console-build.test.ts`).
  const parity =
    import.meta.env.VITE_DATA_SOURCE === 'fixture' && qs.get('parity') === 'r2'
      ? import('./parity-r2-db').then((m) => m.parityDb(location.pathname))
      : null;
  repo = createFixtureRepository(fixtureRole, fixturePhase, parity);
} else {
  clock.useReal();
  repo = createHttpRepository();
}

/**
 * The Admin Console's "Preview as learner" tab (D-138). Read-only, and inert unless the signed-in
 * viewer is staff, so it is safe in both modes; see `preview.ts`.
 */
export const previewAs: PreviewAs | null = readPreviewAs(qs.toString());
if (previewAs) repo = withPreview(repo, previewAs);

/** Demo controls (View As, Timeline, Reset Demo) exist only here. Never in http mode. */
export const demoMode = isFixture && (import.meta.env.VITE_DEMO_MODE === 'true' || qs.get('demo') === '1');
