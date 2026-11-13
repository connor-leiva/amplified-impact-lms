// The Vite plugin behind the free guide pages (D-038, D-039): it fills each guide's shell
// (`apps/web/<slug>.html`) with what `render.ts` renders from that guide's content, as
// `src/legal/vite-plugin.ts` does for the legal pages and for the same reasons (see
// `src/ai101/vite-plugin.ts`). `ai101Inline()` then makes each page one response, its stylesheet and
// script inlined.

import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import type { Plugin, ResolvedConfig } from 'vite';
import { fill, ssrLoadForBuild } from '../ai101/vite-plugin.ts';
import type * as Render from './render.ts';
import type * as SetupExport from './setup-export.ts';

/**
 * Every guide's HTML entry, relative to the web app's root, and so its name in `dist/`: the slug, as
 * the API reads it (`apps/api/src/server.ts`). Keep in step with `GUIDES` in `content.ts`, which a
 * test checks.
 */
export const GUIDE_HTML = [
  'task-sync-starter.html',
  'ops-time-audit.html',
  'reel-editor.html',
  'database-health-check.html',
  'recruiting-prep.html',
  'team-playbook-builder.html',
  'content-strategist.html',
  'perfect-week.html',
  'inbox-meeting-follow-through.html',
  'due-diligence-review.html',
  'repair-request-response.html',
  'counter-explainer.html',
  'offer-strategy.html',
  'offer-comparison.html',
  'pricing-conversation-prep.html',
  'appointment-follow-up.html',
  'showing-tour-prep.html',
  'low-appraisal-response.html',
  'team-pnl-review.html',
  'new-construction-review.html',
  'listing-description-writer.html',
  'market-update-email.html',
  'l10-meeting-prep.html',
  'open-house-follow-up.html',
  'sphere-touch-plan.html',
  'fub-pipeline-review.html',
  'speed-to-lead-reply.html',
  'fub-automation-audit.html',
  'seller-listing-update.html',
  'listing-appointment-prep.html',
  'expired-fsbo-outreach.html',
  'agent-1on1-prep.html',
  'tc-file-audit.html',
  'post-closing-client-care.html',
  'team-ai-brain.html',
  'ai-brain-tuneup.html',
  'ai-brain-setup.html',
  'new-agent-onboarding-plan.html',
  'card-bank-feed-audit.html',
  'commission-tie-out.html',
  'team-payout-journals.html',
  'month-end-close.html',
  'trust-earnest-watch.html',
  'vendor-1099-readiness.html',
  'quarterly-tax-profit-first.html',
  'lead-source-roi.html',
  'contract-to-close-deadlines.html',
  'new-contract-intake.html',
  'missing-documents-audit.html',
  'weekly-status-updates.html',
  'stalled-item-follow-up.html',
  'closing-week-checklist.html',
  'listing-to-live.html',
  'post-close-file-closeout.html',
  'morning-brief.html',
] as const;

/** `render.ts`, as a URL from the app's root: what `ssrLoadModule` takes. */
const RENDER_URL = '/src/guides/render.ts';
/** `setup-export.ts`, the same way: each skill's full guided setup, for learn only (D-151). */
const EXPORT_URL = '/src/guides/setup-export.ts';

/**
 * Where the guides' file goes: `SKILL_GUIDES_DIR` and `SKILL_GUIDES_FILE` in `@ai/core/skill-guides`,
 * which the API reads. Written out here because a config file's imports load in plain Node, which
 * cannot resolve core's own imports; `gated.test.ts` holds the two equal.
 */
export const GUIDES_DIR = 'dist-private';
export const GUIDES_FILE = 'skill-guides.json';

/**
 * Writes every skill's full guided setup to `apps/web/dist-private/skill-guides.json` (D-151):
 * OUTSIDE `dist/`, so no route can serve it, for the API to read at boot. Exported for its test.
 */
export function writeSkillGuides(root: string, data: unknown): string {
  const dir = join(root, GUIDES_DIR);
  mkdirSync(dir, { recursive: true });
  const file = join(dir, GUIDES_FILE);
  writeFileSync(file, JSON.stringify(data));
  return file;
}

const HEAD_MARKER = '<!--guide:head-->';
const BODY_MARKER = '<!--guide:body-->';

/** The guide entry a file is, if it is one. */
const guideHtml = (filename: string) => GUIDE_HTML.find((html) => filename.replace(/\\/g, '/').endsWith(`/${html}`));

export function guideRender(): Plugin {
  let config: ResolvedConfig;
  // Whether this build drew any guide page: only the pages' build writes the guides' file.
  let drewGuides = false;
  return {
    name: 'guide-render',
    configResolved(resolved) {
      config = resolved;
    },
    // D-151: once the pages are written (their HTML holds each setup's step titles only), the full
    // setups go to the server-only file, from the same content the pages were drawn from.
    async closeBundle() {
      if (config.command !== 'build' || !drewGuides) return;
      const exporter = await ssrLoadForBuild<typeof SetupExport>(config, EXPORT_URL);
      writeSkillGuides(config.root, exporter.exportSkillGuides());
    },
    transformIndexHtml: {
      // Before Vite's own HTML processing, so the build sees the finished document.
      order: 'pre',
      async handler(html, ctx) {
        const entry = guideHtml(ctx.filename);
        if (!entry) return;
        drewGuides = true;
        const render = ctx.server
          ? ((await ctx.server.ssrLoadModule(RENDER_URL)) as typeof Render)
          : await ssrLoadForBuild<typeof Render>(config, RENDER_URL);
        const guide = render.guideFor(entry.replace(/\.html$/, ''));
        return fill(
          fill(html, HEAD_MARKER, render.renderGuideHead(guide), entry),
          BODY_MARKER,
          render.renderGuideBody(guide),
          entry,
        );
      },
    },
  };
}
