// D-183: what a replay's link is, so the player knows how to play it. Pure.
//
// The module's HLS manifest (`playbackUrl`, phase 08 § 8.3) wins when there is one, as on the AI Employee
// page. Otherwise the recording staff attached to the session (D-172's Attach replay, `replayUrl`, which a
// learner receives once it is published to them):
//   - an HLS manifest (`.m3u8`) plays through `HlsEngine` (hls.js, or the browser's own HLS);
//   - a video file (`.mp4`, `.webm`) plays in the video element;
//   - any other page (a Zoom, Vimeo, YouTube or Loom share, or anything else) can't be played here, so
//     the player offers "Watch Replay" in a new tab;
//   - anything that isn't an http(s) address is ignored, so no other scheme ever becomes a link.

import { isVideoUpload } from '@ai/core/course-types';
import type { VideoBlock } from '@ai/core/course-types';

export type ReplaySource = { kind: 'hls'; src: string } | { kind: 'file'; src: string } | { kind: 'link'; href: string } | null;

const parse = (raw: string): URL | null => {
  try {
    const u = new URL(raw.trim());
    return u.protocol === 'https:' || u.protocol === 'http:' ? u : null;
  } catch {
    return null;
  }
};

/** One address, classified by its path's extension (the query and fragment don't count). */
export function classifyReplayUrl(raw: string | null | undefined): ReplaySource {
  if (!raw) return null;
  const u = parse(raw);
  if (!u) return null;
  const path = u.pathname.toLowerCase();
  if (path.endsWith('.m3u8')) return { kind: 'hls', src: u.href };
  if (path.endsWith('.mp4') || path.endsWith('.webm')) return { kind: 'file', src: u.href };
  return { kind: 'link', href: u.href };
}

/** The module's manifest when it has one (it plays as HLS, as today), else the session's link. */
export function replaySource(playbackUrl: string | null | undefined, sessionUrl: string | null | undefined): ReplaySource {
  if (playbackUrl) {
    const u = parse(playbackUrl);
    if (u) return classifyReplayUrl(playbackUrl)?.kind === 'file' ? { kind: 'file', src: u.href } : { kind: 'hls', src: u.href };
  }
  return classifyReplayUrl(sessionUrl);
}

/**
 * D-188: what a course video block plays. An uploaded mp4 is a file at its same-origin API address
 * (`uploadUrl`, `/api/files/course/<key>`, or this tab's own copy right after an upload); a link is
 * classified like a replay's: `.m3u8` and `.mp4` play inline, any other page is a link to open.
 */
export function videoBlockSource(block: VideoBlock, uploadUrl: (key: string) => string): ReplaySource {
  if (isVideoUpload(block.source)) return { kind: 'file', src: uploadUrl(block.source.upload) };
  return classifyReplayUrl(block.source.url);
}
