// The share image: what a link to any www page shows in iMessage, Slack, LinkedIn and the rest
// (og:image, twitter:image). One branded 1200 by 630 card, the Amplified Impact wordmark and the
// tagline on the kit's dark ground, never a person's photo: a portrait headshot made every preview
// look like a profile, not the business.
//
// THE PICTURE is `apps/web/public/img/og/amplified-impact.png`, rendered from `./og-image.ts` by
// `node apps/web/scripts/og-image.mjs`. Change the template, rerun the script, commit both.
//
// A PAGE CAN OVERRIDE IT through its own page data (`PageMeta.image` for the site's pages,
// `Guide.meta.image` for the skill and guide pages); none does today. Every head in this app that
// writes Open Graph tags calls `shareImageTags`, so the default is in one place.
//
// No import from the page renderers, so any of them can import this file without a cycle; it does
// its own escaping for the one value that is not a constant.

/** A share image: a path on www, its size in pixels, and what it shows. */
export interface ShareImage {
  src: string;
  width: number;
  height: number;
  alt: string;
}

/** Every link to www is to this origin, so every image URL is absolute on it. */
export const SHARE_ORIGIN = 'https://www.amplifiedimpact.io';

/** The default share image (1200 by 630, the size the big link previews use). */
export const SHARE_IMAGE: ShareImage = {
  src: '/img/og/amplified-impact.png',
  width: 1200,
  height: 630,
  alt: 'Amplified Impact',
};

const attr = (value: string): string =>
  value.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c] ?? c);

/**
 * The share image's head lines: Open Graph's image, size and description, and the large Twitter card
 * with the same image. `image` is the page's own, when it has one.
 */
export function shareImageTags(image: ShareImage = SHARE_IMAGE): string[] {
  const url = attr(new URL(image.src, SHARE_ORIGIN).toString());
  return [
    `<meta property="og:image" content="${url}" />`,
    `<meta property="og:image:width" content="${image.width}" />`,
    `<meta property="og:image:height" content="${image.height}" />`,
    `<meta property="og:image:alt" content="${attr(image.alt)}" />`,
    `<meta name="twitter:card" content="summary_large_image" />`,
    `<meta name="twitter:image" content="${url}" />`,
    `<meta name="twitter:image:alt" content="${attr(image.alt)}" />`,
  ];
}
