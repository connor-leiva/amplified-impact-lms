import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { blankModule, phaseNow, seed, seedProduction, setViewerZone } from '@ai/core';
import type { Db, Learner } from '@ai/core';
import { SKILL_LIBRARY_PATH, consoleNav, hasPortal, noPortalRedirect, portalNav, type NavEntry, type NavGroup } from './navModel';

// Week 2 of the December 2026 Cohort — the instant the goldens were captured in.
const NOW = phaseNow('live');

const learner = (db: Db, id: string): Learner => db.users.find((u) => u.id === id)!;
const keys = (g: NavGroup): string[] => g.items.map((i) => i.key);
const row = (g: NavGroup, key: string): NavEntry => g.items.find((i) => i.key === key)!;

describe('navModel @g4', () => {
  // `fmt.date` reads the viewer zone, so pin it: `Dec 14` must not depend on the test machine.
  beforeAll(() => setViewerZone('America/Chicago'));
  afterAll(() => setViewerZone(null));

  describe('portalNav · Jamie Ortiz (Agent tier, Week 2)', () => {
    const db = seed('live');
    const jamie = learner(db, 'u_jamie');
    const nav = portalNav(db, jamie, { pathname: '/' }, NOW, false, true);
    const g = nav[0]!;

    it('is one group with no label, in reading order and without Team Hub', () => {
      expect(nav).toHaveLength(1);
      expect(g.showLabel).toBe(false);
      expect(g.label).toBeUndefined();
      expect(keys(g)).toEqual([
        'dashboard',
        'sessions',
        'emp',
        'marketing',
        'sales',
        'database',
        'meetings',
        'finance',
        'operations',
        'vault',
      ]);
      expect(g.items.map((i) => i.label)).toEqual([
        'Dashboard',
        'Sessions',
        'AI Employees',
        'Marketing',
        'Sales',
        'Database',
        'Meetings',
        'Finance',
        'Operations',
        'Resource Vault',
      ]);
    });

    it('routes the top-level rows to the app paths and marks Dashboard active', () => {
      expect(row(g, 'dashboard')).toMatchObject({ icon: 'grid', depth: 0, active: true, action: { to: '/' } });
      expect(row(g, 'sessions')).toMatchObject({ icon: 'radio', active: false, action: { to: '/sessions' } });
      expect(row(g, 'vault')).toMatchObject({ icon: 'archive', active: false, action: { to: '/vault' } });
      expect(row(g, 'dashboard').title).toBe('Dashboard');
      expect(row(g, 'vault').title).toBe('Resource Vault');
    });

    it('counts 3 AI Employees included in the Agent tier on the group header', () => {
      expect(row(g, 'emp')).toMatchObject({
        label: 'AI Employees',
        icon: 'bot',
        depth: 0,
        active: false,
        locked: false,
        token: null,
        badge: '3',
        badgeTitle: '3 included in your tier',
        chev: 'open',
        title: 'AI Employees',
        action: { toggleEmployees: true },
      });
    });

    it('gives each child the employee short label, its own icon and depth 1', () => {
      expect(g.items.slice(3, 9).map((i) => i.depth)).toEqual([1, 1, 1, 1, 1, 1]);
      expect(g.items.slice(3, 9).map((i) => i.icon)).toEqual([
        'megaphone',
        'zap',
        'database',
        'mic',
        'dollar',
        'workflow',
      ]);
    });

    it('shows the build token and build tooltip on the three accessible employees', () => {
      expect(row(g, 'marketing').token).toEqual({ kind: 'build', state: 'verified', n: 6, total: 6 });
      expect(row(g, 'marketing').title).toBe('Marketing AI Employee · Built');

      expect(row(g, 'sales').token).toEqual({ kind: 'build', state: 'in_progress', n: 3, total: 6 });
      expect(row(g, 'sales').title).toBe('Sales AI Employee · 3 of 6 steps verified');

      expect(row(g, 'database').token).toEqual({ kind: 'build', state: 'not_started', n: 0, total: 6 });
      expect(row(g, 'database').title).toBe('Database AI Employee · Not started');
    });

    it('locks the three Team-tier employees: no token, Team tier tooltip, never navigates', () => {
      for (const id of ['meetings', 'finance', 'operations']) {
        const e = row(g, id);
        expect(e.locked).toBe(true);
        expect(e.token).toBeNull();
        expect(e.action).toEqual({ openLocked: id });
        expect('to' in e.action).toBe(false);
      }
      expect(row(g, 'meetings').title).toBe('Meetings AI Employee · Team tier');
      expect(row(g, 'finance').title).toBe('Finance AI Employee · Team tier');
      // Locked outranks scheduled: Operations never shows an Opens token to an Agent-tier learner.
      expect(row(g, 'operations').title).toBe('Operations AI Employee · Team tier');
    });

    it('activates the child the viewer is on, not Dashboard', () => {
      const [only] = portalNav(db, jamie, { pathname: '/employees/sales', employeeId: 'sales' }, NOW, false, true);
      expect(row(only!, 'sales').active).toBe(true);
      expect(row(only!, 'marketing').active).toBe(false);
      expect(row(only!, 'dashboard').active).toBe(false);
    });

    it('hides the children and closes the chevron when the group is collapsed', () => {
      const [closed] = portalNav(db, jamie, { pathname: '/' }, NOW, false, false);
      expect(keys(closed!)).toEqual(['dashboard', 'sessions', 'emp', 'vault']);
      expect(row(closed!, 'emp').chev).toBe('closed');
    });
  });

  describe('portalNav · Alex Morgan (Team owner, Week 2)', () => {
    const db = seed('live');
    const alex = learner(db, 'u_alex');
    const nav = portalNav(db, alex, { pathname: '/' }, NOW, false, true);
    const g = nav[0]!;

    it('adds Team Hub before Resource Vault and counts all 6 as included', () => {
      expect(keys(g)).toEqual([
        'dashboard',
        'sessions',
        'emp',
        'marketing',
        'sales',
        'database',
        'meetings',
        'finance',
        'operations',
        'team',
        'vault',
      ]);
      expect(row(g, 'team')).toMatchObject({ label: 'Team Hub', icon: 'users', action: { to: '/team' } });
      expect(row(g, 'emp').badge).toBe('6');
      expect(row(g, 'emp').badgeTitle).toBe('6 included in your tier');
    });

    it('unlocks every employee, so each child navigates to its own page', () => {
      for (const e of g.items.slice(3, 9)) {
        expect(e.locked).toBe(false);
        expect(e.action).toEqual({ to: `/employees/${e.key}` });
      }
    });

    it('shows build tokens for the published employees Alex can reach', () => {
      expect(row(g, 'marketing').token).toEqual({ kind: 'build', state: 'verified', n: 6, total: 6 });
      expect(row(g, 'sales').token).toEqual({ kind: 'build', state: 'verified', n: 6, total: 6 });
      expect(row(g, 'database').token).toEqual({ kind: 'build', state: 'in_progress', n: 2, total: 6 });
      expect(row(g, 'database').title).toBe('Database AI Employee · 2 of 6 steps verified');
      expect(row(g, 'meetings').token).toEqual({ kind: 'build', state: 'not_started', n: 0, total: 6 });
      expect(row(g, 'meetings').title).toBe('Meetings AI Employee · Not started');
    });

    it('shows a neutral clock token for Operations, which opens Dec 14', () => {
      expect(row(g, 'operations').token).toEqual({
        kind: 'custom',
        tone: 'neutral',
        icon: 'clock',
        label: 'Dec 14',
      });
      expect(row(g, 'operations').title).toBe('Operations AI Employee · Opens Dec 14');
      expect(row(g, 'operations').locked).toBe(false);
    });

    it('falls back to Soon when a scheduled employee has no open date', () => {
      const d = seed('live');
      const ops = d.modules.find((m) => m.id === 'operations')!;
      ops.opens = null;
      const [only] = portalNav(d, learner(d, 'u_alex'), { pathname: '/' }, NOW, false, true);
      expect(row(only!, 'operations').token).toMatchObject({ label: 'Soon' });
      expect(row(only!, 'operations').title).toBe('Operations AI Employee · Opens soon');
    });
  });

  describe('portalNav · collapsed (rail)', () => {
    const db = seed('live');
    const alex = learner(db, 'u_alex');
    const nav = portalNav(db, alex, { pathname: '/' }, NOW, true, true);

    it('returns three unlabelled groups: main, children, tail', () => {
      expect(nav).toHaveLength(3);
      expect(nav.map((x) => x.showLabel)).toEqual([false, false, false]);
      expect(nav.map((x) => x.label)).toEqual([undefined, undefined, undefined]);
      expect(keys(nav[0]!)).toEqual(['dashboard', 'sessions']);
      expect(keys(nav[1]!)).toEqual(['marketing', 'sales', 'database', 'meetings', 'finance', 'operations']);
      expect(keys(nav[2]!)).toEqual(['team', 'vault']);
    });

    it('drops the group header and flattens the children to depth 0', () => {
      expect(nav.flatMap(keys)).not.toContain('emp');
      expect(nav[1]!.items.map((i) => i.depth)).toEqual([0, 0, 0, 0, 0, 0]);
    });

    it('still shows the children when the group is toggled closed, because the header is gone', () => {
      const closed = portalNav(db, alex, { pathname: '/' }, NOW, true, false);
      expect(keys(closed[1]!)).toHaveLength(6);
    });
  });

  // D-119: a buyer whose plan opens no AI Employee (Amplified Insiders, the Team Plan, the Agent Plan).
  // `scopeSnapshot` drops the course from their snapshot, so it carries no module at all.
  describe('portalNav · a learner whose plan opens no AI Employee (D-119)', () => {
    const prod = seedProduction({ owner: { name: 'Connor Leiva', email: 'connor@amplifiedimpact.io' } });
    const db: Db = { ...prod, modules: [], sessions: [] };
    const owner: Learner = { id: 'u_b', name: 'B', email: 'b@example.test', tier: 'team', role: 'Team Owner', teamId: 't_b', cohortId: 'dec26', joined: 0, last: null, status: 'active', progress: {} };
    const agent: Learner = { ...owner, id: 'u_a', tier: 'agent' };

    it('has no portal, where every prototype learner has one', () => {
      expect(hasPortal(db)).toBe(false);
      expect(hasPortal(seed('live'))).toBe(true);
    });

    it('shows the Skill Library, then the Team Hub for Team tier, then the Vault: no Dashboard, Sessions or AI Employees', () => {
      const nav = portalNav(db, owner, { pathname: '/team' }, NOW, false, true);
      expect(nav).toHaveLength(1);
      expect(keys(nav[0]!)).toEqual(['library', 'team', 'vault']);
      expect(row(nav[0]!, 'library')).toMatchObject({ label: 'Skill Library', icon: 'book', action: { to: SKILL_LIBRARY_PATH }, active: false });
      expect(row(nav[0]!, 'team').active).toBe(true);
      expect(keys(portalNav(db, agent, { pathname: '/vault' }, NOW, false, true)[0]!)).toEqual(['library', 'vault']);
    });

    it('in the rail, keeps two groups and no empty one for children', () => {
      const nav = portalNav(db, owner, { pathname: '/vault' }, NOW, true, true);
      expect(nav.map(keys)).toEqual([['library'], ['team', 'vault']]);
    });

    it('sends every cohort screen to the Skill Library, and keeps the Team Hub and the Vault', () => {
      for (const p of ['/', '/sessions', '/sessions/', '/employees/accel-w1', '/team-tier', '/admin']) expect(noPortalRedirect(db, p), p).toBe(SKILL_LIBRARY_PATH);
      for (const p of ['/team', '/team/', '/vault']) expect(noPortalRedirect(db, p), p).toBeNull();
    });

    it('never redirects a learner who has a portal: the prototype and an AI Accelerator buyer', () => {
      for (const p of ['/', '/sessions', '/employees/marketing', '/team-tier']) expect(noPortalRedirect(seed('live'), p), p).toBeNull();
      expect(noPortalRedirect(prod, '/')).toBeNull();
    });
  });

  // The admin sidebar (D-157, spec § 8): the Admin Console's groups, for the reference's viewer, the Owner.
  describe('consoleNav · the Owner', () => {
    const db = seed('live');
    const OWNER = 'Owner';

    it('builds the six groups with their labels and rows', () => {
      const nav = consoleNav(db, { pathname: '/admin' }, false, OWNER);
      expect(nav.map((x) => x.label)).toEqual(['Health', 'Build', 'Support', 'Revenue', 'Operations', 'Access']);
      expect(nav.map((x) => x.showLabel)).toEqual([true, true, true, true, true, true]);
      expect(nav.map(keys)).toEqual([
        ['overview'],
        ['curriculum', 'builder', 'avault', 'cohorts', 'announce'],
        ['learners'],
        ['tiers'],
        ['audit'],
        ['roles', 'staff'],
      ]);
      expect(nav.flatMap((x) => x.items).map((i) => i.label)).toEqual([
        'Overview',
        'Curriculum',
        'Module Builder',
        'Resource Vault',
        'Cohorts & Sessions',
        'Announcements',
        'Learners & Teams',
        'Tiers & Upgrades',
        'Audit Log',
        'Roles & Permissions',
        'Staff & Roles',
      ]);
      expect(nav.flatMap((x) => x.items).map((i) => i.icon)).toEqual([
        'chart',
        'layers',
        'pencil',
        'archive',
        'calendar',
        'send',
        'users',
        'card',
        'listChecks',
        'lock',
        'shield',
      ]);
    });

    it('routes every row to its admin path', () => {
      const all = consoleNav(db, { pathname: '/admin' }, false, OWNER).flatMap((x) => x.items);
      expect(Object.fromEntries(all.map((i) => [i.key, i.action]))).toEqual({
        overview: { to: '/admin' },
        curriculum: { to: '/admin/curriculum' },
        builder: { to: '/admin/curriculum/new' },
        avault: { to: '/admin/vault' },
        cohorts: { to: '/admin/cohorts' },
        announce: { to: '/admin/announcements' },
        learners: { to: '/admin/learners' },
        tiers: { to: '/admin/tiers' },
        audit: { to: '/admin/audit' },
        roles: { to: '/admin/roles' },
        staff: { to: '/admin/staff' },
      });
    });

    it('keeps the labels but hides them when collapsed', () => {
      const nav = consoleNav(db, { pathname: '/admin' }, true, OWNER);
      expect(nav.map((x) => x.label)).toEqual(['Health', 'Build', 'Support', 'Revenue', 'Operations', 'Access']);
      expect(nav.map((x) => x.showLabel)).toEqual([false, false, false, false, false, false]);
      expect(nav.flatMap(keys)).toHaveLength(11);
    });

    const active = (pathname: string): string[] =>
      consoleNav(db, { pathname }, false, OWNER)
        .flatMap((x) => x.items)
        .filter((i) => i.active)
        .map((i) => i.key);

    it('marks exactly one row active per admin path, and none on the Console 404', () => {
      expect(active('/admin')).toEqual(['overview']);
      expect(active('/admin/curriculum')).toEqual(['curriculum']);
      expect(active('/admin/cohorts')).toEqual(['cohorts']);
      expect(active('/admin/vault')).toEqual(['avault']);
      expect(active('/admin/tiers')).toEqual(['tiers']);
      expect(active('/admin/staff')).toEqual(['staff']);
      expect(active('/admin/audit')).toEqual(['audit']);
      expect(active('/admin/roles/')).toEqual(['roles']);
      expect(active('/admin/no-such-page')).toEqual([]);
    });

    it('keeps Module Builder active for a new and for an existing AI Employee', () => {
      expect(active('/admin/curriculum/new')).toEqual(['builder']);
      expect(active('/admin/curriculum/marketing')).toEqual(['builder']);
    });

    it('has no Curriculum badge at Week 2, where nothing is a draft', () => {
      const build = consoleNav(db, { pathname: '/admin' }, false, OWNER)[1]!;
      expect(row(build, 'curriculum').badge).toBeUndefined();
      expect(row(build, 'curriculum').badgeTitle).toBeUndefined();
    });

    it('badges Curriculum with the draft count, singular then plural', () => {
      const one = seed('live');
      one.modules.push(blankModule(7, NOW));
      const c1 = consoleNav(one, { pathname: '/admin' }, false, OWNER)[1]!;
      expect(row(c1, 'curriculum').badge).toBe('1 Draft');
      expect(row(c1, 'curriculum').badgeTitle).toBe('1 draft AI Employee');

      const two = seed('live');
      two.modules.push(blankModule(7, NOW), blankModule(8, NOW + 1));
      const c2 = consoleNav(two, { pathname: '/admin' }, false, OWNER)[1]!;
      expect(row(c2, 'curriculum').badge).toBe('2 Draft');
      expect(row(c2, 'curriculum').badgeTitle).toBe('2 draft AI Employees');
    });

    it('badges Tiers & Upgrades with the count of new requests only, singular then plural', () => {
      const revenue = consoleNav(db, { pathname: '/admin' }, false, OWNER)[3]!;
      // Week 2 seeds one `new` request; `contacted` and `converted` do not count.
      expect(row(revenue, 'tiers').badge).toBe('1');
      expect(row(revenue, 'tiers').badgeTitle).toBe('1 new upgrade request');

      const two = seed('live');
      two.requests[1]!.status = 'new';
      const r2 = consoleNav(two, { pathname: '/admin' }, false, OWNER)[3]!;
      expect(row(r2, 'tiers').badge).toBe('2');
      expect(row(r2, 'tiers').badgeTitle).toBe('2 new upgrade requests');
    });

    it('drops the Tiers badge when no request is new', () => {
      const none = seed('live');
      none.requests.forEach((q) => {
        if (q.status === 'new') q.status = 'contacted';
      });
      const revenue = consoleNav(none, { pathname: '/admin' }, false, OWNER)[3]!;
      expect(row(revenue, 'tiers').badge).toBeUndefined();
      expect(row(revenue, 'tiers').badgeTitle).toBeUndefined();
    });
  });

  it('is pure: two calls with the same arguments are deeply equal', () => {
    const db = seed('live');
    const jamie = learner(db, 'u_jamie');
    expect(portalNav(db, jamie, { pathname: '/' }, NOW, false, true)).toEqual(
      portalNav(db, jamie, { pathname: '/' }, NOW, false, true),
    );
    expect(consoleNav(db, { pathname: '/admin' }, false, 'Owner')).toEqual(consoleNav(db, { pathname: '/admin' }, false, 'Owner'));
  });

  describe('portalNav · the AI Accelerator (D-110)', () => {
    const prod = seedProduction({ owner: { name: 'Connor Leiva', email: 'connor@amplifiedimpact.io' } });
    const buyer: Learner = { id: 'u_b', name: 'B', email: 'b@example.test', tier: 'team', role: 'Team Owner', teamId: 't_b', cohortId: 'dec26', joined: 0, last: null, status: 'active', progress: {} };
    const keys = (groups: NavGroup[]) => groups.flatMap((g) => g.items.map((i) => i.key));

    it('adds Course after Sessions when the snapshot carries the course, linking to /course', () => {
      const [group] = portalNav(prod, buyer, { pathname: '/' }, phaseNow('live'), false, true);
      expect(keys([group!]).slice(0, 3)).toEqual(['dashboard', 'sessions', 'course']);
      expect(group!.items.find((i) => i.key === 'course')).toMatchObject({ label: 'Course', icon: 'book', action: { to: '/course' } });
      // Week 0 to Week 8 are the AI Employees.
      expect(group!.items.filter((i) => i.depth === 1).map((i) => i.label)).toEqual(['Week 0', 'Week 1', 'Week 2', 'Week 3', 'Week 4', 'Week 5', 'Week 6', 'Week 7', 'Week 8']);
    });

    it('never shows it for the prototype, or for a learner whose snapshot has no course', () => {
      const demo = seed('live');
      expect(keys(portalNav(demo, demo.users.find((u) => u.id === 'u_alex')!, { pathname: '/' }, phaseNow('live'), false, true))).not.toContain('course');
      const none = { ...prod, modules: [] };
      expect(keys(portalNav(none, buyer, { pathname: '/' }, phaseNow('live'), false, true))).not.toContain('course');
    });
  });

  // D-157: which Console rows each staff role sees. The same `consoleCan` the API authorizes with, so a
  // row is never offered to a role the server would refuse.
  describe('consoleNav · by staff role', () => {
    const db = seed('live');
    const flat = (nav: NavGroup[]) => nav.flatMap((g) => g.items);
    const navKeys = (role: string | null) => flat(consoleNav(db, { pathname: '/admin' }, false, role)).map((i) => i.key);
    const EXISTING = ['overview', 'curriculum', 'builder', 'avault', 'cohorts', 'announce', 'learners', 'tiers', 'staff'];

    it('gives the Owner and an Admin both Console rows', () => {
      for (const role of ['Owner', 'Admin']) expect(navKeys(role), role).toEqual([...EXISTING.slice(0, 8), 'audit', 'roles', 'staff']);
    });

    it('gives Support the Audit Log but not Roles & Permissions', () => {
      expect(navKeys('Support')).toEqual([...EXISTING.slice(0, 8), 'audit', 'staff']);
    });

    it('gives Instructor, Content Editor, an unknown role and no role neither Console row, and no Operations heading', () => {
      for (const role of ['Instructor', 'Content Editor', 'Team Owner', null]) {
        const nav = consoleNav(db, { pathname: '/admin' }, false, role);
        expect(nav.map((g) => g.label), String(role)).toEqual(['Health', 'Build', 'Support', 'Revenue', 'Access']);
        expect(flat(nav).map((i) => i.key), String(role)).toEqual(EXISTING);
      }
    });

    it('keeps every existing row identical for every role', () => {
      const owner = flat(consoleNav(db, { pathname: '/admin' }, false, 'Owner'));
      for (const role of ['Admin', 'Support', 'Instructor', 'Content Editor']) {
        const mine = flat(consoleNav(db, { pathname: '/admin' }, false, role));
        for (const key of EXISTING) expect(mine.find((i) => i.key === key), `${role} ${key}`).toEqual(owner.find((i) => i.key === key));
      }
    });
  });
});
