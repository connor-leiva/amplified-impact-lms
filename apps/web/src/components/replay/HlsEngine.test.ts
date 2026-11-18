import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { HlsEngine } from './HlsEngine';
import type { HlsCtor, HlsLike, MediaLike } from './HlsEngine';
// Type-only: the factory cases below import `TickerEngine` from a fresh module registry, so the
// value this name would bind is the wrong one for an `instanceof` check.
import type { TickerEngine } from './engine';

// Phase 08 § 8.3. The production engine, measured through the same `VideoEngine` interface the
// screen uses, so anything these tests prove is something `EmployeeDetail` can rely on without
// knowing which engine it holds.
//
// jsdom has no media pipeline: a real `<video>` never resolves `play()`, never advances
// `currentTime` and never fires `timeupdate`. So the element is a stub that records what reaches it
// and can be told to fire an event — which is also the only way to test the thing that matters
// most here, the ORDER of events. A seek arrives from the chapter rail long before a segment has
// been fetched, and `currentTime = 90` on an element with no duration is silently discarded.

const SRC = 'https://stream.example.com/replay/dec26-s1.m3u8';
const DUR = 3504; // the Marketing replay's 58:24, as the seed has it

/**
 * A stub `<video>`: records every write, every call and every listener.
 *
 * Every member of `MediaLike` that `HlsEngine` WRITES is modelled on the real element rather than
 * left a plain field, because a field that accepts anything turns an assertion about the engine
 * into an assertion about the stub: `currentTime` discards early writes, `playbackRate` is reset by
 * the load algorithm, and `src` invokes it. The remaining members are deliberately not "modelled" —
 * `readyState` and `native` are knobs the UA would own and the engine only reads, and `played` /
 * `paused` / `listenerCount` are counters over real bookkeeping. `muted`, `volume` and `preload`
 * are absent on purpose: the engine never writes the first two, and `preload` is set once in
 * `createHiddenVideo()` on a REAL jsdom element, where no stub can be wrong about it.
 */
class FakeMedia implements MediaLike {
  /** 0 = HAVE_NOTHING. `loadMetadata()` moves it to 1 = HAVE_METADATA. */
  readyState = 0;
  /**
   * The element's declared rate, which the load algorithm resets `playbackRate` to (step 8, below).
   * `HlsEngine` never writes it, deliberately — see the note on `ready()` — so it stays 1× and any
   * speed the viewer picked is thrown away by the load.
   */
  defaultPlaybackRate = 1;
  private rate = 1;
  /**
   * Every value `playbackRate` took, in order: engine writes and load-algorithm resets alike. These
   * are WRITES, not `ratechange` events, so an unchanged write is recorded too. Asserting the
   * history rather than the final value is what lets a test prove the reset actually happened and
   * that the rate at the end was PUT BACK, not merely never lost.
   */
  readonly rateWrites: number[] = [];
  private url = '';
  private at = 0;

  /**
   * Modelled on the browser, not simplified: `playbackRate` takes a write at any `readyState` — it
   * is not gated the way `currentTime` is — but the HTML media element load algorithm then throws
   * it away, step 8: "Set the playbackRate attribute to the value of the defaultPlaybackRate
   * attribute."
   *
   * That reset is the entire reason `HlsEngine.ready()` re-applies the rate. While this was a plain
   * field the stub kept the viewer's 1.5× forever, so 'starts a play that was asked for too early,
   * and applies the chosen speed' asserted a value that `setRate` had already written and the whole
   * re-apply block could be deleted with all 23 tests still passing.
   */
  get playbackRate(): number {
    return this.rate;
  }
  set playbackRate(r: number) {
    this.rate = r;
    this.rateWrites.push(r);
  }

  /**
   * Setting `src` is one of the two things that invokes the load algorithm (`load()` is the other),
   * which is why this is an accessor and not a field: on the native-HLS path the engine's own `src`
   * write is what resets the rate.
   */
  get src(): string {
    return this.url;
  }
  set src(s: string) {
    this.url = s;
    this.runLoadAlgorithm();
  }

  /**
   * Modelled on the browser, not simplified: a `currentTime` write before the media knows its
   * duration is DISCARDED, silently and without an error. That one behaviour is the whole reason
   * `HlsEngine` holds a seek until `loadedmetadata`, so a stub that accepted the early write would
   * make the dropped-seek bug invisible here.
   */
  get currentTime(): number {
    return this.at;
  }
  set currentTime(t: number) {
    if (this.readyState >= 1) this.at = t;
  }

  /**
   * The HTML media element load algorithm, as much of it as this engine can observe.
   *
   * Only step 8 (the `playbackRate` reset) is modelled, because it is the only step that runs
   * unconditionally. The resets a RELOAD performs — step 7.5 `readyState` to HAVE_NOTHING, step 7.8
   * current playback position to 0 — sit under "if the media element's networkState is not set to
   * NETWORK_EMPTY", and a fresh element has nothing loaded. Every `FakeMedia` here takes at most
   * one source, so step 7 never applies; a test that loaded a second source would have to add it.
   */
  private runLoadAlgorithm(): void {
    this.playbackRate = this.defaultPlaybackRate;
  }
  /** What `canPlayType` answers for the HLS manifest: 'maybe' on Safari, '' on Chrome. */
  native = '';
  played = 0;
  paused = 0;
  private readonly listeners = new Map<string, Set<() => void>>();

  play(): Promise<void> {
    this.played += 1;
    return Promise.resolve();
  }
  pause(): void {
    this.paused += 1;
  }
  canPlayType(type: string): string {
    return type === 'application/vnd.apple.mpegurl' ? this.native : '';
  }
  addEventListener(type: string, cb: () => void): void {
    const set = this.listeners.get(type) ?? new Set<() => void>();
    set.add(cb);
    this.listeners.set(type, set);
  }
  removeEventListener(type: string, cb: () => void): void {
    this.listeners.get(type)?.delete(cb);
  }

  /** Stands in for the element firing an event of its own accord. */
  emit(type: string): void {
    for (const cb of [...(this.listeners.get(type) ?? [])]) cb();
  }
  /**
   * The manifest has parsed: duration is known, so `currentTime` writes stick from here on.
   *
   * The load algorithm runs first because in a real element it always has by this point —
   * HAVE_METADATA is only ever reached through it, whichever thing put the element on a resource
   * (a `src` write on Safari's native path, or the blob URL hls.js installs inside `attachMedia`,
   * which `FakeHls` does not model). So the element arrives here at `defaultPlaybackRate`, 1×,
   * however many times the speed chip was used while the manifest was still in flight.
   */
  loadMetadata(): void {
    this.runLoadAlgorithm();
    this.readyState = 1;
    this.emit('loadedmetadata');
  }
  /** Every listener still attached. `destroy()` has to bring this to zero. */
  get listenerCount(): number {
    let n = 0;
    for (const set of this.listeners.values()) n += set.size;
    return n;
  }
}

/** A stub hls.js. `supported` is the MSE check the real `Hls.isSupported()` performs. */
let supported = true;
class FakeHls implements HlsLike {
  static made: FakeHls[] = [];
  static isSupported(): boolean {
    return supported;
  }
  loaded: string | null = null;
  attached: MediaLike | null = null;
  destroyed = 0;

  constructor() {
    FakeHls.made.push(this);
  }
  loadSource(src: string): void {
    this.loaded = src;
  }
  attachMedia(media: MediaLike): void {
    this.attached = media;
  }
  destroy(): void {
    this.destroyed += 1;
  }
}

const Hls = FakeHls as unknown as HlsCtor;

let media: FakeMedia;

beforeEach(() => {
  media = new FakeMedia();
  FakeHls.made = [];
  supported = true;
});

afterEach(() => {
  vi.unstubAllEnvs();
  document.body.innerHTML = '';
});

describe('HlsEngine · attaching a stream @g8', () => {
  it('hands the manifest to hls.js and attaches it to the element', () => {
    const e = new HlsEngine({ src: SRC, dur: DUR, media, Hls });

    expect(FakeHls.made).toHaveLength(1);
    expect(FakeHls.made[0]?.loaded).toBe(SRC);
    expect(FakeHls.made[0]?.attached).toBe(media);
    // hls.js feeds the element through Media Source Extensions. Writing `src` as well would make
    // the browser fetch the manifest a second time and try to play it natively alongside.
    expect(media.src).toBe('');
    e.destroy();
  });

  it('plays natively where the element can, and never fetches hls.js', () => {
    // Safari and iOS: native HLS, and no MSE for hls.js to use even if it were downloaded.
    media.native = 'maybe';
    const loadHls = vi.fn(async () => Hls);

    const e = new HlsEngine({ src: SRC, dur: DUR, media, loadHls });

    expect(media.src).toBe(SRC);
    expect(loadHls).not.toHaveBeenCalled();
    expect(FakeHls.made).toHaveLength(0);
    e.destroy();
  });

  it('fetches hls.js when the element cannot play HLS by itself', async () => {
    // Chrome and Firefox: `canPlayType` answers '', so the library is the only way in.
    const loadHls = vi.fn(async () => Hls);

    const e = new HlsEngine({ src: SRC, dur: DUR, media, loadHls });
    expect(FakeHls.made).toHaveLength(0); // still in flight

    await vi.waitFor(() => expect(FakeHls.made).toHaveLength(1));
    expect(FakeHls.made[0]?.attached).toBe(media);
    e.destroy();
  });

  it('falls back to the element when hls.js cannot be had or cannot run', () => {
    media.native = 'probably';

    // A blocked chunk resolves null; an old browser gives a library that reports unsupported.
    const noLib = new HlsEngine({ src: SRC, dur: DUR, media, Hls: null });
    expect(media.src).toBe(SRC);
    noLib.destroy();

    const other = new FakeMedia();
    other.native = 'maybe';
    supported = false;
    const noMse = new HlsEngine({ src: SRC, dur: DUR, media: other, Hls });
    expect(FakeHls.made).toHaveLength(0);
    expect(other.src).toBe(SRC);
    noMse.destroy();
  });

  it('stays inert, rather than throwing, when nothing can play the stream', () => {
    // No native HLS and no library. The screen is already painted and the rest of the page works;
    // a replay that will not stream must not take the route down with it.
    supported = false;
    const e = new HlsEngine({ src: SRC, dur: DUR, media, Hls });

    expect(media.src).toBe('');
    expect(() => {
      e.play();
      e.seek(10);
      e.setRate(1.5);
      e.pause();
    }).not.toThrow();
    e.destroy();
  });

  it('owns a hidden, chromeless element when it is given none', () => {
    const e = new HlsEngine({ src: SRC, dur: DUR, Hls });

    const v = document.querySelector('video');
    expect(v).not.toBeNull();
    // SCREENS § 3.2: the poster, the controls, the captions and the chapter rail are OUR UI. The
    // provider's player chrome must never appear, so the element carries no `controls`.
    expect(v?.hasAttribute('controls')).toBe(false);
    expect(v?.getAttribute('aria-hidden')).toBe('true');
    // `preload` was the one unasserted write on the owned element, and it is load-bearing: with
    // `preload="none"` the element fetches nothing until `play()`, so `loadedmetadata` never fires
    // and the held seek — the restored playhead, SCREENS § 3.2 — would sit pending forever on a
    // viewer who never pressed play. 'metadata' fetches the duration and not the segments, which is
    // also what keeps a replay out of phase 09's first-load budget.
    expect(v?.preload).toBe('metadata');
    // Off-screen rather than merely transparent, and inline so iOS cannot take the stream
    // fullscreen over our own chrome.
    expect(v?.hidden).toBe(true);
    expect(v?.hasAttribute('playsinline')).toBe(true);

    e.destroy();
    expect(document.querySelector('video')).toBeNull();
  });
});

describe('HlsEngine · the controls reach the element @g8', () => {
  it('play, pause, seek and setRate all land on the element', () => {
    media.readyState = 1;
    const e = new HlsEngine({ src: SRC, dur: DUR, media, Hls });

    e.play();
    expect(media.played).toBe(1);

    e.pause();
    expect(media.paused).toBe(1);

    e.seek(1830);
    expect(media.currentTime).toBe(1830);

    e.setRate(1.5);
    expect(media.playbackRate).toBe(1.5);

    e.destroy();
  });

  it('clamps the playhead to the replay length, as the ticker does', () => {
    media.readyState = 1;
    const e = new HlsEngine({ src: SRC, dur: DUR, media, Hls });

    e.seek(-30);
    expect(media.currentTime).toBe(0);

    e.seek(DUR + 600);
    expect(media.currentTime).toBe(DUR);

    e.destroy();
  });

  it('refuses to play an AI Employee with no replay', () => {
    media.readyState = 1;
    const e = new HlsEngine({ src: SRC, dur: 0, media, Hls });

    e.play();
    expect(media.played).toBe(0);
    e.destroy();
  });
});

describe('HlsEngine · subscriptions @g8', () => {
  it('onTime reports the element position, and its unsubscribe stops it', () => {
    media.readyState = 1;
    const e = new HlsEngine({ src: SRC, dur: DUR, media, Hls });
    const seen: number[] = [];
    const off = e.onTime((t) => seen.push(t));

    media.currentTime = 12.5;
    media.emit('timeupdate');
    media.currentTime = 25;
    media.emit('timeupdate');
    expect(seen).toEqual([12.5, 25]);

    off();
    media.currentTime = 40;
    media.emit('timeupdate');
    expect(seen).toEqual([12.5, 25]);

    e.destroy();
  });

  it('onEnded fires when the element ends, and its unsubscribe stops it', () => {
    media.readyState = 1;
    const e = new HlsEngine({ src: SRC, dur: DUR, media, Hls });
    const ended = vi.fn();
    const off = e.onEnded(ended);

    media.emit('ended');
    expect(ended).toHaveBeenCalledTimes(1);

    off();
    media.emit('ended');
    expect(ended).toHaveBeenCalledTimes(1);

    e.destroy();
  });

  it('two subscribers both hear a seek, immediately', () => {
    // The screen mirrors the playhead into `ui.t` and the transcript panel follows it, so the seek
    // has to be reported synchronously — waiting for the element to answer would leave the chapter
    // rail a frame behind the click. `TickerEngine.seek` emits the same way.
    media.readyState = 1;
    const e = new HlsEngine({ src: SRC, dur: DUR, media, Hls });
    const a = vi.fn();
    const b = vi.fn();
    e.onTime(a);
    e.onTime(b);

    e.seek(600);

    expect(a).toHaveBeenCalledWith(600);
    expect(b).toHaveBeenCalledWith(600);
    e.destroy();
  });
});

describe('HlsEngine · a seek before the manifest loads @g8', () => {
  it('holds the seek and applies it once the element knows its duration', () => {
    // THE central claim. The chapter rail is clickable from the first paint and the screen restores
    // the saved playhead on mount, both of which happen before a single segment has been fetched.
    // A browser silently discards `currentTime = 1830` while `readyState` is 0, so a dropped seek
    // would send the viewer back to the top of a 58-minute replay with no error anywhere.
    const e = new HlsEngine({ src: SRC, dur: DUR, media, Hls });
    const seen: number[] = [];
    e.onTime((t) => seen.push(t));

    e.seek(1830);
    expect(media.currentTime).toBe(0); // the element cannot take it yet
    expect(seen).toEqual([1830]); // but our own UI already moved
    expect(e.position).toBe(1830);

    media.loadMetadata();
    expect(media.currentTime).toBe(1830);

    e.destroy();
  });

  it('keeps only the last seek of a burst', () => {
    const e = new HlsEngine({ src: SRC, dur: DUR, media, Hls });

    e.seek(100);
    e.seek(900);
    e.seek(1500);
    media.loadMetadata();

    expect(media.currentTime).toBe(1500);
    e.destroy();
  });

  it('restores the saved playback position the same way', () => {
    // `localStorage['ai-lms-pos-marketing']`, handed in by the screen on mount.
    const e = new HlsEngine({ src: SRC, dur: DUR, t: 2450, media, Hls });

    expect(media.currentTime).toBe(0);
    media.loadMetadata();
    expect(media.currentTime).toBe(2450);

    e.destroy();
  });

  it('starts a play that was asked for too early, and applies the chosen speed', () => {
    const e = new HlsEngine({ src: SRC, dur: DUR, media, Hls });

    e.setRate(1.5);
    e.play();
    expect(media.played).toBe(0);

    media.loadMetadata();
    expect(media.played).toBe(1);
    expect(media.playbackRate).toBe(1.5);

    e.destroy();
  });

  it('puts the chosen speed back after the load algorithm resets it', () => {
    // Guards the `playbackRate` re-apply in `ready()`, which the test above could not: the load
    // algorithm's step 8 ("Set the playbackRate attribute to the value of the defaultPlaybackRate
    // attribute") runs after the speed chip has written 1.5× and before `loadedmetadata`, so the
    // element reaches HAVE_METADATA at 1× and the handler is the only place the viewer's choice can
    // come back. A viewer who picks 1.5× on the speed chip while the first segments are still being
    // fetched would otherwise be dropped to 1× the moment the replay became playable, silently.
    //
    // The WRITE HISTORY is the assertion, not the final value, and that distinction is the whole
    // point: asserting only `playbackRate === 1.5` passed with the re-apply block deleted, because
    // `setRate` had already written 1.5 and nothing ever took it away.
    const e = new HlsEngine({ src: SRC, dur: DUR, media, Hls });

    e.setRate(1.5);
    expect(media.playbackRate).toBe(1.5);

    media.loadMetadata();

    // 1.5 from the chip, 1 from the load reset, 1.5 put back by `ready()`. The middle entry proves
    // the reset really happened; the last proves the engine recovered from it.
    expect(media.rateWrites).toEqual([1.5, 1, 1.5]);
    expect(media.playbackRate).toBe(1.5);

    e.destroy();
  });

  it('a pause cancels a play that is still waiting', () => {
    const e = new HlsEngine({ src: SRC, dur: DUR, media, Hls });

    e.play();
    e.pause();
    media.loadMetadata();

    expect(media.played).toBe(0);
    e.destroy();
  });
});

describe('HlsEngine · destroy @g8', () => {
  it('detaches hls.js and leaves no listener behind', () => {
    media.readyState = 1;
    const e = new HlsEngine({ src: SRC, dur: DUR, media, Hls });
    const time = vi.fn();
    const ended = vi.fn();
    e.onTime(time);
    e.onEnded(ended);
    expect(media.listenerCount).toBeGreaterThan(0);

    e.destroy();

    // hls.js holds SourceBuffers and a running segment-fetch loop; dropping the reference leaks
    // both. `EmployeeDetail` rebuilds the engine every time the viewer opens another AI Employee,
    // so a listener or a loader that survives here accumulates for the life of the tab.
    expect(FakeHls.made[0]?.destroyed).toBe(1);
    expect(media.listenerCount).toBe(0);
    expect(media.paused).toBe(1);

    media.emit('timeupdate');
    media.emit('ended');
    expect(time).not.toHaveBeenCalled();
    expect(ended).not.toHaveBeenCalled();
  });

  it('is idempotent, and a late hls.js never attaches to a dead engine', async () => {
    let release: (ctor: HlsCtor) => void = () => {};
    const loadHls = () => new Promise<HlsCtor | null>((res) => (release = res));

    const e = new HlsEngine({ src: SRC, dur: DUR, media, loadHls });
    e.destroy();
    e.destroy(); // the screen's cleanup can run twice under React's strict double-invoke

    release(Hls);
    await Promise.resolve();
    await Promise.resolve();

    expect(FakeHls.made).toHaveLength(0);
    expect(media.listenerCount).toBe(0);
  });
});

describe('createVideoEngine · the engine follows the data source @g8', () => {
  /**
   * The factory reads `repo.source`, which `boot.ts` resolves once at module load, so each case
   * needs a fresh module registry — the same approach `boot.test.ts` takes.
   */
  const load = async (source: string) => {
    vi.resetModules();
    vi.stubEnv('VITE_DATA_SOURCE', source);
    return {
      ...(await import('./HlsEngine')),
      vm: await import('./engine'),
    };
  };

  it('fixture mode gets the ticker, even if a manifest somehow appears', async () => {
    // This is the guard that protects the compliance suite. Every one of the 55 parity scenarios
    // and 25 e2e behaviours runs in fixture mode; swapping the engine there would change the
    // replay screen's behaviour against a captured golden of the prototype.
    const m = await load('fixture');

    expect(m.createVideoEngine({ dur: DUR, src: SRC })).toBeInstanceOf(m.vm.TickerEngine);
    expect(m.createVideoEngine({ dur: DUR })).toBeInstanceOf(m.vm.TickerEngine);
  });

  it('http mode gets HlsEngine as soon as there is a manifest', async () => {
    const m = await load('http');

    const hls = m.createVideoEngine({ dur: DUR, src: SRC });
    expect(hls).toBeInstanceOf(m.HlsEngine);
    hls.destroy?.();
  });

  it('http mode with no manifest keeps the ticker', async () => {
    // Which is every AI Employee today: § 8.3's `publishReplay({ playbackUrl })` is deferred, so
    // nothing carries a URL yet and the screen behaves as it has since phase 05.
    const m = await load('http');

    expect(m.createVideoEngine({ dur: DUR, src: '' })).toBeInstanceOf(m.vm.TickerEngine);
  });

  it('carries the saved position into whichever engine it builds', async () => {
    const m = await load('http');

    const ticker = m.createVideoEngine({ dur: DUR, t: 2450 });
    expect((ticker as TickerEngine).position).toBe(2450);

    const hls = m.createVideoEngine({ dur: DUR, t: 2450, src: SRC });
    expect((hls as InstanceType<typeof HlsEngine>).position).toBe(2450);
    hls.destroy?.();
  });
});
