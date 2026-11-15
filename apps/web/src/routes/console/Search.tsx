// /admin/search (D-158, spec § 7.5): one box over users, workspaces, orders, skills and the viewer's
// Console pages, and the keyboard's shortcuts. Every result that opens somewhere is a link. Markup only:
// every word comes from Search.vm.ts.

import { useMemo, useState } from 'react';
import { Link, useLocation } from 'react-router';
import { ConsolePage } from '../../components/console/ConsolePage';
import { ErrorBlock, FullState, LoadingBlock } from '../../components/console/StateBlock';
import { Button } from '../../components/primitives/Button';
import type { ConsoleApi } from '../../data/console';
import { useDb } from '../../data/hooks';
import { consoleNav } from '../../shell/navModel';
import { deniedCopy, errorCopy } from './console.vm';
import { OPEN_PALETTE_EVENT, SEARCH_COPY, consolePages, resultSections, searchable } from './Search.vm';
import { useConsoleGate } from './useConsoleGate';
import { useConsoleSearch } from './useConsoleSearch';
import s from './records.module.css';

function Search({ api, role }: { api: ConsoleApi; role: string }) {
  const db = useDb();
  const { pathname } = useLocation();
  const [q, setQ] = useState('');
  const [attempt, setAttempt] = useState(0);
  const search = useConsoleSearch(api, q, attempt);
  const pages = useMemo(() => consolePages(consoleNav(db, { pathname }, false, role)), [db, pathname, role]);
  const sections = resultSections(search.kind === 'ready' ? search.results : null, pages, q, { navigable: false });
  const short = searchable(q) === null;

  return (
    <ConsolePage
      title={SEARCH_COPY.title}
      description={SEARCH_COPY.description}
      actions={
        <Button onClick={() => window.dispatchEvent(new Event(OPEN_PALETTE_EVENT))}>
          {SEARCH_COPY.openPalette} <kbd className={s.kbd}>{SEARCH_COPY.shortcut}</kbd>
        </Button>
      }
    >
      <input
        type="search"
        className={s.searchBox}
        aria-label={SEARCH_COPY.input}
        placeholder={SEARCH_COPY.input}
        maxLength={100}
        value={q}
        onChange={(e) => setQ(e.target.value)}
      />
      {search.kind === 'loading' ? (
        <LoadingBlock rows={4} />
      ) : search.kind === 'error' ? (
        <ErrorBlock copy={errorCopy(search.failure)} onRetry={() => setAttempt((n) => n + 1)} />
      ) : (
        <div className={s.card}>
          {short ? <p className={s.muted}>{SEARCH_COPY.hint}</p> : null}
          {sections.length === 0 ? (
            <p className={s.sentence}>{SEARCH_COPY.none(q.trim())}</p>
          ) : (
            <div className={s.results} aria-label={SEARCH_COPY.results} role="region">
              {sections.map((sec) => (
                <section key={sec.group} className={s.resultGroup} aria-labelledby={`search-${sec.group}`}>
                  <h2 id={`search-${sec.group}`} className={s.groupHeading}>
                    {sec.label}
                  </h2>
                  <ul className={s.resultList}>
                    {sec.items.map((item) => (
                      <li key={item.key}>
                        {item.to ? (
                          <Link className={s.result} to={item.to}>
                            <span className={item.mono ? s.mono : undefined}>{item.label}</span>
                            <span className={s.resultDetail}>{item.detail}</span>
                          </Link>
                        ) : (
                          <span className={`${s.result} ${s.resultStatic}`}>
                            <span>{item.label}</span>
                            <span className={s.resultDetail}>{item.detail}</span>
                          </span>
                        )}
                      </li>
                    ))}
                  </ul>
                </section>
              ))}
            </div>
          )}
        </div>
      )}
      <div className={s.card}>
        <h2 className={s.h2}>{SEARCH_COPY.keyboard}</h2>
        <dl className={s.keys}>
          {SEARCH_COPY.keys.map(([key, what]) => (
            <div key={key} className={s.keyRow}>
              <dt>
                <kbd className={s.kbd}>{key}</kbd>
              </dt>
              <dd className={s.keyWhat}>{what}</dd>
            </div>
          ))}
        </dl>
      </div>
    </ConsolePage>
  );
}

export function Component() {
  const gate = useConsoleGate('search');
  if (gate.kind === 'hidden') return null;
  if (gate.kind === 'denied') return <FullState kind="denied" copy={deniedCopy('search', gate.role)} />;
  if (gate.kind === 'ready') return <Search api={gate.api} role={gate.me.role} />;
  return (
    <ConsolePage title={SEARCH_COPY.title} description={SEARCH_COPY.description}>
      {gate.kind === 'loading' ? <LoadingBlock /> : <ErrorBlock copy={errorCopy(gate.failure)} onRetry={gate.retry} />}
    </ConsolePage>
  );
}

export default Component;
