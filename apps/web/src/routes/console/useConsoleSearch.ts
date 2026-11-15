import { useEffect, useState } from 'react';
import type { SearchResults } from '@ai/core';
import { ConsoleError } from '../../data/console';
import type { ConsoleApi, ConsoleFailure } from '../../data/console';
import { searchable } from './Search.vm';

// Console search as you type (D-158, spec § 7.5): it waits for a pause (250ms), sends only a query of
// 2 to 100 characters, and keeps only the newest answer, so a slow early one never replaces a later one.

export type SearchState =
  | { kind: 'idle' }
  | { kind: 'loading' }
  | { kind: 'error'; failure: ConsoleFailure }
  | { kind: 'ready'; q: string; results: SearchResults };

export function useConsoleSearch(api: ConsoleApi | null, q: string, attempt = 0): SearchState {
  const [state, setState] = useState<SearchState>({ kind: 'idle' });
  const words = searchable(q);
  useEffect(() => {
    if (!api || words === null) {
      setState({ kind: 'idle' });
      return;
    }
    let alive = true;
    setState({ kind: 'loading' });
    const t = setTimeout(() => {
      api.search(words).then(
        (results) => alive && setState({ kind: 'ready', q: words, results }),
        (e: unknown) => alive && setState({ kind: 'error', failure: e instanceof ConsoleError ? e.kind : 'failed' }),
      );
    }, 250);
    return () => {
      alive = false;
      clearTimeout(t);
    };
  }, [api, words, attempt]);
  return state;
}
