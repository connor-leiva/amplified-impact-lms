// The offer page's one script (D-075). Everything it does is an enhancement: with no script the form
// posts to `/api/checkout` and the browser follows the API's 303 to Stripe, and every field and box
// shows. With it:
//
//   - a plan card's Choose button picks its cart in the form and moves there, without a reload;
//   - the form shows only what the chosen cart needs: its renewal box, and the CRM question for the
//     cohort;
//   - a refusal shows under its field, with `aria-invalid` and `aria-describedby`, and focus moves to
//     the first one; what was typed stays;
//   - the form posts JSON and the browser goes to the Checkout URL it gets back. If Stripe is down,
//     the backup Payment Link is offered beside the message.
//
// The rules are the API's (`validateCheckout`), repeated here only so a visitor hears about a missed
// box before a round trip; the API checks everything again. The messages are `content.ts`'s, which a
// test holds equal to the API's.

import { CHECKOUT } from './content';

type ErrorKey = keyof typeof CHECKOUT.errors;
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

/** The page's own phone rule, the API's `normalizePhone`: ten US digits, or a + and 8 to 15. */
function phoneOk(raw: string): boolean {
  const t = raw.trim();
  if (t === '') return true;
  const d = t.replace(/\D/g, '');
  if (t.startsWith('+')) return d.length >= 8 && d.length <= 15;
  return d.length === 10 || (d.length === 11 && d[0] === '1');
}

function init(): void {
  const form = document.getElementById('checkout-form') as HTMLFormElement | null;
  if (!form) return;
  form.noValidate = true;
  const submit = form.querySelector<HTMLButtonElement>('button[type="submit"]')!;
  const formError = document.getElementById('form-error')!;
  const fallback = document.getElementById('fallback')!;
  const fallbackLink = document.getElementById('fallback-link') as HTMLAnchorElement;
  const radios = Array.from(form.querySelectorAll<HTMLInputElement>('input[name="cart"]'));
  const crmField = form.querySelector<HTMLElement>('.field.crm')!;
  const renewals = Array.from(form.querySelectorAll<HTMLElement>('.renewal'));

  const chosen = (): HTMLInputElement | null => radios.find((r) => r.checked) ?? null;

  /** Show what the chosen cart needs and hide the rest. */
  function sync(): void {
    const cart = chosen();
    crmField.hidden = !(cart && cart.dataset.cohort === 'true');
    for (const box of renewals) {
      const mine = cart !== null && box.dataset.cart === cart.value;
      box.hidden = !mine;
      const input = box.querySelector('input')!;
      input.required = mine && cart?.dataset.renewal === 'required';
    }
  }

  const errorEl = (key: string): HTMLElement | null => form.querySelector<HTMLElement>(`[data-error-for="${key}"]`);
  const inputFor = (key: string): HTMLElement | null =>
    key === 'cart'
      ? (chosen() ?? radios.find((r) => r.closest('.cart')?.getAttribute('data-state') === 'checkout') ?? null)
      : key === 'renew'
        ? form.querySelector<HTMLElement>(`#renew-${chosen()?.value ?? ''}`)
        : form.querySelector<HTMLElement>(`#f-${key}`);

  function clearErrors(): void {
    for (const el of form!.querySelectorAll<HTMLElement>('[data-error-for]')) el.textContent = '';
    for (const el of form!.querySelectorAll('[aria-invalid]')) el.removeAttribute('aria-invalid');
    formError.textContent = '';
    fallback.hidden = true;
  }

  function showError(field: string, message: string): void {
    const el = errorEl(field);
    const input = inputFor(field);
    if (el) el.textContent = message;
    else formError.textContent = message;
    if (input) {
      input.setAttribute('aria-invalid', 'true');
      input.focus();
    } else {
      formError.focus();
    }
  }

  /** The API's rules, first failing field in form order. */
  function check(): [string, ErrorKey] | null {
    const cart = chosen();
    const v = (name: string) => (form!.elements.namedItem(name) as HTMLInputElement | null)?.value.trim() ?? '';
    if (!cart) return ['cart', 'cart'];
    if (v('name') === '') return ['name', 'name'];
    if (!EMAIL.test(v('email'))) return ['email', 'email'];
    if (!phoneOk(v('phone'))) return ['phone', 'phone'];
    const sms = (form!.elements.namedItem('sms') as HTMLInputElement).checked;
    if (sms && v('phone') === '') return ['sms', 'sms'];
    if (cart.dataset.cohort === 'true') {
      if (v('crm') === '') return ['crm', 'crmMissing'];
      if (v('crm') !== 'follow_up_boss') return ['crm', 'crm'];
    }
    if (!(form!.elements.namedItem('agree') as HTMLInputElement).checked) return ['agree', 'agree'];
    const renew = form!.querySelector<HTMLInputElement>(`#renew-${cart.value}`);
    if (cart.dataset.renewal === 'required' && !renew?.checked) return ['renew', 'renew'];
    return null;
  }

  for (const r of radios) r.addEventListener('change', sync);

  for (const a of document.querySelectorAll<HTMLAnchorElement>('[data-choose]')) {
    a.addEventListener('click', (e) => {
      const radio = radios.find((r) => r.value === a.dataset.choose);
      if (!radio) return;
      e.preventDefault();
      radio.checked = true;
      sync();
      document.getElementById('checkout')?.scrollIntoView();
      radio.focus({ preventScroll: true });
    });
  }

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    clearErrors();
    const problem = check();
    if (problem) {
      showError(problem[0], CHECKOUT.errors[problem[1]]);
      return;
    }
    const cart = chosen()!;
    const get = (name: string) => (form.elements.namedItem(name) as HTMLInputElement | null)?.value ?? '';
    const body = {
      cart: cart.value,
      name: get('name'),
      email: get('email'),
      phone: get('phone'),
      company: get('company'),
      crm: cart.dataset.cohort === 'true' ? get('crm') : '',
      agree: (form.elements.namedItem('agree') as HTMLInputElement).checked,
      renew: form.querySelector<HTMLInputElement>(`#renew-${cart.value}`)?.checked ?? false,
      sms: (form.elements.namedItem('sms') as HTMLInputElement).checked,
      website: get('website'),
      src: get('src'),
      campaign: get('campaign'),
    };
    const label = submit.textContent;
    submit.textContent = submit.dataset.submitting ?? label;
    submit.setAttribute('aria-busy', 'true');
    submit.disabled = true;
    try {
      const res = await fetch(form.action, {
        method: 'POST',
        headers: { 'content-type': 'application/json', accept: 'application/json' },
        body: JSON.stringify(body),
      });
      const json = (await res.json().catch(() => ({}))) as { url?: string; error?: string; field?: string; fallback?: string };
      if (res.ok && json.url) {
        window.location.assign(json.url);
        return;
      }
      showError(json.field ?? 'cart', json.error ?? CHECKOUT.errors.network);
      if (json.fallback) {
        fallbackLink.href = json.fallback;
        fallback.hidden = false;
      }
    } catch {
      showError('cart', CHECKOUT.errors.network);
    }
    submit.textContent = label;
    submit.removeAttribute('aria-busy');
    submit.disabled = false;
  });

  // A refused no-JS post came back with the API's sentence: put it under its field.
  const errorField = form.dataset.errorField;
  if (formError.textContent && errorField) {
    const message = formError.textContent;
    formError.textContent = '';
    sync();
    showError(errorField, message);
  } else {
    sync();
  }
  document.body.dataset.js = 'on';
}

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
else init();
