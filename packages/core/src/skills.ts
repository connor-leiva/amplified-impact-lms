// The skill library's catalog (in @ai/core so the API and the www skill pages share it): which skills there are, which set each opens with, which stay free, and
// when each was released (D-079, D-082).
//
// THE TAGS. Every skill is owner and ops, agent, or both (D-079), read off each skill's own description:
// who it says it is for. Changing a tag is a one-word edit here, then `pnpm --filter @ai/api skills` to
// load it. Every skill already built counts as released at launch; anything after these follows the
// two-new-skills-a-month rule with its own date.
//
// FREE FAILS CLOSED. A skill is free only when it is listed in `FREE_SKILLS`: Appointment Follow-Up
// (the Follow Up Boss follow-up skill) and Connor's two picks, Database Health Check and Team P&L
// Review (2026-11-10). The voice profile and the time audit are guides, not ZIPs, and stay public as
// they are. Every other ZIP is paid: `server.ts` stops serving it from `/downloads`, and its page shows
// a preview with the Skill Library card instead of the download (D-082).

import type { SkillSet } from './offer';

export interface CatalogSkill {
  id: string;
  title: string;
  /** One line for the library screen. */
  summary: string;
  sets: SkillSet;
  /** The ZIPs this skill ships as, by kind; the file names under `apps/web/public/downloads`. */
  files: { claude?: string; chatgpt?: string; practice?: string };
}

/**
 * Everything already built counts as released before the carts open, so every buyer gets all of it
 * ("every skill released so far"). New skills, two a month, get their own dates.
 */
export const LAUNCH_RELEASE = Date.parse('2026-11-01T00:00:00-05:00');

/** Connor's picks go here (D-082). Fails closed: a skill not named is paid. */
export const FREE_SKILLS: readonly string[] = [
  // The Follow Up Boss follow-up skill (the spec's free 5).
  'appointment-follow-up',
  // Connor's two picks (2026-11-10).
  'database-health-check',
  'team-pnl-review',
];

const zips = (id: string, withChatgpt: boolean, withPractice = true): CatalogSkill['files'] => ({
  claude: `${id}.zip`,
  ...(withChatgpt ? { chatgpt: `${id}-chatgpt.zip` } : {}),
  ...(withPractice ? { practice: `${id}-practice.zip` } : {}),
});

/** Proposed tags; see the header. `owner_ops` is the owner and operations set, `agent` the agents'. */
export const SKILL_CATALOG: readonly CatalogSkill[] = [
  // For the people who run the team.
  { id: 'database-health-check', title: 'Database Health Check', summary: 'Turns a CRM export into a cleanup list and re-engagement segments.', sets: 'owner_ops', files: zips('database-health-check', true) },
  { id: 'recruiting-prep', title: 'Recruiting Prep', summary: 'Tiers a recruit list and preps each recruiting conversation.', sets: 'owner_ops', files: zips('recruiting-prep', true) },
  { id: 'team-playbook-builder', title: 'Team Playbook Builder', summary: "Turns the team's SOPs into a playbook skill every agent installs.", sets: 'owner_ops', files: zips('team-playbook-builder', false) },
  { id: 'team-pnl-review', title: 'Team P&L Review', summary: "Reviews the team's profit and loss and drafts the owner brief.", sets: 'owner_ops', files: zips('team-pnl-review', true) },
  { id: 'inbox-meeting-follow-through', title: 'Inbox and Meeting Follow-Through', summary: "A team leader's daily pass over email and meetings.", sets: 'owner_ops', files: zips('inbox-meeting-follow-through', false) },
  { id: 'l10-meeting-prep', title: 'L10 Meeting Prep', summary: "Preps the weekly EOS L10 from the team's scorecard, rocks, to-dos and issues.", sets: 'owner_ops', files: zips('l10-meeting-prep', true) },
  // For everyone.
  { id: 'perfect-week', title: 'Perfect Week', summary: 'Plans an ideal working week from the real calendar and task list.', sets: 'both', files: zips('perfect-week', false) },
  { id: 'content-opportunity-research', title: 'Content Strategist', summary: "Weekly Instagram research and five ideas built on the creator's own stories.", sets: 'both', files: zips('content-opportunity-research', false) },
  { id: 'reel-editor', title: 'Reel Editor', summary: 'Edits a filmed talking-head video into a Reel.', sets: 'both', files: { claude: 'reel-editor.zip' } },
  // For agents.
  { id: 'appointment-follow-up', title: 'Appointment Follow-Up', summary: 'Turns an appointment transcript into the recap email and the Follow Up Boss note.', sets: 'agent', files: zips('appointment-follow-up', true) },
  { id: 'pricing-conversation-prep', title: 'Pricing Conversation Prep', summary: 'Turns a CMA into a list price, a talk track and answers to objections.', sets: 'agent', files: zips('pricing-conversation-prep', true) },
  { id: 'showing-tour-prep', title: 'Showing Tour Prep', summary: "Turns MLS sheets into a buyer's tour sheet and an agent-only page.", sets: 'agent', files: zips('showing-tour-prep', true) },
  { id: 'offer-strategy', title: 'Offer Strategy', summary: "Recommends a buyer's offer terms from the comps.", sets: 'agent', files: zips('offer-strategy', true) },
  { id: 'offer-comparison', title: 'Offer Comparison', summary: 'Puts every offer a listing received side by side for the seller.', sets: 'agent', files: zips('offer-comparison', true) },
  { id: 'counter-explainer', title: 'Counter Explainer', summary: 'Shows exactly what one counteroffer or addendum changes.', sets: 'agent', files: zips('counter-explainer', true) },
  { id: 'due-diligence-review', title: 'Due Diligence Review', summary: "Reviews a buyer's due diligence stack and drafts the objection list.", sets: 'agent', files: zips('due-diligence-review', true) },
  { id: 'repair-request-response', title: 'Repair Request Response', summary: "Drafts the listing side's answer to a repair request.", sets: 'agent', files: zips('repair-request-response', true) },
  { id: 'low-appraisal-response', title: 'Low Appraisal Response', summary: 'Reviews a low appraisal and drafts the reconsideration of value.', sets: 'agent', files: zips('low-appraisal-response', true) },
  { id: 'new-construction-review', title: 'New Construction Review', summary: "Reviews a builder's purchase agreement before the buyer signs.", sets: 'agent', files: zips('new-construction-review', true) },
  { id: 'listing-description-writer', title: 'Listing Description Writer', summary: 'Writes MLS remarks, headlines and a social caption from the listing worksheet, with a fair housing review.', sets: 'agent', files: zips('listing-description-writer', true) },
  { id: 'market-update-email', title: 'Market Update Email', summary: "Turns the MLS's monthly stats into a market update email and a social post.", sets: 'agent', files: zips('market-update-email', true) },
  { id: 'open-house-follow-up', title: 'Open House Follow-Up', summary: 'Turns an open house sign-in sheet and notes into visitor follow-ups and a seller update.', sets: 'agent', files: zips('open-house-follow-up', true) },
  { id: 'sphere-touch-plan', title: 'Sphere Touch Plan', summary: "Plans a year of sphere and past client touches and drafts this week's messages.", sets: 'agent', files: zips('sphere-touch-plan', true) },
];

export const isFreeSkill = (id: string): boolean => FREE_SKILLS.includes(id);

/** Every ZIP that stops being a public file (D-082): each paid skill's files. */
export const PAID_DOWNLOADS: readonly string[] = SKILL_CATALOG.filter((s) => !isFreeSkill(s.id)).flatMap((s) =>
  Object.values(s.files).filter((f): f is string => typeof f === 'string'),
);
