// D-188: a course video block, as a learner sees it on a step and in a week's Media.
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import type { PathBlock, VideoBlock } from '@ai/core/course-types';
import { Blocks, VideoView } from './parts';

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

  it('sits in a step’s path among the other blocks', () => {
    const blocks: PathBlock[] = [{ type: 'text', text: 'First, watch.' }, UPLOAD, { type: 'copy', text: 'Prompt' }];
    const { container } = render(<Blocks blocks={blocks} />);
    expect(screen.getByText('First, watch.')).toBeInTheDocument();
    expect(container.querySelectorAll('video')).toHaveLength(1);
    expect(screen.getByRole('button', { name: 'Copy' })).toBeInTheDocument();
  });
});
