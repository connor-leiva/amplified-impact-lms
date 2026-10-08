import { useEffect, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router';
import { Icon } from '../../components/Icon';
import { Button } from '../../components/primitives/Button';
import { Field, Input } from '../../components/primitives/Field';
import { BrandSlot } from '../../shell/BrandSlot';
import s from './SignIn.module.css';

// /sign-in — net-new. Phase 07 § 7.5 is the whole spec: there is no `design-reference/*.dc.html`
// for this screen, so nothing here is a port. Every value is one § 7.5 names, and every other
// detail reuses an existing primitive (`BrandSlot`, `Field`/`Input`, `Button`) rather than
// inventing one.
//
// The screen lives outside `AppShell`: it must render before there is a session, so it never calls
// `useDb`/`useViewer` (those suspend on `/api/snapshot`, which answers 401 here).
//
// Two paths through one route:
//   /sign-in            — ask for an email, POST /api/auth/request, show "Check Your Email".
//   /sign-in?token=…    — verify the link, POST /api/auth/verify, then land on `/`.

/** Every string on this screen, verbatim from phase 07 § 7.5. */
const COPY = {
  h1: 'Sign In',
  sub: 'We’ll email you a secure sign-in link.',
  label: 'Work Email',
  submit: 'Email Me a Sign-In Link',
  sentH1: 'Check Your Email',
  sent: (email: string) => `We sent a link to ${email}. It expires in 15 minutes.`,
  again: 'Use a Different Email',
  invalid: 'Enter a valid email address.',
  expired: 'That link has expired. Request a new one.',
  used: 'That link was already used. Request a new one.',
} as const;

const EMAIL_ID = 'sign-in-email';
const ERROR_ID = 'sign-in-error';

/**
 * Client-side validation, which is the ONLY case that shows an error on the request path.
 * Deliberately shallow: one `@`, a dot in the domain, no whitespace. Anything stricter rejects
 * addresses that deliver, and the server is the real authority — it just never says so (see
 * `requestSignInLink`).
 */
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

/** Shared fetch shape. `credentials: 'include'` because `/api/auth/verify` sets the `ai_sid` cookie. */
const post = (url: string, body: unknown) =>
  fetch(url, {
    method: 'POST',
    credentials: 'include',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });

/**
 * `POST /api/auth/request { email }`. The endpoint does not exist yet (phase 07 § 7.5 defines it),
 * so the call is isolated here.
 *
 * It resolves no matter what happens, and tells the caller nothing, on purpose. § 7.5: the endpoint
 * "Always returns `200 {ok:true}`, so it does not reveal whether an account exists" — which only
 * holds end to end if the UI also refuses to branch. A rejected promise, a 4xx, or a `found: false`
 * body would each become a side channel the moment the UI rendered it differently, so a transport
 * failure is swallowed here and the caller always shows "Check Your Email".
 */
async function requestSignInLink(email: string): Promise<void> {
  try {
    await post('/api/auth/request', { email });
  } catch {
    /* Offline, DNS, CORS, a 500 behind a proxy: indistinguishable from success, by design. */
  }
}

type LinkFailure = 'expired' | 'used';

/**
 * `POST /api/auth/verify { token }`. Resolves `null` on success, otherwise which of § 7.5's two
 * failure strings to show. `used` is the only distinguished case; everything else — an expired
 * token, a forged one, a 500, a dead network — reads as expired, because "Request a new one." is
 * the correct recovery for all of them.
 */
async function verifySignInToken(token: string): Promise<LinkFailure | null> {
  try {
    const res = await post('/api/auth/verify', { token });
    if (res.ok) return null;
    const body = (await res.json().catch(() => null)) as { error?: string } | null;
    return body?.error === 'used' ? 'used' : 'expired';
  } catch {
    return 'expired';
  }
}

type Mode = 'form' | 'sent' | 'verifying';

export function Component() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const token = params.get('token');

  const [mode, setMode] = useState<Mode>(token ? 'verifying' : 'form');
  const [email, setEmail] = useState('');
  const [sentTo, setSentTo] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  // A sign-in token is single use, so it may be spent exactly once. StrictMode mounts effects twice
  // in dev, which would spend it on the first pass and then report `used` on the second.
  //
  // Holding the in-flight promise, rather than an "already spent" flag, is what makes that safe. A
  // flag would make the second run bail out entirely — and since the first run's cleanup has
  // already disowned its own result, nobody would be left to apply it and the screen would sit in
  // `verifying` forever. Each run attaches a fresh handler to the one request.
  const pending = useRef<{ token: string; result: Promise<LinkFailure | null> } | null>(null);

  useEffect(() => {
    if (!token) return;
    if (pending.current?.token !== token) pending.current = { token, result: verifySignInToken(token) };
    let alive = true;
    setMode('verifying');
    setError(null);
    void pending.current.result.then((failure) => {
      if (!alive) return;
      if (!failure) {
        // `replace`, so Back does not return to a spent token.
        navigate('/', { replace: true });
        return;
      }
      setError(failure === 'used' ? COPY.used : COPY.expired);
      setMode('form');
    });
    return () => {
      alive = false;
    };
  }, [token, navigate]);

  // This route renders outside `AppShell`, which is what normally marks the body ready, so it marks
  // itself: the compliance and axe harnesses wait on `[data-app-ready="true"]` before they look.
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

  const submit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (busy) return;
    const value = email.trim();
    if (!EMAIL.test(value)) {
      setError(COPY.invalid);
      return;
    }
    setError(null);
    setBusy(true);
    void requestSignInLink(value).then(() => {
      setSentTo(value);
      setBusy(false);
      setMode('sent');
    });
  };

  const restart = () => {
    setEmail('');
    setSentTo('');
    setError(null);
    setMode('form');
  };

  const sent = mode === 'sent';

  return (
    <main className={s.page}>
      <div className={s.card}>
        <div className={s.brand}>
          <BrandSlot kind="lockup" />
        </div>

        <div className={s.head}>
          <h1 className={s.h1}>{sent ? COPY.sentH1 : COPY.h1}</h1>
          <p className={s.sub}>{sent ? COPY.sent(sentTo) : COPY.sub}</p>
        </div>

        {mode === 'verifying' ? (
          // § 7.5 asks for "a brief verifying state" and names no copy for it, so this adds none:
          // the spinner stands in for the form under the unchanged heading.
          <div className={s.pending} role="status" aria-busy="true">
            <Icon name="spinner" size={20} strokeWidth={2.2} className={s.spin} />
          </div>
        ) : sent ? (
          <Button variant="link" className={s.again} onClick={restart}>
            {COPY.again}
          </Button>
        ) : (
          <form className={s.form} noValidate onSubmit={submit}>
            {/* `Field` supplies the label/`htmlFor` pair and the 6px stack. The error is rendered
                here rather than through `Field`'s `error` prop because it has to be a `role="alert"`
                live region, which that prop cannot set; `aria-describedby` is wired by hand to the
                same node so the association axe checks for still holds. The region is always in the
                DOM — `:empty` hides it — so inserting the text announces it. */}
            <Field label={COPY.label} id={EMAIL_ID}>
              <Input
                id={EMAIL_ID}
                type="email"
                name="email"
                autoComplete="email"
                autoFocus
                spellCheck={false}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                aria-invalid={error ? true : undefined}
                aria-describedby={error ? ERROR_ID : undefined}
              />
              <div className={s.error} id={ERROR_ID} role="alert">
                {error}
              </div>
            </Field>

            <Button type="submit" variant="primary" size="lg" className={s.submit} disabled={busy}>
              {COPY.submit}
            </Button>
          </form>
        )}
      </div>
    </main>
  );
}

export default Component;
