import { repo } from '../../data/boot';
import { TickerEngine } from './engine';
import type { Speed, VideoEngine } from './engine';

// Phase 08 § 8.3 — the production video engine. Moved here from `routes/portal/` unchanged (D-183), so the
// current portal's AI Employee page and the learner portal v2's week page share it.
//
// `engine.ts` owns the `VideoEngine` interface and `TickerEngine`, the fixture engine
// that advances 0.25 s × rate every 250 ms exactly as the prototype does. This file adds the other
// implementation: a real HLS stream, behind the SAME interface, so the poster, the play button, the
// seek bar, the speed chip, the captions and the chapter rail stay OUR UI (SCREENS § 3.2) and the
// screen does not learn that anything changed. The provider's own player chrome never appears,
// because the element this drives has no `controls` attribute and is never shown.
//
// It lives here rather than in the `.vm.ts` because that file is pure by contract — no React, no
// clock, no DOM — and this one is nothing but DOM and a third-party library.

/** The MIME type Safari and iOS report for an HLS manifest. */
const HLS_MIME = 'application/vnd.apple.mpegurl';

/** `HTMLMediaElement.HAVE_METADATA`: duration is known, so a `currentTime` write will stick. */
const HAVE_METADATA = 1;

/**
 * The slice of `HTMLVideoElement` this engine touches.
 *
 * Narrow on purpose. A real `<video>` satisfies it, and so does a plain object, which is the only
 * way to test playback in jsdom — jsdom has no media pipeline, so `play()` on a real element never
 * resolves, `currentTime` never advances and `timeupdate` never fires on its own.
 */
export interface MediaLike {
  currentTime: number;
  playbackRate: number;
  readyState: number;
  src: string;
  play(): Promise<void> | void;
  pause(): void;
  canPlayType(type: string): string;
  addEventListener(type: string, cb: () => void): void;
  removeEventListener(type: string, cb: () => void): void;
}

/** The slice of an `Hls` instance this engine uses. */
export interface HlsLike {
  loadSource(src: string): void;
  attachMedia(media: MediaLike): void;
  destroy(): void;
}

/** `hls.js`'s default export, as far as this engine is concerned. */
export interface HlsCtor {
  new (): HlsLike;
  isSupported(): boolean;
}

/**
 * Fetch hls.js, or `null` if it cannot be had.
 *
 * A dynamic import, not a static one: the library is a few hundred KB and only the replay screen of
 * a cohort with a published replay ever needs it, which keeps it out of the first-load budget
 * phase 09 measures. A failed chunk load resolves `null` rather than throwing — the screen is
 * already painted and a replay that will not stream is not a reason to blank it.
 */
const loadHlsJs = async (): Promise<HlsCtor | null> => {
  try {
    const mod = await import('hls.js');
    return mod.default as unknown as HlsCtor;
  } catch {
    return null;
  }
};

/** Does the element play HLS by itself? True on Safari and iOS, false on Chrome and Firefox. */
export const nativeHls = (media: MediaLike): boolean => {
  try {
    return !!media.canPlayType(HLS_MIME);
  } catch {
    return false;
  }
};

/**
 * The hidden element § 8.3 asks for.
 *
 * No `controls`, so the provider's chrome cannot appear even for an instant. `aria-hidden`, because
 * the controls a screen reader should find are the labelled ones in our own player. It is appended
 * to the document because several browsers refuse to start a detached media element, and it is
 * removed again by `destroy()`.
 */
function createHiddenVideo(): HTMLVideoElement {
  const v = document.createElement('video');
  v.setAttribute('aria-hidden', 'true');
  v.setAttribute('playsinline', '');
  v.preload = 'metadata';
  v.hidden = true;
  v.style.display = 'none';
  document.body.appendChild(v);
  return v;
}

/** `play()` returns a promise in every current browser, and it rejects on autoplay policy. */
function start(media: MediaLike): void {
  try {
    const p = media.play();
    if (p && typeof p.then === 'function') p.then(undefined, () => {});
  } catch {
    /* a runtime that throws synchronously instead */
  }
}

export interface HlsEngineDeps {
  /** The HLS manifest (`.m3u8`) `publishReplay` stored for this replay. */
  src: string;
  /** The replay length in seconds, from the snapshot, so the playhead clamps as the ticker's does. */
  dur: number;
  /** The saved playback position (SCREENS § 3.2). Applied once the manifest has loaded. */
  t?: number;
  /** The element to drive. One is created and owned here when this is not given. */
  media?: MediaLike;
  /**
   * hls.js, decided by the caller. Passing it (including as `null`, meaning "native only") skips
   * the dynamic import entirely, which is how this is tested.
   */
  Hls?: HlsCtor | null;
  /** How to fetch hls.js. Defaults to the dynamic import. */
  loadHls?: () => Promise<HlsCtor | null>;
}

/**
 * A real HLS stream behind `VideoEngine`.
 *
 * The one behaviour worth naming out loud: a `seek` that arrives before the manifest has loaded is
 * HELD, not dropped. The screen restores the saved playhead and the chapter rail is clickable from
 * the first paint, long before a segment has been fetched — and `currentTime = 90` on an element
 * with no duration yet is silently discarded by every browser. So every seek before
 * `loadedmetadata` becomes the pending position, and `loadedmetadata` applies the last one.
 */
export class HlsEngine implements VideoEngine {
  private readonly src: string;
  private readonly dur: number;
  private readonly media: MediaLike;
  /** Set only when this engine created the element, and therefore may remove it. */
  private readonly owned: HTMLVideoElement | null;
  private hls: HlsLike | null = null;
  private dead = false;
  /** A position asked for before the manifest loaded, or null once applied. */
  private pending: number | null;
  /** A `play()` that arrived before the manifest loaded. */
  private wantPlay = false;
  private rate: Speed = 1;
  private readonly time = new Set<(t: number) => void>();
  private readonly ended = new Set<() => void>();
  /** Every listener this engine added, so `destroy()` can prove it left none behind. */
  private readonly bound: [string, () => void][] = [];

  constructor(deps: HlsEngineDeps) {
    this.src = deps.src;
    this.dur = Math.max(0, deps.dur);
    // A real `<video>` satisfies `MediaLike`; `created` is non-null exactly when `deps.media` is not.
    const created = deps.media ? null : createHiddenVideo();
    this.media = deps.media ?? created!;
    this.owned = created;
    // The start position is itself a seek that has to survive the manifest load.
    this.pending = this.clamp(deps.t ?? 0);

    this.on('timeupdate', () => this.emit());
    this.on('seeked', () => this.emit());
    this.on('ended', () => {
      for (const cb of [...this.ended]) cb();
    });
    this.on('loadedmetadata', () => this.ready());

    this.attach(deps);
    // An injected element may already be past `loadedmetadata`, in which case that event will never
    // fire again and the start position would sit pending forever.
    if (this.loaded()) this.ready();
  }

  // ---- VideoEngine ---------------------------------------------------------------------------

  play(): void {
    // Mirrors `TickerEngine`: an AI Employee with no replay has nothing to play.
    if (this.dur <= 0 || this.dead) return;
    if (!this.loaded()) {
      this.wantPlay = true;
      return;
    }
    start(this.media);
  }

  pause(): void {
    this.wantPlay = false;
    try {
      this.media.pause();
    } catch {
      /* a stub or a torn-down element */
    }
  }

  seek(t: number): void {
    if (this.dead) return;
    const next = this.clamp(t);
    if (this.loaded()) {
      this.pending = null;
      this.media.currentTime = next;
    } else {
      this.pending = next;
    }
    // Emitted synchronously, exactly as `TickerEngine.seek` does, so the playhead, the chapter rail
    // and the transcript follow the click instead of waiting for the element to report back.
    this.emit(next);
  }

  setRate(r: Speed): void {
    this.rate = r;
    try {
      this.media.playbackRate = r;
    } catch {
      /* ignored: `ready()` re-applies it once the element can take it */
    }
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

  /** The current playhead. The pending position is the truth until the element accepts it. */
  get position(): number {
    return this.pending !== null ? this.pending : this.clamp(this.media.currentTime || 0);
  }

  /**
   * Release everything. Dropping the reference is not enough: hls.js owns MSE SourceBuffers, a
   * segment loader and listeners of its own on the element, and only `destroy()` stops the fetch
   * loop. The element's own listeners come off too, so remounting the screen cannot accumulate
   * them — `EmployeeDetail` rebuilds the engine on every AI Employee change.
   */
  destroy(): void {
    if (this.dead) return;
    this.dead = true;
    this.pause();
    for (const [type, fn] of this.bound) this.media.removeEventListener(type, fn);
    this.bound.length = 0;
    this.time.clear();
    this.ended.clear();
    this.hls?.destroy();
    this.hls = null;
    if (this.owned) {
      this.owned.removeAttribute('src');
      this.owned.remove();
    }
  }

  // ---- internals -----------------------------------------------------------------------------

  private on(type: string, fn: () => void): void {
    this.bound.push([type, fn]);
    this.media.addEventListener(type, fn);
  }

  private clamp(t: number): number {
    if (!Number.isFinite(t)) return 0;
    return Math.max(0, Math.min(this.dur, t));
  }

  private loaded(): boolean {
    return this.media.readyState >= HAVE_METADATA;
  }

  private emit(at = this.position): void {
    for (const cb of [...this.time]) cb(at);
  }

  /**
   * `loadedmetadata`: the element finally knows its duration, so the writes it was discarding now
   * stick. The held seek is applied, the rate the viewer chose is re-applied, and a `play()` that
   * was waiting starts.
   *
   * The rate re-apply is not defensive padding. The HTML media element load algorithm — invoked by
   * every `src` write, including the blob URL hls.js installs in `attachMedia` — ends at step 8
   * with "Set the playbackRate attribute to the value of the defaultPlaybackRate attribute". That
   * runs unconditionally, after the speed chip may already have written 1.5× and before this event,
   * so the element reaches HAVE_METADATA at 1× and `loadedmetadata` is the first moment the
   * viewer's choice can be put back.
   *
   * Writing `defaultPlaybackRate` in `setRate` instead would make step 8 preserve the rate and this
   * line unnecessary — rejected deliberately. `defaultPlaybackRate` is the element's declared
   * default, not a per-viewing choice, and it would widen `MediaLike` (kept narrow on purpose) for
   * no behaviour this engine needs: one `HlsEngine` drives one resource and `EmployeeDetail`
   * rebuilds it per AI Employee. `HlsEngine.test.ts` asserts the write history here, so the
   * re-apply cannot be deleted silently again.
   */
  private ready(): void {
    try {
      this.media.playbackRate = this.rate;
    } catch {
      /* a stub that refuses the write */
    }
    const t = this.pending;
    this.pending = null;
    if (t !== null) {
      this.media.currentTime = t;
      this.emit(t);
    }
    if (this.wantPlay) {
      this.wantPlay = false;
      start(this.media);
    }
  }

  private attach(deps: HlsEngineDeps): void {
    // § 8.3 names hls.js as the player and native HLS as the fallback. The check runs in that order
    // with one shortcut: hls.js needs Media Source Extensions, which is exactly what the browsers
    // with native HLS (Safari, iOS) withhold — so when the element says it can play the manifest
    // itself, that is taken and the library is never fetched. On Chrome and Firefox `canPlayType`
    // answers '' and hls.js is the only way in.
    if (deps.Hls !== undefined) {
      this.use(deps.Hls);
      return;
    }
    if (nativeHls(this.media)) {
      this.use(null);
      return;
    }
    void (deps.loadHls ?? loadHlsJs)().then((ctor) => {
      // The screen may have unmounted while the chunk was in flight.
      if (!this.dead) this.use(ctor);
    });
  }

  private use(Hls: HlsCtor | null): void {
    if (Hls && Hls.isSupported()) {
      const hls = new Hls();
      this.hls = hls;
      hls.loadSource(this.src);
      hls.attachMedia(this.media);
      return;
    }
    if (nativeHls(this.media)) {
      this.media.src = this.src;
      return;
    }
    // Neither path can play it — an old browser, or a blocked chunk. The engine stays inert rather
    // than throwing: our chrome is already on screen and the rest of the page still works.
  }
}

/**
 * Pick the engine for this replay. The choice follows the DATA SOURCE, not the browser.
 *
 * Fixture mode always gets `TickerEngine`, so the replay screen behaves precisely as the prototype
 * does — which is what the 55 parity scenarios and the 25 e2e behaviours compare against the
 * captured golden. The source check is not merely belt-and-braces: a fixture snapshot that somehow
 * carried a `playbackUrl` would otherwise swap the engine and move every one of them.
 *
 * http mode gets `HlsEngine` as soon as there is a manifest. Until then — and § 8.3's
 * `publishReplay({ playbackUrl, … })` is deferred with the admin route that calls it, so today that
 * is always — it gets the ticker too, which is the same behaviour the screen has shipped with since
 * phase 05.
 */
export function createVideoEngine(o: { dur: number; t?: number; src?: string }): VideoEngine {
  if (repo.source !== 'http' || !o.src) return new TickerEngine(o.dur, o.t ?? 0);
  return new HlsEngine({ src: o.src, dur: o.dur, t: o.t ?? 0 });
}
