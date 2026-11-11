// The offer's pure rules (D-073 to D-079, D-104), without a database or a network: the Stripe contract
// each cart is sold on, the access rule, the buyer tags and the page's tokens.

import { describe, expect, it } from 'vitest';
import { canOpenSkill, liveSessionsOpen, skillState } from './access';
import type { PlanAccess, SkillAccess } from './access';
import {
  AGENTS_FIRST_CHARGE_AT,
  AGENTS_SKILLS_FROM,
  CARTS,
  CART_IDS,
  COHORT_ONE,
  COHORT_ONE_LIVE_UNTIL,
  DEFAULT_FOUNDING_CLOSES_AT,
  INSIDERS_FIRST_CHARGE_AT,
  LOOKUP_KEYS,
  ORDER_OPTIONS,
  ORDER_STATUSES,
  PLAN_KINDS,
  PLAN_STATUSES,
  SKILL_SETS,
  addMonths,
  cartForMetadata,
  initialPlanDates,
  mountainDeadline,
  pinnedFirstCharge,
} from './catalog';
import { keyMode, readOfferConfig } from './config';
import { crmOf, planStatusOf, teamSizeOfAgents } from './webhook';
import { buyerTags } from '../integrations/ghl';
import { cartStates, fillTokens, offerValues, welcomeValues } from '../routes/offer';
import { FREE_SKILLS, PAID_DOWNLOADS, SKILL_CATALOG } from './skills-catalog';
import { FREE_GROK_TEMPLATES, GROK_TEMPLATES, isFreeGrokTemplate, PAID_GROK_DOWNLOADS } from '@ai/core/grok-templates';
import { LIBRARY_ROWS } from './library-rows';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const NOW = Date.parse('2026-11-14T15:00:00-06:00'); // Saturday at the Forum
const DAY = 86_400_000;
const DEFAULT_FOUNDING = Date.parse(DEFAULT_FOUNDING_CLOSES_AT);


const dayIn = (t: number, timeZone: string) =>
  new Intl.DateTimeFormat('en-US', { timeZone, weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' }).format(t);

describe('the Stripe contract (D-073, D-074, D-104)', () => {
  it('holds the CHECK constraints and the catalog to the same lists, as migration 0007 left them', () => {
    const sql = ['0006_offer_billing.sql', '0007_stripe_update.sql']
      .map((f) => readFileSync(fileURLToPath(new URL(`../../drizzle/${f}`, import.meta.url)), 'utf8'))
      .join('\n');
    // The last definition of each constraint wins.
    const listIn = (name: string) =>
      [...sql.matchAll(new RegExp(`"${name}" CHECK \\(.*? in \\(([^)]*)\\)`, 'g'))].at(-1)?.[1]?.match(/'[^']*'/g)?.map((x) => x.slice(1, -1));
    expect(listIn('orders_plan')).toEqual([...PLAN_KINDS]);
    expect(listIn('plans_kind')).toEqual([...PLAN_KINDS]);
    expect(listIn('orders_option')).toEqual([...ORDER_OPTIONS]);
    expect(listIn('orders_status')).toEqual([...ORDER_STATUSES]);
    expect(listIn('plans_status')).toEqual([...PLAN_STATUSES]);
    expect(listIn('skills_sets')).toEqual([...SKILL_SETS]);
  });

  it('asks Stripe for the eight live lookup keys, and never the retired library price', () => {
    expect([...LOOKUP_KEYS].sort()).toEqual(
      [
        'agents_16to40_founding',
        'agents_16to40_prepay3',
        'agents_upto15_founding',
        'agents_upto15_prepay3',
        'cohort_founding_full',
        'cohort_founding_two_pay',
        'membership_monthly',
        'membership_year_upfront',
      ].sort(),
    );
  });

  it('sells six carts, each through its own Payment Link setting, and no Skill Library', () => {
    expect(Object.fromEntries(CART_IDS.map((id) => [id, [CARTS[id].plan, CARTS[id].option, CARTS[id].paymentLinkEnv]]))).toEqual({
      'cohort-full': ['cohort', 'full', 'PAYMENT_LINK_COHORT_FULL'],
      'cohort-two-pay': ['cohort', 'two_pay', 'PAYMENT_LINK_COHORT_TWO_PAY'],
      'insiders-year': ['membership', 'year_upfront', 'PAYMENT_LINK_INSIDERS_YEAR'],
      'insiders-monthly': ['membership', 'monthly', 'PAYMENT_LINK_INSIDERS_MONTHLY'],
      'agents-upto15': ['agents', 'upto15', 'PAYMENT_LINK_TEAM_UPTO15_PREPAY'],
      'agents-16to40': ['agents', '16to40', 'PAYMENT_LINK_TEAM_16TO40_PREPAY'],
    });
    expect(CARTS['insiders-year'].items).toEqual(['membership_year_upfront', 'membership_monthly']);
    expect(CARTS['agents-upto15'].items).toEqual(['agents_upto15_prepay3', 'agents_upto15_founding']);
    // Founding prices close for the AI Accelerator and the Team Plan; Insiders has none.
    expect(CART_IDS.filter((id) => CARTS[id].founding)).toEqual(['cohort-full', 'cohort-two-pay', 'agents-upto15', 'agents-16to40']);
  });

  it('reads a link\'s metadata into its cart, and a Team Plan link only with billing=forum_prepay', () => {
    expect(cartForMetadata({ ai_plan: 'membership', ai_option: 'year_upfront' })?.id).toBe('insiders-year');
    expect(cartForMetadata({ ai_plan: 'membership', ai_option: 'monthly' })?.id).toBe('insiders-monthly');
    expect(cartForMetadata({ ai_plan: 'agents', ai_option: '16to40', billing: 'forum_prepay' })?.id).toBe('agents-16to40');
    expect(cartForMetadata({ ai_plan: 'agents', ai_option: 'upto15' })).toBeNull();
    expect(cartForMetadata({ ai_plan: 'cohort', ai_option: 'two_pay' })?.id).toBe('cohort-two-pay');
    expect(cartForMetadata({ ai_plan: 'library', ai_option: 'upfront' })).toBeNull();
  });

  it('pins the dates Ampy set: Insiders from May 4, the Team Plan billed from Apr 4, founding closing Nov 30 Mountain', () => {
    expect(INSIDERS_FIRST_CHARGE_AT / 1000).toBe(1809406800);
    expect(AGENTS_FIRST_CHARGE_AT / 1000).toBe(1806814800);
    expect(Date.parse(DEFAULT_FOUNDING_CLOSES_AT) / 1000).toBe(1796108340);
    expect(dayIn(INSIDERS_FIRST_CHARGE_AT, 'America/Chicago')).toBe('Tuesday, May 4, 2027');
    expect(dayIn(AGENTS_FIRST_CHARGE_AT, 'America/Chicago')).toBe('Sunday, April 4, 2027');
    expect(mountainDeadline(Date.parse(DEFAULT_FOUNDING_CLOSES_AT))).toBe('Monday, November 30 at 11:59 PM Mountain');
    expect(pinnedFirstCharge(CARTS['agents-upto15'])).toBe(AGENTS_FIRST_CHARGE_AT);
    expect(pinnedFirstCharge(CARTS['cohort-full'])).toBe(INSIDERS_FIRST_CHARGE_AT);
    expect([pinnedFirstCharge(CARTS['cohort-two-pay']), pinnedFirstCharge(CARTS['insiders-year'])]).toEqual([null, null]);
  });

  it('builds cohort one on Wednesdays, Dec 2 to Feb 3, with Insiders 90 days after the last build', () => {
    expect(dayIn(COHORT_ONE.firstBuildAt, 'America/Chicago')).toBe('Wednesday, December 2, 2026');
    expect(dayIn(COHORT_ONE.lastBuildAt, 'America/Chicago')).toBe('Wednesday, February 3, 2027');
    const lastBuildDay = Date.parse('2027-02-03T00:00:00-06:00');
    expect(Math.round((INSIDERS_FIRST_CHARGE_AT - lastBuildDay) / DAY)).toBe(90);
    expect(COHORT_ONE_LIVE_UNTIL).toBe(INSIDERS_FIRST_CHARGE_AT);
  });

  it('dates each new plan as it is sold', () => {
    expect(initialPlanDates(CARTS['cohort-full'], NOW)).toMatchObject({ paidThrough: INSIDERS_FIRST_CHARGE_AT, liveUntil: INSIDERS_FIRST_CHARGE_AT, cohortId: 'dec26' });
    expect(initialPlanDates(CARTS['insiders-year'], NOW)).toMatchObject({ startsAt: NOW, paidThrough: NOW + 365 * DAY, minimumUntil: null });
    expect(initialPlanDates(CARTS['insiders-monthly'], NOW)).toMatchObject({ paidThrough: addMonths(NOW, 1), minimumUntil: addMonths(NOW, 3) });
    // The Team Plan: logins now, agent skills from Dec 14, paid through the start of monthly billing, nothing locked.
    expect(initialPlanDates(CARTS['agents-16to40'], NOW)).toMatchObject({ startsAt: AGENTS_SKILLS_FROM, paidThrough: AGENTS_FIRST_CHARGE_AT, minimumUntil: null });
    expect(initialPlanDates(CARTS['agents-16to40'], AGENTS_SKILLS_FROM + DAY).startsAt).toBe(AGENTS_SKILLS_FROM + DAY);
  });


});

describe('the access rule (D-079)', () => {
  const skill = (over: Partial<SkillAccess> = {}): SkillAccess => ({ sets: 'owner_ops', free: false, releasedAt: NOW - 10 * DAY, status: 'published', ...over });
  const library = (over: Partial<PlanAccess> = {}): PlanAccess => ({ kind: 'membership', status: 'active', paidThrough: NOW + 20 * DAY, liveUntil: NOW + 20 * DAY, ...over });

  it('opens the owner and operations set to an Amplified Insiders member and locks the agent set', () => {
    expect(canOpenSkill([library()], skill(), NOW)).toBe(true);
    expect(canOpenSkill([library()], skill({ sets: 'agent' }), NOW)).toBe(false);
    expect(canOpenSkill([library()], skill({ sets: 'both' }), NOW)).toBe(true);
  });

  it('opens both sets to a cohort buyer, and the agent set alone to an agent plan', () => {
    const cohort: PlanAccess = { kind: 'cohort', status: 'active', paidThrough: COHORT_ONE_LIVE_UNTIL, liveUntil: COHORT_ONE_LIVE_UNTIL };
    expect(canOpenSkill([cohort], skill(), NOW) && canOpenSkill([cohort], skill({ sets: 'agent' }), NOW)).toBe(true);
    const agents: PlanAccess = { kind: 'agents', status: 'active', paidThrough: NOW + DAY, liveUntil: null };
    expect([canOpenSkill([agents], skill(), NOW), canOpenSkill([agents], skill({ sets: 'agent' }), NOW)]).toEqual([false, true]);
  });

  it('cancel and keep: a skill released before the paid-through date opens, one after does not', () => {
    const lapsed = library({ status: 'canceled', paidThrough: NOW - 5 * DAY, liveUntil: NOW - 5 * DAY });
    expect(canOpenSkill([lapsed], skill({ releasedAt: NOW - 10 * DAY }), NOW)).toBe(true);
    expect(canOpenSkill([lapsed], skill({ releasedAt: NOW - 2 * DAY }), NOW)).toBe(false);
    expect(liveSessionsOpen(lapsed, NOW)).toBe(false);
  });

  it('a refund ends everything; a free skill opens for anyone; an unreleased one for no one', () => {
    expect(canOpenSkill([library({ status: 'ended' })], skill(), NOW)).toBe(false);
    expect(canOpenSkill([], skill({ free: true }), NOW)).toBe(true);
    expect(skillState([library()], skill({ releasedAt: NOW + DAY }), NOW)).toBe('upcoming');
    expect(canOpenSkill([library()], skill({ status: 'hidden' }), NOW)).toBe(false);
  });

  it('opens a Team Plan\'s agent skills on Dec 14, with the starter path, not at purchase', () => {
    const team: PlanAccess = { kind: 'agents', status: 'active', startsAt: AGENTS_SKILLS_FROM, paidThrough: AGENTS_FIRST_CHARGE_AT, liveUntil: null };
    expect(canOpenSkill([team], skill({ sets: 'agent' }), NOW)).toBe(false);
    expect(canOpenSkill([team], skill({ sets: 'agent' }), AGENTS_SKILLS_FROM)).toBe(true);
    // A free skill opens for them at once.
    expect(canOpenSkill([team], skill({ sets: 'agent', free: true }), NOW)).toBe(true);
  });
});

describe('the skill catalog (D-082)', () => {
  it('fails closed: only the named skills are free, and every other ZIP is paid', () => {
    expect(FREE_SKILLS.every((id) => SKILL_CATALOG.some((s) => s.id === id))).toBe(true);
    const free = SKILL_CATALOG.filter((s) => FREE_SKILLS.includes(s.id)).flatMap((s) => Object.values(s.files));
    expect(PAID_DOWNLOADS.some((f) => free.includes(f))).toBe(false);
    expect(new Set(SKILL_CATALOG.map((s) => s.id)).size).toBe(SKILL_CATALOG.length);
    expect(SKILL_CATALOG.length).toBe(35);
  });

  it('names only files that exist in /downloads', () => {
    const dir = fileURLToPath(new URL('../../../web/public/downloads/', import.meta.url));
    const missing = SKILL_CATALOG.flatMap((s) => Object.values(s.files)).filter((f) => {
      try {
        readFileSync(`${dir}${f}`);
        return false;
      } catch {
        return true;
      }
    });
    expect(missing).toEqual([]);
  });
});

describe('the Grok Bot templates in the library (D-100)', () => {
  it('load as their own rows beside the 35 skills, with one `grok` file each and their own free list', () => {
    expect(LIBRARY_ROWS).toHaveLength(SKILL_CATALOG.length + GROK_TEMPLATES.length);
    expect(new Set(LIBRARY_ROWS.map((r) => r.id)).size).toBe(LIBRARY_ROWS.length);
    for (const g of GROK_TEMPLATES) {
      const row = LIBRARY_ROWS.find((r) => r.id === g.id);
      expect(row?.files, g.id).toEqual({ grok: `${g.id}.zip` });
      expect(row?.free, g.id).toBe(isFreeGrokTemplate(g.id));
      expect(row?.build).toBe('node scripts/grok-templates.mjs build');
    }
    for (const s of SKILL_CATALOG) expect(LIBRARY_ROWS.find((r) => r.id === s.id)?.files).toEqual(s.files);
    expect(LIBRARY_ROWS.filter((r) => r.free).map((r) => r.id).sort()).toEqual([...FREE_SKILLS, ...FREE_GROK_TEMPLATES].sort());
  });

  it('keep their paid ZIPs off www, and every ZIP they name is built', () => {
    expect(PAID_GROK_DOWNLOADS).toHaveLength(12);
    expect(PAID_GROK_DOWNLOADS.some((f) => PAID_DOWNLOADS.includes(f))).toBe(false);
    const dir = fileURLToPath(new URL('../../../web/public/downloads/', import.meta.url));
    const missing = GROK_TEMPLATES.map((g) => g.file).filter((f) => {
      try {
        readFileSync(`${dir}${f}`);
        return false;
      } catch {
        return true;
      }
    });
    expect(missing).toEqual([]);
  });
});

describe('buyer tags (D-076)', () => {
  const base = { plan: 'cohort', option: 'two_pay', status: 'paid', paidAt: NOW, paymentFailedAt: null, membershipEndedAt: null, refundedAt: null, campaign: null, smsConsent: false, phone: null };

  it('tags a buyer by plan and payment, and the forum when it came through /forum', () => {
    expect(buyerTags(base)).toEqual(['offer-buyer', 'plan-cohort', 'pay-two']);
    expect(buyerTags({ ...base, option: 'full', campaign: 'forum' })).toEqual(['offer-buyer', 'plan-cohort', 'pay-full', 'event-forum-nov-2026']);
    expect(buyerTags({ ...base, plan: 'agents', option: 'upto15', status: 'trialing', paidAt: null })).toEqual(['offer-buyer', 'plan-agents']);
  });

  it('tags an Amplified Insiders buyer by how they pay (D-104)', () => {
    expect(buyerTags({ ...base, plan: 'membership', option: 'year_upfront' })).toEqual(['offer-buyer', 'plan-membership', 'pay-year']);
    expect(buyerTags({ ...base, plan: 'membership', option: 'monthly' })).toEqual(['offer-buyer', 'plan-membership', 'pay-monthly']);
  });

  it('adds the follow-up tags as things happen, and never tags a pending order', () => {
    expect(buyerTags({ ...base, status: 'expired', paidAt: null })).toEqual(['checkout-abandoned-cohort']);
    expect(buyerTags({ ...base, paymentFailedAt: NOW })).toContain('payment-failed');
    expect(buyerTags({ ...base, status: 'refunded', refundedAt: NOW })).toContain('refunded');
    expect(buyerTags({ ...base, membershipEndedAt: NOW })).toContain('membership-ended');
    expect(buyerTags({ ...base, status: 'pending', paidAt: null })).toEqual([]);
    expect(buyerTags({ ...base, smsConsent: true, phone: '+18015551234' })).toContain('sms-consent');
  });
});

describe('webhook helpers', () => {
  it('reads a Payment Link custom field the way Grokbok sets it up', () => {
    expect(crmOf('follow_up_boss')).toBe('follow_up_boss');
    expect(crmOf('Follow Up Boss')).toBe('follow_up_boss');
    expect(crmOf('other')).toBe('other');
    expect(teamSizeOfAgents('12')).toBe('11-25');
    expect(teamSizeOfAgents('nope')).toBeNull();
    expect(planStatusOf('unpaid')).toBe('past_due');
    expect(planStatusOf('incomplete_expired')).toBe('ended');
  });
});

describe('the offer page values (D-075, D-104)', () => {
  const config = readOfferConfig({
    OFFER_OPEN: 'true',
    PAYMENT_LINK_COHORT_FULL: 'https://buy.stripe.com/test_cohort_full',
    PAYMENT_LINK_COHORT_TWO_PAY: 'https://buy.stripe.com/test_cohort_two',
    PAYMENT_LINK_INSIDERS_YEAR: 'https://buy.stripe.com/test_insiders_year',
    PAYMENT_LINK_TEAM_UPTO15_PREPAY: 'https://buy.stripe.com/test_team15',
    // Names no cart reads any more.
    PAYMENT_LINK_LIBRARY: 'https://buy.stripe.com/test_old_library',
    PAYMENT_LINK_AGENTS_UPTO15: 'https://buy.stripe.com/test_old_agents',
  });

  it('reads each cart\'s link by its own name, and none of the retired ones', () => {
    expect(config.paymentLinks).toEqual({
      'cohort-full': 'https://buy.stripe.com/test_cohort_full',
      'cohort-two-pay': 'https://buy.stripe.com/test_cohort_two',
      'insiders-year': 'https://buy.stripe.com/test_insiders_year',
      'agents-upto15': 'https://buy.stripe.com/test_team15',
    });
    expect(config.foundingClosesAt).toBe(DEFAULT_FOUNDING);
  });

  it('sells a cart with a link, says "soon" without one, and closes the founding carts after Nov 30', () => {
    expect(cartStates(config, NOW, 0)).toEqual({
      'cohort-full': 'link',
      'cohort-two-pay': 'link',
      'insiders-year': 'link',
      'insiders-monthly': 'soon',
      'agents-upto15': 'link',
      'agents-16to40': 'soon',
    });
    const after = cartStates(config, DEFAULT_FOUNDING + 1, 0);
    expect([after['cohort-full'], after['cohort-two-pay'], after['agents-upto15'], after['agents-16to40']]).toEqual(['closed', 'closed', 'closed', 'closed']);
    expect(after['insiders-year']).toBe('link');
    expect(Object.values(cartStates(readOfferConfig({}), NOW, 0)).every((x) => x === 'soon')).toBe(true);
  });

  it('sells both AI Accelerator links out together at 15 seats, and nothing else', () => {
    const at14 = cartStates(config, NOW, 14);
    expect([at14['cohort-full'], at14['cohort-two-pay']]).toEqual(['link', 'link']);
    const at15 = cartStates(config, NOW, 15);
    expect([at15['cohort-full'], at15['cohort-two-pay'], at15['insiders-year'], at15['agents-upto15']]).toEqual(['soldout', 'soldout', 'link', 'link']);
  });

  it('fills the page: links only while they sell, the deadline in Mountain time, logins and the 40+ call', () => {
    const v = offerValues({ config, now: NOW, src: 'forum', seatsSold: 0 });
    expect([v['offer-state'], v.founding, v['founding-closes'], v.src]).toEqual(['links', 'open', 'Monday, November 30 at 11:59 PM Mountain', 'forum']);
    expect([v['link:cohort-full'], v['link:insiders-monthly']]).toEqual(['https://buy.stripe.com/test_cohort_full', '']);
    expect([v.invites, v['login-day'], v['team-call']]).toEqual(['held', 'Monday, November 16', 'mailto:support@amplifiedimpact.io']);
    expect(offerValues({ config, now: config.invitesFrom, src: null, seatsSold: 0 }).invites).toBe('sent');
    const booked = readOfferConfig({ TEAM_CALL_URL: 'https://cal.example.com/team' });
    expect(offerValues({ config: booked, now: NOW, src: null, seatsSold: 0 })['team-call']).toBe('https://cal.example.com/team');
    expect(Object.values(v).join(' ')).not.toContain('test_old_');
    const soldOut = offerValues({ config, now: NOW, src: null, seatsSold: 15 });
    expect([soldOut['state:cohort-full'], soldOut['link:cohort-full'], soldOut['link:insiders-year']]).toEqual(['soldout', '', 'https://buy.stripe.com/test_insiders_year']);
  });

  it('fills tokens escaped, and empties the ones it does not know', () => {
    expect(fillTokens('<p>%%v-name%%</p><a href="%%link:insiders-year%%">%%nope%%</a>', { 'v-name': '<b>"x"</b>', 'link:insiders-year': 'https://a.b/?q=1&r=2' })).toBe(
      '<p>&lt;b&gt;&quot;x&quot;&lt;/b&gt;</p><a href="https://a.b/?q=1&amp;r=2"></a>',
    );
  });

  it('says when the login arrives: Monday before it, minutes after', () => {
    expect(welcomeValues({ state: 'confirmed', plan: 'membership', sessionId: null, now: NOW, config }).login).toContain('Monday, November 16');
    expect(welcomeValues({ state: 'confirmed', plan: 'membership', sessionId: null, now: config.invitesFrom + 1, config }).login).toContain('within a few minutes');
    expect(welcomeValues({ state: 'confirmed', plan: 'membership', sessionId: null, now: NOW, config })['plan-name']).toBe('Amplified Insiders');
  });

  it('picks the thank-you section by the confirmed plan, with the calendar links when set (D-105)', () => {
    const cal = readOfferConfig({ CALENDAR_URL_OFFICE_HOURS: 'https://cal.example.com/office-hours' });
    const done = welcomeValues({ state: 'confirmed', plan: 'agents', sessionId: null, now: NOW, config: cal });
    expect([done.product, done.invites, done['calendar-builds'], done['calendar-office-hours'], done['calendar-state']]).toEqual([
      'agents',
      'held',
      '',
      'https://cal.example.com/office-hours',
      'links',
    ]);
    // No section before the webhook confirms the order.
    expect(welcomeValues({ state: 'pending', plan: 'agents', sessionId: null, now: NOW, config }).product).toBe('');
    expect(welcomeValues({ state: 'confirmed', plan: 'cohort', sessionId: null, now: NOW, config })['calendar-state']).toBe('email');
  });

  it('reports a key only by its mode', () => {
    expect([keyMode('rk_test_abc'), keyMode('rk_live_abc'), keyMode(null), keyMode('nope')]).toEqual(['test', 'live', 'unset', 'unknown']);
  });
});
