import { useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router';
import { Icon } from '../../components/Icon';
import { Button } from '../../components/primitives/Button';
import { Field, Input } from '../../components/primitives/Field';
import { safeNext } from '@ai/core/landing';
import { AuthCard, GoogleSignIn, PASSWORD_MIN, errorOf, landingOf, post, useAppReady, useGoogleSignIn } from './shared';
import s from './SignIn.module.css';

// /set-password (D-132). Two ways in:
//   ?token=…     an emailed link: "Set your password" (a checkout's new account, or Forgot Password for
//                an account with none; 72 hours) or "Reset your password" (1 hour). The token is
//                checked first without spending it (POST /api/auth/password/token), so an expired
//                link says so before anyone types; it is spent only by the submit.
//   ?checkout=…  the welcome page's "Set Your Password" button, for a brand-new account from that
//                Stripe Checkout Session (the API decides whether it may).
// Either way a good password signs the person in and lands them on `/`.

export const COPY = {
  setH1: 'Set Your Password',
  setSub: 'Choose a password for your Amplified Impact account.',
  resetH1: 'Reset Your Password',
  resetSub: 'Choose a new password. It signs you out everywhere else.',
  password: 'New Password',
  confirm: 'Confirm Password',
  hint: `At least ${PASSWORD_MIN} characters.`,
  submit: 'Save Password and Sign In',
  short: `Use at least ${PASSWORD_MIN} characters.`,
  mismatch: 'The two passwords don’t match.',
  failed: 'Something went wrong. Try again.',
  expiredH1: 'That Link Has Expired',
  expired: 'Ask for a new one and we’ll email it to you.',
  usedH1: 'That Link Was Already Used',
  used: 'Your password is already set. Sign in, or ask for a new link.',
  checkoutGone: 'This page can’t set a password anymore. Ask for a link by email instead.',
  newLink: 'Send a New Link',
  signIn: 'Go to Sign In',
} as const;

const PASSWORD_ID = 'set-password-new';
const CONFIRM_ID = 'set-password-confirm';
const ERROR_ID = 'set-password-error';

type State = { kind: 'checking' } | { kind: 'form'; purpose: 'set' | 'reset' } | { kind: 'gone'; why: 'expired' | 'used' | 'checkout' };

export function Component() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const token = params.get('token');
  // D-139: Google is a way in instead of a password, for the same account.
  const google = useGoogleSignIn();
  const checkout = params.get('checkout');

  const [state, setState] = useState<State>(token ? { kind: 'checking' } : checkout ? { kind: 'form', purpose: 'set' } : { kind: 'gone', why: 'expired' });
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  useAppReady();

  useEffect(() => {
    if (!token) return;
    let alive = true;
    void post('/api/auth/password/token', { token })
      .then(async (res) => {
        const body = (await res.json().catch(() => null)) as { ok?: boolean; purpose?: string; error?: string } | null;
        if (!alive) return;
        if (res.ok && (body?.purpose === 'set' || body?.purpose === 'reset')) setState({ kind: 'form', purpose: body.purpose });
        else setState({ kind: 'gone', why: body?.error === 'used' ? 'used' : 'expired' });
      })
      .catch(() => alive && setState({ kind: 'gone', why: 'expired' }));
    return () => {
      alive = false;
    };
  }, [token]);

  const submit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (busy) return;
    if (password.length < PASSWORD_MIN) {
      setError(COPY.short);
      return;
    }
    if (password !== confirm) {
      setError(COPY.mismatch);
      return;
    }
    setError(null);
    setBusy(true);
    const request = token ? post('/api/auth/password/set', { token, password }) : post('/api/auth/password/checkout', { checkout, password });
    void request
      .then(async (res) => {
        setBusy(false);
        if (res.ok) {
          // D-150: straight to the Skill Library for a learner with no cohort portal.
          navigate(safeNext(params.get('next')) ?? (await landingOf(res)), { replace: true });
          return;
        }
        const why = await errorOf(res);
        if (res.status === 422) setError(why ?? COPY.short);
        else if (why === 'used') setState({ kind: 'gone', why: 'used' });
        else if (why === 'expired') setState({ kind: 'gone', why: checkout && !token ? 'checkout' : 'expired' });
        else setError(COPY.failed);
      })
      .catch(() => {
        setBusy(false);
        setError(COPY.failed);
      });
  };

  if (state.kind === 'checking') {
    return (
      <AuthCard title={COPY.setH1} sub={COPY.setSub}>
        <div className={s.pending} role="status" aria-busy="true">
          <Icon name="spinner" size={20} strokeWidth={2.2} className={s.spin} />
        </div>
      </AuthCard>
    );
  }

  if (state.kind === 'gone') {
    const title = state.why === 'used' ? COPY.usedH1 : COPY.expiredH1;
    const sub = state.why === 'used' ? COPY.used : state.why === 'checkout' ? COPY.checkoutGone : COPY.expired;
    return (
      <AuthCard title={title} sub={sub}>
        <div className={s.links}>
          <Link className={s.textLink} to="/forgot-password">
            {COPY.newLink}
          </Link>
          <Link className={s.textLink} to="/sign-in">
            {COPY.signIn}
          </Link>
        </div>
      </AuthCard>
    );
  }

  const reset = state.purpose === 'reset';
  return (
    <AuthCard title={reset ? COPY.resetH1 : COPY.setH1} sub={reset ? COPY.resetSub : COPY.setSub}>
      <form className={s.form} noValidate onSubmit={submit}>
        <Field label={COPY.password} id={PASSWORD_ID}>
          <Input
            id={PASSWORD_ID}
            type="password"
            name="new-password"
            autoComplete="new-password"
            autoFocus
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            aria-invalid={error ? true : undefined}
            aria-describedby={error ? `${ERROR_ID} ${PASSWORD_ID}-hint` : `${PASSWORD_ID}-hint`}
          />
          <p className={s.hint} id={`${PASSWORD_ID}-hint`}>
            {COPY.hint}
          </p>
        </Field>
        <Field label={COPY.confirm} id={CONFIRM_ID}>
          <Input
            id={CONFIRM_ID}
            type="password"
            name="confirm-password"
            autoComplete="new-password"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
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
      {google ? <GoogleSignIn /> : null}
    </AuthCard>
  );
}

export default Component;
