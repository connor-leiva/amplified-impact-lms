import { describe, expect, it } from 'vitest';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { OUTLINE, catalogAnswer } from './buyer.test-data';
import { ACCEL, AGENT_PLAN_UP, COPY, OFFICE, PLANS, TRAINING, titleCase } from './content';
import {
  DOWNLOAD_LABEL,
  buyerCurrent,
  buyerShell,
  buyerSkills,
  buyerView,
  downloadHref,
  downloadsOf,
  initialsOf,
  isSkillBuyer,
  librarySets,
  lockedOf,
  myPlan,
  nextSkills,
  opensWith,
  ownedOf,
  planOf,
  outlineOf,
  stripOf,
  toolsOf,
  v3PageOf,
} from './buyer.vm';

// D-241: the $37 skill buyer inside the LMS, as data.

const here = dirname(fileURLToPath(import.meta.url));

describe('who the buyer pages are for', () => {
  it('is a learner who bought a skill and holds no plan and no access group', () => {
    expect(isSkillBuyer(catalogAnswer(['team-pnl-review']))).toBe(true);
    expect(isSkillBuyer(catalogAnswer([]))).toBe(false);
    // Utah Life (an access group) and every plan's member keep what they have, a $37 skill beside it or not.
    expect(isSkillBuyer(catalogAnswer(['team-pnl-review'], { accessGroups: [{ id: 'utah_life', name: 'Utah Life' }] }))).toBe(false);
    for (const kind of ['agent_plan', 'agents', 'membership', 'insiders_agent', 'cohort']) expect(isSkillBuyer(catalogAnswer(['team-pnl-review'], { plans: [{ kind }] }))).toBe(false);
    // An answer from before D-241 names no purchases: nobody is a buyer.
    expect(isSkillBuyer({ skills: [], plans: [], accessGroups: [] })).toBe(false);
    expect(isSkillBuyer(null)).toBe(false);
  });
});

describe('the buyer\u2019s skills', () => {
  const skills = buyerSkills(catalogAnswer(['team-pnl-review']));

  it('marks what they bought and what is free, and gives each its lead and its guide', () => {
    const own = ownedOf(skills);
    expect(own.map((s) => s.id)).toEqual(['team-pnl-review']);
    expect(own[0]).toMatchObject({ slug: 'team-pnl-review', role: 'Team owner', tools: 'Claude or ChatGPT', open: true });
    expect(own[0]!.outcome).toMatch(/^It shows what you kept/);
    expect(skills.find((s) => s.id === 'content-opportunity-research')!.slug).toBe('content-strategist');
    expect(lockedOf(skills)).toHaveLength(53 - 4 - 1);
  });

  it('offers the plan of the set they bought from, and counts what it would open', () => {
    expect(myPlan(ownedOf(skills))).toBe(PLANS.leader);
    expect(opensWith(PLANS.leader, skills)).toBe(48);
    const agent = buyerSkills(catalogAnswer(['appointment-follow-up']));
    expect(myPlan(ownedOf(agent))).toBe(PLANS.agent);
    // Agent Insiders opens the agent set and the skills for everyone, never an owner and operations skill.
    expect(opensWith(PLANS.agent, agent)).toBe(33);
    expect(planOf({ sets: 'both' })).toBe(PLANS.leader);
    expect(planOf({ sets: 'agent' })).toBe(PLANS.agent);
  });

  it('lists each set with theirs first, then the free ones, then the rest in the API\u2019s order', () => {
    const sets = librarySets(skills);
    expect(sets.map((x) => [x.label, x.rows.length, x.meta])).toEqual([
      ['Owner and Operations Skills', 16, '16 skills · 1 yours · 1 free'],
      ['Agent Skills', 20, '20 skills'],
      ['Skills for Everyone', 17, '17 skills · 3 free'],
    ]);
    expect(sets[0]!.rows.slice(0, 2).map((s) => s.id)).toEqual(['team-pnl-review', 'inbox-meeting-follow-through']);
    expect(nextSkills(skills, ownedOf(skills)[0]!).every((s) => s.sets === 'owner_ops' && !s.open)).toBe(true);
  });

  it('downloads for Claude and ChatGPT side by side, through the checked route', () => {
    expect(downloadsOf({ files: ['practice', 'chatgpt', 'claude'] })).toEqual(['claude', 'chatgpt', 'practice']);
    expect(DOWNLOAD_LABEL.claude).toBe('Download for Claude');
    expect(DOWNLOAD_LABEL.chatgpt).toBe('Download for ChatGPT');
    expect(downloadHref('team-pnl-review', 'claude')).toBe('/api/skills/team-pnl-review/download/claude');
    expect([toolsOf(['claude', 'chatgpt']), toolsOf(['grok']), toolsOf(['claude']), toolsOf(['claude', 'chatgpt', 'grok'])]).toEqual(['Claude or ChatGPT', 'Grok Bot', 'Claude', 'Grok Bot, Claude or ChatGPT']);
  });
});

describe('addresses and the shell', () => {
  it('reads each /learn address as one of the buyer\u2019s pages', () => {
    expect(buyerView('/learn')).toEqual({ kind: 'home' });
    expect(buyerView('/learn/')).toEqual({ kind: 'home' });
    expect(buyerView('/learn/skills')).toEqual({ kind: 'library' });
    expect(buyerView('/learn/skills/team-pnl-review')).toEqual({ kind: 'skill', slug: 'team-pnl-review' });
    expect(buyerView('/learn/training')).toEqual({ kind: 'training' });
    expect(buyerView('/learn/office-hours')).toEqual({ kind: 'office' });
    expect(buyerView('/learn/week/0')).toEqual({ kind: 'accelerator', week: 0 });
    expect(buyerView('/learn/week/8')).toEqual({ kind: 'accelerator', week: 8 });
    expect(buyerView('/learn/account')).toEqual({ kind: 'account' });
    for (const p of ['/learn/week/9', '/learn/schedule', '/learn/community', '/learn/week/1/step/2', '/learn/vault']) expect(buyerView(p)).toEqual({ kind: 'other' });
    expect(buyerCurrent({ kind: 'skill', slug: 'x' })).toBe('library');
    expect(buyerCurrent({ kind: 'accelerator', week: 3 })).toBe('week-3');
    expect(v3PageOf({ kind: 'skill', slug: 'x' }, true)).toBe(false);
    expect(v3PageOf({ kind: 'skill', slug: 'x' }, false)).toBe(true);
    expect(v3PageOf({ kind: 'account' }, false)).toBe(false);
  });

  it('is the members\u2019 shell with the buyer\u2019s rows: their skills on two lines, the plans they don\u2019t hold locked', () => {
    const owned = ownedOf(buyerSkills(catalogAnswer(['team-pnl-review'])));
    const shell = buyerShell({ owned, weeks: OUTLINE, initials: 'AM', here: 'Home', logo: 'data:', account: { open: false, onClick: () => {} } });
    expect(shell.cohort).toEqual(['Amplified Skill', '1 skill bought']);
    expect(shell.nav.map((n) => [n.label, n.href, !!n.locked])).toEqual([
      ['Home', '/learn', false],
      ['Skill library', '/learn/skills', false],
      ['Office hours', '/learn/office-hours', true],
      ['Weekly training', '/learn/training', true],
    ]);
    expect(shell.weeksLabel).toBe('AI Accelerator');
    expect(shell.weeks.map((w) => [w.n, w.href])).toEqual(OUTLINE.map((w) => [w.week, `/learn/week/${w.week}`]));
    expect(shell.weeks[0]!.title).toBe('Week Zero Setup');
    expect(shell.weeks.every((w) => w.locked)).toBe(true);
    expect(shell.next).toBeNull();
    expect(stripOf(owned)).toEqual({ label: 'Your skill', title: 'Team P&L Review', more: null, action: 'Open the Setup Guide', href: '/learn/skills/team-pnl-review' });
    // Two bought: the latest first, as the API orders them, whatever the catalog's order.
    const two = ownedOf(buyerSkills(catalogAnswer(['team-pnl-review', 'fub-pipeline-review'])));
    expect(two.map((s) => s.id)).toEqual(['team-pnl-review', 'fub-pipeline-review']);
    expect(ownedOf(buyerSkills(catalogAnswer(['fub-pipeline-review', 'team-pnl-review']))).map((s) => s.id)).toEqual(['fub-pipeline-review', 'team-pnl-review']);
    expect(stripOf(two)).toMatchObject({ label: 'Your skills', title: 'Team P&L Review', more: 'and 1 more', action: 'Open Your Skills', href: '/learn/skills' });
    expect(initialsOf('Alex Morgan')).toBe('AM');
    expect(initialsOf('Prince')).toBe('P');
  });
});

describe('the words', () => {
  /** Every string the pages can say, functions called with sample values. */
  const strings = (x: unknown): string[] =>
    typeof x === 'string'
      ? [x]
      : typeof x === 'function'
        ? strings((x as (...a: unknown[]) => unknown)(2, 'Amplified Insiders', 33))
        : Array.isArray(x)
          ? x.flatMap(strings)
          : x && typeof x === 'object'
            ? Object.values(x).flatMap(strings)
            : [];
  const all = [...strings(COPY), ...strings(PLANS), ...strings(AGENT_PLAN_UP), ...strings(TRAINING), ...strings(OFFICE), ...strings(ACCEL)];

  it('has no em or en dash and no exclamation mark', () => {
    for (const s of all) expect(s, s).not.toMatch(/[\u2013\u2014!]/);
  });

  it('says MT after every clock time, and never CT', () => {
    const times = all.filter((s) => /\d:\d\d [AP]M/.test(s));
    expect(times.length).toBeGreaterThan(0);
    for (const s of times) expect(s, s).toMatch(/\d:\d\d [AP]M MT/);
    for (const s of all) expect(s, s).not.toMatch(/\bCT\b/);
  });

  it('writes buttons in Title Case, each upgrade with its plan and price', () => {
    expect(PLANS.leader.button).toBe('Upgrade to Amplified Insiders, $169/Month');
    expect(PLANS.agent.button).toBe('Upgrade to Agent Insiders, $79/Month');
    expect(AGENT_PLAN_UP.button).toBe('Upgrade to the Agent Plan, $117/Month');
    expect(COPY.skill.get).toBe('Get This Skill, $37');
    const buttons = [PLANS.leader.button, PLANS.agent.button, PLANS.leader.short, PLANS.agent.short, AGENT_PLAN_UP.button, COPY.skill.get, COPY.shell.openGuide, COPY.shell.openSkills, COPY.home.seeAll, COPY.accel.see, COPY.accel.back, COPY.library.showAll(16), ...Object.values(DOWNLOAD_LABEL)];
    const small = new Set(['to', 'the', 'for', 'and', 'of', 'a']);
    for (const b of buttons) for (const w of b.split(/[ ,]+/).slice(1)) if (/^[a-z]/.test(w)) expect(small.has(w), `${b}: ${w}`).toBe(true);
    // Every monthly plan says its 3-month minimum.
    expect(PLANS.leader.terms).toContain('3-Month Minimum.');
    expect(PLANS.agent.terms).toContain('3-Month Minimum.');
    expect(AGENT_PLAN_UP.body).toContain('3-Month Minimum.');
  });

  it('says the hires read and draft, and never that they send or post', () => {
    const hireWords = [COPY.accel.fine, COPY.home.hiresLine, COPY.accel.lede, COPY.accel.howLine];
    for (const s of hireWords) expect(s, s).not.toMatch(/\b(send|sends|sent to|post|posts|change|changes)\b/i);
    expect(COPY.accel.fine).toBe('Every hire reads and drafts. Nothing is sent without you.');
    // The Accelerator's numbers are the pricing page's: seven AI employees, eight live builds.
    expect([ACCEL.hiresN, ACCEL.hiresRest, ACCEL.builds]).toEqual(['7', 'With at least 5 running by Feb 3.', '8 live builds, 90 minutes, Wednesdays']);
  });

  it('reads the course\u2019s weeks from the API\u2019s outline, and nothing else of them', () => {
    expect(outlineOf({ open: false, error: 'x', outline: [{ week: 0, title: 'A', question: 'Q?', outcome: 'O.', opensAt: null, locked: true }] })).toEqual([{ week: 0, title: 'A', question: 'Q?', outcome: 'O.' }]);
    expect(outlineOf({ open: false, error: 'x' })).toEqual([]);
    expect(outlineOf(null)).toEqual([]);
  });

  it('makes a heading of a sentence-case topic', () => {
    expect(titleCase('Leads and follow-up')).toBe('Leads and Follow-Up');
    expect(titleCase('Content and your week')).toBe('Content and Your Week');
    expect(TRAINING.weeks.map((w) => w.topic)).toEqual(['Leads and Follow-Up', 'Listings', 'Buyers and Contracts', 'Content and Your Week']);
  });
});

describe('the stylesheet', () => {
  it('is the approved mockup\u2019s, byte for byte', () => {
    const sha = (p: string) => createHash('sha256').update(readFileSync(p)).digest('hex');
    expect(sha(resolve(here, 'buyer.css'))).toBe(sha(resolve(here, '../../../../../../handoff/lms-mockup/buyer.css')));
  });
});
