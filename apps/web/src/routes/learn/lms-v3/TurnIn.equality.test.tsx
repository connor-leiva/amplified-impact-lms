// D-230 (IMPLEMENTATION-SPEC.md §2.2, Phase 9): Turn in's drawer is the package's, converted to TSX. This renders the
// package's own JSX and the repo's TSX with the package's sample props (as its harness builds them) and compares the
// HTML, at rest and through the drawer's own steps. C-22's additions draw nothing unless something fails.
import { renderToStaticMarkup } from 'react-dom/server';
import { act, fireEvent, render } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { TurnInDrawer as PkgDrawer } from '@lms-v3-pkg/components/TurnIn.jsx';
import { turnInSamples } from '@lms-v3-pkg/sample-data.js';
import { TurnInDrawer } from './TurnIn';
import type { TiAsk, TiSub, TurnInUi } from './types';

const UI = turnInSamples.ui as TurnInUi;
const ASKS = turnInSamples.asks as TiAsk[];
const STATES = turnInSamples.states as Record<string, { ask: string; can: boolean; subs: string[] }>;
const SENT = turnInSamples.sent as TiSub;
const html = (el: React.ReactElement) => renderToStaticMarkup(el);
const subsOf = (k: string): Record<string, TiSub> => Object.fromEntries(STATES[k]!.subs.map((id) => [id, { ...SENT }]));
/** The harness's played upload: 14% every 120 ms. */
const played = (file: File, onProgress: (p: number) => void) => new Promise<void>((done) => { let p = 0; const run = () => { p = Math.min(1, p + 0.14); onProgress(p); if (p >= 1) return done(); setTimeout(run, 120); }; run(); });
const pdf = (name: string, size: number) => new File([new Uint8Array(size)], name, { type: 'application/pdf' });

describe('TurnInDrawer is the package’s, converted', () => {
  afterEach(() => { vi.useRealTimers(); });

  it.each(['report', 'checkpoint', 'turned'])('opened for %s, as the owner and as a teammate who can’t turn in', (k) => {
    for (const can of [true, false]) {
      const props = { ui: UI, asks: ASKS, subs: subsOf(k), can, askId: STATES[k]!.ask, onClose: () => {}, upload: played, onSubmit: () => Promise.resolve() };
      expect(html(<TurnInDrawer {...props} />)).toBe(html(<PkgDrawer {...props} />));
    }
  });

  it('closed', () => {
    const props = { ui: UI, asks: ASKS, subs: {}, can: true, askId: null, onClose: () => {}, upload: played, onSubmit: () => Promise.resolve() };
    expect(html(<TurnInDrawer {...props} />)).toBe(html(<PkgDrawer {...props} />));
  });

  it('a file that can’t go, an empty turn-in, two files uploading, one removed, the minutes and a note, then turned in', async () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] });
    const onSubmit = vi.fn((_askId: string, _x: unknown) => Promise.resolve());
    const props = { ui: UI, asks: ASKS, subs: {}, can: true, askId: 'checkpoint', onClose: () => {}, upload: played, onSubmit };
    const a = render(<TurnInDrawer {...props} />).container;
    const b = render(<PkgDrawer {...props} />).container;
    const both = async (fn: (c: HTMLElement) => void) => { await act(async () => { fn(a); fn(b); }); };
    const same = () => expect(a.innerHTML).toBe(b.innerHTML);
    const files = (c: HTMLElement, list: File[]) => fireEvent.change(c.querySelector('.up-pick input')!, { target: { files: list } });
    same();
    await both((c) => files(c, [new File(['x'], 'notes.zip', { type: 'application/zip' })]));
    same();
    expect(a.querySelector('[data-field="files"] .fm-msg')!.textContent).toBe(`notes.zip ${UI.badType}`);
    await both((c) => { fireEvent.click(c.querySelector('.up-submit')!); });
    same();
    expect(a.querySelector('.fm-note')!.textContent).toBe(UI.needFile);
    await both((c) => files(c, [pdf('Seat card (made up).pdf', 184000), pdf('First run (made up).pdf', 2400000)]));
    await act(async () => { await vi.advanceTimersByTimeAsync(360); });
    same();
    await act(async () => { await vi.advanceTimersByTimeAsync(1200); });
    same();
    expect([...a.querySelectorAll('.up-state')].map((x) => x.textContent)).toEqual([UI.uploaded, UI.uploaded]);
    await both((c) => { fireEvent.click(c.querySelector('.up-file:first-child .up-x')!); });
    same();
    await both((c) => { fireEvent.change(c.querySelector('[id="up-min"]')!, { target: { value: 'about 20 a day' } }); fireEvent.change(c.querySelector('[id="up-note"]')!, { target: { value: 'First run was Tuesday.' } }); });
    same();
    await both((c) => { fireEvent.click(c.querySelector('.up-submit')!); });
    same();
    await act(async () => { await vi.advanceTimersByTimeAsync(10); });
    same();
    expect(onSubmit).toHaveBeenCalledTimes(2);
    expect(onSubmit.mock.calls[0]![0]).toBe('checkpoint');
    expect(onSubmit.mock.calls[0]![1]).toMatchObject({ note: 'First run was Tuesday.', minutes: 'about 20 a day', files: [{ name: 'First run (made up).pdf', size: '2.4 MB' }] });
  });

  it('what was turned in, then Turn in a new version', async () => {
    const props = { ui: UI, asks: ASKS, subs: subsOf('turned'), can: true, askId: 'live_read', onClose: () => {}, upload: played, onSubmit: () => Promise.resolve() };
    const a = render(<TurnInDrawer {...props} />).container;
    const b = render(<PkgDrawer {...props} />).container;
    expect(a.innerHTML).toBe(b.innerHTML);
    expect(a.querySelector('.fm-banner p')!.textContent).toBe(`${SENT.when} ${UI.by} ${SENT.by}`);
    expect(a.innerHTML).not.toMatch(/Received|Picked|Reviewed/);
    await act(async () => { fireEvent.click(a.querySelector('[data-do="new"]')!); fireEvent.click(b.querySelector('[data-do="new"]')!); });
    expect(a.innerHTML).toBe(b.innerHTML);
  });

  it('C-22: an upload that fails leaves the list and says so; a refused turn-in says why in the foot', async () => {
    const failing = (_f: File, onProgress: (p: number) => void) => { onProgress(0.3); return Promise.reject(new Error('didn’t upload. Try again.')); };
    const refused = () => Promise.reject(new Error('This step doesn’t ask for a file.'));
    const a = render(<TurnInDrawer ui={UI} asks={ASKS} subs={{}} can askId="live_read" onClose={() => {}} upload={failing} onSubmit={refused} />).container;
    await act(async () => { fireEvent.change(a.querySelector('.up-pick input')!, { target: { files: [pdf('report.pdf', 1000)] } }); });
    expect(a.querySelectorAll('.up-file')).toHaveLength(0);
    expect(a.querySelector('[data-field="files"] .fm-msg')!.textContent).toBe('report.pdf didn’t upload. Try again.');
    const z = render(<TurnInDrawer ui={UI} asks={ASKS} subs={{}} can askId="live_read" onClose={() => {}} upload={(_f, p) => Promise.resolve().then(() => p(1))} onSubmit={refused} />).container;
    await act(async () => { fireEvent.change(z.querySelector('.up-pick input')!, { target: { files: [pdf('report.pdf', 1000)] } }); });
    await act(async () => { fireEvent.click(z.querySelector('.up-submit')!); });
    expect(z.querySelector('.fm-note')!.textContent).toBe('This step doesn’t ask for a file.');
    expect(z.querySelector('.up-submit')!.getAttribute('data-state')).toBe('error');
  });
});
