// The Admin Console's guard (D-157, spec § 5): `requireConsole(cap)`, a preHandler that runs after
// `requireSession` (and after `requireJsonSameOrigin` on a write):
//
//   app.get(PATH, { preHandler: [requireSession, requireConsole('audit.read')] }, handler)
//
// - Not signed in: `requireSession` has already answered 401, unchanged, and this does nothing.
// - Signed in and holding the capability (`consoleCan`, @ai/core): the handler runs.
// - Otherwise 403 `{ error, code: 'console_forbidden' }`. A STAFF member refused here is written to the
//   audit log (outcome `denied`); a learner is not, because a learner reaching a Console URL is not a
//   staff action and would only fill the log with noise someone could generate at will.
//
// The capability is read from the role on the user row `requireSession` just loaded, so a role change
// takes effect on the next request. Since D-160 R2-3b it is the EFFECTIVE capability: `CONSOLE_CAPS`
// (the ceiling) AND NOT a row the Owner took from that role on Roles & Permissions (`consoleCanWith`,
// the stored changes read through `roles.ts`'s cache). The Owner and anything the ceiling refuses are
// decided without reading them.

import type { FastifyReply, FastifyRequest, preHandlerAsyncHookHandler } from 'fastify';
import { CONSOLE_ERRORS, consoleCan, consoleCanWith } from '@ai/core';
import type { ConsoleCap, ConsoleErrorCode } from '@ai/core';
import type { SessionViewer } from '../auth';
import { audit } from './audit';
import type { AuditActor } from './audit';
import { roleGrants } from './roles';

/** A Console refusal: `{ error, code }` with the code's status (spec § 5). */
export function consoleError(reply: FastifyReply, code: ConsoleErrorCode, error?: string): FastifyReply {
  const def = CONSOLE_ERRORS[code];
  return reply.code(def.status).send({ error: error ?? def.message ?? 'Console refused that request.', code });
}

/** The staff member behind a session, as an audit actor; null for a learner. */
export function staffActor(viewer: SessionViewer): Extract<AuditActor, { source: 'staff' }> | null {
  return viewer.user.kind === 'staff' ? { source: 'staff', userId: viewer.user.id, role: viewer.user.staffRole ?? null } : null;
}

/** The route a request matched, for the audit row's target: `GET /api/console/audit`. */
const routeOf = (req: FastifyRequest): string => `${req.method} ${req.routeOptions.url ?? (req.url.split('?')[0] ?? req.url)}`;

/**
 * The rule itself, for a signed-in viewer: true when they hold `cap`, the EFFECTIVE capability (D-160
 * R2-3b: the ceiling, less any row the Owner took from that role); otherwise the 403 is sent (and a
 * staff refusal audited) and the answer is false. `requireConsole` runs it, and a handler whose
 * capability depends on the request (a note's target, D-158) calls it directly and returns when it is
 * false.
 */
export async function consoleAllows(req: FastifyRequest, reply: FastifyReply, viewer: SessionViewer, cap: ConsoleCap): Promise<boolean> {
  const staff = staffActor(viewer);
  if (staff && consoleCan(staff.role, cap) && (staff.role === 'Owner' || consoleCanWith(await roleGrants(), staff.role, cap))) return true;
  if (staff) {
    await audit(req, {
      action: 'console.access_denied',
      outcome: 'denied',
      actor: staff,
      target: { type: 'route', id: routeOf(req) },
      after: { capability: cap },
    });
  }
  consoleError(reply, 'console_forbidden');
  return false;
}

export function requireConsole(cap: ConsoleCap): preHandlerAsyncHookHandler {
  return async (req, reply) => {
    // `requireSession` answered already (401). Its reply may still be on its way out, so `sent` alone
    // is not enough: no viewer means there is nothing here to decide.
    if (reply.sent || req.viewer === null) return;
    if (await consoleAllows(req, reply, req.viewer, cap)) return;
    return reply;
  };
}
