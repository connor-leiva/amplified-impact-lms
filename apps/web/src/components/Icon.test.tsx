import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { ICONS, MODULE_ICONS, type IconName } from '@ai/core';
import { Icon } from './Icon';

describe('Icon @g1', () => {
  const svgOf = (el: HTMLElement) => el.querySelector('svg')!;

  it('renders the path from ICONS, not from any library', () => {
    const { container } = render(<Icon name="grid" />);
    expect(container.querySelector('path')!.getAttribute('d')).toBe(ICONS.grid);
  });

  it('draws on the 24 grid with a 1.8 round stroke and no fill', () => {
    const { container } = render(<Icon name="bot" />);
    const svg = svgOf(container);
    expect(svg.getAttribute('viewBox')).toBe('0 0 24 24');
    expect(svg.style.fill).toBe('none');
    // CSS keywords are case-insensitive, and the DOM lowercases them.
    expect(svg.style.stroke.toLowerCase()).toBe('currentcolor');
    expect(svg.style.strokeWidth).toBe('1.8');
    expect(svg.style.strokeLinecap).toBe('round');
    expect(svg.style.strokeLinejoin).toBe('round');
  });

  it('is hidden from assistive tech unless it carries a label', () => {
    const { container: plain } = render(<Icon name="check" />);
    expect(svgOf(plain).getAttribute('aria-hidden')).toBe('true');
    expect(svgOf(plain).getAttribute('role')).toBeNull();

    const { container: labelled } = render(<Icon name="check" label="Verified" />);
    expect(svgOf(labelled).getAttribute('role')).toBe('img');
    expect(svgOf(labelled).getAttribute('aria-label')).toBe('Verified');
    expect(svgOf(labelled).getAttribute('aria-hidden')).toBeNull();
  });

  it('fills instead of stroking for the two glyphs the reference fills', () => {
    // SCREENS § 1.11 / phase 01 § 1.7: `play` (in buttons and on the poster) and `pause`.
    for (const name of ['play', 'pause'] as const) {
      const { container } = render(<Icon name={name} filled />);
      const svg = svgOf(container);
      expect(svg.style.fill.toLowerCase(), name).toBe('currentcolor');
      expect(svg.style.stroke, name).toBe('none');
    }
  });

  it('sizes the box and keeps it from flexing', () => {
    const { container } = render(<Icon name="radio" size={22} />);
    const svg = svgOf(container);
    expect(svg.getAttribute('width')).toBe('22');
    expect(svg.getAttribute('height')).toBe('22');
    // 'flex: none' is stored as its longhand expansion.
    expect(svg.style.flex).toBe('0 0 auto');
  });

  it('renders every glyph in the set, including all 12 module icons', () => {
    for (const name of Object.keys(ICONS) as IconName[]) {
      const { container } = render(<Icon name={name} />);
      expect(container.querySelector('path')!.getAttribute('d'), name).toBeTruthy();
    }
    for (const name of MODULE_ICONS) expect(ICONS[name], name).toBeTruthy();
  });
});
