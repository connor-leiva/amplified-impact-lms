// D-172: the audit rows for the existing Build writes whose R2 `Confirm` says "This action is
// audit-logged." (the mockup's line, on every confirm since R2-3b). They run through
// `POST /api/mutate/:name`, which wrote no `audit_log` row; the API now writes one, in the mutation's
// own transaction, as D-171 does for staff writes (`staff-guard.ts`). The mutations are core's,
// reference-ported and unchanged; this only reads what one changed, from the db before and after.
//
//   Curriculum   Publish… (`publishModule`)     module.publish     the mockup's own name
//                Unpublish… (`unpublishModule`) module.unpublish   the mockup's own name
//                Delete… (`deleteModule`)       module.delete
//   Vault        Remove from vault… (`deleteResource`)  vault.remove  the mockup's own name
//
// A write that changed nothing (publishing a published AI Employee) has no row.

import type { AdminAudit } from './admin-actions';
import type { Db } from './types';

/** The confirmed Build writes, by their mutation names. */
export const BUILD_CONFIRM_WRITES = ['publishModule', 'unpublishModule', 'deleteModule', 'deleteResource'] as const;
export type BuildConfirmWrite = (typeof BUILD_CONFIRM_WRITES)[number];
export const isBuildConfirmWrite = (name: string): name is BuildConfirmWrite => (BUILD_CONFIRM_WRITES as readonly string[]).includes(name);

/** Each write's audit action (all four are in `AUDIT_ACTIONS`). */
export const BUILD_AUDIT_ACTION = {
  publishModule: 'module.publish',
  unpublishModule: 'module.unpublish',
  deleteModule: 'module.delete',
  deleteResource: 'vault.remove',
} as const satisfies Record<BuildConfirmWrite, string>;

/**
 * What one confirmed Build write changed, as its audit row: the AI Employee or resource by id and
 * name, and before and after (a status, or what was removed). Null when it changed nothing.
 */
export function buildWriteRecordOf(name: BuildConfirmWrite, args: unknown, before: Db, after: Db): AdminAudit | null {
  const id = args && typeof args === 'object' && typeof (args as { id?: unknown }).id === 'string' ? (args as { id: string }).id : '';
  if (name === 'deleteResource') {
    const r = before.resources.find((x) => x.id === id);
    if (!r || after.resources.some((x) => x.id === id)) return null;
    return {
      action: BUILD_AUDIT_ACTION.deleteResource,
      target: { type: 'resource', id: r.id, label: r.title },
      before: { title: r.title, type: r.type, tier: r.tier, status: r.status, module: r.module ?? null },
      after: null,
    };
  }
  const m = before.modules.find((x) => x.id === id);
  if (!m) return null;
  const target = { type: 'module', id: m.id, label: m.name };
  if (name === 'deleteModule') {
    if (after.modules.some((x) => x.id === id)) return null;
    return { action: BUILD_AUDIT_ACTION.deleteModule, target, before: { name: m.name, status: m.status, tier: m.tier, steps: m.checklist.length }, after: null };
  }
  const n = after.modules.find((x) => x.id === id);
  if (!n || (n.status === m.status && n.opens === m.opens)) return null;
  return { action: BUILD_AUDIT_ACTION[name], target, before: { status: m.status, opens: m.opens }, after: { status: n.status, opens: n.opens } };
}
