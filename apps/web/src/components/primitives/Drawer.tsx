import { useRef } from 'react';
import clsx from 'clsx';
import { Icon } from '../Icon';
import { useDialogA11y } from './Modal';
import s from './Drawer.module.css';

// Ported from the right-side panels in design-reference/Admin Cohorts.dc.html,
// Admin Learners.dc.html, Admin Vault.dc.html, Portal Team Hub.dc.html and
// Portal Workspace.dc.html. SCREENS § 1.6.
//
// The panel stays mounted so the 240ms slide runs in both directions, exactly as the reference
// does; while closed it is `inert` and `aria-hidden`, so nothing inside it is reachable.
//
// It MUST carry `data-drawer="open"` while open: the compliance harness selects drawers by that
// attribute (CLAUDE.md › Required landmarks).
//
// Two variants, because the reference draws two:
//   raised  — `--bg-raised`, header padding `16px 18px`, 32px close button. Portal Workspace (560).
//   surface — `--bg-surface`, header padding 18, 30px close button. Admin Cohorts, Admin Learners,
//             Admin Vault and Portal Team Hub (440 / 460).

export interface DrawerProps {
  open: boolean;
  onClose: () => void;
  /** Title, 16/600. Also the panel's accessible name. */
  title: string;
  /** Description under the title, 13px `--text-tertiary`. */
  description?: string;
  /** Panel width, capped by `min(width, 100vw)`. */
  width?: 440 | 460 | 560;
  variant?: 'raised' | 'surface';
  /** Rendered before the title block — the 40px avatar in the Learners and Team Hub drawers. */
  leading?: React.ReactNode;
  /** Footer actions, right-aligned with gap 8 above a border-top. */
  footer?: React.ReactNode;
  className?: string;
  children?: React.ReactNode;
  /** Renders a forced state statically. Used only by the /__states contract sheet. */
  force?: 'hover' | 'focus' | 'disabled' | 'loading' | '';
}

export function Drawer({
  open,
  onClose,
  title,
  description,
  width = 440,
  variant = 'raised',
  leading,
  footer,
  className,
  children,
  force = '',
}: DrawerProps) {
  const panel = useRef<HTMLElement>(null);
  useDialogA11y(panel, open, onClose);

  return (
    <>
      <div
        className={s.scrim}
        data-open={open ? 'true' : undefined}
        aria-hidden="true"
        onClick={onClose}
      />
      <aside
        ref={panel}
        aria-label={title}
        aria-hidden={open ? undefined : true}
        inert={open ? undefined : true}
        tabIndex={-1}
        data-drawer={open ? 'open' : 'closed'}
        data-variant={variant}
        data-force={force || undefined}
        className={clsx(s.panel, className)}
        style={{ '--drawer-w': `${width}px` } as React.CSSProperties}
      >
        <div className={s.header}>
          {leading}
          <div className={s.titles}>
            <div className={s.title}>{title}</div>
            {description ? <div className={s.description}>{description}</div> : null}
          </div>
          <button type="button" className={s.close} aria-label="Close" onClick={onClose}>
            <Icon name="x" size={16} strokeWidth={2} />
          </button>
        </div>
        <div className={s.body}>{children}</div>
        {footer ? <div className={s.footer}>{footer}</div> : null}
      </aside>
    </>
  );
}
