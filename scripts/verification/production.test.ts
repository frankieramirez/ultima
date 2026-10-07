/**
 * The production runner, proved on a small fixture build in the locked Chromium: the owned static
 * server (MIME, navigation fallback, asset 404s, traversal, identity), the build manifest (stale,
 * foreign and edited builds), and the runner's cells: readiness, axe, fresh storage, a production-only
 * stylesheet defect, a missing asset, an element fixture's definitions and bundle, the clipboard grant,
 * a stuck readiness condition, a deadline, cancellation, a browser that cannot launch, a declared capability
 * removal and an absent case.
 * The real matrix runs through `pnpm --filter @ultima/docs test:production`.
 */
import assert from 'node:assert/strict';
import { copyFileSync, existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { after, describe, test } from 'node:test';
import { fileURLToPath } from 'node:url';

import { type BuildManifest, createManifest, hashBuild, manifestProblems, readManifest } from '../../apps/docs/scripts/build-manifest.ts';
import { BUILD_MANIFEST, productionAdapter } from '../../apps/docs/scripts/production-adapter.ts';
import { SOFTWARE_WEBGL_ARGS, type Cell, type RunnerOptions, installedAxe, runCells } from '../../apps/docs/scripts/production-runner.ts';
import { internal, launchChromium, selectCells } from '../../apps/docs/scripts/production.ts';
import { IDENTITY_PATH, isNavigation, resolveFile, startStaticServer, verifyIdentity } from '../../apps/docs/scripts/static-server.ts';
import { productionPlan, runStandalone } from '../../apps/docs/scripts/test-production.ts';
import { loadCatalogue } from '../catalogue/model.ts';
import { casesFor, loadVerification, repositoryFiles } from './model.ts';
import type { ProductionContext } from './production.ts';
import type { AdapterContext } from './run.ts';

const here = dirname(fileURLToPath(import.meta.url));
const ROOT = join(here, '../..');
const scratch = mkdtempSync(join(tmpdir(), 'ultima-production-'));
after(() => rmSync(scratch, { recursive: true, force: true }));

const FONT = join(ROOT, 'apps/docs/public/fonts/figtree-latin-wght-normal.woff2');

/** A tiny production-shaped build: a shell with a main landmark, a self-hosted face, a stylesheet and a script. */
function site(overrides: Record<string, string> = {}): string {
  const root = mkdtempSync(join(scratch, 'site-'));
  const files: Record<string, string> = {
    'index.html': `<!doctype html><html lang="en"><head><meta charset="utf-8"><title>Fixture</title>
<link rel="stylesheet" href="/assets/app.css"><script type="module" src="/assets/app.js"></script></head>
<body><div id="root"></div></body></html>`,
    'assets/app.css': `@font-face { font-family: 'Figtree'; src: url('/fonts/plex.woff2') format('woff2'); }
body { font-family: 'Figtree', sans-serif; background: #ffffff; color: #111111; }
.panel { background-color: rgb(20, 21, 22); color: #ffffff; padding: 8px; }`,
    'assets/app.js': `const root = document.getElementById('root');
root.innerHTML = '<main><h1>Fixture</h1><p class="panel" id="panel">Painted</p><button type="button">Press</button></main>';`,
    ...overrides,
  };
  for (const [path, text] of Object.entries(files)) {
    mkdirSync(dirname(join(root, path)), { recursive: true });
    writeFileSync(join(root, path), text);
  }
  mkdirSync(join(root, 'fonts'), { recursive: true });
  copyFileSync(FONT, join(root, 'fonts/plex.woff2'));
  return root;
}

const VARIANT = { mode: 'dark', viewport: 'desktop', motion: 'normal' } as const;

function cell(caseId: string, run: (context: ProductionContext) => Promise<void>, variant: Cell['variant'] = VARIANT): Cell {
  return { caseId, scenario: caseId.split('@')[0] as string, variant, binding: 'fixture', run };
}

/** The panel paints the color the fixture's own stylesheet sets. */
const painted: Cell['run'] = async ({ page, open, axe }) => {
  await open('/');
  await axe('fixture ready');
  const background = await page.locator('#panel').evaluate((element) => getComputedStyle(element).backgroundColor);
  assert.equal(background, 'rgb(20, 21, 22)', 'the panel paints its contracted surface');
};

async function runOn(root: string, cells: Cell[], extra: Partial<RunnerOptions> = {}) {
  const server = await startStaticServer({ root, nonce: 'n', manifestDigest: 'd' });
  const evidence = mkdtempSync(join(scratch, 'evidence-'));
  const run = () =>
    runCells({
      baseUrl: server.url,
      cells,
      evidence,
      relativeTo: evidence,
      revision: 'fixture',
      launch: launchChromium,
      axeSource: installedAxe(),
      limits: { conditionMs: 1500, cellMs: 20_000 },
      ...extra,
    });
  try {
    let result = await run();
    // A browser that never launches or dies before any cell runs is infrastructure, not a verdict; retry once.
    if (result.cells.every((c) => /^the browser (could not launch|disconnected)/.test(c.failure?.message ?? ''))) result = await run();
    return { result, evidence, requests: server.requests };
  } finally {
    await server.close();
  }
}

describe('the static server', () => {
  test('binds loopback port 0, serves files with their MIME type and answers its identity', async () => {
    const root = site();
    const server = await startStaticServer({ root, nonce: 'abc', manifestDigest: 'digest' });
    try {
      assert.match(server.url, /^http:\/\/127\.0\.0\.1:\d+$/);
      assert.notEqual(server.port, 0);
      const script = await fetch(`${server.url}/assets/app.js`);
      assert.equal(script.status, 200);
      assert.match(script.headers.get('content-type') ?? '', /^text\/javascript/);
      assert.match((await fetch(`${server.url}/assets/app.css`)).headers.get('content-type') ?? '', /^text\/css/);
      assert.equal((await fetch(`${server.url}/fonts/plex.woff2`)).headers.get('content-type'), 'font/woff2');
      assert.deepEqual(await (await fetch(`${server.url}${IDENTITY_PATH}`)).json(), { nonce: 'abc', manifest: 'digest' });
      assert.equal(await verifyIdentity(server.url, 'abc', 'digest', 1000), null);
      assert.match((await verifyIdentity(server.url, 'other', 'digest', 1000)) ?? '', /foreign nonce/);
      assert.match((await verifyIdentity(server.url, 'abc', 'stale', 1000)) ?? '', /different build manifest/);
    } finally {
      await server.close();
    }
  });

  test('falls back to index.html for an HTML navigation only; a missing asset is a 404, never the shell', async () => {
    const root = site();
    const server = await startStaticServer({ root, nonce: 'n', manifestDigest: 'd' });
    const html = { headers: { accept: 'text/html,application/xhtml+xml' } };
    try {
      const route = await fetch(`${server.url}/components/dialog`, html);
      assert.equal(route.status, 200);
      assert.match(await route.text(), /<div id="root">/);
      for (const path of ['/assets/missing.js', '/assets/missing', '/missing.css', '/fonts/missing.woff2']) {
        const response = await fetch(`${server.url}${path}`, html);
        assert.equal(response.status, 404, path);
        assert.doesNotMatch(await response.text(), /<div id="root">/, `${path} never receives the app shell`);
      }
      assert.equal((await fetch(`${server.url}/components/dialog`, { headers: { accept: '*/*' } })).status, 404, 'a script-style request gets no fallback');
      assert.equal((await fetch(`${server.url}/`, { method: 'POST' })).status, 405);
      assert.equal(isNavigation('GET', '/theme-studio', 'text/html'), true);
      assert.equal(isNavigation('GET', '/assets/index.js', 'text/html'), false);
    } finally {
      await server.close();
    }
  });

  test('refuses paths that escape the build root, encoded or through a symlink', async () => {
    const root = site();
    const outside = mkdtempSync(join(scratch, 'outside-'));
    writeFileSync(join(outside, 'secret.txt'), 'secret');
    symlinkSync(join(outside, 'secret.txt'), join(root, 'linked.txt'));
    assert.equal(resolveFile(root, '/../secret.txt'), 'outside');
    assert.equal(resolveFile(root, '/%2e%2e/secret.txt'), 'outside');
    assert.equal(resolveFile(root, '/linked.txt'), 'outside');
    assert.equal(resolveFile(root, '/%E0%A4%A'), 'outside', 'an undecodable path is refused');
    const server = await startStaticServer({ root, nonce: 'n', manifestDigest: 'd' });
    try {
      for (const path of ['/%2e%2e/%2e%2e/etc/passwd', '/linked.txt', '/..%2fsecret.txt']) {
        const response = await fetch(`${server.url}${path}`);
        assert.ok([403, 404].includes(response.status), `${path} answered ${response.status}`);
        assert.doesNotMatch(await response.text(), /secret/);
      }
    } finally {
      await server.close();
    }
  });
});

describe('the build manifest', () => {
  function built() {
    const source = mkdtempSync(join(scratch, 'source-'));
    const root = join(source, 'dist');
    mkdirSync(join(root, 'assets'), { recursive: true });
    writeFileSync(join(root, 'index.html'), '<main></main>');
    writeFileSync(join(root, 'assets/app.js'), 'console.log(1)');
    const manifest = createManifest({ source, root: 'dist', sourceDigest: 'a'.repeat(64), head: null, argv: ['pnpm', 'build'], cwd: '.' });
    return { source, root, manifest };
  }

  test('describes a production build of one source whose served files match', () => {
    const { root, manifest } = built();
    assert.equal(manifest.mode, 'production');
    assert.deepEqual(manifest.files.map((file) => file.path), ['assets/app.js', 'index.html']);
    assert.deepEqual(manifestProblems(manifest, 'a'.repeat(64), root), []);
    assert.equal(hashBuild(root).digest, manifest.digest);
  });

  test('rejects a stale or foreign source, an edited, missing or extra file, and an unreadable manifest', () => {
    const { root, manifest } = built();
    assert.match(manifestProblems(manifest, 'b'.repeat(64), root).join(), /stale or foreign build/);
    writeFileSync(join(root, 'assets/app.js'), 'console.log(2)');
    writeFileSync(join(root, 'assets/extra.js'), '');
    rmSync(join(root, 'index.html'));
    const problems = manifestProblems(manifest, 'a'.repeat(64), root).join('\n');
    assert.match(problems, /assets\/app\.js changed after the build/);
    assert.match(problems, /index\.html is in the manifest but missing/);
    assert.match(problems, /assets\/extra\.js is served but not in the manifest/);
    const path = join(scratch, 'broken.json');
    writeFileSync(path, '{');
    assert.ok('failure' in readManifest(path));
    writeFileSync(path, JSON.stringify({ ...manifest, mode: 'development' }));
    assert.ok('failure' in readManifest(path));
  });
});

describe('the runner', () => {
  test('passes a ready, accessible cell and keeps a labelled settled screenshot but no trace', async () => {
    const { result, evidence } = await runOn(site(), [cell('fixture.paint@production[dark]', painted)]);
    assert.equal(result.status, 'passed', JSON.stringify(result.cells[0]?.failure));
    const [only] = result.cells;
    assert.equal(only?.status, 'passed');
    assert.deepEqual(only?.initialStorage, { local: 0, session: 0 });
    assert.equal(only?.axe.length, 1);
    assert.match(result.browser.version ?? '', /^\d+\./);
    assert.deepEqual(only?.artifacts.map((a) => a.kind), ['screenshot']);
    assert.match(only?.artifacts[0]?.label ?? '', /^fixture dark desktop fixture\.paint: settled final state$/);
    assert.ok(existsSync(join(evidence, only?.artifacts[0]?.path ?? '')));
  });

  test('gives every cell a fresh context: storage one cell writes never reaches the next', async () => {
    const writer: Cell['run'] = async ({ page, open, axe }) => {
      await open('/');
      await page.evaluate(() => {
        localStorage.setItem('leak', '1');
        sessionStorage.setItem('leak', '1');
      });
      await axe('written');
    };
    const reader: Cell['run'] = async ({ page, open, axe }) => {
      await open('/');
      assert.equal(await page.evaluate(() => localStorage.getItem('leak')), null, 'local storage starts empty');
      await axe('read');
    };
    const { result } = await runOn(site(), [cell('fixture.write@production[a]', writer), cell('fixture.read@production[b]', reader, { ...VARIANT, mode: 'light', viewport: 'narrow' })]);
    assert.deepEqual(result.cells.map((c) => c.status), ['passed', 'passed']);
    assert.deepEqual(result.cells[1]?.initialStorage, { local: 0, session: 0 });
  });

  test('a production-only stylesheet defect fails the computed-style assertion and keeps trace, image, DOM and ARIA evidence', async () => {
    const defect = site();
    writeFileSync(join(defect, 'assets/app.css'), `${readFileSync(join(defect, 'assets/app.css'), 'utf8')}\n.panel { background-color: transparent; }\n`);
    const { result, evidence } = await runOn(defect, [cell('fixture.paint@production[dark]', painted)]);
    assert.equal(result.status, 'failed');
    const [only] = result.cells;
    assert.equal(only?.failure?.kind, 'validation');
    assert.match(only?.failure?.message ?? '', /contracted surface/);
    assert.deepEqual(only?.artifacts.map((a) => a.kind).sort(), ['aria', 'dom', 'screenshot', 'trace']);
    for (const artifact of only?.artifacts ?? []) assert.ok(existsSync(join(evidence, artifact.path)), artifact.path);
  });

  test('a missing required asset fails readiness as a broken build, and the server never answered it with the shell', async () => {
    const broken = site();
    rmSync(join(broken, 'assets/app.js'));
    const { result, requests } = await runOn(broken, [cell('fixture.paint@production[dark]', painted)]);
    assert.equal(result.status, 'failed', `${result.cells[0]?.failure?.kind}: ${result.cells[0]?.failure?.message}; browser=${result.browser.error}`);
    assert.equal(result.cells[0]?.failure?.kind, 'validation');
    assert.match(result.cells[0]?.failure?.message ?? '', /GET \/assets\/app\.js: 404/);
    assert.deepEqual(requests.filter((r) => r.path === '/assets/app.js').map((r) => [r.status, r.file]), [[404, null]]);
  });

  test('a page error fails the cell even when its assertions pass', async () => {
    const noisy = site({ 'assets/extra.js': 'throw new Error("boom")' });
    writeFileSync(join(noisy, 'index.html'), readFileSync(join(noisy, 'index.html'), 'utf8').replace('</head>', '<script src="/assets/extra.js"></script></head>'));
    const { result } = await runOn(noisy, [cell('fixture.paint@production[dark]', painted)]);
    assert.equal(result.cells[0]?.failure?.kind, 'validation');
    assert.match(result.cells[0]?.failure?.message ?? '', /boom/);
  });

  test('a stuck readiness condition and a case with no axe check are incomplete, never retried into a pass', async () => {
    const bare = site({ 'assets/app.js': `document.getElementById('root').textContent = 'no landmark';` });
    const quiet: Cell['run'] = async ({ open }) => open('/');
    const { result } = await runOn(bare, [cell('fixture.stuck@production[a]', painted)]);
    assert.equal(result.status, 'incomplete');
    assert.equal(result.cells[0]?.failure?.kind, 'incomplete');
    assert.match(result.cells[0]?.failure?.message ?? '', /main landmark did not hold/);
    const second = await runOn(site(), [cell('fixture.quiet@production[a]', quiet)]);
    assert.equal(second.result.cells[0]?.failure?.kind, 'incomplete');
    assert.match(second.result.cells[0]?.failure?.message ?? '', /no axe check/);
  });

  test('a cell past its deadline times out, and the next cell still runs', async () => {
    const hang: Cell['run'] = async ({ open }) => {
      await open('/');
      await new Promise(() => {});
    };
    const { result } = await runOn(site(), [cell('fixture.hang@production[a]', hang), cell('fixture.paint@production[b]', painted)], { limits: { conditionMs: 1500, cellMs: 4000 } });
    assert.deepEqual(result.cells.map((c) => c.status), ['timed_out', 'passed']);
    assert.equal(result.status, 'incomplete');
    assert.match(result.cells[0]?.failure?.message ?? '', /exceeded its 4000ms deadline/);
  });

  test('cancellation stops the running cell, leaves the rest not run and closes the browser', async () => {
    const controller = new AbortController();
    let browserClosed = false;
    const launch = async () => {
      const browser = await launchChromium();
      browser.on('disconnected', () => {
        browserClosed = true;
      });
      return browser;
    };
    const waiting: Cell['run'] = async ({ open }) => {
      await open('/');
      controller.abort('SIGTERM');
      await new Promise(() => {});
    };
    const { result } = await runOn(site(), [cell('fixture.cancel@production[a]', waiting), cell('fixture.paint@production[b]', painted)], { signal: controller.signal, launch });
    assert.equal(result.status, 'cancelled');
    assert.deepEqual(result.cells.map((c) => c.status), ['cancelled', 'not_run']);
    assert.ok(browserClosed, 'the owned browser was closed');
  });

  test('an element fixture is ready only once every ult-* tag it uses is defined', async () => {
    const fixture = (script: string) =>
      site({
        'elements.html': `<!doctype html><html lang="en"><head><meta charset="utf-8"><title>Elements</title>
<script type="module" src="/elements/bundle.js"></script></head>
<body><main><h1>Elements</h1><ult-demo>Demo</ult-demo><ult-demo-part></ult-demo-part></main></body></html>`,
        'elements/bundle.js': script,
      });
    const defines = `customElements.define('ult-demo', class extends HTMLElement {}); customElements.define('ult-demo-part', class extends HTMLElement {});`;
    const visit: Cell['run'] = async ({ page, openFixture, axe }) => {
      await openFixture('/elements.html');
      assert.ok(await page.evaluate(() => customElements.get('ult-demo') !== undefined));
      await axe('fixture ready');
    };
    assert.equal((await runOn(fixture(defines), [cell('fixture.elements@production[a]', visit)])).result.status, 'passed', 'a fixture needs no self-hosted face');

    const partial = await runOn(fixture(`customElements.define('ult-demo', class extends HTMLElement {});`), [cell('fixture.elements@production[a]', visit)]);
    assert.equal(partial.result.cells[0]?.failure?.kind, 'incomplete', 'an undefined element is never ready');
    assert.match(partial.result.cells[0]?.failure?.message ?? '', /ult-demo-part never defined/);

    const broken = fixture(defines);
    rmSync(join(broken, 'elements/bundle.js'));
    const missing = await runOn(broken, [cell('fixture.elements@production[a]', visit)]);
    assert.equal(missing.result.status, 'failed', 'a broken bundle reference is a defect');
    assert.match(missing.result.cells[0]?.failure?.message ?? '', /GET \/elements\/bundle\.js: 404/);
    assert.deepEqual(missing.requests.filter((r) => r.path === '/elements/bundle.js').map((r) => [r.status, r.file]), [[404, null]], 'the bundle never received the app shell');
  });

  test('clipboard access is granted per cell, to the served origin, only when the binding asks', async () => {
    const copy = (grant: boolean): Cell['run'] => async ({ page, open, grantClipboard, axe }) => {
      if (grant) await grantClipboard();
      await open('/');
      await page.evaluate(() => navigator.clipboard.writeText('copied'));
      assert.equal(await page.evaluate(() => navigator.clipboard.readText()), 'copied');
      await axe('copied');
    };
    const { result } = await runOn(site(), [cell('fixture.copy@production[a]', copy(true)), cell('fixture.denied@production[b]', copy(false))]);
    assert.equal(result.cells[0]?.status, 'passed', result.cells[0]?.failure?.message ?? '');
    assert.match(result.cells[0]?.permissions.join() ?? '', /^clipboard-read, clipboard-write for http:\/\/127\.0\.0\.1:\d+$/);
    assert.equal(result.cells[1]?.status, 'failed', 'the next cell starts without the grant');
    assert.deepEqual(result.cells[1]?.permissions, []);
  });

  test('a declared removal takes WebGL away before load, and only cells that require WebGL get the software-WebGL browser', async () => {
    const webgl = (expected: boolean): Cell['run'] => async ({ page, open, axe }) => {
      await open('/');
      const found = await page.evaluate(() => ({
        canvas: document.createElement('canvas').getContext('webgl') !== null,
        offscreen: new OffscreenCanvas(1, 1).getContext('webgl2') !== null,
        flat: document.createElement('canvas').getContext('2d') !== null,
      }));
      assert.deepEqual(found, { canvas: expected, offscreen: expected, flat: true });
      await axe('probed');
    };
    const launched: string[] = [];
    const launch = async () => (launched.push('default'), launchChromium());
    const launchWebgl = async () => (launched.push('webgl'), launchChromium(SOFTWARE_WEBGL_ARGS));
    const without = { ...cell('fixture.without@production[a]', webgl(false)), remove: ['webgl' as const] };
    const needs = { ...cell('fixture.needs@production[b]', webgl(true)), require: ['webgl' as const] };
    const { result } = await runOn(site(), [without, needs], { launch, launchWebgl, webglArgs: SOFTWARE_WEBGL_ARGS });
    assert.equal(result.cells[0]?.status, 'passed', result.cells[0]?.failure?.message ?? '');
    assert.equal(result.cells[1]?.status, 'passed', result.cells[1]?.failure?.message ?? '');
    assert.deepEqual(result.cells.map((c) => c.removed), [['webgl'], []]);
    assert.deepEqual(launched, ['default', 'webgl']);
    assert.deepEqual(result.webgl?.args, SOFTWARE_WEBGL_ARGS);
    assert.match(result.webgl?.renderer ?? '', /SwiftShader/, 'WebGL runs on the software renderer enabled at launch');
    assert.deepEqual(result.cells.map((c) => c.renderer), [null, result.webgl?.renderer]);

    launched.length = 0;
    const plain = await runOn(site(), [cell('fixture.paint@production[c]', painted)], { launch, launchWebgl });
    assert.equal(plain.result.cells[0]?.status, 'passed');
    assert.deepEqual(launched, ['default'], 'no cell requires WebGL, so no software-WebGL browser starts');
    assert.equal(plain.result.webgl, null);
  });

  test('a software-WebGL browser that cannot start leaves its cells incomplete and is still closed', async () => {
    let closed = false;
    const launchWebgl = async () => {
      const browser = await launchChromium(SOFTWARE_WEBGL_ARGS);
      browser.on('disconnected', () => (closed = true));
      browser.newPage = async () => {
        throw new Error('no page for the renderer probe');
      };
      return browser;
    };
    const needs = { ...cell('fixture.needs@production[a]', painted), require: ['webgl' as const] };
    const { result } = await runOn(site(), [needs, cell('fixture.paint@production[b]', painted)], { launchWebgl });
    assert.equal(result.cells[0]?.failure?.kind, 'incomplete');
    assert.match(result.cells[0]?.failure?.message ?? '', /software-WebGL browser could not start: no page for the renderer probe/);
    assert.equal(result.cells[1]?.status, 'passed', 'cells in the default browser still run');
    assert.equal(result.status, 'incomplete');
    assert.ok(closed, 'the browser whose probe failed is closed');
  });

  test('a browser that cannot launch leaves every cell incomplete with the reason', async () => {
    const launch = async () => {
      const { chromium } = await import('playwright');
      return chromium.launch({ executablePath: join(scratch, 'no-such-chromium') });
    };
    const { result } = await runOn(site(), [cell('fixture.paint@production[a]', painted)], { launch });
    assert.equal(result.status, 'incomplete');
    assert.equal(result.browser.launch, 'failed');
    assert.equal(result.cells[0]?.status, 'not_run');
    assert.match(result.cells[0]?.failure?.message ?? '', /could not launch/);
  });
});

const cases = ['dialog.keyboard-dismissal@production[mode=dark,viewport=desktop,motion=normal]'];

describe('the internal entry', () => {
  function manifestFor(root: string, sourceDigest: string): string {
    const manifest: BuildManifest = { schemaVersion: 1, kind: 'docs-production-build', source: { digest: sourceDigest, head: null }, mode: 'production', command: { argv: ['x'], cwd: '.' }, root, builtAt: '', ...hashBuild(root) };
    const path = join(mkdtempSync(join(scratch, 'manifest-')), 'build-manifest.json');
    writeFileSync(path, JSON.stringify(manifest));
    return path;
  }

  const options = (manifest: string, extra = {}) => ({ source: ROOT, manifest, sourceDigest: 'c'.repeat(64), cases, evidence: mkdtempSync(join(scratch, 'internal-')), relativeTo: scratch, revision: 'test', deadlineMs: 60_000, ...extra });

  test('resolves each expected case to its registered binding, and reports one that no scenario declares', async () => {
    const { cells, problems } = await selectCells(ROOT, [...cases, 'dialog.keyboard-dismissal@production[mode=sepia]']);
    assert.deepEqual(cells.map((c) => [c.caseId, c.binding, c.variant.viewport]), [[cases[0], 'apps/docs/tests/production/dialog.keyboard-dismissal.ts', 'desktop']]);
    assert.match(problems.join(), /mode=sepia\] is expected but no registered production scenario declares it/);
  });

  test('carries the capabilities a scenario requires or removes onto each of its cells', async () => {
    const landing = (id: string, mode: string) => `site-landing.${id}@production[mode=${mode},viewport=narrow,motion=normal]`;
    const { cells, problems } = await selectCells(ROOT, [landing('without-field', 'dark'), landing('dot-field', 'light')]);
    assert.deepEqual(problems, []);
    assert.deepEqual(cells.map((c) => [c.scenario, c.require, c.remove]), [
      ['site-landing.without-field', [], ['webgl']],
      ['site-landing.dot-field', ['webgl'], []],
    ]);
  });

  test('refuses a stale or foreign manifest before any browser starts', async () => {
    const root = site();
    const { exit, report } = await internal(options(manifestFor(root, 'd'.repeat(64)), { launch: async () => assert.fail('no browser may start') }));
    assert.equal(exit, 3);
    assert.match(report.reason, /stale or foreign build/);
    assert.equal(report.server.identity, 'not_started');
  });

  test('refuses a server that answers with a foreign identity', async () => {
    const root = site();
    const { exit, report } = await internal(options(manifestFor(root, 'c'.repeat(64)), { identityNonce: 'someone-else', launch: async () => assert.fail('no browser may start') }));
    assert.equal(exit, 3);
    assert.equal(report.server.identity, 'failed');
    assert.match(report.reason, /foreign nonce/);
  });
});

describe('the adapter and the standalone command', () => {
  test('the production adapter needs this run’s build manifest and never passes without one', async () => {
    const run = mkdtempSync(join(scratch, 'run-'));
    mkdirSync(join(run, 'artifacts'), { recursive: true });
    writeFileSync(join(run, 'artifacts/source-manifest.json'), JSON.stringify({ digest: 'e'.repeat(64) }));
    const context = { run, artifacts: join(run, 'artifacts'), source: ROOT, check: { cases }, remainingMs: () => 60_000, launch: async () => assert.fail('nothing launches without a manifest') } as unknown as AdapterContext;
    const report = await productionAdapter.run(context);
    assert.equal(report.verdict, 'incomplete');
    assert.match(report.reason ?? '', new RegExp(BUILD_MANIFEST.replace('/', '\\/')));
  });

  test('the standalone plan is the release plan’s docs build and every registered production case', () => {
    const plan = productionPlan(ROOT);
    assert.ok(!('failure' in plan));
    assert.deepEqual(plan.checks.map((c) => [c.id, c.prerequisites]), [['docs-build', []], ['production-scenarios', ['docs-build']]]);
    const files = repositoryFiles(ROOT);
    const { model } = loadVerification(files, loadCatalogue(files).catalogue);
    assert.deepEqual(plan.checks[1]?.cases, casesFor(model, 'production'), 'the plan runs exactly what the joined model registers');
    assert.equal(plan.checks[1]?.cases.length, 28 + 4 + 12);
  });

  test('the standalone command takes only its own options and prints help', async () => {
    assert.equal((await runStandalone(['--frobnicate'])).exit, 2);
    assert.equal((await runStandalone(['--timeout', '0'])).exit, 2);
    const help = await runStandalone(['--help']);
    assert.equal(help.exit, 0);
    assert.match(help.stdout, /not a release result/);
  });
});
