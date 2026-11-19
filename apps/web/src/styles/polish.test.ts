import { readFileSync } from 'node:fs';
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

    const learn = readFileSync('src/routes/learn/Learn.module.css', 'utf8');
    expect(learn).toContain('translateY(-1px)');
    expect(learn).toContain('scale(0.97)');
    expect(learn).toMatch(/prefers-reduced-motion:\s*reduce/);
  });
});
