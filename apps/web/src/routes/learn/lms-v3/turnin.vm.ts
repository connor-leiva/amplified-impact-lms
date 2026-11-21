// D-230 (IMPLEMENTATION-SPEC.md §7.6): Turn in's props, from the week's upload actions and `GET /api/submissions`.
// Pure. The words are the package's (`src/data/turn-in.samples.json` › `ui`). A turn-in's time is the drawer's own
// stamp, "Thu, Nov 19 · 4:02 PM", without a zone, as the intake drawer's are (B-17): `fmt.day` and `fmt.clockTime`.
import { fmt } from '@ai/core';
import { bytesLabel } from '@ai/core/submissions';
import type { SubmissionAsk } from '@ai/core/submissions';
import type { TiAsk, TiSub, TurnInUi } from './types';

/** The package's words for Turn in, as constants. */
export const TURN_IN_UI: TurnInUi = {
  turnIn: 'Turn in',
  view: 'View',
  agent: 'Your team’s owner or operator turns this in.',
  drop: 'Drop files here',
  or: 'or',
  choose: 'Choose files',
  types: 'PDF, HTML report, PNG or JPG screenshot, Excel or CSV. Up to 5 files, 25 MB each.',
  uploaded: 'Uploaded',
  remove: 'Remove',
  submit: 'Turn it in',
  submitted: 'Turned in',
  done: 'Done',
  newVersion: 'Turn in a new version',
  sentTo: 'Goes to Connor’s team. Nothing is emailed.',
  bannerTitle: 'Turned in.',
  files: 'Files',
  by: 'by',
  needFile: 'Add at least one file.',
  wait: 'Wait for the upload to finish.',
  tooMany: 'Up to 5 files at a time.',
  badType: 'isn’t a file you can upload here. Use a PDF, an HTML report, a PNG or JPG screenshot, an Excel file or a CSV.',
  tooBig: 'is over 25 MB. Export a smaller file, or save the report as a PDF.',
  kinds: {
    live_read: {
      title: 'Report for a live read',
      sub: 'Upload the report file. Add one line on what you’d like Connor to look at.',
      noteLabel: 'What should Connor look at?',
      privacy: 'Live reads are shown to the whole cohort. Take out anything you wouldn’t show another team.',
    },
    checkpoint: {
      title: 'Checkpoint',
      sub: 'Your signed seat card, a screenshot of the first run, and the minutes the hire took over.',
      noteLabel: 'Anything Connor should know?',
      minutesLabel: 'Minutes the hire took over',
      minutesHint: '“45”, “about 20 a day” or “not done today”.',
    },
  },
};

/** What `GET /api/submissions` sends for one kind (never a status). */
export interface SubmissionWire {
  id: number;
  kind: string;
  files: { name: string; size: number; href: string }[];
  note: string;
  minutes: string;
  by: string;
  at: number;
}

/** The drawer's stamp: "Thu, Nov 19 · 4:02 PM". */
export const turnedInWhen = (at: number): string => `${fmt.day(at)} · ${fmt.clockTime(at)}`;

/** §7.6 `asks[]`: one per kind the week collects. */
export const asksProps = (asks: readonly SubmissionAsk[]): TiAsk[] => asks.map((a) => ({ id: a.id, kind: a.kind, step: a.step, kicker: a.kicker }));

/** §7.6 `subs`: the team's latest per kind, files as downloads, sizes as the drawer writes them. */
export function subsProps(subs: Readonly<Record<string, SubmissionWire>>): Record<string, TiSub> {
  return Object.fromEntries(
    Object.entries(subs).map(([k, s]) => [
      k,
      { files: s.files.map((f) => ({ name: f.name, size: bytesLabel(f.size), href: f.href })), note: s.note, minutes: s.minutes, by: s.by, when: turnedInWhen(s.at) },
    ]),
  );
}

/** B-27: the step's button: "Turn in", or "View" once the team has turned something in for this kind. */
export const turnInLabel = (subs: Readonly<Record<string, unknown>>, kind: string): string => (subs[kind] ? TURN_IN_UI.view : TURN_IN_UI.turnIn);
