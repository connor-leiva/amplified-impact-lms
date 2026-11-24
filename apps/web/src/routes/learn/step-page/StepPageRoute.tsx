// The v6 step page on the real loader (D-210): StepVM mapped to <StepPage>'s props (StepPage.vm.ts), the
// portal's own mutations behind onCheck and onStepDone, and the course video on HlsEngine with the watch
// progress VideoView keeps (D-191). The page itself is ../StepPage.tsx, ported from the handoff, with slots for
// what the mockup did not draw: a path's leading callouts and extra content, a step with no checklist, the live
// session and step 1's Start Here card.
//
// The brand's motion stylesheet loads first, then the page's tokens and styles, all global (HANDOFF §4.5), then
// the LMS's phone floor (step-page.phone.css, D-156).

import '../../../components/motion/ai-motion.css';
import './step-page.tokens.css';
import './step-page.css';
import './step-page.phone.css';
import './step-page.more.css';
import './step-page.dark.css';
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router';
import { mergeSpans, parseCaptionCues, resumeAt, videoIdOf, watchedFraction } from '@ai/core';
import type { WatchedSpan } from '@ai/core';
import { HlsEngine } from '../../../components/replay/HlsEngine';
import { videoBlockSource } from '../../../components/replay/source';
import { courseVideoUrl } from '../../../data/files';
import { useMutate } from '../../../data/hooks';
import { isFixture } from '../../../data/boot';
import { saveIcs } from '../ics';
import { STEP } from '../Step.vm';
import type { Platform, StepVM } from '../Step.vm';
import { StepPage } from '../StepPage';
import type { VideoWatch } from '../Video';
import { PromptModal, useTabTitle } from '../WeekContent';
import type { BuildKitVM } from '../WeekContent.vm';
import { GlossaryProvider, Marked, RichTextView } from '../Glossary';
import { StepLive } from '../Live';
import { StartHereCard } from '../StartHere';
import { V6_LABELS, V6_MORE, stepPageStep } from './StepPage.vm';
import type { V6Handlers, V6Nodes } from './StepPage.vm';
import { ProseBlocks } from './Blocks';
import { Callout } from './Checklist';
import type { SpCue } from './types';

/** As VideoView: a jump longer than this between two samples is a seek, not watching. */
const GAP_S = 1.25;

export interface StepPageRouteProps {
  vm: StepVM;
  kit: BuildKitVM | null;
  /** The tab's title. */
  title: string | null;
  /** A staff member's in-memory checks and watch (D-184), as the step player takes them. */
  local?: { toggle: (itemId: string) => void; watch: VideoWatch['onSave'] } | undefined;
  /** D-230: Turn in's button, for every learner, v3 or not (H-15, D-247; `V6Handlers.turnIn`). */
  turnIn?: V6Handlers['turnIn'];
  /** D-236: the seat card form's button, for every learner, v3 or not (H-15, D-247; `V6Handlers.seatCard`). */
  seatCard?: V6Handlers['seatCard'];
  /** D-245: the intake's kit files, whose Download opens its drawer, for a viewer v3 draws for (`V6Handlers.intakeFiles`). */
  intakeFiles?: V6Handlers['intakeFiles'];
}

export function StepPageRoute(props: StepPageRouteProps) {
  const { vm, local } = props;
  // D-247: the step page shows its own failures in place (a check that didn't save), so a failed request
  // comes back here as before, not as the hooks' error toast.
  const mutate = useMutate({ rethrow: true });
  // A write the server refused draws the page again from the server's state, and says why (D-194).
  const [epoch, setEpoch] = useState(0);
  const [fault, setFault] = useState<string | null>(null);
  const refused = useCallback((why?: string) => { setFault(why || STEP.checkFailed); setEpoch((e) => e + 1); }, []);
  const clearFault = useCallback(() => setFault(null), []);
  // The open path: the learner's last choice (the `path` pref), else the step's first, as the step player chooses.
  const [picked, setPicked] = useState<Platform | null>(null);
  const preferred = vm.pathDefault && vm.tabs.includes(vm.pathDefault) ? vm.pathDefault : (vm.tabs[0] ?? 'claude');
  const want = picked ?? preferred;
  const on: Platform = vm.tabs.includes(want) ? want : (vm.tabs[0] ?? 'claude');
  const choose = useCallback(
    (next: Platform) => {
      setPicked(next);
      if (local || isFixture || vm.mark.disabled) return;
      void mutate('setPref', { key: 'path', value: next });
    },
    [local, mutate, vm.mark.disabled],
  );
  // A new path is a new checklist: the page starts again from that path's server state.
  return <LiveStepPage {...props} on={on} choose={choose} refused={refused} fault={fault} clearFault={clearFault} sync={epoch} />;
}

function LiveStepPage({ vm, kit, title, local, turnIn, seatCard, intakeFiles, refused, on, choose, fault, clearFault, sync }: StepPageRouteProps & {
  refused: (why?: string) => void; on: Platform; choose: (p: Platform) => void; fault: string | null; clearFault: () => void; sync: number;
}) {
  useTabTitle(title);
  // D-247: the step page shows its own failures in place (a check that didn't save), so a failed request
  // comes back here as before, not as the hooks' error toast.
  const mutate = useMutate({ rethrow: true });
  const navigate = useNavigate();
  const layout = vm.layouts?.[on];
  // The page's own player takes the path's first video when it can: an upload or a stream with chapters and a
  // transcript. Any other video plays in the path's content, in the course video player.
  const first = layout?.videos[0];
  const firstKind = first ? videoBlockSource(first, courseVideoUrl)?.kind ?? null : null;
  const hero = !!first && (firstKind === 'file' || firstKind === 'hls') && !first.draft && !!first.chapters?.length && !!first.transcript;
  const block = hero ? first : undefined;
  const source = block ? videoBlockSource(block, courseVideoUrl) : null;
  const kind = source?.kind ?? null;
  const src = source && source.kind !== 'link' ? source.src : '';
  const videoKey = block ? videoIdOf(block) : '';
  const poster = block?.poster ? courseVideoUrl(block.poster.upload) : undefined;
  const captions = block?.transcript ? courseVideoUrl(block.transcript.upload) : undefined;
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [duration, setDuration] = useState<number | null>(null);
  const [cues, setCues] = useState<SpCue[]>([]);
  const [viewing, setViewing] = useState(false);
  const writes = !local && !vm.mark.disabled && !!vm.mark.stepId;

  // The transcript, for the follow-along panel (the <track> keeps the captions).
  useEffect(() => {
    if (!captions) return undefined;
    let stop = false;
    fetch(captions)
      .then((r) => (r.ok ? r.text() : ''))
      .then((text) => {
        if (!stop) setCues(parseCaptionCues(text).cues.map((c) => ({ s: c.start, e: c.end, text: c.text })));
      })
      .catch(() => undefined);
    return () => {
      stop = true;
    };
  }, [captions]);

  // The course video: HlsEngine on the page's <video>, resume, and the watched spans (D-191), as VideoView.
  const saved = (vm.videoProgress ?? []).find((p) => p.videoId === videoKey) ?? null;
  const savedRef = useRef(saved);
  savedRef.current = saved;
  const save = useMemo<VideoWatch['onSave']>(() => {
    if (local) return local.watch;
    if (!writes) return undefined;
    return (p) => void mutate('saveVideoProgress', { moduleId: vm.mark.moduleId, videoId: p.videoId, maxPct: p.maxPct, lastPositionS: p.lastPositionS });
  }, [local, writes, mutate, vm.mark.moduleId]);
  const saveRef = useRef(save);
  saveRef.current = save;
  useLayoutEffect(() => {
    const el = videoRef.current;
    if (!el || !src || (kind !== 'file' && kind !== 'hls')) return undefined;
    const engine = new HlsEngine({ src, dur: 0, t: 0, media: el, direct: kind === 'file', learnDuration: true });
    let spans: WatchedSpan[] = [];
    let last = el.currentTime || 0;
    let lastSave = 0;
    let playing = false;
    let resumed = false;
    const id = videoKey;
    const sample = () => {
      const t = el.currentTime;
      if (playing && Number.isFinite(t) && t > last && t - last <= GAP_S) spans = mergeSpans(spans, { start: last, end: t });
      if (Number.isFinite(t)) last = t;
    };
    const send = (force: boolean) => {
      const out = saveRef.current;
      if (!out) return;
      const dur = el.duration;
      if (!Number.isFinite(dur) || dur <= 0) return;
      const t = Date.now();
      if (!force && t - lastSave < 10_000) return;
      lastSave = t;
      out({ videoId: id, maxPct: watchedFraction(spans, dur), lastPositionS: Number.isFinite(el.currentTime) ? el.currentTime : 0 });
    };
    const onPlay = () => {
      playing = true;
      last = el.currentTime;
    };
    const onPause = () => {
      sample();
      playing = false;
      send(true);
    };
    const onSeeked = () => {
      last = el.currentTime;
    };
    const onTime = () => {
      sample();
      send(false);
    };
    const onDuration = () => {
      const d = el.duration;
      if (Number.isFinite(d) && d > 0) setDuration(d);
    };
    const onMeta = () => {
      onDuration();
      if (resumed) return;
      resumed = true;
      const to = savedRef.current ? resumeAt(savedRef.current.lastPositionS, el.duration) : null;
      if (to !== null) {
        el.currentTime = to;
        last = to;
      }
    };
    const onHide = () => {
      if (document.visibilityState === 'hidden') send(true);
    };
    const onPageHide = () => send(true);
    el.addEventListener('play', onPlay);
    el.addEventListener('pause', onPause);
    el.addEventListener('seeked', onSeeked);
    el.addEventListener('timeupdate', onTime);
    el.addEventListener('loadedmetadata', onMeta);
    el.addEventListener('durationchange', onDuration);
    document.addEventListener('visibilitychange', onHide);
    window.addEventListener('pagehide', onPageHide);
    return () => {
      engine.destroy();
      el.removeEventListener('play', onPlay);
      el.removeEventListener('pause', onPause);
      el.removeEventListener('seeked', onSeeked);
      el.removeEventListener('timeupdate', onTime);
      el.removeEventListener('loadedmetadata', onMeta);
      el.removeEventListener('durationchange', onDuration);
      document.removeEventListener('visibilitychange', onHide);
      window.removeEventListener('pagehide', onPageHide);
    };
  }, [src, kind, videoKey]);

  // The portal's mutations toggle, so each sends only when the wanted state differs from the last one asked for.
  const asked = useRef<Record<string, boolean>>({});
  const doneAsked = useRef(vm.mark.done);
  const askedFor = useRef(`${on}:${sync}`);
  if (askedFor.current !== `${on}:${sync}`) { askedFor.current = `${on}:${sync}`; asked.current = {}; doneAsked.current = vm.mark.done; }
  const server = useMemo(() => {
    const m: Record<string, boolean> = {};
    for (const it of layout?.items ?? []) { m[it.id] = it.checked; for (const sub of it.subchecks) m[`${it.id}:${sub.id}`] = sub.checked; }
    return m;
  }, [layout?.items]);
  const onCheck = useCallback(
    (itemId: string, want: boolean) => {
      const have = itemId in asked.current ? asked.current[itemId] : server[itemId];
      if (have === want) return;
      asked.current[itemId] = want;
      clearFault();
      if (local) {
        local.toggle(itemId);
        return;
      }
      if (!writes) return;
      mutate('toggleChecklistItem', { moduleId: vm.mark.moduleId, stepId: vm.mark.stepId!, itemId })
        .then((r) => {
          // A saved toggle has no toast; a toast or an error is a refusal, and the box did not change.
          if (r.error || r.toast) refused(r.error || r.toast?.msg);
        })
        .catch(() => refused());
    },
    [local, writes, mutate, vm.mark.moduleId, vm.mark.stepId, server, refused, clearFault],
  );
  const onStepDone = useCallback(
    (want: boolean) => {
      if (doneAsked.current === want) return;
      doneAsked.current = want;
      if (!writes) return;
      mutate('toggleStep', { moduleId: vm.mark.moduleId, stepId: vm.mark.stepId! })
        .then((r) => {
          if (r.error) refused(r.error);
        })
        .catch(() => refused());
    },
    [writes, mutate, vm.mark.moduleId, vm.mark.stepId, refused],
  );

  // The page's links are plain anchors; the ones inside the app go through the router.
  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      const a = (e.target as Element | null)?.closest?.('[data-step-page] a[href]');
      const href = a?.getAttribute('href');
      if (!href || !href.startsWith('/') || href.startsWith('//') || href.startsWith('/api/')) return;
      e.preventDefault();
      navigate(href);
    };
    document.addEventListener('click', onClick);
    return () => document.removeEventListener('click', onClick);
  }, [navigate]);

  const labels = useMemo(() => ({ ...V6_LABELS, ...V6_MORE }), []);
  const watch: VideoWatch = { progress: vm.videoProgress ?? [], ...(save ? { onSave: save } : {}) };
  const nodes: V6Nodes = {
    marked: (text, spans) => <Marked text={text} spans={spans} />,
    rich: (doc, spans) => <RichTextView doc={doc} spans={spans} />,
    callouts: (list) => <div className="leading">{list.map((c, i) => <Callout key={i} c={c} />)}</div>,
    blocks: (blocks, marks) => <ProseBlocks blocks={blocks} marks={marks} labels={labels} watch={watch} />,
  };
  const step = stepPageStep(vm, layout, kit, { duration, cues, poster, captions, on, choose, hero }, {
    onCalendar: (item) => {
      if (item.action?.type === 'calendar' && item.action.event) saveIcs([item.action.event], Date.now(), 'amplified-impact-session.ics');
    },
    onViewPrompt: () => setViewing(true),
    nodes,
    ...(turnIn ? { turnIn } : {}),
    ...(seatCard ? { seatCard } : {}),
    ...(intakeFiles?.length ? { intakeFiles } : {}),
  });
  // Above Watch: the week's live session on a live-build step, and step 1's Start Here card.
  const lead = (
    <>
      <StepLive week={vm.week} step={vm.n} />
      {vm.startHere ? <StartHereCard card={vm.startHere} collapsible /> : null}
    </>
  );
  const onAccordion = (index: number, open: boolean) => {
    const row = layout?.accordions.find((a) => a.index === index);
    if (!row || !writes) return;
    void mutate('setPref', { key: row.prefKey, value: open ? '1' : '0' });
  };
  const checks = useMemo(() => Object.fromEntries(step.items.map((it) => [it.id, it.checked])), [step.items]);
  // At the top of the checklist: a staff preview's note (checks are not saved) and a refused write's reason.
  const leading = fault || local ? (
    <>
      {local ? <p className="sp-note">{STEP.previewChecks}</p> : null}
      {fault ? <p className="sp-fault" role="alert">{fault}</p> : null}
      {step.leading}
    </>
  ) : step.leading;
  const page = (
    <StepPage step={{ ...step, lead, onAccordion, ...(leading ? { leading } : {}) }} labels={labels} checks={checks} onCheck={onCheck} onStepDone={onStepDone} videoRef={videoRef} sync={sync} />
  );

  return (
    <>
      {vm.glossary?.length ? <GlossaryProvider terms={vm.glossary}>{page}</GlossaryProvider> : page}
      {viewing && kit?.prompt ? <PromptModal prompt={kit.prompt} onClose={() => setViewing(false)} /> : null}
    </>
  );
}
