import { useEffect } from 'react';
import type { ReactNode } from 'react';
import { BrandSlot } from '../../shell/BrandSlot';
import s from './SignIn.module.css';

// The pieces the sign-in screens share (D-132): /sign-in, /forgot-password, /set-password and
// /account all render outside `AppShell`, in the same card, so they mark the body ready themselves
// and post JSON the same way.

/** Deliberately shallow: one `@`, a dot in the domain, no whitespace. The server is the authority. */
export const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

/** The shortest password the API accepts (`PASSWORD_MIN` in apps/api/src/auth/passwords.ts). */
export const PASSWORD_MIN = 10;

/** `credentials: 'include'` because these routes set or read the `ai_sid` cookie. */
export const post = (url: string, body: unknown) =>
  fetch(url, {
    method: 'POST',
    credentials: 'include',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });

/** The `error` a JSON answer carries, or null. */
export async function errorOf(res: Response): Promise<string | null> {
  const body = (await res.json().catch(() => null)) as { error?: unknown } | null;
  return typeof body?.error === 'string' ? body.error : null;
}

/**
 * These routes render outside `AppShell`, which is what normally marks the body ready, so each marks
 * itself: the compliance and axe harnesses wait on `[data-app-ready="true"]` before they look.
 */
export function useAppReady(): void {
  useEffect(() => {
    let alive = true;
    const mark = () => {
      if (alive) document.body.dataset.appReady = 'true';
    };
    const fonts: FontFaceSet | undefined = document.fonts;
    if (fonts) void fonts.ready.then(mark, mark);
    else mark();
    return () => {
      alive = false;
    };
  }, []);
}

/** The card every sign-in screen sits in: the brand lockup, a heading, a line, then the body. */
export function AuthCard({ title, sub, children }: { title: string; sub: string; children: ReactNode }) {
  return (
    <main className={s.page}>
      <div className={s.card}>
        <div className={s.brand}>
          <BrandSlot kind="lockup" />
        </div>
        <div className={s.head}>
          <h1 className={s.h1}>{title}</h1>
          <p className={s.sub}>{sub}</p>
        </div>
        {children}
      </div>
    </main>
  );
}
