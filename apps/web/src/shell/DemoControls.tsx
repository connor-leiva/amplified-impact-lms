import { useState } from 'react';
import { PHASES, type Phase } from '@ai/core';
import { Popover } from '../components/primitives/Popover';
import { Segmented, type SegmentedOption } from '../components/primitives/Segmented';
import { useToaster } from '../components/primitives/Toaster';
import { demoMode, fixturePhase, fixtureRole } from '../data/boot';
import { resetFixture, type FixtureRole } from '../data/fixture';
import s from './DemoControls.module.css';

// Ported from the `demoInline` header block and the `demoOpen` popover in
// design-reference/Amplified Impact LMS.dc.html. SCREENS § 2.2, phase 04 § "Demo controls".
//
// FIXTURE ONLY. `demoMode` is false in http mode, where these controls must be impossible rather
// than hidden (CLAUDE.md). The guard is an early return in the exported component, above every
// hook, so in http mode nothing here subscribes to anything.
//
// The current persona and timeline are NOT local state: `boot.ts` resolved `?as=` and `?phase=`
// once, and switching either reloads so the whole fixture database is re-seeded for that phase.
// That is how the prototype does it, and it is the only way the frozen clock can move.

const ROLE_OPTIONS: readonly SegmentedOption<FixtureRole>[] = [
  { value: 'agent', label: 'Agent Tier' },
  { value: 'owner', label: 'Team Owner' },
  { value: 'admin', label: 'Admin' },
];

/** `Week 0 | Week 2 | After Cohort`, in curriculum order, straight from the shared constant. */
const PHASE_OPTIONS: readonly SegmentedOption<Phase>[] = PHASES.map((p) => ({
  value: p.id,
  label: p.label,
}));

/** The inline layout appears at this width; below it the controls collapse into one button. */
const INLINE_AT = 1360;

function labelOf<T>(options: readonly SegmentedOption<T>[], value: T): string {
  return options.find((o) => o.value === value)?.label ?? '';
}

/**
 * Reload the current path with one demo param changed, preserving every other param (and the hash)
 * so `?now=` pinned by an e2e test, or `?demo=1`, survives a persona switch.
 */
function reloadWith(param: 'as' | 'phase', value: string): void {
  const url = new URL(window.location.href);
  url.searchParams.set(param, value);
  // D-182: the learner portal (/learn) has no staff screen, so View As Admin from it opens the Console.
  // A learner persona from the Console needs nothing here: every `/admin` address sends a learner to /learn.
  if (param === 'as' && value === 'admin' && /^\/learn(\/|$)/.test(url.pathname)) url.pathname = '/admin';
  window.location.assign(url.toString());
}

export interface DemoControlsProps {
  /** Viewport width, tracked by the shell (`useShell().vw`). */
  vw: number;
}

export function DemoControls({ vw }: DemoControlsProps) {
  // `demoMode` is fixed at boot, so this early return never changes the hook order of the inner
  // component across renders.
  if (!demoMode) return null;
  return <Controls vw={vw} />;
}

function Controls({ vw }: DemoControlsProps) {
  const [open, setOpen] = useState(false);
  const { toast } = useToaster();

  const setRole = (role: FixtureRole) => {
    if (role !== fixtureRole) reloadWith('as', role);
  };
  const setPhase = (phase: Phase) => {
    if (phase !== fixturePhase) reloadWith('phase', phase);
  };
  const reset = () => {
    resetFixture(fixturePhase);
    // The reload wipes the toast stack, so it is raised here, immediately before navigating, and
    // not by the shell afterwards.
    toast('Demo data reset', 'info');
    window.location.reload();
  };

  if (vw >= INLINE_AT) {
    return (
      <div role="group" aria-label="Demo controls" className={s.inline}>
        <span className={s.label}>View As</span>
        <Segmented
          label="View As"
          options={ROLE_OPTIONS}
          value={fixtureRole}
          onChange={setRole}
          height={26}
          pad={10}
        />
        <span className={s.label} data-indent="true">
          Timeline
        </span>
        <Segmented
          label="Timeline"
          options={PHASE_OPTIONS}
          value={fixturePhase}
          onChange={setPhase}
          height={26}
          pad={10}
        />
        <button type="button" className={s.reset} onClick={reset}>
          Reset Demo
        </button>
      </div>
    );
  }

  const close = () => setOpen(false);

  return (
    <>
      <button
        type="button"
        className={s.trigger}
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
      >
        {`Demo: ${labelOf(ROLE_OPTIONS, fixtureRole)} · ${labelOf(PHASE_OPTIONS, fixturePhase)}`}
      </button>
      {/* The reference's transparent catcher, one layer under the panel: it swallows the click that
          dismisses the popover, including a second click on the trigger. */}
      {open ? <div className={s.catcher} onClick={close} /> : null}
      <Popover
        open={open}
        onClose={close}
        role="dialog"
        label="Demo controls"
        mode="fixed"
        at={{ top: 52, right: 12 }}
        width="min(330px, calc(100vw - 24px))"
        pad={14}
        radius={12}
        className={s.panel}
      >
        <div className={s.group}>
          <span className={s.label}>View As</span>
          <Segmented
            label="View As"
            options={ROLE_OPTIONS}
            value={fixtureRole}
            onChange={setRole}
            height={28}
            pad={8}
            fill
            className={s.fill}
          />
        </div>
        <div className={s.group}>
          <span className={s.label}>Timeline</span>
          <Segmented
            label="Timeline"
            options={PHASE_OPTIONS}
            value={fixturePhase}
            onChange={setPhase}
            height={28}
            pad={8}
            fill
            className={s.fill}
          />
        </div>
        <button type="button" className={s.resetData} onClick={reset}>
          Reset Demo Data
        </button>
      </Popover>
    </>
  );
}
