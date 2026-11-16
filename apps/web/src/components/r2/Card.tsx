import type { ReactNode } from 'react';
import clsx from 'clsx';
import s from './Card.module.css';

// The R2 card (D-160): the mockup's `Card` (`.cd`, with an optional `.cdh` header and a padded
// `.cdb` body) and the bare `.cd` box other pieces sit in.

export interface CardProps {
  title?: string;
  sub?: string;
  right?: ReactNode;
  /** Pad the body (`.cdb`); false for tables and lists that run edge to edge. */
  pad?: boolean;
  children?: ReactNode;
  className?: string;
}

export function Card({ title, sub, right, pad = true, children, className }: CardProps) {
  return (
    <section className={clsx(s.card, className)}>
      {title ? (
        <div className={s.head}>
          <div className={s.titles}>
            <h2 className={s.title}>{title}</h2>
            {sub ? <span className={s.sub}>{sub}</span> : null}
          </div>
          {right}
        </div>
      ) : null}
      {pad ? <div className={s.body}>{children}</div> : children}
    </section>
  );
}

/** A plain `.cd` box (`.cd.pd` when padded). */
export function Box({ padded, className, children }: { padded?: boolean; className?: string; children?: ReactNode }) {
  return <div className={clsx(s.card, padded && s.padded, className)}>{children}</div>;
}
