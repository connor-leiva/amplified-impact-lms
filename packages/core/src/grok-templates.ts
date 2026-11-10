// The Grok Bot templates in the library (D-100): scheduled Grok Bot skills for real estate
// bookkeeping and transaction management. They are not Claude Skills, so they are not in
// `SKILL_CATALOG` and `scripts/skills.mjs` does not pack them; they have their own catalog, their own
// free list and their own packer (`scripts/grok-templates.mjs`). In @ai/core so the API and the www
// pages read the same list.
//
// THE SOURCE. Each template is a finished `SKILL.md` under `content/grok-bot-templates/<collection>/<id>/`,
// with the README beside them. The ZIP a page offers holds that one file, as `<id>/SKILL.md`.
//
// FREE FAILS CLOSED, as for the skills: a template is free only when `FREE_GROK_TEMPLATES` names it.
// The other twelve are in the Amplified Skill Library: `server.ts` stops serving their ZIPs from
// `/downloads`, and their pages show a preview with the Skill Library card.

import type { SkillSet } from './offer';

/** The shelf's two collections, in this order on /library. */
export const GROK_COLLECTIONS = ['bookkeeping', 'transactions'] as const;
export type GrokCollection = (typeof GROK_COLLECTIONS)[number];

export interface GrokTemplate {
  /** The template's folder, its ZIP's name and its page's path. */
  id: string;
  /** Its name on /library and its page, as the README lists it. The `name` Grok Bot knows it by is its SKILL.md frontmatter's. */
  title: string;
  /** One line for the platform's library screen. */
  summary: string;
  collection: GrokCollection;
  /** Who opens it in the platform, as for a skill (D-079). */
  sets: SkillSet;
  /** One group above all others, said on its card and page: Trust & Earnest Money Watch is for brokers. */
  audience?: 'brokers';
  /** The ZIP under `apps/web/public/downloads`. */
  file: string;
}

/** Connor's picks (2026-11-10): two from each collection. Fails closed: a template not named is paid. */
export const FREE_GROK_TEMPLATES: readonly string[] = [
  'card-bank-feed-audit',
  'quarterly-tax-profit-first',
  'contract-to-close-deadlines',
  'new-contract-intake',
];

const t = (id: string, title: string, summary: string, collection: GrokCollection, sets: SkillSet, audience?: 'brokers'): GrokTemplate => ({
  id,
  title,
  summary,
  collection,
  sets,
  ...(audience ? { audience } : {}),
  file: `${id}.zip`,
});

export const GROK_TEMPLATES: readonly GrokTemplate[] = [
  // Bookkeeping, against QuickBooks Online. No expense reports needed.
  t('card-bank-feed-audit', 'Weekly Card & Bank Audit', 'Checks the cards and the operating account against QuickBooks every week.', 'bookkeeping', 'both'),
  t('commission-tie-out', 'Commission Tie-Out', "Checks each closing's deposit against the CDA, the split, the cap and the fees.", 'bookkeeping', 'both'),
  t('team-payout-journals', 'Team Split & Payout Journals', 'Drafts the split, cap, desk fee and payable entries for approval.', 'bookkeeping', 'owner_ops'),
  t('month-end-close', 'Month-End Close Packet', 'Builds the month-end packet: reconciliations, cleanup, accruals and a P&L.', 'bookkeeping', 'both'),
  t('trust-earnest-watch', 'Trust & Earnest Money Watch', 'A weekly three-way check of the trust bank, QuickBooks and the per-deal ledger.', 'bookkeeping', 'owner_ops', 'brokers'),
  t('vendor-1099-readiness', '1099 Vendor & Agent Readiness', 'Tracks W-9s and year-to-date totals so 1099 season is a check.', 'bookkeeping', 'owner_ops'),
  t('quarterly-tax-profit-first', 'Quarterly Tax & Profit-First Set-Aside', 'Shows what to move to tax, profit and reserve, at the rates you set.', 'bookkeeping', 'both'),
  t('lead-source-roi', 'Lead-Source ROI', 'Puts lead spend in QuickBooks next to what closed in Follow Up Boss, by source.', 'bookkeeping', 'both'),
  // Transactions, contract to close, in whatever system the team already uses.
  t('contract-to-close-deadlines', 'Contract-to-Close Deadline Tracker', 'A daily digest of overdue, due today and upcoming contract deadlines.', 'transactions', 'both'),
  t('new-contract-intake', 'New Contract Intake', 'Turns a ratified contract into a tracker row and a first task list.', 'transactions', 'both'),
  t('missing-documents-audit', 'Missing-Documents File Audit', "Checks each file against your broker's checklist before review.", 'transactions', 'both'),
  t('weekly-status-updates', 'Weekly Client & Agent Status Updates', 'Drafts the weekly client note and the internal agent note.', 'transactions', 'both'),
  t('stalled-item-follow-up', 'Stalled Lender, Title & Escrow Follow-Up', 'Spots stalled lender, title and escrow items and drafts the follow-up.', 'transactions', 'both'),
  t('closing-week-checklist', 'Closing-Week Checklist', 'A seven-day closing checklist with a wire-fraud reminder.', 'transactions', 'both'),
  t('listing-to-live', 'Listing-to-Live Launch Checklist', 'Gets a listing from signed agreement to live without a missed step.', 'transactions', 'agent'),
  t('post-close-file-closeout', 'Post-Close File Closeout', 'Drafts the CDA request, the archive, the review ask and the CRM update.', 'transactions', 'both'),
];

export const isFreeGrokTemplate = (id: string): boolean => FREE_GROK_TEMPLATES.includes(id);

export const grokTemplate = (id: string): GrokTemplate | undefined => GROK_TEMPLATES.find((g) => g.id === id);

/** Every Grok ZIP that is not a public file (D-100), as `PAID_DOWNLOADS` is for the skills (D-082). */
export const PAID_GROK_DOWNLOADS: readonly string[] = GROK_TEMPLATES.filter((g) => !isFreeGrokTemplate(g.id)).map((g) => g.file);
