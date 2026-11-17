import { useCallback, useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { useLocation } from 'react-router';
import type { ConsoleMe } from '@ai/core';
import { ReasonDialog } from '../../components/masquerade/ReasonDialog';
import type { MenuItem } from '../../components/r2/Menu';
import { consoleApi } from '../../data/console';
import { masquerade } from '../../data/masquerade';
import type { MasqueradeTarget } from '../../data/masquerade';
import { entryState } from './masquerade.vm';
import type { EntryState } from './masquerade.vm';

// The entry points (D-162 3b, spec § 6): User's "Masquerade", the Users row's "Masquerade…", a
// workspace's "Masquerade as owner" and its row's "Masquerade as owner…", a member row's and Learners
// & Teams' "Masquerade…". Each opens the reason dialog for its person; Start goes to the API, then to
// the learner portal, and Exit comes back to this page (`startedFrom`). Owner and Admin only (hidden
// for Support), disabled with the reason while D8's flag is off, and never offered for staff.

export interface MasqueradeEntry {
  /** Whether to draw it for a target of this kind, and why it is disabled (null: it isn't). */
  state: (kind?: 'learner' | 'staff') => EntryState;
  open: (target: MasqueradeTarget) => void;
  /** A row menu's item for `target`, or nothing. */
  item: (label: string, target: MasqueradeTarget, kind?: 'learner' | 'staff') => MenuItem[];
  /** The dialog, while open: render it anywhere on the page. */
  dialog: ReactNode;
}

/** `me` from the screen's Console gate, or (null) read here. */
export function useMasqueradeEntry(me?: ConsoleMe | null): MasqueradeEntry {
  const { pathname } = useLocation();
  const [own, setOwn] = useState<ConsoleMe | null>(null);
  const [target, setTarget] = useState<MasqueradeTarget | null>(null);
  const known = me === undefined ? own : me;

  useEffect(() => {
    if (me !== undefined) return;
    let alive = true;
    void consoleApi()
      .then((api) => api.me())
      .then(
        (m) => alive && setOwn(m),
        () => alive && setOwn(null),
      );
    return () => {
      alive = false;
    };
  }, [me]);

  const state = useCallback((kind: 'learner' | 'staff' = 'learner') => entryState(known, kind), [known]);
  const open = useCallback((t: MasqueradeTarget) => setTarget(t), []);
  const item = useCallback(
    (label: string, t: MasqueradeTarget, kind: 'learner' | 'staff' = 'learner'): MenuItem[] => {
      const st = entryState(known, kind);
      if (!st.show) return [];
      return [
        {
          label,
          icon: 'r2Masquerade',
          disabled: st.off !== null,
          title: st.off ?? undefined,
          onSelect: () => setTarget(t),
        },
      ];
    },
    [known],
  );

  const dialog = target ? (
    <ReasonDialog
      mode="start"
      target={{ name: target.name, workspace: target.workspace }}
      onCancel={() => setTarget(null)}
      onSubmit={(reason) => masquerade.start(target, reason, pathname)}
    />
  ) : null;

  return { state, open, item, dialog };
}
