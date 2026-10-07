import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { after, describe, test } from 'node:test';
import { fileURLToPath } from 'node:url';

import { execute, run } from '../verify.ts';
import { SCENARIO, scenario, validFixture } from './fixture.ts';

const root = join(dirname(fileURLToPath(import.meta.url)), '../..');
/** False when this suite runs inside a verification snapshot, which carries no `.git`. */
const inGit = spawnSync('git', ['rev-parse', '--show-toplevel'], { cwd: root, encoding: 'utf8' }).stdout.trim() === root.replace(/\/$/, '');
const scratch = mkdtempSync(join(tmpdir(), 'ultima-verify-'));
after(() => rmSync(scratch, { recursive: true, force: true }));

const json = (argv: string[], at = root) => {
  const output = run([...argv, '--json'], at);
  return { ...output, document: JSON.parse(output.stdout) };
};

function writeRepository(files: Record<string, string>): string {
  const directory = mkdtempSync(join(scratch, 'repo-'));
  for (const [path, text] of Object.entries(files)) {
    mkdirSync(dirname(join(directory, path)), { recursive: true });
    writeFileSync(join(directory, path), text);
  }
  return directory;
}

describe('pnpm verify list', () => {
  test('writes one versioned JSON document of the joined model', () => {
    const { exit, document } = json(['list']);
    assert.equal(exit, 0);
    assert.equal(document.schemaVersion, 1);
    assert.equal(document.status, 'discovered');
    assert.deepEqual(document.features.map((f: { id: string }) => f.id), ['blocks', 'catalogue', 'dialog', 'elements', 'motion', 'site-discovery', 'site-navigation', 'theme-studio']);
    assert.deepEqual(document.scenarios.map((s: { id: string }) => s.id), [
      'blocks.preview',
      'catalogue.filter-and-demo',
      'dialog.keyboard-dismissal',
      'elements.fixture-interactions',
      'motion.reduced-loop',
      'site-discovery.discovery-surface',
      'site-navigation.route-and-mode',
      'theme-studio.draft-history',
      'theme-studio.pane-boundaries',
    ]);
    assert.match(document.sourceManifest.digest, /^[0-9a-f]{64}$/);
    assert.deepEqual(
      document.modes.filter((m: { status: string }) => m.status === 'available').map((m: { mode: string }) => m.mode),
      ['list', 'describe', 'component', 'feature', 'changed', 'release'],
    );
    assert.ok(document.checks.some((c: { id: string; adapter: { status: string } }) => c.id === 'production-scenarios' && c.adapter.status === 'available'));
  });

  test('derives the same model twice', () => assert.deepEqual(json(['list']).document, json(['list']).document));

  for (const [prompt, first] of [
    ['Dialog Escape leaves focus behind', 'scenario dialog.keyboard-dismissal'],
    ['Reset theme undo lost my override', 'scenario theme-studio.draft-history'],
  ] as const) {
    test(`"${prompt}" ranks its registered scenario first, with owner, route and a runnable command`, () => {
      const { document } = json(['list', '--search', prompt]);
      const [top] = document.candidates;
      assert.equal(`${top.type} ${top.id}`, first);
      assert.ok(top.routes.length > 0 && top.bindings.every((b: { location: string | null }) => b.location));
      const described = json(['describe', 'scenario', top.id]).document.scenario;
      assert.ok(described.feature.id && described.routes.length > 0);
      assert.ok(described.targets.some((t: { commands: { status: string }[] }) => t.commands.some((c) => c.status === 'available')));
    });
  }

  test('"the picker broke" returns Date Picker as catalogue-only, with alternatives and reasons', () => {
    const { exit, document } = json(['list', '--search', 'the picker broke']);
    assert.equal(exit, 0);
    const [top, ...others] = document.candidates;
    assert.equal(top.id, 'date-picker');
    assert.equal(top.type, 'item');
    assert.ok(top.sources.includes('packages/ui/src/date-picker.tsx'));
    assert.equal(top.route, '/components/date-picker');
    assert.equal(top.registration.status, 'catalogue-only');
    assert.match(top.registration.note, /no executable feature scenario is registered/);
    assert.deepEqual(
      top.commands.map((c: { display: string; status: string }) => [c.display, c.status]),
      [
        ['pnpm verify component date-picker', 'available'],
        ['pnpm --filter @ultima/ui exec vitest run src/__tests__/date-picker.test.tsx', 'available'],
      ],
    );
    assert.ok(others.some((c: { id: string }) => c.id === 'color-field'), 'other matching items are shown');
    for (const candidate of document.candidates) assert.ok(candidate.reasons.length > 0);
    assert.ok(!document.candidates.some((c: { type: string }) => c.type === 'scenario'), 'no scenario is invented from a search hit');
  });

  test('ranks an ID or name before an alias before text, then by ID', () => {
    const { candidates } = json(['list', '--search', 'dialog']).document;
    const tiers = candidates.map((c: { tier: number }) => c.tier);
    assert.deepEqual(tiers, [...tiers].sort((a, b) => a - b));
  });

  test('no match is an empty discovery, not a pass', () => {
    const { exit, document } = json(['list', '--search', 'zzzz']);
    assert.equal(exit, 0);
    assert.deepEqual(document.candidates, []);
    assert.match(document.suggestion, /pnpm verify list/);
  });
});

describe('pnpm verify describe', () => {
  test('a scenario: ownership, routes, fixtures, steps, variants, bindings and the broader scope', () => {
    const { exit, document } = json(['describe', 'scenario', 'dialog.keyboard-dismissal']);
    assert.equal(exit, 0);
    const described = document.scenario;
    assert.equal(described.contract, 'docs/spec/ultima.md#accessibility-contract');
    assert.deepEqual(described.routes, [{ pathname: '/components/dialog', definedBy: 'catalogue item dialog' }]);
    assert.deepEqual(described.ownership.demos, ['apps/docs/src/demos/dialog/basic.tsx']);
    assert.equal(described.targets[1].cases.length, 4);
    assert.ok(described.targets.every((t: { executed: boolean }) => t.executed === false));
    assert.equal(described.scope.command.display, 'pnpm verify feature dialog');
    assert.equal(described.scope.command.status, 'available');
    const production = described.targets.find((t: { target: string }) => t.target === 'production');
    assert.deepEqual(
      production.commands.map((c: { display: string; status: string }) => [c.display, c.status]),
      [['pnpm verify feature dialog', 'available']],
    );
    assert.match(described.scope.note, /no single-scenario mode/);
  });

  test('plain text carries the same facts as JSON', () => {
    const human = run(['describe', 'scenario', 'theme-studio.draft-history'], root).stdout;
    const { scenario: described } = json(['describe', 'scenario', 'theme-studio.draft-history']).document;
    for (const target of described.targets) {
      assert.ok(human.includes(`${target.binding.path}:${target.binding.line}`));
      for (const id of target.cases) assert.ok(human.includes(id), id);
    }
    for (const step of described.steps) assert.ok(human.includes(step.action) && human.includes(step.expect));
    for (const route of described.routes) assert.ok(human.includes(route.pathname));
    assert.ok(human.includes(described.scope.command.display));
  });

  test('a feature: contract, sources, scenarios and supporting suites', () => {
    const { document } = json(['describe', 'feature', 'theme-studio']);
    assert.deepEqual(document.feature.scenarios.map((s: { id: string }) => s.id), ['theme-studio.draft-history', 'theme-studio.pane-boundaries']);
    assert.deepEqual(
      document.feature.supporting.map((s: { path: string }) => s.path),
      [
        'apps/docs/src/__tests__/theme-studio.test.tsx',
        'apps/docs/src/__tests__/theme-studio-export.test.tsx',
        'apps/docs/src/__tests__/theme-studio-parity.test.tsx',
      ],
    );
  });

  test('reports no shipped execution mode as planned, in JSON or plain text', () => {
    const { document: listed } = json(['list']);
    const documents = [
      listed,
      ...listed.features.map((f: { id: string }) => json(['describe', 'feature', f.id]).document),
      ...listed.scenarios.map((s: { id: string }) => json(['describe', 'scenario', s.id]).document),
      json(['list', '--search', 'the picker broke']).document,
    ];
    const text = JSON.stringify(documents);
    assert.doesNotMatch(text, /"status":"planned"/);
    assert.doesNotMatch(text, /lands with #|once available/);
    for (const argv of [['describe', 'feature', 'dialog'], ['describe', 'scenario', 'dialog.keyboard-dismissal'], ['list', '--search', 'dialog']]) {
      assert.doesNotMatch(run(argv, root).stdout, /\(planned\)/, argv.join(' '));
    }
  });

  test('an unknown ID exits 2 with the available choices', () => {
    const { exit, document } = json(['describe', 'scenario', 'dialog.escape']);
    assert.equal(exit, 2);
    assert.equal(document.status, 'usage-error');
    assert.match(document.message, /available: blocks\.preview, catalogue\.filter-and-demo, dialog\.keyboard-dismissal, .*, theme-studio\.pane-boundaries$/);
    assert.equal(json(['describe', 'feature', 'studio']).exit, 2);
    assert.equal(json(['describe', 'item', 'dialog']).exit, 2);
  });
});

describe('execution modes', () => {
  test('without --plan run in an isolated snapshot; with no adapter registered every check is unavailable, exit 3 and never a pass', async () => {
    for (const argv of [['feature', 'dialog'], ['component', 'date-picker'], ['release'], ['changed', '--base', 'origin/main']]) {
      const output = join(mkdtempSync(join(scratch, 'run-')), 'evidence');
      const { exit, stdout } = await execute([...argv, '--output', output, '--json'], root, { adapters: {} });
      const document = JSON.parse(stdout);
      assert.equal(exit, 3, argv.join(' '));
      assert.equal(document.status, 'incomplete');
      if (!inGit) {
        // Inside a verification run's own snapshot the root is not a Git work tree of its own, so neither
        // capture nor planning describes it; the run must still end incomplete with nothing passed.
        assert.ok(document.checks.every((entry: { status: string }) => entry.status !== 'passed'));
        continue;
      }
      assert.equal(document.source.capture.status, 'captured');
      assert.ok(document.checks.every((entry: { status: string }) => entry.status === 'unavailable' || entry.status === 'skipped'));
      assert.equal(document.plan.command, argv[0]);
    }
  });

  test('still reject an unknown explicit ID with exit 2', () => {
    assert.equal(json(['feature', 'dialgo']).exit, 2);
    assert.equal(json(['component', 'datepicker']).exit, 2);
    assert.equal(json(['frobnicate']).exit, 2);
  });
});

describe('malformed records', () => {
  test('exit 1 with their diagnostics and discover nothing', () => {
    const repository = writeRepository({ ...validFixture(), [SCENARIO]: JSON.stringify(scenario({ contract: 'docs/spec/ultima.md#gone' })) });
    const { exit, document } = json(['list'], repository);
    assert.equal(exit, 1);
    assert.equal(document.status, 'invalid');
    assert.ok(document.diagnostics.some((d: { code: string }) => d.code === 'broken-anchor'));
    assert.equal(document.scenarios, undefined);
  });

  test('a deleted binding fails discovery before anything could hide it', () => {
    const files = validFixture();
    delete files['apps/docs/tests/production/button.press.ts'];
    const { exit, document } = json(['describe', 'scenario', 'button.press'], writeRepository(files));
    assert.equal(exit, 1);
    assert.ok(document.diagnostics.some((d: { code: string; message: string }) => d.code === 'missing-binding' && d.message.includes('production')));
  });
});

describe('discovery', () => {
  test('starts no process and loads no application, test, browser or runner module', () => {
    const preload = join(scratch, 'observe.mjs');
    const record = join(scratch, 'observed.json');
    writeFileSync(
      preload,
      [
        "import { createRequire, registerHooks, syncBuiltinESMExports } from 'node:module';",
        "import { writeFileSync } from 'node:fs';",
        'const require = createRequire(import.meta.url);',
        'const loaded = []; const spawned = [];',
        'registerHooks({ resolve(specifier, context, next) { const resolved = next(specifier, context); loaded.push(resolved.url); return resolved; } });',
        "const processes = require('node:child_process');",
        "for (const name of ['spawn', 'spawnSync', 'exec', 'execSync', 'execFile', 'execFileSync', 'fork']) {",
        "  processes[name] = () => { spawned.push(name); throw new Error('discovery started a process'); };",
        '}',
        'syncBuiltinESMExports();',
        `process.on('exit', () => writeFileSync(${JSON.stringify(record)}, JSON.stringify({ loaded, spawned })));`,
      ].join('\n'),
    );
    for (const argv of [['list'], ['list', '--search', 'the picker broke'], ['describe', 'scenario', 'dialog.keyboard-dismissal'], ['describe', 'feature', 'theme-studio']]) {
      const child = spawnSync(process.execPath, ['--experimental-strip-types', '--import', preload, join(root, 'scripts/verify.ts'), ...argv, '--json'], {
        encoding: 'utf8',
      });
      assert.equal(child.status, 0, child.stderr);
      JSON.parse(child.stdout);
      const { loaded, spawned } = JSON.parse(readFileSync(record, 'utf8')) as { loaded: string[]; spawned: string[] };
      assert.deepEqual(spawned, []);
      assert.ok(loaded.some((url) => url.endsWith('/scripts/verification/model.ts')), 'the hook observed the imports');
      const forbidden = loaded.filter((url) =>
        /\/(apps\/docs\/(src|tests)|packages\/(ui|elements|tokens)\/src)\/|\/node_modules\/(\.pnpm\/)?(vitest|@vitest|playwright|vite)[@/]|\/scripts\/verification\/(register|production)\.ts$/.test(url),
      );
      assert.deepEqual(forbidden, [], argv.join(' '));
    }
  });
});
