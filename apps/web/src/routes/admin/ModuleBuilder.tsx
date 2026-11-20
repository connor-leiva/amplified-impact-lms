import { useCallback, useRef, useState } from 'react';
import { useBlocker, useNavigate, useParams } from 'react-router';
import clsx from 'clsx';
import { MODULE_ICONS, addStep, duplicateStep, moduleVideos, removeStep } from '@ai/core';
import { ACCELERATOR_COHORT_ID } from '@ai/core/accelerator';
import type { AIEmployee, Db, ModuleStatus } from '@ai/core';

import { Icon } from '../../components/Icon';
import { useToaster } from '../../components/primitives/Toaster';
import { Button } from '../../components/r2/Button';
import { Card } from '../../components/r2/Card';
import { Menu } from '../../components/r2/Menu';
import { Confirm, Modal } from '../../components/r2/Modal';
import { Page } from '../../components/r2/Page';
import { Status } from '../../components/r2/Status';
import { Table } from '../../components/r2/Table';
import type { Column } from '../../components/r2/Table';
import { TierPill } from '../../components/r2/TierPill';
import { KV, PageHead, Pill, Sel, TextArea, k } from '../../components/r2/kit';
import { isFixture } from '../../data/boot';
import { useAct, useDb, useNow } from '../../data/hooks';
import { clock } from '../../lib/clock';
import { useViewportWidth } from '../../shell/hooks';
import {
  DEFAULT_OPENS,
  builderR2VM,
  moveStepTo,
  nextFile,
  normalizeSaved,
  opensFrom,
  opensInput,
  parseMinutes,
  parseReplayAt,
  seedDraft,
} from './ModuleBuilder.vm';
import type { BuilderR2Step } from './ModuleBuilder.vm';
import { CoursePreview, DateTime, StepWeekFields, WeekCards } from './WeekBuilder';
import { TONES, TONE_LABELS, draftIssues, isWeekDraft, mtWhen, weekKit, weekSessions } from './WeekBuilder.vm';
import s from './ModuleBuilder.module.css';

// Admin Module Builder `/admin/curriculum/:employeeId` and `/admin/curriculum/new` on the Admin
// redesign R2 (D-160 R2-2): the signed-off mockup's `Builder` (AdminRedesign.jsx), drawn from
// `builderR2VM`. The draft, the unsaved-changes prompt and every write (`saveModule`) are as before.
//
//   - The left list (a select on a phone) opens another AI Employee.
//   - Name and Summary (the outcome line) edit in place; each step's title edits in its row; the drag
//     handle (or Alt with an arrow key) reorders the six steps; Attach adds a file.
//   - Settings: Status is a menu (Draft, Scheduled, Published), which saves with that status, so
//     Published runs the publish checks; Tier access is the tier pill.
//   - Save changes / Saved saves the draft with its status.
//   - The fields the mockup does not draw (sidebar label, headline, for, icon, outputs, live session,
//     opening day, platform, run label, notes, system prompt, removing a file) are in "Edit details",
//     the AI Employee's icon tile; a step's hint, chapter, replay time and minutes in its "…" menu.
//   - D-172: Add step appends the mockup's new step (Build, "New step", 5 min); a step's "…" adds the
//     mockup's Duplicate step (a copy, last) and Remove step (after a confirm). Each changes the draft,
//     as every other edit here does, so Discard undoes it; Save changes persists the draft through
//     `saveBuilderModule` (core's `saveModule`, learners' checks kept on their steps, one audited
//     `module.save` row). Connor's request (Nov 16) supersedes phase 06 § 6.3's "exactly 6 steps";
//     publishing still needs six titled steps (`saveModule`'s check).

type TextKey = 'short' | 'headline' | 'forWho' | 'prompt' | 'notes' | 'platform' | 'runLabel';

interface BuilderState {
  key: string;
  draft: AIEmployee;
  dirty: boolean;
  errors: string[];
}

const seedState = (db: Db, id: string | null): BuilderState => ({
  key: id ?? '',
  draft: seedDraft(db, id, clock.now()),
  dirty: false,
  errors: [],
});

const STATUSES: readonly [ModuleStatus, string][] = [
  ['draft', 'Draft'],
  ['scheduled', 'Scheduled'],
  ['published', 'Published'],
];

export function Component() {
  const db = useDb();
  const now = useNow();
  const act = useAct();
  const navigate = useNavigate();
  const { toast } = useToaster();
  const params = useParams();
  const phone = useViewportWidth() < 768;

  const raw = params.employeeId;
  const routeId = !raw || raw === 'new' ? null : raw;
  const [st, setSt] = useState<BuilderState>(() => seedState(db, routeId));
  const [details, setDetails] = useState(false);
  const [stepAt, setStepAt] = useState<number | null>(null);
  const [removeAt, setRemoveAt] = useState<number | null>(null);
  const [previewing, setPreviewing] = useState(false);

  // A brand-new draft just saved: `/new` must not reseed over it while the navigation is in flight.
  const savedNew = useRef<string | null>(null);
  if (savedNew.current !== null && routeId !== null) savedNew.current = null;
  if (st.key !== (routeId ?? '') && savedNew.current === null) setSt(seedState(db, routeId));

  const bypass = useRef(false);
  const blocker = useBlocker(() => {
    if (bypass.current) {
      bypass.current = false;
      return false;
    }
    return st.dirty;
  });

  const up = useCallback((fn: (d: AIEmployee) => void) => {
    setSt((prev) => {
      const draft = structuredClone(prev.draft);
      fn(draft);
      return { ...prev, draft, dirty: true, errors: [] };
    });
  }, []);
  const setText = (key: TextKey, v: string) =>
    up((d) => {
      d[key] = v;
    });

  const save = useCallback(
    async (status?: ModuleStatus) => {
      const isNew = !st.key;
      const draft = structuredClone(st.draft);
      if (status === 'scheduled' && !draft.opens) draft.opens = DEFAULT_OPENS;
      const out = await act('saveBuilderModule', { draft, status });
      if (out.error) {
        setSt((prev) => ({ ...prev, errors: out.error!.split('\n') }));
        return;
      }
      const saved = normalizeSaved(draft, status);
      setSt((prev) => ({ ...prev, key: saved.id, draft: saved, dirty: false, errors: [] }));
      if (isNew) {
        savedNew.current = saved.id;
        bypass.current = true;
        void navigate(`/admin/curriculum/${saved.id}`);
      }
    },
    [act, navigate, st.draft, st.key],
  );

  const d = st.draft;
  const vm = builderR2VM(db, d, { dirty: st.dirty, saved: !!st.key }, now);
  // D-174: a course week gets the course's cards; an AI Employee is drawn as the R2 mockup draws it.
  const week = isWeekDraft(d) ? d : null;
  // D-174: what Save would be refused for, while staff type (the copy rules on what changed).
  const issues = st.dirty ? draftIssues(db.modules.find((m) => m.id === d.id) ?? null, d) : [];
  const live = db.modules.some((m) => m.id === d.id && m.status === 'published');

  /** Preview as Learner: the published AI Employee as the learner its tier calls for (phase 06 § 6.4). */
  const preview = () => {
    // D-174: a course week previews the learner's course page from the unsaved draft, in place.
    if (week) {
      setPreviewing(true);
      return;
    }
    if (!live) {
      toast('Publish first. Drafts are hidden from learners.', 'info');
      return;
    }
    const path = `/employees/${d.id}`;
    const role = d.tier === 'team' ? 'owner' : 'agent';
    if (isFixture) window.location.assign(`${path}?as=${role}`);
    else window.open(`${path}?preview=${role}`, '_blank', 'noopener');
  };

  const open = (id: string) => void navigate(`/admin/curriculum/${id}`);

  const cols: Column<BuilderR2Step>[] = [
    {
      key: 'step',
      label: 'Step',
      width: 'minmax(0,1fr)',
      value: (r) => r.text,
      cell: (r) => {
        const i = Number(r.key);
        return (
          <TextArea
            rows={1}
            className={s.step}
            aria-label={`Step ${i + 1} title`}
            title={r.text}
            value={r.text}
            onChange={(e) => {
              const v = e.target.value;
              up((x) => {
                // D-212: on a course week the title the learner sees is `ch` (learn.vm's stepTitle), so the
                // title edits it; an AI Employee's step keeps its text.
                if (x.kind === 'week') x.checklist[i]!.ch = v;
                else x.checklist[i]!.text = v;
              });
            }}
          />
        );
      },
    },
    {
      key: 'type',
      label: 'Type',
      width: '64px',
      value: (r) => r.kind,
      cell: (r) => (r.kind ? <Pill>{r.kind}</Pill> : null),
    },
    { key: 'len', label: 'Length', width: '48px', num: true, value: (r) => r.length },
  ];

  const step = stepAt !== null ? d.checklist[stepAt] : null;

  return (
    <Page>
      <PageHead
        title="Module Builder"
        description="Edit one AI Employee: its steps, files, tier access, and live session."
        right={
          <>
            <Button header icon="r2Eye" onClick={preview}>
              Preview as Learner
            </Button>
            <Button header kind="primary" onClick={() => void save()}>
              {vm.saveLabel}
            </Button>
          </>
        }
      />
      {st.errors.length ? (
        <div role="alert" className={s.alert}>
          {st.errors.map((e) => (
            <p key={e} className={k.p}>
              {e}
            </p>
          ))}
        </div>
      ) : null}
      {issues.length && !st.errors.length ? (
        <div role="status" className={s.alert}>
          <p className={k.p}>Fix these before you save:</p>
          {issues.map((e) => (
            <p key={e} className={k.p}>
              {e}
            </p>
          ))}
        </div>
      ) : null}
      <div className={s.bb}>
        {phone ? (
          <Sel className={k.full} aria-label="AI Employee" value={st.key || ''} onChange={(e) => open(e.target.value)}>
            {st.key ? null : <option value="">{d.name}</option>}
            {vm.list.map((x) => (
              <option key={x.id} value={x.id}>
                {x.name}
              </option>
            ))}
          </Sel>
        ) : (
          <nav className={clsx(k.cd, s.list)} aria-label="AI Employees">
            {vm.list.map((x) => (
              <button
                key={x.id}
                type="button"
                className={clsx(s.ni, x.on && s.on)}
                aria-current={x.on ? 'page' : undefined}
                onClick={() => open(x.id)}
              >
                <Status tone={x.tone} />
                <span className={k.el}>{x.name}</span>
              </button>
            ))}
          </nav>
        )}
        <div className={k.col}>
          <section className={clsx(k.cd, s.pd, k.col, k.colM)}>
            <div className={clsx(k.row, k.nw)}>
              <button
                type="button"
                className={s.tile}
                aria-label="Edit details"
                title="Edit details"
                onClick={() => setDetails(true)}
              >
                <span className={s.mt}>
                  <Icon name={vm.icon} size={16} strokeWidth={1.75} />
                </span>
              </button>
              <input
                className={clsx(k.in, s.ine, s.name)}
                aria-label="Name"
                value={d.name}
                onChange={(e) => {
                  const v = e.target.value;
                  up((x) => {
                    x.name = v;
                  });
                }}
              />
            </div>
            <input
              className={clsx(k.in, s.ine)}
              aria-label="Summary"
              value={d.outcome}
              onChange={(e) => {
                const v = e.target.value;
                up((x) => {
                  x.outcome = v;
                });
              }}
            />
          </section>
          <Table
            label="Steps"
            title={`Steps · ${vm.steps.length}`}
            right={
              <Button
                kind="quiet"
                icon="r2Plus"
                onClick={() =>
                  up((x) => {
                    x.checklist = addStep(x.checklist);
                  })
                }
              >
                Add step
              </Button>
            }
            cols={cols}
            rows={vm.steps}
            rowKey={(r) => r.key}
            onMove={(a, b) =>
              up((x) => {
                x.checklist = moveStepTo(x.checklist, a, b);
              })
            }
            menu={(r) => [
              { label: 'Edit step details', onSelect: () => setStepAt(Number(r.key)) },
              {
                label: 'Duplicate step',
                onSelect: () =>
                  up((x) => {
                    x.checklist = duplicateStep(x.checklist, Number(r.key));
                  }),
              },
              { label: 'Remove step', danger: true, onSelect: () => setRemoveAt(Number(r.key)) },
            ]}
            empty={{ icon: 'r2Builder', title: 'No steps yet' }}
          />
          <Card
            title={`Files · ${vm.files.length}`}
            pad={false}
            right={
              <Button
                kind="quiet"
                icon="r2Plus"
                onClick={() =>
                  up((x) => {
                    x.files.push(nextFile(x));
                  })
                }
              >
                Attach
              </Button>
            }
          >
            {vm.files.map((f, i) => (
              <div key={`${i}:${f.name}`} className={k.li}>
                <Icon name="r2File" size={16} strokeWidth={1.75} />
                <span className={clsx(k.mo, k.el, k.sp)}>{f.name}</span>
                <span className={k.mu}>{f.desc}</span>
                <span className={clsx(k.me, k.tn, s.size)}>{f.size}</span>
              </div>
            ))}
          </Card>
          {week ? <WeekCards db={db} draft={week} up={up} act={act} /> : null}
        </div>
        <Card title="Settings">
          <div className={clsx(k.col, s.kvs)}>
            <KV
              rows={[
                {
                  label: 'Status',
                  value: (
                    <Menu
                      label="Status"
                      placement="below-left"
                      items={STATUSES.map(([key, label]) => ({
                        label,
                        checked: d.status === key,
                        onSelect: () => void save(key),
                      }))}
                      trigger={(t) => (
                        <button
                          type="button"
                          className={s.plain}
                          aria-label={`Status: ${vm.status.label}`}
                          {...t.props}
                          onClick={t.toggle}
                        >
                          <Status tone={vm.status.tone}>{vm.status.label}</Status>
                        </button>
                      )}
                    />
                  ),
                },
                {
                  label: 'Tier access',
                  value: (
                    <TierPill
                      tier={vm.tier}
                      onChange={(t) =>
                        up((x) => {
                          x.tier = t;
                        })
                      }
                    />
                  ),
                },
                {
                  label: 'Live session',
                  value: vm.session ? (
                    <span>
                      {vm.session.title}
                      <br />
                      <span className={k.me}>{vm.session.when}</span>
                    </span>
                  ) : (
                    <span className={k.mu}>Self-paced</span>
                  ),
                },
                {
                  label: 'Opens',
                  value:
                    week && week.status === 'scheduled' && week.opens ? (
                      mtWhen(week.opens)
                    ) : vm.opens.muted ? (
                      <span className={k.mu}>{vm.opens.text}</span>
                    ) : (
                      vm.opens.text
                    ),
                },
                ...(week ? [{ label: 'Due', value: week.dueAt ? mtWhen(week.dueAt) : <span className={k.mu}>Not set</span> }] : []),
                {
                  label: 'Skill guide',
                  value: vm.linked ? (
                    <span className={clsx(k.row, s.linked)}>
                      <Icon name="r2Check" size={16} strokeWidth={1.75} />
                      Linked
                    </span>
                  ) : (
                    <span className={k.mu}>Not linked</span>
                  ),
                },
              ]}
            />
            <p className={clsx(k.p, k.me)}>
              Preview as Learner opens a read-only copy in a new tab. It is not masquerade and is not audit-logged.
            </p>
          </div>
        </Card>
      </div>

      {details ? (
        <Modal
          title="Edit details"
          width={560}
          onClose={() => setDetails(false)}
          foot={
            <Button kind="primary" onClick={() => setDetails(false)}>
              Done
            </Button>
          }
        >
          <label className={s.lab}>
            Sidebar label
            <input className={k.in} value={d.short} onChange={(e) => setText('short', e.target.value)} />
          </label>
          <label className={s.lab}>
            Outcome headline
            <input className={k.in} value={d.headline} onChange={(e) => setText('headline', e.target.value)} />
          </label>
          <label className={s.lab}>
            For
            <input className={k.in} value={d.forWho} onChange={(e) => setText('forWho', e.target.value)} />
          </label>
          <div className={s.lab} role="group" aria-label="Icon">
            Icon
            <div className={k.row}>
              {MODULE_ICONS.map((ic) => (
                <button
                  key={ic}
                  type="button"
                  className={clsx(s.tile, s.mt, d.icon === ic && s.mtOn)}
                  aria-label={`Icon ${ic}`}
                  aria-pressed={d.icon === ic}
                  onClick={() =>
                    up((x) => {
                      x.icon = ic;
                    })
                  }
                >
                  <Icon name={ic} size={16} strokeWidth={1.75} />
                </button>
              ))}
            </div>
          </div>
          {/* D-218: an AI Employee's hire page reads its outputs and run label; a course week's built hero lists
              its outputs and makes the run label its action (to the week's flagship skill). */}
          {d.outputs.map((o, i) => (
            <label key={i} className={s.lab}>
              {`Output ${i + 1}`}
              <input
                className={k.in}
                placeholder="What it produces"
                value={o}
                onChange={(e) => {
                  const v = e.target.value;
                  up((x) => {
                    x.outputs[i] = v;
                  });
                }}
              />
            </label>
          ))}
          <label className={s.lab}>
            Live session
            <Sel
              className={k.full}
              value={d.session ? String(d.session) : ''}
              onChange={(e) => {
                const v = e.target.value;
                up((x) => {
                  x.session = v ? Number(v) : null;
                });
              }}
            >
              {vm.sessionOptions.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </Sel>
          </label>
          {week ? (
            <>
              {week.status === 'scheduled' ? (
                <DateTime
                  label="Opens"
                  value={week.opens}
                  onChange={(t) =>
                    up((x) => {
                      x.opens = t;
                    })
                  }
                />
              ) : null}
              <DateTime
                label="Due"
                value={week.dueAt}
                onChange={(t) =>
                  up((x) => {
                    if (t === null) delete x.dueAt;
                    else x.dueAt = t;
                  })
                }
              />
              <label className={s.lab}>
                Tone
                <Sel
                  className={k.full}
                  value={week.tone ?? ''}
                  onChange={(e) => {
                    const v = e.target.value;
                    up((x) => {
                      if (v) x.tone = v;
                      else delete x.tone;
                    });
                  }}
                >
                  <option value="">Not set</option>
                  {TONES.map((t) => (
                    <option key={t} value={t}>
                      {TONE_LABELS[t]}
                    </option>
                  ))}
                </Sel>
              </label>
            </>
          ) : null}
          {d.status === 'scheduled' && !week ? (
            <label className={s.lab}>
              Opens (MST)
              <input
                className={k.in}
                type="date"
                value={opensInput(d.opens)}
                onChange={(e) => {
                  const v = opensFrom(e.target.value);
                  up((x) => {
                    x.opens = v;
                  });
                }}
              />
            </label>
          ) : null}
          <label className={s.lab}>
            Platform
            <input className={k.in} value={d.platform} onChange={(e) => setText('platform', e.target.value)} />
          </label>
          <label className={s.lab}>
            Run button label
            <input className={k.in} value={d.runLabel} onChange={(e) => setText('runLabel', e.target.value)} />
          </label>
          <label className={s.lab}>
            Instructor notes
            <TextArea rows={3} value={d.notes} onChange={(e) => setText('notes', e.target.value)} />
          </label>
          <label className={s.lab}>
            System prompt
            <TextArea rows={6} className={k.mo} value={d.prompt} onChange={(e) => setText('prompt', e.target.value)} />
          </label>
          {d.files.length ? (
            <div className={s.lab} role="group" aria-label="Files">
              Files
              {d.files.map((f, i) => (
                <span key={`${i}:${f.name}`} className={clsx(k.row, k.nw)}>
                  <span className={clsx(k.mo, k.el, k.sp)}>{f.name}</span>
                  <Button
                    kind="quiet"
                    aria-label={`Remove ${f.name}`}
                    onClick={() =>
                      up((x) => {
                        x.files.splice(i, 1);
                      })
                    }
                  >
                    Remove
                  </Button>
                </span>
              ))}
            </div>
          ) : null}
        </Modal>
      ) : null}

      {step && stepAt !== null ? (
        <Modal
          title={`Step ${stepAt + 1}`}
          width={880}
          onClose={() => setStepAt(null)}
          foot={
            <Button kind="primary" onClick={() => setStepAt(null)}>
              Done
            </Button>
          }
        >
          <label className={s.lab}>
            Hint
            <input
              className={k.in}
              placeholder="Optional hint"
              value={step.hint}
              onChange={(e) => {
                const v = e.target.value;
                up((x) => {
                  x.checklist[stepAt]!.hint = v;
                });
              }}
            />
          </label>
          <label className={s.lab}>
            Chapter
            <input
              className={k.in}
              value={step.ch}
              onChange={(e) => {
                const v = e.target.value;
                up((x) => {
                  x.checklist[stepAt]!.ch = v;
                });
              }}
            />
          </label>
          <div className={clsx(k.row, k.nw)}>
            <label className={clsx(s.lab, k.sp)}>
              Replay at
              <input
                className={k.in}
                defaultValue={`${Math.floor(step.t / 60)}:${String(step.t % 60).padStart(2, '0')}`}
                onChange={(e) => {
                  const v = parseReplayAt(e.target.value);
                  up((x) => {
                    x.checklist[stepAt]!.t = v;
                  });
                }}
              />
            </label>
            <label className={clsx(s.lab, k.sp)}>
              Minutes
              <input
                className={k.in}
                type="number"
                min={1}
                value={step.mins}
                onChange={(e) => {
                  const v = parseMinutes(e.target.value);
                  up((x) => {
                    x.checklist[stepAt]!.mins = v;
                  });
                }}
              />
            </label>
          </div>
          {week ? (
            <StepWeekFields
              step={step}
              picks={
                week
                  ? {
                      kit: weekKit(db, week).map((item) => ({ id: item.id, title: item.title })),
                      sessions: weekSessions(db, week).map((item) => ({ id: item.id, title: item.title })),
                      glossary: (db.cohorts.find((c) => c.id === ACCELERATOR_COHORT_ID)?.course?.glossary ?? []).map((t) => ({ id: t.id, term: t.term })),
                      videoIds: moduleVideos(d).flatMap((v) => (v.block.id ? [v.block.id] : [])),
                    }
                  : undefined
              }
              onChange={(fn) =>
                up((x) => {
                  fn(x.checklist[stepAt]!);
                })
              }
            />
          ) : null}
        </Modal>
      ) : null}

      {week && previewing ? <CoursePreview db={db} draft={week} phone={phone} onClose={() => setPreviewing(false)} /> : null}

      {/* D-172: Remove step asks first (Connor's request). The step leaves the draft; Save changes persists it. */}
      {removeAt !== null && d.checklist[removeAt] ? (
        <Confirm
          title={`Remove step ${removeAt + 1}?`}
          body={`“${d.checklist[removeAt]!.text}” is removed when you save. Learners’ checks on it are cleared.`}
          cta="Remove step"
          danger
          onConfirm={() => {
            const at = removeAt;
            up((x) => {
              x.checklist = removeStep(x.checklist, at);
            });
          }}
          onClose={() => setRemoveAt(null)}
        />
      ) : null}

      {/* The approved net-new interaction (phase 06 § 6.3, D-015): leaving with unsaved changes asks first. */}
      {blocker.state === 'blocked' ? (
        <Modal
          title="Discard unsaved changes?"
          width={420}
          onClose={() => blocker.reset?.()}
          foot={
            <>
              <Button onClick={() => blocker.reset?.()}>Keep Editing</Button>
              <Button kind="primary" onClick={() => blocker.proceed?.()}>
                Discard
              </Button>
            </>
          }
        >
          {null}
        </Modal>
      ) : null}
    </Page>
  );
}

export default Component;
