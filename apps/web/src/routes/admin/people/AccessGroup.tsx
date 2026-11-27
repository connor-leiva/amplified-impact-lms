import { useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router';
import { Page } from '../../../components/r2/Page';
import { Table } from '../../../components/r2/Table';
import type { Column } from '../../../components/r2/Table';
import { Find, PageHead, Two, k } from '../../../components/r2/kit';
import { useDb } from '../../../data/hooks';
import { personPath } from '../../../shell/admin/addresses';
import { NotFound } from '../../console/Denied';
import { ACCESS_GROUP_COPY as C, accessGroupVM } from './accessGroup.vm';
import type { AccessGroupRow } from './accessGroup.vm';

// R-5 audit (D-267, Connor, Nov 26): People › an access group's tab (`/admin/people/groups/:groupId`, "Utah Life"),
// read-only. The mockup's `Groups` (handoff/admin-mockup/ia-screens.jsx) as Connor asked for it: the description, Find,
// and the Agents table (each person's name or the group's agent line over their address, and when they were last active
// or "Invite pending"); a row opens the person. Its people are staff's snapshot's (`Db.groups`): in the group by their
// address and in no cohort, so they are counted here and nowhere else. The tab is named by the group's record.

export function Component() {
  const { groupId = '' } = useParams();
  const db = useDb();
  const navigate = useNavigate();
  const [q, setQ] = useState('');
  const vm = useMemo(() => accessGroupVM(db, groupId, q), [db, groupId, q]);
  if (!vm) return <NotFound />;

  const cols: Column<AccessGroupRow>[] = [
    {
      key: 'name',
      label: C.agent,
      width: 'minmax(200px,1.5fr)',
      value: (r) => r.name,
      cell: (r) => <Two a={r.name} b={r.email} />,
    },
    { key: 'last', label: C.last, width: '170px', noSort: true, value: (r) => r.lastAt, cell: (r) => r.last },
  ];

  return (
    <Page>
      <PageHead title={vm.name} description={vm.description} />
      <div className={k.row}>
        <Find value={q} onChange={setQ} placeholder={C.find} />
      </div>
      <Table
        title={C.table}
        label={vm.name}
        cols={cols}
        rows={vm.rows}
        rowKey={(r) => r.id}
        onRow={(r) => navigate(personPath(r.id))}
        empty={{ icon: 'r2Learners', title: C.empty }}
      />
    </Page>
  );
}
