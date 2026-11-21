// D-226 (B-41): the academy logos the v3 shell draws, the brand's own files (handoff/lms-v3/brand/logos/, byte for
// byte: the checksum test reads SHA256SUMS). Read as text and inlined as data: URIs, as `BrandSlot` inlines today's
// (no request, and the CSP's `img-src 'self' data:` allows them). Which lockup ships is Q-16 (D-233): the shell
// draws the app lockup, the mockup's default; the full lockup is here because the mockup's markup carries both.
import app from './logos/amplified-impact-academy-app.svg?raw';
import full from './logos/amplified-impact-academy.svg?raw';
import mark from './logos/favicon.svg?raw';
import type { ShellLogos } from './shell.vm';

const inline = (svg: string): string => `data:image/svg+xml,${encodeURIComponent(svg.trim())}`;

export const LOGOS: ShellLogos = { app: inline(app), full: inline(full), mark: inline(mark) };
