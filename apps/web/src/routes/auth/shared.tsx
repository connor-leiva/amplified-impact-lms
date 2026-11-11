import { useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { Button } from '../../components/primitives/Button';
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

// --- "Continue With Google" (D-139) ------------------------------------------------------------------

/** The API's start route: a full page load, so Google's chooser replaces this page. */
export const GOOGLE_START = '/api/auth/google';

/** The button, and what the sign-in screen says for each `?google=` the callback sends back. */
export const GOOGLE_COPY = {
  button: 'Continue With Google',
  'no-account': 'We couldn’t find an account for that email. Use the email you bought with, or sign in with your password.',
  unverified: 'Google hasn’t verified that email address. Sign in with your password or an email link.',
  'linked-elsewhere': 'That account is linked to a different Google account. Sign in with your password or an email link.',
  failed: 'Google sign-in didn’t finish. Try again, or sign in with your password.',
} as const;

type GoogleRefusal = 'no-account' | 'unverified' | 'linked-elsewhere' | 'failed';
const REFUSALS: readonly string[] = ['no-account', 'unverified', 'linked-elsewhere', 'failed'];

/** The words for the callback's `?google=<why>`, or null for none (or anything else). */
export function googleRefusal(why: string | null): string | null {
  return why && REFUSALS.includes(why) ? GOOGLE_COPY[why as GoogleRefusal] : null;
}

/**
 * Whether this deploy offers Google sign-in: `GET /api/auth/providers`. False until it answers
 * `{ google: true }`, and false for good when it can't (no keys in Railway, fixture mode with no
 * API, offline), so the button never shows for a route that would 404.
 */
export function useGoogleSignIn(): boolean {
  const [on, setOn] = useState(false);
  useEffect(() => {
    let alive = true;
    fetch('/api/auth/providers', { credentials: 'same-origin' })
      .then(async (res) => {
        const body = res.ok ? ((await res.json().catch(() => null)) as { google?: unknown } | null) : null;
        if (alive) setOn(body?.google === true);
      })
      .catch(() => undefined);
    return () => {
      alive = false;
    };
  }, []);
  return on;
}

/** Under the form, set apart by a rule. Email and password stays the primary way in. */
export function GoogleSignIn() {
  return (
    <div className={s.alt}>
      <Button variant="secondary" size="lg" className={s.submit} onClick={() => window.location.assign(GOOGLE_START)}>
        {GOOGLE_COPY.button}
      </Button>
    </div>
  );
}
