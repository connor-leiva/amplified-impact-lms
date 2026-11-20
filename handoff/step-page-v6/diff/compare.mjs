// Video-tolerant image comparison. The reference frames come from an H.264 screen recording, so a
// byte-for-byte diff is meaningless (compression noise on every text edge). Two blurred metrics are used:
//
//   edge  Gaussian blur σ1.6, |Δluma| > 22   -> anything moved, resized, missing or extra (an element 1-2 px off shows up)
//   tone  Gaussian blur σ4,   |Δluma| > 7    -> a fill or tint that is different (hover states, halos, highlights)
//
// Each metric's hot pixels are grouped into regions (3 px dilation). A state passes when no region is
// bigger than the limit. Limits were calibrated on the v5 mockup against all 24 video states: its worst
// region is 53 px (edge) and 72 px (tone), all of it text antialiasing. A wrong hover state is 200+ px,
// a wrong rail is thousands.
import { PNG } from 'pngjs';

const asPng = (x) => (x && x.data && x.width ? x : PNG.sync.read(x));

export const LIMITS = { edge: { sigma: 1.6, thr: 22, maxRegion: 120 }, tone: { sigma: 4, thr: 7, maxRegion: 150 } };

function luma(png) {
  const { width: w, height: h, data } = png; const out = new Float32Array(w * h);
  for (let i = 0, p = 0; i < out.length; i++, p += 4) out[i] = (data[p] * 299 + data[p + 1] * 587 + data[p + 2] * 114) / 1000;
  return out;
}

function blur(src, w, h, sigma) {
  const r = Math.ceil(sigma * 3), k = new Float32Array(2 * r + 1);
  let sum = 0; for (let i = -r; i <= r; i++) { k[i + r] = Math.exp(-(i * i) / (2 * sigma * sigma)); sum += k[i + r]; }
  for (let i = 0; i < k.length; i++) k[i] /= sum;
  const tmp = new Float32Array(w * h), out = new Float32Array(w * h);
  for (let y = 0; y < h; y++) {
    const row = y * w;
    for (let x = 0; x < w; x++) {
      let acc = 0;
      for (let i = -r; i <= r; i++) { const xx = x + i < 0 ? 0 : x + i >= w ? w - 1 : x + i; acc += src[row + xx] * k[i + r]; }
      tmp[row + x] = acc;
    }
  }
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      let acc = 0;
      for (let i = -r; i <= r; i++) { const yy = y + i < 0 ? 0 : y + i >= h ? h - 1 : y + i; acc += tmp[yy * w + x] * k[i + r]; }
      out[y * w + x] = acc;
    }
  }
  return out;
}

function regions(hot, w, h, dilate = 3) {
  // dilate (box), then label 4-connected components; a region's area counts only its undilated hot pixels
  const dil = new Uint8Array(w * h);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    if (!hot[y * w + x]) continue;
    for (let yy = Math.max(0, y - dilate); yy <= Math.min(h - 1, y + dilate); yy++)
      for (let xx = Math.max(0, x - dilate); xx <= Math.min(w - 1, x + dilate); xx++) dil[yy * w + xx] = 1;
  }
  const lab = new Int32Array(w * h); const out = []; const stack = new Int32Array(w * h);
  let id = 0;
  for (let s = 0; s < w * h; s++) {
    if (!dil[s] || lab[s]) continue;
    id++; let sp = 0; stack[sp++] = s; lab[s] = id;
    let area = 0, x0 = w, y0 = h, x1 = 0, y1 = 0;
    while (sp) {
      const p = stack[--sp]; const x = p % w, y = (p - x) / w;
      if (hot[p]) { area++; if (x < x0) x0 = x; if (y < y0) y0 = y; if (x > x1) x1 = x; if (y > y1) y1 = y; }
      const nb = [x > 0 ? p - 1 : -1, x < w - 1 ? p + 1 : -1, y > 0 ? p - w : -1, y < h - 1 ? p + w : -1];
      for (const q of nb) if (q >= 0 && dil[q] && !lab[q]) { lab[q] = id; stack[sp++] = q; }
    }
    if (area) out.push({ area, box: [x0, y0, x1 + 1, y1 + 1] });
  }
  return out.sort((a, b) => b.area - a.area);
}

/**
 * Compare a target screenshot with a reference video frame (both PNG buffers or PNG objects, same size).
 * masks: [[x0,y0,x1,y1], ...] areas to ignore (the playing video). Returns per-metric results and a heat image.
 */
export function compareToFrame(frame, target, masks = []) {
  const A = asPng(frame), B = asPng(target);
  if (A.width !== B.width || A.height !== B.height) throw new Error(`size mismatch: frame ${A.width}x${A.height}, target ${B.width}x${B.height}`);
  const w = A.width, h = A.height, la = luma(A), lb = luma(B);
  const ignore = new Uint8Array(w * h);
  for (const [x0, y0, x1, y1] of masks) {
    for (let y = Math.max(0, y0 - 8); y < Math.min(h, y1 + 8); y++) for (let x = Math.max(0, x0 - 8); x < Math.min(w, x1 + 8); x++) ignore[y * w + x] = 1;
  }
  const res = {}; const heat = new PNG({ width: w, height: h });
  for (let i = 0, p = 0; i < w * h; i++, p += 4) { const v = Math.min(255, la[i] * 0.35 + 160); heat.data[p] = heat.data[p + 1] = heat.data[p + 2] = v; heat.data[p + 3] = 255; if (ignore[i]) { heat.data[p] = 200; heat.data[p + 1] = 220; heat.data[p + 2] = 255; } }
  for (const [name, L] of Object.entries(LIMITS)) {
    const ba = blur(la, w, h, L.sigma), bb = blur(lb, w, h, L.sigma);
    const hot = new Uint8Array(w * h); let n = 0;
    for (let i = 0; i < w * h; i++) if (!ignore[i] && Math.abs(ba[i] - bb[i]) > L.thr) { hot[i] = 1; n++; }
    const regs = regions(hot, w, h);
    const worst = regs[0]?.area ?? 0;
    res[name] = { hotPixels: n, worstRegion: worst, worstBox: regs[0]?.box ?? null, regions: regs.slice(0, 8), pass: worst <= L.maxRegion };
    for (let i = 0, p = 0; i < w * h; i++, p += 4) if (hot[i]) { if (name === 'edge') { heat.data[p] = 255; heat.data[p + 1] = 0; heat.data[p + 2] = 0; } else if (heat.data[p + 1] !== 0) { heat.data[p] = 255; heat.data[p + 1] = 150; heat.data[p + 2] = 0; } }
  }
  return { ...res, pass: res.edge.pass && res.tone.pass, heat };
}

/** frame | target | heat, side by side, for people. */
export function sideBySide(frame, target, heat) {
  const A = asPng(frame), B = asPng(target);
  const w = A.width, h = A.height, out = new PNG({ width: w * 3 + 16, height: h });
  out.data.fill(255);
  PNG.bitblt(A, out, 0, 0, w, h, 0, 0); PNG.bitblt(B, out, 0, 0, w, h, w + 8, 0); PNG.bitblt(heat, out, 0, 0, w, h, 2 * w + 16, 0);
  return out;
}
