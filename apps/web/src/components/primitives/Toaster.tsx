import { createContext, useContext, useEffect, useMemo, useRef, useState } from 'react';
import clsx from 'clsx';
import { Icon } from '../Icon';
import s from './Toaster.module.css';
import type { IconName } from '../Icon';

// Ported from `toastsEl()` and `toast()` in design-reference/Amplified Impact LMS.dc.html.
// SCREENS § 1.10. Stack of at most 4, bottom-right, auto-dismiss after 2800ms.

export type ToastTone = 'success' | 'info' | 'warn';

export interface ToastItem {
  id: number;
  msg: string;
  tone: ToastTone;
}

export interface ToasterApi {
  /** The reference's default tone is `success`. */
  toast: (msg: string, tone?: ToastTone) => void;
}

/** Up to 4 toasts stack; the reference keeps the newest with `.slice(-4)`. */
const MAX = 4;
const DISMISS_MS = 2800;

const TONE_ICON: Record<ToastTone, IconName> = {
  success: 'checkCircle',
  info: 'info',
  warn: 'alert',
};

const ToasterContext = createContext<ToasterApi | null>(null);

export interface ToasterProps {
  toasts: ToastItem[];
  className?: string;
  /** Renders a forced state statically. Used only by the /__states contract sheet. */
  force?: 'hover' | 'focus' | 'disabled' | 'loading' | '';
}

/** The viewport. `<ToasterProvider>` renders one; render it directly to show a fixed stack. */
export function Toaster({ toasts, className, force = '' }: ToasterProps) {
  return (
    <div
      role="status"
      aria-live="polite"
      className={clsx(s.viewport, className)}
      data-force={force || undefined}
    >
      {toasts.map((t) => (
        <div key={t.id} className={s.toast} data-tone={t.tone}>
          <Icon name={TONE_ICON[t.tone]} size={16} strokeWidth={2} className={s.icon} />
          {t.msg}
        </div>
      ))}
    </div>
  );
}

export interface ToasterProviderProps {
  children?: React.ReactNode;
}

export function ToasterProvider({ children }: ToasterProviderProps) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const seq = useRef(0);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);

  useEffect(
    () => () => {
      timers.current.forEach(clearTimeout);
      timers.current = [];
    },
    [],
  );

  const api = useMemo<ToasterApi>(
    () => ({
      toast(msg, tone = 'success') {
        const id = (seq.current += 1);
        setToasts((ts) => [...ts, { id, msg, tone }].slice(-MAX));
        timers.current.push(
          setTimeout(() => setToasts((ts) => ts.filter((t) => t.id !== id)), DISMISS_MS),
        );
      },
    }),
    [],
  );

  return (
    <ToasterContext.Provider value={api}>
      {children}
      <Toaster toasts={toasts} />
    </ToasterContext.Provider>
  );
}

export function useToaster(): ToasterApi {
  const api = useContext(ToasterContext);
  if (!api) throw new Error('useToaster() requires a <ToasterProvider> above it.');
  return api;
}
