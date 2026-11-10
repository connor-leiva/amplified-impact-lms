// /offer/welcome's one script (D-075): while the payment is confirming, ask the API every few seconds
// whether the webhook has landed, and reload into the confirmed page when it has. Without a script the
// page says to refresh in a minute. After two minutes, longer than Stripe takes, it shows "No checkout found".

const POLL_MS = 3000;
const MAX_TRIES = 40;

function init(): void {
  if (document.body.dataset.state !== 'pending') return;
  const session = document.querySelector<HTMLElement>('main[data-session]')?.dataset.session ?? '';
  if (!/^cs_(test|live)_[A-Za-z0-9]+$/.test(session)) return;
  let tries = 0;
  const tick = async (): Promise<void> => {
    tries += 1;
    try {
      const res = await fetch(`/api/offer/order-status?session_id=${encodeURIComponent(session)}`, { headers: { accept: 'application/json' } });
      if (res.ok) {
        const { status } = (await res.json()) as { status?: string };
        if (status === 'paid' || status === 'trialing') {
          window.location.reload();
          return;
        }
      }
    } catch {
      // The venue's Wi-Fi dropped a request: the next tick tries again.
    }
    if (tries < MAX_TRIES) window.setTimeout(() => void tick(), POLL_MS);
    // Nothing landed in two minutes: this is not a checkout we know. Say so rather than spin forever.
    else document.body.dataset.state = 'unknown';
  };
  window.setTimeout(() => void tick(), POLL_MS);
}

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
else init();
