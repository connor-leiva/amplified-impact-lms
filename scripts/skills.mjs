// The free library's skills: check each source folder in `skills/` against Anthropic's skill format and
// the house rules, and package it into the files its page offers (`skills/README.md` has the layout).
//
//   node scripts/skills.mjs check [name ...]   validate, print every problem, exit 1 on any error
//   node scripts/skills.mjs build [name ...]   validate, then write apps/web/public/downloads/<name>*.zip
//   node scripts/skills.mjs shell [name ...]   write each skill page's HTML shell, apps/web/<page>.html
//   node scripts/skills.mjs list               every skill, with its page and apps
//
// A skill whose manifest sets `"pageKit": true` hands back a page (HTML-BRIEF.md): its Claude ZIP also
// holds the shared page kit's files from `skills/_page-kit/` (`PAGE_KIT_FILES` below), and its ChatGPT
// ZIP holds `page-kit.md`, the kit packed into one markdown file by `_page-kit/scripts/
// make_chatgpt_kit.py`, as one of its 4 files. The kit lives in one place, like `_shared/`, so a
// skill's copy can never drift from it, and `_page-kit` is never a skill.
//
// A skill whose manifest lists `grok` (Morning Brief, D-108) also ships a Grok Bot template from
// `grok/SKILL.md`, in the Grok Bot templates' shape (D-100, `grokTemplateErrors` below), as
// `<name>-grok.zip`. The Grok Bot shelf's own templates in content/grok-bot-templates/ are
// `scripts/grok-templates.mjs`'s, which shares that shape check.
//
// No dependencies: a ZIP is written and read here with node:zlib, so the drift test
// (`apps/web/src/guides/skills.test.ts`) can unpack a committed download and hold every entry to its
// source without a package. The archives are deterministic (sorted entries, one fixed timestamp), so a
// rebuild with no source change writes the same bytes on the same Node.

import { deflateRawSync, inflateRawSync, crc32 } from 'node:zlib';
import { existsSync, readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { dirname, join, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

/**
 * The repository's root. From this file's own URL when it is a file URL; a test runner that serves
 * files from outside its root can hand the module another scheme, so then from the working directory
 * up, to the folder that holds `skills/README.md`.
 */
function rootDir() {
  try {
    return resolve(dirname(fileURLToPath(import.meta.url)), '..');
  } catch {
    let dir = process.cwd();
    while (!existsSync(join(dir, 'skills', 'README.md')) && dirname(dir) !== dir) dir = dirname(dir);
    return dir;
  }
}

export const ROOT = rootDir();
export const SKILLS_DIR = join(ROOT, 'skills');
export const SHARED_DIR = join(SKILLS_DIR, '_shared');
export const PAGE_KIT_DIR = join(SKILLS_DIR, '_page-kit');
export const DOWNLOADS_DIR = join(ROOT, 'apps', 'web', 'public', 'downloads');

/** Frontmatter keys Anthropic's skill format allows (the Agent Skills spec and skill-creator's validator). */
const ALLOWED_KEYS = new Set(['name', 'description', 'license', 'allowed-tools', 'metadata', 'compatibility']);
/** Never shipped in the Claude skill: the build's own files and the other downloads' sources. */
const NOT_IN_SKILL = new Set(['skill.json', 'chatgpt', 'grok', 'practice', 'evals', 'sample.md', 'page-notes.md']);
/** Never shipped anywhere. */
const JUNK = new Set(['.DS_Store', '__pycache__', 'Thumbs.db', '.git']);
const TEXT = /\.(md|txt|json|ya?ml|py|sh|js|mjs|ts|css|html|csv|tsv)$/i;
const DASHES = /[–—]/;
const MAX_LINES = 500;
/**
 * What a skill with `"pageKit": true` ships from `_page-kit/`, at the same path inside the skill: the
 * build, the template, its embedded fonts and their license, and the page format the model reads.
 */
export const PAGE_KIT_FILES = [
  'scripts/build_page.py',
  'assets/base-template.html',
  'assets/fonts.css',
  'assets/FONT-LICENSE.txt',
  'references/page-format.md',
];
/** The kit for a ChatGPT Project: one markdown file, shipped as `<name>-chatgpt/page-kit.md`. */
export const PAGE_KIT_CHATGPT = 'chatgpt-kit/page-kit.md';

const HOUSE_LINES = 150;

/** Every skill folder: each directory in `skills/` whose name does not start with `_`. */
export function listSkills() {
  return readdirSync(SKILLS_DIR, { withFileTypes: true })
    .filter((d) => d.isDirectory() && !d.name.startsWith('_') && !d.name.startsWith('.'))
    .map((d) => d.name)
    .sort();
}

export function readManifest(name) {
  return JSON.parse(readFileSync(join(SKILLS_DIR, name, 'skill.json'), 'utf8'));
}

/** Files under `dir`, relative to it, with `/` separators, sorted, junk left out. */
function walk(dir, skipTop = new Set()) {
  const out = [];
  const visit = (abs, top) => {
    for (const entry of readdirSync(abs, { withFileTypes: true })) {
      if (JUNK.has(entry.name)) continue;
      if (top && skipTop.has(entry.name)) continue;
      const path = join(abs, entry.name);
      if (entry.isDirectory()) visit(path, false);
      else if (entry.isFile()) out.push(relative(dir, path).split(sep).join('/'));
    }
  };
  if (existsSync(dir)) visit(dir, true);
  return out.sort();
}

/**
 * The downloads of one skill, each as the list of entries it must hold: `{ path, abs }`, where `path`
 * is the name inside the ZIP. `chatgpt`, `grok` and `practice` are null when the skill has none. The
 * Grok Bot template (D-108) is one file, `grok/SKILL.md`, in a folder named `<name>-grok/`, so it never
 * unpacks over the Claude skill's own `<name>/SKILL.md`.
 */
export function plan(name) {
  const dir = join(SKILLS_DIR, name);
  const manifest = readManifest(name);
  const skill = walk(dir, NOT_IN_SKILL).map((rel) => ({ path: `${name}/${rel}`, abs: join(dir, rel) }));
  for (const file of manifest.shared ?? []) {
    skill.push({ path: `${name}/references/${file}`, abs: join(SHARED_DIR, file) });
  }
  if (manifest.pageKit === true) {
    for (const rel of PAGE_KIT_FILES) skill.push({ path: `${name}/${rel}`, abs: join(PAGE_KIT_DIR, rel) });
  }
  skill.sort((a, b) => (a.path < b.path ? -1 : 1));

  const chatgptDir = join(dir, 'chatgpt');
  const chatgpt = existsSync(chatgptDir)
    ? walk(chatgptDir).map((rel) => ({
        path: `${name}-chatgpt/${chatgptName(name, rel)}`,
        abs: join(chatgptDir, rel),
      }))
    : null;
  if (chatgpt && manifest.pageKit === true) {
    chatgpt.push({ path: `${name}-chatgpt/page-kit.md`, abs: join(PAGE_KIT_DIR, PAGE_KIT_CHATGPT) });
    chatgpt.sort((a, b) => (a.path < b.path ? -1 : 1));
  }

  const grokFile = join(dir, 'grok', 'SKILL.md');
  const grok = existsSync(join(dir, 'grok')) ? [{ path: `${name}-grok/SKILL.md`, abs: grokFile }] : null;

  const practiceDir = join(dir, 'practice');
  const practice = existsSync(practiceDir)
    ? walk(practiceDir).map((rel) => ({ path: `${name}-practice/${rel}`, abs: join(practiceDir, rel) }))
    : null;

  return {
    manifest,
    skill: { file: `${name}.zip`, entries: skill },
    chatgpt: chatgpt && { file: `${name}-chatgpt.zip`, entries: chatgpt },
    grok: grok && { file: `${name}-grok.zip`, entries: grok },
    practice: practice && { file: `${name}-practice.zip`, entries: practice },
  };
}

/** What a ChatGPT file is called once it ships: the instructions carry the skill's name. */
function chatgptName(name, rel) {
  if (rel === 'instructions.md') return `${name}-instructions.md`;
  if (rel === 'paste.txt') return 'paste-into-instructions.txt';
  return rel;
}

// --- frontmatter -----------------------------------------------------------------------------------

/**
 * The YAML frontmatter of a SKILL.md, for the shapes skills use: top-level `key: value` (plain, single-
 * or double-quoted, or a `>`/`|` block) and one level of nested `key: value` under a key with no value.
 */
export function frontmatter(text) {
  const match = /^---\r?\n([\s\S]*?)\r?\n---\r?\n/.exec(text);
  if (!match) return null;
  const lines = match[1].split(/\r?\n/);
  const data = {};
  let current = null;
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (line.trim() === '' || line.trim().startsWith('#')) continue;
    const top = /^([A-Za-z][\w-]*):\s*(.*)$/.exec(line);
    if (top) {
      const [, key, raw] = top;
      if (raw === '') {
        data[key] = {};
        current = key;
        continue;
      }
      current = null;
      if (raw === '>' || raw === '|' || raw === '>-' || raw === '|-') {
        const block = [];
        while (i + 1 < lines.length && /^\s+/.test(lines[i + 1])) block.push(lines[++i].trim());
        data[key] = raw.startsWith('>') ? block.join(' ') : block.join('\n');
      } else data[key] = scalar(raw);
      continue;
    }
    const nested = /^\s+([A-Za-z][\w-]*):\s*(.*)$/.exec(line);
    if (nested && current) data[current][nested[1]] = scalar(nested[2]);
  }
  return { data, body: text.slice(match[0].length), unsafe: unsafePlainScalars(lines) };
}

/**
 * Values a real YAML parser rejects or misreads, though the reader above takes them: an unquoted value
 * that holds ": " or " #", or starts with a character YAML gives a meaning to. Claude's uploader parses
 * the frontmatter as YAML, so such a description fails the upload (found in review, D-052).
 */
function unsafePlainScalars(lines) {
  const bad = [];
  for (const line of lines) {
    const m = /^\s*([A-Za-z][\w-]*):\s+(.+)$/.exec(line);
    if (!m) continue;
    const v = m[2].trim();
    if (/^["']/.test(v) || v === '>' || v === '|' || v === '>-' || v === '|-') continue;
    if (/: |\s#|^[[\]{}&*!|>%@`,?-]\s?/.test(v) || v.endsWith(':')) bad.push(m[1]);
  }
  return bad;
}

function scalar(raw) {
  const v = raw.trim();
  if (v.startsWith('"') && v.endsWith('"')) return v.slice(1, -1).replace(/\\"/g, '"');
  if (v.startsWith("'") && v.endsWith("'")) return v.slice(1, -1).replace(/''/g, "'");
  return v;
}

// --- checks ----------------------------------------------------------------------------------------

/** Every problem with one skill: `errors` block a build, `warnings` do not. */
export function check(name) {
  const errors = [];
  const warnings = [];
  const dir = join(SKILLS_DIR, name);
  const err = (m) => errors.push(`${name}: ${m}`);
  const warn = (m) => warnings.push(`${name}: ${m}`);

  if (!existsSync(join(dir, 'skill.json'))) {
    err('no skill.json');
    return { errors, warnings };
  }
  let manifest;
  try {
    manifest = readManifest(name);
  } catch (e) {
    err(`skill.json is not JSON: ${e.message}`);
    return { errors, warnings };
  }
  if (manifest.name !== name) err(`skill.json name "${manifest.name}" is not the folder name`);
  if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(manifest.page ?? '')) err('skill.json page must be a lowercase slug');
  if (typeof manifest.title !== 'string' || manifest.title.trim() === '') err('skill.json needs a title');
  if (!/^\d+\.\d+(\.\d+)?$/.test(manifest.version ?? '')) err('skill.json version must look like 1.0');
  const apps = manifest.apps ?? [];
  if (!apps.includes('claude')) err('skill.json apps must include "claude"');
  const hasChatgpt = existsSync(join(dir, 'chatgpt'));
  if (apps.includes('chatgpt') !== hasChatgpt) err('skill.json apps lists "chatgpt" exactly when chatgpt/ exists');
  const hasGrok = existsSync(join(dir, 'grok'));
  if (apps.includes('grok') !== hasGrok) err('skill.json apps lists "grok" exactly when grok/ exists');
  for (const file of manifest.shared ?? []) {
    if (!existsSync(join(SHARED_DIR, file))) err(`shared reference ${file} is not in skills/_shared/`);
    if (existsSync(join(dir, 'references', file))) err(`references/${file} would be overwritten by the shared copy`);
  }
  if (manifest.pageKit !== undefined && typeof manifest.pageKit !== 'boolean') err('skill.json pageKit must be true or false');
  const pageKit = manifest.pageKit === true;
  if (pageKit) {
    for (const rel of PAGE_KIT_FILES) {
      if (existsSync(join(dir, rel))) err(`${rel} would be overwritten by the page kit's copy: keep it only in skills/_page-kit/`);
    }
    if (existsSync(join(dir, 'chatgpt', 'page-kit.md'))) err('chatgpt/page-kit.md would be overwritten by the page kit\'s copy');
    for (const m of pageKitErrors()) err(`page kit: ${m}`);
  }

  // SKILL.md
  const skillPath = join(dir, 'SKILL.md');
  if (!existsSync(skillPath)) {
    err('no SKILL.md at the folder root');
    return { errors, warnings };
  }
  const text = readFileSync(skillPath, 'utf8');
  const fm = frontmatter(text);
  if (!fm) err('SKILL.md has no YAML frontmatter between --- lines');
  else {
    const { data, body } = fm;
    for (const key of fm.unsafe) err(`frontmatter "${key}" is not valid YAML unquoted (it holds ": ", " #" or a leading symbol): put it in double quotes`);
    for (const key of Object.keys(data)) if (!ALLOWED_KEYS.has(key)) err(`frontmatter key "${key}" is not allowed`);
    if (data.name !== name) err(`frontmatter name "${data.name}" must equal the folder name`);
    if (typeof data.name === 'string') {
      if (data.name.length > 64) err('name is over 64 characters');
      if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(data.name)) err('name must be lowercase letters, numbers and hyphens');
      if (/claude|anthropic/i.test(data.name)) err('name must not contain "claude" or "anthropic"');
    }
    const d = data.description;
    if (typeof d !== 'string' || d.trim() === '') err('description is missing');
    else {
      if (d.length > 1024) err(`description is ${d.length} characters (1,024 max)`);
      if (/[<>]/.test(d)) err('description has an angle bracket');
    }
    if (data.compatibility !== undefined && String(data.compatibility).length > 500) err('compatibility is over 500 characters');
    if (typeof data.metadata !== 'object' || data.metadata === null) err('frontmatter needs metadata (author, version)');
    else {
      if (data.metadata.author !== 'Amplified Impact') err('metadata.author must be "Amplified Impact"');
      if (data.metadata.version !== manifest.version) err(`metadata.version "${data.metadata.version}" differs from skill.json "${manifest.version}"`);
    }
    const lines = body.split('\n').length;
    if (lines > MAX_LINES) err(`SKILL.md body is ${lines} lines (500 max)`);
    else if (lines > HOUSE_LINES + 20) warn(`SKILL.md body is ${lines} lines (house target about ${HOUSE_LINES})`);
  }

  if (pageKit) {
    for (const named of ['scripts/build_page.py', 'references/page-format.md']) {
      if (!text.includes(named)) err(`SKILL.md must name ${named} (its "Hand It Back As A Page" step)`);
    }
  }

  // Every shipped file and every source file: no dashes, and references the SKILL.md names exist.
  const p = plan(name);
  const shipped = new Set(p.skill.entries.map((e) => e.path.slice(name.length + 1)));
  for (const ref of new Set(text.match(/references\/[\w.-]+\.md/g) ?? [])) {
    if (!shipped.has(ref)) err(`SKILL.md names ${ref}, which the skill does not ship`);
  }
  // A shipped reference that points to a shared one by name ("use `utah-repc-2026.md` instead") must
  // ship it too, or the pointer leads nowhere inside the installed skill.
  const shared = new Set(existsSync(SHARED_DIR) ? readdirSync(SHARED_DIR).filter((f) => f.endsWith('.md')) : []);
  for (const entry of p.skill.entries) {
    if (!entry.path.endsWith('.md')) continue;
    for (const [, named] of readFileSync(entry.abs, 'utf8').matchAll(/`([\w.-]+\.md)`/g)) {
      if (shared.has(named) && !shipped.has(`references/${named}`)) {
        err(`${entry.path.slice(name.length + 1)} names ${named}, a shared reference the skill does not ship: add it to skill.json shared`);
      }
    }
  }
  const all = [
    ...p.skill.entries,
    ...(p.chatgpt?.entries ?? []),
    ...(p.grok?.entries ?? []),
    ...(p.practice?.entries ?? []),
    ...walk(join(dir, 'evals')).map((rel) => ({ path: `evals/${rel}`, abs: join(dir, 'evals', rel) })),
    ...['sample.md', 'page-notes.md'].filter((f) => existsSync(join(dir, f))).map((f) => ({ path: f, abs: join(dir, f) })),
  ];
  for (const { path, abs } of all) {
    if (!TEXT.test(path)) continue;
    const t = readFileSync(abs, 'utf8');
    if (DASHES.test(t)) err(`${path} has an em or en dash`);
  }

  // The ChatGPT version.
  if (hasChatgpt) {
    const files = walk(join(dir, 'chatgpt'));
    if (!files.includes('instructions.md')) err('chatgpt/ needs instructions.md');
    if (!files.includes('paste.txt')) err('chatgpt/ needs paste.txt');
    else {
      const paste = readFileSync(join(dir, 'chatgpt', 'paste.txt'), 'utf8');
      if (paste.length > 1000) err(`chatgpt/paste.txt is ${paste.length} characters (1,000 max)`);
      if (!paste.includes(`${name}-instructions.md`)) err(`chatgpt/paste.txt must name ${name}-instructions.md`);
    }
    // The page kit's page-kit.md is one of the 4 when the skill hands back a page.
    const uploads = [...files.filter((f) => f !== 'paste.txt'), ...(pageKit ? ['page-kit.md'] : [])];
    if (uploads.length > 4) err(`chatgpt/ has ${uploads.length} files to upload${pageKit ? ', counting page-kit.md,' : ''} (4 max, to fit ChatGPT Free's 5)`);
    for (const f of uploads) if (!f.endsWith('.md') || f.includes('/')) err(`chatgpt/${f} must be a top-level .md file`);
    const instr = files.includes('instructions.md') ? readFileSync(join(dir, 'chatgpt', 'instructions.md'), 'utf8') : '';
    if (/\bClaude\b|SKILL\.md|references\//.test(instr)) err('chatgpt/instructions.md mentions Claude, SKILL.md or references/');
    if (pageKit && !instr.includes('page-kit.md')) err('chatgpt/instructions.md must name page-kit.md, which builds the page');
  }

  // The Grok Bot template (D-108): one SKILL.md in the Grok Bot templates' shape (D-100).
  if (hasGrok) {
    const files = walk(join(dir, 'grok'));
    if (files.join() !== 'SKILL.md') err(`grok/ must hold only SKILL.md (it holds ${files.join(', ') || 'nothing'})`);
    if (existsSync(join(dir, 'grok', 'SKILL.md'))) {
      for (const m of grokTemplateErrors(readFileSync(join(dir, 'grok', 'SKILL.md'), 'utf8'))) err(`grok/SKILL.md: ${m}`);
    }
  }

  // Practice, evals, sample, page notes.
  if (!p.practice || p.practice.entries.length === 0) err('practice/ is missing or empty');
  const evalsPath = join(dir, 'evals', 'evals.json');
  if (!existsSync(evalsPath)) err('evals/evals.json is missing');
  else {
    try {
      const evals = JSON.parse(readFileSync(evalsPath, 'utf8'));
      if (evals.skill_name !== name) err('evals.json skill_name must equal the folder name');
      if (!Array.isArray(evals.evals) || evals.evals.length < 2) err('evals.json needs at least two cases');
      for (const e of evals.evals ?? []) {
        for (const f of e.files ?? []) if (!existsSync(join(dir, f))) err(`eval ${e.id} names ${f}, which does not exist`);
        if (!Array.isArray(e.expectations) || e.expectations.length === 0) err(`eval ${e.id} has no expectations`);
      }
    } catch (e) {
      err(`evals.json is not JSON: ${e.message}`);
    }
  }
  if (!existsSync(join(dir, 'sample.md'))) err('sample.md is missing');
  if (!existsSync(join(dir, 'page-notes.md'))) err('page-notes.md is missing');
  return { errors, warnings };
}

// --- the page kit ----------------------------------------------------------------------------------

/**
 * Every way `skills/_page-kit/` is not fit to ship: a kit file missing, a dash in one, or a
 * `page-kit.md` that no longer holds today's `build_page.py` and `base-template.html` word for word
 * (rebuild it with `python3 skills/_page-kit/scripts/make_chatgpt_kit.py`).
 */
export function pageKitErrors() {
  const errors = [];
  for (const rel of [...PAGE_KIT_FILES, PAGE_KIT_CHATGPT]) {
    const abs = join(PAGE_KIT_DIR, rel);
    if (!existsSync(abs)) errors.push(`skills/_page-kit/${rel} is missing`);
    else if (TEXT.test(rel) && DASHES.test(readFileSync(abs, 'utf8'))) errors.push(`skills/_page-kit/${rel} has an em or en dash`);
  }
  const md = join(PAGE_KIT_DIR, PAGE_KIT_CHATGPT);
  if (existsSync(md)) {
    const text = readFileSync(md, 'utf8');
    for (const [lang, rel] of [['python', 'scripts/build_page.py'], ['html', 'assets/base-template.html']]) {
      const block = new RegExp(`^~~~~~~${lang}\\n([\\s\\S]*?)\\n~~~~~~$`, 'm').exec(text);
      const source = existsSync(join(PAGE_KIT_DIR, rel)) ? readFileSync(join(PAGE_KIT_DIR, rel), 'utf8').trimEnd() : null;
      if (!block || block[1] !== source) {
        errors.push(`${PAGE_KIT_CHATGPT} does not hold today's ${rel}: run python3 skills/_page-kit/scripts/make_chatgpt_kit.py`);
      }
    }
  }
  return errors;
}

// --- Grok Bot templates ------------------------------------------------------------------------------
//
// The shape every Grok Bot template has (D-100): the shelf's templates in content/grok-bot-templates/
// (`scripts/grok-templates.mjs`) and a skill's own `grok/SKILL.md` (D-108). Here, not there, so this
// file never imports that one, which imports this.

/** The sections every template has, in this order (the Grok Bot templates README's last paragraph). */
export const GROK_SECTIONS = ['Who it\'s for', 'What it connects to', 'Guardrails', 'Setup questions', 'Recommended routine', 'Procedure', 'Output format', 'Sample output (EXAMPLE DATA ONLY)'];

/** A template's frontmatter `name` and `description` (a plain or folded `>-` scalar), or null. */
export function grokFrontmatter(text) {
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

/** A `## heading` section's text, without its heading, up to the next `## `. */
export function grokSection(text, heading) {
  const lines = text.split('\n');
  const start = lines.findIndex((l) => l.startsWith(`## ${heading}`));
  if (start < 0) return '';
  const rest = lines.slice(start + 1);
  const end = rest.findIndex((l) => l.startsWith('## '));
  return (end < 0 ? rest : rest.slice(0, end)).join('\n');
}

/** Every way a template's text breaks the shape: its frontmatter, the dash rule, its sections and its routine. */
export function grokTemplateErrors(text) {
  const errors = [];
  const fm = grokFrontmatter(text);
  if (!fm) errors.push('SKILL.md has no frontmatter between --- lines');
  else {
    if (!fm.name) errors.push('frontmatter needs a name');
    if (!fm.description) errors.push('frontmatter needs a description');
  }
  const lines = text.split('\n');
  lines.forEach((line, i) => {
    if (DASHES.test(line)) errors.push(`line ${i + 1} has an em or en dash (the house rule)`);
  });
  const headings = lines.filter((l) => l.startsWith('## ')).map((l) => l.slice(3));
  let at = -1;
  for (const s of GROK_SECTIONS) {
    const i = headings.findIndex((h, k) => k > at && h.startsWith(s));
    if (i < 0) errors.push(`no "## ${s}" section after the ones before it`);
    else at = i;
  }
  const routine = grokSection(text, 'Recommended routine');
  if (!/\*\*Schedule:\*\*/.test(routine)) errors.push('the routine has no **Schedule:** line');
  if (!/\*\*Cron \([^)]*\):\*\* `[^`]+`/.test(routine)) errors.push('the routine has no **Cron (...):** line');
  if (!/\*\*Routine prompt to save:\*\*\s*\n+```\n[\s\S]+?\n```/.test(routine)) errors.push('the routine has no prompt to save in a code block');
  return errors;
}

// --- ZIP -------------------------------------------------------------------------------------------

/** 2026-01-01 00:00, in DOS format: every entry's timestamp, so a rebuild changes nothing. */
const DOS_TIME = 0;
const DOS_DATE = ((2026 - 1980) << 9) | (1 << 5) | 1;

/** A ZIP of `entries` (`{ path, data }`), with a directory entry for each folder, deflated. */
export function zip(entries) {
  const files = new Map();
  for (const { path, data } of entries) {
    const parts = path.split('/');
    for (let i = 1; i < parts.length; i++) {
      const d = `${parts.slice(0, i).join('/')}/`;
      if (!files.has(d)) files.set(d, Buffer.alloc(0));
    }
    files.set(path, data);
  }
  const names = [...files.keys()].sort();
  const local = [];
  const central = [];
  let offset = 0;
  for (const name of names) {
    const data = files.get(name);
    const isDir = name.endsWith('/');
    const nameBuf = Buffer.from(name, 'utf8');
    const deflated = isDir ? data : deflateRawSync(data, { level: 9 });
    const method = isDir ? 0 : 8;
    const crc = isDir ? 0 : crc32(data);
    const header = Buffer.alloc(30);
    header.writeUInt32LE(0x04034b50, 0);
    header.writeUInt16LE(20, 4);
    header.writeUInt16LE(0x0800, 6); // UTF-8 names
    header.writeUInt16LE(method, 8);
    header.writeUInt16LE(DOS_TIME, 10);
    header.writeUInt16LE(DOS_DATE, 12);
    header.writeUInt32LE(crc, 14);
    header.writeUInt32LE(deflated.length, 18);
    header.writeUInt32LE(data.length, 22);
    header.writeUInt16LE(nameBuf.length, 26);
    header.writeUInt16LE(0, 28);
    local.push(header, nameBuf, deflated);

    const dirEntry = Buffer.alloc(46);
    dirEntry.writeUInt32LE(0x02014b50, 0);
    dirEntry.writeUInt16LE(0x031e, 4); // made by: Unix, spec 3.0
    dirEntry.writeUInt16LE(20, 6);
    dirEntry.writeUInt16LE(0x0800, 8);
    dirEntry.writeUInt16LE(method, 10);
    dirEntry.writeUInt16LE(DOS_TIME, 12);
    dirEntry.writeUInt16LE(DOS_DATE, 14);
    dirEntry.writeUInt32LE(crc, 16);
    dirEntry.writeUInt32LE(deflated.length, 20);
    dirEntry.writeUInt32LE(data.length, 24);
    dirEntry.writeUInt16LE(nameBuf.length, 28);
    dirEntry.writeUInt32LE(isDir ? ((0o40755 << 16) | 0x10) >>> 0 : (0o100644 << 16) >>> 0, 38);
    dirEntry.writeUInt32LE(offset, 42);
    central.push(dirEntry, nameBuf);
    offset += header.length + nameBuf.length + deflated.length;
  }
  const centralBuf = Buffer.concat(central);
  const end = Buffer.alloc(22);
  end.writeUInt32LE(0x06054b50, 0);
  end.writeUInt16LE(names.length, 8);
  end.writeUInt16LE(names.length, 10);
  end.writeUInt32LE(centralBuf.length, 12);
  end.writeUInt32LE(offset, 16);
  return Buffer.concat([...local, centralBuf, end]);
}

/** The file entries of a ZIP (directories left out) and each one's contents. No ZIP64, no encryption. */
export function unzip(buf) {
  const eocd = buf.lastIndexOf(Buffer.from([0x50, 0x4b, 0x05, 0x06]));
  if (eocd < 0) throw new Error('not a ZIP: no end of central directory');
  const count = buf.readUInt16LE(eocd + 10);
  let p = buf.readUInt32LE(eocd + 16);
  const out = new Map();
  for (let i = 0; i < count; i++) {
    if (buf.readUInt32LE(p) !== 0x02014b50) throw new Error('bad central directory');
    const method = buf.readUInt16LE(p + 10);
    const size = buf.readUInt32LE(p + 20);
    const nameLen = buf.readUInt16LE(p + 28);
    const extraLen = buf.readUInt16LE(p + 30);
    const commentLen = buf.readUInt16LE(p + 32);
    const localAt = buf.readUInt32LE(p + 42);
    const name = buf.toString('utf8', p + 46, p + 46 + nameLen);
    p += 46 + nameLen + extraLen + commentLen;
    if (name.endsWith('/')) continue;
    const start = localAt + 30 + buf.readUInt16LE(localAt + 26) + buf.readUInt16LE(localAt + 28);
    const raw = buf.subarray(start, start + size);
    out.set(name, method === 0 ? Buffer.from(raw) : inflateRawSync(raw));
  }
  return out;
}

/** The bytes each download must have, from source: `[{ file, entries: [{ path, data }] }]`. */
export function expected(name) {
  const p = plan(name);
  return [p.skill, p.chatgpt, p.grok, p.practice]
    .filter(Boolean)
    .map(({ file, entries }) => ({ file, entries: entries.map(({ path, abs }) => ({ path, data: readFileSync(abs) })) }));
}

export function build(name) {
  const written = [];
  for (const { file, entries } of expected(name)) {
    const target = join(DOWNLOADS_DIR, file);
    writeFileSync(target, zip(entries));
    written.push({ file, bytes: statSync(target).size });
  }
  return written;
}

// --- page shells ------------------------------------------------------------------------------------

/** The guide favicon, exactly as every guide shell carries it. */
const FAVICON = "    <!-- The brand favicon, inline as on /ai101, so it costs no request. -->\n    <link\n      rel=\"icon\"\n      type=\"image/svg+xml\"\n      href=\"data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%22-16.89 5.65 110.95 110.95%22 width=%2232%22 height=%2232%22%3E%3Crect x=%22-16.89%22 y=%225.65%22 width=%22110.95%22 height=%22110.95%22 rx=%2224.41%22 fill=%22%231F4D40%22%3E%3C/rect%3E%3Cpath d=%22M7.5 75a18.25 18.25 0 1 0 36.5 0a18.25 18.25 0 1 0 -36.5 0ZM44 50V100M69.66 50V100%22 fill=%22none%22 stroke=%22%23F4F2EC%22 stroke-width=%2215%22%3E%3C/path%3E%3Ccircle cx=%2269.66%22 cy=%2232%22 r=%2210.5%22 fill=%22%236FD3A5%22%3E%3C/circle%3E%3C/svg%3E\"\n    />\n";

/**
 * A skill page's HTML shell (D-052): the same for every skill page but its path. Vite fills the two
 * markers from `apps/web/src/guides/<page>.ts`; the stylesheet is `skills.css`, the guide styles plus
 * the skill pages' own, so the guides that are not skills keep their exact bytes.
 */
export function shellFor(page) {
  return [
    '<!doctype html>',
    '<html lang="en">',
    '  <head>',
    '    <meta charset="UTF-8" />',
    '    <meta name="viewport" content="width=device-width, initial-scale=1.0" />',
    `    <!-- /${page}, a free skill's landing page (DECISIONS.md D-052). A shell, the same for every`,
    '         skill page but its path: src/guides/vite-plugin.ts replaces the two markers below with',
    `         what src/guides/render.ts renders from src/guides/${page}.ts. Edit the words there, not`,
    '         here. Written by `node scripts/skills.mjs shell`, and a test holds it to that. -->',
    '    <!--guide:head-->',
    FAVICON.replace(/\n$/, ''),
    '    <link rel="stylesheet" href="/src/guides/skills.css" />',
    '    <script type="module" src="/src/guides/main.ts"></script>',
    '  </head>',
    '  <body data-app-ready="true">',
    '    <!--guide:body-->',
    '  </body>',
    '</html>',
    '',
  ].join('\n');
}

export const shellPath = (page) => join(ROOT, 'apps', 'web', `${page}.html`);

// --- CLI -------------------------------------------------------------------------------------------

function main(argv) {
  const [command = 'check', ...names] = argv;
  const targets = names.length ? names : listSkills();
  if (command === 'list') {
    for (const n of listSkills()) {
      const m = readManifest(n);
      console.log(`${n}  page=/${m.page}  v${m.version}  apps=${(m.apps ?? []).join(',')}`);
    }
    return 0;
  }
  if (command === 'shell') {
    for (const n of targets) {
      const page = readManifest(n).page;
      writeFileSync(shellPath(page), shellFor(page));
      console.log(`shell    apps/web/${page}.html`);
    }
    return 0;
  }
  if (command !== 'check' && command !== 'build') {
    console.error('usage: node scripts/skills.mjs check|build|shell|list [name ...]');
    return 2;
  }
  let failed = false;
  for (const n of targets) {
    if (!existsSync(join(SKILLS_DIR, n))) {
      console.error(`${n}: no such skill folder`);
      failed = true;
      continue;
    }
    const { errors, warnings } = check(n);
    for (const w of warnings) console.warn(`warning  ${w}`);
    for (const e of errors) console.error(`error    ${e}`);
    if (errors.length) {
      failed = true;
      continue;
    }
    if (command === 'build') for (const { file, bytes } of build(n)) console.log(`built    ${file} (${bytes} bytes)`);
    else console.log(`ok       ${n}`);
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
