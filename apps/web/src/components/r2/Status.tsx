import type { ReactNode } from 'react';
import clsx from 'clsx';
import s from './Status.module.css';

// The R2 status (D-160): the mockup's `St`, a 7px dot and its label. `run` is the hollow blue ring
// (running, retrying) and `off` the hollow grey one (draft, off, canceled).

export type StatusTone = 'ok' | 'info' | 'bad' | 'warn' | 'run' | 'off' | 'neutral';

export function Status({
  tone = 'neutral',
  children,
  className,
}: {
  tone?: StatusTone;
  children?: ReactNode;
  className?: string;
}) {
  return (
    <span className={clsx(s.status, tone !== 'neutral' && s[tone], className)}>
      <i className={s.dot} aria-hidden="true" />
      {children}
    </span>
  );
}
