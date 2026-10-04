// The shared shell every one of § 8.1's nine templates renders inside, phase 08 § 8.1:
//
//   "Each email has a 560 px content column, Hanken Grotesk with a system-sans fallback, the H1 at
//    26/32, body text at 14/20 and one primary button styled like `Button primary`."
//
// The shell exists exactly once, here, so that sentence is implemented once and the nine templates
// are nothing but copy and a link.
//
// =================================================================================================
// WHY THERE IS INLINE HEX IN THIS DIRECTORY, AND WHY IT MUST STAY
// =================================================================================================
//
// CLAUDE.md: "Styling uses tokens. Use only `var(--token)`: no hex, rgb or named colors." That rule
// governs `apps/web`. It CANNOT be followed in an email, and § 8.1 says so explicitly: templates
// are built "with the same tokens as **inline hex values** … because email clients don't support
// CSS variables or `oklch`."
//
// Both halves of that matter, and they fail differently:
//   - `var(--text-primary)` in an email is an unresolvable reference. Outlook, Gmail's web client
//     and Apple Mail all drop the declaration, so the element falls back to its inherited or UA
//     colour. On a dark-mode client that forcibly recolours the background, the result is the bug
//     this whole arrangement exists to prevent: black text on a black card, invisible, with nothing
//     in the HTML to explain why.
//   - `oklch(…)` is a CSS Color 4 function. Even clients that keep the declaration cannot parse it,
//     so it is the same failure with an extra step.
//
// So every colour here is a literal sRGB hex, and none of them is typed by hand: they come from
// `EMAIL_TOKENS` in `../tokens.ts`, which `scripts/email-tokens.mjs` generates by resolving
// `apps/web/src/styles/tokens.css`'s light mode in a real browser. The emails therefore track the
// design system automatically — regenerate the module and every template moves with it.
//
// `templates.test.tsx` asserts that no `var(--` and no `oklch(` survives into the rendered HTML of
// any of the nine. DO NOT "fix" this file back to tokens; the test will tell you the same thing.
// =================================================================================================

import { Body, Button, Container, Head, Heading, Html, Preview, Section, Text } from '@react-email/components';
import type { CSSProperties, ReactNode } from 'react';
import { EMAIL_FONT_STACK, EMAIL_TOKENS } from '../tokens';

const T = EMAIL_TOKENS;

/**
 * § 8.1's content column. Exported because `templates.test.tsx` asserts the rendered width rather
 * than trusting the number twice.
 */
export const CONTENT_WIDTH = 560;

/**
 * The Google Fonts stylesheet the reference itself loads
 * (`design-reference/*.dc.html`, line 13), narrowed to the one family an email uses.
 *
 * It is a `<link>` rather than React Email's `<Font>` component for two reasons:
 *   - `<Font>` takes the family and its fallbacks as separate arguments and re-quotes the family
 *     itself, so it cannot be handed `EMAIL_FONT_STACK` — and the generated stack is the thing
 *     § 8.1 asks for ("Hanken Grotesk with a system-sans fallback").
 *   - `<Font>` also emits an `@font-face` with no `src` when no web font is given, which is a
 *     declaration that can only ever be ignored.
 *
 * A `<link>` in `<head>` is honoured by Apple Mail and Thunderbird and ignored by Outlook and
 * Gmail, which is why the family is ALSO set inline, as `EMAIL_FONT_STACK`, on every element that
 * renders text. Neither mechanism is load-bearing on its own.
 */
const FONT_HREF = 'https://fonts.googleapis.com/css2?family=Hanken+Grotesk:wght@400;500;600;700&display=swap';

/**
 * The page around the column. `padding: 32px 16px` and `--bg-canvas` are `SignIn.module.css`'s
 * `.page`, which is the app's own one-card-on-canvas screen — the only layout in the product an
 * email resembles. Nothing here is a number of my own.
 */
const page: CSSProperties = {
  margin: 0,
  padding: '32px 16px',
  backgroundColor: T['bg-canvas'],
  color: T['text-primary'],
  fontFamily: EMAIL_FONT_STACK,
};

/**
 * The 560 px column, with phase 07 § 7.5's card metrics around it: padding 32, radius 16, a 1px
 * `--line-default` border on `--bg-surface`. § 7.5's card is 400 px wide; § 8.1 says 560, and that
 * width is the only value that differs.
 *
 * `--shadow-card` is deliberately absent: `box-shadow` is dropped by every Outlook build, and
 * `tokens.ts` exports no hex for it because a shadow token is not a colour.
 *
 * `width` AND `maxWidth` are both set. `Container` renders a `<table width="100%">`, so the
 * attribute keeps Outlook's Word engine at the available width while the CSS holds the column at
 * 560 everywhere else, and `maxWidth` is what keeps it from overflowing a 375 px phone.
 */
const column: CSSProperties = {
  width: `${CONTENT_WIDTH}px`,
  maxWidth: `${CONTENT_WIDTH}px`,
  padding: '32px',
  borderRadius: '16px',
  border: `1px solid ${T['line-default']}`,
  backgroundColor: T['bg-surface'],
};

/**
 * § 8.1's H1, at 26/32. Weight 600 and `letter-spacing: -0.02em` come from `SignIn.module.css`'s
 * `.h1`, which is the app's only 26/32 heading, so the email's H1 is that heading.
 */
const h1: CSSProperties = {
  margin: 0,
  fontFamily: EMAIL_FONT_STACK,
  fontSize: '26px',
  lineHeight: '32px',
  fontWeight: 600,
  letterSpacing: '-0.02em',
  color: T['text-primary'],
};

/**
 * § 8.1's body text, at 14/20, in `--text-secondary` — `SignIn.module.css`'s `.sub`, the paragraph
 * that sits under that same H1 in the app.
 *
 * The margins replace flex gaps, which no email client honours: 6px above each paragraph is
 * § 7.5's `.head` gap (H1 → sub), and `margin: 0` on the first one keeps the H1's own spacing.
 */
const body: CSSProperties = {
  margin: '6px 0 0',
  fontFamily: EMAIL_FONT_STACK,
  fontSize: '14px',
  lineHeight: '20px',
  fontWeight: 400,
  color: T['text-secondary'],
};

/** 24px above the button is § 7.5's card gap, the spacing between the copy and the primary action. */
const ctaRow: CSSProperties = { marginTop: '24px' };

/**
 * § 8.1's "one primary button styled like `Button primary`", which is
 * `Button.module.css`'s `.btn` + `.primary` + `.lg`:
 *
 *   .btn      radius 8, 1px transparent border, weight 600, centred label
 *   .primary  background --action-primary, colour --action-on-primary
 *   .lg       height 40, padding 0 16px, font-size 14
 *
 * `lg` rather than the component's default `md` (36px): the app's own full-width primary inside a
 * card is § 7.5's 40px `Email Me a Sign-In Link` button, and a card is what an email is.
 *
 * Three things are email-specific rather than copied:
 *   - `boxSizing: 'border-box'`, so `height: 40px` is the same 40px the app renders. The web app
 *     gets that from `global.css`; an email has no stylesheet to inherit it from.
 *   - `lineHeight: '38px'` (40 minus the two 1px borders) does the vertical centring that
 *     `.btn`'s `display: inline-flex; align-items: center` does in the browser. React Email's
 *     `Button` sets `line-height: 100%` first and spreads this style over it, so this wins; the
 *     label's own `<span>` keeps the library's 120% and sits on the 38px line box's baseline.
 *   - `display: 'inline-block'` and `textDecoration: 'none'`, because this renders as an `<a>`.
 *
 * `border: 1px solid transparent` is `.btn`'s own border, kept so the box model matches. A named
 * colour is fine here: `transparent` is the one colour keyword every mail client has always
 * understood, and it is not a token.
 */
const cta: CSSProperties = {
  boxSizing: 'border-box',
  display: 'inline-block',
  height: '40px',
  lineHeight: '38px',
  padding: '0 16px',
  borderRadius: '8px',
  border: '1px solid transparent',
  backgroundColor: T['action-primary'],
  color: T['action-on-primary'],
  fontFamily: EMAIL_FONT_STACK,
  fontSize: '14px',
  fontWeight: 600,
  textAlign: 'center',
  textDecoration: 'none',
};

// The style objects above are deliberately NOT exported. `templates.test.tsx` asserts the rendered
// HTML against written-out literals (`font-size:26px`, `height:40px`, `#006663`), because a test
// that compared the output to the same object that produced it would pass whatever this file said.
// `CONTENT_WIDTH` is the one exception: the test uses it AND asserts it is 560.

export interface EmailLayoutProps {
  /**
   * § 8.1's exact subject for this template, from `SUBJECTS`.
   *
   * One string, three jobs: the `<title>`, the preheader an inbox shows next to the subject, and
   * the H1. That is deliberate rather than lazy. CLAUDE.md requires exact copy and forbids adding
   * any the product does not have, and § 8.1 specifies a subject per template and no headings at
   * all — so the only heading these emails can honestly carry is the line the reader has already
   * read in their inbox. It also makes the Gate 8 assertion ("snapshots … contain the exact
   * subject") a property of the shell rather than nine separate hopes.
   */
  subject: string;
  /** The one primary button. § 8.1 allows exactly one, so it is not a slot the copy can add to. */
  cta: { label: string; href: string };
  /** The body paragraphs, as `<Para>` elements. */
  children?: ReactNode;
}

/**
 * A 14/20 body paragraph. Templates use this rather than `Text` directly so the type ramp cannot
 * drift between them.
 */
export function Para({ children }: { children: ReactNode }) {
  return <Text style={body}>{children}</Text>;
}

/**
 * § 8.1's shell.
 *
 * Note what is NOT here: no brand row, no footer, no "if the button does not work" link, no
 * unsubscribe. § 8.1 names a column, a font, two type sizes and one button, and CLAUDE.md forbids
 * adding copy or UI the product does not have. The app's brand marks are `BrandSlot`
 * placeholders driven by `VITE_BRAND_*` build config with no committed asset, so there is nothing
 * to put at the top of an email that would not be invented. When real brand assets and a
 * compliance footer arrive, they belong here — in one place.
 */
export function EmailLayout({ subject, cta: action, children }: EmailLayoutProps) {
  return (
    <Html lang="en">
      <Head>
        <title>{subject}</title>
        <link rel="stylesheet" href={FONT_HREF} />
      </Head>
      <Preview>{subject}</Preview>
      <Body style={page}>
        <Container style={column}>
          <Heading as="h1" style={h1}>
            {subject}
          </Heading>
          {children}
          <Section style={ctaRow}>
            <Button href={action.href} style={cta}>
              {action.label}
            </Button>
          </Section>
        </Container>
      </Body>
    </Html>
  );
}
