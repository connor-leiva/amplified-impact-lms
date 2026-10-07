// /ai101's only script: the two copy buttons, the checklist's memory, and the waitlist form.
// DECISIONS.md D-028.
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
  button.focus({ preventScroll: true });
  return ok;
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
        announce(UI.copiedAnnouncement(name));
      });
    });
  }
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
  guard(() => initCopy(doc, announce));
  guard(() => initChecklist(doc));
  guard(() => initWaitlist(doc));
}

// A module script runs once the document is parsed, so every element above is already there.
boot(document);
