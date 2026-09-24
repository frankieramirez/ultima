/**
 * The browser, build and install adapters (#461): each build and smoke log parses into the verdict the
 * verification contract assigns, a real Chromium starts under Vitest's browser mode, a real Vite build
 * leaves the manifest the production adapter reads, the scoped docs suite reuses the registry only when
 * it is provably the one registry-build wrote, the smoke runs under the run's TMPDIR against its own
 * loopback server, and a release run with every check passed still cannot pass while obligations are
 * pending.
 */
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { chmodSync, existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { after, describe, test } from 'node:test';
import { fileURLToPath } from 'node:url';

import { manifestProblems, readManifest } from '../../apps/docs/scripts/build-manifest.ts';
import { BUILD_MANIFEST } from '../../apps/docs/scripts/production-adapter.ts';
import { IDENTITY, contextFor, planned } from './adapter-context.ts';
import { ADAPTERS, REGISTRY_OUTPUTS, registryOutputs } from './adapters.ts';
import { type CheckId, RELEASE_PENDING, check } from './checks.ts';
import type { Plan, PlannedCheck } from './plan.ts';
import { type Adapters, EXIT, executeRun, judge } from './run.ts';
import { docsBuild, plain, registryBuild, smoke, smokeTargets } from './tool-reports.ts';

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, '../..');
const scratch = mkdtempSync(join(tmpdir(), 'ultima-browser-build-'));
after(() => rmSync(scratch, { recursive: true, force: true }));

function write(directory: string, files: Record<string, string>) {
  for (const [path, text] of Object.entries(files)) {
    mkdirSync(dirname(join(directory, path)), { recursive: true });
    writeFileSync(join(directory, path), text);
  }
}

async function runAdapter(id: CheckId, source: string, changes: Partial<PlannedCheck> = {}, options: Parameters<typeof contextFor>[3] = {}) {
  const entry = planned(id, changes);
  const context = contextFor(scratch, source, entry, options);
  const report = await (ADAPTERS[id] as NonNullable<Adapters[CheckId]>).run(context);
  const expected = [...new Set([...entry.files.filter((file) => file.present).map((file) => file.path), ...(report.expected ?? [])])];
  return { report, judged: judge(report, expected), context };
}

const FAMILIES = ['ult-button', 'ult-tabs'];

const REGISTRY_LOG = [
  '@ultima/tokens: wrote dist/tokens.css and dist/tokens.json (105 tokens, 49 pairings pass)',
  '@ultima/elements: wrote dist/ult-button.js (14278 B, 3.7 KB gzipped, budget 5 KB)',
  '@ultima/elements: wrote dist/ult-tabs.js (50532 B, 16.2 KB gzipped, budget 17 KB)',
  '@ultima/elements: wrote dist/ultima.js (120698 B, 36.9 KB gzipped, budget 40 KB)',
  '✔ Building registry.',
  'registry: built 68 items into apps/docs/public/r',
].join('\n');

const VITE_LOG = ['vite v8.2.2 building client environment for production...', '✓ 6202 modules transformed.', 'dist/index.html  1.89 kB', '✓ built in 2.24s'].join('\n');

describe('build and smoke logs', () => {
  test('registry:build: tokens, every family bundle, its budget and the registry are coverage; its own failures fail validation', () => {
    const passed = registryBuild(REGISTRY_LOG, 0, FAMILIES);
    assert.equal(passed.verdict, 'passed');
    assert.deepEqual(passed.expected, ['build:tokens', 'bundle:ult-button', 'bundle:ult-tabs', 'bundle:ultima', 'registry:items and stamps']);
    assert.ok(passed.executed.includes('budget:ult-tabs'));
    assert.deepEqual(judge({ ...passed, process: null }, passed.expected ?? []).status, 'passed');

    const missingFamily = registryBuild(REGISTRY_LOG, 0, [...FAMILIES, 'ult-tooltip']);
    assert.match(judge({ ...missingFamily, process: null }, missingFamily.expected ?? []).reason, /expected coverage did not execute: bundle:ult-tooltip/);

    const over = registryBuild('@ultima/elements: dist/ult-tabs.js is 60000 B, 18.1 KB gzipped, over the recorded 17 KB budget', 1, FAMILIES);
    assert.equal(over.verdict, 'validation-failure');
    assert.deepEqual(over.failures, ['@ultima/elements: dist/ult-tabs.js is 60000 B, 18.1 KB gzipped, over the recorded 17 KB budget']);

    const stamp = registryBuild(`${REGISTRY_LOG.split('\n').slice(0, 4).join('\n')}\nError: /r/button.json lost meta.ultima\n    at verifyStamps (file:///x/scripts/build-registry.ts:333:7)`, 1, FAMILIES);
    assert.deepEqual(stamp.failures, ['scripts/build-registry.ts: /r/button.json lost meta.ultima']);

    const npx = registryBuild('Error: Command failed: npx -y shadcn@4.21.0 build\n    at shadcnBuild (file:///x/scripts/build-registry.ts:283:3)', 1, FAMILIES);
    assert.equal(npx.verdict, 'incomplete', 'npx failing to fetch shadcn says nothing about the source');
    assert.equal(registryBuild('', 137, FAMILIES).verdict, 'incomplete');
  });

  test('the docs build: the registry, Vite in production mode and the manifest are coverage; a compile error fails validation', () => {
    const passed = docsBuild(`${REGISTRY_LOG}\n${VITE_LOG}`, 0, FAMILIES);
    assert.equal(passed.verdict, 'passed');
    assert.equal(passed.mode, 'production');
    assert.equal(passed.builder, 'vite v8.2.2');
    assert.ok(passed.executed.includes('build:vite'));

    const broken = docsBuild(`${REGISTRY_LOG}\nvite v8.2.2 building client environment for production...\nerror during build:\n[UNRESOLVED_IMPORT] Could not resolve './missing' in src/main.tsx\n`, 1, FAMILIES);
    assert.equal(broken.verdict, 'validation-failure');
    assert.deepEqual(broken.failures, ["vite build: [UNRESOLVED_IMPORT] Could not resolve './missing' in src/main.tsx"]);

    assert.match(docsBuild(`${REGISTRY_LOG}\n${VITE_LOG.replace('production', 'development')}`, 0, FAMILIES).reason ?? '', /not production/);
    assert.equal(docsBuild(`${REGISTRY_LOG}\n`, 1, FAMILIES).verdict, 'incomplete');
  });

  test('coloured output reads as plain text: FORCE_COLOR turns picocolors on at any value, 0 included', () => {
    const colouredVite = [
      '\x1b[36mvite v8.2.2 \x1b[32mbuilding client environment for production...\x1b[36m\x1b[39m',
      '\x1b[32m✓\x1b[39m 6202 modules transformed.',
      '\x1b[2mdist/\x1b[22m\x1b[32mindex.html  \x1b[39m\x1b[1m\x1b[2m1.89 kB\x1b[22m\x1b[1m\x1b[22m',
      '\x1b[32m✓ built in 2.24s\x1b[39m',
    ].join('\n');
    const colouredRegistry = REGISTRY_LOG.split('\n').map((line) => `\x1b[2m${line}\x1b[22m`).join('\n');
    const passed = docsBuild(`${colouredRegistry}\n${colouredVite}`, 0, FAMILIES);
    assert.equal(passed.verdict, 'passed', passed.reason ?? '');
    assert.equal(passed.mode, 'production');
    assert.equal(passed.builder, 'vite v8.2.2');
    assert.deepEqual(passed.executed, docsBuild(`${REGISTRY_LOG}\n${VITE_LOG}`, 0, FAMILIES).executed);

    const broken = docsBuild(`${colouredRegistry}\n${colouredVite.split('\n')[0]}\n\x1b[31merror during build:\n\x1b[31m[UNRESOLVED_IMPORT] Could not resolve './missing' in src/main.tsx\x1b[39m\n`, 1, FAMILIES);
    assert.deepEqual(broken.failures, ["vite build: [UNRESOLVED_IMPORT] Could not resolve './missing' in src/main.tsx"]);
    // An OSC 8 hyperlink around a path leaves only its text.
    assert.equal(plain('\x1b]8;;file:///x/a.ts\x07a.ts\x1b]8;;\x07 and \x1b]8;;https://x\x1b\\b\x1b]8;;\x1b\\'), 'a.ts and b');
  });

  const URL = 'http://127.0.0.1:41234';
  const SMOKE_PASS = [
    '── building the registry',
    `smoke-install: serving ${URL}`,
    '── building the CLI',
    'smoke-install: packed ultima-systems-cli-0.1.0.tgz',
    'smoke-install: the catalogue is 52 components',
    '── vite: scaffolding',
    `── vite: npx shadcn add ${URL}/r/setup-vite.json`,
    'smoke-install: 60 installed files carry their item stamp',
    '── vite: npm run build',
    '── next: scaffolding',
    '── next: npm run build',
    '── sidebar: scaffolding',
    '── element: scaffolding',
    '── element: a reinstall overwrites the vendored file',
    '',
    `smoke-install: every target passed against ${URL}`,
    'smoke-install: kept /tmp/run/ultima-smoke.abc',
  ].join('\n');
  const TARGETS = ['vite', 'next', 'sidebar', 'element'];

  test('the smoke script declares the four consumer targets the adapter expects', () => {
    assert.deepEqual(smokeTargets(readFileSync(join(root, 'scripts/smoke-install.sh'), 'utf8')), TARGETS);
  });

  test('smoke: the local build, the packed CLI, the catalogue and each finished target are coverage, against the one loopback URL', () => {
    const passed = smoke(SMOKE_PASS, 0, TARGETS);
    assert.equal(passed.verdict, 'passed');
    assert.equal(passed.url, URL);
    assert.equal(passed.work, '/tmp/run/ultima-smoke.abc');
    assert.equal(judge({ ...passed, process: null }, passed.expected ?? []).status, 'passed');
    assert.ok(passed.executed.includes('smoke:step:vite: npx shadcn add $HOST/r/setup-vite.json'), 'step IDs do not carry the run-owned port');

    const cut = SMOKE_PASS.split('\n').slice(0, 11).join('\n');
    const early = smoke(`${cut}\n`, 0, TARGETS);
    assert.equal(early.verdict, 'incomplete', 'exit 0 without the closing line is not a pass');

    const deployed = smoke(SMOKE_PASS.replace(/── building the registry\nsmoke-install: serving \S+\n/, ''), 0, TARGETS);
    assert.match(deployed.reason ?? '', /started no local server of its own/);

    assert.match(smoke(SMOKE_PASS.replaceAll(URL, 'https://ultima.systems'), 0, TARGETS).reason ?? '', /not a loopback address/);
  });

  test('smoke: a failed assertion or a consumer compile error fails validation; a network failure short of one is incomplete', () => {
    const head = SMOKE_PASS.split('\n').slice(0, 7).join('\n');
    const lost = smoke(`${head}\nsmoke-install: these installed files lost their item stamp or moved it: components/ui/button.tsx\nsmoke-install: FAILED in the vite target\n`, 1, TARGETS);
    assert.equal(lost.verdict, 'validation-failure');
    assert.deepEqual(lost.failures, ['vite: these installed files lost their item stamp or moved it: components/ui/button.tsx']);
    assert.ok(lost.executed.includes('smoke:cli packed'));
    assert.ok(!lost.executed.includes('smoke:target:vite'));

    const compile = smoke(`${head}\n── vite: npm run build\nsrc/components/ui/dialog.tsx(4,10): error TS2305: Module has no exported member\nsmoke-install: FAILED in the vite target\n`, 1, TARGETS);
    assert.equal(compile.verdict, 'validation-failure');
    assert.match(compile.failures?.[0] ?? '', /^vite: the consumer build rejected installed source: .*error TS2305/);

    const offline = smoke(`${head}\nnpm error code EAI_AGAIN\nnpm error request to https://registry.npmjs.org/create-vite failed\nsmoke-install: FAILED in the vite target\n`, 1, TARGETS);
    assert.equal(offline.verdict, 'incomplete');
    assert.match(offline.reason ?? '', /the network failed: npm error code EAI_AGAIN/);

    const server = smoke('── building the registry\nsmoke-install: the static server did not start\n', 1, TARGETS);
    assert.equal(server.verdict, 'incomplete');
  });
});

describe('real runners', () => {
  /** A fixture that resolves packages through a workspace package's own node_modules. */
  function linked(from: string, files: Record<string, string>) {
    const source = mkdtempSync(join(scratch, 'real-'));
    symlinkSync(join(root, from, 'node_modules'), join(source, 'node_modules'), 'dir');
    write(source, files);
    return source;
  }

  const VITEST = join(root, 'packages/ui/node_modules/vitest/vitest.mjs');
  const TESTS = 'packages/ui/src/__tests__';
  const browserConfig = `import { playwright } from '@vitest/browser-playwright';
import { defineConfig } from 'vitest/config';
export default defineConfig({ test: { fileParallelism: false, include: ['${TESTS}/**/*.test.ts'], browser: { enabled: true, headless: true, provider: playwright(), instances: [{ browser: 'chromium' }] } } });
`;
  const argv = [process.execPath, VITEST, 'run', '--reporter=verbose'];

  test('Vitest browser mode starts the locked Chromium: a pass, an assertion failure, and a browser that cannot launch', { timeout: 180_000 }, async () => {
    const source = linked('packages/ui', {
      'vitest.config.ts': browserConfig,
      [`${TESTS}/a.test.ts`]: "import { expect, test } from 'vitest';\ntest('renders in a real document', () => { document.body.innerHTML = '<p>ok</p>'; expect(document.querySelector('p')?.textContent).toBe('ok'); expect(navigator.userAgent).toMatch(/Chrome/); });\n",
    });
    const passed = await runAdapter('ui-tests', source, { argv });
    assert.equal(passed.judged.status, 'passed', passed.judged.reason);
    assert.ok(passed.report.executed.includes(`${TESTS}/a.test.ts > renders in a real document`));

    write(source, { [`${TESTS}/b.test.ts`]: "import { expect, test } from 'vitest';\ntest('breaks', () => expect(document.title).toBe('never'));\n" });
    const failed = await runAdapter('ui-tests', source, { argv });
    assert.equal(failed.judged.failure?.kind, 'validation', failed.judged.reason);
    assert.match(failed.report.failures?.[0] ?? '', /^packages\/ui\/src\/__tests__\/b\.test\.ts > breaks: /);
    assert.ok(failed.report.executed.includes(`${TESTS}/a.test.ts`), 'the independent file keeps its pass');

    rmSync(join(source, TESTS, 'b.test.ts'));
    const nowhere = mkdtempSync(join(scratch, 'no-browsers-'));
    const unlaunched = await runAdapter('ui-tests', source, { argv }, { env: { PLAYWRIGHT_BROWSERS_PATH: nowhere } });
    assert.equal(unlaunched.judged.status, 'failed');
    assert.equal(unlaunched.judged.failure?.kind, 'incomplete', 'a browser that never started proves nothing about the source');
    assert.match(unlaunched.judged.reason, /Vitest exited 1 without a failing test: Error: browserType\.launch: Executable doesn't exist/);
  });

  test('a real Vite build writes the manifest; a compile error in the source fails validation', { timeout: 120_000 }, async () => {
    const VITE = join(root, 'apps/docs/node_modules/vite/bin/vite.js');
    const source = linked('apps/docs', {
      'apps/docs/index.html': '<!doctype html><html><body><script type="module" src="./main.js"></script></body></html>\n',
      'apps/docs/main.js': "document.body.append('built');\n",
    });
    // The registry half of the docs script is proven above; here the Vite half runs for real.
    const build = [process.execPath, '-e', `process.stdout.write(${JSON.stringify(`${REGISTRY_LOG}\n`)})`];
    const vite = [process.execPath, VITE, 'build', 'apps/docs', '--logLevel', 'info'];
    const script = join(source, 'build.sh');
    writeFileSync(script, `#!/bin/sh\nset -e\n"${build[0]}" -e '${build[2]}'\n"${vite[0]}" "${vite[1]}" build apps/docs --logLevel info\n`);
    chmodSync(script, 0o755);
    const passed = await runAdapter('docs-build', source, { argv: ['./build.sh'] });
    // The fixture has no element catalogue, so the shared model expects the aggregate bundle alone.
    assert.equal(passed.judged.status, 'passed', passed.judged.reason);
    assert.ok(passed.report.executed.includes('build:vite') && passed.report.executed.includes('build:manifest'));

    // The manifest the production adapter reads: this snapshot's digest and exactly the bytes Vite wrote.
    const manifest = readManifest(join(passed.context.artifacts, BUILD_MANIFEST));
    assert.ok(!('failure' in manifest), 'failure' in manifest ? manifest.failure : '');
    assert.deepEqual(manifestProblems(manifest, IDENTITY.manifest.digest, join(source, 'apps/docs/dist')), []);
    assert.ok(manifest.files.some((file) => file.path === 'index.html'));
    const evidence = JSON.parse(readFileSync(join(passed.context.artifacts, 'docs-build.evidence.json'), 'utf8'));
    assert.match(evidence.notes.join('\n'), /^built by vite v\d\S* for production$/m);

    // A tool that colours regardless of the run's environment still gets a production verdict: here
    // the run's NO_COLOR is lifted and the caller's FORCE_COLOR=0, which picocolors reads as on, kept.
    const coloured = await runAdapter('docs-build', source, { argv: ['./build.sh'] }, { env: { FORCE_COLOR: '0', NO_COLOR: '' } });
    assert.equal(coloured.judged.status, 'passed', coloured.judged.reason);
    assert.match(readFileSync(coloured.context.log, 'utf8'), /\x1b\[/, 'the fixture must actually print escape codes');

    write(source, { 'apps/docs/main.js': "import './missing.js';\n" });
    const broken = await runAdapter('docs-build', source, { argv: ['./build.sh'] });
    assert.equal(broken.judged.failure?.kind, 'validation', broken.judged.reason);
    assert.match(broken.report.failures?.[0] ?? '', /^vite build: /);
    assert.ok(!(broken.report.artifacts ?? []).some((path) => path.endsWith(BUILD_MANIFEST)), 'a failed build leaves no manifest');
  });
});

describe('the scoped docs suite and the registry it needs', () => {
  const TESTS = 'apps/docs/src/__tests__';
  /** A workspace whose registry:build writes every output, and a stand-in Vitest that reports one test. */
  function workspace() {
    const source = mkdtempSync(join(scratch, 'scoped-'));
    const outputs = REGISTRY_OUTPUTS.map((path) => (/\.\w+$/.test(path) ? path : `${path}/x`));
    write(source, {
      'pnpm-workspace.yaml': 'packages: []\n',
      'package.json': JSON.stringify({
        name: 'fixture',
        private: true,
        scripts: { 'registry:build': `node -e "const fs=require('fs'),p=require('path');for(const f of ${JSON.stringify(outputs).replaceAll('"', "'")}){fs.mkdirSync(p.dirname(f),{recursive:true});fs.writeFileSync(f,'built')}"` },
      }),
      'vitest.mjs': `import { writeFileSync } from 'node:fs';
const out = process.argv.find((a) => a.startsWith('--outputFile.json=')).slice(18);
writeFileSync(out, JSON.stringify({ success: true, numTotalTests: 1, testResults: [{ name: process.cwd() + '/${TESTS}/a.test.tsx', status: 'passed', message: '', assertionResults: [{ fullName: 'holds', status: 'passed', failureMessages: [] }] }] }));
`,
    });
    return source;
  }
  const scoped = { scope: 'files' as const, argv: [process.execPath, 'vitest.mjs'], files: [{ path: `${TESTS}/a.test.tsx`, present: true, reasons: ['reached'] }] };

  test('reuses registry-build outputs only when they are the same snapshot, command and bytes; otherwise rebuilds first', async () => {
    const source = workspace();
    const registry = await runAdapter('registry-build', source, { argv: ['pnpm', 'run', 'registry:build'] });
    assert.ok(existsSync(join(registry.context.artifacts, 'registry-build.outputs.json')));
    const record = JSON.parse(readFileSync(join(registry.context.artifacts, 'registry-build.outputs.json'), 'utf8'));
    assert.deepEqual(record.outputs, registryOutputs(source));

    const equivalent = { ...record, argv: ['pnpm', 'registry:build'] };
    const reuse = async (value: object) => {
      const entry = planned('docs-tests', scoped);
      const context = contextFor(scratch, source, entry);
      writeFileSync(join(context.artifacts, 'registry-build.outputs.json'), JSON.stringify(value));
      const report = await (ADAPTERS['docs-tests'] as NonNullable<Adapters[CheckId]>).run(context);
      const evidence = JSON.parse(readFileSync(join(context.artifacts, 'docs-tests.evidence.json'), 'utf8'));
      return { report, notes: evidence.notes as string[], judged: judge(report, [`${TESTS}/a.test.tsx`]) };
    };

    const same = await reuse(equivalent);
    assert.equal(same.judged.status, 'passed', same.judged.reason);
    assert.match(same.notes.join('\n'), /^reused the registry-build outputs/);
    assert.equal(same.report.process?.argv[0], process.execPath, 'no rebuild ran');

    write(source, { 'packages/tokens/dist/x': 'rebuilt by another writer' });
    const changed = await reuse(equivalent);
    assert.match(changed.notes.join('\n'), /rebuilt the registry .* packages\/tokens\/dist changed/);
    assert.equal(changed.judged.status, 'passed', changed.judged.reason);

    assert.match((await reuse({ ...equivalent, source: 'b'.repeat(64) })).notes.join('\n'), /another snapshot/);
    assert.match((await reuse({ ...equivalent, argv: ['pnpm', 'other'] })).notes.join('\n'), /another command/);
  });
});

describe('the consumer smoke adapter', () => {
  /** A stand-in smoke script with the real one's output, and an `npm` that answers version queries offline. */
  function smokeFixture(body: string, parent = '${TMPDIR:-/tmp}') {
    const source = mkdtempSync(join(scratch, 'smoke-'));
    const bin = mkdtempSync(join(scratch, 'bin-'));
    write(bin, { npm: '#!/bin/sh\nif [ "$1" = "--version" ]; then echo 10.9.0; else echo "\\"1.2.3\\""; fi\n' });
    chmodSync(join(bin, 'npm'), 0o755);
    write(source, {
      'scripts/smoke-install.sh': `#!/usr/bin/env bash
set -euo pipefail
WORK="$(mktemp -d "${parent}/ultima-smoke.XXXXXX")"
trap 'echo "smoke-install: kept $WORK"' EXIT
${body}
vite_target
next_target
sidebar_target
element_target
`,
    });
    chmodSync(join(source, 'scripts/smoke-install.sh'), 0o755);
    return { source, env: { PATH: `${bin}:${process.env.PATH}` } };
  }
  const passing = `echo "── building the registry"
echo "smoke-install: serving http://127.0.0.1:40001"
echo "smoke-install: packed ultima-systems-cli-0.1.0.tgz"
echo "smoke-install: the catalogue is 52 components"
mkdir -p "$WORK/vite-app/node_modules/vite"
echo '{"devDependencies":{"vite":"^8"}}' > "$WORK/vite-app/package.json"
echo '{"version":"8.2.2"}' > "$WORK/vite-app/node_modules/vite/package.json"
echo '{"files":[]}' > "$WORK/status.json"
for t in vite next sidebar element; do echo "── $t: scaffolding"; done
echo "smoke-install: every target passed against http://127.0.0.1:40001"
exit 0`;

  test('runs under the run TMPDIR, records tool versions and consumer installs, and keeps the smoke evidence', async () => {
    const { source, env } = smokeFixture(passing);
    const { judged, report, context } = await runAdapter('consumer-smoke', source, {}, { env });
    assert.equal(judged.status, 'passed', judged.reason);
    const tools = JSON.parse(readFileSync(join(context.artifacts, 'consumer-smoke.tools.json'), 'utf8'));
    assert.equal(tools.url, 'http://127.0.0.1:40001');
    assert.equal(tools.tools.npm, '10.9.0');
    assert.equal(tools.tools['create-next-app@latest'], '1.2.3');
    assert.deepEqual(tools.installed, { 'vite-app': { vite: '8.2.2' } });
    assert.ok(tools.work.startsWith(tools.tmpdir), 'the consumers sit under the run TMPDIR');
    assert.ok(existsSync(join(context.artifacts, 'consumer-smoke/status.json')));
    assert.ok(report.artifacts?.includes('artifacts/consumer-smoke/vite-app.package.json'));
    assert.deepEqual(report.process?.argv, check('consumer-smoke').argv, 'the adapter runs the script with --keep and never --host');
  });

  test('a failed assertion fails validation; consumers outside the run TMPDIR are not the run’s', async () => {
    const failing = smokeFixture(`echo "── building the registry"
echo "smoke-install: serving http://127.0.0.1:40001"
echo "── vite: scaffolding"
echo "smoke-install: button.tsx did not arrive; the catalogue install is incomplete" >&2
echo "smoke-install: FAILED in the vite target" >&2
exit 1`);
    const failed = await runAdapter('consumer-smoke', failing.source, {}, { env: failing.env });
    assert.equal(failed.judged.failure?.kind, 'validation', failed.judged.reason);
    assert.deepEqual(failed.report.failures, ['vite: button.tsx did not arrive; the catalogue install is incomplete']);

    const outside = mkdtempSync(join(scratch, 'elsewhere-'));
    const elsewhere = smokeFixture(passing, outside);
    const foreign = await runAdapter('consumer-smoke', elsewhere.source, {}, { env: elsewhere.env });
    assert.equal(foreign.judged.failure?.kind, 'incomplete');
    assert.match(foreign.judged.reason, /not under the run's TMPDIR/);
  });
});

describe('a release run with every check passed', () => {
  test('nothing is pending once the production matrix is registered', () => {
    assert.deepEqual(RELEASE_PENDING, []);
  });

  test('still ends incomplete while a release obligation is pending: a build proves no interaction', async () => {
    const fixture = mkdtempSync(join(scratch, 'repository-'));
    write(fixture, {
      '.gitignore': '.scratch/\n',
      'build.mjs': `import { mkdirSync, writeFileSync } from 'node:fs';
mkdirSync('apps/docs/dist', { recursive: true });
writeFileSync('apps/docs/dist/index.html', '<!doctype html>');
console.log(${JSON.stringify(`${REGISTRY_LOG}\n${VITE_LOG}`)});
`,
    });
    for (const args of [['init', '-q'], ['add', '-A'], ['-c', 'user.name=F', '-c', 'user.email=f@example.com', '-c', 'commit.gpgsign=false', 'commit', '-q', '-m', 'base']]) {
      assert.equal(spawnSync('git', args, { cwd: fixture }).status, 0);
    }
    const plan = {
      schemaVersion: 1,
      command: 'release',
      status: 'planned',
      selectors: [],
      scope: 'release',
      checks: [planned('docs-build', { argv: [process.execPath, 'build.mjs'], prerequisites: [], after: [] })],
      outcome: { pending: ['the production matrix: a required scenario is not registered yet'] },
    } as unknown as Plan;
    const report = await executeRun({
      root: fixture,
      directory: join(mkdtempSync(join(scratch, 'out-')), 'run'),
      runId: 'build-run',
      command: 'release',
      selectors: [],
      planFrom: () => plan,
      adapters: ADAPTERS,
      preparation: { argv: [process.execPath, '-e', ''], deadlineSeconds: 30 },
      overallDeadlineSeconds: 120,
      deadlineSource: 'test',
      graceMs: 500,
    });
    const docs = report.checks.find((entry) => entry.id === 'docs-build');
    assert.equal(docs?.status, 'passed', docs?.reason ?? '');
    assert.ok(docs?.evidence.includes(`artifacts/${BUILD_MANIFEST}`));
    assert.equal(report.exit, EXIT.incomplete);
    assert.match(report.summary, /every check passed, but a release cannot pass while obligations are pending/);
    assert.match(report.scope.note, /Pending, so it cannot pass: the production matrix/);
  });
});
