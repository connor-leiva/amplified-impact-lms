import type { ReactNode } from 'react';
import clsx from 'clsx';
import { useInArea } from './area-context';
import s from './Page.module.css';

/**
 * The R2 page column (D-160, the mockup's `.pg`): max 1400px, `28px var(--pad) 64px`, 20px gaps. Inside one of the
 * four pages' tabs (D-253) it is the tab's own column, with no padding or width of its own (`.area .atb .pg`).
 */
export function Page({ children }: { children: ReactNode }) {
  const inArea = useInArea();
  return <div className={clsx(s.page, inArea && s.inArea)}>{children}</div>;
}
