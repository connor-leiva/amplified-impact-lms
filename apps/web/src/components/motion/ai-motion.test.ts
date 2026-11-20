// The brand's motion files ship unchanged (HANDOFF §3): ai-motion.css and ai-motion.tsx must hash to the
// brand's published sha256, and the declaration file tsc reads must name every export the .tsx has.
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const read = (name: string) => readFileSync(resolve(HERE, name));
const sha = (name: string) => createHash('sha256').update(read(name)).digest('hex');

describe('Amplified Impact Motion v1 brand files', () => {
  it('ai-motion.css is the brand file, byte for byte', () => {
    expect(sha('ai-motion.css')).toBe('25f4fbfb9ff4eda379af32c8135ecb22999186abf4c993edd2e1b6439ba3e054');
  });
  it('ai-motion.tsx is the brand file, byte for byte', () => {
    expect(sha('ai-motion.tsx')).toBe('c1b8b25b5504c1bf78ebaa301962e3ad7b6575ec6e4e1dee2a90f3160a13d6ea');
  });
  it('ai-motion.d.ts declares every export of ai-motion.tsx', () => {
    const names = (src: string, re: RegExp) => [...src.matchAll(re)].map((m) => m[1]).sort();
    const tsx = names(read('ai-motion.tsx').toString(), /^export (?:function|const|type|interface) (\w+)/gm);
    const dts = names(read('ai-motion.d.ts').toString(), /^export (?:declare function|declare const|type|interface) (\w+)/gm);
    expect(dts).toEqual(tsx);
  });
});
