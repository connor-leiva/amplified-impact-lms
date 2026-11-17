import { useEffect, useMemo, useState } from 'react';
import clsx from 'clsx';
import { Link, useSearchParams } from 'react-router';
import { cleanSearch } from '@ai/core';
import type { SearchResults } from '@ai/core';
import { Card } from '../../components/r2/Card';
import { Empty } from '../../components/r2/Empty';
import { Page } from '../../components/r2/Page';
import { Find, PageHead, k } from '../../components/r2/kit';
import { useDb, useViewer } from '../../data/hooks';
import { adminNav } from '../../shell/admin/adminNav';
import { Denied } from './Denied';
import { LoadError } from './LoadError';
import { useConsoleGate } from './useConsoleGate';
import { useSettled } from './useConsoleData';
import type { ConsoleFailure } from '../../data/console';
import { ConsoleError } from '../../data/console';
import { SEARCH_COPY as C, searchSections } from './search.vm';

// /admin/search (D-160 R2-1c, spec § 7.5): one box over the Console's search API and the viewer's own
// pages, the words kept in the address (`?q=`). The R2 mockup has no frame for this page; it is the R2
// page head, filter box, cards and list rows, as the Support screens use them.

export function Component() {
  const gate = useConsoleGate('search');
  const db = useDb();
  const viewer = useViewer();
  const [params, setParams] = useSearchParams();
  const [q, setQ] = useState(params.get('q') ?? '');
  const settled = useSettled(q);
  const [api, setApi] = useState<SearchResults | null>(null);
  const [failure, setFailure] = useState<ConsoleFailure | null>(null);
  const [attempt, setAttempt] = useState(0);
  const ready = gate.kind === 'ready' ? gate : null;

  useEffect(() => {
    const words = cleanSearch(settled);
    setParams(words ? { q: settled } : {}, { replace: true });
    if (!ready || !words) {
      setApi(null);
      return;
    }
    let alive = true;
    setFailure(null);
    ready.api.search(words).then(
      (r) => alive && setApi(r),
      (e: unknown) => alive && setFailure(e instanceof ConsoleError ? e.kind : 'failed'),
    );
    return () => {
      alive = false;
    };
  }, [settled, ready?.api, attempt]);

  const staffId = viewer.actor.kind === 'staff' ? viewer.actor.staffId : null;
  const pages = useMemo(() => {
    const role = ready?.me.role ?? db.staff.find((x) => x.id === staffId)?.role ?? null;
    return adminNav({
      pathname: '/admin/search',
      role,
      fullNav: false,
      counts: { drafts: 0, requests: 0, incidents: 0 },
      open: {},
    }).flatMap((g) => g.rows.map((r) => ({ id: r.id, label: r.label, to: r.to })));
  }, [db.staff, ready?.me.role, staffId]);
  const sections = searchSections(settled, pages, api);

  if (gate.kind === 'hidden') return null;
  if (gate.kind === 'denied') return <Denied what={C.title} role={gate.role} />;

  return (
    <Page>
      <PageHead title={C.title} description={C.description} />
      <div className={k.row}>
        <Find value={q} onChange={setQ} placeholder={C.field} />
      </div>
      {gate.kind === 'error' ? (
        <LoadError failure={gate.failure} retry={gate.retry} />
      ) : failure ? (
        <LoadError failure={failure} retry={() => setAttempt((n) => n + 1)} />
      ) : sections === null ? (
        <Card pad={false}>
          <Empty icon="r2Search" title={C.start.title} body={C.start.body} />
        </Card>
      ) : !sections.length ? (
        <Card pad={false}>
          <Empty icon="r2Search" title={C.none(settled.trim())} body={C.noneBody} />
        </Card>
      ) : (
        sections.map((sec) => (
          <Card key={sec.title} title={sec.title} pad={false}>
            {sec.hits.map((h) => (
              <div key={h.key} className={k.li}>
                {h.to ? (
                  <Link to={h.to} className={clsx(k.lk, k.el, h.mono && k.mo)}>
                    {h.label}
                  </Link>
                ) : (
                  <span className={clsx(k.el, h.mono && k.mo)}>{h.label}</span>
                )}
                {h.detail ? (
                  <span className={clsx(k.me, k.el)} style={{ marginLeft: 'auto' }}>
                    {h.detail}
                  </span>
                ) : null}
              </div>
            ))}
          </Card>
        ))
      )}
    </Page>
  );
}

export default Component;
