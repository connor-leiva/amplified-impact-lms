import clsx from 'clsx';
import s from './Switch.module.css';

// Ported from the toggles in design-reference/Admin Vault.dc.html (30×18) and
// design-reference/Admin Announcements.dc.html (34×20). SCREENS § 1.9.
//
// The reference draws the track inside a larger row button. Here the switch IS the button, so the
// row composes it; `children` renders the visible label beside the track (`Published` / `Hidden` in
// Admin Vault) and becomes the accessible name. Use `label` when there is no visible text.

export interface SwitchProps {
  checked: boolean;
  onChange?: (next: boolean) => void;
  /** Accessible name. Omit when `children` supplies visible text. */
  label?: string;
  /** 'sm' is the 30×18 Admin Vault track; 'md' is the 34×20 Announcements track. */
  size?: 'sm' | 'md';
  disabled?: boolean;
  title?: string;
  className?: string;
  children?: React.ReactNode;
  /** Renders a forced state statically. Used only by the /__states contract sheet. */
  force?: 'hover' | 'focus' | 'disabled' | 'loading' | '';
}

export function Switch({
  checked,
  onChange,
  label,
  size = 'sm',
  disabled = false,
  title,
  className,
  children,
  force = '',
}: SwitchProps) {
  const off = disabled || force === 'disabled';

  if (force === 'loading') {
    return <span aria-hidden="true" className={s.skeleton} data-size={size} />;
  }

  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-disabled={off || undefined}
      aria-label={children ? undefined : label}
      title={title}
      className={clsx(s.root, className)}
      data-size={size}
      data-force={force || undefined}
      onClick={off ? undefined : () => onChange?.(!checked)}
    >
      <span aria-hidden="true" className={s.track} data-on={checked ? 'true' : undefined}>
        <span className={s.knob} />
      </span>
      {children}
    </button>
  );
}
