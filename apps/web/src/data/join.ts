import { useCallback } from 'react';
import { useToaster } from '../components/primitives/Toaster';
import { repo } from './boot';
import type { JoinTicket } from './repository';

/**
 * Phase 08 § 8.4, the browser half of the Zoom join window.
 *
 * `JoinButton` is the only element anywhere that links to Zoom (SCREENS § 5.3), and it already
 * resolves the URL at click time rather than rendering it — which is what lets the server withhold
 * it entirely until the window opens. This is the resolver.
 *
 * The route (`GET /api/sessions/:id/join`) is deferred to the sprint that builds the Fastify app,
 * so what is built and tested here is the client: the request shape, what happens on a 200, and
 * what the viewer is told on a 409.
 */

/**
 * What the viewer is told when the window is not open.
 *
 * This is copy the app already renders: `EmployeeDetail.vm.ts` puts the same sentence under the
 * replay poster as `v.noneNote`, and § 8.4 uses it verbatim as the 409 body. The server's own
 * message is deliberately NOT echoed — the UI's strings stay the UI's, and a route that one day
 * rewords its error cannot reword the product.
 */
export const JOIN_SHUT = 'Join opens 15 min before';

export type JoinHandler = (sessionId: string, simulated: () => void) => Promise<void>;

/**
 * Ask the repository where this session is, then open it.
 *
 * `simulated` is the prototype's behaviour — the `Opening Zoom · …` toast — and it is what runs in
 * fixture mode. The screen passes it in rather than branching on the data source, so the two paths
 * stay indistinguishable from inside a screen.
 */
export function useJoin(): JoinHandler {
  const { toast } = useToaster();

  return useCallback(
    async (sessionId, simulated) => {
      let ticket: JoinTicket;
      try {
        ticket = await repo.joinTicket(sessionId);
      } catch {
        // A 401 has already sent the viewer to sign-in by this point (see `parse` in http.ts). What
        // is left is a 403 — a learner who may not reach this session's AI Employee — or a dead
        // network. Neither has anywhere to render an inline error, and the one outcome that is not
        // acceptable is a button that does nothing at all, so the viewer gets the same sentence a
        // shut window gives: they cannot join right now.
        toast(JOIN_SHUT, 'warn');
        return;
      }

      if (ticket.kind === 'simulated') {
        simulated();
        return;
      }
      if (ticket.kind === 'shut') {
        toast(JOIN_SHUT, 'warn');
        return;
      }

      // `noopener` is not decoration: without it the Zoom tab holds a live `window.opener` handle on
      // the portal and can navigate it anywhere.
      window.open(ticket.url, '_blank', 'noopener');
    },
    [toast],
  );
}
