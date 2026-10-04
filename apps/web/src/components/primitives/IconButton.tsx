import clsx from 'clsx';
import type { IconName } from '@ai/core';
import { Icon } from '../Icon';
import s from './IconButton.module.css';

// SCREENS § 1.3 (the Icon row) and § 1.6 (drawer close). Values from the reference's icon buttons:
//
//   ghost      30 / radius 7  transparent · --text-tertiary       hover --bg-hover + --text-primary
//              32 / radius 8  (drawer and modal close buttons)
//   secondary  30 / radius 7  --action-secondary · --line-strong  hover --action-secondary-hover
//
// The glyph is 16px at stroke-width 2 in every reference call site; 14 and 15 appear too, so both
// are props.
//
// `aria-label` is required: an icon-only control with no accessible name is a compile error here.

export interface IconButtonProps extends Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, 'aria-label' | 'children'> {
  'aria-label': string;
  icon: IconName;
  variant?: 'secondary' | 'ghost';
  /** Square side in px. The reference uses 30 and 32. */
  size?: 30 | 32;
  /** Corner radius in px. Defaults to 7 at size 30 and 8 at size 32. */
  radius?: 7 | 8;
  iconSize?: number;
  strokeWidth?: number;
  /** Renders a forced state statically. Used only by the /__states contract sheet. */
  force?: 'hover' | 'focus' | 'disabled' | 'loading' | '';
}

export function IconButton({
  icon,
  variant = 'ghost',
  size = 30,
  radius,
  iconSize = 16,
  strokeWidth = 2,
  disabled,
  className,
  force = '',
  ...rest
}: IconButtonProps) {
  const off = disabled || force === 'disabled';
  return (
    <button
      type="button"
      {...rest}
      aria-disabled={off || undefined}
      data-size={size}
      data-radius={radius ?? (size === 32 ? 8 : 7)}
      data-force={force === 'hover' || force === 'focus' ? force : undefined}
      onClick={off ? undefined : rest.onClick}
      className={clsx(s.btn, s[variant], off && s.disabled, className)}
    >
      <Icon name={icon} size={iconSize} strokeWidth={strokeWidth} />
    </button>
  );
}
