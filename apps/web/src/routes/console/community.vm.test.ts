// D-238 (B-45): Admin › Support › Community's view-model: the mockup's facts, tabs, filters, rows and a thread, from
// staff's `GET /api/community` and `GET /api/community/:id`, here the fixture's copy of the mockup's own threads.
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { setViewerZone } from '@ai/core';
import { COMMUNITY_FIXTURE_NOW, fixtureCommunity } from '../../data/console-fixture-community';
import { COMMUNITY_COPY as C, communityCounts, communityRows, communityThreadVM, filterCommunity } from './community.vm';

const NOW = COMMUNITY_FIXTURE_NOW;
const make = (meId = 'cl') => {
  const audits: unknown[] = [];
  const api = fixtureCommunity({
    me: { id: meId, name: meId === 'cl' ? 'Connor Leiva' : 'Casey Lin' },
    now: () => NOW,
    settle: <T,>(value: () => T) => {
      try {
        return Promise.resolve(value());
      } catch (e) {
        return Promise.reject(e);
      }
    },
    audit: (...a) => audits.push(a),
  });
  return { api, audits };
};

beforeEach(() => setViewerZone('America/Chicago'));
afterEach(() => setViewerZone(null));

describe('Admin › Community (D-238)', () => {
  it('counts as the mockup does: 4 threads, 3 waiting, 1 pinned, 1 hidden, 148 in 7 teams', async () => {
    const list = await make().api.community();
    const rows = communityRows(list, NOW);
    expect(communityCounts(rows)).toEqual({ all: 5, threads: 4, waiting: 3, pinned: 1, hidden: 1 });
    expect(C.members(list.members!)).toBe('148 in 7 teams');
    expect(C.description('December 2026 Cohort')).toBe(
      "The December 2026 Cohort's threads. You read, reply and moderate here, as staff. The cohort sees your posts with a Staff tag. Nothing is emailed.",
    );
  });

  it('draws each row in the mockup’s words and order: pinned first, then "3 hr ago" and on', async () => {
    const rows = communityRows(await make().api.community(), NOW);
    expect(rows.map((r) => [r.title.slice(0, 24), r.space, r.by.name, r.replies, r.activity, r.waiting])).toEqual([
      ['Start here: how to ask s', 'General', 'Connor Leiva', 0, '2 days ago', false],
      ['Our bookkeeper keeps the', 'Week 0 · Foundations', 'Dana Whitlock', 2, '3 hr ago', true],
      ['Ready Check is green on ', 'Week 0 · Foundations', 'Alex Morgan', 0, '5 hr ago', true],
      ['Win: the test hire ran w', 'Wins', 'Dana Whitlock', 0, '1 day ago', true],
      ['Test post, please ignore', 'General', 'Dana Whitlock', 0, '2 days ago', false],
    ]);
    expect(rows[1]!.href).toBe('/admin/community/2');
  });

  it('filters by tab, space and the find box (title and first post)', async () => {
    const rows = communityRows(await make().api.community(), NOW);
    expect(filterCommunity(rows, 'waiting', '', '').map((r) => r.id)).toEqual([2, 3, 4]);
    expect(filterCommunity(rows, 'pinned', '', '').map((r) => r.id)).toEqual([1]);
    expect(filterCommunity(rows, 'hidden', '', '').map((r) => r.id)).toEqual([5]);
    expect(filterCommunity(rows, 'all', 'week-0', '').map((r) => r.id)).toEqual([2, 3]);
    expect(filterCommunity(rows, 'all', 'general', '').map((r) => r.id)).toEqual([1, 5]);
    expect(filterCommunity(rows, 'all', '', 'QUICKBOOKS').map((r) => r.id)).toEqual([2]);
    expect(filterCommunity(rows, 'waiting', 'general', '')).toEqual([]);
  });

  it('a thread: every post with "team · when", the Staff tag, and About this thread', async () => {
    const vm = communityThreadVM(await make().api.communityThread('2'), NOW);
    expect(vm.posts.map((p) => [p.who.name, p.who.staff, p.who.team, p.when])).toEqual([
      ['Dana Whitlock', false, 'Sample Team', 'Thu, Nov 19 · 4:10 PM CT'],
      ['Connor Leiva', true, 'Amplified Impact', 'Thu, Nov 19 · 5:02 PM CT'],
      ['Alex Morgan', false, 'Northline Realty', 'Fri, Nov 20 · 12:20 PM CT'],
    ]);
    expect(vm.posts[0]!.paragraphs).toHaveLength(2);
    expect([vm.space, vm.replies, vm.started, vm.activity, vm.sees, vm.waiting]).toEqual([
      'Week 0 · Foundations',
      2,
      'Thu, Nov 19 · 4:10 PM CT',
      '3 hr ago',
      'Yes',
      true,
    ]);
    expect(communityThreadVM(await make().api.communityThread('5'), NOW).sees).toBe('No. It is hidden.');
    expect(communityThreadVM(await make().api.communityThread('1'), NOW).sees).toBe('Yes, pinned to the top');
  });

  it('staff answer, and the thread no longer waits; a hidden reply or thread changes it as the server would', async () => {
    const { api, audits } = make();
    await api.replyThread(3, 'Yes, run it on both.');
    let rows = communityRows(await api.community(), NOW);
    expect(rows.find((r) => r.id === 3)).toMatchObject({ waiting: false, replies: 1, activity: 'just now' });
    const t = communityThreadVM(await api.communityThread('3'), NOW);
    expect(t.posts[1]).toMatchObject({ when: 'Just now', who: { name: 'Connor Leiva', staff: true } });
    // Hide that reply: the member's word is the last the cohort sees again.
    await api.setPost(t.posts[1]!.id, { hidden: true });
    rows = communityRows(await api.community(), NOW);
    expect(rows.find((r) => r.id === 3)!.waiting).toBe(true);
    await api.setThread(3, { pinned: true });
    await api.setThread(3, { hidden: true });
    expect(audits).toEqual([
      ['community.hide', t.title, { hidden: true }],
      ['community.pin', t.title, { pinned: true }],
      ['community.hide', t.title, { hidden: true }],
    ]);
    expect(communityCounts(communityRows(await api.community(), NOW))).toMatchObject({ waiting: 2, pinned: 2, hidden: 2 });
  });

  it('refuses as the server does: its own sentences, and the first post hides only with its thread', async () => {
    const { api } = make();
    await expect(api.startThread({ space: 'general', title: 'Hi', body: 'x' })).rejects.toThrow('Give your thread a title.');
    await expect(api.replyThread(2, '   ')).rejects.toThrow('Write a reply first.');
    await expect(api.setPost(102, { hidden: true })).rejects.toThrow('That didn’t go through. Try again.');
    await expect(api.communityThread('99')).rejects.toThrow('That thread isn’t here anymore.');
  });

  it('a new thread is at the top; deleting its first post deletes the thread', async () => {
    const { api, audits } = make('st1');
    const { id } = await api.startThread({ space: 'wins', title: 'Office hours', body: 'Thursdays at noon.' });
    const rows = communityRows(await api.community(), NOW);
    // Below the pinned thread, above the rest.
    expect(rows[1]).toMatchObject({ id, title: 'Office hours', space: 'Wins', waiting: false, by: { name: 'Casey Lin', staff: true } });
    const t = await api.communityThread(String(id));
    expect(await api.deletePost(t.thread.posts[0]!.id)).toEqual({ thread: true });
    expect(communityRows(await api.community(), NOW).some((r) => r.id === id)).toBe(false);
    // Your own post: nothing to audit. Someone else's: audited.
    expect(audits).toEqual([]);
    expect(await api.deletePost(104)).toEqual({ thread: false });
    expect(audits).toEqual([['community.delete', 'Our bookkeeper keeps the QuickBooks login. Can the operator still connect the books?', null]]);
  });
});
