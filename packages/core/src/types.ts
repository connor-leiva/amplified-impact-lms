// Domain types for the Amplified Impact LMS, ported from design-reference/lms-data.js.
// The prototype's internal field names (`dur`, `short`, `dl`, `opens`, `last`, `forWho`) are kept
// exactly: the goldens and the differential tests rely on the shape.
import type { IconName } from './icons';

export type Tier = 'agent' | 'team';
export type Phase = 'week0' | 'live' | 'post';
export type ModuleStatus = 'draft' | 'scheduled' | 'published';
export type Runtime = 'deployed' | 'paused' | 'needs_attention';
export type RuntimeState = Runtime | 'not_deployed';
export type BuildState = 'not_started' | 'in_progress' | 'verified';
export type LearnerRole = 'Agent' | 'Team Owner' | 'Operations Lead' | 'Sales Agent';
export type StaffRole = 'Owner' | 'Admin' | 'Instructor' | 'Content Editor' | 'Support';
export type PermKey = 'curriculum' | 'publish' | 'cohorts' | 'viewLearners' | 'seats' | 'announce' | 'billing' | 'staff';

/** What a step asks of the learner, as the R2 Module Builder's Type column draws it (D-160 R2-2). Optional: display only. */
export type StepKind = 'Watch' | 'Read' | 'Build' | 'Check' | 'Ship';
export interface Step { id: string; text: string; ch: string; mins: number; t: number; hint: string; kind?: StepKind } // t = replay seconds
export interface SkillFile { name: string; type: 'JSON' | 'YAML' | 'Notion'; size: string; desc: string; steps: string[] }
export interface ModuleResource { name: string; type: string; size: string }

export interface AIEmployee {
  id: string; name: string; short: string; tier: Tier; icon: IconName; forWho: string;
  headline: string; outcome: string; outputs: string[];            // exactly 3 outputs
  platform: string; runLabel: string; build: number;               // build = Σ step minutes
  session: number | null; status: ModuleStatus; opens: number | null; order: number;
  dur: number; instructor: string; transcript: [number, string][]; notes: string; prompt: string;
  files: SkillFile[]; resources: ModuleResource[]; checklist: Step[];   // checklist.length === 6
  runDemo?: { input: string; sections: [string, string][] };
}

export interface Progress {
  steps: string[]; builtAt: number | null; deployedAt: number | null; runtime: Runtime | null;
  issue?: string; lastRun?: { at: number; title: string; preview: string };
}

export interface Learner {
  id: string; name: string; email: string; tier: Tier; role: LearnerRole; teamId: string | null;
  cohortId: string; joined: number; last: number | null; status: 'active' | 'invited';
  progress: Record<string, Progress>; reminded?: number; nudged?: number;
}

export interface Team { id: string; name: string; ownerId: string; seats: number }
export interface Cohort { id: string; name: string; start: number; end: number; weeks?: number; status: 'draft' | 'enrolling' | 'live' | 'completed'; capacity: number; enrolled: number; cadence: string }
export interface Session { id: string; cohortId: string; n: number; title: string; start: number; mins: number; zoom: string; live: boolean; attended: number | null; replay: null | 'processing' | 'ready'; views: number; movedFrom?: number; /** The recording a past session's Attach replay records (D-172). Optional; staff-only: learners' snapshots drop it. */ replayUrl?: string }
export interface Resource { id: string; title: string; desc: string; cat: string; type: string; tier: Tier; size: string; dl: number; updated: number; exec: boolean; status: 'published' | 'hidden'; /** The AI Employee it is attached to, by id (the Vault's Attached to; set by Edit details since D-172). Optional. */ module?: string }
export interface Announcement { id: string; sessionId?: string; title: string; body: string; severity: 'info' | 'warning'; action: 'calendar' | 'sessions' | null; actionLabel: string; audience: 'all' | 'agent' | 'team' | 'owners'; channels: ('inapp' | 'email')[]; /** `draft` (D-160 R2-2) is never sent: learners see `sent` only. */ status: 'sent' | 'scheduled' | 'draft'; at: number; opens: number | null }
export interface Reminder { id: string; label: string; channel: string; on: boolean }
export interface TierDef { id: Tier; name: string; price: number; seats: number; blurb: string; features: string[] }
export interface UpgradeRequest { id: string; userId: string | null; name: string; email: string; source: string; at: number; status: 'new' | 'contacted' | 'converted' | 'closed'; /** What is asked for, as the R2 Tiers screen's Request column prints it (D-160 R2-3), e.g. "Agent → Team · 16 seats". Optional: display only; without it the column reads "Agent → Team". */ ask?: string }
export interface Staff { id: string; name: string; email: string; role: StaffRole; last: number | null }
export interface ActivityEvent { id: string; t: number; who: string; what: string; tone: 'success' | 'warn' | 'info' }
/** Aggregates for learners not modeled individually. Fixture/demo only; the API always returns ZERO_BASE. */
export interface Baseline { learners: number; agent: number; teamSeats: number; teams: number; mod: Record<string, [number, number, number]>; daily: number[]; /** Their deployments in the last 24 hours (the R2 Overview's "+N in the last 24 hours", D-160 R2-3). Optional: absent is 0. */ recent?: number }

export interface Db {
  v: number; phase?: Phase;
  cohorts: Cohort[]; sessions: Session[]; modules: AIEmployee[]; users: Learner[]; teams: Team[];
  resources: Resource[]; announcements: Announcement[]; dismissed: Record<string, 1>; reminders: Reminder[];
  tiers: TierDef[]; requests: UpgradeRequest[]; staff: Staff[]; perms: Record<StaffRole, Record<PermKey, 0 | 1>>;
  base: Baseline; activity: ActivityEvent[];
}
export const ZERO_BASE: Baseline = { learners: 0, agent: 0, teamSeats: 0, teams: 0, mod: {}, daily: [0] };
