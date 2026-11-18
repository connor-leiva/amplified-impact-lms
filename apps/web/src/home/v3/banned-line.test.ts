// D-175 (the learner build brief, PR 3): the homepage never carries the banned team-size and
// homes-a-year line. Spring's bio said "a 100-agent team closing 700+ homes a year", and the lead and an
// example chat called the team "100-agent"; all three are gone, on the rendered page as in the copy.
//
// Not covered here, on purpose: the proof line "Built inside The Utah Life Real Estate Group / 100
// agents, 700+ homes a year", which the site rule puts next to every free and buy button (and the
// hero's figures read from). It is pinned by the proof tests as the site's own words; whether it goes
// too is Connor's call (D-175), and this file is where its test lands if it does.
import { describe, expect, it } from 'vitest';
import { HERO } from './content';
import { renderV3Body } from './render';

const page = renderV3Body({ preview: false }).replace(/\s+/g, ' ');

describe('the homepage never carries the banned team-size and homes-a-year line (D-175)', () => {
  it('says "100-agent" nowhere, hyphenated or as a team size', () => {
    expect(page).not.toMatch(/100-agent/i);
    expect(page).not.toMatch(/100 agent team/i);
    expect(HERO.lead).not.toMatch(/100[\s-]agent/i);
  });

  it('drops the bio’s team-size and homes-a-year line', () => {
    expect(page).not.toMatch(/team closing 700\+?\s*homes/i);
    expect(page).not.toContain('CEO, 100');
  });
});
