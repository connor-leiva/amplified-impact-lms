import { useCallback, useState } from 'react';
import type { Tier } from '@ai/core';
import { Icon } from '../../components/Icon';
import { Drawer } from '../../components/primitives/Drawer';
import { Field, Input, Select } from '../../components/primitives/Field';
import { Switch } from '../../components/primitives/Switch';
import { useDb, useMutate } from '../../data/hooks';
import { blankUploadForm, vaultManagerVM } from './VaultManager.vm';
import type { VaultTabId, VaultUploadForm } from './VaultManager.vm';
import s from './VaultManager.module.css';

// Admin Resource Vault — SCREENS § 4.6, reference `Admin Vault.dc.html`.
// Markup only: every string, count, order and tone comes from `vaultManagerVM`, and every write
// goes through a `@ai/core` mutation. Nothing here reads the clock — this screen shows no relative
// or elapsed time, so the VM takes no `now`.

export function Component() {
  const db = useDb();
  const mutate = useMutate();

  const [tab, setTab] = useState<VaultTabId>('all');
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<VaultUploadForm>(blankUploadForm);
  const [err, setErr] = useState('');
  /** A refused row action (a staff role without `Edit curriculum`). Owner never sees it. */
  const [rowError, setRowError] = useState('');

  const vm = vaultManagerVM(db, { tab, form, err });

  // The reference's `upF`: editing a field clears the validation message. Attaching a file and
  // moving the Access control deliberately do not.
  const setField = useCallback((patch: Partial<VaultUploadForm>) => {
    setForm((f) => ({ ...f, ...patch }));
    setErr('');
  }, []);

  const setTier = useCallback((tier: Tier) => setForm((f) => ({ ...f, tier })), []);

  const openUpload = useCallback(() => {
    setForm(blankUploadForm());
    setErr('');
    setOpen(true);
  }, []);

  // The reference's `close` keeps the draft, so reopening after a Cancel shows it again.
  const close = useCallback(() => setOpen(false), []);

  const onTier = useCallback(
    async (id: string) => {
      // Executive items cannot change tier: the mutation answers with a toast, not a change.
      const out = await mutate('setResourceTier', { id });
      setRowError(out.error ?? '');
    },
    [mutate],
  );

  const onStatus = useCallback(
    async (id: string) => {
      const out = await mutate('setResourceStatus', { id });
      setRowError(out.error ?? '');
    },
    [mutate],
  );

  const onDelete = useCallback(
    async (id: string) => {
      const out = await mutate('deleteResource', { id });
      setRowError(out.error ?? '');
    },
    [mutate],
  );

  // `uploadResource` owns the two validation messages (`Add a title.`, `Attach a file first.`) and
  // the executive-category tier override, so the drawer only renders what it returns.
  const onPublish = useCallback(async () => {
    const out = await mutate('uploadResource', {
      title: form.title,
      desc: form.desc,
      cat: form.cat,
      type: form.type,
      tier: form.tier,
      file: form.file,
    });
    if (out.error) {
      setErr(out.error);
      return;
    }
    setOpen(false);
    setForm(blankUploadForm());
    setErr('');
  }, [form, mutate]);

  return (
    <>
      <div className={s.page}>
        <div className={s.head}>
          <div>
            <h1 className={s.h1}>Resource Vault</h1>
            <p className={s.sub}>{vm.summary}</p>
          </div>
          <button type="button" className={s.upload} onClick={openUpload}>
            <Icon name="upload" size={15} strokeWidth={1.9} />
            Upload Resource
          </button>
        </div>

        <div className={s.tabs}>
          {vm.tabs.map((t) => (
            <button
              key={t.id}
              type="button"
              className={s.tab}
              data-on={t.active ? 'true' : undefined}
              aria-pressed={t.active}
              onClick={() => setTab(t.id)}
            >
              {t.label}
            </button>
          ))}
        </div>

        {rowError ? (
          <div role="alert" className={s.error}>
            {rowError}
          </div>
        ) : null}

        <section className={s.card}>
          <div className={s.scroll}>
            <div className={s.grid}>
              <div className={s.headRow}>
                <span>Resource</span>
                <span>Category</span>
                <span>Type</span>
                <span>Access</span>
                <span>Downloads</span>
                <span>Updated</span>
                <span>Status</span>
                <span />
              </div>
              {vm.rows.map((r) => (
                <div key={r.id} className={s.row} data-hidden={r.published ? undefined : 'true'}>
                  <div className={s.resource}>
                    <div className={s.title}>{r.title}</div>
                    <div className={s.desc}>{r.desc}</div>
                  </div>
                  <span className={s.cat}>{r.cat}</span>
                  <span className={s.type}>{r.type}</span>
                  <button
                    type="button"
                    className={s.access}
                    data-team={r.teamOnly ? 'true' : undefined}
                    title="Change access"
                    onClick={() => void onTier(r.id)}
                  >
                    {r.access}
                  </button>
                  <span className={s.dl}>{r.dl}</span>
                  <span className={s.updated}>{r.updated}</span>
                  <Switch
                    checked={r.published}
                    size="sm"
                    className={r.published ? s.statusOn : s.statusOff}
                    onChange={() => void onStatus(r.id)}
                  >
                    {r.status}
                  </Switch>
                  <div className={s.rowEnd}>
                    <button
                      type="button"
                      className={s.del}
                      title="Delete"
                      aria-label="Delete"
                      onClick={() => void onDelete(r.id)}
                    >
                      <Icon name="trash" size={14} strokeWidth={1.9} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      </div>

      <Drawer
        open={open}
        onClose={close}
        title="Upload Resource"
        description="Appears in the learner vault as soon as you publish"
        width={460}
        variant="surface"
        footer={
          <>
            <button type="button" className={s.cancel} onClick={close}>
              Cancel
            </button>
            <button type="button" className={s.publish} onClick={() => void onPublish()}>
              Publish to Vault
            </button>
          </>
        }
      >
        {/* The reference's drop zone is a button that attaches a named file; there is no real
            file input behind it in the prototype. */}
        <button
          type="button"
          className={s.drop}
          data-ready={vm.drop.ready ? 'true' : undefined}
          onClick={() => setForm((f) => ({ ...f, file: vm.drop.nextFile }))}
        >
          <Icon
            name={vm.drop.icon}
            size={20}
            strokeWidth={1.8}
            color={vm.drop.ready ? 'var(--status-success-text)' : 'var(--text-tertiary)'}
          />
          <span>{vm.drop.label}</span>
          <span className={s.dropSub}>{vm.drop.sub}</span>
        </button>

        <Field label="Title" variant="sunken">
          <Input
            value={vm.form.title}
            onChange={(e) => setField({ title: e.target.value })}
            placeholder="e.g. Listing Appointment Prep Prompt"
          />
        </Field>

        <Field label="Description" variant="sunken">
          <Input
            value={vm.form.desc}
            onChange={(e) => setField({ desc: e.target.value })}
            placeholder="One line learners see under the title"
          />
        </Field>

        <div className={s.twoCol}>
          {/* The option values are the seed's own spellings; the labels are the reference's, which
              prefix the three executive categories with `Exec · ` and Title Case three types. */}
          <Field label="Category" variant="sunken">
            <Select value={vm.form.cat} onChange={(e) => setField({ cat: e.target.value })}>
              <option value="MLS & Fair Housing Compliance">MLS & Fair Housing Compliance</option>
              <option value="Lead Generation Scripts">Lead Generation Scripts</option>
              <option value="Sisu & CRM Webhook Guides">Sisu & CRM Webhook Guides</option>
              <option value="TC Automation Workflows">TC Automation Workflows</option>
              <option value="Organizational SOPs">Exec · Organizational SOPs</option>
              <option value="Leadership Meeting Frameworks">Exec · Leadership Meeting Frameworks</option>
              <option value="Finance Tracker Integrations">Exec · Finance Tracker Integrations</option>
            </Select>
          </Field>
          <Field label="Type" variant="sunken">
            <Select value={vm.form.type} onChange={(e) => setField({ type: e.target.value })}>
              <option value="Claude Project">Claude Project</option>
              <option value="Workflow JSON">Workflow JSON</option>
              <option value="Prompt pack">Prompt Pack</option>
              <option value="PDF guide">PDF Guide</option>
              <option value="Notion template">Notion Template</option>
            </Select>
          </Field>
        </div>

        <div className={s.accessGroup}>
          <span className={s.accessLabel}>Access</span>
          <div className={s.accessTrack} role="group" aria-label="Access">
            <button
              type="button"
              className={s.accessOpt}
              data-kind="agent"
              data-on={vm.form.tierEff === 'agent' ? 'true' : undefined}
              aria-pressed={vm.form.tierEff === 'agent'}
              onClick={() => setTier('agent')}
            >
              Agent + Team
            </button>
            <button
              type="button"
              className={s.accessOpt}
              data-kind="team"
              data-on={vm.form.tierEff === 'team' ? 'true' : undefined}
              aria-pressed={vm.form.tierEff === 'team'}
              onClick={() => setTier('team')}
            >
              Team Only
            </button>
          </div>
          {vm.form.exec ? (
            <span className={s.execNote}>Executive categories are always Team only.</span>
          ) : null}
        </div>

        {vm.form.err ? (
          <div role="alert" className={s.error}>
            {vm.form.err}
          </div>
        ) : null}
      </Drawer>
    </>
  );
}

export default Component;
