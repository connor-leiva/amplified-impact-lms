import { useCallback, useMemo, useRef, useState } from 'react';
import type { LearnerRole } from '@ai/core';

import { Icon } from '../../components/Icon';
import { StatusToken } from '../../components/StatusToken';
import { Avatar } from '../../components/primitives/Avatar';
import { Drawer } from '../../components/primitives/Drawer';
import { Modal } from '../../components/primitives/Modal';
import { useToaster } from '../../components/primitives/Toaster';
import { useDb, useMutate, useNow, useViewer } from '../../data/hooks';
import { TEAM_HUB_UI, teamHubVM } from './TeamHub.vm';
import type { DrawerMember, TeamHubUi } from './TeamHub.vm';
import s from './TeamHub.module.css';

// Portal Team Hub `/team`, ported from design-reference/Portal Team Hub.dc.html.
// Contract: SCREENS § 3.4, phase 05 § 5.2.
//
// Markup only: every string, count, sentence and bar width comes from `teamHubVM`, and every
// mutation goes through `useMutate`, which already raises the toast. The screen handles `error`
// and nothing else.
//
// The Team Activity rows carry `role="row"` with the person's name as their accessible name — the
// compliance harness selects them that way — so the grid around them declares `role="table"` and
// its cells `role="cell"`, which is also what axe's `aria-required-parent` needs.

/** The drawer's role select. The three team roles, in the reference's order. */
const DRAWER_ROLES: readonly LearnerRole[] = ['Team Owner', 'Operations Lead', 'Sales Agent'];

/**
 * `act.download` in the prototype: a Blob behind a transient anchor. The object URL is revoked on
 * the reference's 1500 ms delay, not immediately — revoking inside the click can abort the save
 * before the browser has read the blob.
 *
 * Phase 08 § 8.2 does not touch this. Export CSV is GENERATED: `csv()` renders the team's rows out
 * of the snapshot the viewer is already looking at, so there is no object in the bucket to presign
 * and no route that could produce it.
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

function TeamHub() {
  const db = useDb();
  const viewer = useViewer();
  const now = useNow();
  const mutate = useMutate();
  const { toast } = useToaster();

  const [ui, setUi] = useState<TeamHubUi>(TEAM_HUB_UI);
  const patch = useCallback((next: Partial<TeamHubUi>) => setUi((u) => ({ ...u, ...next })), []);

  const actor = viewer.actor;
  const user = useMemo(
    () => (actor.kind === 'learner' ? (db.users.find((u) => u.id === actor.userId) ?? null) : null),
    [actor, db.users],
  );
  const vm = useMemo(() => teamHubVM(db, user, now, ui), [db, user, now, ui]);

  // The panel keeps its contents through the 240ms slide-out, exactly as the reference's
  // `this.lastSel` does. A cache of what was last rendered, never a source of truth.
  const lastMember = useRef<DrawerMember | null>(null);
  if (vm?.drawer.member) lastMember.current = vm.drawer.member;
  const dm = vm?.drawer.member ?? lastMember.current;

  const openInvite = useCallback(() => patch({ invite: true, err: '' }), [patch]);
  const closeInvite = useCallback(() => patch({ invite: false }), [patch]);
  const closeDrawer = useCallback(() => patch({ sel: null }), [patch]);

  const sendInvite = useCallback(async () => {
    const r = await mutate('inviteMember', { email: ui.email, name: ui.name, role: ui.role });
    if (r.error) patch({ err: r.error });
    else setUi((u) => ({ ...u, invite: false, email: '', name: '', err: '' }));
  }, [mutate, patch, ui.email, ui.name, ui.role]);

  const remind = useCallback(
    async (userIds: string[]) => {
      const r = await mutate('remindMembers', { userIds });
      if (r.error) toast(r.error, 'warn');
    },
    [mutate, toast],
  );

  const setMemberRole = useCallback(
    async (userId: string, role: LearnerRole) => {
      const r = await mutate('setMemberRole', { userId, role });
      if (r.error) toast(r.error, 'warn');
    },
    [mutate, toast],
  );

  const removeMember = useCallback(
    async (userId: string) => {
      const r = await mutate('removeMember', { userId });
      if (r.error) toast(r.error, 'warn');
      else patch({ sel: null });
    },
    [mutate, patch, toast],
  );

  // The shell redirects `/team` to `/` for an Agent-tier learner, so there is nothing to draw.
  if (!vm) return null;

  const { seats, dep, rem, inv, members } = vm;

  return (
    <>
      <div className={s.page}>
        <div className={s.head}>
          <div>
            <h1 className={s.h1}>Team Hub</h1>
            <p className={s.sub}>
              {vm.teamName} · Team Tier{vm.inCohort ? ' · December 2026 Cohort' : ''}
            </p>
          </div>
          <div className={s.headActions}>
            <button
              type="button"
              className={s.export}
              onClick={() => {
                downloadText(vm.csvName, vm.csvText, 'text/csv');
                toast('Team progress exported');
              }}
            >
              <Icon name="download" size={15} strokeWidth={1.8} />
              Export CSV
            </button>
            <button type="button" className={s.invite} onClick={openInvite}>
              <Icon name="userPlus" size={15} strokeWidth={1.9} />
              Invite Member
            </button>
          </div>
        </div>

        <div className={s.summary}>
          <section className={s.card} data-card="seats">
            <div className={s.cardTitle}>Seat Allocation</div>
            <div className={s.big}>
              <span className={s.bigNum}>
                {seats.used} of {seats.total}
              </span>
              <span className={s.bigLabel}>Seats Assigned</span>
            </div>
            <div className={s.slots}>
              {seats.slots.map((sl) => (
                <button
                  key={sl.key}
                  type="button"
                  className={s.slot}
                  data-kind={sl.kind}
                  title={sl.title}
                  aria-label={sl.title}
                  style={{ '--av': sl.fill ?? 'transparent' } as React.CSSProperties}
                  onClick={() => (sl.id ? patch({ sel: sl.id }) : openInvite())}
                >
                  {sl.initials}
                </button>
              ))}
            </div>
            <div className={s.breakdown}>{seats.breakdown}</div>
          </section>

          <section className={s.card} data-card="deployments">
            <div className={s.cardTitle}>Team Deployments</div>
            <div className={s.big}>
              <span className={s.bigNum}>{dep.total}</span>
              <span className={s.bigLabel}>AI Employees Deployed Across the Team</span>
            </div>
            <div className={s.depRows}>
              {dep.rows.map((r) => (
                <div key={r.id} className={s.depRow}>
                  <span className={s.depLabel}>{r.label}</span>
                  <div className={s.depTrack}>
                    <div className={s.depFill} style={{ '--w': r.width } as React.CSSProperties} />
                  </div>
                  <span className={s.depValue}>{r.value}</span>
                </div>
              ))}
            </div>
          </section>

          <section className={s.card} data-card="remind" data-behind={rem.locked ? 'true' : undefined}>
            <div className={s.cardTitle}>Before {rem.session}</div>
            <div className={s.remHeadline}>{rem.headline}</div>
            <div className={s.remPeople}>
              {rem.people.map((p) => (
                <div key={p.id} className={s.remPerson}>
                  <Avatar id={p.id} name={p.plainName} size={22} />
                  <span className={s.remName}>{p.name}</span>
                  <span className={s.remGap}>{p.gap}</span>
                </div>
              ))}
            </div>
            {rem.any ? (
              <button type="button" className={s.remind} onClick={() => void remind(rem.behindIds)}>
                <Icon name="bell" size={15} strokeWidth={1.8} />
                {rem.btn}
              </button>
            ) : null}
          </section>
        </div>

        <section className={s.activity}>
          <div className={s.activityHead}>
            <div className={s.activityTitle}>Team Activity</div>
            <span className={s.activityNote}>{members.length} Members · Click a Row to Manage</span>
          </div>
          <div className={s.scroll}>
            <div className={s.table} role="table" aria-label="Team Activity">
              <div className={s.headRow} role="row">
                <span role="columnheader">Name</span>
                <span role="columnheader">Role</span>
                <span role="columnheader">Date Joined</span>
                <span role="columnheader">AI Employees Built</span>
                <span role="columnheader">Deployment Status</span>
                <span role="columnheader">Last Active</span>
                <span aria-hidden="true" />
              </div>
              {members.map((m) => (
                <div
                  key={m.id}
                  role="row"
                  aria-label={m.name}
                  tabIndex={0}
                  className={s.row}
                  onClick={() => patch({ sel: m.id })}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      patch({ sel: m.id });
                    }
                  }}
                >
                  <div role="cell" className={s.nameCell}>
                    <Avatar id={m.id} name={m.name} size={30} invited={m.invited} />
                    <div className={s.nameStack}>
                      <div className={s.name}>
                        {m.name}
                        {m.isMe ? <span className={s.you}> (You)</span> : null}
                      </div>
                      <div className={s.email}>{m.email}</div>
                    </div>
                  </div>
                  <span role="cell" className={s.role}>
                    {m.role}
                  </span>
                  <span role="cell" className={s.joined}>
                    {m.joined}
                  </span>
                  <div role="cell" className={s.builtCell}>
                    <div className={s.dots}>
                      {m.dots.map((d) => (
                        <span key={d.id} title={d.title} className={s.dot} data-state={d.state} />
                      ))}
                    </div>
                    <span className={s.count}>{m.count}</span>
                  </div>
                  <div role="cell" className={s.statusCell} data-tone={m.tone}>
                    <span className={s.statusDot} />
                    <span className={s.statusText}>{m.status}</span>
                  </div>
                  <span role="cell" className={s.last}>
                    {m.last}
                  </span>
                  <span role="cell" className={s.chevCell}>
                    <Icon name="chevR" size={16} strokeWidth={2} color="var(--text-tertiary)" />
                  </span>
                </div>
              ))}
            </div>
          </div>
        </section>
      </div>

      <Modal
        open={inv.open}
        onClose={closeInvite}
        label="Invite a Team Member"
        width={460}
        pad={24}
        radius={14}
        variant="surface"
      >
        <div className={s.invHead}>
          <div className={s.invTitles}>
            <div className={s.invTitle}>Invite a Team Member</div>
            <div className={s.invNote}>{inv.seatsNote}</div>
          </div>
          <button type="button" className={s.close} aria-label="Close" onClick={closeInvite}>
            <Icon name="x" size={16} strokeWidth={2} />
          </button>
        </div>
        <div className={s.invBody}>
          <label className={s.field}>
            Work Email
            <input
              className={s.input}
              value={inv.email}
              placeholder="name@yourteam.com"
              onChange={(e) => patch({ email: e.target.value, err: '' })}
            />
          </label>
          <label className={s.field}>
            Full Name <span className={s.optional}>Optional</span>
            <input
              className={s.input}
              value={inv.name}
              placeholder="Jordan Smith"
              onChange={(e) => patch({ name: e.target.value })}
            />
          </label>
          <div className={s.roleGroup}>
            <span className={s.roleLabel} id="team-invite-role">
              Role
            </span>
            <div className={s.roleCards} role="radiogroup" aria-labelledby="team-invite-role">
              {inv.roles.map((ro) => (
                <button
                  key={ro.label}
                  type="button"
                  role="radio"
                  aria-checked={ro.on}
                  className={s.roleCard}
                  data-on={ro.on ? 'true' : undefined}
                  onClick={() => patch({ role: ro.label, err: '' })}
                >
                  <span className={s.roleRing} aria-hidden="true">
                    <span className={s.roleDot} />
                  </span>
                  <span className={s.roleText}>
                    <span className={s.roleName}>{ro.label}</span>
                    <span className={s.roleSub}>{ro.sub}</span>
                  </span>
                  <span className={s.roleCap} data-full={ro.capFull ? 'true' : undefined}>
                    {ro.cap}
                  </span>
                </button>
              ))}
            </div>
          </div>
          {inv.err ? <div className={s.invError}>{inv.err}</div> : null}
        </div>
        <div className={s.invFoot}>
          <button type="button" className={s.cancel} onClick={closeInvite}>
            Cancel
          </button>
          <button
            type="button"
            className={s.send}
            data-full={inv.full ? 'true' : undefined}
            onClick={() => void sendInvite()}
          >
            <Icon name="send" size={14} strokeWidth={1.9} />
            Send Invite
          </button>
        </div>
      </Modal>

      <Drawer
        open={vm.drawer.open}
        onClose={closeDrawer}
        title={dm ? dm.name : ''}
        description={dm ? dm.email : undefined}
        width={440}
        variant="surface"
        leading={dm ? <Avatar id={dm.id} name={dm.name} size={40} /> : undefined}
        footer={
          dm ? (
            <>
              {dm.canRemove ? (
                <button type="button" className={s.remove} onClick={() => void removeMember(dm.id)}>
                  <Icon name="trash" size={14} strokeWidth={1.9} />
                  Remove Seat
                </button>
              ) : null}
              <button
                type="button"
                className={s.nudge}
                onClick={() =>
                  dm.invited ? toast(`Invite resent to ${dm.email}`) : void remind([dm.id])
                }
              >
                <Icon name={dm.nudgeIcon} size={14} strokeWidth={1.9} />
                {dm.nudgeLabel}
              </button>
            </>
          ) : undefined
        }
      >
        {dm ? (
          <div className={s.dwBody}>
            <div className={s.facts}>
              <div className={s.fact}>
                <div className={s.factLabel}>Joined</div>
                <div className={s.factValue}>{dm.joined}</div>
              </div>
              <div className={s.fact}>
                <div className={s.factLabel}>Last Active</div>
                <div className={s.factValue}>{dm.last}</div>
              </div>
            </div>

            <label className={s.field} htmlFor="team-member-role">
              Role
              <select
                id="team-member-role"
                className={s.select}
                value={dm.role}
                disabled={dm.isOwner}
                onChange={(e) => void setMemberRole(dm.id, e.target.value as LearnerRole)}
              >
                {DRAWER_ROLES.map((r) => (
                  <option key={r} value={r}>
                    {r}
                  </option>
                ))}
              </select>
            </label>

            <div>
              <div className={s.dwModsLabel}>AI Employees</div>
              <div className={s.dwMods}>
                {dm.mods.map((m) => (
                  <div key={m.id} className={s.dwMod}>
                    <Icon name={m.icon} size={15} strokeWidth={1.8} color="var(--text-tertiary)" />
                    <span className={s.dwModName}>{m.name}</span>
                    {/*
                      The tokens sit in a block host. The prototype renders every imported component
                      inside a block-level wrapper, so the pill's LINE BOX — not its 22px border box —
                      sets the row height (22.55px, from the 14px/1.45 baseline strut). Dropping the
                      tokens straight into the flex row gives 43px rows instead of 43.55px, and six
                      rows of that drifts ~3px, past the pixel tolerance.
                    */}
                    <span className={s.dwTokenHost}>
                      <StatusToken
                        kind="build"
                        state={m.build.state}
                        n={m.build.n}
                        total={m.build.total}
                        compact
                      />
                    </span>
                    <span className={s.dwTokenHost}>
                      <StatusToken kind="runtime" state={m.runtime} />
                    </span>
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
  return <TeamHub />;
}

export default Component;
