import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { renderV3Body } from '../render';
import { init } from './main';
import { CHROME_MS, PAUSE_BELOW, PLAY_AT, PRIME_MARGIN, initVideo } from './video';

// S2's player, in jsdom: what the script adds to the markup, and what it refuses to do on its own.

type Media = { reduce?: boolean };
const media = ({ reduce = false }: Media = {}) =>
  ((q: string) => ({
    matches: q.includes('reduced-motion') && reduce,
    media: q,
    addEventListener: () => undefined,
    removeEventListener: () => undefined,
  })) as unknown as typeof window.matchMedia;

const mount = () => {
  document.body.className = 'aiw';
  document.body.dataset.theme = 'dark';
  document.body.innerHTML = renderV3Body({ preview: false });
};

type Seen = { cb: IntersectionObserverCallback; opts?: IntersectionObserverInit };
let seen: Seen[] = [];
let hidden = false;

const play = vi.fn(function (this: HTMLMediaElement) {
  this.dispatchEvent(new Event('play'));
  return Promise.resolve();
});
const pause = vi.fn(function (this: HTMLMediaElement) {
  this.dispatchEvent(new Event('pause'));
});
const load = vi.fn();

beforeEach(() => {
  seen = [];
  hidden = false;
  play.mockClear();
  pause.mockClear();
  load.mockClear();
  window.matchMedia = media();
  vi.spyOn(HTMLMediaElement.prototype, 'play').mockImplementation(play);
  vi.spyOn(HTMLMediaElement.prototype, 'pause').mockImplementation(pause);
  vi.spyOn(HTMLMediaElement.prototype, 'load').mockImplementation(load);
  vi.stubGlobal(
    'IntersectionObserver',
    class {
      constructor(cb: IntersectionObserverCallback, opts?: IntersectionObserverInit) {
        seen.push({ cb, opts });
      }
      observe() {}
      unobserve() {}
      disconnect() {}
      takeRecords() {
        return [];
      }
    },
  );
  Object.defineProperty(document, 'visibilityState', {
    configurable: true,
    get: () => (hidden ? 'hidden' : 'visible'),
  });
});
afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

const $ = <T extends Element = HTMLElement>(s: string) => document.querySelector<T>(s)!;
const near = () => seen.find((o) => o.opts?.rootMargin === PRIME_MARGIN)!;
const view = () => seen.find((o) => Array.isArray(o.opts?.threshold))!;
const fire = (o: Seen, ratio: number, intersecting = ratio > 0) =>
  o.cb(
    [{ isIntersecting: intersecting, intersectionRatio: ratio } as IntersectionObserverEntry],
    {} as IntersectionObserver,
  );

describe('the morning task sync player', () => {
  it('replaces the browser chrome and does not play or download until the frame is near', () => {
    mount();
    initVideo(document);
    const video = $<HTMLVideoElement>('section.vid video');
    expect(video.hasAttribute('controls')).toBe(false);
    expect($('.vid-chrome').hasAttribute('hidden')).toBe(false);
    expect(video.preload).toBe('none');
    expect(play).not.toHaveBeenCalled();
    expect(load).not.toHaveBeenCalled();
    expect(near().opts?.rootMargin).toBe('200px');
    expect(view().opts?.threshold).toEqual([0, PAUSE_BELOW, PLAY_AT, 1]);

    fire(near(), 0, true);
    expect(video.preload).toBe('auto');
    expect(load).toHaveBeenCalledTimes(1);
    fire(near(), 0, true);
    expect(load).toHaveBeenCalledTimes(1);
    expect(play).not.toHaveBeenCalled();
  });

  it('plays muted at half visible, pauses under a quarter, and resumes in place with sound still on', () => {
    mount();
    initVideo(document);
    const video = $<HTMLVideoElement>('section.vid video');
    video.currentTime = 12;
    fire(view(), 0.4);
    expect(play).not.toHaveBeenCalled();
    fire(view(), PLAY_AT);
    expect(play).toHaveBeenCalledTimes(1);
    expect(video.muted).toBe(true);
    expect($('.vid-play').getAttribute('aria-label')).toBe('Pause');
    expect(video.currentTime).toBe(12);

    pause.mockClear();
    fire(view(), 0.4);
    expect(pause).not.toHaveBeenCalled();
    fire(view(), PAUSE_BELOW - 0.01);
    expect(pause).toHaveBeenCalledTimes(1);
    expect($('.vid-play').getAttribute('aria-label')).toBe('Play');

    $<HTMLButtonElement>('.vid-sound').click();
    expect([
      video.muted,
      $('.vid-sound').getAttribute('aria-label'),
      $('.vid-sound').getAttribute('aria-pressed'),
    ]).toEqual([false, 'Mute', 'true']);
    play.mockClear();
    fire(view(), 0.8);
    expect(play).toHaveBeenCalledTimes(1);
    expect(video.muted).toBe(false);
    expect(video.currentTime).toBe(12);
  });

  it('does not resume after an explicit pause until play is pressed, and does not restart a finished film', () => {
    mount();
    initVideo(document);
    const video = $<HTMLVideoElement>('section.vid video');
    fire(view(), 0.8);
    $<HTMLButtonElement>('.vid-play').click();
    play.mockClear();
    fire(view(), 0.1);
    fire(view(), 0.9);
    expect(play).not.toHaveBeenCalled();

    $<HTMLButtonElement>('.vid-play').click();
    play.mockClear();
    fire(view(), 0.1);
    fire(view(), 0.9);
    expect(play).toHaveBeenCalledTimes(1);

    video.dispatchEvent(new Event('ended'));
    Object.defineProperty(video, 'ended', { configurable: true, get: () => true });
    play.mockClear();
    fire(view(), 0.1);
    fire(view(), 0.9);
    expect(play).not.toHaveBeenCalled();
  });

  it('pauses while the tab is hidden and resumes only if scroll playback was allowed', () => {
    mount();
    initVideo(document);
    fire(view(), 0.8);
    pause.mockClear();
    hidden = true;
    document.dispatchEvent(new Event('visibilitychange'));
    expect(pause).toHaveBeenCalled();
    play.mockClear();
    hidden = false;
    document.dispatchEvent(new Event('visibilitychange'));
    expect(play).toHaveBeenCalledTimes(1);

    $<HTMLButtonElement>('.vid-play').click();
    play.mockClear();
    hidden = true;
    document.dispatchEvent(new Event('visibilitychange'));
    hidden = false;
    document.dispatchEvent(new Event('visibilitychange'));
    expect(play).not.toHaveBeenCalled();
  });

  it('does not autoplay under reduced motion; the play button starts it', () => {
    window.matchMedia = media({ reduce: true });
    mount();
    initVideo(document);
    fire(view(), 1);
    expect(play).not.toHaveBeenCalled();
    expect($('section.vid .vid-frame').classList.contains('is-playing')).toBe(false);
    expect($('.vid-play').getAttribute('aria-label')).toBe('Play');
    $<HTMLButtonElement>('.vid-play').click();
    expect(play).toHaveBeenCalledTimes(1);
    expect($('.vid-play').getAttribute('aria-label')).toBe('Pause');
  });

  it('seeks from a click and from the keyboard, and asks the frame to go fullscreen', () => {
    mount();
    initVideo(document);
    const video = $<HTMLVideoElement>('section.vid video');
    const seek = $('.vid-seek');
    Object.defineProperty(video, 'duration', { configurable: true, get: () => 60 });
    vi.spyOn(seek, 'getBoundingClientRect').mockReturnValue({
      left: 0,
      width: 200,
      top: 0,
      height: 44,
      right: 200,
      bottom: 44,
      x: 0,
      y: 0,
      toJSON: () => ({}),
    } as DOMRect);
    seek.dispatchEvent(new PointerEvent('pointerdown', { clientX: 50, bubbles: true }));
    expect(video.currentTime).toBe(15);
    expect(seek.getAttribute('aria-valuenow')).toBe('25');
    expect(seek.getAttribute('aria-valuetext')).toBe('15 seconds');
    seek.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true, cancelable: true }));
    expect(video.currentTime).toBe(20);
    seek.dispatchEvent(new KeyboardEvent('keydown', { key: 'Home', bubbles: true, cancelable: true }));
    expect(video.currentTime).toBe(0);
    seek.dispatchEvent(new KeyboardEvent('keydown', { key: 'End', bubbles: true, cancelable: true }));
    expect(video.currentTime).toBe(60);

    const req = vi.fn(() => Promise.resolve());
    $<HTMLElement>('.vid-frame').requestFullscreen = req;
    $<HTMLButtonElement>('.vid-full').click();
    expect(req).toHaveBeenCalledTimes(1);
  });

  it('hides the bar 2.5s after play, brings it back on a tap without pausing, and keeps it while paused', () => {
    vi.useFakeTimers();
    try {
      mount();
      initVideo(document);
      const frame = $('section.vid .vid-frame');
      fire(view(), 0.8);
      expect(frame.classList.contains('is-chrome')).toBe(true);
      vi.advanceTimersByTime(CHROME_MS);
      expect(frame.classList.contains('is-chrome')).toBe(false);
      // Still muted, so the pill is the one control that stays.
      expect($('.vid-sound').getAttribute('aria-pressed')).toBe('false');

      pause.mockClear();
      frame.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }));
      frame.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      expect([frame.classList.contains('is-chrome'), pause.mock.calls.length]).toEqual([true, 0]);

      $<HTMLButtonElement>('.vid-sound').click();
      expect($('.vid-sound').getAttribute('aria-pressed')).toBe('true');
      vi.advanceTimersByTime(CHROME_MS);
      expect(frame.classList.contains('is-chrome')).toBe(false);

      $<HTMLButtonElement>('.vid-play').click();
      expect(frame.classList.contains('is-playing')).toBe(false);
      vi.advanceTimersByTime(CHROME_MS * 2);
      expect(frame.classList.contains('is-chrome')).toBe(true);
    } finally {
      vi.useRealTimers();
    }
  });

  it('is armed by the page script', () => {
    mount();
    init();
    expect($<HTMLVideoElement>('section.vid video').hasAttribute('controls')).toBe(false);
    expect($('.vid-chrome').hasAttribute('hidden')).toBe(false);
    expect($('.vid-sound-label').textContent).toBe('Tap for sound');
  });
});
