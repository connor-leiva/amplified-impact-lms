// R-5 Phase 8 (D-269): Revenue › Summary (`/admin/revenue`), the mockup's `Revenue` (ia-screens.jsx), word for word, as a
// pure model. The screen renders what this returns from the API's answer (`GET /api/console/billing/revenue`, core's
// `RevenueSummary`) and the staff snapshot's cohorts; it never formats a figure, a date or a status itself.
//
// "Unavailable", never a zero: a figure the answer leaves null (Stripe unreadable) reads "Unavailable", as Billing's
// prices do (`UNAVAILABLE`). Days are days ("Wed, Dec 30"): no time, so no zone.

import {
  BILLING_LINES,
  UNAVAILABLE,
  adminDay,
  adminMonthDay,
  adminMonthYear,
  billingLineLabel,
  cohortLabel,
  cohortStatusWord,
  comingLineLabel,
  enrollmentOpen,
  revenueMonthLabel,
  seatBar,
  seatPct,
  usdWhole,
} from '@ai/core';
import type { BillingLine, ComingKind, Db, RevenueCohortFigures, RevenuePeriod, RevenueSummary, SeatBar } from '@ai/core';
import { teamPath } from '../../../shell/admin/addresses';
import type { StatusTone } from '../../../components/r2/Status';

export const REVENUE_COPY = {
  period: 'Period',
  periods: { all: 'All time', month: 'This month' } as Record<RevenuePeriod, string>,
  stats: {
    cash: 'Cash collected',
    still: 'Still to collect',
    total: 'Total revenue',
    mrr: 'MRR',
    failed: 'Failed payments',
  },
  since: (month: string) => `Since ${month}`,
  range: (from: string, to: string) => `${from} to ${to}`,
  payments: (n: number) => `${n} payment${n === 1 ? '' : 's'}`,
  totalSub: 'Collected + still to collect',
  subscriptions: (n: number) => `${n.toLocaleString('en-US')} subscription${n === 1 ? '' : 's'}`,
  needsReview: 'Needs review',
  none: 'None',
  chart: {
    title: 'Cash By Month',
    sub: 'Collected, and what Stripe already has on the calendar',
    collected: 'Collected',
    calendar: 'On the calendar',
    aria: (from: string, to: string, ahead: string) => `Cash collected by month from ${from} to ${to}, and what is scheduled for ${ahead}.`,
    forecast: 'It is not a forecast of new sales.',
    counts: (month: string, n: number, amount: string) =>
      n > 0 ? `${month} counts ${words(n)} second payment${n === 1 ? '' : 's'} (${amount}) and this month’s renewals.` : `${month} counts this month’s renewals.`,
    nothing: 'A month ahead counts what Stripe has dated: second payments and renewals.',
  },
  card: {
    title: 'AI Accelerator',
    people: 'People',
    sold: 'Seats sold',
    paid: 'Paid in full',
    twoPay: 'On two payments',
    refunds: 'Refunds',
    teams: (n: number) => `${n} team${n === 1 ? '' : 's'}`,
    twoPayLine: (teams: string, paid: string, toCome: string) => `${teams} · ${paid} in, ${toCome} to come`,
  },
  refunds: {
    title: 'Refunds',
    sub: 'Last 30 days',
    open: 'Open',
    one: (name: string | null, day: string) => ['1 refund', name, day].filter(Boolean).join(' · '),
    many: (n: number, day: string) => `${n} refunds · the latest ${day}`,
  },
  products: {
    title: 'By Product',
    product: 'Product',
    collected: 'Collected',
    still: 'Still to collect',
    total: 'Total',
    mrr: 'MRR',
    oneTime: 'One-time',
    skills: 'Skills',
    bought: (n: number) => `${n.toLocaleString('en-US')} bought`,
    seats: (cohort: string, sold: number, cap: number) => `${cohort} · ${sold} of ${cap} seats`,
  },
  coming: {
    title: 'Coming In',
    right: (total: string) => `Next 60 days · ${total}`,
    when: 'When',
    from: 'From',
    for: 'For',
    amount: 'Amount',
    status: 'Status',
    empty: 'Nothing is on the calendar for the next 60 days',
    scheduled: 'Scheduled',
    retrying: 'Retrying',
  },
} as const;

const NUMBER_WORDS = ['zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine'];
const words = (n: number): string => NUMBER_WORDS[n] ?? n.toLocaleString('en-US');
const ORDINALS: Record<number, string> = { 2: 'second', 3: 'third', 4: 'fourth', 5: 'fifth' };
const or = (cents: number | null | undefined): string => (cents === null || cents === undefined ? UNAVAILABLE : usdWhole(cents));

/** Payments' addresses (D-253). */
export const PAYMENTS = {
  invoices: '/admin/revenue/payments/invoices',
  subscriptions: '/admin/revenue/payments/subscriptions',
  failed: '/admin/revenue/payments/failed',
  refunds: '/admin/revenue/payments/refunds',
} as const;
/** The two sections on this page a tile opens. */
export const SECTION = { coming: 'revenue-coming', products: 'revenue-products' } as const;

export interface RevenueStatVM {
  key: 'cash' | 'still' | 'total' | 'mrr' | 'failed';
  label: string;
  value: string;
  sub?: string;
  /** The sub line on a phone, when it is shorter there (the mockup's "2 payments · Dec 30"). */
  subPhone?: string;
  tone?: 'ok' | 'bad' | 'info' | null;
  /** An address, or a section of this page. */
  to: { href: string } | { section: string };
}

export interface RevenueMonthVM {
  key: string;
  label: string;
  now: boolean;
  total: string;
  /** On a phone: "$45K", "$8.2K", "$695" (the 16px floor; the mockup set them at 11px). */
  short: string;
  /** Each part's height in percent; null when the part is not drawn. */
  calendar: number | null;
  collected: number | null;
}

export interface RevenueCardVM {
  cohortId: string;
  title: string;
  sub: string;
  seats: { pct: number; bar: SeatBar; text: string };
  paid: string;
  twoPay: string;
  refunds: string;
  people: string;
  enrollment: string;
}

export interface RevenueProductVM {
  key: string;
  product: string;
  line: string;
  collected: string;
  still: string;
  total: string;
  mrr: string;
  to: string;
}

export interface RevenueComingVM {
  key: string;
  when: string;
  from: string;
  for: string;
  amount: string;
  status: { label: string; tone: StatusTone };
  to: string;
}

export interface RevenueVM {
  period: RevenuePeriod;
  stats: RevenueStatVM[];
  chart: { months: RevenueMonthVM[]; aria: string; note: string } | null;
  cards: RevenueCardVM[];
  refunds: { value: string; line: string };
  products: RevenueProductVM[];
  coming: { rows: RevenueComingVM[]; right: string } | null;
}

/** "$45K", "$8.2K", "$695". */
export function shortUsd(cents: number): string {
  const n = Math.round(cents / 100);
  return n >= 10_000 ? `$${Math.round(n / 1000)}K` : n >= 1000 ? `$${Math.round(n / 100) / 10}K` : `$${n}`;
}

const noCohort = (name: string): string => name.replace(/\s+cohort$/i, '');
const teamsWord = REVENUE_COPY.card.teams;

/** What a payment in Coming in is for: "Team Plan renewal", "Insiders, second try", "Accelerator, payment 2 of 2". */
export function comingFor(kind: ComingKind, line: BillingLine | null, n: number): string {
  const label = comingLineLabel(line);
  if (kind === 'retry') return `${label ?? 'Invoice'}, ${ORDINALS[n] ?? `try ${n}`}${ORDINALS[n] ? ' try' : ''}`;
  if (kind === 'second') return `${label ?? 'Accelerator'}, payment ${n} of 2`;
  if (kind === 'first') return `${label ?? 'Subscription'}, first payment`;
  return `${label ?? 'Subscription'} renewal`;
}

function cardOf(c: RevenueCohortFigures, name: string): RevenueCardVM {
  const C = REVENUE_COPY.card;
  return {
    cohortId: c.cohortId,
    title: C.title,
    sub: cohortLabel(name),
    seats: { pct: seatPct(c.sold, c.cap), bar: seatBar(c.sold, c.cap, 'cohort'), text: `${c.sold} of ${c.cap}` },
    paid: c.paidInFull ? `${teamsWord(c.paidInFull)} · ${usdWhole(c.paidInFullCents)}` : REVENUE_COPY.none,
    twoPay: c.twoPay ? C.twoPayLine(teamsWord(c.twoPay), usdWhole(c.twoPayInCents), usdWhole(c.scheduledCents)) : REVENUE_COPY.none,
    refunds: c.refunds ? `${teamsWord(c.refunds)} · ${usdWhole(c.refundedCents)}` : REVENUE_COPY.none,
    people: `/admin/cohort/${encodeURIComponent(c.cohortId)}/people`,
    // PLAN.md § 10.3: seats have one source, Enrollment; every other seat count links to it.
    enrollment: `/admin/cohort/${encodeURIComponent(c.cohortId)}/settings#enrollment`,
  };
}

const lineSub = (r: RevenueSummary['lines'][number]): string => {
  if (r.active === null) return UNAVAILABLE;
  const n = r.active;
  if (r.kind === 'agents') return `${teamsWord(n)} · ${r.people ?? 0} ${r.people === 1 ? 'person' : 'people'}`;
  return `${n.toLocaleString('en-US')} ${r.kind === 'agent_plan' ? 'agent' : 'member'}${n === 1 ? '' : 's'}`;
};

/** Revenue › Summary from the API's answer, the snapshot's cohorts and the moment it is read. */
export function revenueVM(s: RevenueSummary, db: Pick<Db, 'cohorts' | 'modules' | 'sessions'>, now: number): RevenueVM {
  const C = REVENUE_COPY;
  const cohortOf = (id: string) => db.cohorts.find((c) => c.id === id);
  const nameOf = (id: string) => cohortOf(id)?.name ?? id;
  const byStart = (a: RevenueCohortFigures, b: RevenueCohortFigures) =>
    (cohortOf(a.cohortId)?.start ?? Infinity) - (cohortOf(b.cohortId)?.start ?? Infinity) || a.cohortId.localeCompare(b.cohortId);
  const cohorts = [...s.cohorts].sort(byStart);
  const still = s.stillToCollect;

  const cashSub =
    s.cash === null
      ? undefined
      : s.period === 'month' && s.periodStart !== null
        ? C.range(adminMonthDay(s.periodStart), adminMonthDay(s.asOf))
        : s.periodStart !== null
          ? C.since(adminMonthYear(s.periodStart))
          : C.none;
  const stillSub = still.payments
    ? still.nextAt !== null
      ? { sub: `${C.payments(still.payments)} · ${adminDay(still.nextAt)}`, subPhone: `${C.payments(still.payments)} · ${adminMonthDay(still.nextAt)}` }
      : { sub: C.payments(still.payments) }
    : { sub: C.none };
  const stats: RevenueStatVM[] = [
    { key: 'cash', label: C.stats.cash, value: or(s.cash?.collectedCents), ...(cashSub ? { sub: cashSub } : {}), to: { href: PAYMENTS.invoices } },
    { key: 'still', label: C.stats.still, value: usdWhole(still.cents), ...stillSub, tone: still.payments ? 'info' : null, to: { section: SECTION.coming } },
    {
      key: 'total',
      label: C.stats.total,
      value: s.cash ? usdWhole(s.cash.collectedCents + still.cents) : UNAVAILABLE,
      ...(s.cash ? { sub: C.totalSub } : {}),
      to: { section: SECTION.products },
    },
    {
      key: 'mrr',
      label: C.stats.mrr,
      value: or(s.mrr?.cents),
      ...(s.mrr ? { sub: C.subscriptions(s.mrr.subscriptions), tone: 'ok' as const } : {}),
      to: { href: PAYMENTS.subscriptions },
    },
    {
      key: 'failed',
      label: C.stats.failed,
      value: s.failed === null ? UNAVAILABLE : s.failed.toLocaleString('en-US'),
      ...(s.failed === null ? {} : s.failed > 0 ? { sub: C.needsReview, tone: 'bad' as const } : { sub: C.none }),
      to: { href: PAYMENTS.failed },
    },
  ];

  let chart: RevenueVM['chart'] = null;
  if (s.months) {
    const thisMonth = s.months[3]?.month ?? '';
    const max = Math.max(0, ...s.months.map((m) => m.collectedCents + m.calendarCents));
    const pct = (c: number) => Math.max(4, max > 0 ? (c / max) * 100 : 0);
    const months = s.months.map((m): RevenueMonthVM => {
      const total = m.collectedCents + m.calendarCents;
      return {
        key: m.month,
        label: revenueMonthLabel(m.month, 'short'),
        now: m.month === thisMonth,
        total: usdWhole(total),
        short: shortUsd(total),
        // What is on the calendar over what was collected; a month with neither is a 4% stub, as the mockup draws it.
        calendar: m.calendarCents > 0 ? pct(m.calendarCents) : null,
        collected: m.collectedCents > 0 || m.calendarCents === 0 ? pct(m.collectedCents) : null,
      };
    });
    const long = (m: string) => revenueMonthLabel(m, 'long');
    const ahead = s.months.filter((m) => m.month >= thisMonth && (m.month > thisMonth || m.calendarCents > 0)).map((m) => long(m.month));
    const first = s.months.find((m) => m.month >= thisMonth && m.calendarCents > 0);
    chart = {
      months,
      aria: C.chart.aria(
        long(s.months[0]!.month),
        long(thisMonth),
        ahead.length === 2 ? `${ahead[0]} and ${ahead[1]}` : ahead.length > 2 ? `${ahead[0]} to ${ahead[ahead.length - 1]}` : (ahead[0] ?? long(thisMonth)),
      ),
      note: `${first ? C.chart.counts(long(first.month), first.secondPayments, usdWhole(first.secondCents)) : C.chart.nothing} ${C.chart.forecast}`,
    };
  }

  // A card per cohort that is selling or running (enrollment open, or its status word Active), not archived.
  const cards = cohorts
    .filter((c) => {
      const co = cohortOf(c.cohortId);
      return !!co && co.archivedAt === undefined && (enrollmentOpen(co) || cohortStatusWord(db, co.id, now) === 'Active');
    })
    .map((c) => cardOf(c, nameOf(c.cohortId)));

  const r = s.refunds30d;
  const refunds =
    r === null
      ? { value: UNAVAILABLE, line: '' }
      : {
          value: usdWhole(r.cents),
          line: r.count === 0 || !r.latest ? C.none : r.count === 1 ? C.refunds.one(r.latest.name, adminMonthDay(r.latest.at)) : C.refunds.many(r.count, adminMonthDay(r.latest.at)),
        };

  const P = C.products;
  const plus = (a: number | null, b: number) => (a === null ? UNAVAILABLE : usdWhole(a + b));
  const products: RevenueProductVM[] = [
    // One row per cohort not archived, and any other with a seat or a payment.
    ...cohorts
      .filter((c) => {
        const co = cohortOf(c.cohortId);
        return (co && co.archivedAt === undefined) || c.sold > 0 || (c.collectedCents ?? 0) !== 0 || c.scheduledCents > 0;
      })
      .map((c) => ({
        key: `cohort:${c.cohortId}`,
        product: billingLineLabel('cohort'),
        line: P.seats(noCohort(nameOf(c.cohortId)), c.sold, c.cap),
        collected: or(c.collectedCents),
        still: usdWhole(c.scheduledCents),
        total: plus(c.collectedCents, c.scheduledCents),
        mrr: P.oneTime,
        to: `/admin/cohort/${encodeURIComponent(c.cohortId)}/people`,
      })),
    ...BILLING_LINES.filter((l) => l !== 'cohort').flatMap((line) => {
      const r = s.lines.find((x) => x.line === line);
      if (!r) return [];
      return [
        {
          key: `line:${line}`,
          product: billingLineLabel(line),
          line: lineSub(r),
          collected: or(r.collectedCents),
          still: usdWhole(0),
          total: plus(r.collectedCents, 0),
          mrr: or(r.mrrCents),
          to: PAYMENTS.subscriptions,
        },
      ];
    }),
    {
      key: 'skills',
      product: P.skills,
      line: P.bought(s.skills.bought),
      collected: or(s.skills.collectedCents),
      still: usdWhole(0),
      total: plus(s.skills.collectedCents, 0),
      mrr: P.oneTime,
      to: PAYMENTS.invoices,
    },
  ];

  const coming = s.coming
    ? {
        rows: s.coming.map(
          (c, i): RevenueComingVM => ({
            key: `${c.at}-${i}`,
            when: adminDay(c.at),
            from: c.name ?? c.customerId ?? UNAVAILABLE,
            for: comingFor(c.kind, c.line, c.n),
            amount: usdWhole(c.amountCents),
            status: c.kind === 'retry' ? { label: C.coming.retrying, tone: 'run' } : { label: C.coming.scheduled, tone: 'info' },
            to: c.workspace ? teamPath(c.workspace.teamId) : c.kind === 'retry' ? PAYMENTS.failed : PAYMENTS.subscriptions,
          }),
        ),
        right: C.coming.right(usdWhole(s.coming.reduce((a, c) => a + c.amountCents, 0))),
      }
    : null;

  return { period: s.period, stats, chart, cards, refunds, products, coming };
}
