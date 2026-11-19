// D-188: what may be uploaded, the video block's copy and source rules, and the Vault's two upload
// actions (Publish to Vault and Replace file with a real file), each with its toast, its write, what it
// leaves alone, who may, and its ONE audit row.
import { describe, expect, it } from 'vitest';
import {
  AUDIT_ACTIONS,
  AUDIT_ACTION_GROUPS,
  MAX_FILE_BYTES,
  MAX_VIDEO_BYTES,
  MutationError,
  VAULT_FILE_ERROR,
  copyIssues,
  extensionOf,
  fileSizeLabel,
  isAdminActionName,
  isUploadKey,
  moduleCopyFields,
  moduleVideos,
  nameMatchesType,
  publishVaultFile,
  replaceVaultFile,
  saveBuilderModule,
  seed,
  uploadAccept,
  uploadTypeFor,
  videoIssues,
  videoSourceOk,
} from '../src';
import type { Actor, AIEmployee, Ctx, Db, VaultFile } from '../src';
import type { VideoBlock } from '../src/course-types';
import { curriculumSeed } from '../seed/curriculum';

const NOW = Date.parse('2026-12-07T10:42:00-06:00');
const mkCtx = (): Ctx => {
  let n = 1;
  return { now: NOW, id: (p: string) => `${p}_test_${n++}` };
};
const OWNER: Actor = { kind: 'staff', staffId: 'st1' };
const SUPPORT: Actor = { kind: 'staff', staffId: 'st4' };
const JAMIE: Actor = { kind: 'learner', userId: 'u_jamie' };
const fresh = (): Db => seed('live');

const KEY = 'uploads/2026/12/aaaaaaaa-bbbb-4ccc-8ddd-000000000001.csv';
const CSV: VaultFile = { key: KEY, name: 'Leads export.csv', size: 34_500, type: 'text/csv' };

describe('what may be uploaded (D-188)', () => {
  it('reads a file’s type from its name, not from what the browser calls it', () => {
    expect(uploadTypeFor('Pipeline.XLSX')).toBe('application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    expect(uploadTypeFor('leads.csv')).toBe('text/csv');
    expect(uploadTypeFor('Week 1.mp4')).toBe('video/mp4');
    expect(uploadTypeFor('notes.markdown')).toBe('text/markdown');
    expect(uploadTypeFor('page.html')).toBeNull();
    expect(uploadTypeFor('noextension')).toBeNull();
    expect(extensionOf('.hidden')).toBe('');
    expect(nameMatchesType('a.mp4', 'video/mp4')).toBe(true);
    expect(nameMatchesType('a.mov', 'video/mp4')).toBe(false);
  });

  it('caps a video at 500 MB and everything else at 25 MB', () => {
    expect(MAX_VIDEO_BYTES).toBe(500_000_000);
    expect(MAX_FILE_BYTES).toBe(25_000_000);
  });

  it('labels a size as the Vault shows it', () => {
    expect(fileSizeLabel(34)).toBe('1 KB');
    expect(fileSizeLabel(34_500)).toBe('35 KB');
    expect(fileSizeLabel(1_100_000)).toBe('1.1 MB');
    expect(fileSizeLabel(500_000_000)).toBe('500 MB');
  });

  it('says what a picker accepts', () => {
    expect(uploadAccept(true)).toBe('.mp4');
    expect(uploadAccept()).toBe('.json,.pdf,.md,.markdown,.zip,.mp4,.xlsx,.csv');
  });

  it('knows a key the upload route mints, and nothing else', () => {
    expect(isUploadKey(KEY)).toBe(true);
    for (const k of ['modules/marketing/x.json', 'uploads/2026/12/../x.csv', 'uploads/2026/12/x.csv', 'resources/r1', '', 7]) expect(isUploadKey(k), String(k)).toBe(false);
  });
});

describe('a video block’s copy and source (D-188)', () => {
  const week = (): AIEmployee => structuredClone(curriculumSeed().modules[2]!);
  const upload: VideoBlock = { type: 'video', source: { upload: 'uploads/2026/12/aaaaaaaa-bbbb-4ccc-8ddd-000000000002.mp4', name: 'Build.mp4', size: 10, type: 'video/mp4' }, title: 'Watch the build' };

  it('checks a video’s title like any other string, in a path and in Media, and never its address', () => {
    const m = week();
    m.checklist[0]!.paths = { chatgpt: { blocks: [{ type: 'video', source: { url: 'https://example.test/a.mp4' }, title: 'Starts at 12:00 PM' }] } };
    m.course!.media = ['Recording link', upload];
    const fields = moduleCopyFields(m);
    expect(fields.find((f) => f.path === 'checklist[0].paths.chatgpt.blocks[0].title')).toMatchObject({ label: 'Step 1, ChatGPT path, block 1', text: 'Starts at 12:00 PM' });
    expect(fields.find((f) => f.path === 'course.media[0]')).toMatchObject({ text: 'Recording link' });
    expect(fields.find((f) => f.path === 'course.media[1].title')).toMatchObject({ label: 'Media 2', text: 'Watch the build' });
    expect(fields.some((f) => f.text.includes('example.test') || f.text.includes('uploads/'))).toBe(false);
    expect(copyIssues(fields.filter((f) => f.path.startsWith('checklist[0].paths'))).map((i) => i.rule)).toEqual(['time_zone']);
  });

  it('allows an uploaded mp4 or an http(s) link, and nothing else', () => {
    expect(videoSourceOk(upload)).toBe(true);
    expect(videoSourceOk({ type: 'video', source: { url: 'https://youtu.be/x' } })).toBe(true);
    expect(videoSourceOk({ type: 'video', source: { url: 'http://example.test/a.m3u8' } })).toBe(true);
    for (const url of ['javascript:alert(1)', 'data:video/mp4;base64,AA', '/api/files/course/x', 'ftp://x/a.mp4', '', `https://x.test/${'a'.repeat(2100)}`]) {
      expect(videoSourceOk({ type: 'video', source: { url } }), url.slice(0, 30)).toBe(false);
    }
  });

  it('lists every video with where it is, and the lines a bad one is refused with', () => {
    const m = week();
    m.checklist[1]!.paths = { claude: { blocks: [{ type: 'text', text: 'x' }, { type: 'video', source: { url: 'javascript:x' } }] } };
    m.course!.media = [...m.course!.media, upload];
    expect(moduleVideos(m).map((v) => v.path)).toEqual(['checklist[1].paths.claude.blocks[1]', `course.media[${m.course!.media.length - 1}]`]);
    expect(videoIssues(m)).toEqual(['Step 2, Claude path, block 2: Use an http or https link for a video, or upload an mp4.']);
  });

  it('refuses the builder’s save inline for a bad video, and writes nothing', () => {
    const db = fresh();
    const m = structuredClone(db.modules.find((x) => x.id === 'sales')!);
    m.checklist[0]!.paths = { claude: { blocks: [{ type: 'video', source: { url: 'nope' } }] } };
    const out = saveBuilderModule(db, OWNER, { draft: m }, mkCtx());
    expect(out.error).toBe('Step 1, Claude path, block 1: Use an http or https link for a video, or upload an mp4.');
    expect(out.db).toBe(db);
    expect(out.audit).toBeUndefined();
  });
});

describe('Resource Vault › Publish to Vault with a real file (publishVaultFile)', () => {
  const args = (over: Partial<Parameters<typeof publishVaultFile>[2]> = {}) => ({ title: 'Lead list', desc: 'A CSV to start from', cat: 'Lead Generation Scripts', type: 'Prompt pack', tier: 'agent' as const, file: CSV, ...over });

  it('adds the row as uploadResource does, with the real size, the stored file, a toast and one audit row', () => {
    const db = fresh();
    const out = publishVaultFile(db, OWNER, args(), mkCtx());
    expect(out.error).toBeUndefined();
    const r = out.db.resources[0]!;
    expect(r).toMatchObject({ id: 'r_test_1', title: 'Lead list', desc: 'A CSV to start from', tier: 'agent', size: '35 KB', dl: 0, status: 'published', updated: NOW });
    expect(out.db.resources.length).toBe(db.resources.length + 1);
    expect(out.toast).toEqual({ msg: 'Lead list published to the vault', tone: 'success' });
    expect(out.storage).toEqual({ resourceId: 'r_test_1', key: KEY, fileName: 'Leads export.csv' });
    expect(out.audit).toEqual({
      action: 'vault.upload',
      target: { type: 'resource', id: 'r_test_1', label: 'Lead list' },
      after: { title: 'Lead list', cat: 'Lead Generation Scripts', tier: 'agent', module: null, attachedTo: null, type: 'Prompt pack', status: 'published', file: { name: 'Leads export.csv', size: 34_500, type: 'text/csv', object: KEY } },
    });
  });

  it('keeps uploadResource’s rules: a title, and an executive category is Team only', () => {
    expect(publishVaultFile(fresh(), OWNER, args({ title: '  ' }), mkCtx()).error).toBe('Add a title.');
    expect(publishVaultFile(fresh(), OWNER, args({ cat: 'Organizational SOPs' }), mkCtx()).db.resources[0]!.tier).toBe('team');
  });

  it('refuses a file that isn’t one the upload route could have taken, inline, with no write', () => {
    const db = fresh();
    for (const file of [
      { ...CSV, key: 'resources/r1' },
      { ...CSV, type: 'text/html' },
      { ...CSV, name: 'page.html' },
      { ...CSV, size: 0 },
      { ...CSV, size: MAX_FILE_BYTES + 1 },
      { ...CSV, name: '  ' },
    ]) {
      const out = publishVaultFile(db, OWNER, args({ file }), mkCtx());
      expect(out.error, JSON.stringify(file)).toBe(VAULT_FILE_ERROR);
      expect(out.db).toBe(db);
      expect(out.storage).toBeUndefined();
    }
    // A video may be 500 MB.
    const mp4 = { key: 'uploads/2026/12/aaaaaaaa-bbbb-4ccc-8ddd-000000000003.mp4', name: 'Replay.mp4', size: MAX_VIDEO_BYTES, type: 'video/mp4' };
    expect(publishVaultFile(db, OWNER, args({ file: mp4 }), mkCtx()).db.resources[0]!.size).toBe('500 MB');
  });

  it('is for staff with curriculum only', () => {
    expect(() => publishVaultFile(fresh(), SUPPORT, args(), mkCtx())).toThrow(MutationError);
    expect(() => publishVaultFile(fresh(), JAMIE, args(), mkCtx())).toThrow(MutationError);
  });
});

describe('Resource Vault › Replace file (replaceVaultFile)', () => {
  it('swaps the stored file, the size and the Updated day, and nothing else; one audit row', () => {
    const db = fresh();
    const r = db.resources.find((x) => x.id === 'r4')!;
    const out = replaceVaultFile(db, OWNER, { id: 'r4', file: CSV }, mkCtx());
    const after = out.db.resources.find((x) => x.id === 'r4')!;
    expect(after).toEqual({ ...r, size: '35 KB', updated: NOW });
    expect(out.toast).toEqual({ msg: 'File replaced', tone: 'success' });
    expect(out.storage).toEqual({ resourceId: 'r4', key: KEY, fileName: 'Leads export.csv' });
    expect(out.audit).toEqual({
      action: 'vault.replace',
      target: { type: 'resource', id: 'r4', label: r.title },
      before: { size: r.size },
      after: { size: '35 KB', file: { name: 'Leads export.csv', size: 34_500, type: 'text/csv', object: KEY } },
    });
  });

  it('refuses a bad file inline, an unknown row and anyone without curriculum', () => {
    const db = fresh();
    expect(replaceVaultFile(db, OWNER, { id: 'r4', file: { ...CSV, key: 'x' } }, mkCtx()).error).toBe(VAULT_FILE_ERROR);
    expect(() => replaceVaultFile(db, OWNER, { id: 'nope', file: CSV }, mkCtx())).toThrow(MutationError);
    expect(() => replaceVaultFile(db, SUPPORT, { id: 'r4', file: CSV }, mkCtx())).toThrow(MutationError);
  });

  it('is in the catalog, audited in the vault’s own group', () => {
    expect(isAdminActionName('publishVaultFile')).toBe(true);
    expect(isAdminActionName('replaceVaultFile')).toBe(true);
    expect(AUDIT_ACTIONS).toEqual(expect.arrayContaining(['vault.upload', 'vault.replace']));
    // No new group: the Audit Log's Action filter is unchanged.
    expect(AUDIT_ACTION_GROUPS.filter((g) => g === 'vault')).toHaveLength(1);
  });
});
