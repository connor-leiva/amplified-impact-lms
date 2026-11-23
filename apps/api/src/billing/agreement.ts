// The subscription agreement's version (/agreement), recorded on every order whose buyer accepted it.
// A Payment Link's terms checkbox is that acceptance (`consent.terms_of_service`, read by the webhook).
// It lived beside the site's own checkout, which D-104 retired.

/** Bumped when /agreement changes in substance; recorded on every order. Beside `TERMS_VERSION`. */
export const AGREEMENT_VERSION = '2026-11-23';

/** The date /agreement says these words took effect. Held equal to the page by offer-copy.test.ts. */
export const AGREEMENT_EFFECTIVE = { iso: '2026-11-23', label: 'November 23, 2026' } as const;
