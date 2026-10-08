// /ai101's only script: the copy buttons and "Copy & open" links, the starter chips, "About you",
// the checklist's memory, the app-store links, "Send this to my laptop", and the waitlist form.
// DECISIONS.md D-028 and D-032.
//
// It is inlined into the page as one `<script type="module">` (vite-plugin.ts), so it is part of the
// first response and can never fail to load on its own. Everything it touches is already in the
// markup `render.ts` produced; with JavaScript off the page still reads, the prompts still select,
// the checkboxes still tick and the form still posts — this file only makes each of those better.
//
// WRITTEN FOR THE OLDEST BROWSER IN THE ROOM
// People open this from a QR code, which often means Instagram's or LinkedIn's in-app WebView, not
// a current Safari. So:
//   - `vite.ai101.config.ts` builds it for es2019 / Safari 13, and nothing here needs more than that
//     (no `Element.toggleAttribute`, `Promise.prototype.finally`, `Object.fromEntries` and friends).
//   - Each feature boots inside `guard()`, so one that throws cannot take the other two down, and
//     nothing throws at load. The error is rethrown on a timer, which still reports it to the
//     console without unwinding `boot()`.
//   - Every storage access is wrapped: reading `window.localStorage` itself throws in some WebViews
//     and with site data blocked, and `setItem` throws when storage is full or in old private modes.
//
// It imports `UI` and nothing else. `PAGE` — every prompt and paragraph — is already in the HTML,
// and rolldown drops it from this bundle because nothing here reads it.

import { UI } from './content';

/** `localStorage` key for the checklist: a JSON array of the `data-check-id`s that are ticked. */
const CHECKLIST_KEY = 'ai101-checklist';
/** `localStorage` key for "About you": a JSON object of the five fields, as typed. */
const ABOUT_KEY = 'ai101-about-you';
/**
 * Taps per "Copy & open" link. 1: the tap copies AND opens. 2: the first tap copies and the link then
 * reads "Copied. Open ChatGPT"; the second opens. One tap is the brief's goal, but it has not been
 * proven on every phone (the app can take focus before an async clipboard write lands), so two is a
 * one-character fallback here — or `data-copy-open-taps="2"` on <main>, which the tests use.
 */
const COPY_OPEN_TAPS: 1 | 2 = 1;
/** How long a two-tap link stays armed before it goes back to "Copy & open". */
const ARMED_MS = 10000;
/** How long a button says "Copied" (the spec's "for 2 seconds"). */
const COPIED_MS = 2000;
/**
 * The live region is emptied, then refilled after this beat. Replacing text with the same text in
 * one task is not a change to most screen readers, so a second copy of one prompt would be silent.
 */
const ANNOUNCE_DELAY_MS = 100;
/** The sign-in screen's rule (SignIn.tsx), which the API applies too. */
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

const FIELDS = ['firstName', 'email', 'brokerage'] as const;
type Field = (typeof FIELDS)[number];
type Values = Record<Field, string>;

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

// --- Live region --------------------------------------------------------------------------------

function announcer(region: HTMLElement | null): (message: string) => void {
  let timer: ReturnType<typeof setTimeout> | undefined;
  return (message) => {
    if (!region) return;
    region.textContent = '';
    clearTimeout(timer);
    timer = setTimeout(() => {
      region.textContent = message;
    }, ANNOUNCE_DELAY_MS);
  };
}

// --- Copy ---------------------------------------------------------------------------------------

/**
 * The fallback for browsers without a usable Clipboard API — older iOS Safari, in-app WebViews, and
 * any browser that rejects `writeText` (a permissions policy, an insecure context). A readonly
 * textarea, so iOS does not raise the keyboard; selected both ways, because iOS ignores `select()`
 * alone; removed in the same task; and focus handed straight back to the button that was pressed.
 */
function legacyCopy(text: string, button: HTMLElement): boolean {
  const doc = button.ownerDocument;
  // Where focus was, and whether it showed a ring, so it goes back exactly as it was. Focusing the
  // buffer and then the button would otherwise draw a :focus-visible ring after a MOUSE click (a
  // programmatic focus that follows a focused textarea counts as "visible"), and with Copy & open
  // this path runs on every click, not only on the rare fallback.
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
  // Removing the focused buffer leaves focus on <body>, which is where it was if `prev` is null
  // (Safari does not focus a button or link on click).
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

/**
 * Copies `text`, resolving whether it worked. `writeText` is called synchronously inside the click,
 * which is what Safari requires of it; only when it is missing or refuses does the legacy path run.
 */
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
 * Copies `text` before the page can lose focus — for a link that is about to open an app. Both paths
 * start inside the click: the legacy one FINISHES before this returns, so the clipboard is written
 * before the browser follows the link even where `writeText` would still be pending when the app
 * takes over; `writeText` covers the browsers where `execCommand` is a no-op. They write the same text,
 * so whichever lands, the clipboard holds the prompt.
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
      // A WebView whose `writeText` throws: only the legacy path's answer counts.
    }
  }
  // `done` is known now; `pending` only later — possibly after the app has opened.
  return { done, pending };
}

/** Shows "Copied" in `labelEl` for COPIED_MS, then puts `original` back. Returns the restart. */
function flashCopied(el: HTMLElement, labelEl: Element, original: string): () => void {
  let reset: ReturnType<typeof setTimeout> | undefined;
  return () => {
    // Held at its own width while the shorter "Copied" shows, so a button beside it in a row does not
    // slide under the pointer and take a second click meant for this one.
    if (!el.hasAttribute('data-copied')) el.style.minWidth = `${el.getBoundingClientRect().width}px`;
    el.setAttribute('data-copied', '');
    labelEl.textContent = UI.copied;
    clearTimeout(reset);
    reset = setTimeout(() => {
      el.removeAttribute('data-copied');
      labelEl.textContent = original;
      el.style.minWidth = '';
    }, COPIED_MS);
  };
}

/** When nothing could write to the clipboard, select the prompt so the device's own Copy works. */
function selectContents(node: Node): void {
  const selection = window.getSelection();
  if (!selection) return;
  const range = node.ownerDocument?.createRange();
  if (!range) return;
  range.selectNodeContents(node);
  selection.removeAllRanges();
  selection.addRange(range);
}

function initCopy(doc: Document, announce: (message: string) => void): void {
  const buttons = Array.from(doc.querySelectorAll<HTMLButtonElement>('[data-copy]'));
  for (const button of buttons) {
    const block = button.closest('[data-prompt]');
    const pre = block?.querySelector('pre[data-prompt-text]');
    const labelEl = button.querySelector('[data-copy-label]');
    if (!block || !pre || !labelEl) continue;
    // The prompt's own name, for the announcement: "Voice profile prompt copied".
    const name = (block.querySelector('h3')?.textContent ?? '').trim();
    let reset: ReturnType<typeof setTimeout> | undefined;

    button.addEventListener('click', () => {
      // `textContent`, which is exactly the prompt: the placeholder <mark>s add no characters.
      const text = pre.textContent ?? '';
      void copyText(text, button).then((ok) => {
        if (!ok) {
          selectContents(pre);
          announce(UI.copyFailedAnnouncement(name));
          return;
        }
        button.setAttribute('data-copied', '');
        labelEl.textContent = UI.copied;
        clearTimeout(reset);
        reset = setTimeout(() => {
          button.removeAttribute('data-copied');
          labelEl.textContent = UI.copy;
        }, COPIED_MS);
        announce(UI.copiedAnnouncement);
      });
    });
  }
}

/** The prompt text a "Copy & open" link copies: its block's <pre>, as assembled right now. */
function promptTextFor(doc: Document, blockId: string): string | null {
  const pre = doc.getElementById(blockId)?.querySelector('pre[data-prompt-text]');
  return pre ? (pre.textContent ?? '') : null;
}

function initCopyOpen(doc: Document, announce: (message: string) => void): void {
  const main = doc.querySelector('main');
  const taps = main?.getAttribute('data-copy-open-taps') === '2' ? 2 : COPY_OPEN_TAPS;
  const links = Array.from(doc.querySelectorAll<HTMLAnchorElement>('a[data-copy-open]'));
  for (const link of links) {
    const blockId = link.getAttribute('data-copy-open') ?? '';
    const labelEl = link.querySelector('[data-copy-label]');
    if (!labelEl || promptTextFor(doc, blockId) === null) continue;
    const original = labelEl.textContent ?? '';
    const app = link.getAttribute('data-app') ?? '';
    // The prompt's own name, for the failure message: "Voice profile prompt is selected…".
    const promptName = (doc.getElementById(blockId)?.querySelector('h3')?.textContent ?? '').trim();
    const flash = flashCopied(link, labelEl, original);
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
    /** Nothing could copy: select the prompt, so the device's own Copy works, and say so. */
    const failed = () => {
      const pre = doc.getElementById(blockId)?.querySelector('pre[data-prompt-text]');
      if (pre) selectContents(pre);
      announce(UI.copyFailedAnnouncement(promptName));
    };

    link.addEventListener('click', (event) => {
      // An armed link is just the link. That is the two-tap mode's second tap, and also the tap after
      // a copy that could not be made — a failed copy must never leave the visitor without the app.
      if (armed) {
        reset();
        return;
      }
      const text = promptTextFor(doc, blockId) ?? '';
      if (taps === 1) {
        const { done, pending } = copyBeforeLeaving(text, link);
        if (done) {
          flash();
          announce(UI.copiedAnnouncement);
          return; // and the link opens
        }
        if (pending) {
          // Only "Copied" once it is true. The link opens either way; on a phone the app may already
          // be in front when this resolves, and then there is nothing left to show.
          void pending.then((ok) => {
            if (!ok) return;
            flash();
            announce(UI.copiedAnnouncement);
          });
          return;
        }
        // Nothing on this device can write the clipboard. Stay, select the prompt so it can be
        // copied by hand, and let the next tap open the app.
        event.preventDefault();
        failed();
        arm();
        return;
      }
      // Two taps. Armed at once, so a quick second tap opens even before the copy settles; the label
      // says what happened once it has.
      event.preventDefault();
      arm();
      void copyText(text, link).then((ok) => {
        if (!armed) return; // already opened, or timed out
        if (!ok) {
          failed();
          return;
        }
        labelEl.textContent = UI.copiedThenOpen(app);
        announce(UI.copiedAnnouncement);
      });
    });
  }
}

/** The starter ideas: each chip copies its own words. */
function initChips(doc: Document, announce: (message: string) => void): void {
  const chips = Array.from(doc.querySelectorAll<HTMLButtonElement>('button[data-copy-chip]'));
  for (const chip of chips) {
    const labelEl = chip.querySelector('[data-copy-label]');
    if (!labelEl) continue;
    const original = labelEl.textContent ?? '';
    const flash = flashCopied(chip, labelEl, original);
    chip.addEventListener('click', () => {
      void copyText(original, chip).then((ok) => {
        if (!ok) {
          selectContents(labelEl);
          announce(UI.copyFailedAnnouncement(original));
          return;
        }
        flash();
        announce(UI.copiedAnnouncement);
      });
    });
  }
}

// --- About you ------------------------------------------------------------------------------------

const ABOUT_FIELDS = ['niche', 'neighborhoods', 'questions', 'brokerage', 'voice'] as const;
type AboutField = (typeof ABOUT_FIELDS)[number];
type About = Record<AboutField, string>;
const EMPTY_ABOUT: About = { niche: '', neighborhoods: '', questions: '', brokerage: '', voice: '' };

/** One piece of the assembled prompt: text, or a placeholder drawn as a <mark>. */
interface Piece {
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
 * The Carousel Creator instructions with "About you" written in (D-032):
 *   - all of niche, neighborhoods, questions and brokerage empty → the original last line, untouched;
 *   - any of them filled → that line becomes a list, each empty field keeping its own bracket;
 *   - a voice profile → appended after a blank line, under "My voice profile:".
 * What a visitor TYPES is never a placeholder, so a bracket they type stays plain text.
 * Exported for the tests.
 */
export function assembleCarousel(base: string, about: About): Piece[] {
  const cut = base.lastIndexOf('\n') + 1;
  const head = base.slice(0, cut);
  const last = base.slice(cut);
  const a = UI.aboutYou;
  const value = (s: string) => s.trim();
  const questions = about.questions
    .split(/\r?\n/)
    .map((q) => q.trim())
    .filter(Boolean)
    .join(a.questionJoin);
  const vals = {
    niche: value(about.niche),
    neighborhoods: value(about.neighborhoods),
    questions,
    brokerage: value(about.brokerage),
  };
  const pieces = bracketed(head);
  if (!vals.niche && !vals.neighborhoods && !vals.questions && !vals.brokerage) {
    pieces.push(...bracketed(last));
  } else {
    const line = (key: keyof typeof vals, newline: boolean) => {
      pieces.push({ text: a.lines[key], mark: false });
      pieces.push(vals[key] ? { text: vals[key], mark: false } : { text: a.placeholders[key], mark: true });
      if (newline) pieces.push({ text: '\n', mark: false });
    };
    pieces.push({ text: `${a.aboutMe}\n`, mark: false });
    line('niche', true);
    line('neighborhoods', true);
    line('questions', true);
    line('brokerage', false);
  }
  const voice = value(about.voice);
  if (voice) pieces.push({ text: `\n\n${a.voiceHeading}\n`, mark: false }, { text: voice, mark: false });
  return pieces;
}

/** Writes pieces into the <pre> through text nodes and <mark>s — never through innerHTML. */
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

function loadAbout(): About {
  try {
    const raw = storage()?.getItem(ABOUT_KEY);
    const parsed: unknown = raw ? JSON.parse(raw) : null;
    const out: About = { ...EMPTY_ABOUT };
    if (parsed && typeof parsed === 'object') {
      for (const key of ABOUT_FIELDS) {
        const v = (parsed as Record<string, unknown>)[key];
        if (typeof v === 'string') out[key] = v;
      }
    }
    return out;
  } catch {
    return { ...EMPTY_ABOUT };
  }
}

function saveAbout(about: About | null): void {
  try {
    if (about === null) storage()?.removeItem(ABOUT_KEY);
    else storage()?.setItem(ABOUT_KEY, JSON.stringify(about));
  } catch {
    // Full or blocked: the fields still fill the instructions for this visit.
  }
}

function initAboutYou(doc: Document): void {
  const panel = doc.querySelector<HTMLElement>('[data-about]');
  const pre = doc.querySelector('[data-prompt="carousel_creator"] pre[data-prompt-text]');
  if (!panel || !pre) return;
  const base = pre.textContent ?? '';
  // The rules replace the instructions' LAST line, so it has to be the "About me" line it was
  // written for. If the prompt is ever edited so it is not, leave everything as rendered.
  if (!base.slice(base.lastIndexOf('\n') + 1).startsWith(UI.aboutYou.aboutMe)) return;

  const inputs = new Map<AboutField, HTMLInputElement | HTMLTextAreaElement>();
  for (const key of ABOUT_FIELDS) {
    const el = panel.querySelector<HTMLInputElement | HTMLTextAreaElement>(`[data-about-field="${key}"]`);
    if (el) inputs.set(key, el);
  }
  const read = (): About => {
    const about: About = { ...EMPTY_ABOUT };
    for (const [key, el] of inputs) about[key] = el.value;
    return about;
  };
  const render = () => paint(pre, assembleCarousel(base, read()));

  const saved = loadAbout();
  for (const [key, el] of inputs) if (saved[key]) el.value = saved[key];
  panel.hidden = false;
  render();

  for (const el of inputs.values()) {
    el.addEventListener('input', () => {
      render();
      saveAbout(read());
    });
  }
  panel.querySelector('[data-about-clear]')?.addEventListener('click', () => {
    for (const el of inputs.values()) el.value = '';
    saveAbout(null);
    render();
    // Focus stays on Clear. Moving it into a field would raise a phone's keyboard for nothing.
  });
}

// --- Get the app, and Send this to my laptop -----------------------------------------------------------

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

// --- Checklist ----------------------------------------------------------------------------------

function storage(): Storage | null {
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

/** The saved ids. Anything unreadable — no storage, bad JSON, the wrong shape — reads as none. */
function loadChecked(): string[] {
  try {
    const raw = storage()?.getItem(CHECKLIST_KEY);
    const parsed: unknown = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed.filter((id): id is string => typeof id === 'string') : [];
  } catch {
    return [];
  }
}

function saveChecked(ids: string[]): void {
  try {
    storage()?.setItem(CHECKLIST_KEY, JSON.stringify(ids));
  } catch {
    // Full, or blocked. The ticks still work for this visit; they just will not survive a refresh.
  }
}

function initChecklist(doc: Document): void {
  const boxes = Array.from(doc.querySelectorAll<HTMLInputElement>('input[data-check-id]'));
  if (boxes.length === 0) return;
  const idOf = (box: HTMLInputElement) => box.getAttribute('data-check-id') ?? '';
  // Restore only ever ticks. A box that is not in the saved list is left as the browser has it, so a
  // back-navigation's own form restore is not undone when storage is unavailable. A saved id that no
  // longer exists (a renamed item) matches nothing, and drops out at the next save.
  const saved = loadChecked();
  for (const box of boxes) if (saved.indexOf(idOf(box)) !== -1) box.checked = true;
  // The whole list is written each time, read back from the DOM, so it can never drift from it.
  const save = () => saveChecked(boxes.filter((box) => box.checked).map(idOf));
  for (const box of boxes) box.addEventListener('change', save);
}

// --- Waitlist -----------------------------------------------------------------------------------

/** The API's rules, client-side, with the same messages. */
function validate(values: Values): Partial<Record<Field, string>> {
  const errors: Partial<Record<Field, string>> = {};
  if (values.firstName.length < 1 || values.firstName.length > 80) errors.firstName = UI.errors.firstName;
  if (values.email.length > 254 || !EMAIL.test(values.email)) errors.email = UI.errors.email;
  // Brokerage is optional, and `maxlength="120"` already stops it running long; the API still checks
  // and answers with its own message if anything gets past.
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
function fieldError(body: unknown): { field: Field; message: string } | null {
  if (!body || typeof body !== 'object') return null;
  const { field, error } = body as { field?: unknown; error?: unknown };
  const match = FIELDS.filter((name) => name === field)[0];
  if (!match) return null;
  const fallback = match === 'brokerage' ? UI.errors.generic : UI.errors[match];
  return { field: match, message: typeof error === 'string' && error ? error : fallback };
}

function initWaitlist(doc: Document): void {
  const form = doc.getElementById('waitlist-form') as HTMLFormElement | null;
  const section = doc.getElementById('waitlist');
  const joined = doc.getElementById('waitlist-joined');
  const formError = doc.getElementById('waitlist-error');
  const submit = form?.querySelector('button[type="submit"]');
  // Without any one of these — or without `fetch` — leave the form alone: it still posts natively,
  // and the API's 303 brings the visitor back to the right line of this page.
  if (!form || !section || !joined || !formError || !submit || typeof fetch !== 'function') return;

  const input = (name: string): HTMLInputElement | null => {
    const el = form.elements.namedItem(name);
    return el instanceof HTMLInputElement ? el : null;
  };
  const value = (name: string) => input(name)?.value ?? '';

  // The page validates now, with the API's messages, so the browser's own bubbles stand down.
  form.noValidate = true;

  const setFieldError = (name: Field, message: string) => {
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
  // back a beat later, exactly as the live region does it.
  const showFormError = () => {
    formError.setAttribute('data-shown', '');
    formError.textContent = '';
    setTimeout(() => {
      formError.textContent = UI.errors.generic;
    }, ANNOUNCE_DELAY_MS);
  };
  const hideFormError = () => formError.removeAttribute('data-shown');

  // An error clears as soon as its field is edited; the next submit re-checks everything.
  for (const name of FIELDS) input(name)?.addEventListener('input', () => setFieldError(name, ''));

  let busy = false;

  form.addEventListener('submit', (event) => {
    event.preventDefault();
    if (busy) return;
    hideFormError();

    const values: Values = {
      firstName: value('firstName').trim(),
      email: value('email').trim(),
      brokerage: value('brokerage').trim(),
    };
    const errors = validate(values);
    for (const name of FIELDS) setFieldError(name, errors[name] ?? '');
    const firstInvalid = FIELDS.filter((name) => errors[name])[0];
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
        // The honeypot goes up as typed: the API, not the page, decides what a filled one means.
        website: value('website'),
        // Omitted rather than null when absent. `src` never changes what the page shows.
        src: src === null ? undefined : src,
      }),
    })
      .then((res) => {
        if (res.ok) {
          section.setAttribute('data-state', 'joined');
          joined.focus();
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

// --- Boot ---------------------------------------------------------------------------------------

function boot(doc: Document): void {
  const announce = announcer(doc.getElementById('ai101-live'));
  // About you first: it rewrites the Carousel Creator <pre>, which the copy buttons read on click.
  guard(() => initAboutYou(doc));
  guard(() => initCopy(doc, announce));
  guard(() => initCopyOpen(doc, announce));
  guard(() => initChips(doc, announce));
  guard(() => initChecklist(doc));
  guard(() => initGetApp(doc));
  guard(() => initShare(doc));
  guard(() => revealScripted(doc));
  guard(() => initWaitlist(doc));
}

// A module script runs once the document is parsed, so every element above is already there.
boot(document);
