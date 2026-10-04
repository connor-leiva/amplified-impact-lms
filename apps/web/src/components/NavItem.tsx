import clsx from 'clsx';
import { Icon, type IconName } from './Icon';
import { StatusToken, type StatusTokenProps } from './StatusToken';
import s from './NavItem.module.css';

// Ported from design-reference/Nav Item.dc.html. Contract: SCREENS § 2.1 (NavItem) and § 5.2.
//
// The row renders a view-model only. Which trailing slot a sidebar row carries — a compact build
// token, an `Opens Dec 14` clock token or the Team-tier lock — is decided by the caller, never here.

/** The subset of StatusToken props a sidebar row may hand its compact trailing token. */
export type NavItemToken = Pick<StatusTokenProps, 'kind' | 'state' | 'n' | 'total' | 'label' | 'tone' | 'icon'>;

export interface NavItemProps {
  label?: string;
  icon?: IconName | '';
  active?: boolean;
  locked?: boolean;
  disabled?: boolean;
  depth?: 0 | 1;
  collapsed?: boolean;
  token?: NavItemToken | null;
  badge?: string;
  badgeTitle?: string;
  chev?: 'open' | 'closed' | '';
  title?: string;
  busy?: boolean;
  onClick?: (e: React.MouseEvent<HTMLButtonElement>) => void;
  /** Renders a forced state statically. Used only by the /__states contract sheet. */
  force?: 'hover' | 'focus' | 'disabled' | 'loading' | '';
}

export function NavItem({
  label = '',
  icon = '',
  active = false,
  locked = false,
  disabled: disabledProp = false,
  depth = 0,
  collapsed = false,
  token = null,
  badge = '',
  badgeTitle = '',
  chev = '',
  title,
  busy = false,
  onClick,
  force = '',
}: NavItemProps) {
  const disabled = disabledProp || force === 'disabled';
  const muted = locked || disabled;
  const showLabel = !collapsed;

  // `loading` replaces the row outright; it is not a modifier on it.
  if (force === 'loading') {
    return (
      <div
        aria-hidden="true"
        className={s.skel}
        data-depth={depth}
        data-collapsed={collapsed ? 'true' : undefined}
      >
        <span className={s.skelIcon} />
        {showLabel ? <span className={s.skelBar} /> : null}
      </div>
    );
  }

  const tip = title || label;

  return (
    <button
      type="button"
      className={s.root}
      data-depth={depth}
      data-collapsed={collapsed ? 'true' : undefined}
      data-active={active ? 'true' : undefined}
      data-muted={muted ? 'true' : undefined}
      data-disabled={disabled ? 'true' : undefined}
      data-force={force === 'hover' || force === 'focus' ? force : undefined}
      title={tip || undefined}
      aria-current={active ? 'page' : undefined}
      aria-disabled={disabled ? 'true' : undefined}
      onClick={(e) => {
        if (disabled) return;
        onClick?.(e);
      }}
    >
      {icon ? <Icon name={icon} size={16} strokeWidth={1.8} className={s.icon} /> : null}
      {showLabel ? <span className={s.label}>{label}</span> : null}
      {showLabel && token && !locked && !busy ? <StatusToken {...token} compact /> : null}
      {showLabel && locked ? (
        <span title="Team tier" className={s.lock}>
          <svg viewBox="0 0 16 16" aria-label="Team tier" className={s.lockGlyph}>
            <path d="M4.5 7.5h7a1 1 0 0 1 1 1v4a1 1 0 0 1-1 1h-7a1 1 0 0 1-1-1v-4a1 1 0 0 1 1-1zM5.75 7.5V5.6a2.25 2.25 0 0 1 4.5 0v1.9" />
          </svg>
        </span>
      ) : null}
      {showLabel && badge ? (
        <span title={badgeTitle || undefined} className={s.badge}>
          {badge}
        </span>
      ) : null}
      {showLabel && chev ? (
        <Icon
          name="chevD"
          size={14}
          strokeWidth={2}
          className={clsx(s.chev, chev === 'closed' && s.chevClosed)}
        />
      ) : null}
      {showLabel && busy ? <Icon name="spinner" size={14} strokeWidth={2} className={s.spin} /> : null}
    </button>
  );
}
