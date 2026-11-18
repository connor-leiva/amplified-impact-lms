// /learn/week/:week/step/:step (D-177): the step player, the learner mockup's artboards 08/09. Claude
// and ChatGPT tabs from the step's own paths, a copy button on every copy block, "Mark step done" through
// the portal's own `toggleStep`, and "For this step" with the step's Library skill (or the week's).
// Markup only: every string is computed in Step.vm.ts.

import { useMemo, useState } from 'react';
import type { CSSProperties, KeyboardEvent } from 'react';
import { Link, Navigate, useParams } from 'react-router';
import { learnerOf } from '@ai/core/learner';
import { Icon } from '../../components/Icon';
import { useMutate } from '../../data/hooks';
import { useLearn } from './data';
import { weekRows } from './learn.vm';
import { PLATFORM_LABEL, STEP, stepParam, stepVM } from './Step.vm';
import type { Platform, StepVM } from './Step.vm';
import { weekParam } from './Week.vm';
import { Blocks, Go, KitRows, Tile, nStyle } from './parts';
import { learnHome } from './routes';
import { StepLive } from './Live';
import s from './Learn.module.css';

function Tabs({ tabs, on, set }: { tabs: Platform[]; on: Platform; set: (p: Platform) => void }) {
  const onKey = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
    e.preventDefault();
    const i = tabs.indexOf(on);
    const next = tabs[(i + (e.key === 'ArrowRight' ? 1 : tabs.length - 1)) % tabs.length]!;
    set(next);
    e.currentTarget.querySelector<HTMLButtonElement>(`[data-p="${next}"]`)?.focus();
  };
  return (
    <div className={s.seg} role="radiogroup" aria-label={STEP.yourAi} onKeyDown={onKey}>
      {tabs.map((p) => (
        <button key={p} type="button" role="radio" data-p={p} aria-checked={p === on} tabIndex={p === on ? 0 : -1} onClick={() => set(p)}>
          {PLATFORM_LABEL[p]}
        </button>
      ))}
    </div>
  );
}

function Player({ vm }: { vm: StepVM }) {
  const mutate = useMutate();
  const [platform, setPlatform] = useState<Platform>(vm.tabs[0] ?? 'claude');
  const on = vm.tabs.includes(platform) ? platform : (vm.tabs[0] ?? 'claude');
  const blocks = vm.paths[on] ?? [];
  const [busy, setBusy] = useState(false);

  const mark = async () => {
    if (!vm.mark.stepId || busy) return;
    setBusy(true);
    try {
      await mutate('toggleStep', { moduleId: vm.mark.moduleId, stepId: vm.mark.stepId });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className={s.pg}>
      <Link className={s.back} to={vm.back.href}>
        <Icon name="r2Back" size={14} strokeWidth={1.75} />
        {vm.back.label}
      </Link>
      <nav className={s.stepper} aria-label={vm.railLabel} style={{ ...nStyle(vm.rail.length), ...(vm.rail.length > 7 ? ({ '--n-ph': String(Math.ceil(vm.rail.length / 2)) } as CSSProperties) : {}) }}>
        {vm.rail.map((r) => (
          <Link key={r.n} to={r.href} data-on={r.on ? 'true' : undefined} aria-label={r.aria} aria-current={r.on ? 'step' : undefined}>
            {r.state === 'done' ? <Icon name="r2Check" size={14} strokeWidth={2.2} /> : null}
            {r.n}
          </Link>
        ))}
      </nav>
      <div className={s.wz}>
        <nav className={s.rl} aria-label={vm.railLabel}>
          {vm.rail.map((r) => (
            <Link key={r.n} className={s.stp} to={r.href} data-on={r.on ? 'true' : undefined} aria-label={r.aria} aria-current={r.on ? 'step' : undefined}>
              <span className={`${s.sti} ${s.stiS}`} data-s={r.state}>
                {r.state === 'done' ? <Icon name="r2Check" size={12} strokeWidth={2.2} /> : r.n}
              </span>
              <span className={s.cl2}>{r.label}</span>
            </Link>
          ))}
        </nav>

        <div className={s.col} style={{ gap: 20 }}>
          <div className={s.pht} style={{ gap: 8 }}>
            <span className={s.pk}>{vm.eyebrow}</span>
            <h1 className={s.h0}>{vm.title}</h1>
            {vm.lede ? <p className={s.lede}>{vm.lede}</p> : null}
            {vm.meta ? <span className={s.dl}>{vm.meta}</span> : null}
            {vm.doneWhen && blocks.length ? <p className={`${s.p} ${s.s2}`}>{vm.doneWhen}</p> : null}
            {vm.hint ? <p className={`${s.p} ${s.me}`}>{vm.hint}</p> : null}
          </div>

          <StepLive week={vm.week} step={vm.rail.find((r) => r.on)?.n ?? 1} />
          <section className={`${s.cd} ${s.hero} ${s.heroBlock}`} aria-labelledby="lv-do-t">
            <div className={s.cdh} style={{ flexWrap: 'wrap', rowGap: 10 }}>
              <h2 className={s.h2} id="lv-do-t" style={{ flex: '1 1 auto' }}>
                {STEP.doThis}
              </h2>
              {vm.tabs.length > 1 ? <Tabs tabs={vm.tabs} on={on} set={setPlatform} /> : null}
            </div>
            {blocks.length ? (
              <Blocks key={on} blocks={blocks} />
            ) : (
              <div className={s.blk}>
                <p className={`${s.p} ${s.s2}`}>{vm.doneWhen ?? vm.lede ?? vm.title}</p>
              </div>
            )}
            <div className={s.actb}>
              {vm.prev ? (
                <Link className={`${s.b} ${s.bq} ${s.bi}`} to={vm.prev}>
                  <Icon name="r2Back" size={14} strokeWidth={1.75} />
                  {STEP.previous}
                </Link>
              ) : null}
              {vm.next ? (
                <Link className={`${s.b} ${s.bq} ${s.bi}`} to={vm.next}>
                  {STEP.next}
                  <Icon name="r2Chev" size={14} strokeWidth={1.75} />
                </Link>
              ) : null}
              <button
                type="button"
                className={`${s.b} ${s.bp} ${s.done} ${s.markDone}`}
                aria-pressed={vm.mark.done}
                disabled={vm.mark.disabled || busy}
                onClick={() => void mark()}
              >
                <Icon name="r2Check" size={14} strokeWidth={2.2} />
                {STEP.markDone}
              </button>
            </div>
          </section>
        </div>

        <aside className={s.col} aria-label={STEP.kit}>
          {vm.forStep.length ? (
            <section className={s.cd} aria-labelledby="lv-skit-t">
              <div className={s.cdh}>
                <h2 className={s.h2} id="lv-skit-t">
                  {STEP.forStep}
                </h2>
              </div>
              <KitRows rows={vm.forStep} />
            </section>
          ) : null}
          <section className={s.cd} aria-labelledby="lv-help-t">
            <div className={s.cdh}>
              <h2 className={s.h2} id="lv-help-t">
                {STEP.stillStuck}
              </h2>
            </div>
            <Go className={s.li!} href={vm.help.email.href}>
              <Tile icon="r2Email" tone="forest" size={28} />
              <div className={`${s.colZ} ${s.grow}`}>
                <span className={s.w5}>{vm.help.email.label}</span>
                <span className={`${s.me} ${s.el}`}>{vm.help.email.address}</span>
              </div>
            </Go>
            {vm.help.officeHours ? (
              <Go className={s.li!} href={vm.help.officeHours.href}>
                <Tile icon="lvLive" tone="blue" size={28} />
                <div className={`${s.colZ} ${s.grow}`}>
                  <span className={s.w5}>{vm.help.officeHours.label}</span>
                  <span className={s.me}>{vm.help.officeHours.meta}</span>
                </div>
              </Go>
            ) : null}
          </section>
        </aside>
      </div>
    </div>
  );
}

export function Component() {
  const { course, db, viewer, now } = useLearn();
  const params = useParams();
  const me = learnerOf(db, viewer.actor.kind === 'learner' ? viewer.actor.userId : null);
  const rows = useMemo(() => (course.kind === 'ready' ? weekRows(course.payload, db, me) : []), [course, db, me]);
  if (course.kind !== 'ready') return <Navigate to={learnHome()} replace />;
  const week = weekParam(params.week);
  const vm = stepVM(course.payload, rows.find((r) => r.week === week), stepParam(params.step), viewer.actor, now);
  if (vm.kind === 'missing') return <Navigate to={vm.href} replace />;
  // A new step starts on its own first tab.
  return <Player key={`${vm.week}:${vm.eyebrow}`} vm={vm} />;
}

export default Component;
