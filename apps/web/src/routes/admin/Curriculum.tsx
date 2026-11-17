import { useCallback, useMemo, useState } from 'react';
import { useNavigate } from 'react-router';
import clsx from 'clsx';
import type { Tier } from '@ai/core';

import { Icon } from '../../components/Icon';
import { useToaster } from '../../components/primitives/Toaster';
import { Button } from '../../components/r2/Button';
import { Menu } from '../../components/r2/Menu';
import type { MenuEntry } from '../../components/r2/Menu';
import { Confirm } from '../../components/r2/Modal';
import { Page } from '../../components/r2/Page';
import { Status } from '../../components/r2/Status';
import { Table } from '../../components/r2/Table';
import type { Column } from '../../components/r2/Table';
import { TierPill } from '../../components/r2/TierPill';
import { Bar, Find, PageHead, Sel, k, keepHyphens } from '../../components/r2/kit';
import { ButtonLink } from '../../components/r2/Button';
import { isFixture } from '../../data/boot';
import { useAct, useDb, useMutate, useNow } from '../../data/hooks';
import { useViewportWidth } from '../../shell/hooks';
import { curriculumR2VM, movesFor, previewUrl, type CurriculumR2Row } from './Curriculum.vm';
import s from './Curriculum.module.css';

// Admin Curriculum `/admin/curriculum` on the Admin redesign R2 (D-160 R2-2): the signed-off mockup's
// `Curriculum` (AdminRedesign.jsx), drawn from `curriculumR2VM`. Reordering, tier access, publishing,
// the learner preview and deleting a draft all go through the same @ai/core mutations and targets as
// before; only the presentation changed.
//
//   - Reorder: the row's drag handle, Alt with an arrow key on it, or Move up / Move down in the
//     phone's "…" menu (`moveModule`, one place a step). Not while a filter is on, as in the mockup.
//   - Tier access: the tier pill's menu (`setModuleTier`).
//   - Publish / Unpublish: the row's Publish button or its "…" menu, after the mockup's confirm.
//   - Preview as Learner: the row's hover eye or its "…" menu (fixture: a persona switch; http: the
//     read-only preview tab, D-138).
//   - Delete (drafts): the "…" menu, after a confirm. The mockup draws no Delete; the old Module
//     Builder's Delete Draft lives here now (Needs Connor's call, D-160 R2-2).
//   - Duplicate (D-172): the "…" menu, as the mockup orders it: a draft copy, "{name} (copy)", with
//     every step and setting (`duplicateModule`, audited `module.duplicate`), and its toast.

/** Demo params a persona switch must keep, so a pinned clock survives the preview navigation. */
const CARRY_PARAMS = ['phase', 'now', 'demo'] as const;
const STATUSES = ['All statuses', 'Published', 'Scheduled', 'Draft'] as const;

interface Ask {
  title: string;
  body: string;
  cta: string;
  danger?: boolean;
  yes: () => void;
}

function Curriculum() {
  const db = useDb();
  const now = useNow();
  const mutate = useMutate();
  const act = useAct();
  const navigate = useNavigate();
  const { toast } = useToaster();
  const vw = useViewportWidth();
  const phone = vw < 768;
  const laptop = vw >= 768 && vw < 1200;
  const wide = vw >= 1400;

  const vm = useMemo(() => curriculumR2VM(db, now), [db, now]);
  const [q, setQ] = useState('');
  const [status, setStatus] = useState<(typeof STATUSES)[number]>('All statuses');
  const [ask, setAsk] = useState<Ask | null>(null);

  const filtered = q !== '' || status !== 'All statuses';
  const rows = vm.rows.filter(
    (r) => r.name.toLowerCase().includes(q.toLowerCase()) && (status === 'All statuses' || r.statusLabel === status),
  );

  const warn = useCallback((e?: string) => e && toast(e, 'warn'), [toast]);

  const move = useCallback(
    async (from: number, to: number) => {
      const r = vm.rows[from];
      if (!r) return;
      const { dir, times } = movesFor(from, to);
      for (let i = 0; i < times; i++) {
        const out = await mutate('moveModule', { id: r.id, dir });
        if (out.error) return warn(out.error);
      }
    },
    [mutate, vm.rows, warn],
  );

  const setTier = useCallback(
    async (id: string, tier: Tier) => warn((await mutate('setModuleTier', { id, tier })).error),
    [mutate, warn],
  );

  const publish = (r: CurriculumR2Row, on: boolean) =>
    setAsk({
      title: `${on ? 'Publish' : 'Unpublish'} ${r.name}?`,
      body: on
        ? 'Learners with access see it in the portal right away.'
        : 'It is hidden from learners right away. Their progress is kept.',
      cta: on ? 'Publish' : 'Unpublish',
      yes: () => void mutate(on ? 'publishModule' : 'unpublishModule', { id: r.id }).then((o) => warn(o.error)),
    });

  const remove = (r: CurriculumR2Row) =>
    setAsk({
      title: `Delete ${r.name}?`,
      body: 'The draft and its steps are removed. Learners never saw it.',
      cta: 'Delete draft',
      danger: true,
      yes: () => void mutate('deleteModule', { id: r.id }).then((o) => warn(o.error)),
    });

  /**
   * Preview as a learner. Fixture mode switches persona (a real navigation that carries the timeline
   * params); http mode opens the read-only preview tab (D-138, `previewUrl`).
   */
  const preview = useCallback((r: CurriculumR2Row) => {
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

  const edit = (r: CurriculumR2Row) => void navigate(`/admin/curriculum/${r.id}`);

  const menu = (r: CurriculumR2Row): MenuEntry[] => [
    { label: 'Edit in Module Builder', icon: 'r2Builder', onSelect: () => edit(r) },
    { label: 'Preview as Learner', icon: 'r2Eye', onSelect: () => preview(r) },
    // D-172: the mockup's Duplicate, a draft copy with every step and setting, audited.
    { label: 'Duplicate', onSelect: () => void act('duplicateModule', { id: r.id }).then((o) => warn(o.error)) },
    'separator',
    r.publishes
      ? { label: 'Publish', onSelect: () => publish(r, true) }
      : { label: 'Unpublish', danger: true, onSelect: () => publish(r, false) },
    ...(r.status === 'draft' ? [{ label: 'Delete', danger: true, onSelect: () => remove(r) }] : []),
  ];

  const cols: Column<CurriculumR2Row>[] = [
    {
      key: 'n',
      label: 'AI Employee',
      width: wide ? 'minmax(260px,1.6fr)' : 'minmax(194px,1fr)',
      value: (r) => r.name,
      cell: (r, f) => {
        const big = f.tw >= 1100;
        return (
          <div className={clsx(k.row, k.nw, big ? s.lead : s.leadTight)}>
            {big ? <span className={clsx(k.me, k.tn, s.order)}>{r.order}</span> : null}
            <span className={clsx(s.mt, !big && s.mtSmall)}>
              <Icon name={r.icon} size={16} strokeWidth={1.75} />
            </span>
            <div className={clsx(k.col, k.col0, s.two)}>
              <button type="button" className={clsx(k.lk, big && k.el)} onClick={() => edit(r)}>
                {r.name}
              </button>
              <span className={clsx(k.me, k.el)}>
                {f.drop ? (r.session ? r.session.brief : 'Self-paced') : keepHyphens(r.desc)}
              </span>
            </div>
          </div>
        );
      },
    },
    {
      key: 'tier',
      label: 'Tier access',
      width: wide || laptop ? '124px' : '116px',
      overflow: true,
      value: (r) => r.tier,
      cell: (r) => <TierPill tier={r.tier} onChange={(t) => void setTier(r.id, t)} />,
    },
    {
      key: 'ses',
      label: 'Live session',
      width: wide ? 'minmax(250px,1.6fr)' : '132px',
      hideLap: true,
      value: (r) => r.session?.title ?? '',
      cell: (r, f) =>
        r.session ? (
          <div className={clsx(k.col, k.col0, s.two)} title={r.session.full} aria-label={r.session.full}>
            <span className={wide ? s.cl3 : k.el}>{wide ? keepHyphens(r.session.title) : r.session.short}</span>
            <span className={clsx(k.me, wide ? s.wrap : k.el)}>{f.tw < 1100 ? r.session.date : r.session.when}</span>
          </div>
        ) : (
          <span className={k.mu}>Self-paced</span>
        ),
    },
    {
      key: 'st',
      label: 'Status',
      width: laptop ? '112px' : wide ? '128px' : '120px',
      value: (r) => r.statusLabel,
      cell: (r) =>
        r.status === 'draft' && laptop ? (
          <div className={clsx(k.col, s.hiddenStack)}>
            <Status tone={r.statusTone}>{r.statusLabel}</Status>
            <span className={k.pl} title="Hidden from learners" aria-label="Hidden from learners">
              Hidden
            </span>
          </div>
        ) : (
          <div className={clsx(k.col, k.col0)}>
            <Status tone={r.statusTone}>{r.statusLabel}</Status>
            <span className={clsx(k.me, k.nowrap)}>{r.statusLine}</span>
          </div>
        ),
    },
    {
      key: 'dep',
      label: 'Deployed',
      width: '96px',
      overflow: true,
      value: (r) => r.deployed ?? -1,
      cell: (r) =>
        r.deployed === null ? (
          <span className={k.mu}>{r.depLabel}</span>
        ) : (
          <span className={clsx(k.row, k.nw, s.dep)}>
            <Bar pct={r.deployed} />
            <span className={clsx(k.tn, k.w5, s.pct)}>{r.deployed}%</span>
          </span>
        ),
    },
  ];

  return (
    <Page>
      <PageHead
        title="Curriculum"
        description={phone ? vm.summaryPhone : vm.summary}
        right={
          <ButtonLink header kind="primary" icon="r2Plus" to="/admin/curriculum/new">
            New AI Employee
          </ButtonLink>
        }
      />
      <div className={k.row}>
        <Find value={q} onChange={setQ} placeholder="Filter AI Employees" />
        <Sel
          aria-label="Status"
          value={status}
          onChange={(e) => setStatus(e.target.value as (typeof STATUSES)[number])}
        >
          {STATUSES.map((o) => (
            <option key={o}>{o}</option>
          ))}
        </Sel>
      </div>
      <Table
        label="AI Employees"
        cols={cols}
        rows={rows}
        rowKey={(r) => r.id}
        filtered={filtered}
        onMove={filtered ? undefined : (a, b) => void move(a, b)}
        actionsWidth="104px"
        empty={{
          icon: 'r2Curriculum',
          title: 'No AI Employees yet',
          body: 'Create the first one to start the curriculum.',
        }}
        quick={(r) => [{ label: 'Preview as Learner', icon: 'r2Eye', onClick: () => preview(r) }]}
        primary={(r) =>
          r.status === 'draft' ? (
            <Button kind="primary" onClick={() => publish(r, true)}>
              Publish
            </Button>
          ) : null
        }
        menu={menu}
        card={(r, _i, items, up) => (
          <>
            <button type="button" className={clsx(k.lk, s.cardName)} onClick={() => edit(r)}>
              {r.name}
            </button>
            <p className={clsx(k.p, k.s2, s.cl2)}>{keepHyphens(r.desc)}</p>
            <span className={clsx(k.mu, s.cl1)}>{r.meta}</span>
            <div className={clsx(k.row, k.nw, s.cardRow)}>
              <span
                title={r.status === 'draft' ? 'Hidden from learners' : undefined}
                aria-label={r.status === 'draft' ? 'Draft. Hidden from learners' : undefined}
              >
                <Status tone={r.statusTone}>{r.statusLabel}</Status>
              </span>
              <TierPill tier={r.tier} onChange={(t) => void setTier(r.id, t)} />
              <span className={k.sp} />
              {r.status === 'draft' ? (
                <Button kind="primary" className={s.cardPublish} onClick={() => publish(r, true)}>
                  Publish
                </Button>
              ) : null}
              <Menu
                label={`Actions for ${r.name}`}
                items={items}
                placement={up ? 'above' : 'below-right'}
                trigger={(t) => (
                  <button type="button" className={k.ib} aria-label="More actions" {...t.props} onClick={t.toggle}>
                    <Icon name="r2More" size={16} strokeWidth={2.6} />
                  </button>
                )}
              />
            </div>
          </>
        )}
      />
      <p className={clsx(k.p, k.me)}>
        Tier access and publish status update the learner portal immediately. Session times are MST.{' '}
        {phone
          ? 'Reorder from the … menu.'
          : 'Drag the handle, or focus it and press Alt with an arrow key, to reorder.'}
      </p>
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
    </Page>
  );
}

export function Component() {
  return <Curriculum />;
}

export default Component;
