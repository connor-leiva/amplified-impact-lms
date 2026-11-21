// D-231 (B-30, B-31): the Community's props from the API's answers, against the mockup's sample (its clock: Fri,
// Nov 20, 2026, 3:18 PM CT; a Central-time viewer, as the test setup's zone is).
import { describe, expect, it } from 'vitest';
import type { CommunityList, CommunityThread } from '@ai/core/community';
import { communitySamples } from '@lms-v3-pkg/sample-data.js';
import { COMMUNITY_UI, learnCommunityThread, listMessage, peopleProps, postWhen, threadProps, threadRows } from './community.vm';

const NOW = Date.parse('2026-11-20T21:18:00Z');
const T = (iso: string) => Date.parse(iso);
const spaces = [{ id: 'general', label: 'General' }, { id: 'week-0', label: 'Week 0 · Foundations' }, { id: 'wins', label: 'Wins' }];
const people = { am: { name: 'Alex Morgan', team: 'Northline Realty', staff: false }, dw: { name: 'Dana Whitlock', team: 'Sample Team', staff: false }, cl: { name: 'Connor Leiva', team: 'Amplified Impact', staff: true } };
const list: CommunityList = {
  me: 'am',
  staff: false,
  spaces,
  people,
  threads: [
    { id: 1, space: 'general', title: 'Start here: how to ask so the cohort can help', pinned: true, hidden: false, by: 'cl', activityAt: T('2026-11-18T15:00:00Z'), replies: 0, excerpt: 'Say the number…' },
    { id: 2, space: 'week-0', title: 'Our bookkeeper…', pinned: false, hidden: false, by: 'dw', activityAt: T('2026-11-20T18:20:00Z'), replies: 2, excerpt: 'Step 6 asks us…' },
    { id: 3, space: 'week-0', title: 'Ready Check…', pinned: false, hidden: false, by: 'am', activityAt: T('2026-11-20T16:05:00Z'), replies: 0, excerpt: 'We picked Claude…' },
    { id: 4, space: 'wins', title: 'Win…', pinned: false, hidden: false, by: 'dw', activityAt: T('2026-11-19T14:15:00Z'), replies: 0, excerpt: 'Step 8 is done…' },
  ],
};

describe('the Community’s props (D-231)', () => {
  it('uses the package’s words', () => {
    expect(COMMUNITY_UI).toEqual(communitySamples.ui);
  });
  it('gives each author the sample’s initials and the Staff mark', () => {
    expect(peopleProps(people)).toEqual(communitySamples.people);
  });
  it('words each row’s activity as the sample does, and links each thread', () => {
    const rows = threadRows(list, 'all', NOW);
    const sample = Object.fromEntries((communitySamples.threads as { id: number; activity: string }[]).map((t) => [t.id, t.activity]));
    expect(rows.map((r) => [r.id, r.activity])).toEqual([1, 2, 3, 4].map((id) => [id, sample[id]]));
    expect(rows[1]!.href).toBe('/learn/community/2');
    expect(learnCommunityThread(100)).toBe('/learn/community/100');
    expect(threadRows(list, 'week-0', NOW).map((r) => r.id)).toEqual([2, 3]);
    expect(threadRows(list, 'wins', NOW).map((r) => r.id)).toEqual([4]);
    expect(threadRows({ threads: [{ ...list.threads[0]!, activityAt: NOW - 5_000 }] }, 'all', NOW)[0]!.activity).toBe('just now');
  });
  it('words each post’s time as the sample does, and a new one "Just now"', () => {
    const sample = (communitySamples.threads as { posts: { id: number; when: string }[] }[]).flatMap((t) => t.posts);
    const at: Record<number, string> = { 11: '2026-11-18T15:00:00Z', 21: '2026-11-19T22:10:00Z', 22: '2026-11-19T23:02:00Z', 23: '2026-11-20T18:20:00Z', 31: '2026-11-20T16:05:00Z', 41: '2026-11-19T14:15:00Z', 51: '2026-11-18T20:30:00Z' };
    for (const p of sample) expect(postWhen(T(at[p.id]!), NOW)).toBe(p.when);
    expect(postWhen(NOW - 59_000, NOW)).toBe('Just now');
  });
  it('draws a thread with its space’s name, the posts this viewer may see, and the ones they just posted rising', () => {
    const data: CommunityThread = {
      me: 'am', staff: false, spaces, people,
      thread: { id: 2, space: 'week-0', title: 'Our bookkeeper…', pinned: false, hidden: false, posts: [
        { id: 21, by: 'dw', body: 'Step 6…', createdAt: T('2026-11-19T22:10:00Z'), edited: false, hidden: false },
        { id: 101, by: 'am', body: 'Thanks.', createdAt: NOW - 2_000, edited: true, hidden: false },
      ] },
    };
    const t = threadProps(data, NOW, new Set([101]));
    expect(t.spaceLabel).toBe('Week 0 · Foundations');
    expect(t.posts.map((p) => [p.id, p.when, p.edited, p.fresh ?? false])).toEqual([[21, 'Thu, Nov 19 · 4:10 PM CT', false, false], [101, 'Just now', true, true]]);
  });
  it('puts a failure in the list’s empty slot', () => {
    expect(listMessage(COMMUNITY_UI, 'That thread isn’t here anymore.').none).toBe('That thread isn’t here anymore.');
  });
});
