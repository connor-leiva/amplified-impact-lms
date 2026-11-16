import { useEffect, useRef } from 'react';
import type { ReactNode } from 'react';
import { Icon } from '../Icon';
import s from './Drawer.module.css';

// The R2 detail drawer (D-160 R2-3): a record's details in a panel from the right, built from the
// mockup's modal parts (its scrim, its 1px `--line2` edge and shadow, the `.mh` head with Close, the
// grey `.mf` footer). The mockup draws no detail drawer; the app's Learners & Teams and Audit Log keep
// theirs (spec § 7.8: "a detail drawer (Drawer, `data-drawer`)"), so this is their R2 look.
//
// A modal dialog: `role="dialog"`, `aria-modal`, named by its title, and `data-drawer="open"` (the
// landmark CLAUDE.md asks for). Escape and a click on the scrim close it; focus moves to Close when it
// opens and back to where it was when it closes.

export interface DrawerProps {
  title: string;
  /** A muted line under the title. */
  description?: string;
  /** Before the title: an avatar. */
  leading?: ReactNode;
  children: ReactNode;
  foot?: ReactNode;
  onClose: () => void;
  /** The panel's width; it never runs past the window. */
  width?: number;
}

export function Drawer({ title, description, leading, children, foot, onClose, width = 440 }: DrawerProps) {
  const close = useRef<HTMLButtonElement | null>(null);
  useEffect(() => {
    const was = document.activeElement as HTMLElement | null;
    close.current?.focus();
    return () => was?.focus?.();
  }, []);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);
  return (
    <div
      className={s.scrim}
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className={s.panel}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        data-drawer="open"
        style={{ width }}
      >
        <div className={s.head}>
          {leading}
          <div className={s.titles}>
            <h2 className={s.title}>{title}</h2>
            {description ? <span className={s.description}>{description}</span> : null}
          </div>
          <button ref={close} type="button" className={s.close} aria-label="Close" onClick={onClose}>
            <Icon name="r2X" size={16} strokeWidth={1.75} />
          </button>
        </div>
        <div className={s.body}>{children}</div>
        {foot ? <div className={s.foot}>{foot}</div> : null}
      </div>
    </div>
  );
}
