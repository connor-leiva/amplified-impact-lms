import { useCallback, useState } from 'react';
import { useSearchParams } from 'react-router';
import { Icon } from '../../components/Icon';
import { Input, Select } from '../../components/primitives/Field';
import { saveStoredFile } from '../../data/files';
import { useDb, useMutate, useNow, useViewer } from '../../data/hooks';
import { vaultVM } from './Vault.vm';
import type { VaultRow, VaultTabId } from './Vault.vm';
import s from './Vault.module.css';

// Resource & Compliance Vault — SCREENS § 3.5, reference `Portal Vault.dc.html`.
// Markup only: every string, count, order and tone comes from `vaultVM`.
//
// Phase 08 § 8.2: a vault row IS an object in the bucket, so in http mode the Download button goes
// to `GET /api/files/resource/:id` instead of serialising `r.file`, whose body is only the
// prototype's generated stand-in. Fixture mode keeps the Blob, unchanged.

/** The reference's `act.download`: a Blob, a synthetic anchor click, then a delayed revoke. */
function saveFile(name: string, body: string, mime: string): void {
  try {
    const url = URL.createObjectURL(new Blob([body], { type: mime }));
    const a = document.createElement('a');
    a.href = url;
    a.download = name;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1500);
  } catch {
    // A browser that refuses the object URL still gets the mutation's toast.
  }
}

export function Component() {
  const db = useDb();
  const viewer = useViewer();
  const now = useNow();
  const mutate = useMutate();
  const [params, setParams] = useSearchParams();
  const [q, setQ] = useState('');
  const [cat, setCat] = useState('');
  const [type, setType] = useState('');
  const [error, setError] = useState('');

  // The executive tab is the one piece of screen state that lives in the URL (SCREENS § 3.5).
  const tab: VaultTabId = params.get('tab') === 'executive' ? 'exec' : 'library';

  const onTab = useCallback(
    (id: string) => {
      setCat(''); // the reference clears the category when the tab changes
      setParams(
        (prev) => {
          const next = new URLSearchParams(prev);
          if (id === 'exec') next.set('tab', 'executive');
          else next.delete('tab');
          return next;
        },
        { replace: true },
      );
    },
    [setParams],
  );

  const onRow = useCallback(
    async (r: VaultRow) => {
      setError('');
      if (r.locked) {
        const out = await mutate('requestUpgrade', { source: `Resource Vault · ${r.title}` });
        if (out.error) setError(out.error);
        return;
      }
      // The mutation is what raises the toast, counts the download and refuses a Team-tier
      // resource inline, so it runs on both paths; only where the bytes come from changes.
      const out = await mutate('downloadResource', { id: r.id });
      if (out.error) {
        setError(out.error);
        return;
      }
      if (r.notion) return; // a Notion template opens in Notion; there is no file either way
      if (!saveStoredFile({ kind: 'resource', id: r.id })) saveFile(r.file.name, r.file.body, r.file.mime);
    },
    [mutate],
  );

  const onRequest = useCallback(async () => {
    setError('');
    const out = await mutate('requestUpgrade', { source: 'Executive Build Vault' });
    if (out.error) setError(out.error);
  }, [mutate]);

  const actor = viewer.actor;
  const user = actor.kind === 'learner' ? db.users.find((u) => u.id === actor.userId) : undefined;
  if (!user) return null;

  const vm = vaultVM(db, user, now, { tab, q, cat, type });

  return (
    <div className={s.page}>
      <div className={s.header}>
        <div>
          <h1 className={s.h1}>Resource & Compliance Vault</h1>
          <p className={s.sub}>
            Templates, workflows and compliance guides for real estate AI. One click to download.
          </p>
        </div>
        <div className={s.searchWrap}>
          <Icon name="search" size={16} strokeWidth={1.9} className={s.searchIcon} />
          <Input
            className={s.search}
            value={vm.q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search templates, scripts, workflows"
            aria-label="Search templates, scripts, workflows"
          />
        </div>
      </div>

      {/*
        Plain buttons, not the Tabs primitive. The reference renders a styled button row with no
        tab/tablist roles — these switch a URL query (?tab=executive), so they behave more like
        navigation than a tabpanel, and the compliance scenario selects them by role="button".
      */}
      <div className={s.tabRow}>
        {vm.tabs.map((t) => (
          <button
            key={t.id}
            type="button"
            className={s.tab}
            data-active={t.id === vm.tab ? 'true' : undefined}
            onClick={() => onTab(t.id)}
          >
            {t.locked ? <Icon name="lock" size={13} strokeWidth={2} className={s.tabLock} /> : null}
            {t.label}
            <span className={s.tabCount}>{t.count}</span>
          </button>
        ))}
      </div>

      {error ? (
        <div role="alert" className={s.error}>
          {error}
        </div>
      ) : null}

      {vm.showList ? (
        <>
          <div className={s.filters}>
            {vm.chips.map((c) => (
              <button
                key={c.key || 'all'}
                type="button"
                className={s.chip}
                data-active={c.active ? 'true' : undefined}
                aria-pressed={c.active}
                onClick={() => setCat(c.key)}
              >
                {c.label}
                <span className={s.chipCount}>{c.count}</span>
              </button>
            ))}
            {/* The option labels are Title Case while the values are the seed's own spellings. */}
            <Select
              className={s.typeSelect}
              value={vm.type}
              onChange={(e) => setType(e.target.value)}
              aria-label="File Type"
            >
              <option value="">All File Types</option>
              <option value="Claude Project">Claude Project</option>
              <option value="Workflow JSON">Workflow JSON</option>
              <option value="Prompt pack">Prompt Pack</option>
              <option value="PDF guide">PDF Guide</option>
              <option value="Notion template">Notion Template</option>
            </Select>
          </div>

          <section className={s.list}>
            {vm.empty ? (
              <div className={s.empty}>No resources match. Try a different search or category.</div>
            ) : null}
            {vm.rows.map((r) => (
              <div key={r.id} className={s.row}>
                <div className={s.tile} data-tone={r.locked ? 'locked' : undefined}>
                  <Icon name={r.icon} size={17} strokeWidth={1.8} />
                </div>
                <div className={s.main}>
                  <div className={s.titleRow}>
                    <span className={s.title}>{r.title}</span>
                    {r.isNew ? <span className={s.newChip}>New</span> : null}
                    {r.teamOnly ? <span className={s.tierChip}>Team Tier</span> : null}
                  </div>
                  <div className={s.desc}>{r.desc}</div>
                </div>
                <div className={s.cat}>{r.cat}</div>
                <div className={s.meta}>
                  {r.type}
                  <br />
                  {r.meta}
                </div>
                <button
                  type="button"
                  className={s.action}
                  data-tone={r.locked ? 'locked' : undefined}
                  onClick={() => void onRow(r)}
                >
                  <Icon name={r.actionIcon} size={14} strokeWidth={1.9} />
                  {r.actionLabel}
                </button>
              </div>
            ))}
          </section>
        </>
      ) : null}

      {vm.execLocked ? (
        <section className={s.upsell}>
          <div className={s.upsellCopy}>
            <div className={s.kicker}>
              <Icon name="lock" size={13} strokeWidth={2} />
              Team Tier
            </div>
            <div className={s.upsellTitle}>Executive Build Vault</div>
            <div className={s.upsellBody}>
              Organizational SOPs, leadership meeting frameworks and finance tracker integrations
              for team owners and operations leads.
            </div>
            <button
              type="button"
              className={s.cta}
              data-requested={vm.upsell.requested ? 'true' : undefined}
              onClick={() => void onRequest()}
            >
              <Icon name={vm.upsell.icon} size={15} strokeWidth={1.9} />
              {vm.upsell.label}
            </button>
          </div>
          <div className={s.preview}>
            {vm.execPreview.map((x) => (
              <div key={x.title} className={s.previewRow}>
                <Icon name="lock" size={15} strokeWidth={1.8} className={s.previewLock} />
                <div className={s.previewText}>
                  <div className={s.previewTitle}>{x.title}</div>
                  <div className={s.previewSub}>{x.sub}</div>
                </div>
              </div>
            ))}
          </div>
        </section>
      ) : null}
    </div>
  );
}

export default Component;
