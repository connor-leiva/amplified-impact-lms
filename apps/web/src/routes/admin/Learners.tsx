import { useCallback, useMemo, useRef, useState } from 'react';

import { Icon } from '../../components/Icon';
import { StatusToken } from '../../components/StatusToken';
import { Avatar } from '../../components/primitives/Avatar';
import { Drawer } from '../../components/primitives/Drawer';
import { useToaster } from '../../components/primitives/Toaster';
import { useDb, useMutate, useNow } from '../../data/hooks';
import { LEARNERS_UI, learnersVM } from './Learners.vm';
import type { DrawerPerson, LearnersUi } from './Learners.vm';
import s from './Learners.module.css';

// Admin Learners & Teams `/admin/learners`, ported from design-reference/Admin Learners.dc.html.
// Contract: SCREENS § 4.5, phase 06 § 6.1.
//
// Markup only: every string, count, pill and bar width comes from `learnersVM`, and both writes go
// through `useMutate`, which already raises the toast. Casey Lin (`st1`, Owner) passes every staff
// permission, but the screen still calls the mutations rather than touching the snapshot.
//
// The learner rows carry `role="row"` with the person's name as their accessible name — the
// compliance harness selects them that way (`admin-learner-drawer` clicks /Jamie Ortiz/) — so the
// grid around them declares `role="table"` and its cells `role="cell"`, which is also what axe's
// `aria-required-parent` needs.

/**
 * `act.download` in the prototype: a Blob behind a transient anchor. The object URL is revoked on
 * the reference's 1500 ms delay, not immediately — revoking inside the click can abort the save
 * before the browser has read the blob.
 *
 * Phase 08 § 8.2 does not touch this. Export Roster is GENERATED from the snapshot by `csv()`; it
 * has no object in the bucket, so there is nothing to presign.
 */
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

  const [ui, setUi] = useState<LearnersUi>(LEARNERS_UI);
  const patch = useCallback((next: Partial<LearnersUi>) => setUi((u) => ({ ...u, ...next })), []);

  const vm = useMemo(() => learnersVM(db, now, ui), [db, now, ui]);

  // The panel keeps its contents through the 240ms slide-out, exactly as the reference's
  // `this.last` does. A cache of what was last rendered, never a source of truth.
  const lastPerson = useRef<DrawerPerson | null>(null);
  if (vm.drawer.person) lastPerson.current = vm.drawer.person;
  const dp = vm.drawer.person ?? lastPerson.current;

  const closeDrawer = useCallback(() => patch({ sel: null }), [patch]);

  const setTier = useCallback(
    async (person: DrawerPerson) => {
      const r = await mutate('setLearnerTier', { userId: person.id, tier: person.tierTarget });
      if (r.error) toast(r.error, 'warn');
    },
    [mutate, toast],
  );

  const nudge = useCallback(
    async (person: DrawerPerson) => {
      // An invite has no learner to nudge yet, so the reference only confirms the resend.
      if (person.invited) {
        toast(`Invite resent to ${person.email}`);
        return;
      }
      const r = await mutate('nudgeLearners', { userIds: [person.id] });
      if (r.error) toast(r.error, 'warn');
    },
    [mutate, toast],
  );

  const exportRoster = useCallback(() => {
    downloadText(vm.csvName, vm.csvText, 'text/csv');
    toast('Roster exported');
  }, [toast, vm.csvName, vm.csvText]);

  return (
    <>
      <div className={s.page}>
        <div className={s.head}>
          <div>
            <h1 className={s.h1}>Learners &amp; Teams</h1>
            <p className={s.sub}>December 2026 Cohort · seat and progress data syncs from the portal</p>
          </div>
          <button type="button" className={s.export} onClick={exportRoster}>
            <Icon name="download" size={15} strokeWidth={1.8} />
            Export Roster
          </button>
        </div>

        <div className={s.stats}>
          {vm.stats.map((st) => (
            <section key={st.label} className={s.stat}>
              <div className={s.statLabel}>{st.label}</div>
              <div className={s.statValue} data-amber={st.amber ? 'true' : undefined}>
                {st.value}
              </div>
            </section>
          ))}
        </div>

        <div className={s.controls}>
          <div className={s.seg} role="group" aria-label="View">
            {vm.tabs.map((t) => (
              <button
                key={t.key}
                type="button"
                className={s.segOpt}
                data-on={t.on ? 'true' : undefined}
                aria-pressed={t.on}
                onClick={() => patch({ tab: t.key })}
              >
                {t.label}
              </button>
            ))}
          </div>
          {vm.isLearners ? (
            <>
              <div className={s.seg} role="group" aria-label="Tier">
                {vm.tierFilters.map((t) => (
                  <button
                    key={t.key || 'all'}
                    type="button"
                    className={s.segOpt}
                    data-kind="tier"
                    data-on={t.on ? 'true' : undefined}
                    aria-pressed={t.on}
                    onClick={() => patch({ tier: t.key })}
                  >
                    {t.label}
                  </button>
                ))}
              </div>
              <div className={s.searchWrap}>
                <Icon name="search" size={15} strokeWidth={1.9} color="var(--text-tertiary)" className={s.searchIcon} />
                <input
                  className={s.search}
                  value={vm.q}
                  placeholder="Search name, email or team"
                  aria-label="Search name, email or team"
                  onChange={(e) => patch({ q: e.target.value })}
                />
              </div>
            </>
          ) : null}
        </div>

        {vm.isLearners ? (
          <section className={s.card}>
            <div className={s.scroll} data-phone="tscroll">
              <div className={s.table} role="table" aria-label="Learners" data-phone="tmin">
                <div className={s.headRow} role="row" data-phone="thead">
                  <span role="columnheader">Learner</span>
                  <span role="columnheader">Tier</span>
                  <span role="columnheader">Team · Role</span>
                  <span role="columnheader">AI Employees</span>
                  <span role="columnheader">Last Active</span>
                  <span role="columnheader">Status</span>
                  <span aria-hidden="true" />
                </div>
                {vm.rows.map((r) => (
                  <div
                    key={r.id}
                    role="row"
                    aria-label={r.name}
                    tabIndex={0}
                    className={s.row}
                    data-phone="card"
                    data-persona={r.persona ? 'true' : undefined}
                    onClick={() => patch({ sel: r.id })}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        patch({ sel: r.id });
                      }
                    }}
                  >
                    <div role="cell" className={s.learnerCell} data-phone="cell-lead">
                      <Avatar id={r.id} name={r.name} size={30} invited={r.invited} />
                      <div className={s.nameStack}>
                        <div className={s.name}>{r.name}</div>
                        <div className={s.email}>{r.email}</div>
                      </div>
                    </div>
                    <span role="cell" className={s.tierPill} data-tier={r.tierTone} data-phone="cell-tag">
                      {r.tier}
                    </span>
                    <div role="cell" className={s.teamCell} data-phone="cell" data-label="Team · Role">
                      {r.team}
                      <div className={s.roleLine}>{r.role}</div>
                    </div>
                    <div role="cell" className={s.employeesCell} data-phone="cell" data-label="AI Employees">
                      <div className={s.dots}>
                        {r.dots.map((d) => (
                          <span key={d.id} title={d.title} className={s.dot} data-tone={d.tone} />
                        ))}
                      </div>
                      <span className={s.count}>{r.count}</span>
                    </div>
                    <span role="cell" className={s.last} data-phone="cell" data-label="Last Active">
                      {r.last}
                    </span>
                    <span role="cell" className={s.statusCell} data-tone={r.statusTone}>
                      <span className={s.statusDot} />
                      {r.status}
                    </span>
                    <span role="cell" className={s.chevCell} data-phone="cell-chev">
                      <Icon name="chevR" size={16} strokeWidth={2} color="var(--text-tertiary)" />
                    </span>
                  </div>
                ))}
              </div>
            </div>
            <div className={s.foot}>{vm.footNote}</div>
          </section>
        ) : null}

        {vm.isTeams ? (
          <section className={s.card}>
            <div className={s.scroll} data-phone="tscroll">
              <div className={s.teamsTable} role="table" aria-label="Teams" data-phone="tmin">
                <div className={s.teamsHeadRow} role="row" data-phone="thead">
                  <span role="columnheader">Team</span>
                  <span role="columnheader">Owner</span>
                  <span role="columnheader">Seats</span>
                  <span role="columnheader">Deployed</span>
                  <span role="columnheader">Pending Invites</span>
                </div>
                {vm.teams.map((t) => (
                  <div key={t.id} role="row" className={s.teamsRow} data-phone="card">
                    <div role="cell" className={s.teamName}>
                      {t.name}
                    </div>
                    <div role="cell" className={s.teamOwner} data-phone="cell" data-label="Owner">
                      {t.owner}
                    </div>
                    <div role="cell" className={s.seatsCell} data-phone="cell" data-label="Seats">
                      <div className={s.seatsTrack}>
                        <div className={s.seatsFill} style={{ '--w': t.fill } as React.CSSProperties} />
                      </div>
                      <span className={s.seatsLabel}>{t.seats}</span>
                    </div>
                    <span role="cell" className={s.teamDeployed} data-phone="cell" data-label="Deployed">
                      {t.deployed}
                    </span>
                    <span
                      role="cell"
                      className={s.teamInvites}
                      data-pending={t.pending ? 'true' : undefined}
                      data-phone="cell"
                      data-label="Pending Invites"
                    >
                      {t.invites}
                    </span>
                  </div>
                ))}
              </div>
            </div>
            <div className={s.foot}>{vm.teamsNote}</div>
          </section>
        ) : null}
      </div>

      <Drawer
        open={vm.drawer.open}
        onClose={closeDrawer}
        title={dp ? dp.name : ''}
        description={dp ? dp.email : undefined}
        width={440}
        variant="surface"
        leading={dp ? <Avatar id={dp.id} name={dp.name} size={40} /> : undefined}
        footer={
          dp ? (
            <div className={s.dwFoot}>
              <button
                type="button"
                className={s.tierBtn}
                data-upgrade={dp.tierUpgrade ? 'true' : 'false'}
                onClick={() => void setTier(dp)}
              >
                {dp.tierLabel}
              </button>
              <button type="button" className={s.nudgeBtn} onClick={() => void nudge(dp)}>
                {dp.nudgeLabel}
              </button>
            </div>
          ) : undefined
        }
      >
        {dp ? (
          <div className={s.dwBody}>
            <div className={s.facts}>
              {dp.facts.map((fa) => (
                <div key={fa.k} className={s.fact}>
                  <div className={s.factLabel}>{fa.k}</div>
                  <div className={s.factValue}>{fa.v}</div>
                </div>
              ))}
            </div>

            <div>
              <div className={s.dwModsLabel}>Build Progress</div>
              <div className={s.dwMods}>
                {dp.mods.map((m) => (
                  <div key={m.id} className={s.dwMod} data-phone="wrap">
                    <span className={s.dwModName} data-phone="cell" data-locked={m.access ? undefined : 'true'}>
                      {m.name}
                    </span>
                    {/*
                      The tokens sit in block hosts — DECISIONS.md D-013, the same artifact as the
                      Team Hub drawer. The prototype renders every imported component inside a
                      block-level wrapper, so a pill's LINE BOX, not its 22px border box, sets the
                      row height.
                    */}
                    {m.access ? (
                      <>
                        <span className={s.dwTokenHost}>
                          <StatusToken kind="build" state={m.build.state} n={m.build.n} total={m.build.total} compact />
                        </span>
                        <span className={s.dwTokenHost}>
                          <StatusToken kind="runtime" state={m.runtime} />
                        </span>
                      </>
                    ) : (
                      <span className={s.dwTokenHost}>
                        <StatusToken kind="access" state="locked" />
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        ) : null}
      </Drawer>
    </>
  );
}

export function Component() {
  return <Learners />;
}

export default Component;
