import { useCallback, useEffect, useState } from 'react';
import { useQueryClient, useSuspenseQuery } from '@tanstack/react-query';
import type { Db } from '@ai/core';
import { clock } from '../lib/clock';
import { repo } from './boot';
import { HttpError, RateLimitedError } from './http';
import { PREVIEW_ONLY } from './preview';
import type { AdminActionArgs, AdminActionName, LearnerEmailKind, MutationArgs, MutationName, MutationResult, Viewer } from './repository';
import { SIGN_OUT_FAILED } from './session';
import { useToaster } from '../components/primitives/Toaster';
import { useConfetti } from '../shell/Confetti';

export const DB_KEY = ['db'] as const;

/** D-247 (H-7): a failed request with no words of the server's: the sign-in screens' own words for one. */
export const REQUEST_FAILED = SIGN_OUT_FAILED;
export const VIEWER_KEY = ['viewer'] as const;

/** The role-scoped snapshot. Refetched whenever the repository says something changed. */
export function useDb(): Db {
  const qc = useQueryClient();
  // D-224: every screen that reads the snapshot subscribes; `cancelRefetch: false` makes them all join one refetch
  // instead of each cancelling the last and starting its own (three snapshot requests per change, measured).
  useEffect(() => repo.subscribe(() => void qc.invalidateQueries({ queryKey: DB_KEY }, { cancelRefetch: false })), [qc]);
  return useSuspenseQuery({ queryKey: DB_KEY, queryFn: () => repo.snapshot(), staleTime: Infinity }).data;
}

export function useViewer(): Viewer {
  return useSuspenseQuery({ queryKey: VIEWER_KEY, queryFn: () => repo.viewer(), staleTime: Infinity }).data;
}

/**
 * D-247 (H-7): what a failed request says in its error toast: the API's own words when it sent some (a
 * 403's missing permission, a 409's stale draft, a 429's limit), else the app's plain "Something went
 * wrong. Try again." Null for a failure the page handles by leaving (a 401 on its way to sign in).
 */
export function failureMessage(e: unknown): string | null {
  if (e instanceof HttpError) return e.quiet ? null : (e.serverMessage ?? REQUEST_FAILED);
  if (e instanceof RateLimitedError) return e.message || REQUEST_FAILED;
  return REQUEST_FAILED;
}

/**
 * D-247 (H-7): an `error` a caller should still say itself, or undefined when the hook's error toast
 * already said it (`failed`). For the screens that toast a refusal: `const e = refusal(r); if (e) toast(e, 'warn')`.
 */
export const refusal = (r: MutationResult): string | undefined => (r.failed ? undefined : r.error);

/**
 * The one way a hook hands a request's answer to the UI: a preview tab's refusal said once, a request
 * that failed (it threw: a 403, 409, 429, 500 or no network) said as an error toast with the server's
 * words and answered as `{ error, failed: true }`, so the caller stops where it would stop for an inline
 * error and nothing is lost; otherwise the toast, and a refetch.
 */
function useAnswer() {
  const qc = useQueryClient();
  const { toast } = useToaster();
  return useCallback(
    async (send: () => Promise<MutationResult>, rethrow: boolean, after?: (r: MutationResult) => void): Promise<MutationResult> => {
      let r: MutationResult;
      try {
        r = await send();
      } catch (e) {
        if (rethrow) throw e;
        const msg = failureMessage(e);
        if (msg) toast(msg, 'warn');
        return { error: msg ?? REQUEST_FAILED, failed: true };
      }
      // A preview tab changes nothing (D-138). Say so here, once, for every screen; a form that
      // renders errors inline shows it there too.
      if (r.error === PREVIEW_ONLY) toast(PREVIEW_ONLY, 'info');
      if (r.error) return r; // forms render this inline; nothing changed
      if (r.toast) toast(r.toast.msg, r.toast.tone);
      after?.(r);
      await qc.invalidateQueries({ queryKey: DB_KEY }, { cancelRefetch: false });
      return r;
    },
    [qc, toast],
  );
}

export interface MutateOptions {
  /**
   * D-247: a failed request throws to the caller instead of the error toast. For the learner screens
   * that already show their own failure in place (a check that didn't save), so nothing is said twice.
   */
  rethrow?: boolean;
}

/**
 * Run a named mutation. The repository applies the new Db; this turns the rest of the Outcome into
 * the UI's response — a toast, confetti, or an inline error the caller renders in its form. D-247
 * (H-7): a request that fails is an error toast with the server's words, and `{ error, failed }`.
 */
export function useMutate(options: MutateOptions = {}) {
  const answer = useAnswer();
  const { celebrate } = useConfetti();
  const rethrow = options.rethrow === true;

  return useCallback(
    <K extends MutationName>(name: K, args: MutationArgs<K>): Promise<MutationResult> =>
      answer(
        () => repo.run(name, args),
        rethrow,
        (r) => {
          if (r.effects?.some((e) => e.type === 'confetti')) celebrate();
        },
      ),
    [answer, celebrate, rethrow],
  );
}

/**
 * D-172: run an audited Build action (`repo.act`), with `useMutate`'s handling of its answer: the
 * toast, an inline error the caller renders, and a refetch. D-247 (H-7): a failed request is an error
 * toast with the server's words, and `{ error, failed }`.
 */
export function useAct() {
  const answer = useAnswer();
  return useCallback(
    <K extends AdminActionName>(name: K, args: AdminActionArgs<K>): Promise<MutationResult> => answer(() => repo.act(name, args), false),
    [answer],
  );
}

/** D-247 (H-9): Resend Invite or Send Nudge, with `useAct`'s handling: the server's toast says what happened. */
export function useEmailLearner() {
  const answer = useAnswer();
  return useCallback((kind: LearnerEmailKind, userId: string): Promise<MutationResult> => answer(() => repo.emailLearner(kind, userId), false), [answer]);
}

/**
 * The current instant, re-read on an interval so countdowns and relative times stay live.
 * Under the compliance suite's frozen clock this returns the same value every tick.
 */
export function useNow(intervalMs = 1000): number {
  const [now, setNow] = useState(() => clock.now());
  useEffect(() => {
    const id = setInterval(() => setNow(clock.now()), intervalMs);
    return () => clearInterval(id);
  }, [intervalMs]);
  return now;
}
