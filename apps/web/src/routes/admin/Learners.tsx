import { useCallback, useMemo, useState } from 'react';
import clsx from 'clsx';
import { useNavigate } from 'react-router';
import { userPath, workspacePath } from '@ai/core';

import { Icon } from '../../components/Icon';
import { Button } from '../../components/r2/Button';
import { Drawer } from '../../components/r2/Drawer';
import { Menu } from '../../components/r2/Menu';
import type { MenuEntry } from '../../components/r2/Menu';
import { Modal } from '../../components/r2/Modal';
import { Page } from '../../components/r2/Page';
import { Status } from '../../components/r2/Status';
import { Table } from '../../components/r2/Table';
import type { Column } from '../../components/r2/Table';
import { Avatar, Bar, Find, KV, PageHead, Pill, Sel, Tabs, Two, k } from '../../components/r2/kit';
import { useToaster } from '../../components/primitives/Toaster';
import { useDb, useMutate, useNow } from '../../data/hooks';
import { useViewportWidth } from '../../shell/hooks';
import { useMasqueradeEntry } from '../console/useMasqueradeEntry';
import { overviewVM } from './Overview.vm';
import { LEARNERS_UI, R2_TIER_FILTERS, learnerR2Details, learnersR2VM, learnersVM } from './Learners.vm';
import type { LearnerR2Row, R2TierFilter, TeamR2Row } from './Learners.vm';
import s from './Learners.module.css';

// Admin Learners & Teams `/admin/learners` on the Admin redesign R2 (D-160 R2-3): the signed-off
// mockup's `Learners` (AdminRedesign.jsx), drawn from `learnersR2VM`. Every write is the same @ai/core
// mutation as before; only the presentation changed.
//
//   - A learner's row opens their details (the old drawer, now R2's): tier, team, joined, last active,
//     each AI Employee's progress, and Upgrade to Team Tier / Move to Agent Tier (`setLearnerTier`) and
//     Send Nudge / Resend Invite (`nudgeLearners`).
//   - "Open user record" opens the learner's User page and the Teams tab's "Open workspace" the team's
//     Workspace (D-160 R2-1c part 2): a learner's id is their `users.id` and a team's its `teams.id`,
//     the ids those pages take. "Masquerade…" opens the reason dialog (D-162 3b): Owner and Admin only.
//   - The page's "…" keeps what the old screens offered and the mockup does not draw: Export roster,
//     and the Overview's Needs Attention list with its nudges (Needs Connor's call, D-160 R2-3).

/** Phase 08 § 8.2 does not touch this: the roster is generated from the snapshot, never stored. */
function downloadText(name: string, text: string, mime: string): void {
  const url = URL.createObjectURL(new Blob([text], { type: mime }));
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1500);
}

function Learners() {
  const db = useDb();
  const now = useNow();
  const mutate = useMutate();
  const { toast } = useToaster();
  const phone = useViewportWidth() < 768;
  const navigate = useNavigate();
  const entry = useMasqueradeEntry();

  const [tab, setTab] = useState<'learners' | 'teams'>('learners');
  const [q, setQ] = useState('');
  const [tier, setTier] = useState<R2TierFilter>('All tiers');
  const [sel, setSel] = useState<string | null>(null);
  const [attention, setAttention] = useState(false);

  const vm = useMemo(() => learnersR2VM(db, now, { tier, q }), [db, now, tier, q]);
  const person = useMemo(() => learnersVM(db, now, { ...LEARNERS_UI, sel }).drawer.person, [db, now, sel]);
  const details = person ? learnerR2Details(db, person) : null;
  const risk = useMemo(() => (attention ? overviewVM(db, now).risk : []), [attention, db, now]);

  const changeTier = useCallback(async () => {
    if (!person) return;
    const r = await mutate('setLearnerTier', { userId: person.id, tier: person.tierTarget });
    if (r.error) toast(r.error, 'warn');
  }, [mutate, person, toast]);

  const nudge = useCallback(
    async (ids: string[], invitedEmail?: string) => {
      // An invite has no learner to nudge yet, so the screen only confirms the resend, as before.
      if (invitedEmail) {
        toast(`Invite resent to ${invitedEmail}`);
        return;
      }
      if (!ids.length) return;
      const r = await mutate('nudgeLearners', { userIds: ids });
      if (r.error) toast(r.error, 'warn');
    },
    [mutate, toast],
  );

  const exportRoster = useCallback(() => {
    const v = learnersVM(db, now, LEARNERS_UI);
    downloadText(v.csvName, v.csvText, 'text/csv');
    toast('Roster exported');
  }, [db, now, toast]);

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
    { key: 'last', label: 'Last active', width: '128px', noSort: true, value: (u) => u.lastAt, cell: (u) => u.last },
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
          <Bar pct={t.seats ? Math.min(100, (t.used / t.seats) * 100) : 0} kind={t.seats && t.used / t.seats >= 0.9 ? 'hot' : 'ok'} />
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
    { label: 'Open user record', onSelect: () => navigate(userPath(u.id)) },
    ...entry.item('Masquerade…', { id: u.id, name: u.name, workspace: u.team }),
  ];

  const pageMenu: MenuEntry[] = [
    { label: 'Export roster', icon: 'r2Download', onSelect: exportRoster },
    { label: 'Learners who need attention', icon: 'r2Learners', onSelect: () => setAttention(true) },
  ];

  const cohortName = db.cohorts.find((c) => c.id === 'dec26')?.name ?? db.cohorts[0]?.name ?? 'current';

  return (
    <Page>
      <div className={s.head}>
        <PageHead
          title="Learners & Teams"
          description={`Everyone enrolled in the ${cohortName} Cohort, with build progress. Account and billing support lives in Workspaces and Users.`}
        />
        <Menu
          label="Learners & Teams actions"
          items={pageMenu}
          className={s.more}
          trigger={(t) => (
            <button type="button" className={k.ib} aria-label="More actions" {...t.props} onClick={t.toggle}>
              <Icon name="r2More" size={16} strokeWidth={2.6} />
            </button>
          )}
        />
      </div>

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
          menu={(t) => [{ label: 'Open workspace', onSelect: () => navigate(workspacePath(t.id)) }]}
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
              <Button onClick={() => void nudge([person.id], person.invited ? person.email : undefined)}>
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
                  {m.runtime ? <Pill tone={m.runtime === 'Deployed' ? 'ok' : m.runtime === 'Paused' ? 'warn' : 'bad'}>{m.runtime}</Pill> : null}
                </div>
              ))}
            </div>
          </div>
        </Drawer>
      ) : null}

      {attention ? (
        <Modal
          title="Needs Attention"
          width={560}
          onClose={() => setAttention(false)}
          foot={
            <>
              <Button onClick={() => setAttention(false)}>Close</Button>
              {risk.length ? (
                <Button kind="primary" icon="r2Announce" onClick={() => void nudge(risk.map((r) => r.id))}>
                  Nudge All
                </Button>
              ) : null}
            </>
          }
        >
          <p className={clsx(k.p, k.s2)}>No build progress or inactive for 5+ days</p>
          {risk.length ? (
            <div className={s.risk}>
              {risk.map((r) => (
                <div key={r.id} className={clsx(k.li, s.riskRow)}>
                  <div className={clsx(k.col, k.col0, s.riskWho)}>
                    <span className={k.w5}>{r.name}</span>
                    <span className={k.me}>{r.sub}</span>
                  </div>
                  <Pill tone="warn">{r.reason}</Pill>
                  <Button onClick={() => void nudge([r.id])}>{r.btn}</Button>
                </div>
              ))}
            </div>
          ) : (
            <p className={clsx(k.p, k.mu)}>Everyone is moving. Nice.</p>
          )}
        </Modal>
      ) : null}
      {entry.dialog}
    </Page>
  );
}

export function Component() {
  return <Learners />;
}

export default Component;
