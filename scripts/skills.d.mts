// Types for `scripts/skills.mjs`, so `apps/web/src/guides/skills.test.ts` can import it under the
// web app's typecheck. Keep in step with the exports there.

export interface Manifest {
  name: string;
  page: string;
  title: string;
  version: string;
  apps: readonly ('claude' | 'chatgpt' | 'grok')[];
  shared?: readonly string[];
  /** Hands back a page: ships the shared page kit from `skills/_page-kit/` (skills/README.md, Page Kit). */
  pageKit?: boolean;
}

export interface PlannedEntry {
  path: string;
  abs: string;
}

export interface Download<E> {
  file: string;
  entries: E[];
}

export const ROOT: string;
export const SKILLS_DIR: string;
export const SHARED_DIR: string;
export const DOWNLOADS_DIR: string;
export const PAGE_KIT_DIR: string;
export const PAGE_KIT_FILES: readonly string[];
export const PAGE_KIT_CHATGPT: string;

export function listSkills(): string[];
export function readManifest(name: string): Manifest;
export function plan(name: string): {
  manifest: Manifest;
  skill: Download<PlannedEntry>;
  chatgpt: Download<PlannedEntry> | null;
  grok: Download<PlannedEntry> | null;
  practice: Download<PlannedEntry> | null;
};
export function frontmatter(text: string): { data: Record<string, unknown>; body: string; unsafe: string[] } | null;
export function check(name: string): { errors: string[]; warnings: string[] };
export function pageKitErrors(): string[];
export const GROK_SECTIONS: readonly string[];
export function grokFrontmatter(text: string): Record<string, string> | null;
export function grokSection(text: string, heading: string): string;
export function grokTemplateErrors(text: string): string[];
export function zip(entries: { path: string; data: Buffer }[]): Buffer;
export function unzip(buf: Buffer): Map<string, Buffer>;
export function expected(name: string): Download<{ path: string; data: Buffer }>[];
export function build(name: string): { file: string; bytes: number }[];
export function shellFor(page: string): string;
export function shellPath(page: string): string;
