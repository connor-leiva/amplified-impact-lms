import type { Cohort, Db, Learner, Team } from '@ai/core';
import type { JoinTicket, LmsRepository, MutationResult, PreviewAs, Viewer } from './repository';

export type { PreviewAs };

/**
 * The Admin Console's "Preview as learner" (D-138). The eye button on /admin/curriculum opens
 * `/employees/<id>?preview=agent` (or `=owner`, for a Team-only AI Employee) in a new tab, and this
 * wraps the repository so that tab shows the portal as that learner would see it.
 *
 * - ONLY FOR STAFF. The flag does nothing unless the signed-in actor is staff. A learner who adds
 *   `?preview=` to a URL gets their own portal, unchanged.
 * - NOTHING IS WRITTEN. The learner exists only in this tab's memory: no account, no enrollment,
 *   no team. Every mutation is refused here, before any request, with `PREVIEW_ONLY`, and the
 *   join button does not open Zoom.
 * - EVERY AI EMPLOYEE SHOWS. Drafts and scheduled ones are shown as if published, so staff can see
 *   one before learners do. The tier lock still applies: an Agent preview of a Team-only AI
 *   Employee gets the Locked Employee Preview, as an agent would.
 *
 * Read once at boot (`boot.ts`), like the rest of the data source. A reload without the flag is
 * the Admin Console again, and Exit Preview is a full page load for the same reason.
 *
 * Why `?preview=` and not `?as=`: `as` switches persona and is honoured only in fixture mode, so it
 * can never act on real data (CLAUDE.md). This flag is read in both modes and is read-only.
 */

export const PREVIEW_ONLY = 'Preview only';
export const PREVIEW_USER_ID = 'preview-learner';
export const PREVIEW_TEAM_ID = 'preview-team';
export const EXIT_PREVIEW_TO = '/admin/curriculum';

/** The banner's words, by who is being previewed. */
export const PREVIEW_LABEL: Readonly<Record<PreviewAs, string>> = { agent: 'Agent', owner: 'Team Owner' };

/** `?preview=agent|owner`, or null for anything else. */
export function readPreviewAs(search: string): PreviewAs | null {
  const v = new URLSearchParams(search).get('preview');
  return v === 'agent' || v === 'owner' ? v : null;
}

/** The cohort a preview learner belongs to: the live one, else the one enrolling, else the latest. */
export function previewCohort(db: Db): Cohort | null {
  const byStart = db.cohorts.slice().sort((a, b) => b.start - a.start);
  return (
    byStart.find((c) => c.status === 'live') ??
    byStart.find((c) => c.status === 'enrolling') ??
    byStart[0] ??
    null
  );
}

/** The read-only learner the tab shows the portal as. Never stored anywhere. */
export function previewLearner(db: Db, as: PreviewAs): Learner {
  const cohort = previewCohort(db);
  return {
    id: PREVIEW_USER_ID,
    name: `Preview ${PREVIEW_LABEL[as]}`,
    email: '',
    tier: as === 'owner' ? 'team' : 'agent',
    role: as === 'owner' ? 'Team Owner' : 'Agent',
    teamId: as === 'owner' ? PREVIEW_TEAM_ID : null,
    cohortId: cohort?.id ?? '',
    joined: cohort?.start ?? 0,
    last: null,
    status: 'active',
    progress: {},
  };
}

/**
 * The snapshot as the preview learner sees it: every AI Employee shown (drafts and scheduled ones
 * as published, open dates ignored), the learner added, and an Owner's team of one. The staff
 * snapshot is not changed; this is a copy.
 */
export function previewDb(db: Db, as: PreviewAs): Db {
  const learner = previewLearner(db, as);
  const teams: Team[] =
    as === 'owner'
      ? [
          ...db.teams,
          {
            id: PREVIEW_TEAM_ID,
            name: 'Preview Team',
            ownerId: PREVIEW_USER_ID,
            seats: db.tiers.find((t) => t.id === 'team')?.seats ?? 0,
          },
        ]
      : db.teams;
  return {
    ...db,
    modules: db.modules.map((m) => (m.status === 'published' ? m : { ...m, status: 'published', opens: null })),
    users: [...db.users, learner],
    teams,
  };
}

/**
 * The repository a preview tab uses. Until the signed-in viewer is known to be staff it answers as
 * the inner repository would, so a learner's `?preview=` is inert.
 */
export function withPreview(inner: LmsRepository, as: PreviewAs): LmsRepository {
  let staff: Promise<boolean> | null = null;
  const isStaff = (): Promise<boolean> => {
    staff ??= inner.viewer().then((v) => v.actor.kind === 'staff');
    return staff;
  };

  return {
    source: inner.source,
    async viewer(): Promise<Viewer> {
      const v = await inner.viewer();
      if (v.actor.kind !== 'staff') return v;
      return { actor: { kind: 'learner', userId: PREVIEW_USER_ID }, role: as, preview: as };
    },
    async snapshot(): Promise<Db> {
      const db = await inner.snapshot();
      return (await isStaff()) ? previewDb(db, as) : db;
    },
    async run(name, args): Promise<MutationResult> {
      if (await isStaff()) return { error: PREVIEW_ONLY };
      return inner.run(name, args);
    },
    async act(name, args): Promise<MutationResult> {
      if (await isStaff()) return { error: PREVIEW_ONLY };
      return inner.act(name, args);
    },
    subscribe: (onChange) => inner.subscribe(onChange),
    fileUrl: (ref) => inner.fileUrl(ref),
    // D-188: a preview tab writes nothing, so it puts nothing in the bucket either.
    async upload(file, onProgress) {
      if (await isStaff()) return { ok: false, error: PREVIEW_ONLY };
      return inner.upload(file, onProgress);
    },
    async joinTicket(sessionId: string): Promise<JoinTicket> {
      if (await isStaff()) return { kind: 'preview' };
      return inner.joinTicket(sessionId);
    },
    // D-185: the tab's learner is not a person, so nothing is read for it or stored for it; the device
    // keeps the tab's choice, under the preview learner's id.
    async prefs() {
      return (await isStaff()) ? {} : inner.prefs();
    },
    async savePrefs(patch) {
      if (await isStaff()) return;
      return inner.savePrefs(patch);
    },
  };
}
