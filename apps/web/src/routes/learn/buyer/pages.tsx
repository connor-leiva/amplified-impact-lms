// D-241: the $37 skill buyer's pages: Home, the Skill Library, a locked skill, Weekly Live Training, Office Hours and
// the AI Accelerator. Each is the approved mockup's markup (`handoff/lms-mockup/buyer.html`), drawn from the view-models
// (`buyer.vm.ts`) and the words (`content.ts`), with the LMS v3 mockup's classes and the buyer's own (`buyer.css`).
// Links are plain anchors, as in the mockup: the frame hands an in-app address to the router.
import { Fragment, useLayoutEffect, useRef, useState } from 'react';
import type { CSSProperties, KeyboardEvent, ReactNode } from 'react';
import { RollLabel } from '@brand/ai-motion';
import type { CartId } from '@ai/core/offer';
import type { SkillGuidePreview } from '@ai/core/skill-guides';
import { Icon, NumCheck } from '../lms-v3/Icons';
import { learnHome, learnOfficeHours, learnSkill, learnSkills, learnTraining, learnWeek } from '../routes';
import { ACCEL, ACCELERATOR_HREF, AGENT_PLAN_UP, COPY, OFFICE, TRAINING } from './content';
import type { BuyerPlan } from './content';
import { DOWNLOAD_LABEL, FIRST_ROWS, downloadHref, downloadsOf, librarySets, lockedOf, myPlan, nextSkills, opensWith, ownedOf, planOf } from './buyer.vm';
import type { BuyerSkill } from './buyer.vm';

/** Each cart's Payment Link, from `GET /api/offer` (Railway's `PAYMENT_LINK_*`). A missing one draws the button disabled. */
export type Links = Partial<Record<CartId, string | null>>;

const rise = (i: number) => ({ '--i': i }) as CSSProperties;
const MINIMUM = '3-Month Minimum.';

/** A line with "3-Month Minimum." kept on one line. */
function Terms({ text }: { text: string }) {
  const at = text.indexOf(MINIMUM);
  if (at < 0) return <>{text}</>;
  return (
    <>
      {text.slice(0, at)}
      <span className="by-nb">{MINIMUM}</span>
      {text.slice(at + MINIMUM.length)}
    </>
  );
}

function Crumbs({ trail }: { trail: readonly (readonly [string, string?])[] }) {
  return (
    <nav className="wk-crumbs aim-rise" style={rise(0)} aria-label="Breadcrumb">
      <a href={learnHome()}>{COPY.here.home}</a>
      {trail.map(([label, href]) => (
        <Fragment key={label}>
          <span aria-hidden="true">/</span>
          {href ? <a href={href}>{label}</a> : <span>{label}</span>}
        </Fragment>
      ))}
    </nav>
  );
}

const LockedPill = () => (
  <span className="wk-open" data-s="locked">
    <Icon name="lock" size={12} />
    {COPY.locked}
  </span>
);
const StLocked = () => (
  <span className="wk-st" data-s="locked">
    <Icon name="lock" size={12} />
    {COPY.locked}
  </span>
);
const Tag = ({ icon, children }: { icon: string; children: ReactNode }) => (
  <span className="wk-tag">
    <Icon name={icon} />
    {children}
  </span>
);
function Help({ i }: { i: number }) {
  return (
    <section className="wk-card aim-rise" style={rise(i)} aria-label="Questions">
      <div className="wk-help">
        <b>{COPY.questions}</b>
        <a className="wk-mail" href={`mailto:${COPY.support}`}>
          {COPY.support}
        </a>
      </div>
    </section>
  );
}
function Checks({ items }: { items: readonly string[] }) {
  return (
    <ul className="by-checks">
      {items.map((x) => (
        <li key={x}>
          <NumCheck />
          <span>{x}</span>
        </li>
      ))}
    </ul>
  );
}

/** An upgrade button: the cart's Payment Link, or disabled while it isn't set. */
function Pay({ cart, links, className, children }: { cart: CartId; links: Links; className: string; children: ReactNode }) {
  const href = links[cart] ?? undefined;
  return (
    <a className={className} href={href} aria-disabled={href ? undefined : 'true'} data-cart={cart}>
      {children}
    </a>
  );
}

function UpCard({ plan, i, links, owned, button = true }: { plan: BuyerPlan; i: number; links: Links; owned: readonly BuyerSkill[]; button?: boolean }) {
  const keep = COPY.home.keeps(owned.length === 1 ? owned[0]!.title : null);
  return (
    <section className="wk-card aim-rise" style={rise(i)} aria-labelledby={`up-h-${i}`}>
      <div className="by-up-h">
        <p className="wk-label">{plan.who}</p>
        <h2 className="wk-h3" id={`up-h-${i}`}>
          {plan.name}
        </h2>
        <p className="by-price">
          <b>{plan.amount}</b>
          {COPY.home.aMonth}
        </p>
        <p className="by-terms">{plan.terms}</p>
      </div>
      <Checks items={[...plan.checks, keep]} />
      {button ? (
        <div className="wk-kit-foot">
          <Pay cart={plan.cart} links={links} className="wk-btn wk-btn-primary by-wrap">
            <RollLabel>{plan.short}</RollLabel>
          </Pay>
        </div>
      ) : null}
    </section>
  );
}

const fileIcon = (k: string) => (k === 'practice' ? 'file' : 'down');

// --- Home ------------------------------------------------------------------------------------------

export function Home({ skills, first, hour, links }: { skills: readonly BuyerSkill[]; first: string; hour: number; links: Links }) {
  const owned = ownedOf(skills);
  const s = owned[0]!;
  const many = owned.length > 1;
  const plan = myPlan(owned);
  const locked = lockedOf(skills).length;
  const opens = opensWith(plan, skills);
  const rows: [string, string, string, string, string][] = [
    ['grid', COPY.home.everyOther, opens === locked ? COPY.home.everyOtherAll(locked) : COPY.home.everyOtherSome(locked, plan.chip, opens), plan.chip, learnSkills()],
    ['users', COPY.home.office, OFFICE.body, plan.chip, learnOfficeHours()],
    ['radio', COPY.home.training, COPY.home.trainingLine, COPY.home.trainingChip, learnTraining()],
    ['flag', COPY.home.week0, COPY.home.week0Line, COPY.home.accelChip, learnWeek(0)],
    ['layers', COPY.home.hires, COPY.home.hiresLine, COPY.home.accelChip, learnWeek(1)],
  ];
  return (
    <div className="wk-page">
      <header className="wk-head aim-rise" style={rise(0)}>
        <h1 className="wk-h1">{`${COPY.greeting(hour)}, ${first}`}</h1>
        <p className="wk-purpose">{many ? COPY.home.many : COPY.home.one}</p>
      </header>
      <section className="wk-hero aim-rise" style={rise(1)} aria-label={COPY.shell.yourSkill}>
        <div className="wk-hero-main">
          <p className="wk-kick">{many ? COPY.home.kickMany(owned.length) : COPY.home.kick}</p>
          <h2 className="wk-hero-t">{s.title}</h2>
          <p className="wk-hero-m">
            <span>{s.tools}</span>
            <span>{s.role}</span>
          </p>
          <p className="wk-hero-d">
            <b>{COPY.home.whatItDoes}</b>
            {s.outcome}
          </p>
          <div className="wk-hero-acts">
            <a className="wk-btn wk-btn-accent wk-btn-lg wk-btn-arrow" href={learnSkill(s.slug)}>
              <RollLabel>{COPY.shell.openGuide}</RollLabel>
              <Icon name="arrow" size={16} className="wk-arrow" />
            </a>
            {many ? (
              <a className="wk-btn wk-btn-onforest wk-btn-lg wk-btn-arrow" href={learnSkills()}>
                <RollLabel>{COPY.home.seeAll}</RollLabel>
                <Icon name="arrow" size={16} className="wk-arrow" />
              </a>
            ) : null}
          </div>
        </div>
        <div className="wk-prog">
          <p className="wk-prog-l">
            <Icon name="down" />
            {COPY.home.downloads}
          </p>
          <div className="by-side">
            {downloadsOf(s).map((k) => (
              <a key={k} className="wk-btn wk-btn-onforest by-line" href={downloadHref(s.id, k)}>
                <Icon name={fileIcon(k)} />
                <RollLabel>{DOWNLOAD_LABEL[k]}</RollLabel>
              </a>
            ))}
          </div>
          <p className="wk-prog-left">{COPY.home.setOnce}</p>
        </div>
      </section>
      <div className="wk-grid by-g1">
        <section className="wk-steps-sec aim-rise" style={rise(2)} aria-labelledby="more-h">
          <div className="wk-sec-head">
            <h2 className="wk-h2" id="more-h">
              {COPY.home.alsoTitle}
            </h2>
          </div>
          <p className="wk-sum">{COPY.home.alsoSum}</p>
          <ol className="wk-steps">
            {rows.map(([icon, title, line, chip, href]) => (
              <li key={title}>
                <a className="wk-step" data-s="locked" href={href}>
                  <span className="wk-ic" aria-hidden="true">
                    <Icon name={icon} size={16} />
                  </span>
                  <span className="wk-step-tx">
                    <span className="wk-step-t">
                      {title}
                      <span className="wk-chip">{chip}</span>
                    </span>
                    <span className="wk-step-d">{line}</span>
                  </span>
                  <span className="wk-step-r">
                    <StLocked />
                  </span>
                  <Icon name="right" size={20} className="wk-chev wk-arrow" />
                </a>
              </li>
            ))}
          </ol>
        </section>
        <aside className="wk-rail" aria-label="Upgrade">
          <UpCard plan={plan} i={3} links={links} owned={owned} />
          <Help i={4} />
        </aside>
      </div>
      <section className="aim-rise" style={rise(5)} aria-labelledby="next-h">
        <h2 className="wk-h2" id="next-h">
          {COPY.home.nextTitle}
        </h2>
        <p className="wk-sum">{COPY.home.nextSum(COPY.sets[s.sets], many)}</p>
        <ul className="by-cards">
          {nextSkills(skills, s).map((x) => (
            <li key={x.id} className="wk-card by-card">
              <span className="wk-ic" aria-hidden="true">
                <Icon name="book" size={16} />
              </span>
              <a className="wk-kit-a" href={learnSkill(x.slug)}>
                {x.title}
              </a>
              <p className="wk-step-d">{x.outcome}</p>
              <span className="by-go">
                {COPY.home.preview}
                <Icon name="arrow" size={14} className="wk-arrow" />
              </span>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}

// --- the Skill Library -----------------------------------------------------------------------------

function OwnCard({ s, i }: { s: BuyerSkill; i: number }) {
  return (
    <article className="wk-card aim-rise" style={rise(i)} aria-labelledby={`own-${s.id}`}>
      <div className="by-own-h">
        <span className="wk-ic" aria-hidden="true">
          <Icon name="book" size={16} />
        </span>
        <div>
          <h3 className="wk-h3" id={`own-${s.id}`}>
            {s.title}
          </h3>
          <p>{`${COPY.setOne[s.sets]} · ${s.tools}`}</p>
        </div>
        <span className="wk-st" data-s="next">
          <Icon name="check" />
          {COPY.library.yoursChip}
        </span>
      </div>
      <dl className="wk-dl by-lead">
        <div>
          <dt>{COPY.lead.problem}</dt>
          <dd>{s.problem}</dd>
        </div>
        <div>
          <dt>{COPY.lead.outcome}</dt>
          <dd>{s.outcome}</dd>
        </div>
        <div>
          <dt>{COPY.lead.forRole}</dt>
          <dd>{s.role}</dd>
        </div>
      </dl>
      <div className="by-acts">
        <a className="wk-btn wk-btn-primary wk-btn-arrow" href={learnSkill(s.slug)}>
          <RollLabel>{COPY.shell.openGuide}</RollLabel>
          <Icon name="arrow" className="wk-arrow" />
        </a>
        {downloadsOf(s).map((k) => (
          <a key={k} className="wk-btn wk-btn-secondary" href={downloadHref(s.id, k)}>
            <Icon name={fileIcon(k)} />
            <RollLabel>{DOWNLOAD_LABEL[k]}</RollLabel>
          </a>
        ))}
      </div>
    </article>
  );
}

function SkillRow({ s, more }: { s: BuyerSkill; more: boolean }) {
  return (
    <li data-more={more ? '' : undefined}>
      <a className="wk-step" data-s={s.open ? undefined : 'locked'} href={learnSkill(s.slug)}>
        <span className="wk-ic" aria-hidden="true">
          <Icon name="book" size={16} />
        </span>
        <span className="wk-step-tx">
          <span className="wk-step-t">
            {s.title}
            <span className="wk-chip">{s.role}</span>
          </span>
          <span className="wk-step-d">{s.outcome}</span>
        </span>
        <span className="wk-step-r">
          {s.owned ? (
            <span className="wk-st" data-s="next">
              <Icon name="check" />
              {COPY.library.yoursChip}
            </span>
          ) : s.free ? (
            <span className="wk-st" data-s="progress">
              {COPY.library.free}
            </span>
          ) : (
            <StLocked />
          )}
          <span className="wk-time">{s.tools}</span>
        </span>
        <Icon name="right" size={20} className="wk-chev wk-arrow" />
      </a>
    </li>
  );
}

function SetList({ set, label, meta, rows }: ReturnType<typeof librarySets>[number]) {
  const [all, setAll] = useState(false);
  return (
    <div className="by-set">
      <h3 className="sc-month" id={`set-${set}`}>
        {label}
        <small>{meta}</small>
      </h3>
      <ol className="wk-steps by-list" data-all={all ? 'true' : 'false'} aria-labelledby={`set-${set}`}>
        {rows.map((s, i) => (
          <SkillRow key={s.id} s={s} more={i >= FIRST_ROWS} />
        ))}
      </ol>
      {rows.length > FIRST_ROWS && !all ? (
        <div className="by-more">
          <button className="wk-btn wk-btn-ghost wk-btn-sm" type="button" data-more="" onClick={() => setAll(true)}>
            <RollLabel>{COPY.library.showAll(rows.length)}</RollLabel>
            <Icon name="chev" />
          </button>
        </div>
      ) : null}
    </div>
  );
}

export function Library({ skills, links }: { skills: readonly BuyerSkill[]; links: Links }) {
  const owned = ownedOf(skills);
  const many = owned.length > 1;
  const plan = myPlan(owned);
  return (
    <div className="wk-page">
      <Crumbs trail={[[COPY.library.title]]} />
      <header className="wk-head aim-rise" style={rise(0)}>
        <h1 className="wk-h1">{COPY.library.title}</h1>
        <p className="wk-purpose">{COPY.library.lede(many)}</p>
      </header>
      <section className="aim-rise" style={rise(1)} aria-labelledby="own-h">
        <div className="wk-sec-head">
          <h2 className="wk-h2" id="own-h">
            {COPY.library.yours(many)}
          </h2>
        </div>
        <div className="by-owned">
          {owned.map((s, k) => (
            <OwnCard key={s.id} s={s} i={1 + k} />
          ))}
        </div>
      </section>
      <section className="wk-hero aim-rise" style={rise(2)} aria-label="Upgrade">
        <div className="wk-hero-main">
          <p className="wk-kick">{`${plan.name} · ${plan.amount} ${COPY.home.aMonth}`}</p>
          <h2 className="wk-hero-t">{plan.every}</h2>
          <p className="wk-hero-d">
            <b>{plan.name}</b>
            {plan.line} <Terms text={plan.terms} />
          </p>
          <div className="wk-hero-acts">
            <Pay cart={plan.cart} links={links} className="wk-btn wk-btn-accent wk-btn-lg by-wrap">
              <RollLabel>{plan.button}</RollLabel>
            </Pay>
          </div>
        </div>
        <div className="wk-prog">
          <p className="wk-prog-l">
            <Icon name="lock" />
            {COPY.library.lockedNow}
          </p>
          <p className="wk-prog-n">
            <b>{opensWith(plan, skills)}</b>
            {COPY.library.skills}
          </p>
          <p className="wk-prog-left">{plan.key === 'leader' ? COPY.library.opensLeader : COPY.library.opensAgent}</p>
        </div>
      </section>
      <section className="aim-rise" style={rise(3)} aria-labelledby="all-h">
        <div className="wk-sec-head">
          <h2 className="wk-h2" id="all-h">
            {COPY.library.every}
          </h2>
        </div>
        <p className="wk-sum">{COPY.library.everySum}</p>
        {librarySets(skills).map((g) => (
          <SetList key={g.set} {...g} />
        ))}
      </section>
    </div>
  );
}

// --- a locked skill --------------------------------------------------------------------------------

/** The Claude, ChatGPT (and Grok Bot) tabs over a locked guide's steps: one segmented control, every tab alike. */
function LaneSteps({ preview }: { preview: SkillGuidePreview }) {
  const [lane, setLane] = useState(preview.lanes[0]?.id ?? 'claude');
  const seg = useRef<HTMLDivElement>(null);
  const [live, setLive] = useState(false);
  const [thumb, setThumb] = useState<CSSProperties>({});
  useLayoutEffect(() => {
    const el = seg.current;
    if (!el) return undefined;
    const place = () => {
      const b = el.querySelector<HTMLElement>('[aria-checked="true"]');
      if (b) setThumb({ '--x': `${b.offsetLeft}px`, '--w': `${b.offsetWidth}px` } as CSSProperties);
    };
    place();
    const ro = new ResizeObserver(place);
    ro.observe(el);
    void document.fonts?.ready.then(() => {
      place();
      requestAnimationFrame(() => requestAnimationFrame(() => setLive(true)));
    });
    return () => ro.disconnect();
  }, [lane]);
  const ids = preview.lanes.map((l) => l.id);
  const onKey = (e: KeyboardEvent<HTMLButtonElement>, i: number) => {
    const d = e.key === 'ArrowRight' || e.key === 'ArrowDown' ? 1 : e.key === 'ArrowLeft' || e.key === 'ArrowUp' ? -1 : 0;
    if (!d) return;
    e.preventDefault();
    const next = ids[(i + d + ids.length) % ids.length]!;
    setLane(next);
    seg.current?.querySelector<HTMLButtonElement>(`[data-lane="${next}"]`)?.focus();
  };
  return (
    <>
      <div className="wk-sec-head by-setup-h">
        <h2 className="wk-h2" id="setup-h">
          {COPY.skill.setup}
        </h2>
        {preview.lanes.length > 1 ? (
          <div className="wk-seg" id="lane-seg" role="radiogroup" aria-label={COPY.skill.yourAi} ref={seg}>
            <span className={'wk-seg-thumb' + (live ? ' live' : '')} aria-hidden="true" style={thumb} />
            {preview.lanes.map((l, i) => (
              <button
                key={l.id}
                className="wk-seg-b"
                type="button"
                role="radio"
                aria-checked={l.id === lane ? 'true' : 'false'}
                tabIndex={l.id === lane ? undefined : -1}
                data-lane={l.id}
                onClick={() => setLane(l.id)}
                onKeyDown={(e) => onKey(e, i)}
              >
                {l.label}
                <small>{l.steps.length}</small>
              </button>
            ))}
          </div>
        ) : null}
      </div>
      {preview.lanes.map((l) => (
        <ol key={l.id} className="wk-steps by-steps" data-lane-list={l.id} hidden={l.id !== lane} aria-label={COPY.skill.steps(l.label)}>
          {l.steps.map((t, n) => (
            <li key={`${n}-${t}`}>
              <div className="wk-step" data-s="waiting">
                <span className="wk-num" aria-hidden="true">
                  {n + 1}
                </span>
                <span className="wk-step-tx">
                  <span className="wk-step-t">{t}</span>
                </span>
                <Icon name="lock" size={16} className="by-lock" />
              </div>
            </li>
          ))}
        </ol>
      ))}
    </>
  );
}

export type Checkout = { kind: 'idle' } | { kind: 'busy' } | { kind: 'failed' };

export function LockedSkill({
  s,
  preview,
  links,
  checkout,
  onBuy,
}: {
  s: BuyerSkill;
  preview: SkillGuidePreview | null;
  links: Links;
  checkout: Checkout;
  onBuy: () => void;
}) {
  const plan = planOf(s);
  const what: [string, string][] = [
    ['book', COPY.skill.getGuide],
    ['down', s.files.includes('grok') ? COPY.skill.getGrok : s.files.includes('chatgpt') ? COPY.skill.getBoth : COPY.skill.getClaude],
    ...(s.files.includes('practice') ? ([['file', COPY.skill.getPractice]] as [string, string][]) : []),
  ];
  return (
    <div className="wk-page">
      <Crumbs trail={[[COPY.library.title, learnSkills()], [s.title]]} />
      <header className="wk-head aim-rise" style={rise(0)}>
        <p className="wk-eyebrow">
          {COPY.setOne[s.sets]} <LockedPill />
        </p>
        <h1 className="wk-h1">{s.title}</h1>
        <p className="wk-purpose">{s.outcome}</p>
        <div className="wk-meta">
          <Tag icon="users">{s.role}</Tag>
          <Tag icon="book">{s.tools}</Tag>
          {s.files.includes('practice') ? <Tag icon="file">{COPY.skill.practiceTag}</Tag> : null}
        </div>
      </header>
      <section className="wk-hero aim-rise" style={rise(1)} aria-label="Get this skill">
        <div className="wk-hero-main">
          <p className="wk-kick">{COPY.skill.kick(plan.name)}</p>
          <h2 className="wk-hero-t">{plan.getAll}</h2>
          <p className="wk-hero-d">
            <b>{plan.name}</b>
            {plan.line} <span className="by-nb">{MINIMUM}</span>
          </p>
          <div className="wk-hero-acts">
            <Pay cart={plan.cart} links={links} className="wk-btn wk-btn-accent wk-btn-lg by-wrap">
              <RollLabel>{plan.button}</RollLabel>
            </Pay>
          </div>
        </div>
        <div className="wk-prog">
          <p className="wk-prog-l">{COPY.skill.orThis}</p>
          <p className="wk-prog-n">
            <b>{COPY.skill.price}</b>
            {COPY.skill.once}
          </p>
          <p className="wk-prog-left">{COPY.skill.keep}</p>
          {s.forSale ? (
            <button className="wk-btn wk-btn-onforest by-line" type="button" onClick={onBuy} disabled={checkout.kind === 'busy'} aria-busy={checkout.kind === 'busy' || undefined}>
              <RollLabel>{checkout.kind === 'busy' ? COPY.skill.starting : COPY.skill.get}</RollLabel>
            </button>
          ) : null}
          {checkout.kind === 'failed' ? (
            <p className="wk-prog-left" role="alert">
              {COPY.skill.failed}
            </p>
          ) : null}
        </div>
      </section>
      <div className="wk-grid by-g1">
        <section className="wk-steps-sec aim-rise" style={rise(2)} aria-labelledby="setup-h">
          <div className="wk-card">
            <dl className="wk-dl by-lead by-lead-card">
              <div>
                <dt>{COPY.lead.problem}</dt>
                <dd>{s.problem}</dd>
              </div>
              <div>
                <dt>{COPY.lead.outcome}</dt>
                <dd>{s.outcome}</dd>
              </div>
              <div>
                <dt>{COPY.lead.forRole}</dt>
                <dd>{s.role}</dd>
              </div>
            </dl>
          </div>
          {preview && preview.lanes.length ? <LaneSteps preview={preview} /> : null}
        </section>
        <aside className="wk-rail" aria-label="What you get">
          <section className="wk-card aim-rise" style={rise(3)} aria-labelledby="get-h">
            <div className="wk-card-h">
              <h3 className="wk-h3" id="get-h">
                {COPY.skill.getTitle}
              </h3>
            </div>
            <ul>
              {what.map(([icon, t]) => (
                <li key={t} className="wk-kit-row">
                  <span className="wk-ic">
                    <Icon name={icon} size={16} />
                  </span>
                  <span className="wk-kit-tx">
                    <b>{t}</b>
                  </span>
                  <span />
                </li>
              ))}
            </ul>
          </section>
          <Help i={4} />
        </aside>
      </div>
    </div>
  );
}

// --- Weekly Live Training ---------------------------------------------------------------------------

export function Training({ skills, links }: { skills: readonly BuyerSkill[]; links: Links }) {
  const byKey = (k: string) => skills.find((x) => x.slug === k || x.id === k);
  return (
    <div className="wk-page">
      <Crumbs trail={[[TRAINING.title]]} />
      <header className="wk-head aim-rise" style={rise(0)}>
        <p className="wk-eyebrow">
          {AGENT_PLAN_UP.name} <LockedPill />
        </p>
        <h1 className="wk-h1">{TRAINING.title}</h1>
        <p className="wk-purpose">{TRAINING.lede}</p>
        <div className="wk-meta">
          <Tag icon="cal">{TRAINING.when}</Tag>
          <Tag icon="clock">{COPY.training.minutes}</Tag>
          <Tag icon="users">{COPY.training.forAgents}</Tag>
        </div>
      </header>
      <section className="wk-hero aim-rise" style={rise(1)} aria-label="Upgrade">
        <div className="wk-hero-main">
          <p className="wk-kick">{COPY.training.kick}</p>
          <h2 className="wk-hero-t">{COPY.training.hero}</h2>
          <p className="wk-hero-d">
            <b>{COPY.training.body}</b>
            <Terms text={AGENT_PLAN_UP.body} />
          </p>
          <div className="wk-hero-acts">
            <Pay cart={AGENT_PLAN_UP.cart} links={links} className="wk-btn wk-btn-accent wk-btn-lg by-wrap">
              <RollLabel>{AGENT_PLAN_UP.button}</RollLabel>
            </Pay>
          </div>
        </div>
        <div className="wk-prog">
          <p className="wk-prog-l">
            <Icon name="radio" />
            {COPY.training.perWeek}
          </p>
          <p className="wk-prog-n">
            <b>{TRAINING.weeks.length}</b>
            {COPY.training.topics}
          </p>
          <p className="wk-prog-left">{COPY.training.cover}</p>
        </div>
      </section>
      <div className="wk-grid by-g1">
        <section className="wk-steps-sec aim-rise" style={rise(2)} aria-labelledby="rot-h">
          <h2 className="wk-h2" id="rot-h">
            {COPY.training.rotation}
          </h2>
          <ol className="sc-list lk-list">
            {TRAINING.weeks.map((w) => (
              <li key={w.n} className="sc-week">
                <span className="sc-date" aria-hidden="true">
                  <small>{COPY.week}</small>
                  <b>{w.n}</b>
                </span>
                <div className="sc-body">
                  <div className="sc-t">
                    <b className="sc-a">{w.topic}</b>
                  </div>
                  <ul className="sc-sess">
                    {w.skills.map((k) => {
                      const x = byKey(k);
                      return x ? (
                        <li key={k}>
                          <Icon name="book" />
                          <span>{x.title}</span>
                          {x.owned ? <span className="sc-when">{COPY.training.yours}</span> : x.free ? <span className="sc-when">{COPY.training.free}</span> : null}
                        </li>
                      ) : null;
                    })}
                  </ul>
                </div>
                <div className="sc-side">
                  <StLocked />
                </div>
              </li>
            ))}
          </ol>
        </section>
        <aside className="wk-rail" aria-label={AGENT_PLAN_UP.name}>
          <section className="wk-card aim-rise" style={rise(3)} aria-labelledby="ap-h">
            <div className="by-up-h">
              <p className="wk-label">{COPY.training.forAgents}</p>
              <h2 className="wk-h3" id="ap-h">
                {AGENT_PLAN_UP.name}
              </h2>
              <p className="by-price">
                <b>{AGENT_PLAN_UP.amount}</b>
                {COPY.home.aMonth}
              </p>
              <p className="by-terms">{MINIMUM}</p>
            </div>
            <Checks items={AGENT_PLAN_UP.lines} />
          </section>
          <Help i={4} />
        </aside>
      </div>
    </div>
  );
}

// --- Office Hours ----------------------------------------------------------------------------------

export function Office({ owned, links }: { owned: readonly BuyerSkill[]; links: Links }) {
  const plan = myPlan(owned);
  return (
    <div className="wk-page">
      <Crumbs trail={[[COPY.office.title]]} />
      <header className="wk-head aim-rise" style={rise(0)}>
        <p className="wk-eyebrow">
          {plan.name} <LockedPill />
        </p>
        <h1 className="wk-h1">{COPY.office.title}</h1>
        <p className="wk-purpose">{OFFICE.lede}</p>
        <div className="wk-meta">
          <Tag icon="cal">{COPY.office.every}</Tag>
          <Tag icon="clock">{COPY.office.time}</Tag>
          <Tag icon="video">{COPY.office.recorded}</Tag>
        </div>
      </header>
      <section className="wk-hero aim-rise" style={rise(1)} aria-label="Upgrade">
        <div className="wk-hero-main">
          <p className="wk-kick">{COPY.skill.kick(plan.name)}</p>
          <h2 className="wk-hero-t">{COPY.office.hero}</h2>
          <p className="wk-hero-d">
            <b>{plan.name}</b>
            {plan.line} <Terms text={plan.terms} />
          </p>
          <div className="wk-hero-acts">
            <Pay cart={plan.cart} links={links} className="wk-btn wk-btn-accent wk-btn-lg by-wrap">
              <RollLabel>{plan.button}</RollLabel>
            </Pay>
          </div>
        </div>
        <div className="wk-prog">
          <p className="wk-prog-l">
            <Icon name="clock" />
            {COPY.office.every}
          </p>
          <p className="wk-prog-n">
            <b>{COPY.office.clock}</b>
            {COPY.office.pm}
          </p>
          <p className="wk-prog-left">{COPY.office.live}</p>
        </div>
      </section>
      <div className="by-cards by-pair">
        <UpCard plan={plan} i={2} links={links} owned={owned} button={false} />
        <Help i={3} />
      </div>
    </div>
  );
}

// --- the AI Accelerator: Week 0 and the hires --------------------------------------------------------

export function Accelerator() {
  const week0 = ACCEL.weeks.find((w) => w.n === 0)!;
  return (
    <div className="wk-page">
      <Crumbs trail={[[COPY.accel.title]]} />
      <header className="wk-head aim-rise" style={rise(0)}>
        <p className="wk-eyebrow">
          {ACCEL.name} <LockedPill />
        </p>
        <h1 className="wk-h1">{COPY.accel.title}</h1>
        <p className="wk-purpose">{COPY.accel.lede}</p>
        <div className="wk-meta">
          <Tag icon="radio">{ACCEL.builds}</Tag>
          <Tag icon="users">{COPY.accel.owners}</Tag>
        </div>
      </header>
      <section className="wk-hero aim-rise" style={rise(1)} aria-label={ACCEL.name}>
        <div className="wk-hero-main">
          <p className="wk-kick">{COPY.accel.kick}</p>
          <h2 className="wk-hero-t">{week0.question}</h2>
          <p className="wk-hero-d">
            <b>{COPY.accel.how}</b>
            {COPY.accel.howLine}
          </p>
          <div className="wk-hero-acts">
            <a className="wk-btn wk-btn-accent wk-btn-lg wk-btn-arrow" href={ACCELERATOR_HREF}>
              <RollLabel>{COPY.accel.see}</RollLabel>
              <Icon name="arrow" size={16} className="wk-arrow" />
            </a>
            <a className="wk-btn wk-btn-onforest wk-btn-lg wk-btn-arrow" href={learnHome()}>
              <RollLabel>{COPY.accel.back}</RollLabel>
              <Icon name="arrow" size={16} className="wk-arrow" />
            </a>
          </div>
        </div>
        <div className="wk-prog">
          <p className="wk-prog-l">{COPY.accel.employees}</p>
          <p className="wk-prog-n">
            <b>{ACCEL.hiresN}</b>
            {COPY.accel.builtWithYou}
          </p>
          <p className="wk-prog-left">{ACCEL.hiresRest}</p>
        </div>
      </section>
      <div className="wk-grid">
        <section className="wk-steps-sec aim-rise" style={rise(2)} id="wk-row-0" aria-labelledby="w0-h">
          <div className="wk-sec-head">
            <h2 className="wk-h2" id="w0-h">
              {COPY.accel.week0}
            </h2>
          </div>
          <p className="wk-sum">{COPY.accel.week0Sum}</p>
          <ol className="wk-steps">
            {ACCEL.week0Steps.map((st) => (
              <li key={st.n}>
                <div className="wk-step" data-s="waiting">
                  <span className="wk-num" aria-hidden="true">
                    {st.n}
                  </span>
                  <span className="wk-step-tx">
                    <span className="wk-step-t">
                      {st.title}
                      <span className="wk-chip">{st.who}</span>
                    </span>
                  </span>
                  <span className="wk-step-r">
                    <span className="wk-time">{st.time}</span>
                  </span>
                  <Icon name="lock" size={16} className="by-lock" />
                </div>
              </li>
            ))}
          </ol>
        </section>
        <aside className="wk-rail" aria-label={COPY.accel.inIt}>
          <section className="wk-card aim-rise" style={rise(3)} aria-labelledby="acc-h">
            <div className="wk-card-h">
              <h3 className="wk-h3" id="acc-h">
                {COPY.accel.inIt}
              </h3>
            </div>
            <Checks items={ACCEL.checks} />
          </section>
          <Help i={4} />
        </aside>
        <div className="wk-ref aim-rise" style={rise(4)}>
          <section aria-labelledby="hires-h">
            <h2 className="wk-h2" id="hires-h">
              {COPY.accel.hires}
            </h2>
            <ol className="sc-list lk-list">
              {ACCEL.weeks
                .filter((w) => w.n > 0)
                .map((w) => (
                  <li key={w.n} className="sc-week" id={`wk-row-${w.n}`}>
                    <span className="sc-date" aria-hidden="true">
                      <small>{COPY.week}</small>
                      <b>{w.n}</b>
                    </span>
                    <div className="sc-body">
                      <div className="sc-t">
                        <b className="sc-a">{w.title}</b>
                      </div>
                      <p className="sc-d">{w.question}</p>
                      <ul className="sc-sess">
                        <li>
                          <Icon name="users" />
                          <span>{w.hire ? COPY.accel.hire(w.hire) : COPY.accel.noHire}</span>
                        </li>
                      </ul>
                    </div>
                    <div className="sc-side">
                      <StLocked />
                    </div>
                  </li>
                ))}
            </ol>
            <p className="wk-fine by-fine">{COPY.accel.fine}</p>
          </section>
        </div>
      </div>
    </div>
  );
}
