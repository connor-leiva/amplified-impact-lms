import { useCallback, useEffect, useId, useMemo, useState } from 'react';
import { useLocation } from 'react-router';
import { consoleCan } from '@ai/core';
import { Icon } from '../Icon';
import { Modal } from '../primitives/Modal';
import { consoleApi, masqueradeActive } from '../../data/console';
import type { ConsoleApi } from '../../data/console';
import { useDb } from '../../data/hooks';
import { consoleNav } from '../../shell/navModel';
import { errorCopy } from '../../routes/console/console.vm';
import { OPEN_PALETTE_EVENT, PALETTE_COPY, SEARCH_COPY, consolePages, flatItems, isPaletteShortcut, moveCursor, resultSections } from '../../routes/console/Search.vm';
import type { ResultItem } from '../../routes/console/Search.vm';
import { useConsoleSearch } from '../../routes/console/useConsoleSearch';
import s from './CommandPalette.module.css';

// The Console's command palette (D-158, spec § 7.5): ⌘K or Ctrl+K anywhere in the staff shell, or the
// Search page's button. A Modal named "Command palette" with one combobox: type to search, ↑ ↓ to move,
// Enter to open, Esc to close. Users, workspaces and orders come from the API; Admin Pages from the
// viewer's own sidebar, so a page their role can't open is never offered. It does not open while a
// masquerade session runs (PR 3's `masqueradeActive`), nor for a role without `console.view`.

export function CommandPalette({ role, onGo }: { role: string | null; onGo: (to: string) => void }) {
  const [open, setOpen] = useState(false);
  const allowed = consoleCan(role, 'console.view');

  useEffect(() => {
    if (!allowed) return;
    const show = () => {
      if (!masqueradeActive()) setOpen(true);
    };
    const onKey = (e: KeyboardEvent) => {
      if (!isPaletteShortcut(e)) return;
      e.preventDefault();
      if (masqueradeActive()) return;
      setOpen((o) => !o);
    };
    window.addEventListener('keydown', onKey);
    window.addEventListener(OPEN_PALETTE_EVENT, show);
    return () => {
      window.removeEventListener('keydown', onKey);
      window.removeEventListener(OPEN_PALETTE_EVENT, show);
    };
  }, [allowed]);

  if (!allowed || !open) return null;
  return (
    <Palette
      role={role}
      onClose={() => setOpen(false)}
      onGo={(to) => {
        setOpen(false);
        onGo(to);
      }}
    />
  );
}

function Palette({ role, onClose, onGo }: { role: string | null; onClose: () => void; onGo: (to: string) => void }) {
  const db = useDb();
  const { pathname } = useLocation();
  const [api, setApi] = useState<ConsoleApi | null>(null);
  const [q, setQ] = useState('');
  const [cursor, setCursor] = useState(0);
  const listId = useId();
  const optionId = (i: number) => `${listId}-o${i}`;

  useEffect(() => {
    let alive = true;
    void consoleApi().then((a) => alive && setApi(a));
    return () => {
      alive = false;
    };
  }, []);

  const search = useConsoleSearch(api, q);
  const pages = useMemo(() => consolePages(consoleNav(db, { pathname }, false, role)), [db, pathname, role]);
  const sections = useMemo(() => resultSections(search.kind === 'ready' ? search.results : null, pages, q, { navigable: true }), [pages, q, search]);
  const items = useMemo(() => flatItems(sections), [sections]);
  const active = Math.min(cursor, Math.max(0, items.length - 1));

  useEffect(() => setCursor(0), [q, search.kind]);
  // The highlighted row stays in view as the arrows move it.
  const activeId = items.length ? optionId(active) : null;
  useEffect(() => {
    if (activeId) document.getElementById(activeId)?.scrollIntoView?.({ block: 'nearest' });
  }, [activeId]);

  const pick = useCallback((item: ResultItem | undefined) => {
    if (item?.to) onGo(item.to);
  }, [onGo]);

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault();
      setCursor(moveCursor(active, e.key, items.length));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      pick(items[active]);
    }
  };

  let n = -1;
  return (
    <Modal open label={PALETTE_COPY.label} width={600} pad={20} onClose={onClose} className={s.dialog}>
      <div className={s.top}>
        <Icon name="search" size={20} strokeWidth={1.8} className={s.glass} />
        <input
          className={s.input}
          role="combobox"
          aria-label={PALETTE_COPY.input}
          aria-expanded="true"
          aria-controls={listId}
          aria-autocomplete="list"
          aria-activedescendant={activeId ?? undefined}
          placeholder={PALETTE_COPY.placeholder}
          maxLength={100}
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onKeyDown={onKeyDown}
        />
        <button type="button" className={s.close} aria-label={PALETTE_COPY.close} onClick={onClose}>
          <Icon name="x" size={20} strokeWidth={1.8} />
        </button>
      </div>
      <div>
        {search.kind === 'error' ? (
          <p className={s.note} role="alert">
            {errorCopy(search.failure).title}
          </p>
        ) : null}
        <div id={listId} role="listbox" aria-label={PALETTE_COPY.results} className={s.list}>
          {sections.map((sec) => (
            <div key={sec.group} role="group" aria-label={sec.label} className={s.group}>
              <div className={s.groupLabel} aria-hidden="true">
                {sec.label}
              </div>
              {sec.items.map((item) => {
                n += 1;
                const i = n;
                return (
                  <div
                    key={item.key}
                    id={optionId(i)}
                    role="option"
                    aria-selected={i === active}
                    className={s.option}
                    data-active={i === active || undefined}
                    onMouseDown={(e) => e.preventDefault()}
                    onMouseMove={() => setCursor(i)}
                    onClick={() => pick(item)}
                  >
                    <span className={item.mono ? `${s.label} ${s.mono}` : s.label}>{item.label}</span>
                    <span className={s.detail}>{item.detail}</span>
                  </div>
                );
              })}
            </div>
          ))}
        </div>
        {search.kind === 'ready' && items.length === 0 ? <p className={s.note}>{SEARCH_COPY.none(search.q)}</p> : null}
      </div>
    </Modal>
  );
}
