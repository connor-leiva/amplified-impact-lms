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
  /** Not available here (the mockup's `off`, R2-3): disabled, without a lock; `title` says why. */
  disabled?: boolean;
  /**
   * Drawn but not available, with the reason in words under the label (D-164: the gated seat tier).
   * `aria-disabled` rather than `disabled`, so it stays focusable and its reason is read with it
   * (`aria-describedby`); choosing it does nothing.
   */
  unavailable?: string;
  title?: string;
  onSelect: () => void;
}
/**
 * D-185: a labelled set of choices, one of which is current (the learner account menu's Theme): a
 * `role="group"` named by its visible label, its items `menuitemradio` with `aria-checked`.
 */
export interface MenuGroup {
  group: string;
  items: readonly MenuItem[];
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
  items: readonly (MenuEntry | MenuGroup)[];
  placement?: MenuPlacement;
  trigger: (t: MenuTrigger) => ReactNode;
  /** The menu's accessible name. */
  label: string;
  className?: string;
  /**
   * D-226: a menu whose trigger is drawn elsewhere (the v3 shell's account button, which the package draws). The
   * caller holds `open`; `anchor` is that button, which takes focus back on Escape and doesn't count as leaving.
   */
  control?: { open: boolean; onOpenChange: (open: boolean) => void; anchor: () => HTMLElement | null };
}

export function Menu({ items, placement = 'below-right', trigger, label, className, control }: MenuProps) {
  const [own, setOwn] = useState(false);
  const open = control ? control.open : own;
  const ctl = useRef(control);
  ctl.current = control;
  const setOpen = useCallback((v: boolean | ((o: boolean) => boolean)) => {
    const c = ctl.current;
    if (!c) return setOwn(v);
    c.onOpenChange(typeof v === 'function' ? v(c.open) : v);
  }, []);
  const root = useRef<HTMLSpanElement | null>(null);
  const pop = useRef<HTMLDivElement | null>(null);
  const focusFirst = useRef(false);
  const id = useId();

  const buttons = () => Array.from(pop.current?.querySelectorAll<HTMLButtonElement>('button:not(:disabled)') ?? []);
  const close = useCallback((refocus: boolean) => {
    setOpen(false);
    if (refocus) (ctl.current?.anchor() ?? root.current?.querySelector<HTMLElement>('[aria-haspopup="menu"]'))?.focus();
  }, [setOpen]);

  // A controlled menu's trigger is outside it, so leaving the trigger isn't a blur here: a press anywhere else closes it.
  const controlled = !!control;
  useEffect(() => {
    if (!controlled || !open) return undefined;
    const down = (e: PointerEvent) => {
      const t = e.target as Node;
      if (!root.current?.contains(t) && !ctl.current?.anchor()?.contains(t)) setOpen(false);
    };
    document.addEventListener('pointerdown', down);
    return () => document.removeEventListener('pointerdown', down);
  }, [controlled, open, setOpen]);

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

  const item = (it: MenuItem, i: string, radio: boolean) => (
    <button
      key={`${i}:${it.label}`}
      type="button"
      role={radio ? 'menuitemradio' : 'menuitem'}
      aria-checked={radio ? !!it.checked : undefined}
      disabled={it.locked || it.disabled}
      aria-disabled={it.unavailable ? true : undefined}
      aria-label={it.unavailable ? it.label : undefined}
      aria-describedby={it.unavailable ? `${id}-why${i}` : undefined}
      title={it.title}
      className={clsx(s.item, it.danger && s.danger, it.unavailable && s.off)}
      onClick={() => {
        if (it.unavailable) return;
        close(false);
        it.onSelect();
      }}
    >
      {it.locked || it.unavailable ? (
        <Icon name="r2Lock" size={16} strokeWidth={1.75} />
      ) : it.icon ? (
        <Icon name={it.icon} size={16} strokeWidth={1.75} />
      ) : null}
      {it.unavailable ? (
        <span className={s.text}>
          <span>{it.label}</span>
          <span id={`${id}-why${i}`} className={s.why}>
            {it.unavailable}
          </span>
        </span>
      ) : (
        it.label
      )}
      {it.checked ? (
        <span className={s.check}>
          <Icon name="r2Check" size={16} strokeWidth={1.75} />
        </span>
      ) : null}
    </button>
  );

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
        const to = e.relatedTarget as Node | null;
        if (!e.currentTarget.contains(to) && !(to && ctl.current?.anchor()?.contains(to))) setOpen(false);
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
            ) : 'group' in it ? (
              <div key={`grp-${i}:${it.group}`} role="group" aria-labelledby={`${id}-g${i}`}>
                <div id={`${id}-g${i}`} className={s.gh}>
                  {it.group}
                </div>
                {it.items.map((x, j) => item(x, `${i}.${j}`, true))}
              </div>
            ) : (
              item(it, String(i), false)
            ),
          )}
        </div>
      ) : null}
    </span>
  );
}
