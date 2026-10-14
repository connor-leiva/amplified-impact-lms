// /task-sync-starter's only script. DECISIONS.md D-038.
//
// Inlined into the page (vite-plugin.ts), so it cannot fail to load on its own. It makes three things
// better, and the page works without it: the form still posts, and the API's 303 still shows the
// download.
//   1. The opt-in posts JSON, shows errors in place, and on success unlocks the download.
//   2. A device that has opted in before sees the download straight away (localStorage, guarded).
//   3. In Instagram's or Facebook's in-app browser, a line on how to save the PDF.
//
// Written for the in-app WebViews that ManyChat's DM links open in: built for es2019 / Safari 13,
// every feature in `guard()`, every storage access wrapped.

import { UI } from './content';

/** The sign-in screen's rule, which the API applies too. */
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
/** The form error is emptied and refilled a beat later, so `role="alert"` announces it again. */
const ANNOUNCE_DELAY_MS = 100;
/** In-app browsers that open a PDF instead of saving it. */
const IN_APP = /Instagram|FBAN|FBAV|FB_IAB|LinkedInApp|musical_ly|TikTok/i;

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

function wasUnlocked(): boolean {
  try {
    return storage()?.getItem(UI.unlockedKey) === '1';
  } catch {
    return false;
  }
}

function rememberUnlocked(): void {
  try {
    storage()?.setItem(UI.unlockedKey, '1');
  } catch {
    // Full or blocked: the download still shows for this visit.
  }
}

/** Shows the download in place of the form. `focus` moves focus to it, after a sign-up. */
function unlock(doc: Document, focus: boolean): void {
  const card = doc.getElementById('get-the-kit');
  const download = doc.getElementById('download');
  if (!card || !download) return;
  card.setAttribute('data-state', 'unlocked');
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
  const form = doc.getElementById('tss-form') as HTMLFormElement | null;
  const formError = doc.getElementById('tss-error');
  const submit = form?.querySelector('button[type="submit"]');
  // Without any of these, or without `fetch`, the form posts natively and the API's 303 answers.
  if (!form || !formError || !submit || typeof fetch !== 'function') return;

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
    fetch(form.getAttribute('action') ?? '/api/task-sync-starter', {
      method: 'POST',
      credentials: 'same-origin',
      headers: { 'content-type': 'application/json', accept: 'application/json' },
      body: JSON.stringify({ ...values, website: value('website'), src: src === null ? undefined : src }),
    })
      .then((res) => {
        if (res.ok) {
          rememberUnlocked();
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

function boot(doc: Document): void {
  guard(() => {
    if (wasUnlocked()) unlock(doc, false);
  });
  guard(() => {
    if (IN_APP.test(navigator.userAgent || '')) {
      for (const el of Array.from(doc.querySelectorAll<HTMLElement>('[data-in-app]'))) el.hidden = false;
    }
  });
  guard(() => initForm(doc));
}

boot(document);
