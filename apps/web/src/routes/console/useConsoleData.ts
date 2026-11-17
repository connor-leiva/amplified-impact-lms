import { useCallback, useEffect, useRef, useState } from 'react';
import type { ConsolePage } from '@ai/core';
import { ConsoleError } from '../../data/console';
import type { ConsoleApi, ConsoleFailure } from '../../data/console';

// The Support screens' reads (D-160 R2-1c): a list in pages with "Load more", and one record. Each
// answers loading, ready or the failure's kind, with a retry. A newer read always wins over an older
// one still in flight.

const failureOf = (e: unknown): ConsoleFailure => (e instanceof ConsoleError ? e.kind : 'failed');

export interface Pages<T> {
  rows: T[];
  status: 'loading' | 'ready' | 'error';
  failure: ConsoleFailure | null;
  next: string | null;
  loadingMore: boolean;
  more: () => void;
  retry: () => void;
}

/** A list's pages, read again whenever `key` (the filters) changes. */
export function useConsolePages<T>(
  api: ConsoleApi | null,
  read: (api: ConsoleApi, cursor: string | null) => Promise<ConsolePage<T>>,
  key: string,
): Pages<T> {
  const [state, setState] = useState<Omit<Pages<T>, 'more' | 'retry'>>({
    rows: [],
    status: 'loading',
    failure: null,
    next: null,
    loadingMore: false,
  });
  const [attempt, setAttempt] = useState(0);
  const reader = useRef(read);
  reader.current = read;
  const seq = useRef(0);

  useEffect(() => {
    if (!api) return;
    const mine = ++seq.current;
    setState((s) => ({ ...s, status: 'loading', failure: null }));
    reader.current(api, null).then(
      (p) =>
        mine === seq.current &&
        setState({ rows: p.rows, status: 'ready', failure: null, next: p.nextCursor, loadingMore: false }),
      (e: unknown) =>
        mine === seq.current &&
        setState({ rows: [], status: 'error', failure: failureOf(e), next: null, loadingMore: false }),
    );
  }, [api, key, attempt]);

  const more = useCallback(() => {
    if (!api || !state.next || state.loadingMore) return;
    const mine = seq.current;
    setState((s) => ({ ...s, loadingMore: true }));
    reader.current(api, state.next).then(
      (p) =>
        mine === seq.current &&
        setState((s) => ({ ...s, rows: [...s.rows, ...p.rows], next: p.nextCursor, loadingMore: false })),
      () => mine === seq.current && setState((s) => ({ ...s, loadingMore: false })),
    );
  }, [api, state.next, state.loadingMore]);

  const retry = useCallback(() => setAttempt((n) => n + 1), []);
  return { ...state, more, retry };
}

export interface Record_<T> {
  data: T | null;
  status: 'loading' | 'ready' | 'error';
  failure: ConsoleFailure | null;
  retry: () => void;
}

/** One record, read again when `key` changes. */
export function useConsoleRecord<T>(
  api: ConsoleApi | null,
  read: (api: ConsoleApi) => Promise<T>,
  key: string,
): Record_<T> {
  const [state, setState] = useState<Omit<Record_<T>, 'retry'>>({ data: null, status: 'loading', failure: null });
  const [attempt, setAttempt] = useState(0);
  const reader = useRef(read);
  reader.current = read;
  useEffect(() => {
    if (!api) return;
    let alive = true;
    setState({ data: null, status: 'loading', failure: null });
    reader.current(api).then(
      (data) => alive && setState({ data, status: 'ready', failure: null }),
      (e: unknown) => alive && setState({ data: null, status: 'error', failure: failureOf(e) }),
    );
    return () => {
      alive = false;
    };
  }, [api, key, attempt]);
  const retry = useCallback(() => setAttempt((n) => n + 1), []);
  return { ...state, retry };
}

/** `value`, once it has stopped changing for `ms`. */
export function useSettled<T>(value: T, ms = 250): T {
  const [v, setV] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setV(value), ms);
    return () => clearTimeout(t);
  }, [value, ms]);
  return v;
}
