import { useCallback, useState } from 'react';
import clsx from 'clsx';
import { Button } from '../../components/r2/Button';
import { Modal } from '../../components/r2/Modal';
import { Page } from '../../components/r2/Page';
import { Status } from '../../components/r2/Status';
import { Table } from '../../components/r2/Table';
import type { Column } from '../../components/r2/Table';
import { PageHead, Sel, TextArea, k } from '../../components/r2/kit';
import { useDb, useMutate } from '../../data/hooks';
import {
  R2_AUDIENCES,
  R2_CHANNELS,
  announceR2Rows,
  atForSend,
  blankAnnouncementForm,
  channelsFrom,
  channelsOf,
  defaultScheduleMst,
} from './Announcements.vm';
import type { AnnounceR2Row, AnnouncementForm } from './Announcements.vm';
import s from './Announcements.module.css';

// Admin Announcements `/admin/announcements` on the Admin redesign R2 (D-160 R2-2b): the signed-off
// mockup's `Announce` (AdminRedesign.jsx), drawn from `announceR2Rows`, send times in MST.
//
// New announcement opens the mockup's dialog (Title, Message, Audience, Channels) with the composer's
// other settings after them (severity, the banner's action button, send now or schedule, the schedule
// typed in MST), and sends through `sendAnnouncement`, as before; its refusals show in the dialog.
// The app has no announcement draft, edit or duplicate, so the dialog sends rather than saving a
// draft, and each row's "…" is drawn and does nothing (`aria-disabled`). The automatic reminder
// switches and the old history's open rates are not drawn. Needs Connor's call (D-160 R2-2b).

const SEVERITIES = [
  ['info', 'Info'],
  ['warning', 'Warning'],
] as const;
const ACTIONS = [
  ['', 'None'],
  ['calendar', 'Update Calendar'],
  ['sessions', 'Open Sessions'],
] as const;

const fresh = (): AnnouncementForm => {
  const f = blankAnnouncementForm();
  return { ...f, at: defaultScheduleMst(f.at) };
};

export function Component() {
  const db = useDb();
  const mutate = useMutate();
  const rows = announceR2Rows(db);

  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<AnnouncementForm>(fresh);
  const [err, setErr] = useState('');

  const set = useCallback((patch: Partial<AnnouncementForm>) => {
    setForm((f) => ({ ...f, ...patch }));
    setErr('');
  }, []);

  const send = useCallback(async () => {
    const out = await mutate('sendAnnouncement', {
      title: form.title,
      body: form.body,
      audience: form.audience,
      inapp: form.inapp,
      email: form.email,
      when: form.when,
      at: atForSend(form.at),
      severity: form.severity,
      action: form.action,
    });
    if (out.error) {
      setErr(out.error);
      return;
    }
    setOpen(false);
    setForm(fresh());
  }, [form, mutate]);

  const cols: Column<AnnounceR2Row>[] = [
    {
      key: 'title',
      label: 'Announcement',
      width: 'minmax(220px,2fr)',
      value: (r) => r.title,
      cell: (r) => <span className={clsx(k.w5, k.el, s.block)}>{r.title}</span>,
    },
    { key: 'audience', label: 'Audience', width: '104px', value: (r) => r.audience },
    { key: 'channels', label: 'Channels', width: '120px', hideLap: true, value: (r) => r.channels },
    {
      key: 'status',
      label: 'Status',
      width: '112px',
      value: (r) => r.status.label,
      cell: (r) => <Status tone={r.status.tone}>{r.status.label}</Status>,
    },
    { key: 'at', label: 'Send time', width: '136px', noSort: true, value: (r) => r.sendTime },
  ];

  return (
    <Page>
      <PageHead
        title="Announcements"
        description="Messages to learners in the portal and by email."
        right={
          <Button
            header
            kind="primary"
            icon="r2Plus"
            onClick={() => {
              setErr('');
              setOpen(true);
            }}
          >
            New announcement
          </Button>
        }
      />
      <Table
        label="Announcements"
        cols={cols}
        rows={rows}
        rowKey={(r) => r.id}
        menu={() => []}
        empty={{
          icon: 'r2Announce',
          title: 'No announcements yet',
          body: 'Write the first one to tell learners what is new.',
        }}
      />

      {open ? (
        <Modal
          title="New announcement"
          onClose={() => setOpen(false)}
          foot={
            <>
              <Button onClick={() => setOpen(false)}>Cancel</Button>
              <Button kind="primary" disabled={!form.title.trim()} onClick={() => void send()}>
                {form.when === 'later' ? 'Schedule' : 'Send now'}
              </Button>
            </>
          }
        >
          <label className={s.lab}>
            Title
            <input className={k.in} autoFocus value={form.title} onChange={(e) => set({ title: e.target.value })} />
          </label>
          <label className={s.lab}>
            Message
            <TextArea rows={4} value={form.body} onChange={(e) => set({ body: e.target.value })} />
          </label>
          <div className={clsx(k.row, s.pair)}>
            <label className={s.lab}>
              Audience
              <Sel
                className={k.full}
                value={form.audience}
                onChange={(e) => set({ audience: e.target.value as AnnouncementForm['audience'] })}
              >
                {R2_AUDIENCES.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </Sel>
            </label>
            <label className={s.lab}>
              Channels
              <Sel
                className={k.full}
                value={channelsOf(form)}
                onChange={(e) => set(channelsFrom(e.target.value as 'inapp' | 'both' | 'email'))}
              >
                {R2_CHANNELS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </Sel>
            </label>
          </div>
          <div className={clsx(k.row, s.pair)}>
            <label className={s.lab}>
              Severity
              <Sel
                className={k.full}
                value={form.severity}
                onChange={(e) => set({ severity: e.target.value as AnnouncementForm['severity'] })}
              >
                {SEVERITIES.map(([v, l]) => (
                  <option key={v} value={v}>
                    {l}
                  </option>
                ))}
              </Sel>
            </label>
            <label className={s.lab}>
              Action button
              <Sel
                className={k.full}
                value={form.action}
                onChange={(e) => set({ action: e.target.value as AnnouncementForm['action'] })}
              >
                {ACTIONS.map(([v, l]) => (
                  <option key={v} value={v}>
                    {l}
                  </option>
                ))}
              </Sel>
            </label>
          </div>
          <div className={clsx(k.row, s.pair)}>
            <label className={s.lab}>
              When
              <Sel
                className={k.full}
                value={form.when}
                onChange={(e) => set({ when: e.target.value as AnnouncementForm['when'] })}
              >
                <option value="now">Send now</option>
                <option value="later">Schedule</option>
              </Sel>
            </label>
            {form.when === 'later' ? (
              <label className={s.lab}>
                Send at (MST)
                <input
                  className={k.in}
                  type="datetime-local"
                  value={form.at}
                  onChange={(e) => set({ at: e.target.value })}
                />
              </label>
            ) : null}
          </div>
          {err ? (
            <p role="alert" className={clsx(k.p, s.err)}>
              {err}
            </p>
          ) : null}
        </Modal>
      ) : null}
    </Page>
  );
}

export default Component;
