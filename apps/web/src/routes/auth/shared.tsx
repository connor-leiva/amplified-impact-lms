import { useEffect, useState } from 'react';
import type { CSSProperties, ReactNode } from 'react';
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

/** The homepage ripple's four outer rings (apps/web/src/home/icons.ts, `ripple()` quiet), in its 760 box. */
const RIPPLE_RINGS = [175, 235, 300, 370] as const;

/** The v2 mockup's quiet ripple behind the panel. A picture only, hidden from screen readers. */
function AuthRipple() {
  return (
    <div className={s.ripple} aria-hidden="true">
      <svg width="1100" height="1100" viewBox="0 0 760 760" focusable="false">
        {RIPPLE_RINGS.map((r) => (
          <circle key={r} cx="380" cy="380" r={r} />
        ))}
      </svg>
    </div>
  );
}

/** The card every sign-in screen sits in: the brand lockup, a heading, a line, then the body. */
export function AuthCard({ title, sub, children }: { title: string; sub: string; children: ReactNode }) {
  return (
    <main className={s.page}>
      <AuthRipple />
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
  'no-account':
    'We couldn’t find an account for that email. Use the email you bought with, or sign in with your password.',
  unverified: 'Google hasn’t verified that email address. Sign in with your password or an email link.',
  'linked-elsewhere':
    'That account is linked to a different Google account. Sign in with your password or an email link.',
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

/**
 * Google's light-theme button colours, from its Sign-In branding guidelines
 * (developers.google.com/identity/branding-guidelines): fill #FFFFFF, a 1px #747775 stroke, #1F1F1F
 * text, and the #303030 state layer Google's own button uses for hover and press. They are Google's,
 * not ours, so they are not tokens. Like the G's four fills below, they live with the one component
 * that wears Google's brand, and SignIn.module.css reads them as `var(--google-*)`.
 */
const GOOGLE_LIGHT = {
  '--google-fill': '#FFFFFF',
  '--google-stroke': '#747775',
  '--google-text': '#1F1F1F',
  '--google-state': '#303030',
} as CSSProperties;

/**
 * Google's standard four-colour "G", as Google's own Sign in with Google button draws it: four paths
 * on a 48-unit grid, shown at 18px. Never redrawn or recoloured. Decorative: `aria-hidden`, so the
 * button's accessible name stays its label.
 */
function GoogleG() {
  return (
    <svg className={s.googleG} width="18" height="18" viewBox="0 0 48 48" aria-hidden="true" focusable="false">
      <path
        fill="#EA4335"
        d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"
      />
      <path
        fill="#4285F4"
        d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"
      />
      <path
        fill="#FBBC05"
        d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"
      />
      <path
        fill="#34A853"
        d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"
      />
    </svg>
  );
}

/**
 * Under the form, set apart by a rule. Email and password stays the primary way in. Google's
 * light-theme button: white, a #747775 hairline, the G at the left of the label. It is as wide as
 * the card's other buttons, with the same radius, and 44px tall for a thumb.
 */
export function GoogleSignIn() {
  return (
    <div className={s.alt}>
      <button
        type="button"
        className={s.google}
        style={GOOGLE_LIGHT}
        onClick={() => window.location.assign(GOOGLE_START)}
      >
        <GoogleG />
        <span>{GOOGLE_COPY.button}</span>
      </button>
    </div>
  );
}
