import clsx from 'clsx';
import type { IconName } from '@ai/core';
import { Icon } from '../Icon';
import s from './Segmented.module.css';

// SCREENS § 1.4. Values from the reference's `seg(on, go, label)` helper and the tracks it feeds
// (Amplified Impact LMS demo controls, States header, Admin Announcements/Learners/Vault filters).
//
//   track   --seg-track · 1px solid --line-default · radius 9 · padding 3 · gap 2
//   option  height 26–30 · padding 0 8–12 · radius 6–7 · 13/500
//   active  --seg-active · var(--shadow-xs) · --text-primary
//   idle    transparent · --text-secondary
//
// Generic over the option value, so a call site keeps its own union (`'agent' | 'owner' | 'admin'`)
// end to end instead of degrading to `string`.

export interface SegmentedOption<T> {
  value: T;
  label: string;
  icon?: IconName;
  title?: string;
  disabled?: boolean;
}

export interface SegmentedProps<T> {
  options: readonly SegmentedOption<T>[];
  value: T;
  onChange: (value: T) => void;
  /** Names the group for screen readers. SCREENS § 1.4 renders the track as `role="group"`. */
  label?: string;
  /** Option height in px. */
  height?: 26 | 28 | 30;
  /** Option horizontal padding in px. */
  pad?: 8 | 10 | 12;
  /** Option corner radius in px. */
  radius?: 6 | 7;
  /** Options share the track's width (`flex: 1`), as in the compact demo popover. */
  fill?: boolean;
  /** Icon size in px. The reference's themed track uses 13 at stroke-width 1.9. */
  iconSize?: number;
  iconStrokeWidth?: number;
  className?: string;
  /** Renders a forced state statically. Used only by the /__states contract sheet. */
  force?: 'hover' | 'focus' | 'disabled' | 'loading' | '';
}

export function Segmented<T>({
  options,
  value,
  onChange,
  label,
  height = 28,
  pad = 10,
  radius = 6,
  fill = false,
  iconSize = 13,
  iconStrokeWidth = 1.9,
  className,
  force = '',
}: SegmentedProps<T>) {
  return (
    <div role="group" aria-label={label} className={clsx(s.track, className)}>
      {options.map((o, i) => {
        const on = o.value === value;
        const off = o.disabled || force === 'disabled';
        return (
          <button
            key={i}
            type="button"
            aria-pressed={on}
            aria-disabled={off || undefined}
            title={o.title}
            data-h={height}
            data-pad={pad}
            data-r={radius}
            data-on={on ? 'true' : undefined}
            data-fill={fill ? 'true' : undefined}
            data-force={force === 'hover' || force === 'focus' ? force : undefined}
            className={clsx(s.opt, off && s.disabled)}
            onClick={off ? undefined : () => onChange(o.value)}
          >
            {o.icon && <Icon name={o.icon} size={iconSize} strokeWidth={iconStrokeWidth} />}
            {o.label}
          </button>
        );
      })}
    </div>
  );
}
