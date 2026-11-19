// Domain types for the Amplified Impact LMS, ported from design-reference/lms-data.js.
// The prototype's internal field names (`dur`, `short`, `dl`, `opens`, `last`, `forWho`) are kept
// exactly: the goldens and the differential tests rely on the shape.
import type { IconName } from './icons';
import type { CohortCourse, ModuleCourse, StepPaths } from './course-types';

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
/**
 * One step. `t` = replay seconds. The optional fields after `kind` are the curriculum builder's
 * (D-173): who does it, its time as a label ("20 min, over two weeks"), when it is done, its Claude
 * and ChatGPT paths, the Library skill it launches, and whether a preview learner may open it.
 */
export interface Step {
  id: string; text: string; ch: string; mins: number; t: number; hint: string; kind?: StepKind;
  who?: string; timeLabel?: string; doneWhen?: string; paths?: StepPaths; linkedSkill?: string; openInPreview?: boolean;
  /** The paragraph under the step title. Absent on a step that has none. */
  goal?: string;
}
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
  /**
   * The curriculum builder's fields (D-173), all optional so the prototype's AI Employees stay as
   * they are. `kind` is `week` for a course week; absent reads as an AI Employee. `dueAt` is when a
   * week is due (epoch ms). `tone` is the icon tile's tone. `course` is the week's words.
   */
  kind?: ModuleKind; dueAt?: number; tone?: string; course?: ModuleCourse;
}
export type ModuleKind = 'week' | 'skill';

export interface Progress {
  steps: string[]; builtAt: number | null; deployedAt: number | null; runtime: Runtime | null;
  issue?: string; lastRun?: { at: number; title: string; preview: string };
}

/**
 * One checklist box for one learner (D-190). A sub-check is stored as `itemId` = `<itemId>:<subId>`.
 * Absent on a learner who has never checked one, so every existing snapshot stays as it is.
 */
export interface ChecklistMark {
  moduleId: string;
  stepId: string;
  itemId: string;
  checked: boolean;
  /** Epoch ms. Absent when the box is unchecked. */
  checkedAt?: number;
  /** True when a later change checked it from the video. A hand check is false. */
  auto: boolean;
}

/**
 * One remembered choice on the course step page (D-190): an accordion (`acc:<moduleId>:<stepId>:<index>`).
 * Not `users.prefs`, which is the viewer's timezone and theme and is never part of a snapshot.
 */
export interface CoursePref {
  key: string;
  value: string;
  /** Epoch ms. */
  updatedAt: number;
}

export interface Learner {
  id: string; name: string; email: string; tier: Tier; role: LearnerRole; teamId: string | null;
  cohortId: string; joined: number; last: number | null; status: 'active' | 'invited';
  progress: Record<string, Progress>; reminded?: number; nudged?: number;
  /** D-190. Absent until this learner checks an item. */
  checks?: ChecklistMark[];
  /** D-190. Absent until this learner opens an accordion. */
  coursePrefs?: CoursePref[];
  /** D-191. Absent until this learner watches a course video. */
  videoProgress?: VideoProgress[];
  /**
   * D-202: a seeded test account. Absent on everyone else, so a fixture snapshot is unchanged.
   * Left out of seat, enrollment and revenue counts. Not something a learner can set.
   */
  test?: true;
}

/**
 * How far one learner has watched one course video (D-191). `maxPct` only ever rises.
 * `videoId` is the block's id, or its upload key when it has none. Times are epoch ms.
 */
export interface VideoProgress {
  moduleId: string;
  videoId: string;
  /** 0 to 1, from seconds actually watched, not the furthest seek. */
  maxPct: number;
  lastPositionS: number;
  /** Epoch ms. */
  updatedAt: number;
}

export interface Team { id: string; name: string; ownerId: string; seats: number }
export interface Cohort {
  id: string; name: string; start: number; end: number; weeks?: number; status: 'draft' | 'enrolling' | 'live' | 'completed'; capacity: number; enrolled: number; cadence: string;
  /**
   * The release plan (D-173), all optional: when the pre-launch preview opens (epoch ms), the zone
   * the cohort's times are written in (absent reads as `America/Denver`), the default open time of
   * day (`HH:MM`, absent reads as `12:00`), and what every week of the course shares.
   */
  previewOpensAt?: number; timezone?: string; defaultOpenTime?: string; course?: CohortCourse;
}
/** What a session is, as the builder sets it (D-173). `sessionKind()` still reads build or office hours off the id. */
export type SessionType = 'live_build' | 'office_hours' | 'goal_planning' | 'setup' | 'other';
/** Who sees a session's replay. */
export type ReplayVisibility = 'hidden' | 'after_open' | 'published';
export interface Session {
  id: string; cohortId: string; n: number; title: string; start: number; mins: number; zoom: string; live: boolean; attended: number | null; replay: null | 'processing' | 'ready'; views: number; movedFrom?: number; /** The recording a past session's Attach replay records (D-172). Optional; staff-only: learners' snapshots drop it. */ replayUrl?: string;
  /** The builder's (D-173): what kind of session, the week module it belongs to, who sees its replay. */
  kind?: SessionType; moduleId?: string; replayVisibility?: ReplayVisibility;
}
export type ResourceKind = 'file' | 'prompt' | 'guide' | 'replay' | 'vault';
export type ResourceVisibility = 'hidden_until_open' | 'open_in_preview' | 'published' | 'hidden';
export type ResourcePlatform = 'claude' | 'chatgpt' | 'both';
export interface Resource {
  id: string; title: string; desc: string; cat: string; type: string; tier: Tier; size: string; dl: number; updated: number; exec: boolean; status: 'published' | 'hidden'; /** The AI Employee it is attached to, by id (the Vault's Attached to; set by Edit details since D-172). Optional. */ module?: string;
  /** The builder's (D-173): what it is, the step it belongs to, who may see it and when, and its platform. */
  kind?: ResourceKind; stepId?: string; visibility?: ResourceVisibility; platform?: ResourcePlatform;
}
/** A piece of learner-facing copy the builder edits (D-173), e.g. `locked.utah_life`. */
export interface CopyString { key: string; value: string; audience: string }
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
  /** The builder's copy strings (D-173). Optional: absent when there are none, as in every fixture. */
  copy?: CopyString[];
}
export const ZERO_BASE: Baseline = { learners: 0, agent: 0, teamSeats: 0, teams: 0, mod: {}, daily: [0] };
