/**
 * Proves the feature-map discovery target for the three fixed prompts: `pnpm verify
 * list --search` plus `describe` return the owner, the route and a runnable scoped
 * command, and that command passes while running the covering test file. The picker
 * prompt has no registered scenario, so its proof is that discovery states the
 * catalogue-only limit for every picker match rather than inventing one.
 *
 *   node --experimental-strip-types scripts/measure/discover.ts --out <file>
 *
 * Exit 0 when every prompt meets its target, 1 when one misses, 2 on usage.
 */
import { execFileSync, spawnSync } from 'node:child_process';
import { writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseArgs } from 'node:util';

import { sourceIdentity } from './identity.ts';
import { SCHEMA_VERSION } from './protocol.ts';

const root = join(dirname(fileURLToPath(import.meta.url)), '../..');

const { values } = parseArgs({ options: { out: { type: 'string' } } });
if (!values.out) {
  console.error('usage: discover.ts --out <file>');
  process.exit(2);
}

type Command = { argv: string[]; display: string; status: 'available' | 'planned'; note: string };
type Candidate = {
  type: 'scenario' | 'feature' | 'item';
  id: string;
  route?: string;
  sources?: string[];
  registration?: { status: string; note: string };
  commands?: Command[];
};

/** The same answer keys as EXERCISES in exercise.ts. */
const PROMPTS = [
  {
    prompt: 'Dialog Escape leaves focus behind',
    scenario: 'dialog.keyboard-dismissal',
    owners: ['packages/ui/src/dialog.tsx'],
    route: '/components/dialog',
    coverage: ['dialog.test.tsx'],
  },
  {
    prompt: 'Reset theme undo lost my override',
    scenario: 'theme-studio.draft-history',
    owners: [
      'apps/docs/src/theme-studio-store.ts',
      'apps/docs/src/routes/theme-studio.tsx',
      'apps/docs/src/theme-studio-actions.tsx',
      'packages/tokens/src/theme/history.ts',
    ],
    route: '/theme-studio',
    coverage: ['theme-studio.test.tsx', 'history.test.ts'],
  },
  {
    prompt: 'the picker broke',
    scenario: null,
    owners: ['packages/ui/src/date-picker.tsx', 'packages/ui/src/color-field.tsx', 'packages/ui/src/calendar.tsx'],
    route: null,
    coverage: ['date-picker.test.tsx', 'color-field.test.tsx', 'calendar.test.tsx'],
  },
];

function verify(args: string[]) {
  const started = performance.now();
  const stdout = execFileSync('pnpm', ['-s', 'verify', ...args, '--json'], { cwd: root, encoding: 'utf8' });
  return { argv: ['pnpm', 'verify', ...args, '--json'], elapsedMs: performance.now() - started, json: JSON.parse(stdout) };
}

function execute(command: Command) {
  const started = performance.now();
  const result = spawnSync(command.argv[0]!, command.argv.slice(1), { cwd: root, encoding: 'utf8', env: { ...process.env, FORCE_COLOR: '0' } });
  return { argv: command.argv, exitCode: result.status, elapsedMs: performance.now() - started, tail: `${result.stdout}${result.stderr}`.slice(-800) };
}

const results = [];
for (const key of PROMPTS) {
  const list = verify(['list', '--search', key.prompt]);
  const candidates = list.json.candidates as Candidate[];
  if (key.scenario) {
    const top = candidates[0];
    const describe = verify(['describe', 'scenario', key.scenario]);
    const scenario = describe.json.scenario;
    const owners: string[] = scenario.ownership.sources;
    const routes: string[] = scenario.routes.map((route: { pathname: string }) => route.pathname);
    // The narrowest runnable command a binding names; the registry build that precedes a docs suite runs first.
    const commands: Command[] = scenario.targets.flatMap((target: { commands: Command[] }) => target.commands);
    const available = commands.filter((command) => command.status === 'available');
    const executed = available.map(execute);
    const scoped = available.find((command) => key.coverage.some((file) => command.display.includes(file)));
    const scopedRun = scoped ? executed[available.indexOf(scoped)] : undefined;
    const checks = {
      topCandidateIsScenario: top?.type === 'scenario' && top.id === key.scenario,
      ownerFound: owners.some((owner) => key.owners.includes(owner)),
      routeFound: routes.includes(key.route!),
      scopedCommandPasses: scopedRun !== undefined && executed.every((run) => run.exitCode === 0),
    };
    results.push({
      prompt: key.prompt,
      invocations: [list.argv, describe.argv],
      discoveryMs: list.elapsedMs + describe.elapsedMs,
      topCandidate: top ? `${top.type} ${top.id}` : null,
      owners,
      routes,
      commands: commands.map((command) => ({ display: command.display, status: command.status, note: command.note })),
      executed,
      checks,
      met: Object.values(checks).every(Boolean),
    });
  } else {
    const pickers = candidates.filter((candidate) => candidate.type === 'item' && candidate.sources?.some((path) => key.owners.includes(path)));
    const date = pickers.find((candidate) => candidate.id === 'date-picker');
    const scoped = date?.commands?.find((command) => command.status === 'available');
    const run = scoped ? execute(scoped) : undefined;
    const checks = {
      noScenarioInvented: candidates.every((candidate) => candidate.type !== 'scenario'),
      everyPickerStatesItsLimit: pickers.length > 0 && pickers.every((candidate) => candidate.registration?.status === 'catalogue-only'),
      moreThanOnePickerSurfaced: pickers.length > 1,
      scopedCommandPasses: run?.exitCode === 0,
    };
    results.push({
      prompt: key.prompt,
      invocations: [list.argv],
      discoveryMs: list.elapsedMs,
      topCandidate: candidates[0] ? `${candidates[0].type} ${candidates[0].id}` : null,
      pickers: pickers.map((candidate) => ({ id: candidate.id, route: candidate.route, registration: candidate.registration })),
      executed: run ? [run] : [],
      checks,
      met: Object.values(checks).every(Boolean),
    });
  }
}

const report = {
  schemaVersion: SCHEMA_VERSION,
  kind: 'discovery-proof',
  source: sourceIdentity(root),
  target: 'owner, route and a runnable scoped command for each registered pilot scenario within list plus describe; the catalogue-only limit stated for an unregistered prompt',
  results,
  met: results.every((result) => result.met),
};
writeFileSync(resolve(values.out), `${JSON.stringify(report, null, 2)}\n`);
for (const result of results) console.log(`${result.met ? 'met ' : 'MISS'} ${result.prompt}: ${JSON.stringify(result.checks)}`);
process.exit(report.met ? 0 : 1);
