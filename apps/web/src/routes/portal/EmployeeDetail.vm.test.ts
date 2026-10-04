import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { phaseNow, seed, setViewerZone } from '@ai/core';
import type { AIEmployee, Db, Learner, Phase } from '@ai/core';
import {
  employeeDetailVM,
  initialUi,
  moduleReset,
  SPEEDS,
  TickerEngine,
  type EmployeeDetailUi,
} from './EmployeeDetail.vm';

// Phase 05 § 5.1 step 3 and the Gate 5 VM-unit-test requirement: explicit expectations for Jamie
// (agent tier) and Alex (team owner) at Week 0, Week 2 and After Cohort. Every expectation is a
// hard-coded literal, never a recomputation through `fmt` — that is the point: if the seed, the
// time rules or the port drifts, these fail.
//
// The viewer zone is pinned to the program zone so `fmt` renders a single CT time, exactly as the
// goldens were captured.

const who = (db: Db, id: string): Learner => db.users.find((u) => u.id === id)!;
const mod = (db: Db, id: string): AIEmployee => db.modules.find((m) => m.id === id)!;

const vm = (phase: Phase, userId: string, moduleId: string, patch: Partial<EmployeeDetailUi> = {}) => {
  const db = seed(phase);
  const m = mod(db, moduleId);
  return employeeDetailVM(db, who(db, userId), m, phaseNow(phase), { ...initialUi(m), ...patch });
};

beforeAll(() => setViewerZone('America/Chicago'));

describe('employeeDetailVM · Week 2 · Jamie (agent) · Marketing, deployed', () => {
  const r = vm('live', 'u_jamie', 'marketing');

  it('tints the header tile for a built employee and tooltips the deployment', () => {
    expect(r.hd.tone).toBe('built');
    expect(r.hd.icon).toBe('megaphone');
    expect(r.hd.runtime).toBe('deployed');
    expect(r.hd.runtimeTip).toBe('Deployed 4 days ago · Dec 2, 2026, 3:20 PM CT');
  });

  it('renders the header metadata', () => {
    expect(r.name).toBe('Marketing AI Employee');
    expect(r.outcome).toBe(
      'Paste an MLS listing → Fair-Housing-checked description, 5 social posts, 1 email.',
    );
    expect(r.meta).toEqual({ hasSession: true, selfPaced: false, n: 1, title: 'The Autonomous Agent' });
    expect(r.build).toBe(45);
    expect(r.forWho).toBe('listing agents & marketing coordinators');
    expect(r.soon).toBeNull();
  });

  it('has a replay, so the rail is Chapters', () => {
    expect(r.v.has).toBe(true);
    expect(r.railTitle).toBe('Chapters');
    expect(r.v.n).toBe(1);
    expect(r.v.title).toBe('The Autonomous Agent');
    expect(r.v.sub).toBe('Marketing AI Employee · with Jordan Hale');
    expect(r.v.total).toBe('58:24');
    expect(r.v.time).toBe('0:00');
    expect(r.v.pct).toBe('0.00%');
    expect(r.v.speedLabel).toBe('1×');
    expect(r.v.showBigPlay).toBe(true);
    expect(r.v.playIcon).toBe('play');
    expect(r.v.showJoin).toBe(false);
    expect(r.v.showCal).toBe(false);
    expect(r.v.chapter).toBe('');
    expect(r.v.caption).toBe('');
  });

  it('lays out six chapters at their step timestamps', () => {
    expect(r.rail.map((c) => `Step ${c.n} · ${c.t}`)).toEqual([
      'Step 1 · 5:00',
      'Step 2 · 6:30',
      'Step 3 · 18:40',
      'Step 4 · 23:22',
      'Step 5 · 32:15',
      'Step 6 · 40:40',
    ]);
    expect(r.rail.map((c) => c.label)).toEqual([
      'Create the Project',
      'Add the System Prompt',
      'Teach It Your Voice',
      'Add the Skills',
      'Run the Test Listing',
      'Check Compliance',
    ]);
    expect(r.rail.map((c) => c.left)).toEqual([
      '8.56%',
      '11.13%',
      '31.96%',
      '40.01%',
      '55.22%',
      '69.63%',
    ]);
    expect(r.rail.every((c) => c.done)).toBe(true);
    expect(r.rail[4]!.tip).toBe('Jump to 32:15 · Run the test prompt with the sample listing');
    expect(r.rail[4]!.seek).toBe(1935);
  });

  it('reports a verified checklist with a built tooltip', () => {
    expect(r.ck.done).toBe(6);
    expect(r.ck.total).toBe(6);
    expect(r.ck.state).toBe('verified');
    expect(r.ck.tip).toBe('Built 4 days ago · Dec 2, 2026, 3:05 PM CT');
    expect(r.ck.segs).toEqual(['success', 'success', 'success', 'success', 'success', 'success']);
    expect(r.ck.items.every((s) => s.on)).toBe(true);
    expect(r.ck.items.some((s) => s.isNext)).toBe(false);
  });

  it('locks the checklist once deployed', () => {
    expect(r.ck.items[0]!.undoTip).toBe('Deployed AI Employees keep their checklist');
  });

  it('attaches prompt chips to the system-prompt step and file chips to the skills step', () => {
    expect(r.ck.items[1]!.text).toBe('Paste the system prompt into Project Instructions');
    expect(r.ck.items[1]!.hint).toBe('Replace {{TEAM_NAME}}, {{MARKET}} and {{MLS_CHAR_LIMIT}} first.');
    expect(r.ck.items[1]!.mins).toBe(8);
    expect(r.ck.items[1]!.t).toBe('6:30');
    expect(r.ck.items[1]!.assets).toEqual([
      { kind: 'copyPrompt', label: 'Copy Prompt', icon: 'copy' },
      { kind: 'viewPrompt', label: 'View', icon: 'eye' },
    ]);
    expect(r.ck.items[3]!.assets).toEqual([
      { kind: 'downloadFile', label: 'listing-launch-packet', icon: 'download', file: 0 },
      { kind: 'downloadFile', label: 'fair-housing-check', icon: 'download', file: 1 },
    ]);
    expect(r.ck.items[0]!.assets).toEqual([]);
  });

  it('offers Run and Pause, with the when-line and the last output', () => {
    expect(r.dp.tone).toBe('default');
    expect(r.dp.primary).toEqual({ label: 'Run on a Listing', icon: 'play', action: 'run', disabled: false });
    expect(r.dp.secondary).toEqual({ label: 'Pause', action: 'pause' });
    expect(r.dp.note).toBe('');
    expect(r.dp.issue).toBe('');
    expect(r.dp.canOpen).toBe(true);
    expect(r.dp.when).toBe('Deployed 4 days ago');
    expect(r.dp.whenAbs).toBe('Dec 2, 2026, 3:20 PM CT');
    expect(r.dp.last).toEqual({
      title: 'Listing Launch Packet · 1418 Alder Ct',
      preview:
        'Vaulted ceilings and a quartz kitchen open onto a fenced yard that backs to the greenbelt. Four bedrooms and three baths across 2,380 sq ft…',
      ago: 'Yesterday',
      abs: 'Dec 5, 2026, 4:10 PM CT',
    });
    expect(r.platform).toBe('Claude Project');
  });

  it('describes the build kit', () => {
    expect(r.kitNote).toBe('4 items');
    expect(r.promptStats).toBe('22 lines · about 232 tokens');
    expect(r.vars).toEqual(['TEAM_NAME', 'MARKET', 'MLS_CHAR_LIMIT']);
    expect(r.cp).toEqual({ label: 'Copy', icon: 'copy', copied: false });
    expect(r.copyPrompt.kind).toBe('copy');
    expect(r.files.map((f) => [f.name, f.type, f.mono, f.getLabel, f.getIcon])).toEqual([
      ['listing-launch-packet.skill.json', 'JSON', true, 'Download', 'download'],
      ['fair-housing-check.skill.yaml', 'YAML', true, 'Download', 'download'],
      ['Brand Voice Intake', 'Notion', false, 'Duplicate to Notion', 'ext'],
    ]);
    expect(r.files[2]!.get).toEqual({
      kind: 'toast',
      msg: 'Opening “Brand Voice Intake” in Notion',
      tone: 'info',
    });
    expect(r.resources.map((x) => [x.name, x.size, x.pending])).toEqual([
      ['Session 1 Slides', '4.2 MB', false],
      ['Test Listing: 1418 Alder Ct', '180 KB', false],
      ['Fair Housing Quick Reference', '320 KB', false],
    ]);
    expect(r.resources[1]!.get).toEqual({
      kind: 'download',
      name: 'test-listing-1418-alder-ct.pdf',
      content: 'Test Listing: 1418 Alder Ct\n\nPlaceholder file from the Amplified Impact prototype.',
      mime: 'text/plain',
      toast: 'Downloaded Test Listing: 1418 Alder Ct',
    });
  });

  it('names the instructor notes card', () => {
    expect(r.insIni).toBe('JH');
    expect(r.insAv).toBe('oklch(0.78 0.08 258)');
    expect(r.instructor).toBe('Jordan Hale');
  });

  it('points the footer at the next included employee', () => {
    expect(r.nextUp).toEqual({ label: 'Next: Sales AI Employee', to: '/employees/sales' });
  });

  it('counts the transcript lines until a search narrows them', () => {
    expect(r.qCount).toBe('12 lines');
    expect(r.noTranscript).toBe(false);
    expect(r.trOpen).toBe(false);
  });
});

describe('employeeDetailVM · Week 2 · Jamie (agent) · Sales, 3 of 6', () => {
  const r = vm('live', 'u_jamie', 'sales');

  it('tints the header for an unbuilt employee', () => {
    expect(r.hd.tone).toBe('action');
    expect(r.hd.runtime).toBe('not_deployed');
    expect(r.hd.runtimeTip).toBe('Deploys after all 6 steps are verified');
  });

  it('marks step 4 as next and leaves the build tooltip empty', () => {
    expect(r.ck.done).toBe(3);
    expect(r.ck.state).toBe('in_progress');
    expect(r.ck.tip).toBe('');
    expect(r.ck.segs).toEqual(['progress', 'progress', 'progress', 'track', 'track', 'track']);
    expect(r.ck.items.map((s) => s.isNext)).toEqual([false, false, false, true, false, false]);
    expect(r.ck.items.map((s) => s.on)).toEqual([true, true, true, false, false, false]);
    expect(r.ck.items[0]!.undoTip).toBe('Verified · click to undo');
  });

  it('disables Mark as Deployed and counts the remaining steps', () => {
    expect(r.dp.primary).toEqual({
      label: 'Mark as Deployed',
      icon: 'rocket',
      action: 'none',
      disabled: true,
    });
    expect(r.dp.secondary).toBeNull();
    expect(r.dp.note).toBe('Finish all 6 steps to deploy. 3 to go.');
    expect(r.dp.when).toBe('');
    expect(r.dp.whenAbs).toBe('');
    expect(r.dp.last).toBeNull();
    expect(r.dp.canOpen).toBe(false);
  });

  it('runs its own replay and prompt stats', () => {
    expect(r.v.total).toBe('56:30');
    expect(r.railTitle).toBe('Chapters');
    expect(r.promptStats).toBe('19 lines · about 192 tokens');
    expect(r.run.inputLabel).toBe('Paste a Lead');
    expect(r.nextUp).toEqual({ label: 'Next: Database AI Employee', to: '/employees/database' });
  });
});

describe('employeeDetailVM · Week 2 · Alex (team owner)', () => {
  it('shows the session agenda and the join block for Meetings, which has no replay', () => {
    const r = vm('live', 'u_alex', 'meetings');
    expect(r.v.has).toBe(false);
    expect(r.v.none).toBe(true);
    expect(r.railTitle).toBe('Session Agenda');
    expect(r.v.n).toBe(4);
    expect(r.v.title).toBe('The Meeting That Runs Itself');
    expect(r.v.sub).toBe('Meetings AI Employee · with Jordan Hale');
    expect(r.v.noneWhen).toBe('Thu, Dec 10 · 1:00 PM CT');
    expect(r.v.noneNote).toBe('Join opens 15 min before');
    expect(r.v.showJoin).toBe(true);
    expect(r.v.showCal).toBe(true);
    expect(r.v.joinMode).toBe('disabled');
    expect(r.v.total).toBe('0:00');
    expect(r.v.showBigPlay).toBe(false);
    expect(r.rail.every((c) => c.seek === null)).toBe(true);
    expect(r.rail[0]!.tip).toBe('Create the “Meetings AI Employee” Claude Project');
  });

  it('keeps the transcript panel shut and explains the empty transcript', () => {
    const r = vm('live', 'u_alex', 'meetings', { transcript: true });
    expect(r.trOpen).toBe(false);
    expect(r.qCount).toBe('0 lines');
    expect(r.noTranscript).toBe(true);
    expect(r.noTranscriptMsg).toBe('The searchable transcript posts with the replay.');
  });

  it('disables a resource that posts after the session', () => {
    const r = vm('live', 'u_alex', 'meetings');
    expect(r.resources).toEqual([
      { name: 'Session 4 Slides', type: 'PDF', size: 'Posted after the session', pending: true, get: null },
    ]);
    expect(r.dp.note).toBe('Finish all 6 steps to deploy. 6 to go.');
    expect(r.nextUp).toEqual({ label: 'Next: Finance AI Employee', to: '/employees/finance' });
  });

  it('banners a scheduled employee and never marks a step as next', () => {
    const r = vm('live', 'u_alex', 'operations');
    expect(r.soon).toEqual({
      label: 'Opens Dec 14',
      text: 'The live build is Session 6. Everything here unlocks Mon, Dec 14 at 9:00 AM CT.',
    });
    expect(r.ck.items.some((s) => s.isNext)).toBe(false);
    expect(r.nextUp).toEqual({ label: 'Back to Dashboard', to: '/' });
  });

  it('reads the deployment states of the other seeded runtimes', () => {
    const paused = vm('live', 'u_natasha', 'meetings');
    expect(paused.hd.runtime).toBe('paused');
    expect(paused.dp.primary).toEqual({ label: 'Resume', icon: 'play', action: 'resume', disabled: false });
    expect(paused.dp.note).toBe('Paused. It won’t pick up new work until you resume it.');
    expect(paused.dp.tone).toBe('default');

    const broken = vm('live', 'u_devon', 'sales');
    expect(broken.hd.runtime).toBe('needs_attention');
    expect(broken.dp.tone).toBe('attention');
    expect(broken.dp.primary).toEqual({
      label: 'Reconnect',
      icon: 'reset',
      action: 'reconnect',
      disabled: false,
    });
    expect(broken.dp.issue).toBe('CRM webhook stopped responding');
    expect(broken.dp.secondary).toBeNull();
  });
});

describe('employeeDetailVM · Week 0', () => {
  it('has no replay yet for Jamie, so the poster sells the live session', () => {
    const r = vm('week0', 'u_jamie', 'marketing');
    expect(r.hd.tone).toBe('action');
    expect(r.hd.runtimeTip).toBe('Deploys after all 6 steps are verified');
    expect(r.v.has).toBe(false);
    expect(r.railTitle).toBe('Session Agenda');
    expect(r.v.noneWhen).toBe('Tue, Dec 1 · 1:00 PM CT');
    expect(r.v.noneNote).toBe('Join opens 15 min before');
    expect(r.v.showJoin).toBe(true);
    expect(r.v.showCal).toBe(true);
    expect(r.v.total).toBe('58:24');
    expect(r.ck.done).toBe(0);
    expect(r.ck.state).toBe('not_started');
    expect(r.ck.tip).toBe('');
    expect(r.ck.items.map((s) => s.isNext)).toEqual([true, false, false, false, false, false]);
    expect(r.ck.items.every((s) => s.watch === null)).toBe(true);
    expect(r.dp.note).toBe('Finish all 6 steps to deploy. 6 to go.');
    expect(r.dp.when).toBe('');
    expect(r.nextUp).toEqual({ label: 'Next: Sales AI Employee', to: '/employees/sales' });
  });

  it('still banners Operations as scheduled for Alex', () => {
    const r = vm('week0', 'u_alex', 'operations');
    expect(r.soon).toEqual({
      label: 'Opens Dec 14',
      text: 'The live build is Session 6. Everything here unlocks Mon, Dec 14 at 9:00 AM CT.',
    });
  });
});

describe('employeeDetailVM · After Cohort', () => {
  it('switches Jamie’s relative times to absolute dates', () => {
    const r = vm('post', 'u_jamie', 'marketing');
    expect(r.hd.runtimeTip).toBe('Deployed on Dec 2 · Dec 2, 2026, 3:20 PM CT');
    expect(r.dp.when).toBe('Deployed on Dec 2');
    expect(r.ck.tip).toBe('Built on Dec 2 · Dec 2, 2026, 3:05 PM CT');
    expect(r.dp.last?.ago).toBe('Dec 5');
    expect(r.railTitle).toBe('Chapters');
  });

  it('gives Database a replay and ends Jamie’s chain', () => {
    const r = vm('post', 'u_jamie', 'database');
    expect(r.v.has).toBe(true);
    expect(r.v.total).toBe('57:00');
    expect(r.railTitle).toBe('Chapters');
    expect(r.hd.runtime).toBe('deployed');
    expect(r.dp.primary.label).toBe('Run on Your Contacts');
    expect(r.nextUp).toEqual({ label: 'Back to Dashboard', to: '/' });
    expect(r.noTranscript).toBe(true);
    expect(r.resources).toEqual([
      {
        name: 'Session 3 Slides',
        type: 'PDF',
        size: '3.6 MB',
        pending: false,
        get: {
          kind: 'download',
          name: 'session-3-slides.pdf',
          content: 'Session 3 Slides\n\nPlaceholder file from the Amplified Impact prototype.',
          mime: 'text/plain',
          toast: 'Downloaded Session 3 Slides',
        },
      },
    ]);
  });

  it('opens Operations for Alex once the cohort is over', () => {
    const r = vm('post', 'u_alex', 'operations');
    expect(r.soon).toBeNull();
    expect(r.hd.runtime).toBe('deployed');
    expect(r.dp.when).toBe('Deployed 3 weeks ago');
    expect(r.dp.primary.label).toBe('Run on a Contract');
    expect(r.v.total).toBe('55:00');
    expect(r.nextUp).toEqual({ label: 'Back to Dashboard', to: '/' });
  });
});

describe('employeeDetailVM · player, transcript and drawers', () => {
  it('resolves the chapter, caption and current transcript line from the playhead', () => {
    const r = vm('live', 'u_jamie', 'marketing', { t: 2450, playing: true });
    expect(r.v.time).toBe('40:50');
    expect(r.v.tNow).toBe(2450);
    expect(r.v.pct).toBe('69.92%');
    expect(r.v.chapter).toBe('Step 6 · Check Compliance');
    expect(r.v.caption).toBe(
      'The compliance check flags steering language, like describing a neighborhood as perfect for young families.',
    );
    expect(r.v.playIcon).toBe('pause');
    expect(r.v.playTitle).toBe('Pause');
    expect(r.v.showBigPlay).toBe(false);
    expect(r.rail.map((c) => c.active)).toEqual([false, false, false, false, false, true]);
    expect(r.lines.filter((l) => l.current).map((l) => l.t)).toEqual(['40:40']);
  });

  it('hides the caption when captions are off', () => {
    const r = vm('live', 'u_jamie', 'marketing', { t: 2450, playing: true, cc: false });
    expect(r.v.caption).toBe('');
    expect(r.v.cc).toBe(false);
  });

  it('cycles the speed label through the reference list', () => {
    expect(SPEEDS).toEqual([1, 1.25, 1.5, 2]);
    expect(vm('live', 'u_jamie', 'marketing', { speed: 1.25 }).v.speedLabel).toBe('1.25×');
    expect(vm('live', 'u_jamie', 'marketing', { speed: 2 }).v.speedLabel).toBe('2×');
  });

  it('counts and highlights transcript matches', () => {
    const r = vm('live', 'u_jamie', 'marketing', { transcript: true, q: 'compliance' });
    expect(r.trOpen).toBe(true);
    expect(r.qCount).toBe('4 matches');
    expect(r.noTranscript).toBe(false);
    expect(r.lines.map((l) => l.t)).toEqual(['8:32', '23:22', '40:40', '49:50']);
    expect(r.lines[2]!.at).toBe(2440);
    expect(r.lines[2]!.parts).toEqual([
      { s: 'The ', hit: false },
      { s: 'compliance', hit: true },
      {
        s: ' check flags steering language, like describing a neighborhood as perfect for young families.',
        hit: false,
      },
    ]);
  });

  it('singularizes one match and reports no matches', () => {
    expect(vm('live', 'u_jamie', 'marketing', { q: 'Instagram' }).qCount).toBe('1 match');
    const none = vm('live', 'u_jamie', 'marketing', { transcript: true, q: 'escrow' });
    expect(none.qCount).toBe('0 matches');
    expect(none.lines).toEqual([]);
    expect(none.noTranscript).toBe(true);
    expect(none.noTranscriptMsg).toBe('No matches in this transcript.');
  });

  it('shows the prompt viewer by default and line-numbers its headings and variables', () => {
    const r = vm('live', 'u_jamie', 'marketing', { drawer: { kind: 'prompt' } });
    expect(r.dr.open).toBe(true);
    expect(r.dr.isCode).toBe(true);
    expect(r.dr.isRun).toBe(false);
    expect(r.dr.name).toBe('System Prompt');
    expect(r.dr.desc).toBe('Marketing AI Employee · paste into Claude → Project → Instructions');
    expect(r.dr.lines).toHaveLength(22);
    expect(r.dr.lines[0]).toEqual({ n: 1, parts: [{ t: '# Role', kind: 'head' }] });
    expect(r.dr.lines[1]!.parts).toEqual([
      { t: 'You are the Marketing AI Employee for ', kind: 'text' },
      { t: '{{TEAM_NAME}}', kind: 'var' },
      { t: ', a real estate team in ', kind: 'text' },
      { t: '{{MARKET}}', kind: 'var' },
      { t: '.', kind: 'text' },
    ]);
    expect(r.dr.lines[3]).toEqual({ n: 4, parts: [{ t: ' ', kind: 'blank' }] });
    expect(r.dr.getLabel).toBe('Download');
    expect(r.dr.getIcon).toBe('download');
    expect(r.dr.copy).toEqual({ kind: 'copy', text: expect.any(String), toast: 'System prompt copied' });
    expect(r.dr.get).toMatchObject({
      kind: 'download',
      name: 'marketing-system-prompt.md',
      mime: 'text/markdown',
      toast: 'Downloaded marketing-system-prompt.md',
    });
  });

  it('previews a skill file in the same drawer', () => {
    const r = vm('live', 'u_jamie', 'marketing', { drawer: { kind: 'file', i: 1 } });
    expect(r.dr.name).toBe('fair-housing-check.skill.yaml');
    expect(r.dr.desc).toBe('Flags steering language and suggests rewrites · 2 KB');
    expect(r.dr.lines[0]).toEqual({ n: 1, parts: [{ t: 'name: fair-housing-check', kind: 'text' }] });
    expect(r.dr.copy.kind === 'copy' && r.dr.copy.toast).toBe('File contents copied');
    expect(r.dr.get).toMatchObject({
      kind: 'download',
      name: 'fair-housing-check.skill.yaml',
      mime: 'text/yaml',
    });
  });

  it('switches to Duplicate to Notion for a Notion template', () => {
    const r = vm('live', 'u_jamie', 'marketing', { drawer: { kind: 'file', i: 2 } });
    expect(r.dr.getLabel).toBe('Duplicate to Notion');
    expect(r.dr.getIcon).toBe('ext');
    expect(r.dr.get).toEqual({ kind: 'toast', msg: 'Opening “Brand Voice Intake” in Notion', tone: 'info' });
  });

  it('keeps the last drawer rendered while it slides out', () => {
    const r = vm('live', 'u_jamie', 'marketing', { drawer: null, lastDrawer: { kind: 'run' } });
    expect(r.dr.open).toBe(false);
    expect(r.dr.isRun).toBe(true);
    expect(r.dr.name).toBe('Run on a Listing');
  });

  it('runs the demo and records the output', () => {
    const idle = vm('live', 'u_jamie', 'marketing', { drawer: { kind: 'run' } });
    expect(idle.dr.name).toBe('Run on a Listing');
    expect(idle.dr.desc).toBe('Marketing AI Employee · Claude Project');
    expect(idle.run.inputLabel).toBe('Paste a Listing');
    expect(idle.run.btn).toBe('Run');
    expect(idle.run.out).toEqual([]);
    expect(idle.run.text).toContain('1418 Alder Ct · $649,000 · 4 bd · 3 ba · 2,380 sq ft');

    const running = vm('live', 'u_jamie', 'marketing', { drawer: { kind: 'run' }, runState: 'running' });
    expect(running.run.running).toBe(true);
    expect(running.run.done).toBe(false);

    const done = vm('live', 'u_jamie', 'marketing', { drawer: { kind: 'run' }, runState: 'done' });
    expect(done.run.btn).toBe('Run Again');
    expect(done.run.out.map((o) => o.label)).toEqual([
      'Compliance check',
      'MLS description',
      '5 social posts',
      '1 email',
    ]);
    expect(done.run.copy).toEqual({ kind: 'copy', text: expect.any(String), toast: 'Output copied' });
    expect(done.run.record).toEqual({
      title: 'MLS description · 1418 Alder Ct · $649,000 · 4 bd · 3 ba ·',
      preview:
        'Vaulted ceilings and a quartz kitchen open onto a fenced yard that backs to the greenbelt. Four bedrooms and three baths across 2,380 sq ft, with room to spread out and a short walk to the Alder Creek trail.',
    });
  });

  it('falls back to Input when the run label is not a “Run on …”', () => {
    const db = seed('live');
    const m: AIEmployee = { ...mod(db, 'marketing'), runLabel: 'Run it' };
    const r = employeeDetailVM(db, who(db, 'u_jamie'), m, phaseNow('live'), initialUi(m));
    expect(r.run.inputLabel).toBe('Input');
    expect(r.dp.primary.label).toBe('Run it');
  });

  it('shows Copied in the success tint while the flag is set', () => {
    const r = vm('live', 'u_jamie', 'marketing', { copied: true });
    expect(r.cp).toEqual({ label: 'Copied', icon: 'check', copied: true });
  });

  it('builds a session .ics for the Add to Calendar button', () => {
    const r = vm('week0', 'u_jamie', 'marketing');
    expect(r.v.cal).toMatchObject({
      kind: 'download',
      name: 'session-1.ics',
      mime: 'text/calendar',
      toast: 'Calendar invite downloaded',
    });
    expect(r.v.cal?.kind === 'download' && r.v.cal.content).toContain('BEGIN:VCALENDAR');
    expect(r.v.join).toEqual({
      kind: 'toast',
      msg: 'Opening Zoom · https://zoom.us/j/8841200610',
      tone: 'info',
    });
  });
});

describe('moduleReset · switching to another AI Employee', () => {
  it('resets the player, the search and the drawer, and keeps speed and captions', () => {
    const db = seed('live');
    const sales = mod(db, 'sales');
    const next = { ...initialUi(mod(db, 'marketing')), speed: 1.5 as const, cc: false, q: 'compliance' };
    const after = { ...next, ...moduleReset(sales, 9999) };
    expect(after.t).toBe(sales.dur); // capped at the new duration, never the old playhead
    expect(after.playing).toBe(false);
    expect(after.q).toBe('');
    expect(after.transcript).toBe(false);
    expect(after.drawer).toBeNull();
    expect(after.runState).toBe('idle');
    expect(after.runText).toBe(sales.runDemo?.input ?? '');
    // The reference's sync() leaves these alone: they are the viewer's choices, not the module's.
    expect(after.speed).toBe(1.5);
    expect(after.cc).toBe(false);
  });
});

describe('TickerEngine · the fixture player (phase 05 § 5.2, phase 08 § 8.3)', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  const engine = (dur: number, t = 0) => {
    vi.useFakeTimers();
    const e = new TickerEngine(dur, t);
    const seen: number[] = [];
    e.onTime((x) => seen.push(x));
    return { e, seen };
  };

  it('does not move until it is played', () => {
    const { e, seen } = engine(100);
    vi.advanceTimersByTime(2000);
    expect(seen).toEqual([]);
    expect(e.position).toBe(0);
  });

  it('advances 0.25 s per 250 ms tick at 1x', () => {
    const { e, seen } = engine(100);
    e.play();
    vi.advanceTimersByTime(1000);
    expect(seen).toEqual([0.25, 0.5, 0.75, 1]);
    expect(e.position).toBe(1);
  });

  it('scales the step by the rate', () => {
    const { e, seen } = engine(100);
    e.setRate(2);
    e.play();
    vi.advanceTimersByTime(1000);
    expect(seen).toEqual([0.5, 1, 1.5, 2]);
    e.setRate(1.25);
    vi.advanceTimersByTime(250);
    expect(e.position).toBe(2.3125); // 2 + 0.25 × 1.25, and the rate change needs no restart
  });

  it('pauses, resumes from where it stopped, and seeks within range', () => {
    const { e } = engine(100);
    e.play();
    vi.advanceTimersByTime(1000);
    e.pause();
    vi.advanceTimersByTime(5000);
    expect(e.position).toBe(1);
    e.play();
    vi.advanceTimersByTime(250);
    expect(e.position).toBe(1.25);
    e.seek(-5);
    expect(e.position).toBe(0);
    e.seek(1e6);
    expect(e.position).toBe(100);
  });

  it('seeds from a restored position, capped at the duration', () => {
    expect(new TickerEngine(100, 40).position).toBe(40);
    expect(new TickerEngine(100, 400).position).toBe(100);
  });

  it('stops at the duration and fires onEnded exactly once', () => {
    const { e } = engine(1);
    const ended = vi.fn();
    e.onEnded(ended);
    e.play();
    vi.advanceTimersByTime(5000);
    expect(e.position).toBe(1);
    expect(ended).toHaveBeenCalledTimes(1);
  });

  it('never starts for an AI Employee with no replay', () => {
    const { e, seen } = engine(0);
    e.play();
    vi.advanceTimersByTime(5000);
    expect(seen).toEqual([]);
    expect(e.position).toBe(0);
  });

  it('stops emitting once a listener unsubscribes', () => {
    vi.useFakeTimers();
    const e = new TickerEngine(100);
    const seen: number[] = [];
    const off = e.onTime((x) => seen.push(x));
    e.play();
    vi.advanceTimersByTime(250);
    off();
    vi.advanceTimersByTime(250);
    expect(seen).toEqual([0.25]);
  });
});
