import { useRef } from 'react';
import clsx from 'clsx';
import { Icon } from '../Icon';
import s from './Tabs.module.css';

// Ported from the underline tabs in design-reference/Portal Vault.dc.html (SCREENS § 3.5):
// height 42, padding 0 14, 14/500, the active tab `inset 0 -2px 0 var(--action-primary)` over a
// `border-bottom: 1px solid var(--line-default)` rail, with an optional count badge and a lock.
//
// A locked tab is still selectable — the Vault's executive tab opens its upgrade panel.

export interface TabItem {
  id: string;
  label: string;
  /** Count badge after the label: height 18, min-width 18, radius 999. */
  count?: number;
  /** Leading 13px lock in `--access-locked-text`. */
  locked?: boolean;
}

export interface TabsProps {
  tabs: TabItem[];
  value: string;
  onChange: (id: string) => void;
  /** Accessible name for the tablist. */
  label: string;
  className?: string;
  /** Renders a forced state statically on the selected tab. Used only by /__states. */
  force?: 'hover' | 'focus' | 'disabled' | 'loading' | '';
}

export function Tabs({ tabs, value, onChange, label, className, force = '' }: TabsProps) {
  const refs = useRef<Record<string, HTMLButtonElement | null>>({});

  const onKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (!tabs.length) return;
    const i = tabs.findIndex((t) => t.id === value);
    let next = -1;
    if (e.key === 'ArrowRight') next = (i + 1 + tabs.length) % tabs.length;
    else if (e.key === 'ArrowLeft') next = (i - 1 + tabs.length) % tabs.length;
    else if (e.key === 'Home') next = 0;
    else if (e.key === 'End') next = tabs.length - 1;
    if (next < 0) return;
    const tab = tabs[next];
    if (!tab) return;
    e.preventDefault();
    onChange(tab.id);
    refs.current[tab.id]?.focus();
  };

  return (
    <div role="tablist" aria-label={label} className={clsx(s.list, className)} onKeyDown={onKeyDown}>
      {tabs.map((t) => {
        const selected = t.id === value;
        return (
          <button
            key={t.id}
            type="button"
            role="tab"
            aria-selected={selected}
            tabIndex={selected ? 0 : -1}
            ref={(el) => {
              refs.current[t.id] = el;
            }}
            className={s.tab}
            data-force={selected && force ? force : undefined}
            onClick={() => onChange(t.id)}
          >
            {t.locked ? <Icon name="lock" size={13} strokeWidth={2} className={s.lock} /> : null}
            {t.label}
            {t.count === undefined ? null : <span className={s.count}>{t.count}</span>}
          </button>
        );
      })}
    </div>
  );
}
