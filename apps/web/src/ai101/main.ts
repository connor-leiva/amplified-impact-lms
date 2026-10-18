// /ai101's only script, and /voice-profile's (D-040). DECISIONS.md D-028, D-032 and D-034.
//
// It turns the page into the design's step-through: one screen at a time, a progress header, a Back
// / Next footer, and the visitor's place remembered. It also fills the prompts from the fields as
// they are typed, copies (Copy & Open, the starter ideas), shows the toast, switches the Save screen
// between Claude and ChatGPT, swaps in the app-store links, opens the share sheet, and sends the
// waitlist form. On a page with a gate (/voice-profile), it keeps every screen past the gate out of
// reach until the visitor has opted in (`initSteps`), and sends the gate's form the way it sends the
// waitlist's (`initSignUp`).
//
// It is inlined into the page as one `<script type="module">` (vite-plugin.ts), so it is part of the
// first response and can never fail to load on its own. Everything it touches is already in the
// markup `render.ts` produced; with JavaScript off every screen shows in order, the links still open
// the apps, the prompts still select and the form still posts. This file only makes each of those
// better.
//
// WRITTEN FOR THE OLDEST BROWSER IN THE ROOM
// People open this from a QR code, which often means Instagram's or LinkedIn's in-app WebView, not
// a current Safari. So:
//   - `vite.ai101.config.ts` builds it for es2019 / Safari 13, and nothing here needs more than that.
//   - Each feature boots inside `guard()`, so one that throws cannot take the others down. The error
//     is rethrown on a timer, which still reports it without unwinding `boot()`.
//   - Every storage access is wrapped: reading `window.localStorage` itself throws in some WebViews
//     and with site data blocked, and `setItem` throws when storage is full or in old private modes.
//
// It imports `UI` and nothing else. `PAGE` is already in the HTML. Nothing else, on purpose: a module
// this script shared with another page's script would be split into a chunk of its own, which an
// inlined script cannot load (`ai101Inline` in vite-plugin.ts refuses to build one).

import { UI } from './content';

/**
 * `localStorage` key for the visitor's place and fields (the design's own key). A page that shares
 * this script names its own on <main data-state-key>, so its place never lands on /ai101's.
 */
const STATE_KEY = 'ai101-v2';
/**
 * Taps per "Copy & Open". 1: the tap copies AND opens. 2: the first tap copies and the button then
 * reads "Copied. Open ChatGPT"; the second opens. One tap is the goal, but it has not been proven on
 * every phone (the app can take focus before an async clipboard write lands), so two is a
 * one-character fallback here, or `data-copy-open-taps="2"` on <main>, which the tests use (D-032).
 */
const COPY_OPEN_TAPS: 1 | 2 = 1;
/** How long a two-tap button stays armed before it goes back to "Copy & Open". */
const ARMED_MS = 10000;
/**
 * The toast is emptied, then refilled after this beat. Replacing text with the same text in one
 * task is not a change to most screen readers, so a second copy of one prompt would be silent.
 */
const ANNOUNCE_DELAY_MS = 100;
/** The sign-in screen's rule (SignIn.tsx), which the API applies too. */
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
/** After a Next, Back or Start Over, how long the footer ignores another tap: a double tap's second. */
const NAV_GUARD_MS = 600;

/** Runs one feature's setup; a throw is reported, not propagated. */
function guard(setup: () => void): void {
  try {
    setup();
  } catch (err) {
    setTimeout(() => {
      throw err;
    }, 0);
  }
}

// --- State ----------------------------------------------------------------------------------------

const FIELD_NAMES = ['market', 'clients', 'niche', 'hoods', 'questions', 'brokerage', 'profile'] as const;
type FieldName = (typeof FIELD_NAMES)[number];

/**
 * What is remembered between visits: the screen, the app picked on Save, the way in picked on step 1
 * (D-043), and every field.
 */
export interface State extends Record<FieldName, string> {
  i: number;
  app: 'claude' | 'chatgpt';
  path: 'samples' | 'interview';
}

const EMPTY: State = {
  i: 0,
  app: 'claude',
  path: 'samples',
  market: '',
  clients: '',
  niche: '',
  hoods: '',
  questions: '',
  brokerage: '',
  profile: '',
};

function storage(): Storage | null {
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

/** The saved state. Anything unreadable (no storage, bad JSON, the wrong shape) reads as empty. */
function loadState(key: string): State {
  const out: State = { ...EMPTY };
  try {
    const raw = storage()?.getItem(key);
    const parsed: unknown = raw ? JSON.parse(raw) : null;
    if (!parsed || typeof parsed !== 'object') return out;
    const p = parsed as Record<string, unknown>;
    if (typeof p.i === 'number' && Number.isInteger(p.i) && p.i >= 0) out.i = p.i;
    if (p.app === 'chatgpt' || p.app === 'claude') out.app = p.app;
    if (p.path === 'samples' || p.path === 'interview') out.path = p.path;
    for (const key of FIELD_NAMES) if (typeof p[key] === 'string') out[key] = p[key] as string;
  } catch {
    // Read as empty.
  }
  return out;
}

function saveState(key: string, state: State): void {
  try {
    storage()?.setItem(key, JSON.stringify(state));
  } catch {
    // Full or blocked: everything still works for this visit.
  }
}

/** Whether this device has signed up through a page's gate before (D-040). */
function wasUnlocked(key: string): boolean {
  try {
    return storage()?.getItem(key) === '1';
  } catch {
    return false;
  }
}

function rememberUnlocked(key: string): void {
  try {
    storage()?.setItem(key, '1');
  } catch {
    // Full or blocked: the steps still open for this visit.
  }
}

// --- The toast ------------------------------------------------------------------------------------

/** The live region, drawn as the design's toast: shown while it has text, emptied after `toastMs`. */
function toaster(region: HTMLElement | null): (message: string) => void {
  let show: ReturnType<typeof setTimeout> | undefined;
  let hide: ReturnType<typeof setTimeout> | undefined;
  return (message) => {
    if (!region) return;
    region.textContent = '';
    clearTimeout(show);
    clearTimeout(hide);
    show = setTimeout(() => {
      region.textContent = message;
      hide = setTimeout(() => {
        region.textContent = '';
      }, UI.toastMs);
    }, ANNOUNCE_DELAY_MS);
  };
}

// --- Copy -----------------------------------------------------------------------------------------

/**
 * The fallback for browsers without a usable Clipboard API: older iOS Safari, in-app WebViews, and
 * any browser that rejects `writeText`. A readonly textarea, so iOS does not raise the keyboard;
 * selected both ways, because iOS ignores `select()` alone; removed in the same task; and focus
 * handed back to where it was, ring and all.
 */
function legacyCopy(text: string, button: HTMLElement): boolean {
  const doc = button.ownerDocument;
  const active = doc.activeElement;
  const prev = active instanceof HTMLElement && active !== doc.body ? active : null;
  const hadRing = prev !== null && showsFocusRing(prev);
  const buffer = doc.createElement('textarea');
  buffer.value = text;
  buffer.setAttribute('readonly', '');
  buffer.setAttribute('aria-hidden', 'true');
  buffer.tabIndex = -1;
  buffer.className = 'copy-buffer';
  doc.body.appendChild(buffer);
  let ok = false;
  try {
    buffer.focus({ preventScroll: true });
    buffer.select();
    buffer.setSelectionRange(0, text.length);
    ok = doc.execCommand('copy');
  } catch {
    ok = false;
  }
  doc.body.removeChild(buffer);
  if (prev) prev.focus({ preventScroll: true, focusVisible: hadRing } as FocusOptions);
  return ok;
}

/** `:focus-visible`, where the browser knows it (Safari 15.4+); otherwise "no ring". */
function showsFocusRing(el: HTMLElement): boolean {
  try {
    return el.matches(':focus-visible');
  } catch {
    return false;
  }
}

/** Copies `text`, resolving whether it worked; `writeText` first, synchronously inside the click. */
function copyText(text: string, button: HTMLElement): Promise<boolean> {
  const clipboard = navigator.clipboard as Clipboard | undefined;
  if (clipboard && typeof clipboard.writeText === 'function' && window.isSecureContext) {
    try {
      return clipboard.writeText(text).then(
        () => true,
        () => legacyCopy(text, button),
      );
    } catch {
      // A WebView whose `writeText` throws instead of rejecting: the same answer, sooner.
    }
  }
  return Promise.resolve(legacyCopy(text, button));
}

/**
 * Copies `text` before the page can lose focus, for a link that is about to open an app. Both paths
 * start inside the click: the legacy one FINISHES before this returns, so the clipboard is written
 * before the browser follows the link even where `writeText` would still be pending when the app
 * takes over (D-032).
 */
function copyBeforeLeaving(text: string, el: HTMLElement): { done: boolean; pending: Promise<boolean> | null } {
  const done = legacyCopy(text, el);
  const clipboard = navigator.clipboard as Clipboard | undefined;
  let pending: Promise<boolean> | null = null;
  if (clipboard && typeof clipboard.writeText === 'function' && window.isSecureContext) {
    try {
      pending = clipboard.writeText(text).then(
        () => true,
        () => false,
      );
    } catch {
      // Only the legacy path's answer counts.
    }
  }
  return { done, pending };
}

/** When nothing could write to the clipboard, select the text so the device's own Copy works. */
function selectContents(node: Node): void {
  const selection = window.getSelection();
  if (!selection) return;
  const range = node.ownerDocument?.createRange();
  if (!range) return;
  range.selectNodeContents(node);
  selection.removeAllRanges();
  selection.addRange(range);
}

/** The prompt text a "Copy & Open" copies: its block's <pre>, as filled in right now. */
function promptPre(doc: Document, blockId: string): HTMLElement | null {
  return doc.getElementById(blockId)?.querySelector<HTMLElement>('pre[data-prompt-text]') ?? null;
}

function initCopyOpen(doc: Document, toast: (message: string) => void): void {
  const main = doc.querySelector('main');
  const taps = main?.getAttribute('data-copy-open-taps') === '2' ? 2 : COPY_OPEN_TAPS;
  for (const link of Array.from(doc.querySelectorAll<HTMLAnchorElement>('a[data-copy-open]'))) {
    const blockId = link.getAttribute('data-copy-open') ?? '';
    const labelEl = link.querySelector('[data-copy-label]');
    if (!labelEl || promptPre(doc, blockId) === null) continue;
    const original = labelEl.textContent ?? '';
    const app = link.getAttribute('data-app') ?? '';
    const copied = link.getAttribute('data-toast') ?? '';
    let armed = false;
    let disarm: ReturnType<typeof setTimeout> | undefined;
    const reset = () => {
      armed = false;
      clearTimeout(disarm);
      link.removeAttribute('data-armed');
      labelEl.textContent = original;
    };
    /** From here until ARMED_MS passes, the next tap is the plain link: it opens the app. */
    const arm = () => {
      armed = true;
      link.setAttribute('data-armed', '');
      clearTimeout(disarm);
      disarm = setTimeout(reset, ARMED_MS);
    };
    /** Nothing could copy: open "See the full prompt", select it, and say so. */
    const failed = () => {
      const pre = promptPre(doc, blockId);
      const details = pre?.closest('details');
      if (details) details.open = true;
      if (pre) selectContents(pre);
      toast(UI.copyFailed);
    };

    link.addEventListener('click', (event) => {
      // An armed link is just the link: the two-tap mode's second tap, and also the tap after a copy
      // that could not be made. A failed copy must never leave the visitor without the app.
      if (armed) {
        reset();
        return;
      }
      const text = promptPre(doc, blockId)?.textContent ?? '';
      if (taps === 1) {
        const { done, pending } = copyBeforeLeaving(text, link);
        if (done) {
          toast(copied);
          return; // and the link opens
        }
        if (pending) {
          // Only "Copied" once it is true. The link opens either way.
          void pending.then((ok) => {
            if (ok) toast(copied);
          });
          return;
        }
        // Nothing on this device can write the clipboard. Stay, select the prompt so it can be copied
        // by hand, and let the next tap open the app.
        event.preventDefault();
        failed();
        arm();
        return;
      }
      event.preventDefault();
      arm();
      void copyText(text, link).then((ok) => {
        if (!armed) return; // already opened, or timed out
        if (!ok) {
          failed();
          return;
        }
        labelEl.textContent = UI.copiedThenOpen(app);
        toast(copied);
      });
    });
  }
}

/** The starter ideas: each one copies its own words. */
function initChips(doc: Document, toast: (message: string) => void): void {
  for (const chip of Array.from(doc.querySelectorAll<HTMLButtonElement>('button[data-copy-chip]'))) {
    const labelEl = chip.querySelector('[data-copy-label]');
    if (!labelEl) continue;
    const words = labelEl.textContent ?? '';
    const copied = chip.getAttribute('data-toast') ?? '';
    chip.addEventListener('click', () => {
      void copyText(words, chip).then((ok) => {
        if (!ok) {
          selectContents(labelEl);
          toast(UI.chipCopyFailed);
          return;
        }
        toast(copied);
      });
    });
  }
}

// --- Filling the prompts ----------------------------------------------------------------------------

/** One piece of a filled prompt: text, or a placeholder drawn as a <mark>. */
export interface Piece {
  text: string;
  mark: boolean;
}

/** Splits template text into plain runs and its `[bracketed placeholders]`. */
function bracketed(text: string): Piece[] {
  const pieces: Piece[] = [];
  const re = /\[[^\]\n]*\]/g;
  let at = 0;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text))) {
    if (m.index > at) pieces.push({ text: text.slice(at, m.index), mark: false });
    pieces.push({ text: m[0], mark: true });
    at = m.index + m[0].length;
  }
  if (at < text.length) pieces.push({ text: text.slice(at), mark: false });
  return pieces;
}

/**
 * A prompt with its placeholders filled from `values` (D-034). Each placeholder named in `slots`
 * becomes its field's value, trimmed, or stays a placeholder while the field is empty; placeholders
 * not in `slots` ("[paste 10 to 15 samples]") always stay. Questions, one per line, become a list
 * under their label. A line named in `lineSlots` ("My clients are mostly:") gets its field's value
 * after it (D-036). What a visitor TYPES is never a placeholder. Exported for the tests.
 */
export function fillPrompt(
  template: string,
  slots: Record<string, FieldName>,
  values: Partial<Record<FieldName, string>>,
  lineSlots: Record<string, FieldName> = {},
): Piece[] {
  return fillPieces(bracketed(template), slots, values, lineSlots);
}

/** `fillPrompt` over pieces already split, as the page's <pre> holds them. */
function fillPieces(
  pieces: Piece[],
  slots: Record<string, FieldName>,
  values: Partial<Record<FieldName, string>>,
  lineSlots: Record<string, FieldName>,
): Piece[] {
  const out: Piece[] = [];
  for (const piece of pieces) {
    const field = piece.mark ? slots[piece.text] : undefined;
    if (!field) {
      out.push(piece.mark ? { ...piece } : { text: fillLines(piece.text, lineSlots, values), mark: false });
      continue;
    }
    const raw = values[field] ?? '';
    let value = raw.trim();
    if (field === 'questions') {
      const lines = raw
        .split(/\r?\n/)
        .map((q) => q.trim())
        .filter(Boolean);
      if (lines.length) {
        value = UI.questionItem + lines.join(UI.questionItem);
        // "most: " then a new line would leave a trailing space on the label's line.
        const prev = out[out.length - 1];
        if (prev && !prev.mark && prev.text.endsWith(' ')) prev.text = prev.text.slice(0, -1);
      }
    }
    out.push(value ? { text: value, mark: false } : piece);
  }
  return out;
}

/** Each whole line named in `lineSlots`, followed by its field's trimmed value when there is one. */
function fillLines(
  text: string,
  lineSlots: Record<string, FieldName>,
  values: Partial<Record<FieldName, string>>,
): string {
  if (Object.keys(lineSlots).length === 0) return text;
  return text
    .split('\n')
    .map((line) => {
      const field = lineSlots[line];
      const value = field ? (values[field] ?? '').trim() : '';
      return value ? `${line} ${value}` : line;
    })
    .join('\n');
}

/** Writes pieces into the <pre> through text nodes and <mark>s, never through innerHTML. */
function paint(pre: Element, pieces: Piece[]): void {
  const doc = pre.ownerDocument;
  while (pre.firstChild) pre.removeChild(pre.firstChild);
  for (const piece of pieces) {
    if (!piece.mark) {
      pre.appendChild(doc.createTextNode(piece.text));
      continue;
    }
    const mark = doc.createElement('mark');
    mark.className = 'placeholder';
    mark.textContent = piece.text;
    pre.appendChild(mark);
  }
}

function initFill(doc: Document, state: State, save: () => void): void {
  // Every prompt with slots, painted from its template AS RENDERED: its text nodes and <mark>s, so
  // what render.ts drew as a placeholder (and only that) is one here too.
  const prompts: Array<{
    pre: Element;
    pieces: Piece[];
    slots: Record<string, FieldName>;
    lineSlots: Record<string, FieldName>;
  }> = [];
  for (const block of Array.from(doc.querySelectorAll('[data-prompt]'))) {
    const id = block.getAttribute('data-prompt') ?? '';
    const slots = UI.slots[id];
    const lineSlots = UI.lineSlots[id] ?? {};
    const pre = block.querySelector('pre[data-prompt-text]');
    if (!slots || !pre) continue;
    const pieces = Array.from(pre.childNodes).map((node) => ({
      text: node.textContent ?? '',
      mark: node.nodeName === 'MARK',
    }));
    prompts.push({ pre, pieces, slots, lineSlots });
  }
  const repaint = () => {
    for (const p of prompts) paint(p.pre, fillPieces(p.pieces, p.slots, state, p.lineSlots));
  };
  for (const el of Array.from(doc.querySelectorAll<HTMLInputElement | HTMLTextAreaElement>('[data-field]'))) {
    const name = el.getAttribute('data-field') as FieldName;
    if (FIELD_NAMES.indexOf(name) === -1) continue;
    el.value = state[name];
    el.addEventListener('input', () => {
      state[name] = el.value;
      save();
      repaint();
    });
  }
  repaint();
}

// --- Save it: Claude or ChatGPT ------------------------------------------------------------------------

/**
 * A two-way switch over panels, remembered: Save's Claude / ChatGPT (`data-pick`, `state.app`), and
 * step 1's samples or interview (`data-path`, `state.path`, D-043), which also picks step 2's prompt,
 * since that screen's panels carry the same `data-path-panel`. Buttons are `button[<attr>]`, panels
 * `[<attr>-panel]`; a value it does not know reads as the first.
 */
function initChoice<K extends 'app' | 'path'>(
  doc: Document,
  state: State,
  save: () => void,
  key: K,
  attr: string,
  values: readonly State[K][],
): void {
  const buttons = Array.from(doc.querySelectorAll<HTMLButtonElement>(`button[${attr}]`));
  const panels = Array.from(doc.querySelectorAll<HTMLElement>(`[${attr}-panel]`));
  if (buttons.length === 0 || panels.length === 0) return;
  const apply = () => {
    for (const b of buttons) b.setAttribute('aria-pressed', String(b.getAttribute(attr) === state[key]));
    for (const p of panels) p.hidden = p.getAttribute(`${attr}-panel`) !== state[key];
  };
  for (const b of buttons) {
    b.addEventListener('click', () => {
      const picked = b.getAttribute(attr) as State[K];
      state[key] = values.indexOf(picked) >= 0 ? picked : values[0]!;
      save();
      apply();
    });
  }
  apply();
}

// --- The step-through -----------------------------------------------------------------------------

/** The id a `#…` names, or '' for none, or for one that is not valid percent-encoding ("#100%"). */
function idOf(hash: string): string {
  try {
    return decodeURIComponent(hash.replace(/^#/, ''));
  } catch {
    return '';
  }
}

/** Removes `#…` from the address without a history entry, so a refresh resumes where the visitor is. */
function clearHash(): void {
  try {
    if (window.location.hash) window.history.replaceState(null, '', window.location.pathname + window.location.search);
  } catch {
    // Some WebViews refuse; the hash simply stays.
  }
}

function initSteps(doc: Document, state: State, save: () => void): void {
  const screens = Array.from(doc.querySelectorAll<HTMLElement>('section[data-screen]'));
  const stage = doc.querySelector('[data-stage-label]');
  const count = doc.querySelector('[data-count-label]');
  const bar = doc.querySelector<HTMLElement>('[data-bar]');
  const back = doc.querySelector<HTMLButtonElement>('button[data-back]');
  const next = doc.querySelector<HTMLButtonElement>('button[data-next]');
  const nextLabel = doc.querySelector('[data-next-label]');
  const restart = doc.querySelector<HTMLButtonElement>('button[data-restart]');
  if (screens.length === 0 || !stage || !count || !bar || !back || !next || !nextLabel || !restart) return;
  const last = screens.length - 1;
  let current = -1;

  // THE GATE (D-040). A screen marked `data-gate` holds an opt-in; until this device has signed up,
  // no screen after it can be shown (not by Next, a link, a saved place, or the address), and its own
  // Next is hidden, so the form's button is the way on. /ai101 has none, and none of this applies.
  const gate = doc.querySelector<HTMLElement>('section[data-screen][data-gate]');
  const gateAt = gate ? screens.indexOf(gate) : -1;
  const unlockKey = gate?.getAttribute('data-unlock-key') ?? '';
  let locked = gateAt >= 0 && !wasUnlocked(unlockKey);
  if (gate && !locked) gate.setAttribute('data-state', 'unlocked');

  /** Which screen holds the element with this id, or -1. */
  const screenOf = (id: string): number => {
    if (!id) return -1;
    const el = doc.getElementById(id);
    const section = el?.closest('section[data-screen]');
    return section ? screens.indexOf(section as HTMLElement) : -1;
  };

  /**
   * Shows screen `i`. `focus` moves focus to its heading (after Next, Back, or a link): a screen
   * reader then reads the new screen's name, and a keyboard user starts from its top. `target` is an
   * element inside it to scroll to, for a link to one part of a screen.
   */
  const show = (i: number, focus: boolean, target: HTMLElement | null = null) => {
    const wanted = Math.max(0, Math.min(last, i));
    current = locked ? Math.min(wanted, gateAt) : wanted;
    // Held at the gate: whatever was linked to is on a screen that is not showing.
    if (current !== wanted) target = null;
    screens.forEach((s, k) => {
      if (k === current) s.setAttribute('data-current', '');
      else s.removeAttribute('data-current');
    });
    const s = screens[current]!;
    stage.textContent = s.getAttribute('data-stage') ?? '';
    count.textContent = s.getAttribute('data-count') ?? '';
    bar.style.width = `${Math.round((current / last) * 100)}%`;
    back.hidden = current === 0;
    next.hidden = current === last || (locked && current === gateAt);
    restart.hidden = current !== last;
    nextLabel.textContent = s.getAttribute('data-next') ?? '';
    state.i = current;
    save();
    if (target && target !== s) target.scrollIntoView();
    else window.scrollTo(0, 0);
    if (focus) s.querySelector<HTMLElement>('h1, h2')?.focus({ preventScroll: true });
  };

  // Where to start: a link to a part of the page wins (a QR code, an email, the waitlist's own
  // redirect), then the visitor's saved place, then the start. Worked out, shown and wired BEFORE the
  // page becomes one screen at a time: anything that fails before that leaves the whole page showing.
  const hash = idOf(window.location.hash);
  const fromHash = screenOf(hash);
  if (fromHash >= 0) show(fromHash, false, doc.getElementById(hash));
  else show(state.i <= last ? state.i : 0, false);

  // One move per tap. A double tap (Chrome on Android does not zoom on one here, so it delivers both
  // clicks) would otherwise skip a screen, and on "Your Week" its second click lands on Start Over,
  // which takes Next's place in the footer, and sends the visitor back to Welcome past the waitlist.
  let lastMove = 0;
  const tooSoon = () => {
    const now = Date.now();
    if (now - lastMove < NAV_GUARD_MS) return true;
    lastMove = now;
    return false;
  };
  next.addEventListener('click', () => {
    if (tooSoon()) return;
    clearHash();
    show(current + 1, true);
  });
  back.addEventListener('click', () => {
    if (tooSoon()) return;
    clearHash();
    show(current - 1, true);
  });
  restart.addEventListener('click', () => {
    if (tooSoon()) return;
    clearHash();
    show(0, true);
  });

  // A link to another part of the page ("Skip to Step 2") goes to that screen. Handled on click,
  // because a link to the hash already in the address fires no `hashchange`.
  doc.addEventListener('click', (event) => {
    const a = (event.target as Element | null)?.closest?.('a[href^="#"]');
    if (!a) return;
    const id = idOf(a.getAttribute('href') ?? '');
    const i = screenOf(id);
    if (i < 0) return;
    event.preventDefault();
    clearHash();
    show(i, true, doc.getElementById(id));
  });
  window.addEventListener('hashchange', () => {
    const id = idOf(window.location.hash);
    const i = screenOf(id);
    if (i >= 0) show(i, true, doc.getElementById(id));
  });

  // The gate's form. Once the API has stored the sign-up: remembered on this device, the gate
  // shows "You're in", and the next screen opens. If it cannot be wired, it posts natively and the
  // API's 303 lands on the gated steps, which the CSS shows with `:target`.
  if (gate) {
    initSignUp(doc, 'gate-form', 'guide-error', () => {
      rememberUnlocked(unlockKey);
      locked = false;
      gate.setAttribute('data-state', 'unlocked');
      show(gateAt + 1, true);
    });
  }

  // Only now, with a screen current and every button wired: one screen at a time, and the header
  // and footer. Shown any earlier, a failure above would leave buttons that do nothing.
  doc.documentElement.classList.add('steps-on');
  for (const el of Array.from(doc.querySelectorAll<HTMLElement>('[data-steps-chrome]'))) el.hidden = false;
}

// --- Get the app, and Send This to My Laptop ----------------------------------------------------------

/** iPhone, iPad or Android, from the user agent. iPadOS can report a Mac, so a Mac with touch is an iPad. */
function platform(): 'ios' | 'android' | null {
  const ua = navigator.userAgent || '';
  if (/Android/i.test(ua)) return 'android';
  if (/iPhone|iPad|iPod/.test(ua)) return 'ios';
  if (/Macintosh/.test(ua) && (navigator.maxTouchPoints || 0) > 1) return 'ios';
  return null;
}

function initGetApp(doc: Document): void {
  const os = platform();
  if (!os) return;
  for (const link of Array.from(doc.querySelectorAll<HTMLAnchorElement>('a[data-get-app]'))) {
    const store = link.getAttribute(`data-${os}`);
    if (store) link.setAttribute('href', store);
  }
}

function initShare(doc: Document): void {
  const link = doc.querySelector<HTMLAnchorElement>('a[data-share]');
  if (!link) return;
  link.addEventListener('click', (event) => {
    if (typeof navigator.share !== 'function') return; // the mailto: link, as written
    event.preventDefault();
    const toMail = () => {
      window.location.href = link.href;
    };
    try {
      navigator.share({ title: UI.share.title, url: UI.share.url }).then(
        () => undefined,
        (err: unknown) => {
          // Closing the share sheet is not a failure.
          if (err && typeof err === 'object' && (err as { name?: unknown }).name === 'AbortError') return;
          toMail();
        },
      );
    } catch {
      toMail();
    }
  });
}

/** Elements that only make sense once this script is running carry `hidden data-js-only`. */
function revealScripted(doc: Document): void {
  for (const el of Array.from(doc.querySelectorAll<HTMLElement>('[data-js-only]'))) el.hidden = false;
}

// --- Waitlist -----------------------------------------------------------------------------------------

const WL_FIELDS = ['firstName', 'email', 'phone', 'brokerage'] as const;
type WlField = (typeof WL_FIELDS)[number];

/**
 * A US or international mobile number as E.164 ("+18605551234"), or null when it is not one. Ten
 * digits are a US number; anything else needs its country code. The API applies the same rule.
 * Exported for the tests.
 */
export function normalizePhone(input: string): string | null {
  const trimmed = input.trim();
  const digits = trimmed.replace(/\D/g, '');
  if (trimmed.startsWith('+')) return digits.length >= 8 && digits.length <= 15 ? `+${digits}` : null;
  if (digits.length === 10) return `+1${digits}`;
  if (digits.length === 11 && digits[0] === '1') return `+${digits}`;
  return null;
}

/** The API's rules, client-side, with the same messages. */
function validate(values: Record<WlField, string>, sms: boolean): Partial<Record<WlField, string>> {
  const errors: Partial<Record<WlField, string>> = {};
  if (values.firstName.length < 1 || values.firstName.length > 80) errors.firstName = UI.errors.firstName;
  if (values.email.length > 254 || !EMAIL.test(values.email)) errors.email = UI.errors.email;
  if (values.phone !== '' && normalizePhone(values.phone) === null) errors.phone = UI.errors.phone;
  else if (sms && values.phone === '') errors.phone = UI.errors.phoneForTexts;
  return errors;
}

/** `?src=qr` from the URL the visitor arrived on, for attribution. Never an error. */
function readSrc(): string | null {
  try {
    return new URLSearchParams(window.location.search).get('src');
  } catch {
    return null;
  }
}

/** A 400's `{ error, field }`, when it names one of this form's fields. */
function fieldError(body: unknown): { field: WlField; message: string } | null {
  if (!body || typeof body !== 'object') return null;
  const { field, error } = body as { field?: unknown; error?: unknown };
  const match = WL_FIELDS.filter((name) => name === field)[0];
  if (!match) return null;
  const fallback = match === 'brokerage' ? UI.errors.generic : UI.errors[match];
  return { field: match, message: typeof error === 'string' && error ? error : fallback };
}

function initWaitlist(doc: Document): void {
  const section = doc.getElementById('waitlist');
  const joined = doc.getElementById('waitlist-joined');
  if (!section || !joined) return;
  initSignUp(doc, 'waitlist-form', 'waitlist-error', () => {
    section.setAttribute('data-state', 'joined');
    joined.focus();
  });
}

/**
 * Sends a sign-up form: the waitlist, or a gate's opt-in (D-040), whose form has only the name and
 * email fields (the others read as empty, and its route ignores a phone or SMS answer anyway).
 * `onJoined` runs once the API has stored the sign-up.
 */
function initSignUp(doc: Document, formId: string, errorId: string, onJoined: () => void): void {
  const form = doc.getElementById(formId) as HTMLFormElement | null;
  const formError = doc.getElementById(errorId);
  const submit = form?.querySelector('button[type="submit"]');
  // Without any one of these, or without `fetch`, leave the form alone: it still posts natively, and
  // the API's 303 brings the visitor back to the right line of this page.
  if (!form || !formError || !submit || typeof fetch !== 'function') return;

  const input = (name: string): HTMLInputElement | null => {
    const el = form.elements.namedItem(name);
    return el instanceof HTMLInputElement ? el : null;
  };
  const value = (name: string) => input(name)?.value ?? '';

  // The page validates now, with the API's messages, so the browser's own bubbles stand down.
  form.noValidate = true;

  const setFieldError = (name: WlField, message: string) => {
    const el = input(name);
    const line = doc.getElementById(`${name}-error`);
    if (!el || !line) return;
    line.textContent = message;
    if (message) {
      el.setAttribute('aria-invalid', 'true');
      el.setAttribute('aria-describedby', `${name}-error`);
    } else {
      el.removeAttribute('aria-invalid');
      el.removeAttribute('aria-describedby');
    }
  };

  // `role="alert"` announces a change of content, not of visibility, so the text is emptied and put
  // back a beat later.
  const showFormError = () => {
    formError.setAttribute('data-shown', '');
    formError.textContent = '';
    setTimeout(() => {
      formError.textContent = UI.errors.generic;
    }, ANNOUNCE_DELAY_MS);
  };
  const hideFormError = () => formError.removeAttribute('data-shown');

  // An error clears as soon as its field is edited; the next submit re-checks everything. Ticking or
  // unticking the SMS box re-opens the phone question.
  for (const name of WL_FIELDS) input(name)?.addEventListener('input', () => setFieldError(name, ''));
  input('smsConsent')?.addEventListener('change', () => setFieldError('phone', ''));

  let busy = false;

  form.addEventListener('submit', (event) => {
    event.preventDefault();
    if (busy) return;
    hideFormError();

    const values = {
      firstName: value('firstName').trim(),
      email: value('email').trim(),
      phone: value('phone').trim(),
      brokerage: value('brokerage').trim(),
    };
    const sms = input('smsConsent')?.checked === true;
    const errors = validate(values, sms);
    for (const name of WL_FIELDS) setFieldError(name, errors[name] ?? '');
    const firstInvalid = WL_FIELDS.filter((name) => errors[name])[0];
    if (firstInvalid) {
      input(firstInvalid)?.focus();
      return;
    }

    busy = true;
    submit.setAttribute('aria-disabled', 'true');
    const done = () => {
      busy = false;
      submit.removeAttribute('aria-disabled');
    };
    const failed = () => showFormError();

    const src = readSrc();
    fetch(form.getAttribute('action') ?? '/api/ai101/waitlist', {
      method: 'POST',
      credentials: 'same-origin',
      headers: { 'content-type': 'application/json', accept: 'application/json' },
      body: JSON.stringify({
        ...values,
        // Omitted rather than empty when there is none: the API decides what an empty one means.
        phone: values.phone === '' ? undefined : values.phone,
        smsConsent: sms,
        // The honeypot goes up as typed: the API, not the page, decides what a filled one means.
        website: value('website'),
        src: src === null ? undefined : src,
      }),
    })
      .then((res) => {
        if (res.ok) {
          onJoined();
          return;
        }
        if (res.status !== 400) return failed();
        return res.json().then((body: unknown) => {
          const named = fieldError(body);
          if (!named) return failed();
          setFieldError(named.field, named.message);
          input(named.field)?.focus();
        }, failed);
      }, failed)
      .then(done, done);
  });
}

// --- Boot -----------------------------------------------------------------------------------------

function boot(doc: Document): void {
  const toast = toaster(doc.getElementById('ai101-live'));
  const key = doc.querySelector('main')?.getAttribute('data-state-key') || STATE_KEY;
  const state = loadState(key);
  const save = () => saveState(key, state);
  // The fields first: they fill the <pre>s that Copy & Open reads on click.
  guard(() => initFill(doc, state, save));
  guard(() => initCopyOpen(doc, toast));
  guard(() => initChips(doc, toast));
  guard(() => initChoice(doc, state, save, 'app', 'data-pick', ['claude', 'chatgpt']));
  guard(() => initChoice(doc, state, save, 'path', 'data-path', ['samples', 'interview']));
  guard(() => initGetApp(doc));
  guard(() => initShare(doc));
  guard(() => revealScripted(doc));
  guard(() => initWaitlist(doc));
  // Last: it hides every screen but one, so everything above has already found what it needs.
  guard(() => initSteps(doc, state, save));
}

// A module script runs once the document is parsed, so every element above is already there.
boot(document);
