// D-183: how the player reads a replay's link.
import { describe, expect, it } from 'vitest';
import { classifyReplayUrl, replaySource, videoBlockSource } from './source';

describe('the replay link, classified (D-183)', () => {
  it('plays an HLS manifest and a video file; offers any other page as a link @parity:E-1', () => {
    expect(classifyReplayUrl('https://stream.example.com/r/week1.m3u8')).toEqual({ kind: 'hls', src: 'https://stream.example.com/r/week1.m3u8' });
    expect(classifyReplayUrl('https://cdn.example.com/r/week1.M3U8?token=abc')).toEqual({ kind: 'hls', src: 'https://cdn.example.com/r/week1.M3U8?token=abc' });
    expect(classifyReplayUrl('https://cdn.example.com/r/week1.mp4')).toEqual({ kind: 'file', src: 'https://cdn.example.com/r/week1.mp4' });
    expect(classifyReplayUrl('https://cdn.example.com/r/week1.webm#t=10')).toEqual({ kind: 'file', src: 'https://cdn.example.com/r/week1.webm#t=10' });
    for (const page of [
      'https://us02web.zoom.us/rec/share/abc123',
      'https://vimeo.com/123456789',
      'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
      'https://youtu.be/dQw4w9WgXcQ',
      'https://www.loom.com/share/abc',
      'https://example.com/replays/week-1',
      'https://example.com/watch?file=week1.mp4',
    ])
      expect(classifyReplayUrl(page)).toEqual({ kind: 'link', href: new URL(page).href });
  });

  it('ignores anything that isn’t an http(s) address', () => {
    for (const bad of ['javascript:alert(1)', 'data:video/mp4;base64,AAAA', 'ftp://example.com/a.mp4', 'not a url', '', null, undefined]) expect(classifyReplayUrl(bad)).toBeNull();
  });

  it('the module’s manifest wins when set, as on the AI Employee page', () => {
    expect(replaySource('https://stream.example.com/m.m3u8', 'https://zoom.us/rec/share/x')).toEqual({ kind: 'hls', src: 'https://stream.example.com/m.m3u8' });
    expect(replaySource('', 'https://zoom.us/rec/share/x')).toEqual({ kind: 'link', href: 'https://zoom.us/rec/share/x' });
    expect(replaySource('', 'https://cdn.example.com/a.mp4')).toEqual({ kind: 'file', src: 'https://cdn.example.com/a.mp4' });
    expect(replaySource('javascript:alert(1)', undefined)).toBeNull();
    expect(replaySource('', undefined)).toBeNull();
  });
});

describe('a course video block, classified (D-188)', () => {
  const url = (key: string) => `/api/files/course/${key}`;
  it('plays an uploaded mp4 from its same-origin address', () => {
    expect(videoBlockSource({ type: 'video', source: { upload: 'uploads/2026/12/aaaaaaaa-bbbb.mp4', name: 'a.mp4', size: 1, type: 'video/mp4' } }, url)).toEqual({
      kind: 'file',
      src: '/api/files/course/uploads/2026/12/aaaaaaaa-bbbb.mp4',
    });
  });
  it('plays an .m3u8 or .mp4 link inline, and opens any other page', () => {
    expect(videoBlockSource({ type: 'video', source: { url: 'https://cdn.example.com/w1.m3u8' } }, url)).toEqual({ kind: 'hls', src: 'https://cdn.example.com/w1.m3u8' });
    expect(videoBlockSource({ type: 'video', source: { url: 'https://cdn.example.com/w1.mp4' } }, url)).toEqual({ kind: 'file', src: 'https://cdn.example.com/w1.mp4' });
    expect(videoBlockSource({ type: 'video', source: { url: 'https://www.loom.com/share/abc' } }, url)).toEqual({ kind: 'link', href: 'https://www.loom.com/share/abc' });
    expect(videoBlockSource({ type: 'video', source: { url: 'javascript:alert(1)' } }, url)).toBeNull();
  });
});
