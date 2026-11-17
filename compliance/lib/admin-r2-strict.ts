import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import pixelmatch from 'pixelmatch';
import { PNG } from 'pngjs';
import { OUT_DIR, PIXEL_THRESHOLD, REF_DIR, type Rect } from './admin-r2';

// ================================================================================================
// ADMIN REDESIGN R2: the strict guard (D-160 R2-3a). REPORT-ONLY: it never fails a run.
// ================================================================================================
//
// The pass rule (`admin-r2.ts`) is pixelmatch at 0.1 with `includeAA: false`, which classifies thin,
// low-contrast marks as anti-aliasing and does not count them. A stray "…" (three 3px dots) read as
// 3 px that way. So every cell is also measured two stricter ways, and both are reported beside it:
//
//   (a) `aaPx`: pixelmatch at the same 0.1 threshold with `includeAA: true`, so anti-aliased pixels
//       count too;
//   (b) `deltaPx`: the pixels where any of R, G or B differs by more than 60 (of 255), with the
//       bounding box of those pixels, so a stray element is easy to find.
//
// Neither changes whether a cell passes; the rule, the threshold, the dimension stop, the approved
// exceptions and the masks stay exactly as they are. Masked rects are painted alike in both images
// first, as the pass rule does.

/** The channel delta over which a pixel counts as really different, not a rendering wobble. */
export const STRICT_CHANNEL_DELTA = 60;
export const STRICT_DIR = join(OUT_DIR, 'strict');

/** An RGBA image: what `pngjs` decodes. */
export interface Rgba {
  width: number;
  height: number;
  data: Uint8Array;
}

/** The box of the pixels that count, inclusive, in image pixels. */
export interface Box {
  x0: number;
  y0: number;
  x1: number;
  y1: number;
}

export interface StrictResult {
  cell: string;
  dimsOk: boolean;
  /** pixelmatch, threshold 0.1, `includeAA: true`. */
  aaPx?: number;
  aaPct?: number;
  /** Pixels where some RGB channel differs by more than `STRICT_CHANNEL_DELTA`. */
  deltaPx?: number;
  deltaPct?: number;
  /** Where those pixels are; `null` when there are none. */
  deltaBox?: Box | null;
}

/** Count the pixels where any of R, G and B differs by more than `limit`, and box them. */
export function channelDelta(a: Rgba, b: Rgba, limit = STRICT_CHANNEL_DELTA): { count: number; box: Box | null } {
  if (a.width !== b.width || a.height !== b.height) throw new Error('channelDelta: the images differ in size.');
  let count = 0;
  let box: Box | null = null;
  for (let y = 0; y < a.height; y++)
    for (let x = 0; x < a.width; x++) {
      const i = (y * a.width + x) * 4;
      if (
        Math.abs(a.data[i]! - b.data[i]!) > limit ||
        Math.abs(a.data[i + 1]! - b.data[i + 1]!) > limit ||
        Math.abs(a.data[i + 2]! - b.data[i + 2]!) > limit
      ) {
        count++;
        if (!box) box = { x0: x, y0: y, x1: x, y1: y };
        else {
          box.x0 = Math.min(box.x0, x);
          box.y0 = Math.min(box.y0, y);
          box.x1 = Math.max(box.x1, x);
          box.y1 = Math.max(box.y1, y);
        }
      }
    }
  return { count, box };
}

/** pixelmatch with anti-aliased pixels counted (`includeAA: true`), at the pass rule's threshold. */
export function aaCount(a: Rgba, b: Rgba): number {
  if (a.width !== b.width || a.height !== b.height) throw new Error('aaCount: the images differ in size.');
  return pixelmatch(a.data, b.data, null, a.width, a.height, { threshold: PIXEL_THRESHOLD, includeAA: true });
}

/** Paint the masked rects identically in an image, as the pass rule does, on a copy. */
function masked(img: Rgba, rects: Rect[]): Rgba {
  const data = Uint8Array.from(img.data);
  for (const r of rects)
    for (let y = Math.max(0, Math.floor(r.y)); y < Math.min(img.height, Math.ceil(r.y + r.height)); y++)
      for (let x = Math.max(0, Math.floor(r.x)); x < Math.min(img.width, Math.ceil(r.x + r.width)); x++) {
        const i = (y * img.width + x) * 4;
        data.set([255, 0, 255, 255], i);
      }
  return { width: img.width, height: img.height, data };
}

/** Both strict measures for two same-size images. */
export function strictCompare(app: Rgba, ref: Rgba, rects: Rect[] = []): Omit<StrictResult, 'cell'> {
  if (app.width !== ref.width || app.height !== ref.height) return { dimsOk: false };
  const a = masked(app, rects);
  const b = masked(ref, rects);
  const px = a.width * a.height;
  const aaPx = aaCount(a, b);
  const d = channelDelta(a, b);
  return {
    dimsOk: true,
    aaPx,
    aaPct: (100 * aaPx) / px,
    deltaPx: d.count,
    deltaPct: (100 * d.count) / px,
    deltaBox: d.box,
  };
}

/** Measure one cell's capture against its ref and write `out/strict/<cell>.json`. Never throws on a diff. */
export function strictCell(cell: string, appBuf: Buffer, rects: Rect[]): StrictResult {
  const ref = PNG.sync.read(readFileSync(join(REF_DIR, `${cell}.png`)));
  const app = PNG.sync.read(appBuf);
  const r: StrictResult = { cell, ...strictCompare(app, ref, rects) };
  mkdirSync(STRICT_DIR, { recursive: true });
  writeFileSync(join(STRICT_DIR, `${cell}.json`), JSON.stringify(r, null, 2) + '\n');
  return r;
}

/** One cell as the report prints it: `AA 3 px · Δ>60 0 px`, with the box when there is one. */
export function strictText(r: StrictResult | null): string {
  if (!r) return 'no result';
  if (!r.dimsOk) return 'dims differ';
  const box = r.deltaBox ? ` [x ${r.deltaBox.x0}–${r.deltaBox.x1}, y ${r.deltaBox.y0}–${r.deltaBox.y1}]` : '';
  return `AA ${r.aaPx} px (${r.aaPct!.toFixed(4)}%) · Δ>${STRICT_CHANNEL_DELTA} ${r.deltaPx} px${box}`;
}
