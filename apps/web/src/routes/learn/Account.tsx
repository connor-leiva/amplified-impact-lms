// /learn/account (D-178): the learner's Account page, artboard 8 of the signed-off mockup (20/21): the plan
// and its seats, the profile, and what the plan includes. Markup only: every string and date is computed in
// Account.vm.ts, from reads that already exist (accountData.ts) and what the shell hands every screen.
//
// No new write. "Manage billing" opens Stripe's billing portal through the existing route (the account
// owner's); "Change password" goes to the existing password page (/account, D-132); "Resend invite" is
// Team Hub's own (the same confirmation, the same words). Amounts, receipts and the card stay in Stripe's
// portal, and nothing here edits the profile, so its fields are read only and there is no Save.

import { Link } from 'react-router';
import { learnerOf } from '@ai/core/learner';
import { Icon } from '../../components/Icon';
import { useToaster } from '../../components/primitives/Toaster';
import { useAccount } from './accountData';
import { accountVM } from './Account.vm';
import type { AccountVM, ProfileVM, SeatsVM } from './Account.vm';
import { useLearn } from './data';
import { Tile } from './parts';
import s from './Learn.module.css';
import a from './Account.module.css';

function Seats({ vm }: { vm: SeatsVM }) {
  const { toast } = useToaster();
  return (
    <div className={s.hr}>
      <span className={s.eyb}>
        <Icon name="r2Users" size={14} strokeWidth={1.75} />
        {vm.label}
      </span>
      <div className={`${s.cdn} ${a.sm}`}>
        <span>
          <b>{vm.used}</b>
          <em>{vm.of}</em>
        </span>
      </div>
      <div className={a.seats} aria-hidden="true">
        {vm.segments.map((u, i) => (
          <i key={i} data-u={u ? 'true' : undefined} />
        ))}
      </div>
      {vm.note ? <span className={s.dl}>{vm.note}</span> : null}
      {vm.resend ? (
        <div className={s.row} style={{ paddingTop: 4 }}>
          {/* Team Hub's Resend Invite, as it is today: the same confirmation, no new email path. */}
          <button type="button" className={s.b} onClick={() => toast(`Invite resent to ${vm.resend!.email}`)}>
            {vm.resend.label}
          </button>
        </div>
      ) : null}
    </div>
  );
}

function Field({ id, label, value, hint, type, autoComplete }: { id: string; label: string; value: string; hint?: string | null; type?: string; autoComplete?: string }) {
  return (
    <div className={a.lab}>
      <label htmlFor={id}>{label}</label>
      <input id={id} className={a.in} type={type} value={value} readOnly autoComplete={autoComplete} aria-describedby={hint ? `${id}-hint` : undefined} />
      {hint ? (
        <span className={`${s.me} ${a.hint}`} id={`${id}-hint`}>
          {hint}
        </span>
      ) : null}
    </div>
  );
}

function Profile({ vm }: { vm: ProfileVM }) {
  return (
    <section className={s.cd} aria-labelledby="lv-pr-t">
      <div className={s.cdh}>
        <h2 className={`${s.h2} ${s.grow}`} id="lv-pr-t">
          {vm.heading}
        </h2>
      </div>
      <div className={`${s.cdb} ${s.col}`}>
        <div className={a.frm}>
          <Field id="lv-name" label={vm.name.label} value={vm.name.value} autoComplete="name" />
          <Field id="lv-email" label={vm.email.label} value={vm.email.value} hint={vm.email.hint} type="email" autoComplete="email" />
          {vm.role ? <Field id="lv-role" label={vm.role.label} value={vm.role.value} hint={vm.role.hint} /> : null}
        </div>
      </div>
      {vm.password ? (
        <div className={s.li}>
          <Tile icon="lvKey" tone="forest" size={28} />
          <div className={s.colZ} style={{ flex: '1 1 0%' }}>
            <span className={s.w5}>{vm.password.label}</span>
            {vm.password.changed ? <span className={s.me}>{vm.password.changed}</span> : null}
          </div>
          <Link className={`${s.b} ${s.bi}`} to={vm.password.action.href}>
            {vm.password.action.label}
          </Link>
        </div>
      ) : null}
    </section>
  );
}

function Included({ vm }: { vm: NonNullable<AccountVM['included']> }) {
  return (
    <section className={s.cd} aria-labelledby="lv-inc-t">
      <div className={s.cdh}>
        <h2 className={s.h2} id="lv-inc-t">
          {vm.heading}
        </h2>
      </div>
      <div className={s.cdb}>
        <ul className={`${s.ul} ${a.inc}`}>
          {vm.items.map((t) => (
            <li key={t}>
              <span className={a.ck}>
                <Icon name="r2Check" size={16} strokeWidth={2.2} />
              </span>
              <span>{t}</span>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

export function Account({ vm }: { vm: AccountVM }) {
  return (
    <div className={s.pg}>
      <div className={s.phd}>
        <div className={s.pht}>
          <h1 className={s.h0}>{vm.title}</h1>
          <p className={s.lede}>{vm.lede}</p>
        </div>
      </div>

      {vm.plan || vm.seats ? (
        <section className={`${s.cd} ${s.hero} ${vm.seats && vm.plan ? '' : s.heroOne}`} aria-labelledby={vm.plan ? 'lv-plan-t' : undefined} aria-label={vm.plan ? undefined : vm.seats?.label}>
          {vm.plan ? (
            <div className={s.hl}>
              <div className={`${s.row} ${s.nw}`} style={{ gap: 14 }}>
                <Tile icon="card" tone="forest" size={44} />
                <div className={s.colZ}>
                  <span className={s.eyb}>{vm.plan.eyebrow}</span>
                  <h2 className={s.ht} id="lv-plan-t">
                    {vm.plan.name}
                  </h2>
                </div>
              </div>
              {vm.plan.line ? <span className={s.dl}>{vm.plan.line}</span> : null}
              {vm.plan.billing ? (
                <div className={s.hb}>
                  <a className={`${s.b} ${s.bi}`} href={vm.plan.billing.href}>
                    <Icon name="lvExternal" size={14} strokeWidth={1.75} />
                    {vm.plan.billing.label}
                  </a>
                </div>
              ) : null}
            </div>
          ) : null}
          {vm.seats ? <Seats vm={vm.seats} /> : null}
        </section>
      ) : null}

      {vm.included ? (
        <div className={s.gms}>
          <Profile vm={vm.profile} />
          <Included vm={vm.included} />
        </div>
      ) : (
        <Profile vm={vm.profile} />
      )}
    </div>
  );
}

export function Component() {
  const { course, db, viewer } = useLearn();
  const read = useAccount();
  const me = learnerOf(db, viewer.actor.kind === 'learner' ? viewer.actor.userId : null);
  return <Account vm={accountVM(read, db, me, course)} />;
}

export default Component;
