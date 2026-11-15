// Foundations specimen route (dev and test builds only). A debugging aid: it renders the six type
// steps and every semantic swatch so the token set can be eyeballed in both themes. The Gate 1
// token-parity test loads this route to read the computed :root custom properties.
import { useEffect } from 'react';
import { ICONS, type IconName } from '@ai/core';
import { Icon } from '../components/Icon';

const TYPE_STEPS: [label: string, size: number, line: number, use: string][] = [
  ['caption', 12, 16, 'Meta, token labels, helper text'],
  ['small', 13, 18, 'Secondary text, table cells, metadata line'],
  ['body', 14, 20, 'Default UI text, buttons, section labels (semibold)'],
  ['lead', 16, 24, 'Card titles, H2, outcome line'],
  ['title', 20, 28, 'Session titles, sheet section headings'],
  ['display', 26, 32, 'Page H1, large numbers'],
];

const GROUPS: [group: string, tokens: string[]][] = [
  ['Ink ramp', ['ink-50', 'ink-100', 'ink-200', 'ink-300', 'ink-400', 'ink-500', 'ink-600', 'ink-700', 'ink-800', 'ink-900', 'paper']],
  [
    'Background',
    ['bg-canvas', 'bg-sidebar', 'bg-surface', 'bg-sunken', 'bg-raised', 'bg-hover', 'bg-selected', 'bg-inverse', 'bg-overlay', 'bg-poster'],
  ],
  ['Line', ['line-subtle', 'line-default', 'line-strong']],
  ['Text', ['text-primary', 'text-secondary', 'text-tertiary', 'text-disabled', 'text-inverse', 'text-link', 'text-link-hover']],
  [
    'Action',
    [
      'action-primary',
      'action-primary-hover',
      'action-on-primary',
      'action-primary-tint',
      'action-primary-line',
      'action-secondary',
      'action-secondary-hover',
      'action-secondary-line',
    ],
  ],
  ['Control', ['seg-track', 'seg-active', 'track', 'focus-ring']],
  ['Status · success', ['status-success', 'status-success-text', 'status-success-bg', 'status-success-line', 'status-success-on']],
  ['Status · progress', ['status-progress', 'status-progress-text', 'status-progress-bg', 'status-progress-line']],
  ['Status · neutral', ['status-neutral', 'status-neutral-text', 'status-neutral-bg', 'status-neutral-line']],
  ['Status · attention', ['status-attention', 'status-attention-text', 'status-attention-bg', 'status-attention-line']],
  ['Access · locked', ['access-locked', 'access-locked-text', 'access-locked-bg', 'access-locked-line', 'access-locked-on']],
];

const SHADOWS = ['shadow-xs', 'shadow-card', 'shadow-pop', 'shadow-drawer'];

export function Component() {
  useEffect(() => {
    void document.fonts.ready.then(() => document.body.setAttribute('data-app-ready', 'true'));
  }, []);

  return (
    <main style={{ padding: 32, maxWidth: 1360, margin: '0 auto', display: 'grid', gap: 40 }}>
      <header>
        <h1 style={{ font: '600 26px/32px var(--font-ui)', letterSpacing: '-0.02em', margin: 0 }}>Tokens</h1>
        <p style={{ margin: '4px 0 0', fontSize: 16, color: 'var(--text-secondary)' }}>
          Every semantic token and the six type steps, resolved in the current theme.
        </p>
      </header>

      <section style={{ display: 'grid', gap: 12 }}>
        <h2 style={{ font: '600 16px/24px var(--font-ui)', margin: 0 }}>Type Scale</h2>
        {TYPE_STEPS.map(([label, size, line, use]) => (
          <div key={label} style={{ display: 'flex', alignItems: 'baseline', gap: 16 }}>
            <code style={{ font: '500 16px/20px var(--font-ui-mono)', color: 'var(--text-tertiary)', width: 120 }}>
              {label} {size}/{line}
            </code>
            <span style={{ fontSize: size, lineHeight: `${line}px`, color: 'var(--text-primary)' }}>{use}</span>
          </div>
        ))}
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 16 }}>
          <code style={{ font: '500 16px/20px var(--font-ui-mono)', color: 'var(--text-tertiary)', width: 120 }}>mono</code>
          <span style={{ font: '400 16px/20px var(--font-ui-mono)', color: 'var(--text-primary)' }}>12:34 / 58:24 · 3 of 6 Steps</span>
        </div>
      </section>

      {GROUPS.map(([group, tokens]) => (
        <section key={group} style={{ display: 'grid', gap: 10 }}>
          <h2 style={{ font: '600 16px/24px var(--font-ui)', margin: 0 }}>{group}</h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 10 }}>
            {tokens.map((t) => (
              <div
                key={t}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  padding: 8,
                  borderRadius: 10,
                  border: '1px solid var(--line-default)',
                  background: 'var(--bg-surface)',
                }}
              >
                <span
                  style={{
                    width: 34,
                    height: 34,
                    borderRadius: 8,
                    flex: 'none',
                    background: `var(--${t})`,
                    border: '1px solid var(--line-default)',
                  }}
                />
                <code style={{ font: '400 16px/20px var(--font-ui-mono)', color: 'var(--text-secondary)' }}>--{t}</code>
              </div>
            ))}
          </div>
        </section>
      ))}

      <section style={{ display: 'grid', gap: 10 }}>
        <h2 style={{ font: '600 16px/24px var(--font-ui)', margin: 0 }}>Shadows</h2>
        <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap' }}>
          {SHADOWS.map((t) => (
            <div
              key={t}
              style={{
                width: 180,
                height: 72,
                borderRadius: 14,
                background: 'var(--bg-surface)',
                border: '1px solid var(--line-default)',
                boxShadow: `var(--${t})`,
                display: 'grid',
                placeItems: 'center',
              }}
            >
              <code style={{ font: '400 16px/20px var(--font-ui-mono)', color: 'var(--text-secondary)' }}>--{t}</code>
            </div>
          ))}
        </div>
      </section>

      <section style={{ display: 'grid', gap: 10 }}>
        <h2 style={{ font: '600 16px/24px var(--font-ui)', margin: 0 }}>Icons ({Object.keys(ICONS).length})</h2>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          {(Object.keys(ICONS) as IconName[]).map((name) => (
            <span
              key={name}
              title={name}
              style={{
                width: 34,
                height: 34,
                display: 'grid',
                placeItems: 'center',
                borderRadius: 8,
                border: '1px solid var(--line-default)',
                background: 'var(--bg-surface)',
                color: 'var(--text-secondary)',
              }}
            >
              <Icon name={name} size={18} />
            </span>
          ))}
        </div>
      </section>
    </main>
  );
}
