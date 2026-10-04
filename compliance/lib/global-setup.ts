import { REF_BASE, APP_BASE } from './prepare';

/**
 * Prove the suite is pointed at the right two servers before a single test runs.
 *
 * Playwright's `reuseExistingServer` only checks that *something* answers on the port. If another
 * project happens to be serving that port — a stray `vite preview` from an unrelated repo, say —
 * the whole suite will run against that application and report a wall of baffling diffs instead of
 * saying "wrong server". This guard turns that into one clear failure.
 *
 * It also catches a stale or half-written `dist-fixture`, which fails the same way.
 */
async function text(url: string, what: string): Promise<string> {
  let res: Response;
  try {
    res = await fetch(url, { headers: { accept: 'text/html,application/javascript,*/*' } });
  } catch (e) {
    throw new Error(`Compliance setup: cannot reach the ${what} at ${url}.\n  ${(e as Error).message}`);
  }
  if (!res.ok) throw new Error(`Compliance setup: the ${what} at ${url} returned HTTP ${res.status}.`);
  return res.text();
}

export default async function globalSetup() {
  // The reference prototype: lms-data.js is the oracle every scenario depends on.
  const data = await text(`${REF_BASE}/lms-data.js`, 'reference server');
  if (!/export const DB_V/.test(data))
    throw new Error(
      `Compliance setup: ${REF_BASE} is serving something, but it is not design-reference/.\n` +
        `  Expected lms-data.js to export DB_V. Run \`pnpm reference\` and make sure nothing else holds port 4400.`,
    );

  // The app under test. Skipped when only the reference is needed (capture, harness) and for a
  // remote target (phase 09 runs against a deployed URL), which has its own smoke tests.
  if (process.env.REFERENCE_ONLY || process.env.APP_URL) return;
  const html = await text(`${APP_BASE}/`, 'app under test');
  const ours = html.includes('<title>Amplified Impact</title>') && html.includes('ai-lms-prefs');
  if (!ours)
    throw new Error(
      `Compliance setup: ${APP_BASE} is serving a DIFFERENT application.\n` +
        `  Expected the Amplified Impact fixture build (its <title> and the pre-paint prefs script).\n` +
        `  Another project is probably holding that port. Either stop it, or pick a free one:\n` +
        `      APP_PORT=4273 pnpm compliance\n` +
        `  Served HTML began: ${html.slice(0, 160).replace(/\s+/g, ' ')}`,
    );
}
