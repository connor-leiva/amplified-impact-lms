// Placeholders for what is still waiting on someone (docs/design/home-v3/conflicts.md, "Decisions").
//
// A section or a fragment that waits on an open question is rendered through `pending(key, html,
// fallback)`. The page's render then resolves every one of them, in one place (`resolvePending`):
//   - in a preview build (`V3_PREVIEW=1`: dev and screenshot builds), the pending content stays, marked
//     `data-pending="<key>"` (Connor's marker) and labelled on screen;
//   - in the production render, the fallback takes its place (nothing, unless the caller gives one), and
//     no marker of any kind is left. `render.test.ts` fails if one ever is.
//
// When a question is answered, its key comes out of `PENDING` and every call that uses it is replaced by
// the decided content; the compiler then finds any that are left.

/** The open questions, by key (Connor's names, Nov 12), with who or what each one waits on. */
export const PENDING = {
  'spring-approval': 'C5/C8: Spring’s quote, until Spring approves its words and numbers',
  'stat-source': 'C6/C13: the 38% and 95% figures, until Connor gives their source',
  'video-still': 'C9: the real still photo that replaces the video, until Connor chooses it',
  'team-plan-dec14': 'C14: the Team Plan’s December 14 line, until it is decided',
} as const;

export type PendingKey = keyof typeof PENDING;

/** The attribute that marks pending content in a preview. Never in a production page. */
export const MARKER = 'data-pending';

const OPEN = (key: string) => `<!--pending:${key}-->`;
const ELSE = (key: string) => `<!--pending:${key}:else-->`;
const CLOSE = (key: string) => `<!--pending:${key}:end-->`;

/**
 * Marks `html` as waiting on `key`. Its first element carries `data-pending`; text with no element of
 * its own is wrapped in a <span>. `fallback` is what the production render shows instead.
 */
export function pending(key: PendingKey, html: string, fallback = ''): string {
  const attr = ` ${MARKER}="${key}"`;
  const marked = /^\s*<[a-z]/i.test(html)
    ? html.replace(/^(\s*<[a-z][a-z0-9-]*)/i, `$1${attr}`)
    : `<span${attr}>${html}</span>`;
  if (marked.includes(OPEN(key))) throw new Error(`pending("${key}") is nested inside itself.`);
  return `${OPEN(key)}${marked}${ELSE(key)}${fallback}${CLOSE(key)}`;
}

const REGION = /<!--pending:([a-z0-9-]+)-->([\s\S]*?)<!--pending:\1:else-->([\s\S]*?)<!--pending:\1:end-->/g;

/**
 * How a preview labels each placeholder on screen ("Pending · video-still", a dashed outline), so nobody
 * takes one for the real thing. Only ever in a preview: the production page holds no `data-pending`,
 * not even in a stylesheet, so a search of it for the marker finds nothing (brief § 8).
 */
const PREVIEW_STYLE = `<style>
.aiw [${MARKER}]{outline:2px dashed var(--signal);outline-offset:-2px}
.aiw section[${MARKER}]{position:relative}
.aiw section[${MARKER}]::before{content:'Pending · ' attr(${MARKER});position:absolute;top:12px;left:12px;z-index:5;padding:4px 10px;border-radius:4px;background:var(--signal);color:var(--on-action);font-family:var(--font-mono);font-size:16px;letter-spacing:.08em;text-transform:uppercase}
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
  if (out.includes('<!--pending:')) throw new Error('A pending region was left unresolved (nested or unclosed).');
  return preview && out.includes(`${MARKER}=`) ? `${PREVIEW_STYLE}\n${out}` : out;
}

/** The keys a rendered page still shows as pending (a preview), in order of first appearance. */
export const pendingKeysIn = (html: string): string[] => [
  ...new Set([...html.matchAll(new RegExp(`${MARKER}="([a-z0-9-]+)"`, 'g'))].map((m) => m[1]!)),
];
