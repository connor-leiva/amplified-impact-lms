// D-252: the Week Builder's "Show as the LMS Tour on Sign-In", on a Week 0 Media video only, and the rules the save
// holds it to, said while staff edit (`draftIssues`, the same lines `saveBuilderModule` refuses with).
import { useState } from 'react';
import { MemoryRouter } from 'react-router';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { TOUR_RULE } from '@ai/core';
import type { AIEmployee, Db } from '@ai/core';
import { ACCELERATOR_MODULE_IDS } from '@ai/core/accelerator';
import type { VideoBlock } from '@ai/core/course-types';
import { seedProduction } from '@ai/core/seed/curriculum';
import { WeekCards } from './WeekBuilder';
import { draftIssues, isWeekDraft } from './WeekBuilder.vm';
import type { WeekDraft } from './WeekBuilder.vm';

const prod = (): Db => seedProduction({ owner: { name: 'Connor Leiva', email: 'connor@amplifiedimpact.io' } });
const KEY = (n: number, ext: string) => `uploads/2026/11/dddddddd-0000-4000-8000-${String(n).padStart(12, '0')}.${ext}`;
const VIDEO: VideoBlock = {
  type: 'video',
  id: 'w0-tour',
  title: 'How the LMS Works',
  source: { upload: KEY(1, 'mp4'), name: 'tour.mp4', size: 1000, type: 'video/mp4' },
  transcript: { upload: KEY(2, 'vtt'), name: 'tour.vtt', size: 10, type: 'text/vtt' },
};

function Harness({ db, start, onDraft }: { db: Db; start: WeekDraft; onDraft: (d: WeekDraft) => void }) {
  const [d, setD] = useState<WeekDraft>(start);
  const up = (fn: (x: AIEmployee) => void) =>
    setD((prev) => {
      const next = structuredClone(prev);
      fn(next);
      onDraft(next);
      return next;
    });
  return <WeekCards db={db} draft={d} up={up} act={vi.fn(async () => ({})) as never} />;
}

function setup(n: number, media: VideoBlock[]) {
  const db = prod();
  const m = structuredClone(db.modules.find((x) => x.id === ACCELERATOR_MODULE_IDS[n])!);
  if (!isWeekDraft(m)) throw new Error('not a week');
  m.course.media = [...m.course.media, ...media];
  let last: WeekDraft = m;
  render(
    <MemoryRouter>
      <Harness db={db} start={m} onDraft={(d) => (last = d)} />
    </MemoryRouter>,
  );
  return { db, week: m, draft: () => last, user: userEvent.setup() };
}

async function mediaVideos(user: ReturnType<typeof userEvent.setup>, week: number) {
  await user.click(screen.getAllByRole('button', { name: 'Edit' })[0]!);
  const dialog = screen.getByRole('dialog', { name: `Course page · Week ${week}` });
  return within(dialog).getByRole('group', { name: 'Media videos' });
}

describe('Show as the LMS Tour on Sign-In (D-252)', () => {
  it('is offered on a Week 0 Media video, and ticking it flags that block', async () => {
    const { user, draft } = setup(0, [VIDEO]);
    const box = within(await mediaVideos(user, 0)).getByRole('checkbox', { name: 'Show as the LMS Tour on Sign-In' });
    expect(box).not.toBeChecked();
    expect(box).toHaveAccessibleDescription(/until they’ve seen it/);
    await user.click(box);
    const flagged = draft().course.media.find((x): x is VideoBlock => typeof x !== 'string' && x.id === 'w0-tour');
    expect(flagged?.tour).toBe(true);
    await user.click(box);
    expect(draft().course.media.find((x): x is VideoBlock => typeof x !== 'string' && x.id === 'w0-tour')).not.toHaveProperty('tour');
  });

  it('is not offered on another week’s Media', async () => {
    const { user } = setup(2, [VIDEO]);
    expect(within(await mediaVideos(user, 2)).queryByRole('checkbox', { name: 'Show as the LMS Tour on Sign-In' })).toBeNull();
  });

  it('says what the save would refuse: a link, no transcript, a second tour, a tour outside Week 0', () => {
    const db = prod();
    const w0 = structuredClone(db.modules.find((x) => x.id === ACCELERATOR_MODULE_IDS[0])!);
    const n = w0.course!.media.length;
    w0.course!.media.push({ ...VIDEO, tour: true });
    expect(draftIssues(w0, w0, db.modules)).toEqual([]);
    w0.course!.media[n] = { ...VIDEO, transcript: undefined, tour: true };
    expect(draftIssues(w0, w0, db.modules)).toEqual([`Media ${n + 1}: ${TOUR_RULE.transcript}`]);
    w0.course!.media[n] = { type: 'video', source: { url: 'https://example.test/tour.mp4' }, tour: true };
    expect(draftIssues(w0, w0, db.modules)).toEqual([`Media ${n + 1}: ${TOUR_RULE.upload}`]);
    w0.course!.media[n] = { ...VIDEO, tour: true };
    w0.course!.media.push({ ...VIDEO, id: 'second', tour: true });
    expect(draftIssues(w0, w0, db.modules)).toEqual([TOUR_RULE.one]);
    const w2 = structuredClone(db.modules.find((x) => x.id === ACCELERATOR_MODULE_IDS[2])!);
    w2.course!.media.push({ ...VIDEO, tour: true });
    expect(draftIssues(w2, w2, db.modules)).toEqual([`Media ${w2.course!.media.length}: ${TOUR_RULE.where}`]);
  });
});
