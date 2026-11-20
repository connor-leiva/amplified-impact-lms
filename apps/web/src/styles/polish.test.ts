import { readFileSync, readdirSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

describe('Week 0 polish, the ground and the hover underline (D-203)', () => {
  it('underlines only a classless link, and paints the live frames bone', () => {
    const global = readFileSync('src/styles/global.css', 'utf8');
    expect(global).toContain('a:where(:hover){color:var(--text-link-hover)}');
    expect(global).toContain('a:not([class]):hover{text-decoration:underline;text-underline-offset:2px}');
    expect(global).not.toContain('a:hover{color:var(--text-link-hover);text-decoration:underline');

    const r2 = readFileSync('src/styles/r2.css', 'utf8');
    expect(r2).toContain('--r2-bg: #f4f2ec');
    const polish = readFileSync('src/styles/polish.css', 'utf8');
    expect(polish).toContain('--r2-bg: #f1f0eb');
    expect(polish).toContain("background: #f1f0eb");

    const dark = readFileSync('src/styles/learner-v2.css', 'utf8');
    expect(dark).toContain('--r2-bg: var(--bg-canvas)');

    // D-211 replaces D-205's hover lift and .97 press with the step page's brand motion: hover is a colour
    // change only, press squeezes to .96, and reduced motion lands every rise on its final frame.
    const learn = readFileSync('src/routes/learn/Learn.module.css', 'utf8');
    expect(learn).not.toContain('translateY(-1px)');
    expect(learn).toContain('scale(0.96)');
    expect(learn).toMatch(/prefers-reduced-motion:\s*reduce/);
  });

  it('no learner stylesheet lifts on hover (D-214: hover changes colour only, as on the step page)', () => {
    const dirs = ['src/routes/learn', 'src/shell/learner'];
    const files = dirs.flatMap((d) => readdirSync(d).filter((f) => f.endsWith('.module.css')).map((f) => `${d}/${f}`));
    expect(files.length).toBeGreaterThan(8);
    const lifts: string[] = [];
    for (const f of files) {
      const css = readFileSync(f, 'utf8');
      for (const m of css.matchAll(/([^{}]*:hover[^{}]*)\{([^{}]*)\}/g)) if (/translateY\(-/.test(m[2]!)) lifts.push(`${f}: ${m[1]!.trim()}`);
    }
    expect(lifts).toEqual([]);
  });
});

