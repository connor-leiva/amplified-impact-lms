import { useEffect, useId, useMemo, useState } from 'react';
import clsx from 'clsx';
import type { SearchResults } from '@ai/core';
import { cleanSearch } from '@ai/core';
import { Icon } from '../../components/Icon';
import { Empty } from '../../components/r2/Empty';
import { k } from '../../components/r2/kit';
import { modalStyles as m, useDialog } from '../../components/r2/Modal';
import { consoleApi } from '../../data/console';
import { PALETTE_COPY, paletteGroups } from './palette.vm';
import type { PaletteItem, PaletteModule, PalettePage } from './palette.vm';
import shell from './AdminShell.module.css';
import s from './Palette.module.css';

// The ⌘K palette (D-160 R2-1c, spec § 7.5): the mockup's `Palette`. A modal named "Command palette"
// whose search box is a combobox over one listbox: ↑ and ↓ move, Enter opens, Escape closes. The API's
// groups are asked once the words are two characters long, a beat after typing stops. As the mockup
// does, it is built from the R2 dialog's own pieces (`scrim top0`, `modal`, `mf`) and shares its focus
// and keys (`useDialog`: focus in, Tab kept inside, Escape, focus back); its key hints are the top
// bar's `.kbd`.

export function Palette({
  pages,
  modules,
  phone,
  go,
  onClose,
}: {
  pages: readonly PalettePage[];
  modules: readonly PaletteModule[];
  phone: boolean;
  go: (to: string) => void;
  onClose: () => void;
}) {
  const [q, setQ] = useState('');
  const [cur, setCur] = useState(0);
  const [api, setApi] = useState<SearchResults | null>(null);
  const { ref, onKeyDown } = useDialog(onClose);
  const id = useId();

  useEffect(() => {
    const words = cleanSearch(q);
    if (!words) {
      setApi(null);
      return;
    }
    let alive = true;
    const t = setTimeout(() => {
      void consoleApi()
        .then((c) => c.search(words))
        .then(
          (r) => alive && setApi(r),
          () => alive && setApi(null),
        );
    }, 150);
    return () => {
      alive = false;
      clearTimeout(t);
    };
  }, [q]);

  const groups = useMemo(() => paletteGroups(q, pages, modules, api), [q, pages, modules, api]);
  const flat = groups.flatMap(([, items]) => items);
  const pick = (it: PaletteItem) => {
    onClose();
    go(it.to);
  };
  const optionId = (i: number) => `${id}-o${i}`;
  let n = -1;

  return (
    <div
      className={clsx(m.scrim, m.top)}
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        ref={ref}
        className={m.modal}
        style={{ maxWidth: 600 }}
        role="dialog"
        aria-modal="true"
        aria-label={PALETTE_COPY.label}
        onKeyDown={onKeyDown}
      >
        <div className={s.bar}>
          <Icon name="r2Search" size={16} strokeWidth={1.75} />
          <input
            className={s.input}
            role="combobox"
            aria-expanded="true"
            aria-controls={`${id}-list`}
            aria-activedescendant={flat[cur] ? optionId(cur) : undefined}
            aria-autocomplete="list"
            placeholder={PALETTE_COPY.placeholder}
            aria-label={PALETTE_COPY.search}
            value={q}
            onChange={(e) => {
              setQ(e.target.value);
              setCur(0);
            }}
            onKeyDown={(e) => {
              if (e.key === 'ArrowDown') {
                e.preventDefault();
                setCur(Math.min(flat.length - 1, cur + 1));
              }
              if (e.key === 'ArrowUp') {
                e.preventDefault();
                setCur(Math.max(0, cur - 1));
              }
              if (e.key === 'Enter' && flat[cur]) {
                // Not to reach the trigger, which takes focus back as the palette closes.
                e.preventDefault();
                pick(flat[cur]);
              }
            }}
          />
          {phone ? (
            <button type="button" className={k.ib} aria-label={PALETTE_COPY.close} onClick={onClose}>
              <Icon name="r2X" size={16} strokeWidth={1.75} />
            </button>
          ) : (
            <span className={clsx(shell.kbd, s.esc)} aria-hidden="true">
              esc
            </span>
          )}
        </div>
        <div className={s.list} id={`${id}-list`} role="listbox" aria-label={PALETTE_COPY.label}>
          {!groups.length ? (
            <Empty icon="r2Search" title={PALETTE_COPY.none(q)} body={PALETTE_COPY.noneBody} />
          ) : (
            groups.map(([g, items]) => (
              <div key={g} role="group" aria-label={g}>
                <div className={clsx(k.me, k.w5, s.group)} aria-hidden="true">
                  {g}
                </div>
                {items.map((it) => {
                  n++;
                  const i = n;
                  return (
                    <button
                      key={it.key}
                      id={optionId(i)}
                      type="button"
                      role="option"
                      aria-selected={i === cur}
                      tabIndex={-1}
                      className={clsx(s.item, i === cur && s.on)}
                      onMouseEnter={() => setCur(i)}
                      onClick={() => pick(it)}
                    >
                      <span className={clsx(k.mu, s.glyph)}>
                        <Icon name={it.icon} size={16} strokeWidth={1.75} />
                      </span>
                      <span className={clsx(k.el, it.mono && k.mo)}>{it.label}</span>
                      {it.detail ? <span className={clsx(k.me, k.el, s.detail)}>{it.detail}</span> : null}
                    </button>
                  );
                })}
              </div>
            ))
          )}
        </div>
        {!phone ? (
          <div className={clsx(m.mf, k.me)} style={{ justifyContent: 'flex-start', gap: 16 }} aria-hidden="true">
            <span className={clsx(k.row, k.nw, s.hint)}>
              <span className={shell.kbd}>↑</span>
              <span className={shell.kbd}>↓</span> {PALETTE_COPY.navigate}
            </span>
            <span className={clsx(k.row, k.nw, s.hint)}>
              <span className={shell.kbd}>↵</span> {PALETTE_COPY.open}
            </span>
            <span className={k.sp} />
            <span className={clsx(k.row, k.nw, s.hint)}>
              <span className={shell.kbd}>⌘K</span> {PALETTE_COPY.toggle}
            </span>
          </div>
        ) : null}
      </div>
    </div>
  );
}
