import type { ReactNode } from 'react';
import s from './Page.module.css';

/** The R2 page column (D-160, the mockup's `.pg`): max 1400px, `28px var(--pad) 64px`, 20px gaps. */
export function Page({ children }: { children: ReactNode }) {
  return <div className={s.page}>{children}</div>;
}
