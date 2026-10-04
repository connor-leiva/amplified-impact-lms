import clsx from 'clsx';
import type { IconName } from '@ai/core';
import { Icon } from '../Icon';
import s from './Chip.module.css';

// The reference's one chip is the asset chip under a build step in Portal Workspace.dc.html:
//
//   height 24 · padding 0 8 · radius 6 · 1px solid --line-default · --bg-sunken · --text-primary
//   12/500 · gap 5 · white-space nowrap · hover border-color --line-strong · icon 12 at stroke 2
//
// `radius={999}` is the pill form (padding 0 9, as the Admin Vault pill uses). A chip with an
// `onClick` renders a <button>; a static one renders a <span>, so a non-interactive chip is not
// announced as a control.

export interface ChipProps {
  children: React.ReactNode;
  icon?: IconName;
  iconSize?: number;
  iconStrokeWidth?: number;
  /** Corner radius in px. 6 is the reference's chip; 999 is the pill form. */
  radius?: 6 | 7 | 999;
  onClick?: (e: React.MouseEvent<HTMLButtonElement>) => void;
  disabled?: boolean;
  title?: string;
  className?: string;
  style?: React.CSSProperties;
  /** Renders a forced state statically. Used only by the /__states contract sheet. */
  force?: 'hover' | 'focus' | 'disabled' | 'loading' | '';
}

export function Chip({
  children,
  icon,
  iconSize = 12,
  iconStrokeWidth = 2,
  radius = 6,
  onClick,
  disabled,
  title,
  className,
  style,
  force = '',
}: ChipProps) {
  const off = disabled || force === 'disabled';
  const cls = clsx(s.chip, off && s.disabled, className);
  const forced = force === 'hover' || force === 'focus' ? force : undefined;
  const body = (
    <>
      {icon && <Icon name={icon} size={iconSize} strokeWidth={iconStrokeWidth} />}
      <span>{children}</span>
    </>
  );

  if (!onClick) {
    return (
      <span title={title} style={style} data-r={radius} data-force={forced} className={cls}>
        {body}
      </span>
    );
  }
  return (
    <button
      type="button"
      title={title}
      style={style}
      data-r={radius}
      data-force={forced}
      className={cls}
      aria-disabled={off || undefined}
      onClick={off ? undefined : onClick}
    >
      {body}
    </button>
  );
}
