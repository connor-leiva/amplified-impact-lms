import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router';
import { Icon } from '../../components/Icon';
import { Button } from '../../components/primitives/Button';
import { Field, Input } from '../../components/primitives/Field';
import { AuthCard, EMAIL, GoogleSignIn, errorOf, googleRefusal, post, useAppReady, useGoogleSignIn } from './shared';
import s from './SignIn.module.css';

// /sign-in — net-new. Phase 07 § 7.5 specified the magic link; D-132 makes email and password the
// first way in and keeps the link as the second. There is no `design-reference/*.dc.html` for this
// screen, so every detail reuses an existing primitive (`BrandSlot`, `Field`/`Input`, `Button`).
//
// The screen lives outside `AppShell`: it must render before there is a session, so it never calls
// `useDb`/`useViewer` (those suspend on `/api/snapshot`, which answers 401 here).
//
// Four states through one route:
//   /sign-in               — email and password, POST /api/auth/login, then land on `/`.
//   /sign-in?method=link   — ask for an email, POST /api/auth/request, show "Check Your Email".
//   /sign-in?token=…       — verify the link, POST /api/auth/verify, then land on `/`.
//
// NO ACCOUNT ENUMERATION. The password form shows the API's one answer for every mismatch, and the
// link form shows "Check Your Email" whatever the API says (§ 7.5).

/** Every string on this screen. § 7.5's for the link, D-132's for the password. */
export const COPY = {
  h1: 'Sign In',
  sub: 'Use your work email and password.',
  linkSub: 'We’ll email you a secure sign-in link.',
  label: 'Work Email',
  password: 'Password',
  remember: 'Keep me signed in for 30 days',
  signIn: 'Sign In',
  forgot: 'Forgot Password?',
  useLink: 'Email Me a Sign-In Link Instead',
  usePassword: 'Sign In With a Password Instead',
  submit: 'Email Me a Sign-In Link',
  sentH1: 'Check Your Email',
  sent: (email: string) => `We sent a link to ${email}. It expires in 15 minutes.`,
  again: 'Use a Different Email',
  invalid: 'Enter a valid email address.',
  needPassword: 'Enter your password.',
  failed: 'Something went wrong. Try again.',
  expired: 'That link has expired. Request a new one.',
  used: 'That link was already used. Request a new one.',
} as const;

const EMAIL_ID = 'sign-in-email';
const PASSWORD_ID = 'sign-in-password';
const REMEMBER_ID = 'sign-in-remember';
const ERROR_ID = 'sign-in-error';

/**
 * `POST /api/auth/request { email }`. Resolves no matter what happens and tells the caller nothing:
 * § 7.5's "does not reveal whether an account exists" only holds end to end if the UI also refuses
 * to branch, so a transport failure is swallowed and the caller always shows "Check Your Email".
 */
async function requestSignInLink(email: string): Promise<void> {
  try {
    await post('/api/auth/request', { email });
  } catch {
    /* Offline, DNS, a 500 behind a proxy: indistinguishable from success, by design. */
  }
}

type LinkFailure = 'expired' | 'used';

/** `POST /api/auth/verify { token }`. Null on success, otherwise which failure string to show. */
async function verifySignInToken(token: string): Promise<LinkFailure | null> {
  try {
    const res = await post('/api/auth/verify', { token });
    if (res.ok) return null;
    return (await errorOf(res)) === 'used' ? 'used' : 'expired';
  } catch {
    return 'expired';
  }
}

/** `POST /api/auth/login`. Null on success, otherwise the words to show (the API's own). */
async function signInWithPassword(email: string, password: string, remember: boolean): Promise<string | null> {
  try {
    const res = await post('/api/auth/login', { email, password, remember });
    if (res.ok) return null;
    return (await errorOf(res)) ?? COPY.failed;
  } catch {
    return COPY.failed;
  }
}

type Mode = 'password' | 'link' | 'sent' | 'verifying';

export function Component() {
  const [params, setParams] = useSearchParams();
  const navigate = useNavigate();
  const token = params.get('token');
  const google = useGoogleSignIn();

  const [mode, setMode] = useState<Mode>(token ? 'verifying' : params.get('method') === 'link' ? 'link' : 'password');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [remember, setRemember] = useState(true);
  const [sentTo, setSentTo] = useState('');
  // A Google sign-in that came back refused (D-139) lands here with `?google=<why>`.
  const [error, setError] = useState<string | null>(() => googleRefusal(params.get('google')));
  const [busy, setBusy] = useState(false);

  // Said once: the flag leaves the address bar, so a reload doesn't repeat it.
  useEffect(() => {
    if (!params.has('google')) return;
    setParams(
      (p) => {
        const next = new URLSearchParams(p);
        next.delete('google');
        return next;
      },
      { replace: true },
    );
  }, [params, setParams]);

  // A sign-in token is single use, so it may be spent exactly once, even when StrictMode mounts
  // effects twice: each run attaches a fresh handler to the one in-flight request.
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
      // Back on the link form, where "Request a new one." is one click away.
      setMode('link');
    });
    return () => {
      alive = false;
    };
  }, [token, navigate]);

  useAppReady();

  const submitLink = (e: React.FormEvent<HTMLFormElement>) => {
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

  const submitPassword = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (busy) return;
    const value = email.trim();
    if (!EMAIL.test(value)) {
      setError(COPY.invalid);
      return;
    }
    if (!password) {
      setError(COPY.needPassword);
      return;
    }
    setError(null);
    setBusy(true);
    void signInWithPassword(value, password, remember).then((failure) => {
      setBusy(false);
      if (!failure) {
        navigate('/', { replace: true });
        return;
      }
      setPassword('');
      setError(failure);
    });
  };

  const switchTo = (next: 'password' | 'link') => {
    setError(null);
    setMode(next);
  };

  const restart = () => {
    setEmail('');
    setSentTo('');
    setError(null);
    setMode('link');
  };

  const title = mode === 'sent' ? COPY.sentH1 : COPY.h1;
  const sub = mode === 'sent' ? COPY.sent(sentTo) : mode === 'password' ? COPY.sub : COPY.linkSub;

  // The error is a `role="alert"` live region, always mounted so inserting text announces it;
  // `aria-describedby` points the field at it so axe's association holds.
  const errorRegion = (
    <div className={s.error} id={ERROR_ID} role="alert">
      {error}
    </div>
  );

  const emailField = (
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
      {mode === 'link' ? errorRegion : null}
    </Field>
  );

  return (
    <AuthCard title={title} sub={sub}>
      {mode === 'verifying' ? (
        <div className={s.pending} role="status" aria-busy="true">
          <Icon name="spinner" size={20} strokeWidth={2.2} className={s.spin} />
        </div>
      ) : mode === 'sent' ? (
        <Button variant="link" className={s.again} onClick={restart}>
          {COPY.again}
        </Button>
      ) : mode === 'link' ? (
        <>
          <form className={s.form} noValidate onSubmit={submitLink}>
            {emailField}
            <Button type="submit" variant="primary" size="lg" className={s.submit} disabled={busy}>
              {COPY.submit}
            </Button>
          </form>
          <Button variant="link" className={s.again} onClick={() => switchTo('password')}>
            {COPY.usePassword}
          </Button>
        </>
      ) : (
        <>
          <form className={s.form} noValidate onSubmit={submitPassword}>
            {emailField}
            <Field label={COPY.password} id={PASSWORD_ID}>
              <Input
                id={PASSWORD_ID}
                type="password"
                name="password"
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                aria-invalid={error ? true : undefined}
                aria-describedby={error ? ERROR_ID : undefined}
              />
              {errorRegion}
            </Field>
            <label className={s.check} htmlFor={REMEMBER_ID}>
              <input id={REMEMBER_ID} type="checkbox" checked={remember} onChange={(e) => setRemember(e.target.checked)} />
              {COPY.remember}
            </label>
            <Button type="submit" variant="primary" size="lg" className={s.submit} disabled={busy}>
              {COPY.signIn}
            </Button>
          </form>
          {google ? <GoogleSignIn /> : null}
          <div className={s.links}>
            <Link className={s.textLink} to="/forgot-password">
              {COPY.forgot}
            </Link>
            <Button variant="link" className={s.again} onClick={() => switchTo('link')}>
              {COPY.useLink}
            </Button>
          </div>
        </>
      )}
    </AuthCard>
  );
}

export default Component;
