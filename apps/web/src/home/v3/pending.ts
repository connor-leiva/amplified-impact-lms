// Placeholders for what Connor hasn't decided yet (docs/design/home-v3/brief.md § 7, conflicts.md).
//
// A section or a fragment that depends on an open question is rendered through `pending(key, html,
// fallback)`. The page's render then resolves every one of them, in one place (`resolvePending`):
//   - in a preview build (`V3_PREVIEW=1`: dev and screenshot builds), the pending content stays, marked
//     `data-v3-pending="<key>"` so the stylesheet can label it on screen;
//   - in the production render, the fallback takes its place (nothing, unless the caller gives one), and
//     no marker of any kind is left. `render.test.ts` fails if one ever is.
//
// When Connor answers a question, its key comes out of `PENDING` and every call that uses it is
// replaced by the decided content; the compiler then finds any that are left.

/** The open questions, by key, with the conflict each one waits on. */
export const PENDING = {
  video: 'C9: no recording exists; the section shows only in preview',
  quote: 'C5: Spring’s quote is not on the live site',
  'stat-38': 'C6/C13: the 38% production figure',
  'stat-95': 'C6: the 95% finance figure',
  'people-12': 'C7: the org chart’s “12 people”',
  'fd-claims': 'C11/C12: founder titles and claims',
  'direct-buy': 'C4: direct Stripe links on the homepage',
} as const;

export type PendingKey = keyof typeof PENDING;

const OPEN = (key: string) => `<!--v3-pending:${key}-->`;
const ELSE = (key: string) => `<!--v3-pending:${key}:else-->`;
const CLOSE = (key: string) => `<!--v3-pending:${key}:end-->`;

/**
 * Marks `html` as waiting on `key`. Its first element carries `data-v3-pending`; text with no element of
 * its own is wrapped in a <span>. `fallback` is what the production render shows instead.
 */
export function pending(key: PendingKey, html: string, fallback = ''): string {
  const attr = ` data-v3-pending="${key}"`;
  const marked = /^\s*<[a-z]/i.test(html)
    ? html.replace(/^(\s*<[a-z][a-z0-9-]*)/i, `$1${attr}`)
    : `<span${attr}>${html}</span>`;
  if (marked.includes(OPEN(key))) throw new Error(`pending("${key}") is nested inside itself.`);
  return `${OPEN(key)}${marked}${ELSE(key)}${fallback}${CLOSE(key)}`;
}

const REGION = /<!--v3-pending:([a-z0-9-]+)-->([\s\S]*?)<!--v3-pending:\1:else-->([\s\S]*?)<!--v3-pending:\1:end-->/g;

/**
 * How a preview labels each placeholder on screen ("Pending · video", a dashed outline), so nobody takes
 * one for the real thing. Only ever in a preview: the production page holds no `data-v3-pending`, not
 * even in a stylesheet, so a search of it for the marker finds nothing (brief § 8).
 */
const PREVIEW_STYLE = `<style>
.aiw [data-v3-pending]{outline:2px dashed var(--signal);outline-offset:-2px}
.aiw section[data-v3-pending]{position:relative}
.aiw section[data-v3-pending]::before{content:'Pending · ' attr(data-v3-pending);position:absolute;top:12px;left:12px;z-index:5;padding:4px 10px;border-radius:4px;background:var(--signal);color:var(--on-action);font-family:var(--font-mono);font-size:16px;letter-spacing:.08em;text-transform:uppercase}
</style>`;

/**
 * Every pending region resolved: the marked content in a preview (with the style that labels it), the
 * fallback in production.
 */
export function resolvePending(html: string, { preview }: { preview: boolean }): string {
  const out = html.replace(REGION, (_, key: string, content: string, fallback: string) => {
    if (!(key in PENDING)) throw new Error(`Unknown pending key "${key}". Add it to PENDING in src/home/v3/pending.ts.`);
    return preview ? content : fallback;
  });
  if (out.includes('<!--v3-pending:')) throw new Error('A pending region was left unresolved (nested or unclosed).');
  return preview && out.includes('data-v3-pending') ? `${PREVIEW_STYLE}\n${out}` : out;
}

/** The keys a rendered page still shows as pending (a preview), in order of first appearance. */
export const pendingKeysIn = (html: string): string[] => [
  ...new Set([...html.matchAll(/data-v3-pending="([a-z0-9-]+)"/g)].map((m) => m[1]!)),
];
