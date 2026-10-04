import { useCallback, useRef, useState } from 'react';
import { useBlocker, useNavigate, useParams } from 'react-router';
import { fmt } from '@ai/core';
import type { AIEmployee, Db, ModuleStatus, Tier } from '@ai/core';

import { EmployeeCard } from '../../components/EmployeeCard';
import { Icon } from '../../components/Icon';
import { LockedEmployeePreview } from '../../components/LockedEmployeePreview';
import { StatusToken } from '../../components/StatusToken';
import { Button } from '../../components/primitives/Button';
import { Card } from '../../components/primitives/Card';
import { Field, Input, Select, Textarea } from '../../components/primitives/Field';
import { Modal } from '../../components/primitives/Modal';
import { Segmented } from '../../components/primitives/Segmented';
import { useToaster } from '../../components/primitives/Toaster';
import { isFixture } from '../../data/boot';
import { useDb, useMutate, useNow } from '../../data/hooks';
import { clock } from '../../lib/clock';
import {
  DEFAULT_OPENS,
  PREVIEW_TABS,
  PREVIEW_TIERS,
  SESSION_OPTIONS,
  TIER_OPTIONS,
  moduleBuilderVM,
  moveStep,
  nextFile,
  normalizeSaved,
  parseMinutes,
  parseReplayAt,
  seedDraft,
} from './ModuleBuilder.vm';
import type { PreviewTab } from './ModuleBuilder.vm';
import s from './ModuleBuilder.module.css';

// Admin Module Builder `/admin/curriculum/:employeeId` and `/admin/curriculum/new`.
// Ported from design-reference/Admin Module Builder.dc.html. Contract: SCREENS § 4.3, phase 06 § 6.3.
//
// MARKUP ONLY plus the wiring the browser owns: the local draft, the router and the unsaved-changes
// prompt. Every string, tone, icon, option list and preview view-model comes from
// `moduleBuilderVM`; nothing here reads the clock for a rendered value or recomputes status, and
// the only writes go through the `saveModule` / `deleteModule` mutations in @ai/core.

/** The nine plain-text fields the Basics and Deployment cards edit. */
type TextKey = 'name' | 'short' | 'outcome' | 'headline' | 'forWho' | 'prompt' | 'notes' | 'platform' | 'runLabel';

interface BuilderState {
  /** The route this draft was seeded from: the module id, or `''` for `/new`. */
  key: string;
  draft: AIEmployee;
  dirty: boolean;
  savedAt: number | null;
  errors: string[];
  pv: PreviewTab;
  pvTier: Tier;
}

/** The reference's `sync()`: switching route throws the draft away and starts again. */
function seedState(db: Db, id: string | null, pv: PreviewTab): BuilderState {
  const draft = seedDraft(db, id, clock.now());
  return {
    key: id ?? '',
    draft,
    dirty: false,
    savedAt: null,
    errors: [],
    // `sync()` resets the tier toggle to the draft's own tier but leaves the pane alone.
    pv,
    pvTier: draft.tier === 'team' ? 'team' : 'agent',
  };
}

export function Component() {
  const db = useDb();
  const now = useNow();
  const mutate = useMutate();
  const navigate = useNavigate();
  const { toast } = useToaster();
  const params = useParams();

  // The route is wired either as one `:employeeId` segment or as a separate `/new` child, so both
  // spellings resolve to "no saved module yet".
  const raw = params.employeeId;
  const routeId = !raw || raw === 'new' ? null : raw;

  const [st, setSt] = useState<BuilderState>(() => seedState(db, routeId, 'card'));

  // Set by `save()` when a brand-new draft is stored: the navigation to `/admin/curriculum/:id` is
  // in flight, so `/new` must not reseed a blank draft over the one just written. Cleared the
  // moment the URL names any AI Employee, whether this one or another.
  const savedNew = useRef<string | null>(null);
  if (savedNew.current !== null && routeId !== null) savedNew.current = null;

  // Adjusting state during render, rather than in an effect: a route change must not paint the
  // previous AI Employee's draft for a frame.
  if (st.key !== (routeId ?? '') && savedNew.current === null) setSt(seedState(db, routeId, st.pv));

  // Consumed by the blocker for the two navigations the screen performs itself (after a delete, and
  // after the first save of a new draft), which must never raise the discard prompt.
  const bypass = useRef(false);
  const blocker = useBlocker(() => {
    if (bypass.current) {
      bypass.current = false;
      return false;
    }
    return st.dirty;
  });

  /** The reference's `up()`: edit a copy of the draft, mark it dirty, clear stale errors. */
  const up = useCallback((fn: (d: AIEmployee) => void) => {
    setSt((prev) => {
      const draft = structuredClone(prev.draft);
      fn(draft);
      return { ...prev, draft, dirty: true, errors: [] };
    });
  }, []);

  const setText = useCallback(
    (k: TextKey, v: string) =>
      up((d) => {
        d[k] = v;
      }),
    [up],
  );

  const save = useCallback(
    async (status?: ModuleStatus) => {
      const isNew = !st.key;
      const out = await mutate('saveModule', { draft: st.draft, status });
      if (out.error) {
        // `saveModule` joins the validation messages with newlines (SCREENS § 4.3).
        const errors = out.error.split('\n');
        setSt((prev) => ({ ...prev, errors }));
        return;
      }
      const saved = normalizeSaved(st.draft, status);
      setSt((prev) => ({
        ...prev,
        key: saved.id,
        draft: saved,
        dirty: false,
        errors: [],
        savedAt: clock.now(),
      }));
      if (isNew) {
        savedNew.current = saved.id;
        bypass.current = true;
        void navigate(`/admin/curriculum/${saved.id}`);
      }
    },
    [mutate, navigate, st.draft, st.key],
  );

  const remove = useCallback(async () => {
    const out = await mutate('deleteModule', { id: st.draft.id });
    if (out.error) {
      setSt((prev) => ({ ...prev, errors: out.error!.split('\n') }));
      return;
    }
    bypass.current = true;
    void navigate('/admin/curriculum');
  }, [mutate, navigate, st.draft.id]);

  const back = useCallback(() => void navigate('/admin/curriculum'), [navigate]);

  const vm = moduleBuilderVM(db, st.draft, now, {
    pv: st.pv,
    pvTier: st.pvTier,
    dirty: st.dirty,
    savedAt: st.savedAt,
    errors: st.errors,
  });

  const openPortal = () => {
    if (!vm.portal.live) {
      toast(vm.portal.toast, 'info');
      return;
    }
    // phase 06 § 6.4: fixture mode previews by switching persona, as the prototype does; http mode
    // opens the learner route in a second tab.
    if (isFixture) window.location.assign(`${vm.portal.path}?as=${vm.portal.role}`);
    else window.open(vm.portal.path, '_blank', 'noopener');
  };

  return (
    <div className={s.root}>
      <div className={s.bar}>
        <button type="button" aria-label="Back to curriculum" className={s.back} onClick={back}>
          <Icon name="chevL" size={16} strokeWidth={2} />
        </button>
        <div className={s.barMain}>
          <span className={s.barTitle}>{vm.title}</span>
          <StatusToken kind="custom" tone={vm.pill.tone} icon={vm.pill.icon} label={vm.pill.label} />
          <span className={s.saveNote} data-dirty={vm.dirty ? 'true' : undefined}>
            {vm.saveNote}
          </span>
        </div>
        {vm.canDelete ? (
          <button type="button" className={`${s.barBtn} ${s.danger}`} onClick={() => void remove()}>
            Delete Draft
          </button>
        ) : null}
        <button type="button" className={`${s.barBtn} ${s.secondary}`} onClick={() => void save(undefined)}>
          {vm.saveLabel}
        </button>
        <button type="button" className={`${s.barBtn} ${s.primary}`} onClick={() => void save('published')}>
          <Icon name="rocket" size={14} strokeWidth={1.9} />
          {vm.publishLabel}
        </button>
      </div>

      <div className={s.body}>
        <div className={s.left}>
          {vm.errors.length ? (
            <div role="alert" className={s.alert}>
              {vm.errors.map((e) => (
                <div key={e}>{e}</div>
              ))}
            </div>
          ) : null}

          {/* 1 · Basics */}
          <Card title="Basics" gap={14}>
            <div className={s.pair}>
              <Field label="Name">
                <Input value={vm.d.name} onChange={(e) => setText('name', e.target.value)} />
              </Field>
              <Field label="Sidebar Label">
                <Input value={vm.d.short} onChange={(e) => setText('short', e.target.value)} />
              </Field>
            </div>
            <Field label="Outcome Line" helper="Input → outputs. Shown under the title and on the card.">
              <Input
                value={vm.d.outcome}
                onChange={(e) => setText('outcome', e.target.value)}
                placeholder="Paste an MLS listing → Fair-Housing-checked description, 5 social posts, 1 email."
              />
            </Field>
            <Field label="Outcome Headline" helper="Used in the locked preview and on the Team tier page.">
              <Input value={vm.d.headline} onChange={(e) => setText('headline', e.target.value)} />
            </Field>
            <Field label="For" helper="Completes “For …” in the metadata line.">
              <Input value={vm.d.forWho} onChange={(e) => setText('forWho', e.target.value)} />
            </Field>
            <div className={s.rowWrap}>
              <div className={s.stack}>
                <span className={s.fieldLabel}>Icon</span>
                <div className={s.iconGrid}>
                  {vm.icons.map((i) => (
                    <button
                      key={i.key}
                      type="button"
                      aria-label={`Icon ${i.key}`}
                      aria-pressed={i.on}
                      className={s.iconToggle}
                      data-on={i.on ? 'true' : undefined}
                      onClick={() =>
                        up((d) => {
                          d.icon = i.key;
                        })
                      }
                    >
                      <Icon name={i.key} size={16} strokeWidth={1.8} />
                    </button>
                  ))}
                </div>
              </div>
              <div className={s.stack}>
                <span className={s.fieldLabel}>Tier Access</span>
                <Segmented
                  label="Tier Access"
                  className={s.tierSeg}
                  options={TIER_OPTIONS}
                  value={vm.d.tier}
                  height={28}
                  pad={12}
                  onChange={(tier) =>
                    up((d) => {
                      d.tier = tier;
                    })
                  }
                />
                <span className={s.note}>{vm.tierNote}</span>
              </div>
            </div>
          </Card>

          {/* 2 · Outputs */}
          <Card
            title="Outputs"
            gap={10}
            titleGap={10}
            titleAside={<span className={s.note}>Three bullets for the locked preview and Team tier page</span>}
          >
            {vm.outputs.map((o) => (
              <div key={o.n} className={s.outputRow}>
                <span className={s.ordinal}>{o.n}.</span>
                <Input
                  className={s.outputInput}
                  value={o.value}
                  placeholder="What it produces"
                  onChange={(e) => {
                    const v = e.target.value;
                    up((d) => {
                      d.outputs[o.n - 1] = v;
                    });
                  }}
                />
              </div>
            ))}
          </Card>

          {/* 3 · Live Session & Replay */}
          <Card title="Live Session & Replay" gap={12}>
            <Field label="Linked Session (Applies to Every Cohort)">
              <Select
                value={vm.sessionStr}
                onChange={(e) => {
                  const v = e.target.value;
                  up((d) => {
                    d.session = v ? parseInt(v, 10) : null;
                  });
                }}
              >
                {SESSION_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </Select>
            </Field>
            {vm.sessWarn ? <div className={s.warn}>{vm.sessWarn}</div> : null}
            <div className={s.replay}>
              <span className={s.replayTile} data-tone={vm.replay.tone}>
                <Icon name={vm.replay.icon} size={17} strokeWidth={1.8} />
              </span>
              <div className={s.replayMain}>
                <div className={s.replayTitle}>{vm.replay.title}</div>
                <div className={s.replaySub}>{vm.replay.sub}</div>
              </div>
              <button type="button" className={s.smallBtn} onClick={() => toast(vm.replay.toast, 'info')}>
                <Icon name="upload" size={14} strokeWidth={1.9} />
                {vm.replay.btn}
              </button>
            </div>
          </Card>

          {/* 4 · Build Steps — always six. Reorder only (phase 06 § 6.3). */}
          <Card
            title="Build Steps"
            gap={10}
            titleGap={10}
            titleAside={
              <span className={s.note}>Six steps · each one is a chapter in the replay · {vm.totalMins} min total</span>
            }
          >
            {vm.steps.map((step) => {
              const i = step.n - 1;
              return (
                <div key={i} className={s.step}>
                  <div className={s.moveCol}>
                    <button
                      type="button"
                      aria-label="Move step up"
                      aria-disabled={!step.canUp || undefined}
                      className={s.move}
                      data-off={step.canUp ? undefined : 'true'}
                      onClick={
                        step.canUp
                          ? () =>
                              up((d) => {
                                d.checklist = moveStep(d.checklist, i, -1);
                              })
                          : undefined
                      }
                    >
                      <Icon name="chevU" size={13} strokeWidth={2.2} />
                    </button>
                    <button
                      type="button"
                      aria-label="Move step down"
                      aria-disabled={!step.canDown || undefined}
                      className={s.move}
                      data-off={step.canDown ? undefined : 'true'}
                      onClick={
                        step.canDown
                          ? () =>
                              up((d) => {
                                d.checklist = moveStep(d.checklist, i, 1);
                              })
                          : undefined
                      }
                    >
                      <Icon name="chevD" size={13} strokeWidth={2.2} />
                    </button>
                  </div>
                  <span className={s.stepN}>{step.n}.</span>
                  <div className={s.stepMain}>
                    <Input
                      className={s.stepText}
                      value={step.text}
                      placeholder="What the learner does"
                      aria-label={`Step ${step.n} title`}
                      onChange={(e) => {
                        const v = e.target.value;
                        up((d) => {
                          d.checklist[i]!.text = v;
                        });
                      }}
                    />
                    <Input
                      className={s.stepHint}
                      value={step.hint}
                      placeholder="Optional hint"
                      aria-label={`Step ${step.n} hint`}
                      onChange={(e) => {
                        const v = e.target.value;
                        up((d) => {
                          d.checklist[i]!.hint = v;
                        });
                      }}
                    />
                    <div className={s.stepMetaRow}>
                      <label className={s.inlineLabel}>
                        Chapter
                        <Input
                          className={`${s.stepMeta} ${s.chInput}`}
                          value={step.ch}
                          onChange={(e) => {
                            const v = e.target.value;
                            up((d) => {
                              d.checklist[i]!.ch = v;
                            });
                          }}
                        />
                      </label>
                      <label className={s.inlineLabel}>
                        Replay At
                        <Input
                          className={`${s.stepMeta} ${s.tInput}`}
                          value={step.t}
                          onChange={(e) => {
                            const v = parseReplayAt(e.target.value);
                            up((d) => {
                              d.checklist[i]!.t = v;
                            });
                          }}
                        />
                      </label>
                      <label className={s.inlineLabel}>
                        Minutes
                        <Input
                          className={`${s.stepMeta} ${s.minsInput}`}
                          type="number"
                          min={1}
                          value={step.mins}
                          onChange={(e) => {
                            const v = parseMinutes(e.target.value);
                            up((d) => {
                              d.checklist[i]!.mins = v;
                            });
                          }}
                        />
                      </label>
                    </div>
                  </div>
                </div>
              );
            })}
          </Card>

          {/* 5 · System Prompt */}
          <Card
            title="System Prompt"
            gap={10}
            titleGap={12}
            titleAside={<span className={s.note}>{vm.promptStats}</span>}
          >
            <Textarea
              className={s.prompt}
              value={vm.d.prompt}
              spellCheck={false}
              aria-label="System prompt"
              onChange={(e) => setText('prompt', e.target.value)}
            />
            <div className={s.varsRow}>
              Variables Learners Fill In:
              {vm.vars.map((v) => (
                <span key={v} className={s.varChip}>
                  {v}
                </span>
              ))}
              {vm.noVars ? <span>None yet. Wrap a placeholder in double braces, like {vm.example}.</span> : null}
            </div>
          </Card>

          {/* 6 · Skill Files & Assets */}
          <Card title="Skill Files & Assets" gap={10}>
            {vm.files.map((f) => (
              <div key={f.index} className={s.fileRow}>
                <span className={s.fileType}>{f.type}</span>
                <div className={s.fileMain}>
                  <div className={s.fileName}>{f.name}</div>
                  <div className={s.fileMeta}>{f.meta}</div>
                </div>
                <button
                  type="button"
                  aria-label={`Remove ${f.name}`}
                  className={s.fileRemove}
                  onClick={() =>
                    up((d) => {
                      d.files.splice(f.index, 1);
                    })
                  }
                >
                  <Icon name="trash" size={14} strokeWidth={1.9} />
                </button>
              </div>
            ))}
            <button
              type="button"
              className={s.drop}
              onClick={() =>
                up((d) => {
                  d.files.push(nextFile(d));
                })
              }
            >
              <Icon name="upload" size={18} strokeWidth={1.8} />
              Drop JSON or YAML skill files, or a Notion export
            </button>
          </Card>

          {/* 7 · Deployment */}
          <Card title="Deployment" gap={12}>
            <div className={s.pair}>
              <Field label="Platform">
                <Input value={vm.d.platform} onChange={(e) => setText('platform', e.target.value)} />
              </Field>
              <Field label="Run Button Label">
                <Input value={vm.d.runLabel} onChange={(e) => setText('runLabel', e.target.value)} />
              </Field>
            </div>
            <Field label="Instructor Notes">
              <Textarea
                className={s.notes}
                value={vm.d.notes}
                placeholder="Tips learners see next to the checklist"
                onChange={(e) => setText('notes', e.target.value)}
              />
            </Field>
          </Card>

          {/* 8 · Publishing */}
          <Card title="Publishing" gap={10}>
            <div className={s.choices}>
              {vm.statuses.map((o) => (
                <button
                  key={o.key}
                  type="button"
                  aria-pressed={o.on}
                  className={s.choice}
                  data-on={o.on ? 'true' : undefined}
                  onClick={() =>
                    up((d) => {
                      d.status = o.key;
                      if (o.key === 'scheduled' && !d.opens) d.opens = DEFAULT_OPENS;
                    })
                  }
                >
                  <span className={s.choiceLabel}>{o.label}</span>
                  <span className={s.choiceSub}>{o.sub}</span>
                </button>
              ))}
            </div>
            {vm.isScheduled ? (
              <label className={s.opensRow}>
                Opens On
                <Input
                  className={s.opensInput}
                  type="date"
                  value={vm.opensDate}
                  onChange={(e) => {
                    const v = e.target.value;
                    up((d) => {
                      d.opens = v ? fmt.fromCT(v, '09:00') : null;
                    });
                  }}
                />
                <span className={s.opensAt}>at 9:00 AM CT</span>
              </label>
            ) : null}
          </Card>
        </div>

        <div className={s.right}>
          <div className={s.pvHead}>
            <span className={s.pvTitle}>Live Learner Preview</span>
            <div className={s.pvSegs}>
              <Segmented
                label="Live Learner Preview"
                className={s.pvSeg}
                options={PREVIEW_TABS}
                value={vm.pv}
                height={26}
                pad={10}
                onChange={(pv) => setSt((prev) => ({ ...prev, pv }))}
              />
              <Segmented
                label="Preview tier"
                className={s.pvSeg}
                options={PREVIEW_TIERS}
                value={vm.pvTier}
                height={26}
                pad={10}
                onChange={(pvTier) => setSt((prev) => ({ ...prev, pvTier }))}
              />
            </div>
          </div>

          <div className={s.canvas}>
            {vm.pvCard ? (
              <div className={s.cardWrap}>
                <EmployeeCard card={vm.card} />
              </div>
            ) : null}
            {vm.pvLocked ? <LockedEmployeePreview items={vm.lockedItems} index={0} /> : null}
            {vm.pvHeader ? (
              <div className={s.headerMock}>
                <div className={s.headerTop}>
                  <span className={s.headerName}>{vm.d.name}</span>
                  <StatusToken kind="runtime" state="not_deployed" />
                </div>
                <div className={s.headerOutcome}>{vm.outcomeOrHint}</div>
                <div className={s.headerMeta}>{vm.metaLine}</div>
              </div>
            ) : null}
          </div>

          <button type="button" className={s.portalLink} onClick={openPortal}>
            Open in Learner Portal
            <Icon name="arrowUR" size={13} strokeWidth={2} />
          </button>
        </div>
      </div>

      {/*
        The one approved net-new interaction (phase 06 § 6.3, DECISIONS.md D-015): leaving with an
        unsaved draft asks before discarding it. The prototype simply loses the draft.
      */}
      {blocker.state === 'blocked' ? (
        <Modal open label="Discard unsaved changes?" width={420} onClose={() => blocker.reset?.()}>
          <div className={s.discard}>
            <h2 className={s.discardTitle}>Discard unsaved changes?</h2>
            <div className={s.discardActions}>
              <Button variant="secondary" onClick={() => blocker.reset?.()}>
                Keep Editing
              </Button>
              <Button variant="primary" onClick={() => blocker.proceed?.()}>
                Discard
              </Button>
            </div>
          </div>
        </Modal>
      ) : null}
    </div>
  );
}

export default Component;
