import type { ReactNode } from 'react';
import clsx from 'clsx';
import type { IconName } from '@ai/core';
import { Icon } from '../Icon';
import s from './Empty.module.css';

// The R2 empty state (D-160): the mockup's `Empty` (`.emp`) and its error twin `ErrBox`. `heading`
// picks the title's element: a page that is only this message (the Console 404, Denied) makes it the
// page's h1; a table's empty state keeps a span.

export interface EmptyProps {
  icon?: IconName;
  title: string;
  body?: string;
  tone?: 'neutral' | 'bad';
  heading?: 'h1' | 'h2' | 'span';
  role?: 'alert';
  children?: ReactNode;
}

export function Empty({
  icon = 'r2File',
  title,
  body,
  tone = 'neutral',
  heading = 'span',
  role,
  children,
}: EmptyProps) {
  const Title = heading;
  return (
    <div className={s.empty} role={role}>
      <span className={clsx(s.icon, tone === 'bad' && s.bad)}>
        <Icon name={icon} size={18} strokeWidth={1.75} />
      </span>
      <Title className={s.title}>{title}</Title>
      {body ? <p className={s.body}>{body}</p> : null}
      {children}
    </div>
  );
}

/** The centred row of actions under a page's message (`row` with `paddingBottom: 40, marginTop: -28`). */
export function EmptyActions({ children }: { children: ReactNode }) {
  return <div className={s.actions}>{children}</div>;
}
