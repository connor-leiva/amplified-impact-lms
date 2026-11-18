// D-186: the Your Deployment card (E-14, A-6) and its Run dialog (E-15) on the hire's page in the learner
// portal v2: an open week's page and a non-course AI Employee's page. Markup and the browser's wiring
// only (the clipboard, the working state's timer): every string is Hire.vm.ts's, and every change is one
// of core's mutations through `useMutate` (`markDeployed`, `setRuntime`, `recordRun`), so a staff preview
// tab and a masquerade refuse them as they do today.

import { useEffect, useRef, useState } from 'react';
import type { AIEmployee, Learner } from '@ai/core';
import { Icon } from '../../components/Icon';
import { Modal } from '../../components/r2/Modal';
import { useToaster } from '../../components/primitives/Toaster';
import { useMutate } from '../../data/hooks';
import { deployVM, runInput, runVM } from './Hire.vm';
import type { RunState } from './Hire.vm';
import s from './Learn.module.css';
import h from './Hire.module.css';

/** How long the Run dialog says the AI Employee is working before its output shows (the current portal's). */
const WORKING_MS = 1400;

function RunDialog({ m, onClose }: { m: AIEmployee; onClose: () => void }) {
  const mutate = useMutate();
  const { toast } = useToaster();
  const [text, setText] = useState(() => runInput(m));
  const [state, setState] = useState<RunState>('idle');
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    [],
  );
  const vm = runVM(m, text, state);
  const go = () => {
    const record = vm.record;
    setState('running');
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      setState('done');
      void mutate('recordRun', { moduleId: m.id, title: record.title, preview: record.preview });
    }, WORKING_MS);
  };
  const copyAll = () => {
    try {
      void navigator.clipboard.writeText(vm.copyAll.text);
    } catch {
      /* no clipboard permission; the current portal confirms regardless */
    }
    toast(vm.copyAll.toast, 'success');
  };
  return (
    <Modal
      title={vm.title}
      width={560}
      onClose={onClose}
      foot={
        <>
          {vm.done ? (
            <button type="button" className={`${s.b} ${h.act}`} onClick={copyAll}>
              <Icon name="lvCopy" size={14} strokeWidth={1.75} />
              {vm.copyAll.label}
            </button>
          ) : null}
          <button type="button" className={`${s.b} ${s.bp} ${h.act}`} onClick={go} disabled={vm.running}>
            <Icon name="play" size={13} filled />
            {vm.btn}
          </button>
        </>
      }
    >
      {vm.desc ? <p className={`${s.p} ${s.me}`}>{vm.desc}</p> : null}
      <label className={h.lab}>
        <span className={s.w5}>{vm.inputLabel}</span>
        <textarea className={h.in} value={text} onChange={(e) => setText(e.target.value)} rows={6} />
      </label>
      {vm.running ? (
        <p className={`${s.p} ${s.s2} ${h.working}`} role="status">
          <Icon name="spinner" size={16} strokeWidth={2.2} className={h.spin} />
          {vm.working}
        </p>
      ) : null}
      {vm.out.length ? (
        <div className={h.out} role="status">
          {vm.out.map((o) => (
            <div key={o.label} className={h.outRow}>
              <span className={h.outLabel}>{o.label}</span>
              <span className={`${s.p} ${h.pre}`}>{o.body}</span>
            </div>
          ))}
        </div>
      ) : null}
    </Modal>
  );
}

/** The Your Deployment card for this module and learner. */
export function DeployCard({ m, me, now }: { m: AIEmployee; me: Learner | null; now: number }) {
  const mutate = useMutate();
  const { toast } = useToaster();
  const [running, setRunning] = useState(false);
  const vm = deployVM(me, m, now);
  const primary = () => {
    const a = vm.primary.action;
    if (a === 'run') setRunning(true);
    else if (a === 'resume' || a === 'reconnect') void mutate('setRuntime', { moduleId: m.id, runtime: 'deployed' });
    else if (a === 'markDeployed') void mutate('markDeployed', { moduleId: m.id });
  };
  return (
    <section className={`${s.cd} ${h.card}`} aria-labelledby="lv-dp-t" data-attention={vm.attention ? 'true' : undefined}>
      <div className={s.cdh}>
        <h2 className={`${s.h2} ${s.grow}`} id="lv-dp-t">
          {vm.heading}
        </h2>
        <span className={h.rt} data-tone={vm.status.tone} title={vm.status.tip} data-runtime={vm.runtime}>
          <Icon name={vm.status.icon} size={13} strokeWidth={2} />
          {vm.status.label}
        </span>
      </div>
      {vm.platform ? (
        <div className={s.li}>
          <span className={h.pt} aria-hidden="true">
            <Icon name="bot" size={15} strokeWidth={1.8} />
          </span>
          <div className={`${s.colZ} ${s.grow}`}>
            <span className={s.me}>{vm.platform.label}</span>
            <span className={s.w5}>{vm.platform.value}</span>
          </div>
          {vm.open ? (
            <button type="button" className={`${s.b} ${s.bq} ${h.act}`} onClick={() => toast(vm.open!.toast, 'info')}>
              {vm.open.label}
              <Icon name="lvExternal" size={13} strokeWidth={1.75} />
            </button>
          ) : null}
        </div>
      ) : null}
      <div className={`${s.cdb} ${h.body}`}>
        {vm.when ? (
          <p className={`${s.p} ${s.me}`} title={vm.when.abs}>
            {vm.when.text}
          </p>
        ) : null}
        {vm.issue ? (
          <p className={`${s.p} ${h.issue}`}>
            <Icon name="alert" size={14} strokeWidth={2} />
            {vm.issue}
          </p>
        ) : null}
        {vm.last ? (
          <div className={h.last}>
            <div className={h.lastHead}>
              <span className={s.w5}>{vm.last.heading}</span>
              <span className={s.me} title={vm.last.abs}>
                {vm.last.ago}
              </span>
            </div>
            <div className={h.lastBox}>
              <span className={s.w5}>{vm.last.title}</span>
              <span className={`${s.me} ${h.clamp}`}>{vm.last.preview}</span>
            </div>
          </div>
        ) : null}
        {vm.note ? <p className={`${s.p} ${s.s2}`}>{vm.note}</p> : null}
      </div>
      <div className={s.cdf}>
        <button type="button" className={`${s.b} ${s.bp} ${h.act} ${h.grow}`} aria-disabled={vm.primary.disabled ? 'true' : undefined} onClick={vm.primary.disabled ? undefined : primary}>
          <Icon name={vm.primary.icon} size={14} strokeWidth={1.9} />
          {vm.primary.label}
        </button>
        {vm.secondary ? (
          <button type="button" className={`${s.b} ${h.act}`} onClick={() => void mutate('setRuntime', { moduleId: m.id, runtime: 'paused' })}>
            <Icon name="pause" size={14} strokeWidth={1.9} />
            {vm.secondary.label}
          </button>
        ) : null}
      </div>
      {running ? <RunDialog m={m} onClose={() => setRunning(false)} /> : null}
    </section>
  );
}
