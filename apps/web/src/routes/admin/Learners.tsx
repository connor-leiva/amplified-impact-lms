import { useCallback, useMemo, useState } from 'react';
import clsx from 'clsx';
import { useNavigate, useParams } from 'react-router';

import { Icon } from '../../components/Icon';
import { Button } from '../../components/r2/Button';
import { Drawer } from '../../components/r2/Drawer';
import type { MenuEntry } from '../../components/r2/Menu';
import { Page } from '../../components/r2/Page';
import { Status } from '../../components/r2/Status';
import { Table } from '../../components/r2/Table';
import type { Column } from '../../components/r2/Table';
import { Avatar, Bar, Find, KV, PageHead, Pill, Sel, Tabs, Two, k, Stamp } from '../../components/r2/kit';
import { useToaster } from '../../components/primitives/Toaster';
import { refusal, useDb, useEmailLearner, useMutate, useNow } from '../../data/hooks';
import { useViewportWidth } from '../../shell/hooks';
import { useMasqueradeEntry } from '../console/useMasqueradeEntry';
import { LEARNERS_UI, R2_TIER_FILTERS, learnerR2Details, learnersR2VM, learnersVM } from './Learners.vm';
import type { LearnerR2Row, R2TierFilter, TeamR2Row } from './Learners.vm';
import { cohortLabel } from '../../data/admin-shell';
import s from './Learners.module.css';
import { personPath, teamPath } from '../../shell/admin/addresses';

// Admin Learners & Teams `/admin/learners` on the Admin redesign R2 (D-160 R2-3): the signed-off
// mockup's `Learners` (AdminRedesign.jsx), drawn from `learnersR2VM`. Every write is the same @ai/core
// mutation as before; only the presentation changed.
//
//   - A learner's row opens their details (the old drawer, now R2's): tier, team, joined, last active,
//     each AI Employee's progress, and Upgrade to Team Tier / Move to Agent Tier (`setLearnerTier`) and
//     Send Nudge / Resend Invite, which send a real email (D-247: `POST /api/learners/:id/nudge` and
//     `…/resend-invite`; the fixture's `nudgeLearners`).
//   - "Open user record" opens the learner's User page and the Teams tab's "Open workspace" the team's
//     Workspace (D-160 R2-1c part 2): a learner's id is their `users.id` and a team's its `teams.id`,
//     the ids those pages take. "Masquerade…" opens the reason dialog (D-162 3b): Owner and Admin only.
//   - The head is the mockup's exactly: no page-level "…" (D-160 R2-3a, the shepherd's eye check). The
//     old screens' Export roster and the Needs Attention list with Nudge All have no surface the mockup
//     draws, so they are not offered here (Needs Connor's call); each learner's nudge stays in their
//     details drawer.

function Learners() {
  const db = useDb();
  const now = useNow();
  const mutate = useMutate();
  const emailLearner = useEmailLearner();
  const { toast } = useToaster();
  const phone = useViewportWidth() < 768;
  const navigate = useNavigate();
  const entry = useMasqueradeEntry();
  // D-253: Cohort › People. The cohort is the address's (`/admin/cohort/:cohortId/people`); it was `dec26`'s alone.
  const { cohortId = '' } = useParams();

  const [tab, setTab] = useState<'learners' | 'teams'>('learners');
  const [q, setQ] = useState('');
  const [tier, setTier] = useState<R2TierFilter>('All tiers');
  const [sel, setSel] = useState<string | null>(null);

  const vm = useMemo(() => learnersR2VM(db, now, { tier, q }, cohortId), [db, now, tier, q, cohortId]);
  const person = useMemo(() => learnersVM(db, now, { ...LEARNERS_UI, sel }).drawer.person, [db, now, sel]);
  const details = person ? learnerR2Details(db, person) : null;

  const changeTier = useCallback(async () => {
    if (!person) return;
    const e = refusal(await mutate('setLearnerTier', { userId: person.id, tier: person.tierTarget }));
    if (e) toast(e, 'warn');
  }, [mutate, person, toast]);

  // D-247 (H-9): Send Nudge and Resend Invite send a real email. The toast is the server's and says what
  // happened: sent, email not set up, or failed. The button waits while it sends, so one press is one email.
  const [sending, setSending] = useState(false);
  const nudge = useCallback(
    async (userId: string, invited: boolean) => {
      setSending(true);
      try {
        const e = refusal(await emailLearner(invited ? 'invite' : 'nudge', userId));
        if (e) toast(e, 'warn');
      } finally {
        setSending(false);
      }
    },
    [emailLearner, toast],
  );

  const filtered = q !== '' || tier !== 'All tiers';

  const cols: Column<LearnerR2Row>[] = [
    {
      key: 'name',
      label: 'Learner',
      width: 'minmax(200px,1.5fr)',
      value: (u) => u.name,
      cell: (u) => (
        <div className={clsx(k.row, k.nw, s.who)}>
          <Avatar initials={u.initials} />
          <Two a={u.name} b={u.email} />
        </div>
      ),
    },
    { key: 'team', label: 'Team', width: 'minmax(140px,1fr)', hideLap: true, value: (u) => u.team },
    {
      key: 'tier',
      label: 'Tier',
      width: '72px',
      value: (u) => u.tier,
      cell: (u) => <Pill tone={u.tier === 'Team' ? 'warn' : 'ok'}>{u.tier}</Pill>,
    },
    {
      key: 'builds',
      label: 'Builds deployed',
      width: '160px',
      value: (u) => (u.of ? u.deployed / u.of : 0),
      cell: (u) =>
        vm.started ? (
          <span className={clsx(k.row, k.nw, s.builds)}>
            <Bar pct={u.of ? (u.deployed / u.of) * 100 : 0} pct2={0} />
            <span className={clsx(k.tn, s.of)}>
              {u.deployed} of {u.of}
            </span>
          </span>
        ) : (
          <span className={k.mu}>Not started</span>
        ),
    },
    {
      key: 'last',
      label: 'Last active',
      width: '128px',
      noSort: true,
      value: (u) => u.lastAt,
      cell: (u) => <Stamp v={u.last} two />,
    },
  ];

  const teamCols: Column<TeamR2Row>[] = [
    { key: 'name', label: 'Team', width: 'minmax(180px,1.5fr)', value: (t) => t.name },
    { key: 'owner', label: 'Owner', width: 'minmax(120px,1fr)', value: (t) => t.owner },
    { key: 'plan', label: 'Plan', width: '160px', hideLap: true, value: (t) => t.plan },
    {
      key: 'seats',
      label: 'Seats',
      width: '160px',
      value: (t) => t.used,
      cell: (t) => (
        <span className={clsx(k.row, k.nw, s.builds)}>
          <Bar
            pct={t.seats ? Math.min(100, (t.used / t.seats) * 100) : 0}
            kind={t.seats && t.used / t.seats >= 0.9 ? 'hot' : 'ok'}
          />
          <span className={clsx(k.tn, s.seatsOf)}>
            {t.used} of {t.seats}
          </span>
        </span>
      ),
    },
    { key: 'invites', label: 'Pending invites', width: '104px', value: (t) => t.invites },
  ];

  const learnerMenu = (u: LearnerR2Row): MenuEntry[] => [
    { label: 'Open learner details', onSelect: () => setSel(u.id) },
    { label: 'Open user record', onSelect: () => navigate(personPath(u.id)) },
    ...entry.item('Masquerade…', { id: u.id, name: u.name, workspace: u.team }),
  ];

  const cohortRow = db.cohorts.find((c) => c.id === cohortId);
  // R-5 audit (D-267): the cohort's own name with its noun once ("January 2027 Cohort"), as the head names it.
  const cohortName = cohortRow ? cohortLabel(cohortRow) : 'current Cohort';

  return (
    <Page>
      <PageHead
        title="Learners & Teams"
        description={`Everyone enrolled in the ${cohortName}, with build progress. Account and billing support lives in Workspaces and Users.`}
      />

      <Tabs
        label="Section"
        phone={phone}
        value={tab}
        onChange={setTab}
        tabs={[
          { id: 'learners', label: 'Learners', count: vm.learnersCount },
          { id: 'teams', label: 'Teams', count: vm.teamsCount },
        ]}
      />

      {tab === 'learners' ? (
        <>
          <div className={k.row}>
            <Find value={q} onChange={setQ} placeholder="Filter by name or team" />
            <Sel aria-label="Tier" value={tier} onChange={(e) => setTier(e.target.value as R2TierFilter)}>
              {R2_TIER_FILTERS.map((o) => (
                <option key={o}>{o}</option>
              ))}
            </Sel>
          </div>
          <Table
            label="Learners"
            cols={cols}
            rows={vm.rows}
            rowKey={(u) => u.id}
            onRow={(u) => setSel(u.id)}
            filtered={filtered}
            menu={learnerMenu}
            empty={{ icon: 'r2Learners', title: 'No learners enrolled', body: 'Learners appear here after checkout.' }}
          />
        </>
      ) : (
        <Table
          label="Teams"
          cols={teamCols}
          rows={vm.teams}
          rowKey={(t) => t.id}
          menu={(t) => [{ label: 'Open workspace', onSelect: () => navigate(teamPath(t.id)) }]}
          empty={{ icon: 'r2Workspaces', title: 'No teams yet' }}
        />
      )}

      {person && details ? (
        <Drawer
          title={person.name}
          description={person.email}
          leading={<Avatar initials={vm.rows.find((r) => r.id === person.id)?.initials ?? person.name.slice(0, 2)} />}
          onClose={() => setSel(null)}
          foot={
            <>
              <Button kind={person.tierUpgrade ? 'primary' : 'secondary'} onClick={() => void changeTier()}>
                {person.tierLabel}
              </Button>
              <Button
                disabled={sending}
                aria-busy={sending || undefined}
                onClick={() => void nudge(person.id, person.invited)}
              >
                {person.nudgeLabel}
              </Button>
            </>
          }
        >
          <KV rows={details.facts} />
          <div className={clsx(k.col, k.colM)}>
            <h3 className={s.h3}>Build Progress</h3>
            <div className={s.mods}>
              {details.mods.map((m) => (
                <div key={m.id} className={clsx(k.li, s.mod)}>
                  <span className={clsx(s.modName, !m.access && k.mu)}>{m.name}</span>
                  {m.access ? (
                    <Status tone={m.buildTone}>{m.build}</Status>
                  ) : (
                    <span className={clsx(k.row, k.nw, k.mu, s.locked)}>
                      <Icon name="r2Lock" size={14} strokeWidth={1.75} />
                      {m.build}
                    </span>
                  )}
                  {m.runtime ? (
                    <Pill tone={m.runtime === 'Deployed' ? 'ok' : m.runtime === 'Paused' ? 'warn' : 'bad'}>
                      {m.runtime}
                    </Pill>
                  ) : null}
                </div>
              ))}
            </div>
          </div>
        </Drawer>
      ) : null}
      {entry.dialog}
    </Page>
  );
}

export function Component() {
  return <Learners />;
}

export default Component;
