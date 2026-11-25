import { Fragment, useEffect, useState } from 'react';
import { useLocation } from 'react-router';
import type { MasqueradeView } from '@ai/core';

import '../../styles/r2.css';
import { Button, ButtonLink } from '../r2/Button';
import { Card } from '../r2/Card';
import { Page } from '../r2/Page';
import { Status } from '../r2/Status';
import { KV, PageHead, Pill, k } from '../r2/kit';
import { masquerade } from '../../data/masquerade';
import { ENVIRONMENT } from '../../data/admin-shell';
import { useAppReady, useViewportWidth } from '../../shell/hooks';
import { movedAdminPath } from '../../shell/admin/addresses';
import { crumbsOf, placeOf } from '../../shell/admin/adminNav';
import { AcademyLogo } from '../../shell/admin/Wordmark';
import { MASQ_COPY, activeVM, bannerVM } from '../../routes/console/masquerade.vm';
import { ReasonDialog } from './ReasonDialog';
import { Rules } from './Rules';
import a from '../../shell/admin/AdminShell.module.css';
import s from './Masquerade.module.css';

// The Console, paused (D-162 3b, spec D2): every `/admin/*` address during a session, ahead of the
// learner shell's bounce. The mockup has no frame for it, so it is built from R2 parts inside the R2
// frame: the top bar (the academy lockup since D-256, the breadcrumb of the page asked for, the
// environment), the page head, and the mockup's own "Active session" card (from `Masquerade()`,
// which D2 makes unreachable on `/admin/masquerade` itself) with Extend and Exit, beside its "Rules
// for every session". No sidebar: every Console page is paused, and the session is the learner's,
// not the staff member's.

export default function ConsolePaused({ session, skew }: { session: MasqueradeView; skew: number }) {
  const { pathname } = useLocation();
  const phone = useViewportWidth() < 768;
  const [now, setNow] = useState(() => Date.now() + skew);
  const [extending, setExtending] = useState(false);
  useAppReady(true);
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now() + skew), 1000);
    return () => clearInterval(t);
  }, [skew]);

  // D-253: the trail of the page asked for (at its new address, if it moved), without its record's name (the paused
  // Console doesn't load it). Its crumbs are words here, not links, so no cohort is needed to write them.
  const trail = crumbsOf(placeOf(movedAdminPath(pathname, '') ?? pathname), { cohortId: '' });
  const vm = activeVM(session, now);
  const extend = bannerVM(session, now, false).extend;

  return (
    <div className={s.paused} data-r2-shell="">
      <div className={a.column}>
        <header className={a.bar}>
          <AcademyLogo />
          <nav aria-label="Breadcrumb" className={phone ? a.srOnly : a.crumbs}>
            <span>Admin</span>
            {trail.map((c, i) => (
              <Fragment key={i}>
                <span aria-hidden="true">/</span>
                {i === trail.length - 1 ? (
                  <b className={a.here} aria-current="page">
                    {c.label}
                  </b>
                ) : (
                  <span>{c.label}</span>
                )}
              </Fragment>
            ))}
          </nav>
          <span className={a.spacer} />
          {phone ? null : (
            <Status tone="ok" className={a.env}>
              {ENVIRONMENT}
            </Status>
          )}
        </header>
        <main className={a.main}>
          <Page>
            <PageHead title={MASQ_COPY.paused} />
            <div className={k.gms}>
              <Card title={MASQ_COPY.active.title} right={<Pill tone="warn">{vm.left}</Pill>}>
                <div className={k.col}>
                  <KV rows={vm.rows} />
                  <div className={k.row}>
                    <ButtonLink to="/">{MASQ_COPY.active.open}</ButtonLink>
                    <Button disabled={extend.disabled} title={extend.title} onClick={() => setExtending(true)}>
                      {extend.label}
                    </Button>
                    <Button kind="danger" className={s.primary} onClick={() => void masquerade.exit().catch(() => {})}>
                      {MASQ_COPY.exit}
                    </Button>
                  </div>
                </div>
              </Card>
              <Rules />
            </div>
          </Page>
        </main>
      </div>
      {extending ? (
        <ReasonDialog
          mode="extend"
          onCancel={() => setExtending(false)}
          onSubmit={async (reason) => {
            await masquerade.extend(reason);
            setExtending(false);
          }}
        />
      ) : null}
    </div>
  );
}
