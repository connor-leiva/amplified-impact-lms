import { useEffect, useRef } from 'react';
import clsx from 'clsx';
import s from './Popover.module.css';

// Ported from the floating panels in design-reference: the calendar menu in Session Card.dc.html
// (width 220, padding 5, radius 10, anchored under the trigger), and the profile menu
// (width min(300px, 100vw − 24px), padding 6, radius 12) and demo-controls panel
// (width min(330px, 100vw − 24px), padding 14, radius 12) in Amplified Impact LMS.dc.html.
//
// Width, padding and radius differ per call site, so they are per-instance custom properties.
// An anchored popover needs a `position: relative` ancestor, exactly as the reference does.

/** Esc and an outside pointer-down close the panel. */
function useDismiss(ref: React.RefObject<HTMLElement | null>, open: boolean, onClose: () => void) {
  // `onClose` is read through a ref so an inline arrow does not re-bind the listeners every render.
  const close = useRef(onClose);
  useEffect(() => {
    close.current = onClose;
  }, [onClose]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        close.current();
      }
    };
    const onDown = (e: MouseEvent) => {
      const el = ref.current;
      if (el && !el.contains(e.target as Node)) close.current();
    };
    document.addEventListener('keydown', onKey, true);
    document.addEventListener('mousedown', onDown);
    return () => {
      document.removeEventListener('keydown', onKey, true);
      document.removeEventListener('mousedown', onDown);
    };
  }, [open, ref]);
}

export interface PopoverOffsets {
  top?: number;
  right?: number;
  bottom?: number;
  left?: number;
}

export interface PopoverProps {
  open: boolean;
  onClose: () => void;
  /** 'menu' for the calendar and profile menus, 'dialog' for the demo-controls panel. */
  role?: 'menu' | 'dialog';
  /** Accessible name, required when `role` is set. */
  label?: string;
  /** 'anchored' sits under the nearest positioned ancestor; 'fixed' pins it to the viewport. */
  mode?: 'anchored' | 'fixed';
  /** Anchored placement relative to that ancestor. */
  placement?: 'bottom-start' | 'bottom-end' | 'top-start' | 'top-end';
  /** Viewport offsets for `mode="fixed"`, e.g. `{ left: 10, bottom: 64 }`. */
  at?: PopoverOffsets;
  width?: number | string;
  /** Panel padding. 5 for the calendar menu, 6 for the profile menu, 14 for the demo panel. */
  pad?: number;
  /** Panel radius. 10 for the calendar menu, 12 for the profile menu and demo panel. */
  radius?: number;
  className?: string;
  children?: React.ReactNode;
  /** Renders a forced state statically. Used only by the /__states contract sheet. */
  force?: 'hover' | 'focus' | 'disabled' | 'loading' | '';
}

export function Popover({
  open,
  onClose,
  role,
  label,
  mode = 'anchored',
  placement = 'bottom-start',
  at,
  width,
  pad = 6,
  radius = 12,
  className,
  children,
  force = '',
}: PopoverProps) {
  const panel = useRef<HTMLDivElement>(null);
  useDismiss(panel, open, onClose);

  if (!open) return null;

  const vars: Record<string, string> = {
    '--pop-pad': `${pad}px`,
    '--pop-radius': `${radius}px`,
  };
  if (width !== undefined) vars['--pop-w'] = typeof width === 'number' ? `${width}px` : width;
  if (at?.top !== undefined) vars['--pop-top'] = `${at.top}px`;
  if (at?.right !== undefined) vars['--pop-right'] = `${at.right}px`;
  if (at?.bottom !== undefined) vars['--pop-bottom'] = `${at.bottom}px`;
  if (at?.left !== undefined) vars['--pop-left'] = `${at.left}px`;

  return (
    <div
      ref={panel}
      role={role}
      aria-label={label}
      className={clsx(s.panel, className)}
      data-mode={mode}
      data-placement={placement}
      data-force={force || undefined}
      style={vars as React.CSSProperties}
    >
      {children}
    </div>
  );
}
