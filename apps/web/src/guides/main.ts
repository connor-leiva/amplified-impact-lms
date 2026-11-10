// Every guide page's only script (/task-sync-starter, /ops-time-audit, /reel-editor). DECISIONS.md
// D-038, D-039, D-045.
//
// Inlined into each page (vite-plugin.ts), so it cannot fail to load on its own. It reads what differs
// between guides from the page itself (the form's `action`, the card's `data-unlock-key`, a button's
// `data-toast` or `data-share-url`), so one script serves them all. It makes these things better, and
// the page works without it: the form still posts, and the API's 303 still shows the download.
//   1. The opt-in posts JSON, shows errors in place, and on success unlocks the download.
//   2. A device that has opted in before sees the download straight away (localStorage, guarded), and
//      so does a visitor who arrives on `#download` (the link the Reel Editor's handoff sends).
//   3. In Instagram's or Facebook's in-app browser, a line on how to save the file.
//   4. Words to say to Claude copy with a tap, and say so in the toast (D-045).
//   5. "Send This to My Computer" opens the share sheet where there is one (D-045).
//   6. "Copy & Open Claude" (or ChatGPT) copies a step's words and opens the app (D-070).
//   7. A setup shows one step at a time, with Back and Next, and remembers the place (D-070).
//   8. On a skill page (D-071): the steps before the current one are marked done, the sample starts as
//      its first screen with "See the Full Example", and on a phone a bar leads to the sign-up.
//
// Written for the in-app WebViews that ManyChat's DM links open in: built for es2019 / Safari 13,
// every feature in `guard()`, every storage access wrapped.
//
// The copy and share code is /ai101's (`src/ai101/main.ts`), cut down to what a guide uses. Repeated
// rather than shared, on purpose: a module two pages' scripts both import is split into a chunk an
// inlined script cannot load (`ai101Inline` in src/ai101/vite-plugin.ts refuses to build one).

import { UI } from './ui';

/** The sign-in screen's rule, which the API applies too. */
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
/** The form error is emptied and refilled a beat later, so `role="alert"` announces it again. */
const ANNOUNCE_DELAY_MS = 100;
/** In-app browsers that open a PDF instead of saving it. */
const IN_APP = /Instagram|FBAN|FBAV|FB_IAB|LinkedInApp|musical_ly|TikTok/i;
/** The id of the unlocked card: the no-JS 303's landing, and the link the handoff sends. */
const DOWNLOAD_ID = 'download';

const FIELDS = ['firstName', 'email'] as const;
type Field = (typeof FIELDS)[number];

function guard(setup: () => void): void {
  try {
    setup();
  } catch (err) {
    setTimeout(() => {
      throw err;
    }, 0);
  }
}

function storage(): Storage | null {
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

/** The opt-in card, which names the key this guide's unlock is remembered under. */
function card(doc: Document): HTMLElement | null {
  return doc.querySelector<HTMLElement>('[data-unlock-key]');
}

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
    // Full or blocked: the download still shows for this visit.
  }
}

/** Shows the download in place of the form. `focus` moves focus to it, after a sign-up. */
function unlock(doc: Document, focus: boolean): void {
  const el = card(doc);
  const download = doc.getElementById(DOWNLOAD_ID);
  if (!el || !download) return;
  el.setAttribute('data-state', 'unlocked');
  // A skill page's sign-up bar has nothing left to lead to (D-071).
  const bar = doc.querySelector<HTMLElement>('[data-sk-bar]');
  if (bar) bar.hidden = true;
  if (focus) download.focus();
}

/** `?src=ig` from the URL the visitor arrived on, for attribution. Never an error. */
function readSrc(): string | null {
  try {
    return new URLSearchParams(window.location.search).get('src');
  } catch {
    return null;
  }
}

/** The API's rules, client-side, with the same messages. */
export function validate(values: Record<Field, string>): Partial<Record<Field, string>> {
  const errors: Partial<Record<Field, string>> = {};
  if (values.firstName.length < 1 || values.firstName.length > 80) errors.firstName = UI.errors.firstName;
  if (values.email.length > 254 || !EMAIL.test(values.email)) errors.email = UI.errors.email;
  return errors;
}

/** A 400's `{ error, field }`, when it names one of this form's fields. */
function fieldError(body: unknown): { field: Field; message: string } | null {
  if (!body || typeof body !== 'object') return null;
  const { field, error } = body as { field?: unknown; error?: unknown };
  const match = FIELDS.filter((name) => name === field)[0];
  if (!match) return null;
  return { field: match, message: typeof error === 'string' && error ? error : UI.errors[match] };
}

function initForm(doc: Document): void {
  const form = doc.getElementById('guide-form') as HTMLFormElement | null;
  const formError = doc.getElementById('guide-error');
  const submit = form?.querySelector('button[type="submit"]');
  const key = card(doc)?.getAttribute('data-unlock-key');
  const action = form?.getAttribute('action');
  // Without any of these, or without `fetch`, the form posts natively and the API's 303 answers.
  if (!form || !formError || !submit || !key || !action || typeof fetch !== 'function') return;

  const input = (name: string): HTMLInputElement | null => {
    const el = form.elements.namedItem(name);
    return el instanceof HTMLInputElement ? el : null;
  };
  const value = (name: string) => input(name)?.value ?? '';
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
  const showFormError = () => {
    formError.setAttribute('data-shown', '');
    formError.textContent = '';
    setTimeout(() => {
      formError.textContent = UI.errors.generic;
    }, ANNOUNCE_DELAY_MS);
  };
  const hideFormError = () => formError.removeAttribute('data-shown');
  for (const name of FIELDS) input(name)?.addEventListener('input', () => setFieldError(name, ''));

  let busy = false;
  form.addEventListener('submit', (event) => {
    event.preventDefault();
    if (busy) return;
    hideFormError();
    const values = { firstName: value('firstName').trim(), email: value('email').trim() };
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
    const src = readSrc();
    fetch(action, {
      method: 'POST',
      credentials: 'same-origin',
      headers: { 'content-type': 'application/json', accept: 'application/json' },
      body: JSON.stringify({ ...values, website: value('website'), src: src === null ? undefined : src }),
    })
      .then((res) => {
        if (res.ok) {
          rememberUnlocked(key);
          unlock(doc, true);
          return;
        }
        if (res.status !== 400) return showFormError();
        return res.json().then((body: unknown) => {
          const named = fieldError(body);
          if (!named) return showFormError();
          setFieldError(named.field, named.message);
          input(named.field)?.focus();
        }, showFormError);
      }, showFormError)
      .then(done, done);
  });
}

// --- Copy (D-045) -------------------------------------------------------------------------------------

/** The live region, drawn as a toast: shown while it has text, emptied after `UI.toastMs`. */
function toaster(region: HTMLElement | null): (message: string) => void {
  let show: ReturnType<typeof setTimeout> | undefined;
  let hide: ReturnType<typeof setTimeout> | undefined;
  return (message) => {
    if (!region) return;
    // Emptied, then refilled a beat later: the same words twice in one task are not a change to most
    // screen readers, so a second copy would be silent.
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

/**
 * The fallback for browsers without a usable Clipboard API (older iOS, in-app WebViews): a readonly
 * textarea, so iOS raises no keyboard, selected both ways, because iOS ignores `select()` alone, and
 * removed in the same task. Focus goes back to where it was.
 */
function legacyCopy(text: string, button: HTMLElement): boolean {
  const doc = button.ownerDocument;
  const active = doc.activeElement;
  const prev = active instanceof HTMLElement && active !== doc.body ? active : null;
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
  prev?.focus({ preventScroll: true });
  return ok;
}

/** Copies `text`, resolving whether it worked: `writeText` first, synchronously inside the click. */
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

/** When nothing could write to the clipboard, select the words so the device's own Copy works. */
function selectContents(node: Node): void {
  const selection = window.getSelection();
  const range = node.ownerDocument?.createRange();
  if (!selection || !range) return;
  range.selectNodeContents(node);
  selection.removeAllRanges();
  selection.addRange(range);
}

function initCopy(doc: Document, toast: (message: string) => void): void {
  for (const button of Array.from(doc.querySelectorAll<HTMLButtonElement>('button[data-copy]'))) {
    const words = button.querySelector('[data-copy-text]');
    if (!words) continue;
    const copied = button.getAttribute('data-toast') ?? '';
    button.addEventListener('click', () => {
      void copyText(words.textContent ?? '', button).then((ok) => {
        if (ok) return toast(copied);
        selectContents(words);
        toast(UI.copyFailed);
      });
    });
  }
}

// --- Copy & Open (D-070) ------------------------------------------------------------------------------

/**
 * Copies `text` before the page can lose focus, for a link about to open an app: the legacy copy
 * FINISHES inside the click, and `writeText` starts there too (/ai101's `copyBeforeLeaving`, D-032).
 */
function copyBeforeLeaving(text: string, el: HTMLElement): boolean {
  let ok = legacyCopy(text, el);
  const clipboard = navigator.clipboard as Clipboard | undefined;
  if (clipboard && typeof clipboard.writeText === 'function' && window.isSecureContext) {
    try {
      void clipboard.writeText(text).then(
        () => undefined,
        () => undefined,
      );
      ok = true;
    } catch {
      // Only the legacy path's answer counts.
    }
  }
  return ok;
}

/**
 * "Copy & Open Claude" (or ChatGPT): copies its step's words, says so, and lets the link open the app
 * in a new tab. When nothing could copy, the link stays put: the words are selected for the device's
 * own Copy, and the next tap opens the app.
 */
function initCopyOpen(doc: Document, toast: (message: string) => void): void {
  for (const link of Array.from(doc.querySelectorAll<HTMLAnchorElement>('a[data-copy-open]'))) {
    const words = link.closest('.setup-step')?.querySelector('[data-copy-text]');
    if (!words) continue;
    const copied = link.getAttribute('data-toast') ?? '';
    let failedOnce = false;
    link.addEventListener('click', (event) => {
      if (copyBeforeLeaving(words.textContent ?? '', link)) {
        toast(copied);
        return;
      }
      if (failedOnce) return;
      failedOnce = true;
      event.preventDefault();
      selectContents(words);
      toast(UI.copyFailed);
    });
  }
}

// --- One step at a time (D-070) -----------------------------------------------------------------------

function readStep(key: string): number {
  try {
    const n = Number(storage()?.getItem(key));
    return Number.isFinite(n) && n > 0 ? Math.floor(n) : 1;
  } catch {
    return 1;
  }
}

function saveStep(key: string, n: number): void {
  try {
    storage()?.setItem(key, String(n));
  } catch {
    // Full or blocked: the place is kept for this visit only.
  }
}

/**
 * Each setup becomes screens: the current step shows, the rest wait (`data-current`, `skills.css`),
 * with "Step 2 of 7", Back and Next, and Start Over on the last. The place is remembered per app.
 * Without this, every step shows, numbered, as before.
 */
function initGuided(doc: Document): void {
  for (const box of Array.from(doc.querySelectorAll<HTMLElement>('[data-guided]'))) {
    const steps = Array.from(box.querySelectorAll<HTMLElement>('.setup-step'));
    const progress = box.querySelector<HTMLElement>('[data-guided-progress]');
    const nav = box.querySelector<HTMLElement>('[data-guided-nav]');
    const back = box.querySelector<HTMLButtonElement>('[data-guided-back]');
    const next = box.querySelector<HTMLButtonElement>('[data-guided-next]');
    const restart = box.querySelector<HTMLButtonElement>('[data-guided-restart]');
    if (steps.length < 2 || !progress || !nav || !back || !next || !restart) continue;
    const key = box.getAttribute('data-guided-key') ?? '';
    const template = progress.getAttribute('data-guided-progress') ?? '';
    const total = steps.length;

    const show = (n: number, focus: boolean) => {
      const at = Math.min(Math.max(n, 1), total);
      current = at;
      steps.forEach((step, i) => {
        if (i + 1 === at) {
          step.setAttribute('data-current', '');
          step.setAttribute('aria-current', 'step');
        } else {
          step.removeAttribute('data-current');
          step.removeAttribute('aria-current');
        }
        // A skill page's checklist ticks the steps before this one (D-071).
        if (i + 1 < at) step.setAttribute('data-done', '');
        else step.removeAttribute('data-done');
      });
      progress.textContent = template.replace('{n}', String(at)).replace('{total}', String(total));
      back.hidden = at === 1;
      next.hidden = at === total;
      restart.hidden = at !== total;
      if (key) saveStep(key, at);
      if (focus) {
        const heading = steps[at - 1]?.querySelector<HTMLElement>('h3');
        heading?.focus({ preventScroll: true });
        // Keeps the step's top in view after a tap far down a long step. Not in every WebView.
        if (typeof progress.scrollIntoView === 'function') progress.scrollIntoView({ block: 'nearest' });
      }
    };

    let current = 1;
    box.setAttribute('data-guided-on', '');
    progress.hidden = false;
    nav.hidden = false;
    show(key ? readStep(key) : 1, false);
    back.addEventListener('click', () => show(current - 1, true));
    next.addEventListener('click', () => show(current + 1, true));
    restart.addEventListener('click', () => show(1, true));
  }
}

// --- A skill page's sample and sign-up bar (D-071) -------------------------------------------------

/**
 * The sample starts as its first screen, faded, with "See the Full Example" under it; the button then
 * reads "Show Less". Focus reaching a part that is cut off (a table, by Tab) opens it, so a keyboard
 * never lands on something it cannot see. Without this, all of it shows.
 */
function initSample(doc: Document): void {
  for (const section of Array.from(doc.querySelectorAll<HTMLElement>('[data-peekable]'))) {
    const button = section.querySelector<HTMLButtonElement>('[data-sample-more]');
    const sheet = section.querySelector<HTMLElement>('.sample-doc');
    if (!button || !sheet) continue;
    const more = button.textContent ?? '';
    const less = button.getAttribute('data-less') ?? more;
    const set = (open: boolean) => {
      if (open) section.removeAttribute('data-peek');
      else section.setAttribute('data-peek', '');
      button.setAttribute('aria-expanded', String(open));
      button.textContent = open ? less : more;
    };
    set(false);
    button.hidden = false;
    button.addEventListener('click', () => {
      const open = section.hasAttribute('data-peek');
      set(open);
      // After "Show Less" far down a long sample, bring the button back into view.
      if (!open && typeof button.scrollIntoView === 'function') button.scrollIntoView({ block: 'nearest' });
    });
    sheet.addEventListener('focusin', () => {
      if (section.hasAttribute('data-peek')) set(true);
    });
  }
}

/**
 * On a phone, the bar at the foot of the screen that leads to the sign-up: shown while the opt-in card
 * is out of view and the skill is not yet unlocked. `skills.css` never shows it on a wide screen, where
 * the card stays beside the sample. Without IntersectionObserver it stays hidden: the card is still on
 * the page.
 */
function initBar(doc: Document): void {
  const bar = doc.querySelector<HTMLElement>('[data-sk-bar]');
  const el = card(doc);
  if (!bar || !el || typeof IntersectionObserver !== 'function') return;
  // The card counts as in view once its top is a bar's height above the foot of the screen, so the
  // bar never hides for a sliver of green.
  new IntersectionObserver(
    (entries) => {
      const inView = entries.some((entry) => entry.isIntersecting);
      bar.hidden = inView || el.getAttribute('data-state') === 'unlocked';
    },
    { rootMargin: '0px 0px -96px 0px' },
  ).observe(el);
}

// --- Send This to My Computer (D-045) ---------------------------------------------------------------

/** The share sheet where there is one; otherwise the link's own `mailto:`, as written. */
function initShare(doc: Document): void {
  for (const link of Array.from(doc.querySelectorAll<HTMLAnchorElement>('a[data-share]'))) {
    const title = link.getAttribute('data-share-title') ?? '';
    const url = link.getAttribute('data-share-url') ?? '';
    link.addEventListener('click', (event) => {
      if (typeof navigator.share !== 'function' || !url) return;
      event.preventDefault();
      const toMail = () => {
        window.location.href = link.href;
      };
      try {
        navigator.share({ title, url }).then(
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
}

// --- Boot -------------------------------------------------------------------------------------------

/** Whether the visitor arrived on the unlocked card's own address. Never an error. */
function arrivedOnDownload(): boolean {
  try {
    return window.location.hash === `#${DOWNLOAD_ID}`;
  } catch {
    return false;
  }
}

function boot(doc: Document): void {
  guard(() => {
    const key = card(doc)?.getAttribute('data-unlock-key');
    if (key && wasUnlocked(key)) unlock(doc, false);
    // `:target` already shows the card for a link to it. This keeps it showing for the visit once
    // another link on the page changes the address. Not remembered: this device never signed up.
    else if (arrivedOnDownload()) unlock(doc, false);
  });
  guard(() => {
    if (IN_APP.test(navigator.userAgent || '')) {
      for (const el of Array.from(doc.querySelectorAll<HTMLElement>('[data-in-app]'))) el.hidden = false;
    }
  });
  guard(() => initForm(doc));
  const toast = toaster(doc.getElementById('guide-live'));
  guard(() => initCopy(doc, toast));
  guard(() => initCopyOpen(doc, toast));
  guard(() => initGuided(doc));
  guard(() => initSample(doc));
  guard(() => initBar(doc));
  guard(() => initShare(doc));
}

boot(document);
