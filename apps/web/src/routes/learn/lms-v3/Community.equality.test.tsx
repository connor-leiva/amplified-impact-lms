// D-231 (IMPLEMENTATION-SPEC.md §2.2, Phase 10): the Community's three pieces are the package's, converted to TSX. This
// renders the package's own JSX and the repo's TSX with the package's sample data (as its harness builds the props)
// and compares the HTML, at rest and through the thread's and the drawer's own steps. C-22's additions draw nothing
// unless something is refused, so every step here must match.
import { renderToStaticMarkup } from 'react-dom/server';
import { act, fireEvent, render } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { CommunityPage as PkgList, StartThreadDrawer as PkgDrawer, ThreadPage as PkgThread } from '@lms-v3-pkg/components/Community.jsx';
import { communitySamples } from '@lms-v3-pkg/sample-data.js';
import { CommunityPage, StartThreadDrawer, ThreadPage } from './Community';
import type { CmThread, CmThreadRow, CommunityUi } from './types';

interface SamplePost { id: number; by: string; when: string; body: string; hidden?: boolean }
interface SampleThread { id: number; space: string; title: string; pinned?: boolean; hidden?: boolean; activity: string; posts: SamplePost[] }
const CU = communitySamples.ui as CommunityUi;
const PEOPLE = communitySamples.people as Record<string, { name: string; team: string; initials: string; staff?: boolean }>;
const SPACES = communitySamples.spaces as { id: string; label: string }[];
const THREADS = communitySamples.threads as SampleThread[];
const html = (el: React.ReactElement) => renderToStaticMarkup(el);

// The harness's props (handoff/lms-v3/harness/main.jsx), for a member (am) or staff (cl).
const shown = (t: SampleThread, staff: boolean) => (staff ? t.posts.slice(1) : t.posts.slice(1).filter((x) => !x.hidden));
const rows = (space: string, staff: boolean): CmThreadRow[] =>
  THREADS.filter((t) => (staff || !t.hidden) && (space === 'all' || t.space === space)).map((t) => ({
    id: t.id, href: `#thread-${t.id}`, space: t.space, title: t.title, pinned: t.pinned, hidden: t.hidden, activity: t.activity, replies: shown(t, staff).length, excerpt: t.posts[0]!.body.replace(/\s+/g, ' '), by: t.posts[0]!.by,
  }));
const threadOf = (id: number, staff: boolean): CmThread => {
  const t = THREADS.find((x) => x.id === id)!;
  return { ...t, spaceLabel: SPACES.find((x) => x.id === t.space)!.label, posts: [t.posts[0]!, ...shown(t, staff)] };
};
const noop = () => {};

describe('CommunityPage is the package’s, converted', () => {
  it.each(['all', 'general', 'week-0', 'wins'])('the list in space %s, as a member and as staff', (space) => {
    for (const staff of [false, true]) {
      const props = { ui: CU, spaces: SPACES, space, onSpace: noop, people: PEOPLE, onStart: noop, threads: rows(space, staff) };
      expect(html(<CommunityPage {...props} />)).toBe(html(<PkgList {...props} />));
    }
  });
  it('the empty slot', () => {
    const props = { ui: CU, spaces: SPACES, space: 'wins', onSpace: noop, people: PEOPLE, onStart: noop, threads: [] };
    expect(html(<CommunityPage {...props} />)).toBe(html(<PkgList {...props} />));
  });
});

describe('ThreadPage is the package’s, converted', () => {
  it.each([[2, 'am'], [2, 'cl'], [3, 'am'], [1, 'am'], [5, 'cl']] as const)('thread %i as %s', (id, me) => {
    const staff = !!PEOPLE[me]!.staff;
    const props = { ui: CU, people: PEOPLE, me, staff, backHref: '#community', thread: threadOf(id, staff), onReply: () => Promise.resolve(), onEdit: noop, onDelete: noop, onHidePost: noop, onPin: noop, onHideThread: noop };
    expect(html(<ThreadPage {...props} />)).toBe(html(<PkgThread {...props} />));
  });

  it('edit, cancel, ask to delete, an empty reply, then a reply', async () => {
    const onReply = vi.fn(() => Promise.resolve());
    const props = { ui: CU, people: PEOPLE, me: 'am', staff: false, backHref: '#community', thread: threadOf(2, false), onReply, onEdit: noop, onDelete: noop, onHidePost: noop, onPin: noop, onHideThread: noop };
    const a = render(<ThreadPage {...props} />).container;
    const b = render(<PkgThread {...props} />).container;
    const both = async (fn: (c: HTMLElement) => void) => { await act(async () => { fn(a); fn(b); }); };
    const same = () => expect(a.innerHTML).toBe(b.innerHTML);
    same();
    await both((c) => { fireEvent.click(c.querySelector('[data-post="23"] [data-do="edit"]')!); });
    same();
    await both((c) => { fireEvent.click(c.querySelector('[data-post="23"] [data-do="cancel"]')!); });
    same();
    await both((c) => { fireEvent.click(c.querySelector('[data-post="23"] [data-do="delete"]')!); });
    same();
    expect(a.querySelector('[data-post="23"] .cm-acts')!.textContent).toMatch(/^Delete this reply\?/);
    await both((c) => { fireEvent.click(c.querySelector('[data-post="23"] [data-do="cancel"]')!); });
    await both((c) => { fireEvent.click(c.querySelector('[id="cm-replybox"] .aim-async')!); });
    same();
    expect(a.querySelector('[id="cm-replybox"] .fm-msg')!.textContent).toBe('Write a reply first.');
    await both((c) => { fireEvent.change(c.querySelector('[id="cm-replybox"] textarea')!, { target: { value: 'Thanks. Sending the card back today.' } }); });
    same();
    await both((c) => { fireEvent.click(c.querySelector('[id="cm-replybox"] .aim-async')!); });
    same();
    expect(onReply).toHaveBeenCalledWith('Thanks. Sending the card back today.');
  });

  it('C-22: a refused reply says why where "Write a reply first." goes; a notice uses the same slot', async () => {
    const props = { ui: CU, people: PEOPLE, me: 'am', staff: false, backHref: '#community', thread: threadOf(2, false), onEdit: noop, onDelete: noop, onHidePost: noop, onPin: noop, onHideThread: noop };
    const a = render(<ThreadPage {...props} onReply={() => Promise.reject(new Error('That’s 30 posts this hour. Try again later.'))} />).container;
    await act(async () => { fireEvent.change(a.querySelector('[id="cm-replybox"] textarea')!, { target: { value: 'One more' } }); });
    await act(async () => { fireEvent.click(a.querySelector('[id="cm-replybox"] .aim-async')!); });
    expect(a.querySelector('[id="cm-replybox"]')!.getAttribute('data-state')).toBe('error');
    expect(a.querySelector('[id="cm-replybox"] .fm-msg')!.textContent).toBe('That’s 30 posts this hour. Try again later.');
    expect((a.querySelector('[id="cm-replybox"] textarea') as HTMLTextAreaElement).value).toBe('One more');
    const n = render(<ThreadPage {...props} onReply={() => Promise.resolve()} notice="That didn’t go through. Try again." />).container;
    expect(n.querySelector('[id="cm-replybox"]')!.getAttribute('data-state')).toBeNull();
    expect(n.querySelector('[id="cm-replybox"] .fm-msg')!.textContent).toBe('That didn’t go through. Try again.');
  });
});

describe('StartThreadDrawer is the package’s, converted', () => {
  afterEach(() => { vi.useRealTimers(); });
  it.each(['all', 'wins'])('opened from space %s, as a member and as staff', (space) => {
    for (const me of ['am', 'cl']) {
      for (const open of [true, false]) {
        const props = { ui: CU, spaces: SPACES, space, me: PEOPLE[me]!, open, onClose: noop, onPost: () => Promise.resolve(100), onPosted: noop };
        expect(html(<StartThreadDrawer {...props} />)).toBe(html(<PkgDrawer {...props} />));
      }
    }
  });

  it('the three errors, then a thread posted', async () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] });
    const onPosted = vi.fn();
    const props = { ui: CU, spaces: SPACES, space: 'all', me: PEOPLE.am!, open: true, onClose: noop, onPost: () => Promise.resolve(100), onPosted };
    const a = render(<StartThreadDrawer {...props} />).container;
    const b = render(<PkgDrawer {...props} />).container;
    const both = async (fn: (c: HTMLElement) => void) => { await act(async () => { fn(a); fn(b); }); };
    const same = () => expect(a.innerHTML).toBe(b.innerHTML);
    same();
    await both((c) => { fireEvent.click(c.querySelector('.cm-drawer .aim-async')!); });
    same();
    expect([...a.querySelectorAll('.fm-msg')].map((x) => x.textContent)).toEqual([CU.needSpace, CU.needTitle, CU.needDetails]);
    await both((c) => { fireEvent.click(c.querySelector('.cm-drawer .fm-chip:nth-child(2) input')!); });
    await both((c) => { fireEvent.change(c.querySelector('[id="cm-f-title"]')!, { target: { value: 'Does the time baseline count weekends?' } }); });
    await both((c) => { fireEvent.change(c.querySelector('[id="cm-f-details"]')!, { target: { value: 'We log calls on Saturdays.\n\nDo those go in the baseline?' } }); });
    same();
    await both((c) => { fireEvent.click(c.querySelector('.cm-drawer .aim-async')!); });
    same();
    await act(async () => { await vi.advanceTimersByTimeAsync(700); });
    same();
    expect(onPosted).toHaveBeenCalledTimes(2);
    expect(onPosted).toHaveBeenCalledWith(100);
  });

  it('C-22: a refused thread says why under the field it names, else under Details, and the button shakes back', async () => {
    const refusal = Object.assign(new Error('Pick a space for your thread.'), { errors: { space: 'Pick a space for your thread.' } });
    const props = { ui: CU, spaces: SPACES, space: 'general', me: PEOPLE.am!, open: true, onClose: noop, onPosted: noop };
    const a = render(<StartThreadDrawer {...props} onPost={() => Promise.reject(refusal)} />).container;
    await act(async () => { fireEvent.change(a.querySelector('[id="cm-f-title"]')!, { target: { value: 'A title' } }); });
    await act(async () => { fireEvent.change(a.querySelector('[id="cm-f-details"]')!, { target: { value: 'Details' } }); });
    await act(async () => { fireEvent.click(a.querySelector('.cm-drawer .aim-async')!); });
    expect(a.querySelector('[data-field="space"] .fm-msg')!.textContent).toBe('Pick a space for your thread.');
    expect(a.querySelector('.cm-drawer .aim-async')!.getAttribute('data-state')).toBe('error');
    const z = render(<StartThreadDrawer {...props} onPost={() => Promise.reject(new Error('That’s 30 posts this hour. Try again later.'))} />).container;
    await act(async () => { fireEvent.change(z.querySelector('[id="cm-f-title"]')!, { target: { value: 'A title' } }); });
    await act(async () => { fireEvent.change(z.querySelector('[id="cm-f-details"]')!, { target: { value: 'Details' } }); });
    await act(async () => { fireEvent.click(z.querySelector('.cm-drawer .aim-async')!); });
    expect(z.querySelector('[data-field="details"] .fm-msg')!.textContent).toBe('That’s 30 posts this hour. Try again later.');
  });
});
