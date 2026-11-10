// Types for `scripts/grok-templates.mjs`, so `apps/web/src/guides/grok-templates.test.ts` can import it
// under the web app's typecheck. Keep in step with the exports there.

export const TEMPLATES_DIR: string;
export const COLLECTIONS: readonly ('bookkeeping' | 'transactions')[];

export function listTemplates(): { id: string; collection: 'bookkeeping' | 'transactions' }[];
export function templatePath(id: string): string;
export function frontmatterOf(text: string): Record<string, string> | null;
export function check(id: string): { errors: string[] };
export function sectionOf(text: string, heading: string): string;
export function expected(id: string): { file: string; entries: { path: string; data: Buffer }[] }[];
export function build(id: string): { file: string; bytes: number }[];
export function grokShellFor(page: string): string;
export function grokShellPath(page: string): string;
