import { GROK_COLLECTIONS } from '@ai/core/grok-templates';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ENTRIES, LIBRARY } from './content';
import { renderLibraryBody } from './render';

// /library's script (D-050), against the real markup in jsdom.

async function boot(before?: () => void): Promise<void> {
  document.body.innerHTML = renderLibraryBody();
  before?.();
  vi.resetModules();
  await import('./main');
}

const $ = <T extends HTMLElement = HTMLElement>(selector: string) => {
  const el = document.querySelector<T>(selector);
  if (!el) throw new Error(`Nothing matches ${selector}`);
  return el;
};
const items = () => Array.from(document.querySelectorAll<HTMLElement>('[data-item]'));
const visible = () =>
  items()
    .filter((el) => !el.hidden)
    .map((el) => el.querySelector('.item-title')?.textContent);
const chip = (filter: string, value: string) =>
  $<HTMLButtonElement>(`button[data-filter="${filter}"][data-value="${value}"]`);
const pressed = (filter: string) =>
  Array.from(document.querySelectorAll(`button[data-filter="${filter}"][aria-pressed="true"]`)).map((b) =>
    b.getAttribute('data-value'),
  );
const search = (value: string) => {
  const input = $<HTMLInputElement>('#library-search');
  input.value = value;
  input.dispatchEvent(new Event('input', { bubbles: true }));
};
const sortBy = (value: string) => {
  const select = $<HTMLSelectElement>('#library-sort');
  select.value = value;
  select.dispatchEvent(new Event('change', { bubbles: true }));
};
/**
 * The titles that match, in the page's order: the main list newest first, with a card that has no
 * page yet last, then the Grok Bot shelf's collections (D-100), each the same way.
 */
const titles = (match: (e: (typeof ENTRIES)[number]) => boolean) => {
  const inOrder = (entries: (typeof ENTRIES)[number][]) =>
    entries
      .filter(match)
      .sort((a, b) => Number(a.href === null) - Number(b.href === null) || b.added.localeCompare(a.added))
      .map((e) => e.title);
  return [
    ...inOrder(ENTRIES.filter((e) => e.collection === undefined)),
    ...GROK_COLLECTIONS.flatMap((c) => inOrder(ENTRIES.filter((e) => e.collection === c))),
  ];
};

beforeEach(() => {
  document.body.innerHTML = '';
});
afterEach(() => {
  document.body.innerHTML = '';
});

describe('on load', () => {
  it('shows the controls, every card, and the full count', async () => {
    await boot();
    expect($('.controls').hidden).toBe(false);
    expect($('.sorter').hidden).toBe(false);
    expect(visible()).toEqual(titles(() => true));
    expect($('#library-count').textContent).toBe(`Showing ${ENTRIES.length} resources`);
    expect($('#library-empty').hidden).toBe(true);
  });
});

describe('the pills', () => {
  it('filters by tool, and presses only the pill tapped', async () => {
    await boot();
    chip('tool', 'chatgpt').click();
    expect(visible()).toEqual(titles((e) => e.tools.includes('chatgpt')));
    expect(pressed('tool')).toEqual(['chatgpt']);
    expect(visible()).not.toContain('Reel Editor');
  });

  it('filters by topic', async () => {
    await boot();
    chip('topic', 'team-ops').click();
    expect(visible()).toEqual(titles((e) => e.topics.includes('team-ops')));
    expect(pressed('topic')).toEqual(['team-ops']);
  });

  it('narrows by tool AND topic together', async () => {
    await boot();
    chip('tool', 'claude').click();
    chip('topic', 'skills').click();
    expect(visible()).toEqual(titles((e) => e.tools.includes('claude') && e.topics.includes('skills')));
  });

  it('turns a pressed pill off when it is tapped again', async () => {
    await boot();
    chip('tool', 'chatgpt').click();
    chip('tool', 'chatgpt').click();
    expect(visible()).toEqual(titles(() => true));
    expect(pressed('tool')).toEqual(['']);
    // All stays All.
    chip('tool', '').click();
    expect(pressed('tool')).toEqual(['']);
  });

  it('goes back to everything on All', async () => {
    await boot();
    chip('tool', 'chatgpt').click();
    chip('tool', '').click();
    expect(visible()).toEqual(titles(() => true));
    expect(pressed('tool')).toEqual(['']);
  });

  it('says how many are showing, in the singular for one', async () => {
    await boot();
    search('tiktok');
    expect(visible()).toEqual(['Reel Editor']);
    expect($('#library-count').textContent).toBe('Showing 1 resource');
  });
});

describe('the search', () => {
  it('finds something for each example its own placeholder offers', async () => {
    await boot();
    expect(LIBRARY.filters.searchPlaceholder).toBe('Try a task, like reels or meetings');
    search('reels');
    expect(visible()).toContain('Reel Editor');
    search('meetings');
    expect(visible()).toEqual(['Inbox and Meeting Follow-Through', 'Perfect Week', 'Task Sync Starter Kit']);
  });

  it('finds an entry by a keyword its card never shows', async () => {
    await boot();
    expect(items().find((el) => el.textContent?.includes('Reel Editor'))?.textContent).not.toMatch(/tiktok/i);
    search('tiktok');
    expect(visible()).toEqual(['Reel Editor']);
  });

  it('matches words in the title and the description, in any case', async () => {
    await boot();
    search('MEETINGS');
    expect(visible()).toEqual(['Inbox and Meeting Follow-Through', 'Perfect Week', 'Task Sync Starter Kit']);
  });

  it('matches a topic, though no card shows its name', async () => {
    await boot();
    search('team ops');
    expect(visible()).toEqual(titles((e) => e.topics.includes('team-ops')));
  });

  it('needs every word to match, in any order', async () => {
    await boot();
    search('instagram carousel');
    expect(visible()).toEqual(['AI 101 for Agents']);
    search('carousel reel');
    expect(visible()).toEqual([]);
  });

  it("reads iOS's curly apostrophe as the straight one the cards have", async () => {
    await boot();
    search('don\u2019t replace');
    expect(visible()).toEqual(["Retool, Don't Replace"]);
  });

  it("puts the keyboard away on the phone's Search key, and keeps the filter", async () => {
    await boot();
    const input = $<HTMLInputElement>('#library-search');
    input.focus();
    search('tiktok');
    input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
    expect(document.activeElement).not.toBe(input);
    expect(visible()).toEqual(['Reel Editor']);
  });

  it('treats what is typed as text, not a pattern', async () => {
    await boot();
    search('(.*');
    expect(visible()).toEqual([]);
  });

  it('combines with the pills', async () => {
    await boot();
    chip('tool', 'chatgpt').click();
    search('tiktok');
    expect(visible()).toEqual([]);
  });
});

describe('the Grok Bot shelf (D-100)', () => {
  const shelf = () => $('[data-shelf]');
  const collection = (c: string) => $(`[data-collection="${c}"]`);

  it('shows only the templates on the Grok Bot pill, and hides the main list’s cards', async () => {
    await boot();
    chip('tool', 'grok').click();
    expect(visible()).toEqual(titles((e) => e.tools.includes('grok')));
    expect(visible()).toHaveLength(16);
    expect(shelf().hidden).toBe(false);
    expect($('#library-count').textContent).toBe('Showing 16 resources');
  });

  it('hides a collection with nothing left in it, and the shelf when both are empty', async () => {
    await boot();
    chip('topic', 'bookkeeping').click();
    expect(collection('bookkeeping').hidden).toBe(false);
    expect(collection('transactions').hidden).toBe(true);
    chip('topic', 'skills').click();
    expect(shelf().hidden).toBe(true);
    chip('topic', '').click();
    expect(shelf().hidden).toBe(false);
    expect(collection('transactions').hidden).toBe(false);
  });

  it('keeps each card in its own list when it sorts', async () => {
    await boot();
    sortBy('oldest');
    const onShelf = Array.from(shelf().querySelectorAll('[data-item] .item-title')).map((t) => t.textContent);
    expect(onShelf).toHaveLength(16);
    expect($('#library-items').querySelector('[data-item] .item-title')?.textContent).not.toBe(onShelf[0]);
    sortBy('newest');
    expect(visible()).toEqual(titles(() => true));
  });
});

describe('nothing matching', () => {
  it('says so, offers Clear filters, and that resets everything, with no keyboard opened', async () => {
    await boot();
    chip('tool', 'chatgpt').click();
    chip('topic', 'skills').click();
    search('zzz');
    expect($('#library-count').textContent).toBe('Showing 0 resources');
    expect($('#library-empty').hidden).toBe(false);

    $('#library-clear').click();
    expect(visible()).toEqual(titles(() => true));
    expect($('#library-empty').hidden).toBe(true);
    expect($<HTMLInputElement>('#library-search').value).toBe('');
    expect(pressed('tool')).toEqual(['']);
    expect(pressed('topic')).toEqual(['']);
    expect(document.activeElement).toBe(chip('tool', ''));
  });
});

describe('the sort', () => {
  it('runs oldest first and back, and keeps the current filter', async () => {
    await boot();
    chip('topic', 'content').click();
    const newest = visible();
    // Oldest first by date; cards added the same day keep the markup's order either way, and a card
    // with no page yet stays last.
    const content = ENTRIES.filter((e) => e.topics.includes('content'));
    const oldest = [
      ...content.filter((e) => e.href !== null).sort((a, b) => a.added.localeCompare(b.added)),
      ...content.filter((e) => e.href === null),
    ].map((e) => e.title);
    expect(new Set(content.map((e) => e.added)).size).toBeLessThan(content.length);
    sortBy('oldest');
    expect(visible()).toEqual(oldest);
    sortBy('newest');
    expect(visible()).toEqual(newest);
  });

  it('moves the cards in the page, so a keyboard and a screen reader get the same order', async () => {
    await boot();
    sortBy('oldest');
    // Each list is sorted on its own: the main list, and each Grok Bot collection on the shelf (D-100). A
    // card newer than every template (D-109's) ends the main list, before the shelf's older cards.
    const lists = Array.from(document.querySelectorAll<HTMLElement>('[data-list]'));
    expect(lists.length).toBeGreaterThan(1);
    for (const list of lists) {
      const dates = Array.from(list.querySelectorAll<HTMLElement>('[data-item]'))
        .filter((el) => !el.classList.contains('item-soon'))
        .map((el) => el.getAttribute('data-added') ?? '');
      expect(dates).toEqual([...dates].sort());
    }
    expect(items().length).toBe(lists.reduce((n, l) => n + l.querySelectorAll('[data-item]').length, 0));
  });
});

describe('if it cannot run', () => {
  it('leaves the plain list and the hidden controls when the markup is not what it expects', async () => {
    await boot(() => $('#library-search').remove());
    expect($('.controls').hidden).toBe(true);
    expect($('.sorter').hidden).toBe(true);
    expect(visible()).toEqual(titles(() => true));
  });
});
