// The replay player's engines (phase 05 § 5.2, phase 08 § 8.3), shared by the current portal's AI Employee
// page and, since D-183, the learner portal v2's week page. Moved here unchanged from
// `routes/portal/EmployeeDetail.vm.ts` (which re-exports them), so both screens drive playback through
// the same `VideoEngine`: `TickerEngine` in fixture mode, and `HlsEngine` (./HlsEngine.ts) in http mode
// once there is a manifest. Pure: no React, no DOM, no clock read.

import type { AIEmployee } from '@ai/core';

export type Speed = 1 | 1.25 | 1.5 | 2;

/** The reference's `cycleSpeed` list. The label is `speed + '×'`. */
export const SPEEDS: readonly Speed[] = [1, 1.25, 1.5, 2];

/**
 * Phase 08 § 8.3. The screen drives playback only through this, so phase 08 can swap `TickerEngine`
 * for `HlsEngine` (a hidden `<video>` behind hls.js) without touching the poster, the controls, the
 * captions or the chapter rail — that chrome stays ours (SCREENS § 3.2).
 *
 * `HlsEngine` lives in `HlsEngine.ts` and is chosen by `createVideoEngine`, because it is all DOM
 * and this file is pure.
 */
export interface VideoEngine {
  play(): void;
  pause(): void;
  seek(t: number): void;
  setRate(r: Speed): void;
  onTime(cb: (t: number) => void): () => void;
  onEnded(cb: () => void): () => void;
  /** D-183: the recording's length once the media knows it; only an engine built without one offers this. */
  onDuration?(cb: (d: number) => void): () => void;
  /**
   * Release anything the engine holds outside itself. Optional because `TickerEngine` holds
   * nothing: the screen already clears its interval with `pause()` and drops its subscriptions.
   * `HlsEngine` has MSE buffers, a segment loader and element listeners to let go of (§ 8.3).
   */
  destroy?(): void;
}

/** The reference's `setInterval(() => this.tick(), 250)` and its `s.t + 0.25 * s.speed`. */
export const TICK_MS = 250;
export const TICK_SEC = 0.25;

/**
 * The fixture engine (phase 05 § 5.2): it advances `t` by 0.25 s × rate every 250 ms while playing
 * and stops at `dur`, which is exactly what the prototype does, so a replay can be compared
 * deterministically. It holds no React state and reads no clock.
 */
export class TickerEngine implements VideoEngine {
  private t: number;
  private rate: Speed = 1;
  private timer: ReturnType<typeof setInterval> | null = null;
  private readonly time = new Set<(t: number) => void>();
  private readonly ended = new Set<() => void>();

  constructor(
    private readonly dur: number,
    t = 0,
  ) {
    this.t = Math.max(0, Math.min(dur, t));
  }

  play(): void {
    if (this.timer !== null || this.dur <= 0 || this.t >= this.dur) return;
    this.timer = setInterval(() => this.tick(), TICK_MS);
  }

  pause(): void {
    if (this.timer === null) return;
    clearInterval(this.timer);
    this.timer = null;
  }

  seek(t: number): void {
    this.t = Math.max(0, Math.min(this.dur, t));
    this.emit();
  }

  setRate(r: Speed): void {
    this.rate = r;
  }

  onTime(cb: (t: number) => void): () => void {
    this.time.add(cb);
    return () => {
      this.time.delete(cb);
    };
  }

  onEnded(cb: () => void): () => void {
    this.ended.add(cb);
    return () => {
      this.ended.delete(cb);
    };
  }

  /** The current playhead. The screen mirrors it into `ui.t`; this is the engine's own copy. */
  get position(): number {
    return this.t;
  }

  private emit(): void {
    for (const cb of [...this.time]) cb(this.t);
  }

  private tick(): void {
    this.t = Math.min(this.dur, this.t + TICK_SEC * this.rate);
    this.emit();
    if (this.t >= this.dur) {
      this.pause();
      for (const cb of [...this.ended]) cb();
    }
  }
}

/**
 * § 8.3's HLS manifest for this replay, or `''` when there is none.
 *
 * The manifest is stored by `publishReplay({ playbackUrl, durationSec, transcriptVtt? })`. That
 * signature change belongs with the admin route that calls it and is deferred, so no `AIEmployee`
 * carries a `playbackUrl` yet and this answers `''` everywhere today — and permanently in fixture
 * mode, where the prototype has no video host at all. Read through a widening cast rather than by
 * adding the field to `packages/core/src/types.ts`, which keeps this sprint additive: the HLS path
 * goes live the moment the column exists, with no further change on the web side.
 */
export const replayUrl = (m: AIEmployee): string => {
  const url = (m as AIEmployee & { playbackUrl?: unknown }).playbackUrl;
  return typeof url === 'string' ? url : '';
};
