import { useEffect, useRef } from 'react';
import clsx from 'clsx';
import s from './Modal.module.css';

// Ported from the modals in design-reference/Portal Team Hub.dc.html (the invite dialog) and the
// locked-preview overlay in design-reference/Amplified Impact LMS.dc.html. SCREENS § 1.7.

const FOCUSABLE =
  'a[href],area[href],button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])';

/**
 * Esc to close, a focus trap while open, and focus returned to the trigger on close. Shared by
 * `<Modal>` and `<Drawer>`, which are the two dialog surfaces in SCREENS § 1.6 and § 1.7.
 * The element behind `ref` must carry `tabIndex={-1}` so an empty dialog can still hold focus.
 */
export function useDialogA11y(
  ref: React.RefObject<HTMLElement | null>,
  open: boolean,
  onClose: () => void,
) {
  const restore = useRef<HTMLElement | null>(null);
  // `onClose` is usually an inline arrow, so it is read through a ref: the trap must be installed
  // once per open, never re-run on an unrelated re-render, or it would steal focus back mid-typing.
  const close = useRef(onClose);
  useEffect(() => {
    close.current = onClose;
  }, [onClose]);

  useEffect(() => {
    if (!open) return;
    const root = ref.current;
    restore.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;

    const focusable = () =>
      Array.from(root?.querySelectorAll<HTMLElement>(FOCUSABLE) ?? []).filter(
        (el) => el.offsetParent !== null || el === document.activeElement,
      );

    (focusable()[0] ?? root)?.focus();

    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        close.current();
        return;
      }
      if (e.key !== 'Tab' || !root) return;
      const list = focusable();
      const first = list[0];
      const last = list[list.length - 1];
      if (!first || !last) {
        e.preventDefault();
        root.focus();
        return;
      }
      const active = document.activeElement;
      const outside = !root.contains(active);
      if (e.shiftKey && (active === first || outside)) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && (active === last || outside)) {
        e.preventDefault();
        first.focus();
      }
    };

    document.addEventListener('keydown', onKey, true);
    return () => {
      document.removeEventListener('keydown', onKey, true);
      restore.current?.focus();
    };
  }, [open, ref]);
}

export interface ModalProps {
  open: boolean;
  onClose: () => void;
  /** Accessible name for the dialog. */
  label: string;
  /** Dialog width; capped at the overlay by `min(width, 100%)`. */
  width?: number | string;
  /** Overlay padding: 20 (the locked-preview overlay) or 24 (the Team Hub invite). */
  pad?: 20 | 24;
  /** Dialog radius: 14 (the Team Hub invite) or 16 (the locked preview). */
  radius?: 14 | 16;
  /** 'raised' is `--bg-raised` on `--line-default`; 'surface' is `--bg-surface` on `--line-strong`. */
  variant?: 'raised' | 'surface';
  /** false renders the overlay only, for children that already render their own `role="dialog"`. */
  chrome?: boolean;
  className?: string;
  children?: React.ReactNode;
  /** Renders a forced state statically. Used only by the /__states contract sheet. */
  force?: 'hover' | 'focus' | 'disabled' | 'loading' | '';
}

export function Modal({
  open,
  onClose,
  label,
  width = 460,
  pad = 24,
  radius = 14,
  variant = 'raised',
  chrome = true,
  className,
  children,
  force = '',
}: ModalProps) {
  const panel = useRef<HTMLDivElement>(null);
  useDialogA11y(panel, open, onClose);

  if (!open) return null;

  const vars = { '--modal-w': typeof width === 'number' ? `${width}px` : width } as React.CSSProperties;

  return (
    <div
      className={s.overlay}
      data-pad={pad}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      {chrome ? (
        <div
          ref={panel}
          role="dialog"
          aria-modal="true"
          aria-label={label}
          tabIndex={-1}
          className={clsx(s.dialog, className)}
          data-radius={radius}
          data-variant={variant}
          data-force={force || undefined}
          style={vars}
        >
          {children}
        </div>
      ) : (
        <div ref={panel} tabIndex={-1} className={clsx(s.bare, className)} style={vars}>
          {children}
        </div>
      )}
    </div>
  );
}
