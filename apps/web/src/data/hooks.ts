import { useCallback, useEffect, useState } from 'react';
import { useQueryClient, useSuspenseQuery } from '@tanstack/react-query';
import type { Db } from '@ai/core';
import { clock } from '../lib/clock';
import { repo } from './boot';
import type { MutationArgs, MutationName, MutationResult, Viewer } from './repository';
import { useToaster } from '../components/primitives/Toaster';
import { useConfetti } from '../shell/Confetti';

const DB_KEY = ['db'] as const;
const VIEWER_KEY = ['viewer'] as const;

/** The role-scoped snapshot. Refetched whenever the repository says something changed. */
export function useDb(): Db {
  const qc = useQueryClient();
  useEffect(() => repo.subscribe(() => void qc.invalidateQueries({ queryKey: DB_KEY })), [qc]);
  return useSuspenseQuery({ queryKey: DB_KEY, queryFn: () => repo.snapshot(), staleTime: Infinity }).data;
}

export function useViewer(): Viewer {
  return useSuspenseQuery({ queryKey: VIEWER_KEY, queryFn: () => repo.viewer(), staleTime: Infinity }).data;
}

/**
 * Run a named mutation. The repository applies the new Db; this turns the rest of the Outcome into
 * the UI's response — a toast, confetti, or an inline error the caller renders in its form.
 */
export function useMutate() {
  const qc = useQueryClient();
  const { toast } = useToaster();
  const { celebrate } = useConfetti();

  return useCallback(
    async <K extends MutationName>(name: K, args: MutationArgs<K>): Promise<MutationResult> => {
      const r = await repo.run(name, args);
      if (r.error) return r; // forms render this inline; nothing changed
      if (r.toast) toast(r.toast.msg, r.toast.tone);
      if (r.effects?.some((e) => e.type === 'confetti')) celebrate();
      await qc.invalidateQueries({ queryKey: DB_KEY });
      return r;
    },
    [qc, toast, celebrate],
  );
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
