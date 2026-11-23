// /learn/skills/:slug (D-179). Open (by the API's answer, the gate): the skill's guided setup, run in the
// step player's pieces (the rail and the stepper, the app tabs, the step's card with Previous and Next,
// the copy blocks). Otherwise its locked preview, the learner mockup's artboards 18/19: its name and one
// line, when it opens (or the lock line), its sample output labelled made up where its page has one, and
// what comes with it. Markup only: every string is computed in Library.vm.ts, or is the guide's own.

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { CSSProperties, KeyboardEvent, ReactNode } from 'react';
import { Link, Navigate, useParams } from 'react-router';
import type { GuideInline, GuideLane, GuideLaneId, GuideSample, GuideSampleBlock, GuideStep, GuideUi, SkillGuide } from '@ai/core/skill-guides';
import { Icon } from '../../components/Icon';
import { COPY as GUIDE } from '../library/SkillGuide';
import { COPY as LIBRARY } from '../library/SkillLibrary';
import { GetSkillButton } from '../library/SkillPurchase';
import { LABELS, SUPPORT_HREF } from './learn.vm';
import { LIB, clampStep, placeKey, progressText, skillOfSlug, skillPageVM } from './Library.vm';
import type { PreviewVM, SetupVM } from './Library.vm';
import { STEP } from './Step.vm';
import { CopyBlock, Go, Tile, columnTemplate, nStyle } from './parts';
import { learnSkills } from './routes';
import { useGuide, useSkills } from './skills-data';
import s from './Learn.module.css';
import l from './Library.module.css';

function Inline({ segs }: { segs: readonly GuideInline[] }) {
  return (
    <>
      {segs.map((seg, i) => {
        if (typeof seg === 'string') return <span key={i}>{seg}</span>;
        if ('strong' in seg) return <strong key={i}>{seg.strong}</strong>;
        if (seg.sameTab && seg.href.startsWith('/')) {
          return (
            <Link key={i} className={s.txl} to={seg.href}>
              {seg.link}
            </Link>
          );
        }
        return (
          <a key={i} className={s.txl} href={seg.href} target="_blank" rel="noopener">
            {seg.link}
          </a>
        );
      })}
    </>
  );
}

// --- the locked preview ------------------------------------------------------------------------------

function SampleBlock({ b }: { b: GuideSampleBlock }) {
  if ('h' in b) return <div className={l.doch}>{b.h}</div>;
  if ('p' in b)
    return (
      <p className={l.docp}>
        <Inline segs={b.p} />
      </p>
    );
  if ('items' in b)
    return (
      <ul className={l.fl}>
        {b.items.map((it, i) => (
          <li key={i}>
            <Icon name="dot" size={14} strokeWidth={1.75} />
            <span>{it}</span>
          </li>
        ))}
      </ul>
    );
  if ('table' in b) {
    const t = b.table;
    const cols = Math.max(t.head.length, ...t.rows.map((r) => r.length));
    const grid = { gridTemplateColumns: columnTemplate(t.head, t.rows, cols, '0') } as CSSProperties;
    return (
      <div className={l.dtb} role="table" aria-label={t.caption}>
        <div className={`${l.dtr} ${l.dth}`} role="row" style={grid}>
          {t.head.map((h, i) => (
            <span key={i} role="columnheader">
              {h}
            </span>
          ))}
        </div>
        {t.rows.map((r, i) => (
          <div key={i} className={l.dtr} role="row" style={grid}>
            {r.map((c, j) => (
              <span key={j} role="cell" data-h={j > 0 ? t.head[j] : undefined}>
                {c}
              </span>
            ))}
          </div>
        ))}
      </div>
    );
  }
  return (
    <div className={l.mail}>
      <p className={l.docp}>
        <strong>{b.email.subject}</strong>
      </p>
      {b.email.body.map((line, i) => (
        <p key={i} className={l.docp}>
          {line}
        </p>
      ))}
    </div>
  );
}

function Sample({ sample }: { sample: GuideSample }) {
  return (
    <section className={`${s.cd} ${s.hero} ${s.heroBlock} ${l.doc}`} aria-label={LIB.sampleAria}>
      <div className={l.docb}>
        <Icon name="eye" size={14} strokeWidth={1.75} />
        <b>{LIB.sample}</b>
        <span className={l.sep} aria-hidden="true">
          ·
        </span>
        <span>{LIB.madeUp}</span>
      </div>
      <div className={l.doci}>
        <div>
          <div className={l.doct}>{sample.title}</div>
          <div className={l.docs}>{sample.body}</div>
        </div>
        {sample.blocks.map((b, i) => (
          <SampleBlock key={i} b={b} />
        ))}
        <p className={l.docn}>
          <Icon name="info" size={14} strokeWidth={1.75} />
          <span>{sample.note}</span>
        </p>
      </div>
    </section>
  );
}

export function Preview({ vm }: { vm: PreviewVM }) {
  return (
    <div className={s.pg}>
      <Link className={s.back} to={vm.back.href}>
        <Icon name="r2Back" size={14} strokeWidth={1.75} />
        {vm.back.label}
      </Link>
      <div className={s.phd}>
        <div className={s.pht}>
          <div className={s.pid}>
            <Tile icon={vm.icon} tone={vm.tone} size={52} />
            <h1 className={s.h0}>{vm.title}</h1>
          </div>
          <p className={s.lede}>{vm.summary}</p>
          <span className={s.pk}>
            <Icon name="lvLock" size={14} strokeWidth={1.75} />
            <span>{vm.meta}</span>
          </span>
          {vm.plans ? <GetSkillButton skillId={vm.skillId} sets={vm.sets} className={`${s.b} ${l.plans}`} /> : null}
        </div>
      </div>
      <div className={vm.sample ? s.gms : l.side}>
        {vm.sample ? <Sample sample={vm.sample} /> : null}
        <div className={s.col}>
          {vm.when ? (
            <section className={s.cd} aria-labelledby="lv-wo-t">
              <div className={s.cdh}>
                <h2 className={s.h2} id="lv-wo-t">
                  {LIB.whenOpens}
                </h2>
              </div>
              <div className={s.li} style={{ gap: 12 }}>
                <span className={s.dt}>
                  <span className={s.dw}>{vm.when.tile.dw}</span>
                  <span className={s.dd}>{vm.when.tile.dd}</span>
                </span>
                <span className={`${s.w5} ${s.grow}`}>{vm.when.text}</span>
              </div>
            </section>
          ) : null}
          <section className={s.cd} aria-labelledby="lv-in-t">
            <div className={s.cdh}>
              <h2 className={s.h2} id="lv-in-t">
                {LIB.get}
              </h2>
            </div>
            {vm.get.map((r) => (
              <div key={r.key} className={s.li} style={{ gap: 12 }}>
                <Tile icon={r.icon} tone="forest" size={28} />
                <span className={s.grow}>{r.label}</span>
              </div>
            ))}
          </section>
        </div>
      </div>
    </div>
  );
}

// --- the guided setup, in the step player -------------------------------------------------------------

/** Where a learner is in a lane, on this device only (the current guide page's own key). Never an error. */
function readPlace(key: string): number {
  try {
    const n = Number(window.localStorage.getItem(key));
    return Number.isInteger(n) && n >= 0 ? n : 0;
  } catch {
    return 0;
  }
}
function savePlace(key: string, n: number): void {
  try {
    window.localStorage.setItem(key, String(n));
  } catch {
    /* Private mode: the place is not kept. */
  }
}

function LaneTabs({ lanes, on, set }: { lanes: GuideLane[]; on: GuideLaneId; set: (id: GuideLaneId) => void }) {
  const ids = lanes.map((x) => x.id);
  const onKey = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
    e.preventDefault();
    const i = ids.indexOf(on);
    const next = ids[(i + (e.key === 'ArrowRight' ? 1 : ids.length - 1)) % ids.length]!;
    set(next);
    e.currentTarget.querySelector<HTMLButtonElement>(`[data-p="${next}"]`)?.focus();
  };
  return (
    <div className={s.seg} role="radiogroup" aria-label={STEP.yourAi} onKeyDown={onKey}>
      {lanes.map((x) => (
        <button key={x.id} type="button" role="radio" data-p={x.id} aria-checked={x.id === on} tabIndex={x.id === on ? 0 : -1} onClick={() => set(x.id)}>
          {x.label}
        </button>
      ))}
    </div>
  );
}

function StepBody({ step, skill, lane, ui }: { step: GuideStep; skill: string; lane: GuideLaneId; ui: GuideUi }) {
  const opens = lane === 'grok' ? null : ui.copyOpen[lane];
  const action = step.action;
  const copyOpen = (text: string) =>
    opens ? (
      <a className={`${s.b} ${l.copyOpen}`} href={opens.href} target="_blank" rel="noopener" onClick={() => void navigator.clipboard?.writeText(text).catch(() => undefined)}>
        {opens.label}
        <Icon name="ext" size={14} strokeWidth={1.75} />
      </a>
    ) : null;
  return (
    <>
      <div className={s.blk}>
        <p className={`${s.p} ${s.s2}`}>
          <Inline segs={step.body} />
        </p>
        {action ? (
          action.kind === 'file' ? (
            <a className={`${s.b} ${s.bp} ${l.act}`} href={`/api/skills/${encodeURIComponent(skill)}/download/${action.file}`}>
              <Icon name="download" size={14} strokeWidth={1.75} />
              {action.label}
            </a>
          ) : (
            <a className={`${s.b} ${l.act}`} href={action.href} target="_blank" rel="noopener">
              {action.label}
              <Icon name="ext" size={14} strokeWidth={1.75} />
            </a>
          )
        ) : null}
      </div>
      {step.copy !== undefined ? (
        <div className={s.blk}>
          <CopyBlock text={step.copy} label={step.title} />
          {copyOpen(step.copy)}
        </div>
      ) : null}
      {step.copyBlock !== undefined ? (
        <div className={s.blk}>
          <CopyBlock text={step.copyBlock} label={step.title} />
          {copyOpen(step.copyBlock)}
        </div>
      ) : null}
      {step.note ? (
        <div className={s.blk}>
          <p className={`${s.p} ${s.me}`}>
            <Inline segs={step.note} />
          </p>
        </div>
      ) : null}
    </>
  );
}

function Player({ guide, ui, back }: { guide: SkillGuide; ui: GuideUi; back: SetupVM['back'] }) {
  const [laneId, setLaneId] = useState<GuideLaneId>(guide.lanes[0]?.id ?? 'claude');
  const lane = guide.lanes.find((x) => x.id === laneId) ?? guide.lanes[0];
  const key = placeKey(guide.slug, lane?.id ?? laneId);
  const [at, setAt] = useState(() => readPlace(key));
  const heading = useRef<HTMLHeadingElement | null>(null);
  const moved = useRef(false);
  useEffect(() => setAt(readPlace(key)), [key]);
  const total = lane?.steps.length ?? 0;
  const current = clampStep(at, total);
  const go = useCallback(
    (n: number) => {
      moved.current = true;
      setAt(n);
      savePlace(key, n);
    },
    [key],
  );
  // Moving to a step puts the keyboard and a screen reader on its title.
  useEffect(() => {
    if (moved.current) heading.current?.focus();
  }, [current]);
  if (!lane) return null;
  const step = lane.steps[current];
  const railLabel = `${guide.title} ${STEP.steps}`;
  const stepperStyle = { ...nStyle(total), ...(total > 7 ? ({ '--n-ph': String(Math.ceil(total / 2)) } as CSSProperties) : {}) };

  return (
    <div className={s.pg}>
      <Link className={s.back} to={back.href}>
        <Icon name="r2Back" size={14} strokeWidth={1.75} />
        {back.label}
      </Link>
      <nav className={`${s.stepper} ${l.stepper}`} aria-label={railLabel} style={stepperStyle}>
        {lane.steps.map((st, i) => (
          <button key={i} type="button" data-on={i === current ? 'true' : undefined} aria-current={i === current ? 'step' : undefined} aria-label={`${LABELS.step} ${i + 1}, ${st.title}`} onClick={() => go(i)}>
            {i < current ? <Icon name="r2Check" size={14} strokeWidth={2.2} /> : null}
            {i + 1}
          </button>
        ))}
      </nav>
      <div className={s.wz}>
        <nav className={s.rl} aria-label={railLabel}>
          {lane.steps.map((st, i) => (
            <button key={i} type="button" className={`${s.stp} ${l.rlb}`} data-on={i === current ? 'true' : undefined} aria-current={i === current ? 'step' : undefined} onClick={() => go(i)}>
              <span className={`${s.sti} ${s.stiS}`} data-s={i < current ? 'done' : i === current ? 'current' : 'todo'}>
                {i < current ? <Icon name="r2Check" size={12} strokeWidth={2.2} /> : i + 1}
              </span>
              <span className={s.cl2}>{st.title}</span>
            </button>
          ))}
        </nav>

        <div className={s.col} style={{ gap: 20 }}>
          <div className={s.pht} style={{ gap: 8 }}>
            <span className={s.pk}>{guide.title}</span>
            <h1 className={s.h0} ref={heading} tabIndex={-1}>
              {step?.title ?? guide.title}
            </h1>
            <p className={s.lede}>{guide.intro}</p>
            <span className={s.dl}>{progressText(ui, current + 1, total)}</span>
          </div>

          <section className={`${s.cd} ${s.hero} ${s.heroBlock}`} aria-labelledby="lv-do-t">
            <div className={s.cdh} style={{ flexWrap: 'wrap', rowGap: 10 }}>
              <h2 className={s.h2} id="lv-do-t" style={{ flex: '1 1 auto' }}>
                {STEP.doThis}
              </h2>
              {guide.lanes.length > 1 ? <LaneTabs lanes={guide.lanes} on={lane.id} set={setLaneId} /> : null}
            </div>
            {step ? <StepBody key={`${lane.id}:${current}`} step={step} skill={guide.skill} lane={lane.id} ui={ui} /> : null}
            <div className={s.actb}>
              {current > 0 ? (
                <button type="button" className={`${s.b} ${s.bq} ${s.bi}`} onClick={() => go(current - 1)}>
                  <Icon name="r2Back" size={14} strokeWidth={1.75} />
                  {STEP.previous}
                </button>
              ) : null}
              {current < total - 1 ? (
                <button type="button" className={`${s.b} ${s.bp} ${s.done}`} onClick={() => go(current + 1)}>
                  {STEP.next}
                  <Icon name="r2Chev" size={14} strokeWidth={1.75} />
                </button>
              ) : (
                <button type="button" className={`${s.b} ${s.done}`} onClick={() => go(0)}>
                  {ui.guided.startOver}
                </button>
              )}
            </div>
          </section>
        </div>

        <aside className={s.col} aria-label={STEP.kit}>
          {guide.prompts.map((p, i) => (
            <section key={p.heading} className={s.cd} aria-labelledby={`lv-pr-${i}`}>
              <div className={s.cdh}>
                <h2 className={s.h2} id={`lv-pr-${i}`}>
                  {p.heading}
                </h2>
              </div>
              <div className={s.blk}>
                <p className={`${s.p} ${s.me}`}>{p.body}</p>
              </div>
              {p.groups.map((g) => (
                <div key={g.label} className={s.blk}>
                  <span className={s.w5}>{g.label}</span>
                  {g.items.map((w) => (
                    <CopyBlock key={w} text={w} />
                  ))}
                </div>
              ))}
            </section>
          ))}
          <section className={s.cd} aria-labelledby="lv-help-t">
            <div className={s.cdh}>
              <h2 className={s.h2} id="lv-help-t">
                {STEP.stillStuck}
              </h2>
            </div>
            <Go className={s.li!} href={SUPPORT_HREF}>
              <Tile icon="r2Email" tone="forest" size={28} />
              <div className={`${s.colZ} ${s.grow}`}>
                <span className={s.w5}>{LABELS.emailSupport}</span>
              </div>
            </Go>
          </section>
        </aside>
      </div>
    </div>
  );
}

function Status({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className={s.pg}>
      <Link className={s.back} to={learnSkills()}>
        <Icon name="r2Back" size={14} strokeWidth={1.75} />
        {LIB.back}
      </Link>
      <h1 className={s.h0}>{title}</h1>
      {children}
    </div>
  );
}

export function Component() {
  const { slug } = useParams();
  const skills = useSkills();
  const known = skillOfSlug(slug) !== null;
  const guide = useGuide(known && slug ? slug : null);
  const vm = useMemo(
    () => (skills.kind === 'ready' && guide.kind !== 'loading' ? skillPageVM(skills.payload, slug, guide.kind === 'ready' ? guide.answer : null) : null),
    [skills, guide, slug],
  );

  if (!known) return <Navigate to={learnSkills()} replace />;
  if (skills.kind === 'loading' || guide.kind === 'loading')
    return (
      <Status title={LIB.title}>
        <div className={l.status} role="status" aria-busy="true">
          <Icon name="spinner" size={20} strokeWidth={2.2} className={l.spin} label={LIB.loadingGuide} />
        </div>
      </Status>
    );
  if (skills.kind === 'signed-out')
    return (
      <Status title={LIB.title}>
        <div className={l.status}>
          <p className={s.p}>{LIBRARY.unavailable}</p>
          <a className={`${s.b} ${s.bp}`} href="/sign-in">
            {LIBRARY.signIn}
          </a>
        </div>
      </Status>
    );
  if (skills.kind === 'failed' || !vm)
    return (
      <Status title={LIB.title}>
        <p className={`${s.p} ${l.status}`} role="alert">
          {LIBRARY.failed}
        </p>
      </Status>
    );
  if (vm.kind === 'missing') return <Navigate to={vm.href} replace />;
  if (vm.kind === 'failed')
    return (
      <Status title={vm.title}>
        <p className={`${s.p} ${l.status}`} role="alert">
          {GUIDE.failed}
        </p>
      </Status>
    );
  if (vm.kind === 'setup') return <Player key={vm.guide.slug} guide={vm.guide} ui={vm.ui} back={vm.back} />;
  return <Preview vm={vm} />;
}

export default Component;
