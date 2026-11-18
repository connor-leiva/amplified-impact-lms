// The open week's content in the learner portal v2 (D-184): the sections the curriculum builder edits,
// the build kit's system prompt, files and instructor notes, the week's CSV downloads, the pager between
// weeks and the breadcrumb trail. Each piece is its own component, so the week page and the step player
// each add it with a line. Markup only: every string is WeekContent.vm.ts's.

import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router';
import { Icon } from '../../components/Icon';
import { Modal } from '../../components/r2/Modal';
import { useToaster } from '../../components/primitives/Toaster';
import { repo } from '../../data/boot';
import { fileRoute } from '../../data/http';
import { PREVIEW_ONLY } from '../../data/preview';
import type { StoredFileRef } from '../../data/repository';
import type { DownloadVM } from '../course/Course.vm';
import { LABELS } from './learn.vm';
import { KIT } from './WeekContent.vm';
import type { BuildKitVM, CodeLineVM, CrumbVM, KitFileVM, PartVM, SectionVM, WeekContentVM } from './WeekContent.vm';
import { Tile } from './parts';
import s from './Learn.module.css';
import c from './WeekContent.module.css';

/**
 * A module's file, through the gated files route (`GET /api/files/module/:moduleId/:file`). The learner
 * portal reads the API in every build (`GET /api/course`), so where the repository has no bucket (the
 * fixture build) it names the same route.
 */
export const moduleFileUrl = (ref: StoredFileRef): string | null => repo.fileUrl(ref) ?? fileRoute(ref);

/** A CSV made in the browser (the course page's `save`): the Week 1 worksheet, the practice set, a template. */
function saveCsv(d: DownloadVM): void {
  const url = URL.createObjectURL(new Blob([d.content], { type: 'text/csv' }));
  const a = document.createElement('a');
  a.href = url;
  a.download = d.name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1500);
}

/** A text file made in the browser: the system prompt, as the current portal's Download saves it. */
function saveText(name: string, text: string): void {
  const url = URL.createObjectURL(new Blob([text], { type: 'text/markdown' }));
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1500);
}

// --- the breadcrumb trail ----------------------------------------------------------------------------

/** Home / the week (/ the step): visible above a week's or a step's title. The bar's own trail is for screen readers. */
export function Crumbs({ crumbs }: { crumbs: CrumbVM[] }) {
  return (
    <ol className={c.crumbs} aria-label={LABELS.breadcrumb}>
      {crumbs.map((k, i) => (
        <li key={`${i}:${k.label}`} className={c.crumb}>
          {i > 0 ? (
            <span className={c.sep} aria-hidden="true">
              /
            </span>
          ) : null}
          {k.href ? (
            <Link className={c.crumbLink} to={k.href}>
              {k.label}
            </Link>
          ) : (
            <span className={c.crumbHere} aria-current="page">
              {k.label}
            </span>
          )}
        </li>
      ))}
    </ol>
  );
}

// --- the week's sections -------------------------------------------------------------------------------

function Part({ part }: { part: PartVM }) {
  if (part.kind === 'text') return <p className={`${s.p} ${part.note ? s.me : s.s2}`}>{part.text}</p>;
  return (
    <div className={c.part}>
      {part.heading ? <h3 className={c.h3}>{part.heading}</h3> : null}
      {part.kind === 'rows' ? (
        <dl className={c.rows}>
          {part.rows.map((r, i) => (
            <div key={`${i}:${r.label}`} className={c.row}>
              <dt className={c.rl}>{r.label}</dt>
              <dd className={c.rt}>{r.text}</dd>
            </div>
          ))}
        </dl>
      ) : (
        <ul className={c.list}>
          {part.items.map((t, i) => (
            <li key={`${i}:${t}`}>{t}</li>
          ))}
        </ul>
      )}
    </div>
  );
}

function Section({ sec }: { sec: SectionVM }) {
  const id = `lv-c-${sec.id}`;
  return (
    <section className={`${s.cd} ${c.sec}`} aria-labelledby={id}>
      <div className={s.cdh}>
        <div className={`${s.colZ} ${s.grow}`}>
          <h2 className={s.h2} id={id}>
            {sec.title}
          </h2>
          {sec.meta ? <span className={s.me}>{sec.meta}</span> : null}
        </div>
      </div>
      <div className={`${s.cdb} ${c.body}`}>
        {sec.parts.map((p, i) => (
          <Part key={i} part={p} />
        ))}
      </div>
    </section>
  );
}

/** The week's content sections, then Previous and Next week. Nothing when the week carries none. */
export function WeekContent({ vm }: { vm: WeekContentVM }) {
  return (
    <>
      {vm.sections.length ? (
        <div className={c.secs}>
          {vm.sections.map((x) => (
            <Section key={x.id} sec={x} />
          ))}
        </div>
      ) : null}
      {vm.pager ? (
        <nav className={c.pager} aria-label={KIT.weeks}>
          {vm.pager.prev ? (
            <Link className={`${s.cd} ${c.pg}`} to={vm.pager.prev.href}>
              <Icon name="r2Back" size={14} strokeWidth={1.75} />
              <span className={`${s.colZ} ${s.grow}`}>
                <span className={s.me}>{vm.pager.prev.label}</span>
                <span className={s.w5}>{vm.pager.prev.title}</span>
              </span>
            </Link>
          ) : (
            <span />
          )}
          {vm.pager.next ? (
            <Link className={`${s.cd} ${c.pg} ${c.pgNext}`} to={vm.pager.next.href}>
              <span className={`${s.colZ} ${s.grow}`}>
                <span className={s.me}>{vm.pager.next.label}</span>
                <span className={s.w5}>{vm.pager.next.title}</span>
              </span>
              <Icon name="r2Chev" size={14} strokeWidth={1.75} />
            </Link>
          ) : null}
        </nav>
      ) : null}
    </>
  );
}

// --- the build kit ----------------------------------------------------------------------------------

/** Copy, then "Copied" for two seconds (the current portal's prompt Copy). */
function CopyButton({ text, label, className }: { text: string; label: string; className: string }) {
  const [copied, setCopied] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => () => {
    if (timer.current) clearTimeout(timer.current);
  }, []);
  return (
    <button
      type="button"
      className={className}
      aria-label={label}
      data-copied={copied ? 'true' : undefined}
      onClick={() => {
        void navigator.clipboard?.writeText(text).then(
          () => {
            setCopied(true);
            if (timer.current) clearTimeout(timer.current);
            timer.current = setTimeout(() => setCopied(false), 2000);
          },
          () => undefined,
        );
      }}
    >
      <Icon name={copied ? 'r2Check' : 'lvCopy'} size={14} strokeWidth={1.75} />
      <span aria-live="polite">{copied ? KIT.copied : KIT.copy}</span>
    </button>
  );
}

function Code({ lines }: { lines: CodeLineVM[] }) {
  return (
    <pre className={c.code} tabIndex={0}>
      {lines.map((ln) => (
        <span key={ln.n} className={c.ln}>
          <span className={c.lnN} aria-hidden="true">
            {ln.n}
          </span>
          <span className={c.lnT}>
            {ln.parts.map((p, i) => (
              <span key={i} data-k={p.kind}>
                {p.t}
              </span>
            ))}
          </span>
        </span>
      ))}
    </pre>
  );
}

/** A file to save from the bucket. In a staff member's preview tab the bucket refuses it, so it says "Preview only". */
function FileDownload({ f, previewing, className }: { f: KitFileVM; previewing: boolean; className: string }) {
  if (!f.href) return null;
  if (previewing) return <PreviewOnly label={f.downloadLabel} className={className} />;
  return (
    <a className={className} href={f.href} rel="noopener" aria-label={f.downloadLabel}>
      <Icon name="r2Download" size={14} strokeWidth={1.75} />
      {KIT.download}
    </a>
  );
}

function PreviewOnly({ label, className }: { label: string; className: string }) {
  const { toast } = useToaster();
  return (
    <button type="button" className={className} aria-label={label} onClick={() => toast(PREVIEW_ONLY, 'info')}>
      <Icon name="r2Download" size={14} strokeWidth={1.75} />
      {KIT.download}
    </button>
  );
}

type Open = { kind: 'prompt' } | { kind: 'file'; key: string } | null;

/**
 * The week's build kit from the Module Builder: the system prompt (View, Copy and its variables), the
 * module's files (Preview, Download through the gated files route) and the instructor notes. `files` and
 * `notes` can be left out (the step player shows the prompt and the files only).
 */
export function BuildKit({ vm, previewing, notes = true }: { vm: BuildKitVM; previewing: boolean; notes?: boolean }) {
  const [open, setOpen] = useState<Open>(null);
  const file = open?.kind === 'file' ? vm.files.find((f) => f.key === open.key) : undefined;
  const btn = `${s.b} ${c.kb}`;
  return (
    <>
      {vm.prompt || vm.files.length ? (
        <section className={s.cd} aria-labelledby="lv-bk-t">
          <div className={s.cdh}>
            <h2 className={`${s.h2} ${s.grow}`} id="lv-bk-t">
              {KIT.buildKit}
            </h2>
          </div>
          {vm.prompt ? (
            <div className={`${s.li} ${c.kli}`}>
              <Tile icon="lvKey" tone="forest" size={28} />
              <div className={`${s.colZ} ${s.grow}`}>
                <span className={s.w5}>{vm.prompt.title}</span>
                <span className={s.me}>{vm.prompt.stats}</span>
              </div>
              {vm.prompt.vars.length ? (
                <div className={c.vars}>
                  <span className={s.me}>{KIT.fillIn}</span>
                  {vm.prompt.vars.map((v) => (
                    <code key={v} className={c.var}>
                      {v}
                    </code>
                  ))}
                </div>
              ) : null}
              <div className={c.acts}>
                <button type="button" className={btn} onClick={() => setOpen({ kind: 'prompt' })} aria-label={`${KIT.view}: ${vm.prompt.title}`}>
                  <Icon name="r2Eye" size={14} strokeWidth={1.75} />
                  {KIT.view}
                </button>
                <CopyButton text={vm.prompt.text} label={`${KIT.copy}: ${vm.prompt.title}`} className={btn} />
              </div>
            </div>
          ) : null}
          {vm.files.map((f) => (
            <div key={f.key} className={`${s.li} ${c.kli}`}>
              <Tile icon="file" tone="forest" size={28} />
              <div className={`${s.colZ} ${s.grow}`}>
                <span className={`${s.w5} ${c.fn}`}>{f.name}</span>
                <span className={s.me}>{f.meta}</span>
              </div>
              <div className={c.acts}>
                <button type="button" className={btn} onClick={() => setOpen({ kind: 'file', key: f.key })} aria-label={`${KIT.preview} ${f.name}`}>
                  <Icon name="r2Eye" size={14} strokeWidth={1.75} />
                  {KIT.preview}
                </button>
                <FileDownload f={f} previewing={previewing} className={btn} />
              </div>
            </div>
          ))}
        </section>
      ) : null}

      {notes && vm.notes ? (
        <section className={s.cd} aria-labelledby="lv-notes-t">
          <div className={s.cdh}>
            <h2 className={`${s.h2} ${s.grow}`} id="lv-notes-t">
              {vm.notes.title}
            </h2>
          </div>
          <div className={`${s.cdb} ${c.notes}`}>
            {vm.notes.who ? (
              <div className={c.who}>
                <span className={c.av} aria-hidden="true">
                  {vm.notes.initials}
                </span>
                <span className={s.w5}>{vm.notes.who}</span>
              </div>
            ) : null}
            <p className={`${s.p} ${s.s2} ${c.pre}`}>{vm.notes.body}</p>
          </div>
        </section>
      ) : null}

      {open?.kind === 'prompt' && vm.prompt ? (
        <Modal
          title={vm.prompt.title}
          width={760}
          onClose={() => setOpen(null)}
          foot={
            <>
              <button type="button" className={btn} onClick={() => saveText(vm.prompt!.fileName, vm.prompt!.text)}>
                <Icon name="r2Download" size={14} strokeWidth={1.75} />
                {KIT.download}
              </button>
              <CopyButton text={vm.prompt.text} label={`${KIT.copy}: ${vm.prompt.title}`} className={`${s.b} ${s.bp} ${c.kb}`} />
            </>
          }
        >
          <p className={`${s.p} ${s.me}`}>
            {vm.prompt.desc} · {vm.prompt.stats}
          </p>
          <Code lines={vm.prompt.lines} />
        </Modal>
      ) : null}
      {file ? (
        <Modal
          title={file.name}
          width={760}
          onClose={() => setOpen(null)}
          foot={
            <>
              <FileDownload f={file} previewing={previewing} className={btn} />
              <CopyButton text={file.preview} label={`${KIT.copy}: ${file.name}`} className={`${s.b} ${s.bp} ${c.kb}`} />
            </>
          }
        >
          {file.meta ? <p className={`${s.p} ${s.me}`}>{file.meta}</p> : null}
          <Code lines={file.lines} />
        </Modal>
      ) : null}
    </>
  );
}

/** The week's CSV downloads, made in the browser as the course page makes them. */
export function Downloads({ items }: { items: DownloadVM[] }) {
  if (!items.length) return null;
  return (
    <section className={s.cd} aria-labelledby="lv-dl-t">
      <div className={s.cdh}>
        <h2 className={`${s.h2} ${s.grow}`} id="lv-dl-t">
          {KIT.downloads}
        </h2>
      </div>
      {items.map((d) => (
        <button key={d.name} type="button" className={`${s.li} ${c.dl}`} onClick={() => saveCsv(d)}>
          <Tile icon="file" tone="forest" size={28} />
          <span className={`${s.colZ} ${s.grow}`}>
            <span className={s.w5}>{d.label}</span>
            <span className={s.me}>{d.name}</span>
          </span>
          <span className={s.mu}>
            <Icon name="r2Download" size={14} strokeWidth={1.75} />
          </span>
        </button>
      ))}
    </section>
  );
}
