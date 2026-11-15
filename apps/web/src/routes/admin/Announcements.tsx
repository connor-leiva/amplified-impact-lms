import { useCallback, useState } from 'react';
import { AnnouncementBanner } from '../../components/AnnouncementBanner';
import { Icon } from '../../components/Icon';
import { Field, Input, Textarea } from '../../components/primitives/Field';
import { Switch } from '../../components/primitives/Switch';
import { useDb, useMutate } from '../../data/hooks';
import { announcementsVM, blankAnnouncementForm } from './Announcements.vm';
import type { AnnouncementForm } from './Announcements.vm';
import s from './Announcements.module.css';

// Admin Announcements `/admin/announcements`. Ported from design-reference/Admin Announcements.dc.html.
// Contract: SCREENS § 4.7, phase 06 § 6.1.
//
// MARKUP ONLY. Every string, count, label and tone comes from `announcementsVM`; the two validation
// messages and the toast come from the `sendAnnouncement` mutation, which owns them. Nothing here
// reads the clock: every stamp this screen shows is absolute and the preview's is the literal
// `Just now`, so the VM takes no `now`.
//
// The segmented tracks are hand-rolled rather than built on the `Segmented` primitive because the
// reference draws these options at 13/400 while the primitive is 13/500, and the fingerprint
// compares weight. They keep the primitive's semantics — `aria-pressed` on a button inside a named
// group — so the two read the same to assistive tech.

export function Component() {
  const db = useDb();
  const mutate = useMutate();

  const [form, setForm] = useState<AnnouncementForm>(blankAnnouncementForm);
  /** The inline refusal under the composer. `sendAnnouncement` is the only author of its text. */
  const [err, setErr] = useState('');

  const vm = announcementsVM(db, { form, err });

  // The reference's `up`: editing any control clears the validation message.
  const set = useCallback((patch: Partial<AnnouncementForm>) => {
    setForm((f) => ({ ...f, ...patch }));
    setErr('');
  }, []);

  const onSend = useCallback(async () => {
    const out = await mutate('sendAnnouncement', {
      title: form.title,
      body: form.body,
      audience: form.audience,
      inapp: form.inapp,
      email: form.email,
      when: form.when,
      at: form.at,
      severity: form.severity,
      action: form.action,
    });
    if (out.error) {
      setErr(out.error);
      return;
    }
    // The reference keeps the audience, channels, severity, action and schedule; only the two
    // text fields are cleared, so a follow-up announcement starts from the same settings.
    setForm((f) => ({ ...f, title: '', body: '' }));
    setErr('');
  }, [form, mutate]);

  const onReminder = useCallback(
    async (id: string) => {
      const out = await mutate('toggleReminder', { id });
      // Owner always passes `announce`; a staff role that does not is refused, and the refusal
      // lands in the composer's existing message slot rather than in a second one.
      if (out.error) setErr(out.error);
    },
    [mutate],
  );

  return (
    <div className={s.page}>
      <div>
        <h1 className={s.h1}>Announcements</h1>
        <p className={s.sub}>
          In-app banners and email for the December 2026 Cohort, plus automated reminders.
        </p>
      </div>

      <div className={s.cols}>
        <section className={s.composer}>
          <div className={s.cardTitle}>New Announcement</div>

          <Field label="Title" variant="sunken">
            <Input
              value={vm.form.title}
              onChange={(e) => set({ title: e.target.value })}
              placeholder="e.g. Office hours moved to 2:00 PM"
            />
          </Field>

          <Field label="Message" variant="sunken">
            <Textarea
              value={vm.form.body}
              onChange={(e) => set({ body: e.target.value })}
              placeholder="Keep it to two sentences for the banner."
            />
          </Field>

          <div className={s.controls}>
            <div className={s.group}>
              <span className={s.groupLabel}>Audience</span>
              <div className={s.track} data-kind="plain" role="group" aria-label="Audience" data-phone="wrap">
                {vm.audience.map((o) => (
                  <button
                    key={o.value}
                    type="button"
                    className={s.opt}
                    data-on={o.on ? 'true' : undefined}
                    aria-pressed={o.on}
                    onClick={() => set({ audience: o.value })}
                  >
                    {o.label}
                  </button>
                ))}
              </div>
              <span className={s.reach}>{vm.reach}</span>
            </div>

            <div className={s.group}>
              <span className={s.groupLabel}>Channels</span>
              <div className={s.channels} role="group" aria-label="Channels">
                {vm.channels.map((c) => (
                  <button
                    key={c.value}
                    type="button"
                    className={s.channel}
                    data-on={c.on ? 'true' : undefined}
                    aria-pressed={c.on}
                    onClick={() => set(c.value === 'inapp' ? { inapp: !c.on } : { email: !c.on })}
                  >
                    <span className={s.box}>
                      {c.on ? (
                        <Icon name="check" size={11} strokeWidth={3} color="var(--action-on-primary)" />
                      ) : null}
                    </span>
                    {c.label}
                  </button>
                ))}
              </div>
            </div>

            <div className={s.group}>
              <span className={s.groupLabel}>Severity</span>
              <div className={s.track} data-kind="seg" role="group" aria-label="Severity" data-phone="wrap">
                {vm.severities.map((o) => (
                  <button
                    key={o.value}
                    type="button"
                    className={s.opt}
                    data-on={o.on ? 'true' : undefined}
                    aria-pressed={o.on}
                    onClick={() => set({ severity: o.value })}
                  >
                    {o.label}
                  </button>
                ))}
              </div>
            </div>

            <div className={s.group}>
              <span className={s.groupLabel}>Action Button</span>
              <div className={s.track} data-kind="seg" role="group" aria-label="Action Button" data-phone="wrap">
                {vm.actions.map((o) => (
                  <button
                    key={o.value || 'none'}
                    type="button"
                    className={s.opt}
                    data-on={o.on ? 'true' : undefined}
                    aria-pressed={o.on}
                    onClick={() => set({ action: o.value })}
                  >
                    {o.label}
                  </button>
                ))}
              </div>
            </div>

            <div className={s.group}>
              <span className={s.groupLabel}>When</span>
              <div className={s.when} data-phone="wrap">
                <div className={s.track} data-kind="plain" role="group" aria-label="When" data-phone="wrap">
                  {vm.whens.map((o) => (
                    <button
                      key={o.value}
                      type="button"
                      className={s.opt}
                      data-on={o.on ? 'true' : undefined}
                      aria-pressed={o.on}
                      onClick={() => set({ when: o.value })}
                    >
                      {o.label}
                    </button>
                  ))}
                </div>
                {/* The reference leaves this input unlabelled; it needs an accessible name, so it
                    borrows the control's own word rather than introducing new visible copy. */}
                {vm.scheduling ? (
                  <Input
                    type="datetime-local"
                    variant="sunken"
                    className={s.at}
                    aria-label="Schedule"
                    value={vm.form.at}
                    onChange={(e) => set({ at: e.target.value })}
                  />
                ) : null}
              </div>
            </div>
          </div>

          <div className={s.group}>
            <span className={s.previewLabel}>Banner Preview</span>
            {/* The real component, from the form. No dismiss: there is nothing to record here. */}
            <div className={s.preview} data-dim={vm.preview.dim ? 'true' : undefined}>
              <AnnouncementBanner
                severity={vm.preview.severity}
                title={vm.preview.title}
                body={vm.preview.body}
                when={vm.preview.when}
                actionLabel={vm.preview.actionLabel}
              />
            </div>
          </div>

          {vm.err ? (
            <div role="alert" className={s.error}>
              {vm.err}
            </div>
          ) : null}

          <div className={s.actions}>
            <button type="button" className={s.send} onClick={() => void onSend()}>
              <Icon name="send" size={14} strokeWidth={1.9} />
              {vm.sendLabel}
            </button>
          </div>
        </section>

        <section className={s.reminders}>
          <div className={s.remindersTitle}>Automated Reminders</div>
          <div className={s.remindersSub}>Sent for every cohort on its own schedule</div>
          {vm.reminders.map((r) => (
            <Switch
              key={r.id}
              checked={r.on}
              size="md"
              className={s.row}
              onChange={() => void onReminder(r.id)}
            >
              <span className={s.rowText}>
                <span className={s.rowLabel}>{r.label}</span>
                <span className={s.rowChannel}>{r.channel}</span>
              </span>
            </Switch>
          ))}
        </section>
      </div>

      <section className={s.history}>
        <div className={s.historyTitle}>History</div>
        <div className={s.scroll} data-phone="tscroll">
          <div className={s.grid} data-phone="tmin">
            <div className={s.headRow} data-phone="thead">
              <span>Announcement</span>
              <span>Audience</span>
              <span>Channels</span>
              <span>Status</span>
              <span>Date</span>
              <span>Opened</span>
            </div>
            {vm.history.map((h) => (
              <div key={h.id} className={s.histRow} data-phone="card">
                <div className={s.histMain}>
                  <div className={s.histTitle}>{h.title}</div>
                  <div className={s.histBody}>{h.body}</div>
                </div>
                <span className={s.histAud} data-phone="cell" data-label="Audience">
                  {h.aud}
                </span>
                <span className={s.histCh} data-phone="cell" data-label="Channels">
                  {h.ch}
                </span>
                <span className={s.histStatus} data-sent={h.sent ? 'true' : undefined}>
                  <span className={s.dot} />
                  {h.status}
                </span>
                <span className={s.histAt} data-phone="cell" data-label="Date">
                  {h.at}
                </span>
                <span className={s.histOpens} data-phone="cell" data-label="Opened">
                  {h.opens}
                </span>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}

export default Component;
