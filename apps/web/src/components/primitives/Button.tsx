import clsx from 'clsx';
import type { IconName } from '@ai/core';
import { Icon } from '../Icon';
import s from './Button.module.css';

// Phase 03 § 3.2. SCREENS § 1.3.
//
// The reference uses heights 30, 32, 34, 36, 38, 40 and 42 at different call sites. `size` covers
// sm 32 / md 36 / lg 40; anything else is a `style={{ height }}` at the call site. NEVER normalise
// a height — the pixel diff will fail.
//
// Disabled is `aria-disabled` plus a suppressed `onClick`, never the `disabled` attribute, so the
// button keeps its name in the accessibility tree and can still explain why it is off.

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'link' | 'destructive';
export type ButtonSize = 'sm' | 'md' | 'lg';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  icon?: IconName;
  iconRight?: IconName;
  /** Renders a forced state statically. Used only by the /__states contract sheet. */
  force?: 'hover' | 'focus' | 'disabled' | 'loading' | '';
}

export function Button({
  variant = 'secondary',
  size = 'md',
  icon,
  iconRight,
  disabled,
  children,
  className,
  force = '',
  ...rest
}: ButtonProps) {
  const off = disabled || force === 'disabled';
  return (
    <button
      type="button"
      {...rest}
      aria-disabled={off || undefined}
      data-force={force === 'hover' || force === 'focus' ? force : undefined}
      onClick={off ? undefined : rest.onClick}
      className={clsx(s.btn, s[variant], s[size], off && s.disabled, className)}
    >
      {icon && <Icon name={icon} size={size === 'sm' ? 13 : 15} />}
      <span>{children}</span>
      {iconRight && <Icon name={iconRight} size={14} />}
    </button>
  );
}
