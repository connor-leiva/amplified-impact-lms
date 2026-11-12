// /library's only script. DECISIONS.md D-050.
//
// It turns the list the markup already holds into a filterable one: the tool, topic, track and who
// pills (Track and Who are Spring's, D-115), the search and the sort. With JavaScript off, or if this throws, every card still shows, newest first,
// and every link works, because the controls stay `hidden` until the last line of `boot`.
//
// Inlined into the page as one `<script type="module">` (`ai101Inline`), so it shares no module with
// another page's script: a shared module would be split into a chunk an inlined script cannot load.
// The v2 kit's script (the header, the theme switch, what moves as you scroll) comes in as its own
// copy, `?copy`: the same file, a separate module to the bundler, so the kit pages' shared file
// (`/assets/main-[hash].js`) and this page's inline script never share a chunk.
// Built for es2019 / Safari 13, as /ai101's is, for the in-app browsers a shared link opens in.

import '../kit/client/main.ts?copy';

/** The script's copy of `LIBRARY.count`, which `render.test.ts` holds equal. */
export const countLabel = (n: number): string => `Showing ${n} ${n === 1 ? 'resource' : 'resources'}`;

const wordsOf = (el: Element, attr: string) => (el.getAttribute(attr) ?? '').split(' ').filter(Boolean);

/** Each pill row by its `data-filter` name, and the card attribute it matches (D-050, D-115). */
export const FILTER_ATTRS: Readonly<Record<string, string>> = { tool: 'data-tools', topic: 'data-topics', track: 'data-track', who: 'data-who' };

function boot(doc: Document): void {
  const list = doc.getElementById('library-items');
  const count = doc.getElementById('library-count');
  const empty = doc.getElementById('library-empty');
  const clear = doc.getElementById('library-clear');
  const search = doc.getElementById('library-search') as HTMLInputElement | null;
  const sort = doc.getElementById('library-sort') as HTMLSelectElement | null;
  if (!list || !count || !empty || !clear || !search || !sort) return;

  // Each card with what is matched against, read once, from the main list and the Grok Bot shelf's
  // collections (D-100). `home` is its own list, which it is sorted back into. `order` keeps cards
  // added the same day in the markup's order, whichever way the sort runs. `soon` has no page yet,
  // and sorts last either way.
  const lists = Array.from(doc.querySelectorAll<HTMLElement>('[data-list]'));
  if (lists.indexOf(list) < 0) lists.unshift(list);
  const cards = lists
    .flatMap((home) => Array.from(home.querySelectorAll<HTMLElement>('[data-item]')).map((el) => ({ el, home })))
    .map(({ el, home }, order) => ({
      el,
      home,
      order,
      added: el.getAttribute('data-added') ?? '',
      soon: el.classList.contains('item-soon'),
      values: Object.fromEntries(Object.entries(FILTER_ATTRS).map(([name, attr]) => [name, wordsOf(el, attr)])) as Record<string, string[]>,
      text: `${el.textContent ?? ''} ${el.getAttribute('data-words') ?? ''}`.toLowerCase(),
    }));
  const collections = Array.from(doc.querySelectorAll<HTMLElement>('[data-collection]'));
  const shelf = doc.querySelector<HTMLElement>('[data-shelf]');
  const chips = Array.from(doc.querySelectorAll<HTMLButtonElement>('button[data-filter]'));
  const picked: Record<string, string> = Object.fromEntries(Object.keys(FILTER_ATTRS).map((name) => [name, '']));

  const apply = () => {
    // iOS types a curly apostrophe; the cards have straight ones.
    const terms = search.value
      .toLowerCase()
      .replace(/[\u2018\u2019]/g, "'")
      .split(/\s+/)
      .filter(Boolean);
    let showing = 0;
    for (const c of cards) {
      const show =
        Object.keys(picked).every((name) => picked[name] === '' || (c.values[name] ?? []).indexOf(picked[name]!) >= 0) &&
        terms.every((t) => c.text.indexOf(t) >= 0);
      c.el.hidden = !show;
      if (show) showing += 1;
    }
    for (const chip of chips) {
      const name = chip.getAttribute('data-filter') ?? '';
      chip.setAttribute('aria-pressed', String(picked[name] === chip.getAttribute('data-value')));
    }
    // A collection with no card left showing goes, and the shelf with it when both have.
    for (const c of collections) c.hidden = !Array.from(c.querySelectorAll<HTMLElement>('[data-item]')).some((el) => !el.hidden);
    if (shelf) shelf.hidden = collections.length > 0 && collections.every((c) => c.hidden);
    const label = countLabel(showing);
    if (count.textContent !== label) count.textContent = label;
    empty.hidden = showing > 0;
  };

  const applySort = () => {
    const dir = sort.value === 'oldest' ? 1 : -1;
    const sorted = [...cards].sort(
      (a, b) => Number(a.soon) - Number(b.soon) || dir * a.added.localeCompare(b.added) || a.order - b.order,
    );
    for (const c of sorted) c.home.appendChild(c.el);
  };

  for (const chip of chips) {
    chip.addEventListener('click', () => {
      // A pressed pill is announced as a toggle, so tapping it again turns it off. "All" is already ''.
      const name = chip.getAttribute('data-filter') ?? '';
      const value = chip.getAttribute('data-value') ?? '';
      picked[name] = picked[name] === value ? '' : value;
      apply();
    });
  }
  search.addEventListener('input', apply);
  // The list has already filtered as they typed. The phone's Search key puts the keyboard away, so they
  // can see it.
  search.addEventListener('keydown', (event) => {
    if (event.key === 'Enter') search.blur();
  });
  sort.addEventListener('change', applySort);
  clear.addEventListener('click', () => {
    for (const name of Object.keys(picked)) picked[name] = '';
    search.value = '';
    apply();
    // A button, not the search: focusing a field from a tap opens a phone's keyboard over the list.
    // The Clear button has just been hidden, so focus has to go somewhere.
    if (chips[0]) chips[0].focus();
  });

  // A browser that restored the form on Back keeps what it restored in step with the list.
  applySort();
  apply();

  // Only now, with everything wired: a failure above leaves the plain list and no dead controls.
  for (const el of Array.from(doc.querySelectorAll<HTMLElement>('[data-js-only]'))) el.hidden = false;
}

boot(document);
