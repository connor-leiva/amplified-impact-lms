import { useCallback, useState } from 'react';
import clsx from 'clsx';
import type { Tier } from '@ai/core';
import { Icon } from '../../components/Icon';
import { Button } from '../../components/r2/Button';
import type { MenuEntry } from '../../components/r2/Menu';
import { Confirm, Modal } from '../../components/r2/Modal';
import { Page } from '../../components/r2/Page';
import { Table } from '../../components/r2/Table';
import type { Column } from '../../components/r2/Table';
import { Find, PageHead, Pill, Sel, k } from '../../components/r2/kit';
import { useToaster } from '../../components/primitives/Toaster';
import { saveStoredFile } from '../../data/files';
import { useAct, useDb, useMutate } from '../../data/hooks';
import {
  attachOptions,
  blankUploadForm,
  forcesTeam,
  vaultEditArgs,
  vaultEditForm,
  vaultFileOf,
  vaultManagerVM,
  vaultR2VM,
} from './VaultManager.vm';
import type { VaultEditForm, VaultR2Row, VaultUploadForm } from './VaultManager.vm';
import s from './VaultManager.module.css';

// Admin Resource Vault `/admin/vault` on the Admin redesign R2 (D-160 R2-2b): the signed-off mockup's
// `Vault` (AdminRedesign.jsx), drawn from `vaultR2VM`. Every write is the same @ai/core mutation as
// before; only the presentation changed.
//
//   - Add resource: the upload form (`uploadResource`), now an R2 dialog, its words the old drawer's.
//   - A row's "…": tier access (`setResourceTier`), hide or publish (`setResourceStatus`), and Remove
//     from vault after the mockup's confirm (`deleteResource`).
//   - The filter and the Type select narrow the rows. The old Library / Executive Vault tabs are not
//     drawn; an executive item's category still forces Team only (Needs Connor's call, D-160 R2-2b).
//   - D-172: the row's hover Download (the mockup's quick action; on a phone, the "…"): the stored file
//     through `/api/files/resource/:id` (staff with `curriculum`, uncounted), the reference's stand-in
//     Blob in the fixture build. "…" › Edit details: title, description, category, tier access and
//     Attached to (`editResource`, audited `vault.edit`). "…" › Replace file is drawn and disabled:
//     the app has no real upload path yet (D-022), so a replacement would record bytes that never moved.

const CATEGORIES: readonly [string, string][] = [
  ['MLS & Fair Housing Compliance', 'MLS & Fair Housing Compliance'],
  ['Lead Generation Scripts', 'Lead Generation Scripts'],
  ['Sisu & CRM Webhook Guides', 'Sisu & CRM Webhook Guides'],
  ['TC Automation Workflows', 'TC Automation Workflows'],
  ['Organizational SOPs', 'Exec · Organizational SOPs'],
  ['Leadership Meeting Frameworks', 'Exec · Leadership Meeting Frameworks'],
  ['Finance Tracker Integrations', 'Exec · Finance Tracker Integrations'],
];
const TYPES: readonly [string, string][] = [
  ['Claude Project', 'Claude Project'],
  ['Workflow JSON', 'Workflow JSON'],
  ['Prompt pack', 'Prompt Pack'],
  ['PDF guide', 'PDF Guide'],
  ['Notion template', 'Notion Template'],
];

export function Component() {
  const db = useDb();
  const mutate = useMutate();
  const act = useAct();
  const { toast } = useToaster();
  const vm = vaultR2VM(db);
  const [edit, setEdit] = useState<{ form: VaultEditForm; err: string } | null>(null);

  const [q, setQ] = useState('');
  const [type, setType] = useState('All types');
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<VaultUploadForm>(blankUploadForm);
  const [err, setErr] = useState('');
  const [remove, setRemove] = useState<VaultR2Row | null>(null);
  const up = vaultManagerVM(db, { tab: 'all', form, err });

  const setField = useCallback((patch: Partial<VaultUploadForm>) => {
    setForm((f) => ({ ...f, ...patch }));
    setErr('');
  }, []);

  const run = useCallback(
    async (name: 'setResourceTier' | 'setResourceStatus' | 'deleteResource', id: string) => {
      await mutate(name, { id });
    },
    [mutate],
  );

  const publish = useCallback(async () => {
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

  /** The hover Download: the stored file in http mode, the stand-in Blob in the fixture build. */
  const download = useCallback(
    (id: string) => {
      const r = db.resources.find((x) => x.id === id);
      if (!r) return;
      if (!saveStoredFile({ kind: 'resource', id })) {
        const f = vaultFileOf(r);
        try {
          const url = URL.createObjectURL(new Blob([f.body], { type: f.mime }));
          const a = document.createElement('a');
          a.href = url;
          a.download = f.name;
          document.body.appendChild(a);
          a.click();
          a.remove();
          setTimeout(() => URL.revokeObjectURL(url), 1500);
        } catch {
          /* a runtime that refuses the object URL still gets the toast */
        }
      }
      toast('Download started');
    },
    [db.resources, toast],
  );

  const openEdit = (id: string) => {
    const r = db.resources.find((x) => x.id === id);
    if (r) setEdit({ form: vaultEditForm(r), err: '' });
  };
  const setEditField = (patch: Partial<VaultEditForm>) => setEdit((e) => (e ? { form: { ...e.form, ...patch }, err: '' } : e));
  const saveEdit = async () => {
    if (!edit) return;
    const out = await act('editResource', vaultEditArgs(edit.form));
    if (out.error) setEdit((e) => (e ? { ...e, err: out.error! } : e));
    else setEdit(null);
  };

  const filtered = q !== '' || type !== 'All types';
  const rows = vm.rows.filter(
    (r) => r.title.toLowerCase().includes(q.toLowerCase()) && (type === 'All types' || r.type === type),
  );

  const cols: Column<VaultR2Row>[] = [
    {
      key: 'title',
      label: 'Resource',
      width: 'minmax(200px,1.6fr)',
      value: (r) => r.title,
      cell: (r) => (
        <div className={clsx(k.row, k.nw, s.lead)}>
          <Icon name={r.video ? 'r2Play' : 'r2File'} size={16} strokeWidth={1.75} />
          <span className={clsx(k.w5, k.el)}>{r.title}</span>
          {r.hidden ? <Pill>Hidden</Pill> : null}
        </div>
      ),
    },
    { key: 'type', label: 'Type', width: '72px', value: (r) => r.type },
    { key: 'attached', label: 'Attached to', width: 'minmax(140px,1fr)', hideLap: true, value: (r) => r.attached },
    {
      key: 'tier',
      label: 'Tier access',
      width: '120px',
      value: (r) => r.tierLabel,
      cell: (r) => <Pill tone={r.tier === 'team' ? 'warn' : 'ok'}>{r.tierLabel}</Pill>,
    },
    { key: 'size', label: 'Size', width: '72px', num: true, noSort: true, value: (r) => r.size },
    { key: 'opens', label: 'Opens', width: '64px', num: true, value: (r) => r.opens },
    { key: 'updated', label: 'Updated', width: '72px', noSort: true, value: (r) => r.updated },
  ];

  const menu = (r: VaultR2Row): MenuEntry[] => [
    { label: 'Edit details', onSelect: () => openEdit(r.id) },
    { label: 'Replace file', disabled: true, title: 'Not available yet', onSelect: () => {} },
    {
      label: r.tier === 'team' ? 'Give Agent + Team access' : 'Make Team only',
      onSelect: () => void run('setResourceTier', r.id),
    },
    {
      label: r.hidden ? 'Show to learners' : 'Hide from learners',
      onSelect: () => void run('setResourceStatus', r.id),
    },
    'separator',
    { label: 'Remove from vault', danger: true, onSelect: () => setRemove(r) },
  ];

  const tierEff: Tier = up.form.tierEff;

  return (
    <Page>
      <PageHead
        title="Resource Vault"
        description="Files, replays, prompts, and checklists learners can open from the portal."
        right={
          <Button
            header
            kind="primary"
            icon="r2Plus"
            onClick={() => {
              setForm(blankUploadForm());
              setErr('');
              setOpen(true);
            }}
          >
            Add resource
          </Button>
        }
      />
      <div className={k.row}>
        <Find value={q} onChange={setQ} placeholder="Filter resources" />
        <Sel aria-label="Type" value={type} onChange={(e) => setType(e.target.value)}>
          {vm.types.map((o) => (
            <option key={o}>{o}</option>
          ))}
        </Sel>
      </div>
      <Table
        label="Resources"
        cols={cols}
        rows={rows}
        rowKey={(r) => r.id}
        filtered={filtered}
        quick={(r) => [{ label: 'Download', icon: 'r2Download', onClick: () => download(r.id) }]}
        menu={menu}
        empty={{
          icon: 'r2Vault',
          title: 'The vault is empty',
          body: 'Add a file or a replay and attach it to an AI Employee.',
        }}
      />

      {open ? (
        <Modal
          title="Add resource"
          onClose={() => setOpen(false)}
          foot={
            <>
              <Button onClick={() => setOpen(false)}>Cancel</Button>
              <Button kind="primary" onClick={() => void publish()}>
                Publish to Vault
              </Button>
            </>
          }
        >
          <button
            type="button"
            className={s.drop}
            data-ready={up.drop.ready ? 'true' : undefined}
            onClick={() => setForm((f) => ({ ...f, file: up.drop.nextFile }))}
          >
            <Icon name={up.drop.ready ? 'r2Check' : 'r2Download'} size={18} strokeWidth={1.75} />
            <span className={k.w5}>{up.drop.label}</span>
            <span className={k.me}>{up.drop.sub}</span>
          </button>
          <label className={s.lab}>
            Title
            <input
              className={k.in}
              value={up.form.title}
              placeholder="e.g. Listing Appointment Prep Prompt"
              onChange={(e) => setField({ title: e.target.value })}
            />
          </label>
          <label className={s.lab}>
            Description
            <input
              className={k.in}
              value={up.form.desc}
              placeholder="One line learners see under the title"
              onChange={(e) => setField({ desc: e.target.value })}
            />
          </label>
          <div className={clsx(k.row, s.pair)}>
            <label className={s.lab}>
              Category
              <Sel className={k.full} value={up.form.cat} onChange={(e) => setField({ cat: e.target.value })}>
                {CATEGORIES.map(([v, l]) => (
                  <option key={v} value={v}>
                    {l}
                  </option>
                ))}
              </Sel>
            </label>
            <label className={s.lab}>
              Type
              <Sel className={k.full} value={up.form.type} onChange={(e) => setField({ type: e.target.value })}>
                {TYPES.map(([v, l]) => (
                  <option key={v} value={v}>
                    {l}
                  </option>
                ))}
              </Sel>
            </label>
          </div>
          <label className={s.lab}>
            Access
            <Sel
              className={k.full}
              value={tierEff}
              disabled={up.form.exec}
              onChange={(e) => setForm((f) => ({ ...f, tier: e.target.value as Tier }))}
            >
              <option value="agent">Agent + Team</option>
              <option value="team">Team Only</option>
            </Sel>
          </label>
          {up.form.exec ? <p className={clsx(k.p, k.me)}>Executive categories are always Team only.</p> : null}
          {up.form.err ? (
            <p role="alert" className={clsx(k.p, s.err)}>
              {up.form.err}
            </p>
          ) : null}
        </Modal>
      ) : null}

      {edit ? (
        <Modal
          title="Edit details"
          onClose={() => setEdit(null)}
          foot={
            <>
              <Button onClick={() => setEdit(null)}>Cancel</Button>
              <Button kind="primary" disabled={!edit.form.title.trim()} onClick={() => void saveEdit()}>
                Save changes
              </Button>
            </>
          }
        >
          <label className={s.lab}>
            Title
            <input className={k.in} value={edit.form.title} onChange={(e) => setEditField({ title: e.target.value })} />
          </label>
          <label className={s.lab}>
            Description
            <input className={k.in} value={edit.form.desc} onChange={(e) => setEditField({ desc: e.target.value })} />
          </label>
          <div className={clsx(k.row, s.pair)}>
            <label className={s.lab}>
              Category
              <Sel className={k.full} value={edit.form.cat} onChange={(e) => setEditField({ cat: e.target.value })}>
                {CATEGORIES.map(([v, l]) => (
                  <option key={v} value={v}>
                    {l}
                  </option>
                ))}
              </Sel>
            </label>
            <label className={s.lab}>
              Access
              <Sel
                className={k.full}
                value={forcesTeam(edit.form.cat) ? 'team' : edit.form.tier}
                disabled={forcesTeam(edit.form.cat)}
                onChange={(e) => setEditField({ tier: e.target.value as Tier })}
              >
                <option value="agent">Agent + Team</option>
                <option value="team">Team Only</option>
              </Sel>
            </label>
          </div>
          {forcesTeam(edit.form.cat) ? <p className={clsx(k.p, k.me)}>Executive categories are always Team only.</p> : null}
          <label className={s.lab}>
            Attached to
            <Sel className={k.full} value={edit.form.module} onChange={(e) => setEditField({ module: e.target.value })}>
              {attachOptions(db).map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </Sel>
          </label>
          {edit.err ? (
            <p role="alert" className={clsx(k.p, s.err)}>
              {edit.err}
            </p>
          ) : null}
        </Modal>
      ) : null}

      {remove ? (
        <Confirm
          title={`Remove "${remove.title}"?`}
          body="Learners lose access right away."
          cta="Remove resource"
          danger
          onConfirm={() => void run('deleteResource', remove.id)}
          onClose={() => setRemove(null)}
        />
      ) : null}
    </Page>
  );
}

export default Component;
