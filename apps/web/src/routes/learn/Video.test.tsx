// D-188: a course video block, as a learner sees it on a step and in a week's Media.
// D-191: chapters, the transcript drawer and watched time, on top of that player.
import { readFileSync } from 'node:fs';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { acceleratorModuleId } from '@ai/core/accelerator';
import { isLockedWeek } from '@ai/core/course';
import type { OpenCourseWeek } from '@ai/core/course';
import type { PathBlock, VideoBlock } from '@ai/core/course-types';
import { courseVideoUrl } from '../../data/files';
import { Blocks, VideoView } from './parts';
import { LIVE_NOW, learnState } from './test/fixture';

const UPLOAD: VideoBlock = { type: 'video', source: { upload: 'uploads/2026/12/aaaaaaaa-bbbb-4ccc-8ddd-000000000001.mp4', name: 'Build.mp4', size: 10, type: 'video/mp4' }, title: 'Watch the build' };

describe('a course video block (D-188)', () => {
  it('plays an uploaded mp4 from its same-origin API address, with the browser’s own controls', () => {
    const { container } = render(<VideoView block={UPLOAD} />);
    const video = container.querySelector('video')!;
    expect(video.getAttribute('src')).toBe('/api/files/course/uploads/2026/12/aaaaaaaa-bbbb-4ccc-8ddd-000000000001.mp4');
    expect(video.hasAttribute('controls')).toBe(true);
    expect(video).toHaveAccessibleName('Watch the build');
    expect(screen.getByText('Watch the build').tagName).toBe('FIGCAPTION');
  });

  it('plays an .mp4 link inline, and names an untitled video', () => {
    const { container } = render(<VideoView block={{ type: 'video', source: { url: 'https://cdn.example.test/w1.mp4' } }} />);
    const video = container.querySelector('video')!;
    expect(video.getAttribute('src')).toBe('https://cdn.example.test/w1.mp4');
    expect(video).toHaveAccessibleName('Video');
  });

  it('opens any other page in a new tab from Watch', () => {
    render(<VideoView block={{ type: 'video', source: { url: 'https://www.youtube.com/watch?v=abc' }, title: 'Intro' }} />);
    const link = screen.getByRole('link', { name: 'Watch Intro' });
    expect(link).toHaveAttribute('href', 'https://www.youtube.com/watch?v=abc');
    expect(link).toHaveAttribute('target', '_blank');
    expect(link).toHaveAttribute('rel', 'noopener noreferrer');
    expect(document.querySelector('video')).toBeNull();
  });

  it('draws nothing for an address that isn’t http(s)', () => {
    const { container } = render(<VideoView block={{ type: 'video', source: { url: 'javascript:alert(1)' } }} />);
    expect(container.innerHTML).toBe('');
  });

  it('a block without the new fields has no chapters, transcript or draft badge', () => {
    render(<VideoView block={UPLOAD} />);
    expect(screen.queryByRole('list', { name: 'Chapters' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Show transcript' })).toBeNull();
    expect(screen.queryByText('Draft video · narration coming')).toBeNull();
  });

  it('sits in a step’s path among the other blocks', () => {
    const blocks: PathBlock[] = [{ type: 'text', text: 'First, watch.' }, UPLOAD, { type: 'copy', text: 'Prompt' }];
    const { container } = render(<Blocks blocks={blocks} />);
    expect(screen.getByText('First, watch.')).toBeInTheDocument();
    expect(container.querySelectorAll('video')).toHaveLength(1);
    expect(screen.getByRole('button', { name: 'Copy' })).toBeInTheDocument();
  });
});

const CHAPTERED: VideoBlock = {
  ...UPLOAD,
  id: 'w0-02',
  draft: true,
  chapters: [
    { t: 0, label: 'Welcome' },
    { t: 47, label: 'The hire' },
  ],
  transcript: { upload: 'uploads/2026/12/aaaaaaaa-bbbb-4ccc-8ddd-000000000009.vtt', name: 'w.vtt', size: 20, type: 'text/vtt' },
};

function controllable(el: HTMLVideoElement, duration = 100): void {
  let time = 0;
  Object.defineProperty(el, 'duration', { configurable: true, get: () => duration });
  Object.defineProperty(el, 'currentTime', {
    configurable: true,
    get: () => time,
    set: (v: number) => {
      time = v;
    },
  });
  el.play = () => Promise.resolve();
}

describe('chapters, transcript and watched time (D-191)', () => {
  it('seeks and plays when a chapter is clicked, and follows currentTime', () => {
    const { container } = render(<VideoView block={CHAPTERED} />);
    expect(screen.getByText('Draft video · narration coming')).toBeInTheDocument();
    const video = container.querySelector('video')!;
    controllable(video);
    fireEvent.click(screen.getByRole('button', { name: /The hire/ }));
    expect(video.currentTime).toBe(47);
    expect(screen.getByRole('button', { name: /The hire/ })).toHaveAttribute('aria-current', 'true');
    video.currentTime = 0;
    fireEvent.timeUpdate(video);
    expect(screen.getByRole('button', { name: /Welcome/ })).toHaveAttribute('aria-current', 'true');
  });

  it('opens the transcript, traps focus, and closes on Escape', async () => {
    const vtt = 'WEBVTT\n\n00:00:00.000 --> 00:00:01.000\nWelcome in.\n';
    vi.stubGlobal('fetch', vi.fn(async () => ({ ok: true, text: async () => vtt })));
    render(<VideoView block={CHAPTERED} />);
    fireEvent.click(screen.getByRole('button', { name: 'Show transcript' }));
    const dialog = screen.getByRole('dialog', { name: 'Transcript' });
    expect(dialog).toHaveAttribute('data-drawer', 'open');
    await waitFor(() => expect(screen.getByRole('button', { name: /Welcome in/ })).toBeInTheDocument());
    const close = screen.getByRole('button', { name: 'Close' });
    const cue = screen.getByRole('button', { name: /Welcome in/ });
    cue.focus();
    fireEvent.keyDown(dialog, { key: 'Tab' });
    expect(document.activeElement).toBe(close);
    fireEvent.keyDown(dialog, { key: 'Escape' });
    expect(screen.queryByRole('dialog')).toBeNull();
    vi.unstubAllGlobals();
  });

  it('counts seconds played and not a seek, and reports 90% once that much is watched', () => {
    const onSave = vi.fn();
    const { container } = render(<VideoView block={CHAPTERED} watch={{ progress: [], onSave }} />);
    const video = container.querySelector('video')!;
    controllable(video, 100);
    fireEvent.play(video);
    for (let t = 1; t <= 90; t += 1) {
      video.currentTime = t;
      fireEvent.timeUpdate(video);
    }
    fireEvent.pause(video);
    const watched = Math.max(...onSave.mock.calls.map((c) => (c[0] as { maxPct: number }).maxPct));
    expect(watched).toBeGreaterThanOrEqual(0.9);
    expect(watched).toBeLessThan(0.95);
    onSave.mockClear();
    video.currentTime = 100;
    fireEvent.seeked(video);
    fireEvent.pause(video);
    const after = onSave.mock.calls.map((c) => (c[0] as { maxPct: number }).maxPct);
    expect(Math.max(...after)).toBeLessThan(0.95);
  });

  it('falls back to the Watch link when the file fails, and keeps the page usable', () => {
    const { container } = render(<VideoView block={CHAPTERED} />);
    const video = container.querySelector('video')!;
    Object.defineProperty(video, 'error', { configurable: true, get: () => ({ code: 4 }) });
    fireEvent.error(video);
    expect(screen.getByRole('link', { name: 'Watch Watch the build' })).toBeInTheDocument();
    expect(container.querySelector('video')).toBeNull();
  });

  it('drops chapter motion when the reader asks for less motion', () => {
    const css = readFileSync('src/routes/learn/Learn.module.css', 'utf8');
    expect(css).toMatch(/prefers-reduced-motion:\s*reduce[\s\S]*\.vchap/);
  });
});

const POSTER_KEY = 'uploads/2026/11/aaaaaaaa-bbbb-4ccc-8ddd-0000000000bb.jpg';
const WITH_POSTER: VideoBlock = {
  ...UPLOAD,
  id: 'w0-02',
  title: 'Week 0 Orientation',
  poster: { upload: POSTER_KEY, name: 'orientation.jpg', size: 78_000, type: 'image/jpeg' },
};

describe('the poster image (D-197)', () => {
  it('the learner payload includes a poster URL when one is set', () => {
    const st = learnState(LIVE_NOW, false, {}, 15, (d) => {
      const mod = d.modules.find((m) => m.id === acceleratorModuleId(0));
      if (!mod) throw new Error('no week 0');
      mod.checklist[1]!.paths = { claude: { blocks: [WITH_POSTER] } };
    });
    const week = st.payload.course.weeks.find((w) => w.week === 0);
    if (!week || isLockedWeek(week)) throw new Error('week 0 is closed');
    const block = (week as OpenCourseWeek).module.checklist[1]!.paths?.claude?.blocks[0];
    expect(block).toMatchObject({ type: 'video', id: 'w0-02', poster: WITH_POSTER.poster });
    if (!block || block.type !== 'video' || !block.poster) throw new Error('poster missing');
    expect(courseVideoUrl(block.poster.upload)).toBe(`/api/files/course/${POSTER_KEY}`);
  });

  it('renders the poster image behind the play button, and keeps the poster attribute', () => {
    const { container } = render(<VideoView block={WITH_POSTER} />);
    const url = `/api/files/course/${POSTER_KEY}`;
    const video = container.querySelector('video')!;
    expect(video).toHaveAttribute('poster', url);
    expect(video).toHaveAttribute('preload', 'metadata');
    const img = screen.getByRole('img', { name: 'Week 0 Orientation' });
    expect(img).toHaveAttribute('src', url);
    const button = screen.getByRole('button', { name: 'Play Week 0 Orientation' });
    expect(img.compareDocumentPosition(button) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    const css = readFileSync('src/routes/learn/Learn.module.css', 'utf8');
    expect(css).toMatch(/\.vposter\s*\{[^}]*object-fit:\s*cover/);
    const play = vi.fn(() => Promise.resolve());
    video.play = play;
    fireEvent.click(button);
    expect(play).toHaveBeenCalled();
    fireEvent.play(video);
    expect(screen.queryByRole('img', { name: 'Week 0 Orientation' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Play Week 0 Orientation' })).toBeNull();
    expect(container.querySelector('video')).toHaveAttribute('poster', url);
  });

  it('draws no poster image when the block has none', () => {
    const { container } = render(<VideoView block={UPLOAD} />);
    expect(container.querySelector('img')).toBeNull();
    expect(container.querySelector('video')).not.toHaveAttribute('poster');
    expect(container.querySelector('.vframe, [class*="vframe"]')).toBeNull();
  });
});
