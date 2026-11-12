import { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router';
import { safeLanding } from '@ai/core/landing';
import type { LandingPath } from '@ai/core/landing';
import { Icon } from '../../components/Icon';
import { BrandSlot } from '../../shell/BrandSlot';
import s from './AcceptInvite.module.css';

// /invite/:token — net-new. Phase 07 § 7.5: "`/invite/:token` shows `Joining {Team or Amplified
// Impact}…` with a spinner, then redirects", on the same card shell as /sign-in.
//
// § 7.5 gives the invite no endpoint of its own: "`/invite/:token` verifies the token, sets
// `status: 'active'` and `joined`, and signs the user in", which is `POST /api/auth/verify` with an
// `invite`-purpose token. Nothing exists yet, so the call is isolated in `acceptInvite` below.
//
// Like /sign-in this renders before there is a session, so it never touches `useDb`/`useViewer`.

const COPY = {
  /** The staff fallback: a staff invite belongs to no team. § 7.5's `{Team or Amplified Impact}`. */
  org: 'Amplified Impact',
  joining: (who: string) => `Joining ${who}…`,
  expired: 'That link has expired. Request a new one.',
  used: 'That link was already used. Request a new one.',
} as const;

type InviteResult = { ok: true; team: string | null; landing: LandingPath } | { ok: false; failure: 'expired' | 'used' };

/**
 * `POST /api/auth/verify { token }` for an `invite`-purpose token.
 *
 * The team name can only come from the response — there is no pre-auth endpoint that would let the
 * screen read an unverified token — so the heading opens on the `Amplified Impact` fallback and
 * narrows to the team once the server answers. Never rejects: a transport failure reads as expired,
 * because "Request a new one." is the right recovery for it.
 */
async function acceptInvite(token: string): Promise<InviteResult> {
  try {
    const res = await fetch('/api/auth/verify', {
      method: 'POST',
      credentials: 'include',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ token }),
    });
    const body = (await res.json().catch(() => null)) as { error?: string; team?: string; landing?: unknown } | null;
    if (res.ok) return { ok: true, team: body?.team ?? null, landing: safeLanding(body?.landing) };
    return { ok: false, failure: body?.error === 'used' ? 'used' : 'expired' };
  } catch {
    return { ok: false, failure: 'expired' };
  }
}

export function Component() {
  const { token } = useParams();
  const navigate = useNavigate();

  const [team, setTeam] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // An invite token is single use, like a sign-in token: StrictMode's second mount must not spend
  // it again and turn a good invite into `That link was already used.`
  //
  // Holding the in-flight promise, rather than an "already spent" flag, is what makes that safe. A flag
  // would make the second run bail out entirely — and since the first run's cleanup has already
  // disowned its own result, nobody would be left to apply it and the screen would spin forever.
  // Each run attaches a fresh handler to the one request.
  const pending = useRef<{ token: string; result: Promise<InviteResult> } | null>(null);

  useEffect(() => {
    if (!token) return;
    if (pending.current?.token !== token) pending.current = { token, result: acceptInvite(token) };
    let alive = true;
    void pending.current.result.then((result) => {
      if (!alive) return;
      if (result.ok) {
        if (result.team) setTeam(result.team);
        // `replace`, so Back does not return to a spent invite. D-150: the Skill Library for a
        // teammate with no cohort portal.
        navigate(result.landing, { replace: true });
        return;
      }
      setError(result.failure === 'used' ? COPY.used : COPY.expired);
    });
    return () => {
      alive = false;
    };
  }, [token, navigate]);

  // Outside `AppShell`, so this route marks the body ready itself — the compliance and axe
  // harnesses wait on `[data-app-ready="true"]`.
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

  return (
    <main className={s.page}>
      <div className={s.card}>
        <div className={s.brand}>
          <BrandSlot kind="lockup" />
        </div>

        <h1 className={s.h1}>{COPY.joining(team ?? COPY.org)}</h1>

        {error ? (
          // § 7.5 names no failure copy for the invite screen, so this reuses its two sanctioned
          // link errors rather than writing a third: an invite link expires (7 days) and is single
          // use, exactly like a sign-in link.
          <div className={s.error} role="alert">
            {error}
          </div>
        ) : (
          <div className={s.pending} role="status" aria-busy="true">
            <Icon name="spinner" size={20} strokeWidth={2.2} className={s.spin} />
          </div>
        )}
      </div>
    </main>
  );
}

export default Component;
