// The library's Grok Bot templates (DECISIONS.md D-100): check each finished template in
// `content/grok-bot-templates/` and package it into the one ZIP its page offers. They are Grok Bot
// skills, not Claude Skills, so `scripts/skills.mjs` does not pack them; this script reuses only its
// ZIP writer, so the archives are deterministic the same way (sorted entries, one fixed timestamp).
//
//   node scripts/grok-templates.mjs check [id ...]   validate, print every problem, exit 1 on any error
//   node scripts/grok-templates.mjs build [id ...]   validate, then write apps/web/public/downloads/<id>.zip
//   node scripts/grok-templates.mjs shell [id ...]   write each template page's HTML shell, apps/web/<id>.html
//   node scripts/grok-templates.mjs list             every template, with its collection
//
// The templates' words are the source of truth (the PM's 2026-11-10 handoff): this checks their
// shape and the house rule on dashes, and never rewrites them. The drift test
// (`apps/web/src/guides/grok-templates.test.ts`) holds every committed ZIP and shell to this file.

import { existsSync, readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { DOWNLOADS_DIR, ROOT, shellFor, zip } from './skills.mjs';

export const TEMPLATES_DIR = join(ROOT, 'content', 'grok-bot-templates');
export const COLLECTIONS = ['bookkeeping', 'transactions'];

const DASHES = /[–—]/;
/** The sections every template has, in this order (the README's last paragraph). */
const SECTIONS = ['Who it\'s for', 'What it connects to', 'Guardrails', 'Setup questions', 'Recommended routine', 'Procedure', 'Output format', 'Sample output (EXAMPLE DATA ONLY)'];

/** Every template, as `{ id, collection }`, in folder order within each collection. */
export function listTemplates() {
  return COLLECTIONS.flatMap((collection) => {
    const dir = join(TEMPLATES_DIR, collection);
    if (!existsSync(dir)) return [];
    return readdirSync(dir)
      .filter((id) => statSync(join(dir, id)).isDirectory())
      .sort()
      .map((id) => ({ id, collection }));
  });
}

export function templatePath(id) {
  const found = listTemplates().find((t) => t.id === id);
  if (!found) throw new Error(`${id}: no such template in content/grok-bot-templates/`);
  return join(TEMPLATES_DIR, found.collection, id, 'SKILL.md');
}

/** The frontmatter's `name` and `description` (a plain or folded `>-` scalar), or null. */
export function frontmatterOf(text) {
  const m = /^---\n([\s\S]*?)\n---\n/.exec(text);
  if (!m) return null;
  const lines = m[1].split('\n');
  const out = {};
  for (let i = 0; i < lines.length; i++) {
    const kv = /^([a-z-]+):\s*(.*)$/.exec(lines[i]);
    if (!kv) continue;
    let value = kv[2];
    if (value === '>-' || value === '>' || value === '|') {
      const block = [];
      while (i + 1 < lines.length && /^\s+\S/.test(lines[i + 1])) block.push(lines[++i].trim());
      value = block.join(' ');
    }
    out[kv[1]] = value.replace(/^["']|["']$/g, '');
  }
  return out;
}

export function check(id) {
  const errors = [];
  const err = (m) => errors.push(`${id}: ${m}`);
  let text;
  try {
    text = readFileSync(templatePath(id), 'utf8');
  } catch (e) {
    return { errors: [`${id}: ${e.message}`] };
  }
  const fm = frontmatterOf(text);
  if (!fm) err('SKILL.md has no frontmatter between --- lines');
  else {
    if (!fm.name) err('frontmatter needs a name');
    if (!fm.description) err('frontmatter needs a description');
  }
  const lines = text.split('\n');
  lines.forEach((line, i) => {
    if (DASHES.test(line)) err(`line ${i + 1} has an em or en dash (the house rule)`);
  });
  const headings = lines.filter((l) => l.startsWith('## ')).map((l) => l.slice(3));
  let at = -1;
  for (const s of SECTIONS) {
    const i = headings.findIndex((h, k) => k > at && h.startsWith(s));
    if (i < 0) err(`no "## ${s}" section after the ones before it`);
    else at = i;
  }
  const routine = sectionOf(text, 'Recommended routine');
  if (!/\*\*Schedule:\*\*/.test(routine)) err('the routine has no **Schedule:** line');
  if (!/\*\*Cron \([^)]*\):\*\* `[^`]+`/.test(routine)) err('the routine has no **Cron (...):** line');
  if (!/\*\*Routine prompt to save:\*\*\s*\n+```\n[\s\S]+?\n```/.test(routine)) err('the routine has no prompt to save in a code block');
  return { errors };
}

/** A `## heading` section's text, without its heading, up to the next `## `. */
export function sectionOf(text, heading) {
  const lines = text.split('\n');
  const start = lines.findIndex((l) => l.startsWith(`## ${heading}`));
  if (start < 0) return '';
  const rest = lines.slice(start + 1);
  const end = rest.findIndex((l) => l.startsWith('## '));
  return (end < 0 ? rest : rest.slice(0, end)).join('\n');
}

/** What `build` writes for a template: one ZIP holding its SKILL.md, in a folder named for it. */
export function expected(id) {
  return [{ file: `${id}.zip`, entries: [{ path: `${id}/SKILL.md`, data: readFileSync(templatePath(id)) }] }];
}

export function build(id) {
  return expected(id).map(({ file, entries }) => {
    const buf = zip(entries);
    writeFileSync(join(DOWNLOADS_DIR, file), buf);
    return { file, bytes: buf.length };
  });
}

/**
 * A template page's HTML shell: the skill pages' (`shellFor` in `scripts/skills.mjs`), the same
 * markers and stylesheet, with its own comment, so the shell says which script writes it.
 */
export function grokShellFor(page) {
  return shellFor(page)
    .replace(`<!-- /${page}, a free skill's landing page (DECISIONS.md D-052). A shell, the same for every\n         skill page but its path:`, `<!-- /${page}, a Grok Bot template's page (DECISIONS.md D-100). A shell, the same for every\n         template page but its path:`)
    .replace('Written by `node scripts/skills.mjs shell`', 'Written by `node scripts/grok-templates.mjs shell`');
}

export const grokShellPath = (page) => join(ROOT, 'apps', 'web', `${page}.html`);

// --- CLI -------------------------------------------------------------------------------------------

function main(argv) {
  const [command = 'check', ...ids] = argv;
  const targets = ids.length ? ids : listTemplates().map((t) => t.id);
  if (command === 'list') {
    for (const t of listTemplates()) console.log(`${t.id}  collection=${t.collection}`);
    return 0;
  }
  if (command === 'shell') {
    for (const id of targets) {
      writeFileSync(grokShellPath(id), grokShellFor(id));
      console.log(`shell    apps/web/${id}.html`);
    }
    return 0;
  }
  if (command !== 'check' && command !== 'build') {
    console.error('usage: node scripts/grok-templates.mjs check|build|shell|list [id ...]');
    return 2;
  }
  let failed = false;
  for (const id of targets) {
    const { errors } = check(id);
    for (const e of errors) console.error(`error    ${e}`);
    if (errors.length) {
      failed = true;
      continue;
    }
    if (command === 'build') for (const { file, bytes } of build(id)) console.log(`built    ${file} (${bytes} bytes)`);
    else console.log(`ok       ${id}`);
  }
  return failed ? 1 : 0;
}

/** Whether this file is the script being run, rather than a module a test imported. */
function isMain() {
  try {
    return Boolean(process.argv[1]) && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
  } catch {
    return false;
  }
}

if (isMain()) process.exit(main(process.argv.slice(2)));
