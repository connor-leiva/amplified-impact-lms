// Rebuilds reference/frames/<state>.png from reference/interaction-demo.mp4 (needs ffmpeg on PATH).
// Each reference image is the per-pixel average of the state's frame range in reference/states.json; those frames
// are the same picture apart from compression noise, so the average is a cleaner reference than any one frame.
//   node tools/extract-frames.mjs
import { execFileSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { PNG } from 'pngjs';

const root = new URL('..', import.meta.url).pathname;
const spec = JSON.parse(readFileSync(join(root, 'reference/states.json'), 'utf8'));
const video = join(root, spec.video);
const tmp = mkdtempSync(join(tmpdir(), 'frames-'));
execFileSync('ffmpeg', ['-v', 'error', '-i', video, join(tmp, 'f_%04d.png')]);   // f_0001.png is frame 0
const files = readdirSync(tmp).filter((f) => f.endsWith('.png')).sort();
mkdirSync(join(root, 'reference/frames'), { recursive: true });
for (const s of spec.states) {
  const [a, b] = s.frames; let acc = null, w = 0, h = 0;
  for (let i = a; i <= b; i++) {
    const png = PNG.sync.read(readFileSync(join(tmp, files[i])));
    if (!acc) { w = png.width; h = png.height; acc = new Float64Array(w * h * 4); }
    for (let k = 0; k < acc.length; k++) acc[k] += png.data[k];
  }
  const out = new PNG({ width: w, height: h }); const n = b - a + 1;
  for (let k = 0; k < acc.length; k++) out.data[k] = Math.round(acc[k] / n);
  writeFileSync(join(root, 'reference/frames', s.id + '.png'), PNG.sync.write(out));
  console.log(`${s.id.padEnd(28)} frames ${a}-${b} (t=${(a / 25).toFixed(2)}-${(b / 25).toFixed(2)} s)`);
}
rmSync(tmp, { recursive: true, force: true });
