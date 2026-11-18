// THE COPY GUARD (D-173, the curriculum builder brief, PR 1): course content is data, never code.
//
// The database is the single source of truth for the course's words. Admins edit them in the
// curriculum builder; runtime code only renders what the API sends. Their first copy is a one-time
// seed (`packages/core/seed/`), which runtime code may not import. This test holds both rules over
// every runtime file:
//
//   1. no runtime file imports `accelerator-content`, `weeks-0-3` or anything under `seed/`;
//   2. no seed string of 12 or more characters (a title, a question, a step, a done-when line, a
//      session title, a card line, a copy string) appears inside a runtime string literal, template
//      chunk or JSX text.
//
// The only way past rule 2 is `UI_LABELS` (packages/core/src/ui-labels.ts): generic chrome a screen
// labels itself with, listed with why and reviewed in its PR. Library guide bodies have a dated
// exception (below). The guard is proven red on a planted literal and a planted import, so a green
// run means something.
//
// Read-only: it parses files with the TypeScript compiler and touches no database.

import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';
import { describe, expect, it } from 'vitest';
import { curriculumSeed } from '@ai/core/seed/curriculum';
import { SKILL_COMING } from '@ai/core/seed/content-v2';
import { TEAM_PLAN_COPY } from '@ai/core/seed/copy-v2';
import { weekModuleV2 } from '@ai/core/seed/weeks-0-3-v2';
import { UI_LABEL_TEXTS } from '@ai/core/ui-labels';

const ROOT = fileURLToPath(new URL('../../../', import.meta.url));

/** Learner and API runtime: what a learner's screen or an API answer is built from. */
const RUNTIME_DIRS = ['apps/web/src/routes', 'apps/web/src/components', 'apps/api/src/routes', 'apps/api/src/lib', 'packages/core/src'];

/**
 * Dated exceptions, each with its end date. Library guide bodies (`apps/web/src/guides/**`) stay in
 * code until they move into builder-managed content after Dec 2 (the brief's two-step library plan,
 * which also needs Connor's OK on `library-sync.ts`). They are not under RUNTIME_DIRS today; listed so
 * that adding them can't silently drop the exception's date.
 */
const DATED_EXCEPTIONS: readonly { path: string; until: string; why: string }[] = [
  { path: 'apps/web/src/guides/', until: '2027-01-31', why: 'Library guide bodies move to builder content after Dec 2 (D-173).' },
  // The Week 1 worksheet, the practice set and the templates the course page downloads. The brief's PR 4
  // retires them from the course (the files stay for the pages that still use them).
  { path: 'packages/core/src/worksheet.ts', until: '2026-12-02', why: 'Retired from the course with the new Weeks 0 to 3 (brief PR 4).' },
];
const excepted = (rel: string): boolean => DATED_EXCEPTIONS.some((e) => rel.startsWith(e.path));

const MIN = 12;
const FORBIDDEN_IMPORT = /accelerator-content|weeks-0-3|(^|\/)seed\/|@ai\/core\/seed(\/|$)/;

/** Keys whose values are identifiers, routes or settings, not words a learner reads. */
const NOT_COPY = new Set(['id', 'route', 'also', 'sessionId', 'icon', 'path', 'cohortId', 'moduleId', 'kind', 'status', 'tier', 'audience', 'key', 'timezone', 'defaultOpenTime', 'zoom', 'replay', 'role', 'prompt']);

/**
 * Every seed string of MIN or more characters a learner could read, from the rows the seed writes.
 *
 * A week's `skills` name Library items by their Library title ("Morning Brief", "AI Brain Setup"):
 * those titles are the Library catalog's (`skills.ts`), which moves into builder data with the native
 * Skill Library (the brief's PR 7), so they are not the course's words to guard here.
 */
function seedStrings(): Set<string> {
  const out = new Set<string>();
  const walk = (v: unknown, key: string, parent: string): void => {
    if (typeof v === 'string') {
      const s = v.replace(/\s+/g, ' ').trim();
      if (s.length >= MIN && !NOT_COPY.has(key) && !(parent === 'skills' && key === 'title')) out.add(s);
    } else if (Array.isArray(v)) v.forEach((x) => walk(x, key, key));
    else if (v && typeof v === 'object') for (const [k, x] of Object.entries(v)) walk(x, k, parent === 'skills' && key === 'skills' ? 'skills' : key);
  };
  walk(curriculumSeed(), '', '');
  // D-176: the new Weeks 0 to 3 and the copy string the content step writes are course words too.
  walk([0, 1, 2, 3].map((n) => weekModuleV2(n as 0 | 1 | 2 | 3)), '', '');
  walk([SKILL_COMING], '', '');
  // D-187: the Team Plan window's copy strings are the builder's to edit, so no runtime file may hold them.
  walk(TEAM_PLAN_COPY, '', '');
  return out;
}

const isTest = (path: string): boolean => /\.test\.tsx?$/.test(path) || path.includes(`${sep}test${sep}`) || path.endsWith('test-setup.ts');

function runtimeFiles(): string[] {
  const out: string[] = [];
  const visit = (dir: string): void => {
    for (const name of readdirSync(dir)) {
      const p = join(dir, name);
      if (statSync(p).isDirectory()) visit(p);
      else if (/\.tsx?$/.test(name) && !name.endsWith('.d.ts') && !isTest(p)) out.push(p);
    }
  };
  for (const d of RUNTIME_DIRS) visit(join(ROOT, d));
  return out;
}

export interface Violation {
  file: string;
  kind: 'import' | 'literal';
  detail: string;
}

/** The literals in one source file: strings, template chunks and JSX text, whitespace collapsed. */
function literalsOf(source: string, fileName: string): string[] {
  const sf = ts.createSourceFile(fileName, source, ts.ScriptTarget.Latest, true, fileName.endsWith('x') ? ts.ScriptKind.TSX : ts.ScriptKind.TS);
  const out: string[] = [];
  const visit = (n: ts.Node): void => {
    if (ts.isStringLiteralLike(n) || ts.isTemplateHead(n) || ts.isTemplateMiddle(n) || ts.isTemplateTail(n)) out.push(n.text);
    else if (ts.isJsxText(n)) out.push(n.text);
    ts.forEachChild(n, visit);
  };
  visit(sf);
  return out.map((s) => s.replace(/\s+/g, ' ').trim()).filter(Boolean);
}

/** The module specifiers one source file imports, re-exports, dynamically imports or requires. */
function importsOf(source: string, fileName: string): string[] {
  const sf = ts.createSourceFile(fileName, source, ts.ScriptTarget.Latest, true, fileName.endsWith('x') ? ts.ScriptKind.TSX : ts.ScriptKind.TS);
  const out: string[] = [];
  const visit = (n: ts.Node): void => {
    if ((ts.isImportDeclaration(n) || ts.isExportDeclaration(n)) && n.moduleSpecifier && ts.isStringLiteral(n.moduleSpecifier)) out.push(n.moduleSpecifier.text);
    else if (ts.isCallExpression(n) && (n.expression.kind === ts.SyntaxKind.ImportKeyword || (ts.isIdentifier(n.expression) && n.expression.text === 'require'))) {
      const a = n.arguments[0];
      if (a && ts.isStringLiteralLike(a)) out.push(a.text);
    }
    ts.forEachChild(n, visit);
  };
  visit(sf);
  return out;
}

/** What one file breaks, given the seed's strings. */
export function violationsIn(file: string, source: string, seeded: ReadonlySet<string>): Violation[] {
  const out: Violation[] = [];
  for (const spec of importsOf(source, file)) if (FORBIDDEN_IMPORT.test(spec)) out.push({ file, kind: 'import', detail: spec });
  const literals = literalsOf(source, file);
  for (const s of seeded) {
    if (UI_LABEL_TEXTS.has(s)) continue;
    const hit = literals.find((l) => l.includes(s));
    if (hit) out.push({ file, kind: 'literal', detail: s });
  }
  return out;
}

describe('the copy guard (D-173): course content is data, never code', () => {
  const seeded = seedStrings();

  it('knows the course: hundreds of seed strings, including every week title, question and session title', () => {
    expect(seeded.size).toBeGreaterThan(300);
    const db = curriculumSeed();
    for (const m of db.modules) {
      expect(seeded.has(m.course!.question.replace(/\s+/g, ' ').trim()), m.id).toBe(true);
      for (const s of m.checklist) if (s.text.length >= MIN) expect(seeded.has(s.text.replace(/\s+/g, ' ').trim()), s.text).toBe(true);
    }
    for (const s of db.sessions) if (s.title.length >= MIN) expect(seeded.has(s.title), s.title).toBe(true);
    expect(seeded.has('Not included with Utah Life access')).toBe(true);
  });

  it('is red on a planted literal, a planted JSX line and a planted import', () => {
    const question = curriculumSeed().modules[1]!.course!.question;
    expect(violationsIn('planted.ts', `export const q = ${JSON.stringify(question)};`, seeded)).toEqual([{ file: 'planted.ts', kind: 'literal', detail: question }]);
    expect(violationsIn('planted.tsx', `export const C = () => <h2>Week 1. ${question}</h2>;`, seeded).map((v) => v.kind)).toEqual(['literal']);
    expect(violationsIn('planted.ts', "import { ACCELERATOR_WEEKS_CONTENT } from '@ai/core/seed/accelerator-v1';", seeded).map((v) => v.kind)).toEqual(['import']);
    expect(violationsIn('planted.ts', "export * from '../seed/curriculum';", seeded).map((v) => v.kind)).toEqual(['import']);
    expect(violationsIn('planted.ts', "const m = await import('./accelerator-content');", seeded).map((v) => v.kind)).toEqual(['import']);
    // The demo seed (`src/seed.ts`) is the prototype's sales demo, not the course, and stays importable.
    expect(violationsIn('planted.ts', "import { seed } from './seed';", seeded)).toEqual([]);
  });

  it('finds no runtime file importing the seed or holding a seed string', () => {
    const files = runtimeFiles();
    expect(files.length).toBeGreaterThan(100);
    const found = files
      .map((f) => [f, relative(ROOT, f).split(sep).join('/')] as const)
      .filter(([, rel]) => !excepted(rel))
      .flatMap(([f, rel]) => violationsIn(rel, readFileSync(f, 'utf8'), seeded));
    expect(found).toEqual([]);
  });

  it('keeps every allowlisted string generic, and every dated exception dated', () => {
    for (const t of UI_LABEL_TEXTS) expect(t.length, t).toBeLessThanOrEqual(60);
    for (const e of DATED_EXCEPTIONS) expect(e.until, e.path).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
});
