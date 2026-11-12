import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

// v3's copy of the kit's script (`kit.ts`) against the kit's own (`kit/client/main.ts`), character for
// character, so the homepage's header, reveal and exit motion can't drift from every other kit page's.

const HERE = dirname(fileURLToPath(import.meta.url));
const source = (path: string) => readFileSync(resolve(HERE, path), 'utf8');
const KIT = source('../../../kit/client/main.ts');
const COPY = source('./kit.ts');
const MAIN = source('./main.ts');

/** A function or an exported constant as written, from its doc comment to its end, without `export`. */
function block(src: string, name: string): string {
  const start = src.search(new RegExp(`(/\\*\\*(?:(?!\\*/)[\\s\\S])*?\\*/\\n)?(export )?(function ${name}\\(|const ${name} = )`));
  expect(start, name).toBeGreaterThanOrEqual(0);
  const isFn = new RegExp(`function ${name}\\(`).test(src.slice(start, src.indexOf('\n', src.indexOf(name, start)) + 1));
  const end = isFn ? src.indexOf('\n}\n', start) + 3 : src.indexOf(';\n', start) + 2;
  return src.slice(start, end).replace(/^export /m, '');
}
const line = (src: string, name: string) => src.split('\n').find((l) => new RegExp(`^(export )?const ${name} = `).test(l))?.replace(/^export /, '');

describe('the kit’s script, copied', () => {
  it('is the kit’s, character for character', () => {
    for (const name of ['initScrolled', 'close', 'initPrograms', 'initPhoneMenu', 'onView', 'NEVER_HIDDEN', 'holdsBuying', 'initInView', 'initScrollExit']) {
      expect(block(COPY, name), name).toBe(block(KIT, name));
    }
    for (const name of ['REDUCE', 'HOVER', 'DESKTOP', 'matches', 'reducedMotion']) {
      expect(line(COPY, name), name).toBe(line(KIT, name));
    }
  });

  it('starts as the kit’s `init()` does, but for the theme switch, and never imports the kit’s module', () => {
    const kitInit = block(KIT, 'init');
    const v3Init = block(MAIN, 'init');
    for (const l of [
      "document.documentElement.classList.add('aiw-js');",
      "const page = document.querySelector<HTMLElement>('.aiw');",
      'initScrolled(header);',
      'if (programs) initPrograms(header, programs);',
      'if (phone) initPhoneMenu(header, phone);',
      'initScrollExit(page);',
      'initInView(page);',
    ]) {
      expect(kitInit, l).toContain(l);
      expect(v3Init, l).toContain(l);
    }
    expect(kitInit).toContain('initTheme(page);');
    expect(v3Init).not.toContain('initTheme');
    for (const src of [COPY, MAIN, source('./badges.ts'), source('./count.ts'), source('./enter.ts')]) {
      expect(src).not.toMatch(/from ['"][^'"]*(kit\/client|\.\.\/client|home\/client)/);
    }
  });
});
