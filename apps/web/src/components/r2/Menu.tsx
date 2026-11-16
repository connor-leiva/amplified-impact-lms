import { useCallback, useEffect, useId, useRef, useState } from 'react';
import type { KeyboardEvent, ReactNode } from 'react';
import clsx from 'clsx';
import type { IconName } from '@ai/core';
import { Icon } from '../Icon';
import s from './Menu.module.css';

// The R2 menu (D-160): the mockup's `Menu`, a trigger and a `.pop` of `menuitem` buttons, with a check
// on the current choice and a lock on one the viewer can't use. It closes when focus leaves it, on
// Escape (focus goes back to the trigger) and after a choice. Arrow keys move between the items.

export interface MenuItem {
  label: string;
  icon?: IconName;
  /** The current choice: a check at the right. */
  checked?: boolean;
  danger?: boolean;
  /** Not for this viewer: disabled, with a lock. */
  locked?: boolean;
  onSelect: () => void;
}
export type MenuEntry = MenuItem | 'separator';

export type MenuPlacement = 'below-right' | 'below-left' | 'above' | 'right';

export interface MenuTrigger {
  open: boolean;
  toggle: () => void;
  /** Spread on the trigger button: `aria-expanded`, `aria-haspopup`, `aria-controls` and the arrow keys. */
  props: {
    'aria-expanded': boolean;
    'aria-haspopup': 'menu';
    'aria-controls'?: string;
    onKeyDown: (e: KeyboardEvent<HTMLElement>) => void;
  };
}

export interface MenuProps {
  items: readonly MenuEntry[];
  placement?: MenuPlacement;
  trigger: (t: MenuTrigger) => ReactNode;
  /** The menu's accessible name. */
  label: string;
  className?: string;
}

export function Menu({ items, placement = 'below-right', trigger, label, className }: MenuProps) {
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLSpanElement | null>(null);
  const pop = useRef<HTMLDivElement | null>(null);
  const focusFirst = useRef(false);
  const id = useId();

  const buttons = () => Array.from(pop.current?.querySelectorAll<HTMLButtonElement>('button:not(:disabled)') ?? []);
  const close = useCallback((refocus: boolean) => {
    setOpen(false);
    if (refocus) root.current?.querySelector<HTMLElement>('[aria-haspopup="menu"]')?.focus();
  }, []);

  useEffect(() => {
    if (open && focusFirst.current) {
      focusFirst.current = false;
      buttons()[0]?.focus();
    }
  }, [open]);

  const onKey = (e: KeyboardEvent<HTMLElement>) => {
    if (e.key === 'Escape' && open) {
      e.stopPropagation();
      close(true);
      return;
    }
    if (e.key !== 'ArrowDown' && e.key !== 'ArrowUp') return;
    e.preventDefault();
    if (!open) {
      focusFirst.current = true;
      setOpen(true);
      return;
    }
    const list = buttons();
    if (!list.length) return;
    const at = list.indexOf(document.activeElement as HTMLButtonElement);
    const next = e.key === 'ArrowDown' ? (at + 1) % list.length : (at - 1 + list.length) % list.length;
    list[next]?.focus();
  };

  const t: MenuTrigger = {
    open,
    toggle: () => setOpen((o) => !o),
    props: { 'aria-expanded': open, 'aria-haspopup': 'menu', 'aria-controls': open ? id : undefined, onKeyDown: onKey },
  };

  return (
    <span
      ref={root}
      className={clsx(s.menu, className)}
      onBlur={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setOpen(false);
      }}
    >
      {trigger(t)}
      {open ? (
        <div
          ref={pop}
          id={id}
          role="menu"
          aria-label={label}
          className={clsx(
            s.pop,
            placement === 'above' && s.up,
            placement === 'below-left' && s.left,
            placement === 'right' && s.right,
          )}
          onKeyDown={onKey}
        >
          {items.map((it, i) =>
            it === 'separator' ? (
              <hr key={`sep-${i}`} className={s.sep} />
            ) : (
              <button
                key={`${i}:${it.label}`}
                type="button"
                role="menuitem"
                disabled={it.locked}
                className={clsx(s.item, it.danger && s.danger)}
                onClick={() => {
                  close(false);
                  it.onSelect();
                }}
              >
                {it.locked ? (
                  <Icon name="r2Lock" size={16} strokeWidth={1.75} />
                ) : it.icon ? (
                  <Icon name={it.icon} size={16} strokeWidth={1.75} />
                ) : null}
                {it.label}
                {it.checked ? (
                  <span className={s.check}>
                    <Icon name="r2Check" size={16} strokeWidth={1.75} />
                  </span>
                ) : null}
              </button>
            ),
          )}
        </div>
      ) : null}
    </span>
  );
}
