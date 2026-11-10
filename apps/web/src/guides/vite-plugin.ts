// The Vite plugin behind the free guide pages (D-038, D-039): it fills each guide's shell
// (`apps/web/<slug>.html`) with what `render.ts` renders from that guide's content, as
// `src/legal/vite-plugin.ts` does for the legal pages and for the same reasons (see
// `src/ai101/vite-plugin.ts`). `ai101Inline()` then makes each page one response, its stylesheet and
// script inlined.

import type { Plugin, ResolvedConfig } from 'vite';
import { fill, ssrLoadForBuild } from '../ai101/vite-plugin.ts';
import type * as Render from './render.ts';

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
] as const;

/** `render.ts`, as a URL from the app's root: what `ssrLoadModule` takes. */
const RENDER_URL = '/src/guides/render.ts';

const HEAD_MARKER = '<!--guide:head-->';
const BODY_MARKER = '<!--guide:body-->';

/** The guide entry a file is, if it is one. */
const guideHtml = (filename: string) => GUIDE_HTML.find((html) => filename.replace(/\\/g, '/').endsWith(`/${html}`));

export function guideRender(): Plugin {
  let config: ResolvedConfig;
  return {
    name: 'guide-render',
    configResolved(resolved) {
      config = resolved;
    },
    transformIndexHtml: {
      // Before Vite's own HTML processing, so the build sees the finished document.
      order: 'pre',
      async handler(html, ctx) {
        const entry = guideHtml(ctx.filename);
        if (!entry) return;
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
