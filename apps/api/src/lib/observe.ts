// Fire-and-forget writes that only OBSERVE (D-166): the email log after a send, a usage count after a
// sign-in, a guide view or a join. Each runs after the work it records, is never awaited by it, and
// can never fail it: a write that throws (synchronously or not) is caught here and logged once, and the
// request, the send and their answers are exactly what they would have been without it.
//
// `settleObserved()` waits for every write still in flight. Tests call it before they read the table;
// nothing in production needs to (a count lost to a redeploy mid-write is one count).

const pending = new Set<Promise<void>>();

/** Runs `work` in the background. Its failure is logged (outside tests) and swallowed. */
export function observe(what: string, work: () => Promise<unknown>): void {
  const done: Promise<void> = Promise.resolve()
    .then(work)
    .then(
      () => undefined,
      (err: unknown) => {
        if (process.env.NODE_ENV !== 'test') console.warn(`[${what}] not recorded: ${err instanceof Error ? err.message : String(err)}`);
      },
    )
    .finally(() => pending.delete(done));
  pending.add(done);
}

/** Resolves once every observed write started so far (and any they started) has finished. */
export async function settleObserved(): Promise<void> {
  while (pending.size) await Promise.all([...pending]);
}
