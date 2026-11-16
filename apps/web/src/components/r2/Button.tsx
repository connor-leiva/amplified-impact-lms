import type { ButtonHTMLAttributes, ReactNode } from 'react';
import clsx from 'clsx';
import { Link } from 'react-router';
import type { IconName } from '@ai/core';
import { Icon } from '../Icon';
import s from './Button.module.css';

// The R2 button (D-160): the mockup's `Btn` and `.b`. `primary` is the forest `.b.p`, `quiet` `.b.q`,
// `danger` `.b.d`; `header` is the taller page-header size (`.hd .b`, 36px, 48px on a phone), the one
// R2 calls a primary. A filled button outside a page header is a 32px control (44px on a phone).

export type ButtonKind = 'secondary' | 'primary' | 'quiet' | 'danger' | 'primary-danger';

export interface ButtonLook {
  kind?: ButtonKind;
  /** A page-header action: `--r2-cp` tall. */
  header?: boolean;
  icon?: IconName;
}

export const buttonClass = ({ kind = 'secondary', header }: ButtonLook, extra?: string): string =>
  clsx(
    s.b,
    header && s.primary,
    (kind === 'primary' || kind === 'primary-danger') && s.filled,
    (kind === 'danger' || kind === 'primary-danger') && s.danger,
    kind === 'quiet' && s.quiet,
    extra,
  );

const glyph = (icon?: IconName) => (icon ? <Icon name={icon} size={16} strokeWidth={1.75} /> : null);

export function Button({
  kind,
  header,
  icon,
  className,
  children,
  type = 'button',
  ...rest
}: ButtonLook & ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button type={type} className={buttonClass({ kind, header }, className)} {...rest}>
      {glyph(icon)}
      {children}
    </button>
  );
}

/** A way somewhere, drawn as a button: a router link, so it opens in a new tab and reads as a link. */
export function ButtonLink({
  kind,
  header,
  icon,
  to,
  className,
  children,
}: ButtonLook & { to: string; className?: string; children: ReactNode }) {
  return (
    <Link to={to} className={buttonClass({ kind, header }, className)}>
      {glyph(icon)}
      {children}
    </Link>
  );
}
