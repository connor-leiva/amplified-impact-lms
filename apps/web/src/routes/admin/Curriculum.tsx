import { useCallback, useMemo, useState } from 'react';
import clsx from 'clsx';
import { Link, useNavigate } from 'react-router';

import { Icon } from '../../components/Icon';
import { useToaster } from '../../components/primitives/Toaster';
import { Button, ButtonLink } from '../../components/r2/Button';
import { Card } from '../../components/r2/Card';
import { Menu } from '../../components/r2/Menu';
import type { MenuEntry } from '../../components/r2/Menu';
import { Confirm } from '../../components/r2/Modal';
import { Status } from '../../components/r2/Status';
import { KV, k } from '../../components/r2/kit';
import { PROGRAM_KEY } from '../../data/admin-shell';
import { isFixture } from '../../data/boot';
import { refusal, useAct, useDb, useMutate } from '../../data/hooks';
import { programLogo } from '../../home/program-logo';
import { useViewportWidth } from '../../shell/hooks';
import { weekPath } from '../../shell/admin/addresses';
import { previewUrl } from './Curriculum.vm';
import { curriculumWeeksVM, weekMoves, type WeekRowVM } from './program/program.vm';
import c from './cohort/Cohort.module.css';
import p from './program/Program.module.css';

// D-265 (R-5 Phase 6): Program › Curriculum (`/admin/program`), the mockup's `Curriculum3`: the program's weeks, built
// once, each with its steps and their time, where it runs (each cohort that takes it, and its week number there, a link
// to that cohort), and Published or a Publish button; then the cohorts that run it and what every week shares, each
// count a link to the list it counts (spec § 4, rule 1).
//
//   - Reorder: drag a week's handle, or focus it and press Alt with an arrow key (`moveModule`, one place a step). The
//     phone draws no handle, as the mockup.
//   - Publish: the Publish button or the "…" menu, after the mockup's confirm (`publishModule`). Unpublish, from the
//     menu, after a confirm (`unpublishModule`).
//   - Preview as a learner: fixture, a persona switch; http, the read-only preview tab (D-138, `previewUrl`).
//   - Duplicate (D-172): a draft copy with every step and setting (`duplicateModule`, audited).
//   - Delete (a draft): kept from the page this replaces (D-160 R2-2), last in the menu.
//   - Add a week opens what it opened (`weeks/new`, D-253).

const TILE = `data:image/svg+xml,${encodeURIComponent(programLogo(PROGRAM_KEY, { variant: 'tile', size: 32, title: '' }))}`;

/** Demo params a persona switch must keep, so a pinned clock survives the preview navigation. */
const CARRY_PARAMS = ['phase', 'now', 'demo'] as const;

interface Ask {
  title: string;
  body: string;
  cta: string;
  danger?: boolean;
  yes: () => void;
}

function Curriculum() {
  const db = useDb();
  const mutate = useMutate();
  const act = useAct();
  const navigate = useNavigate();
  const { toast } = useToaster();
  const phone = useViewportWidth() < 768;
  const vm = useMemo(() => curriculumWeeksVM(db), [db]);
  const [ask, setAsk] = useState<Ask | null>(null);
  const [drag, setDrag] = useState<number | null>(null);

  const warn = useCallback((e?: string) => e && toast(e, 'warn'), [toast]);

  const move = useCallback(
    async (from: number, to: number) => {
      const m = weekMoves(db, from, to);
      if (!m) return;
      for (let i = 0; i < m.times; i++) {
        const out = await mutate('moveModule', { id: m.id, dir: m.dir });
        if (out.error) return warn(refusal(out));
      }
    },
    [db, mutate, warn],
  );

  const publish = (r: WeekRowVM) =>
    setAsk({
      title: `Publish ${r.title}?`,
      body: 'Each cohort that runs it gets it on its own date. Until then learners see its title and outcome, locked.',
      cta: 'Publish',
      yes: () => void mutate('publishModule', { id: r.id }).then((o) => warn(refusal(o))),
    });
  const unpublish = (r: WeekRowVM) =>
    setAsk({
      title: `Unpublish ${r.title}?`,
      body: 'Hidden from learners in every cohort. Their progress is kept.',
      cta: 'Unpublish',
      danger: true,
      yes: () => void mutate('unpublishModule', { id: r.id }).then((o) => warn(refusal(o))),
    });
  const remove = (r: WeekRowVM) =>
    setAsk({
      title: `Delete ${r.title}?`,
      body: 'The draft and its steps are removed. Learners never saw it.',
      cta: 'Delete draft',
      danger: true,
      yes: () => void mutate('deleteModule', { id: r.id }).then((o) => warn(refusal(o))),
    });

  const preview = useCallback((r: WeekRowVM) => {
    if (!isFixture) {
      window.open(previewUrl(r), '_blank', 'noopener');
      return;
    }
    const url = new URL(`/employees/${r.id}`, window.location.href);
    const current = new URLSearchParams(window.location.search);
    for (const key of CARRY_PARAMS) {
      const v = current.get(key);
      if (v !== null) url.searchParams.set(key, v);
    }
    url.searchParams.set('as', r.previewAs);
    window.location.assign(url.toString());
  }, []);

  const menu = (r: WeekRowVM): MenuEntry[] => [
    { label: 'Open week', icon: 'r2Builder', onSelect: () => void navigate(weekPath(r.id)) },
    { label: 'Preview as a learner', icon: 'r2Eye', onSelect: () => preview(r) },
    { label: 'Duplicate', onSelect: () => void act('duplicateModule', { id: r.id }).then((o) => warn(refusal(o))) },
    'separator',
    r.draft
      ? {
          label: 'Publish',
          disabled: !r.canPublish,
          title: r.canPublish ? undefined : 'Add a step first',
          onSelect: () => publish(r),
        }
      : { label: 'Unpublish', danger: true, onSelect: () => unpublish(r) },
    ...(r.draft ? [{ label: 'Delete', danger: true, onSelect: () => remove(r) }] : []),
  ];

  /** Alt with an arrow key on a week's handle moves it one place. */
  const onKey = (i: number) => (e: React.KeyboardEvent) => {
    if (!e.altKey || (e.key !== 'ArrowUp' && e.key !== 'ArrowDown')) return;
    e.preventDefault();
    const to = e.key === 'ArrowUp' ? i - 1 : i + 1;
    if (to >= 0 && to < vm.rows.length) void move(i, to);
  };

  return (
    <div className={k.col}>
      <section className={k.cd} aria-label="Weeks">
        <div className={k.cdh}>
          <div className={clsx(k.col, k.colS, p.grow)} style={{ gap: 0 }}>
            <h2 className={k.h2}>Weeks</h2>
            <span className={k.me}>{vm.summary}</span>
          </div>
          <ButtonLink kind="primary" icon="r2Plus" to={weekPath('new')}>
            Add a week
          </ButtonLink>
        </div>
        {vm.rows.length ? (
          <div className={c.wkl}>
            {vm.rows.map((r, i) => (
              <div
                key={r.id}
                className={clsx(p.wkr, drag === i && p.dragging)}
                data-week={r.id}
                onDragOver={(e) => drag !== null && e.preventDefault()}
                onDrop={(e) => {
                  e.preventDefault();
                  if (drag !== null && drag !== i) void move(drag, i);
                  setDrag(null);
                }}
              >
                {!phone ? (
                  <button
                    type="button"
                    className={p.grp}
                    title="Drag to reorder"
                    aria-label={`Move ${r.title}: drag, or press Alt with an arrow key`}
                    draggable
                    onDragStart={() => setDrag(i)}
                    onDragEnd={() => setDrag(null)}
                    onKeyDown={onKey(i)}
                  >
                    <Icon name="r2Grip" size={14} strokeWidth={2.6} />
                  </button>
                ) : null}
                <span className={clsx(c.wn, r.draft && c.off)}>{r.n}</span>
                <Link className={p.wkm} to={weekPath(r.id)}>
                  <span className={clsx(k.w5, k.el, p.wkt)}>{r.title}</span>
                  <span className={clsx(k.me, k.el)}>{r.outcome}</span>
                </Link>
                <div className={p.wkc}>
                  <span className={k.tn}>{r.steps}</span>
                  <span className={k.me}>{r.time}</span>
                </div>
                <div className={clsx(p.wkc, p.wkd)}>
                  {r.runs.length ? (
                    r.runs.map((u) => (
                      <Link key={u.cohortId} className={clsx(k.lk, k.el, p.uin)} to={u.to}>
                        {u.label}
                      </Link>
                    ))
                  ) : (
                    <span className={k.me}>No cohort runs it</span>
                  )}
                </div>
                <div className={p.wks}>
                  {r.draft ? (
                    <Button
                      disabled={!r.canPublish}
                      title={r.canPublish ? undefined : 'Add a step first'}
                      onClick={() => publish(r)}
                    >
                      Publish
                    </Button>
                  ) : (
                    <Status tone="ok">Published</Status>
                  )}
                </div>
                <Menu
                  className={p.menu}
                  label={`Actions for ${r.title}`}
                  items={menu(r)}
                  placement={i >= vm.rows.length - 2 ? 'above' : 'below-right'}
                  trigger={(t) => (
                    <button type="button" className={k.ib} aria-label="More actions" {...t.props} onClick={t.toggle}>
                      <Icon name="r2More" size={16} strokeWidth={2.6} />
                    </button>
                  )}
                />
              </div>
            ))}
          </div>
        ) : (
          <div className={k.cdb}>
            <p className={clsx(k.p, k.s2)}>No weeks yet. Add the first week to start the program.</p>
          </div>
        )}
      </section>
      <div className={c.set2}>
        <Card
          title="Cohorts That Run It"
          right={
            <ButtonLink icon="r2Plus" to="/admin/cohort/new">
              New
            </ButtonLink>
          }
        >
          <div className={clsx(k.col, k.colM)}>
            {vm.cohorts.map((co) => (
              <Link key={co.id} className={c.rnw} to={co.to}>
                <img className={c.tile} src={TILE} width={32} height={32} alt="" />
                <span className={clsx(k.col, k.col0, p.grow)}>
                  <span className={clsx(k.w5, k.el)}>{co.name}</span>
                  <span className={k.me}>{co.line}</span>
                </span>
                <Icon name="r2Chev" size={12} strokeWidth={2.2} />
              </Link>
            ))}
            <p className={clsx(k.p, k.me)}>
              A cohort picks its weeks from this list and gives them dates. Change a week here and every cohort that
              runs it gets the change.
            </p>
          </div>
        </Card>
        <Card title="Shared by Every Week">
          <div className={p.kvsLast}>
            <KV
              stacked
              rows={[
                {
                  label: 'Course pages',
                  value: (
                    <Link className={clsx(k.lk, p.lka)} to="/admin/program/course">
                      Intro, rules, before and after
                    </Link>
                  ),
                },
                {
                  label: 'Glossary',
                  value: (
                    <Link className={clsx(k.lk, p.lka)} to="/admin/program/course?section=glossary">
                      {vm.shared.glossary} terms
                    </Link>
                  ),
                },
                {
                  label: 'Words',
                  value: (
                    <Link className={clsx(k.lk, p.lka)} to="/admin/program/course?section=words">
                      {vm.shared.words} lines learners see
                    </Link>
                  ),
                },
                {
                  label: 'Resource Vault',
                  value: (
                    <Link className={clsx(k.lk, p.lka)} to="/admin/program/vault">
                      {vm.shared.vault} kit files
                    </Link>
                  ),
                },
              ]}
            />
          </div>
        </Card>
      </div>
      {ask ? (
        <Confirm
          title={ask.title}
          body={ask.body}
          cta={ask.cta}
          danger={ask.danger}
          onConfirm={ask.yes}
          onClose={() => setAsk(null)}
        />
      ) : null}
    </div>
  );
}

export function Component() {
  return <Curriculum />;
}

export default Component;
