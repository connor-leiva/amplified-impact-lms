import { useState } from 'react';
import { Link } from 'react-router';
import { Button } from '../../components/primitives/Button';
import { Field, Input } from '../../components/primitives/Field';
import { AuthCard, EMAIL, post, useAppReady } from './shared';
import s from './SignIn.module.css';

// /forgot-password (D-132): ask for an email, POST /api/auth/password/forgot, then say the same thing
// whatever the API says. An account with a password gets a reset link (1 hour), one without gets a
// set-password link (72 hours), and an address with no account gets nothing, which the screen must
// not reveal: it never branches on the answer, and a failed request reads as sent.

export const COPY = {
  h1: 'Forgot Password',
  sub: 'Enter your work email. We’ll send you a link to set a new password.',
  label: 'Work Email',
  submit: 'Email Me a Link',
  sentH1: 'Check Your Email',
  sent: 'If that email has an account, we sent a link.',
  back: 'Back to Sign In',
  invalid: 'Enter a valid email address.',
} as const;

const EMAIL_ID = 'forgot-email';
const ERROR_ID = 'forgot-error';

export function Component() {
  const [email, setEmail] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);
  useAppReady();

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
    void post('/api/auth/password/forgot', { email: value })
      .catch(() => undefined)
      .then(() => {
        setBusy(false);
        setSent(true);
      });
  };

  return (
    <AuthCard title={sent ? COPY.sentH1 : COPY.h1} sub={sent ? COPY.sent : COPY.sub}>
      {sent ? null : (
        <form className={s.form} noValidate onSubmit={submit}>
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
      <Link className={s.textLink} to="/sign-in">
        {COPY.back}
      </Link>
    </AuthCard>
  );
}

export default Component;
