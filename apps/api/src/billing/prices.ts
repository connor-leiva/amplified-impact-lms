// Live prices, by lookup key, cached for 5 minutes (D-074).
//
// The offer page and the checkout route ask here; nothing in the code knows an amount. When Grokbok
// moves a lookup key to a new price, the page shows it within `PRICE_TTL_MS`. A failed refresh keeps
// serving the last good list (a venue's Wi-Fi does not decide whether Stripe answers us), and with no
// list at all the page falls back to the Payment Links.

import { LOOKUP_KEYS } from './catalog';
import type { LookupKey } from './catalog';
import type { BillingStripe, PriceInfo } from './stripe';

export const PRICE_TTL_MS = 5 * 60_000;
/** After a failure, how long before asking Stripe again: short, so a blip heals quickly. */
export const PRICE_RETRY_MS = 30_000;

export type PriceMap = Partial<Record<LookupKey, PriceInfo>>;

export interface PriceCache {
  /** The prices, or null when Stripe has never answered. Never throws. */
  get(now: number): Promise<PriceMap | null>;
  /**
   * R-5 Phase 5 (D-262): Stripe's active price under each of these lookup keys, any key (a cohort's own keys, made by
   * hand in Stripe, are not in `LOOKUP_KEYS`): a key Stripe has no active price under maps to null. Null when Stripe
   * can't be asked. Each key is kept `PRICE_TTL_MS`, like the list. Never throws.
   */
  lookup?(keys: readonly string[], now: number): Promise<Readonly<Record<string, PriceInfo | null>> | null>;
  /** For a test: forget everything. */
  reset(): void;
}

export function createPriceCache(stripe: () => BillingStripe | null, onError?: (err: unknown) => void): PriceCache {
  let prices: PriceMap | null = null;
  let fetchedAt = 0;
  let retryAt = 0;
  let inFlight: Promise<void> | null = null;

  const refresh = async (now: number): Promise<void> => {
    const client = stripe();
    if (!client) return;
    try {
      const list = await client.pricesByLookupKeys(LOOKUP_KEYS);
      const next: PriceMap = {};
      for (const p of list) if ((LOOKUP_KEYS as readonly string[]).includes(p.lookupKey)) next[p.lookupKey as LookupKey] = p;
      prices = next;
      fetchedAt = now;
    } catch (err) {
      retryAt = now + PRICE_RETRY_MS;
      onError?.(err);
    }
  };

  // R-5 Phase 5 (D-262): a cohort's own keys, asked about by name and kept a while each.
  const byKey = new Map<string, { price: PriceInfo | null; at: number }>();

  return {
    async lookup(keys, now) {
      const client = stripe();
      if (!client) return null;
      const want = [...new Set(keys.filter(Boolean))];
      const stale = want.filter((k) => {
        const hit = byKey.get(k);
        return !hit || now - hit.at >= PRICE_TTL_MS;
      });
      if (stale.length) {
        try {
          const list = await client.pricesByLookupKeys(stale);
          for (const k of stale) byKey.set(k, { price: list.find((p) => p.lookupKey === k) ?? null, at: now });
        } catch (err) {
          onError?.(err);
          if (stale.some((k) => !byKey.has(k))) return null;
        }
      }
      return Object.fromEntries(want.map((k) => [k, byKey.get(k)?.price ?? null]));
    },
    async get(now) {
      const stale = prices === null || now - fetchedAt >= PRICE_TTL_MS;
      if (stale && now >= retryAt) {
        // One refresh at a time: a room opening the page in the same second makes one call, not 200.
        inFlight ??= refresh(now).finally(() => {
          inFlight = null;
        });
        // A cold cache waits for the answer; a warm one serves the old prices while it refreshes.
        if (prices === null) await inFlight;
      }
      return prices;
    },
    reset() {
      byKey.clear();
      prices = null;
      fetchedAt = 0;
      retryAt = 0;
      inFlight = null;
    },
  };
}

/** Whether every price a set of lookup keys names is present. */
export const hasPrices = (prices: PriceMap | null, keys: readonly LookupKey[]): prices is PriceMap =>
  prices !== null && keys.every((k) => prices[k] !== undefined);
