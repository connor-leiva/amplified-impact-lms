// D-226, D-233 (B-41, v7): the academy logo the v3 shell draws: one file, the brand's own "ai academy" app lockup
// (handoff/lms-v3/brand/logos/, byte for byte: the checksum test reads SHA256SUMS). The collapsed rail shows this same
// file through a 26px window, its "ai" (lms.css), never a second drawing. Read as text and inlined as a data: URI, as
// `BrandSlot` inlines today's (no request, and the CSP's `img-src 'self' data:` allows it).
import app from './logos/amplified-impact-academy-app.svg?raw';
import type { ShellLogos } from './shell.vm';

const inline = (svg: string): string => `data:image/svg+xml,${encodeURIComponent(svg.trim())}`;

export const LOGOS: ShellLogos = { app: inline(app) };
