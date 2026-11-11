import { useEffect, useState } from 'react';
import { Link } from 'react-router';
import { Icon } from '../../components/Icon';
import { Button } from '../../components/primitives/Button';
import { Field, Input } from '../../components/primitives/Field';
import { AuthCard, PASSWORD_MIN, errorOf, useAppReady } from './shared';
import s from './SignIn.module.css';

// /account (D-132): set or change the password a signed-in person signs in with. Net-new and, like
// /sign-in, outside `AppShell`, so no portal or console screen moves. Signed out, it sends the visitor
// to /sign-in. With no password yet (an account that has only used email links), it sets one; with a
// password, it needs the current one. Saving signs out every other session, never this one.

export const COPY = {
  h1: 'Your Password',
  setSub: 'Set a password, so you can sign in without an email link.',
  changeSub: 'Change the password you sign in with.',
  current: 'Current Password',
  password: 'New Password',
  confirm: 'Confirm Password',
  hint: `At least ${PASSWORD_MIN} characters.`,
  submit: 'Save Password',
  saved: 'Your password is saved. Any other devices are signed out.',
  short: `Use at least ${PASSWORD_MIN} characters.`,
  mismatch: 'The two passwords don’t match.',
  needCurrent: 'Enter your current password.',
  failed: 'Something went wrong. Try again.',
  back: 'Back to Amplified Impact',
} as const;

const CURRENT_ID = 'account-current';
const PASSWORD_ID = 'account-new';
const CONFIRM_ID = 'account-confirm';
const ERROR_ID = 'account-error';

export function Component() {
  const [has, setHas] = useState<boolean | null>(null);
  const [current, setCurrent] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [busy, setBusy] = useState(false);
  useAppReady();

  useEffect(() => {
    let alive = true;
    void fetch('/api/auth/password', { credentials: 'include', headers: { accept: 'application/json' } })
      .then(async (res) => {
        if (!alive) return;
        if (res.status === 401) {
          location.assign('/sign-in');
          return;
        }
        const body = (await res.json().catch(() => null)) as { hasPassword?: boolean } | null;
        setHas(body?.hasPassword === true);
      })
      .catch(() => alive && setHas(false));
    return () => {
      alive = false;
    };
  }, []);

  const submit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (busy) return;
    setSaved(false);
    if (has && !current) {
      setError(COPY.needCurrent);
      return;
    }
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
    void fetch('/api/auth/password/change', {
      method: 'POST',
      credentials: 'include',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(has ? { current, password } : { password }),
    })
      .then(async (res) => {
        setBusy(false);
        if (res.status === 401) {
          location.assign('/sign-in');
          return;
        }
        if (res.ok) {
          setSaved(true);
          setHas(true);
          setCurrent('');
          setPassword('');
          setConfirm('');
          return;
        }
        setError((await errorOf(res)) ?? COPY.failed);
      })
      .catch(() => {
        setBusy(false);
        setError(COPY.failed);
      });
  };

  if (has === null) {
    return (
      <AuthCard title={COPY.h1} sub={COPY.changeSub}>
        <div className={s.pending} role="status" aria-busy="true">
          <Icon name="spinner" size={20} strokeWidth={2.2} className={s.spin} />
        </div>
      </AuthCard>
    );
  }

  return (
    <AuthCard title={COPY.h1} sub={has ? COPY.changeSub : COPY.setSub}>
      <form className={s.form} noValidate onSubmit={submit}>
        {has ? (
          <Field label={COPY.current} id={CURRENT_ID}>
            <Input
              id={CURRENT_ID}
              type="password"
              name="current-password"
              autoComplete="current-password"
              autoFocus
              value={current}
              onChange={(e) => setCurrent(e.target.value)}
              aria-invalid={error ? true : undefined}
              aria-describedby={error ? ERROR_ID : undefined}
            />
          </Field>
        ) : null}
        <Field label={COPY.password} id={PASSWORD_ID}>
          <Input
            id={PASSWORD_ID}
            type="password"
            name="new-password"
            autoComplete="new-password"
            autoFocus={!has}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            aria-describedby={`${PASSWORD_ID}-hint`}
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
        <p className={s.done} role="status">
          {saved ? COPY.saved : ''}
        </p>
        <Button type="submit" variant="primary" size="lg" className={s.submit} disabled={busy}>
          {COPY.submit}
        </Button>
      </form>
      <Link className={s.textLink} to="/">
        {COPY.back}
      </Link>
    </AuthCard>
  );
}

export default Component;
