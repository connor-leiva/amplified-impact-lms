// S2's player. The markup plays with the browser's controls and downloads nothing (`preload="none"`).
// This replaces that chrome and:
//   - starts the file only once the frame is within PRIME_MARGIN of the viewport;
//   - plays muted once PLAY_AT of the frame is visible, and pauses below PAUSE_BELOW, resuming
//     where it left off (it never seeks back to the start, and an ended film stays ended);
//   - leaves sound on, once someone turns it on, across those pauses;
//   - does not resume after they pause it themselves, until they press play;
//   - pauses while the tab is hidden;
//   - never autoplays under reduced motion (the big play button is the way in).
// A rejected play() (low-power mode, a browser that blocks it) is swallowed and the play button stays.

import { reducedMotion } from './kit';

/** Play once this much of the frame is on screen. */
export const PLAY_AT = 0.5;
/** Pause once less than this much of the frame is left on screen. */
export const PAUSE_BELOW = 0.25;
/** Don't fetch the file until the frame is this close to the viewport. */
export const PRIME_MARGIN = '200px';

const SEEK_STEP = 5;

type FullscreenVideo = HTMLVideoElement & { webkitEnterFullscreen?: () => void };

export function initVideo(root: ParentNode): void {
  const frame = root.querySelector<HTMLElement>('section.vid .vid-frame');
  const video = frame?.querySelector('video');
  const chrome = frame?.querySelector<HTMLElement>('.vid-chrome');
  if (!frame || !video || !chrome || frame.dataset.vidOn === '1') return;
  frame.dataset.vidOn = '1';

  const playBtn = chrome.querySelector<HTMLButtonElement>('.vid-play');
  const soundBtn = chrome.querySelector<HTMLButtonElement>('.vid-sound');
  const fullBtn = chrome.querySelector<HTMLButtonElement>('.vid-full');
  const seek = chrome.querySelector<HTMLElement>('.vid-seek');
  if (!playBtn || !soundBtn || !fullBtn || !seek) return;

  video.removeAttribute('controls');
  video.controls = false;
  video.playsInline = true;
  chrome.hidden = false;

  let primed = false;
  let want = false;
  let held = false;
  let soundOn = false;
  let ratio = 0;
  let dragging = false;

  const syncPlaying = (playing: boolean) => {
    frame.classList.toggle('is-playing', playing);
    playBtn.setAttribute('aria-label', playing ? 'Pause' : 'Play');
  };
  const syncSound = () => {
    video.muted = !soundOn;
    soundBtn.setAttribute('aria-pressed', soundOn ? 'true' : 'false');
    soundBtn.setAttribute('aria-label', soundOn ? 'Mute' : 'Tap for sound');
  };
  const syncFs = () => {
    if (!frame.isConnected) return;
    const on = document.fullscreenElement === frame;
    frame.classList.toggle('is-fs', on);
    fullBtn.setAttribute('aria-pressed', on ? 'true' : 'false');
    fullBtn.setAttribute('aria-label', on ? 'Exit full screen' : 'Full screen');
  };
  const paint = () => {
    const d = video.duration;
    const t = Number.isFinite(video.currentTime) ? video.currentTime : 0;
    const q = Number.isFinite(d) && d > 0 ? Math.min(1, Math.max(0, t / d)) : 0;
    seek.style.setProperty('--q', q.toFixed(4));
    seek.setAttribute('aria-valuenow', String(Math.round(q * 100)));
    seek.setAttribute('aria-valuetext', `${Math.floor(t)} seconds`);
  };
  const arm = () => {
    if (primed) return;
    primed = true;
    video.preload = 'auto';
  };
  /** Fetch ahead of playback. `load()` would restart a film already playing, so play() arms without it. */
  const prime = () => {
    if (primed) return;
    arm();
    video.load();
  };
  const blocked = () => reducedMotion() || held || document.visibilityState === 'hidden' || video.ended;
  const playFrom = (user: boolean) => {
    if (!frame.isConnected) return;
    if (!user && blocked()) return;
    want = true;
    arm();
    video.muted = !soundOn;
    syncPlaying(true);
    const pending = video.play();
    if (pending && typeof pending.catch === 'function') {
      void pending.catch(() => {
        if (!want) return;
        want = false;
        syncPlaying(false);
      });
    }
  };
  const stop = () => {
    want = false;
    video.pause();
  };

  syncSound();
  syncPlaying(false);
  syncFs();
  paint();

  playBtn.addEventListener('click', () => {
    if (frame.classList.contains('is-playing')) {
      held = true;
      stop();
      return;
    }
    held = false;
    playFrom(true);
  });
  soundBtn.addEventListener('click', () => {
    soundOn = !soundOn;
    syncSound();
  });
  fullBtn.addEventListener('click', () => {
    if (document.fullscreenElement) {
      const done = document.exitFullscreen?.();
      if (done && typeof done.catch === 'function') void done.catch(() => undefined);
      return;
    }
    if (typeof frame.requestFullscreen === 'function') {
      void frame.requestFullscreen().catch(() => (video as FullscreenVideo).webkitEnterFullscreen?.());
      return;
    }
    (video as FullscreenVideo).webkitEnterFullscreen?.();
  });
  frame.addEventListener('click', (e) => {
    const t = e.target;
    if (!(t instanceof Node)) return;
    if (t instanceof Element && t.closest('button, .vid-seek')) return;
    if (frame.classList.contains('is-playing')) {
      held = true;
      stop();
      return;
    }
    held = false;
    playFrom(true);
  });

  const at = (clientX: number) => {
    const box = seek.getBoundingClientRect();
    if (!box.width) return 0;
    return Math.min(1, Math.max(0, (clientX - box.left) / box.width));
  };
  const seekTo = (q: number) => {
    const d = video.duration;
    if (!Number.isFinite(d) || d <= 0) return;
    const next = Math.min(d, Math.max(0, q * d));
    if (video.currentTime !== next) video.currentTime = next;
    paint();
  };
  seek.addEventListener('pointerdown', (e) => {
    dragging = true;
    try {
      seek.setPointerCapture?.(e.pointerId);
    } catch {
      // A browser that won't capture this pointer. Moves still update the bar while the button is down.
    }
    seekTo(at(e.clientX));
  });
  seek.addEventListener('pointermove', (e) => {
    if (!dragging) return;
    seekTo(at(e.clientX));
  });
  const endDrag = () => {
    dragging = false;
  };
  seek.addEventListener('pointerup', endDrag);
  seek.addEventListener('pointercancel', endDrag);
  seek.addEventListener('keydown', (e) => {
    const d = video.duration;
    if (!Number.isFinite(d) || d <= 0) return;
    let next = video.currentTime;
    if (e.key === 'ArrowRight') next += SEEK_STEP;
    else if (e.key === 'ArrowLeft') next -= SEEK_STEP;
    else if (e.key === 'Home') next = 0;
    else if (e.key === 'End') next = d;
    else return;
    e.preventDefault();
    video.currentTime = Math.min(d, Math.max(0, next));
    paint();
  });

  video.addEventListener('play', () => {
    if (!want) {
      video.pause();
      return;
    }
    syncPlaying(true);
  });
  video.addEventListener('pause', () => syncPlaying(false));
  video.addEventListener('ended', () => {
    want = false;
    syncPlaying(false);
  });
  video.addEventListener('timeupdate', paint);
  video.addEventListener('durationchange', paint);
  video.addEventListener('seeked', paint);

  document.addEventListener('fullscreenchange', syncFs);
  document.addEventListener('visibilitychange', () => {
    if (!frame.isConnected) return;
    if (document.visibilityState === 'hidden') {
      stop();
      return;
    }
    if (ratio >= PLAY_AT) playFrom(false);
  });

  if (typeof IntersectionObserver !== 'function') return;

  const near = new IntersectionObserver(
    (entries) => {
      if (!entries.some((e) => e.isIntersecting)) return;
      prime();
      near.disconnect();
    },
    { rootMargin: PRIME_MARGIN, threshold: 0 },
  );
  near.observe(frame);

  const view = new IntersectionObserver(
    (entries) => {
      const entry = entries[0];
      if (!entry || !frame.isConnected) return;
      ratio = entry.intersectionRatio;
      if (ratio >= PLAY_AT) playFrom(false);
      else if (ratio < PAUSE_BELOW) stop();
    },
    { threshold: [0, PAUSE_BELOW, PLAY_AT, 1] },
  );
  view.observe(frame);
}
