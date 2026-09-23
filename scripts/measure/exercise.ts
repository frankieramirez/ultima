/**
 * Runs one agent exercise attempt in a disposable checkout and records what the
 * agent did from its own tool trace: the discovery prompts of Workloads and
 * comparable coverage, and the synthetic component addition and removal.
 *
 *   node --experimental-strip-types scripts/measure/exercise.ts \
 *     --exercise dialog-escape --attempt 1 --revision <sha> --out <dir> [--model sonnet]
 *
 * Each attempt gets a new worktree path, so no project memory or earlier session
 * carries the answer; that makes it a naive observation. The worktree is removed
 * afterwards. Scoring rules live beside the prompts in EXERCISES.
 */
import { execFileSync, spawn } from 'node:child_process';
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseArgs } from 'node:util';
import { gzipSync } from 'node:zlib';

import { environment, sha256, treeHash } from './identity.ts';
import { SCHEMA_VERSION } from './protocol.ts';

const root = join(dirname(fileURLToPath(import.meta.url)), '../..');

type Discovery = {
  kind: 'discovery';
  prompt: string;
  owners: string[];
  coverage: string[];
  ambiguous: boolean;
};
type Addition = { kind: 'addition'; add: string; remove: string };

const DISCOVERY_TASK = (prompt: string) =>
  [
    'You are in the Ultima repository, at its root. A user reports:',
    '',
    `"${prompt}"`,
    '',
    'Find the source file that owns this behavior and one shell command, run from the repository root, that runs the existing checks covering it.',
    'Do not modify any file. When you are done, end your reply with exactly these two lines:',
    'OWNER: <repository-relative path of the owning source file>',
    'COMMAND: <the command>',
  ].join('\n');

const STEPPER_CONTRACT = [
  'Add a new catalogue component, Synthetic Stepper, registry item `synthetic-stepper`, to this repository, following its conventions for an ordinary React component.',
  'Contract: a number input with decrement and increment buttons, built on `@base-ui/react/number-field`.',
  'Parts: SyntheticStepper.Root, .Group, .Decrement, .Input, .Increment. One `size` axis, `sm | md`, default `md`.',
  'It joins the v0.2 release, last in catalogue order. Its docs page has one live demo.',
  'Proof: a test file that renders it, proves ArrowUp increments the value, and runs axe.',
  'Make the registry build, typecheck and its own test file pass.',
].join('\n');

export const EXERCISES: Record<string, Discovery | Addition> = {
  'dialog-escape': {
    kind: 'discovery',
    prompt: 'Dialog Escape leaves focus behind',
    owners: ['packages/ui/src/dialog.tsx'],
    coverage: ['dialog.test.tsx'],
    ambiguous: false,
  },
  'reset-undo': {
    kind: 'discovery',
    prompt: 'Reset theme undo lost my override',
    owners: [
      'apps/docs/src/theme-studio-store.ts',
      'apps/docs/src/routes/theme-studio.tsx',
      'apps/docs/src/theme-studio-actions.tsx',
      'packages/tokens/src/theme/history.ts',
    ],
    coverage: ['theme-studio.test.tsx', 'history.test.ts'],
    ambiguous: false,
  },
  picker: {
    kind: 'discovery',
    prompt: 'the picker broke',
    owners: [
      'packages/ui/src/date-picker.tsx',
      'packages/ui/src/color-field.tsx',
      'packages/ui/src/calendar.tsx',
    ],
    coverage: ['date-picker.test.tsx', 'color-field.test.tsx', 'calendar.test.tsx'],
    ambiguous: true,
  },
  'stepper-add-remove': {
    kind: 'addition',
    add: `${STEPPER_CONTRACT}\nWhen you finish, list every file you changed.`,
    remove:
      'Now remove Synthetic Stepper completely, so the repository is exactly as it was before you added it. Run the registry build and typecheck afterwards. List every file you changed.',
  },
};

/** Files an ordinary addition coordinates by hand at this revision, apart from its own behavior, docs and proof. */
const WIRING = [
  'packages/ui/src/index.ts',
  'apps/docs/src/components.ts',
  'apps/docs/src/router.tsx',
  'apps/docs/src/navigation.ts',
  'apps/docs/src/elements.ts',
  'registry/items.config.ts',
  'apps/docs/vitest.config.ts',
  'packages/ui/vitest.config.ts',
];

const { values } = parseArgs({
  options: {
    exercise: { type: 'string' },
    attempt: { type: 'string' },
    revision: { type: 'string' },
    out: { type: 'string' },
    model: { type: 'string', default: 'sonnet' },
    'max-minutes': { type: 'string', default: '40' },
  },
});
const exercise = values.exercise ? EXERCISES[values.exercise] : undefined;
if (!exercise || !values.attempt || !values.revision || !values.out) {
  console.error(`usage: exercise.ts --exercise ${Object.keys(EXERCISES).join('|')} --attempt <n> --revision <sha> --out <dir>`);
  process.exit(2);
}
const out = resolve(values.out);
mkdirSync(out, { recursive: true });
const id = `${values.exercise}-${values.attempt}`;
const deadline = Number(values['max-minutes']) * 60_000;

function git(cwd: string, args: string[]): string {
  return execFileSync('git', args, { cwd, encoding: 'utf8' }).trim();
}

function run(cwd: string, argv: string[], timeoutMs: number, stdin?: string) {
  return new Promise<{ code: number | null; output: string; elapsedMs: number }>((done) => {
    const started = performance.now();
    const child = spawn(argv[0]!, argv.slice(1), { cwd, stdio: ['pipe', 'pipe', 'pipe'], detached: true, env: { ...process.env, FORCE_COLOR: '0' } });
    let output = '';
    child.stdout.on('data', (chunk) => (output += chunk));
    child.stderr.on('data', (chunk) => (output += chunk));
    child.stdin.end(stdin ?? '');
    const timer = setTimeout(() => {
      try {
        process.kill(-child.pid!, 'SIGTERM');
      } catch {}
    }, timeoutMs);
    child.on('close', (code) => {
      clearTimeout(timer);
      // Colour codes split file names in vitest output, which would hide covered tests from scoring.
      done({ code, output: output.replace(/\x1b\[[0-9;]*m/g, ''), elapsedMs: performance.now() - started });
    });
  });
}

type ToolCall = { name: string; input: Record<string, unknown>; error: boolean };

function parseStream(text: string) {
  const lines = text.split('\n').filter((line) => line.startsWith('{'));
  const events = lines.map((line) => JSON.parse(line) as Record<string, any>);
  const init = events.find((event) => event.type === 'system' && event.subtype === 'init');
  const result = [...events].reverse().find((event) => event.type === 'result');
  const calls = new Map<string, ToolCall>();
  for (const event of events) {
    for (const block of event.message?.content ?? []) {
      if (block.type === 'tool_use') calls.set(block.id, { name: block.name, input: block.input ?? {}, error: false });
      if (block.type === 'tool_result' && calls.has(block.tool_use_id)) calls.get(block.tool_use_id)!.error = block.is_error === true;
    }
  }
  return { init, result, calls: [...calls.values()] };
}

function describeCalls(calls: ToolCall[], cwd: string) {
  const rel = (path: unknown) => (typeof path === 'string' ? path.replace(`${cwd}/`, '') : String(path));
  const bash = calls.filter((call) => call.name === 'Bash').map((call) => String(call.input.command));
  const searchCommand = /(^|\s|\|)(grep|rg|find|fd|ls|git grep)\b/;
  return {
    toolCalls: calls.length,
    byTool: calls.reduce<Record<string, number>>((counts, call) => ({ ...counts, [call.name]: (counts[call.name] ?? 0) + 1 }), {}),
    searches: [
      ...calls.filter((call) => call.name === 'Grep' || call.name === 'Glob').map((call) => `${call.name} ${JSON.stringify(call.input)}`),
      ...bash.filter((command) => searchCommand.test(command)),
    ],
    filesOpened: [...new Set(calls.filter((call) => call.name === 'Read').map((call) => rel(call.input.file_path)))],
    failedCommands: calls.filter((call) => call.name === 'Bash' && call.error).map((call) => String(call.input.command)),
    failedTools: calls.filter((call) => call.error).length,
    edits: calls
      .filter((call) => ['Edit', 'Write', 'MultiEdit', 'NotebookEdit'].includes(call.name))
      .map((call) => ({ tool: call.name, file: rel(call.input.file_path) })),
    bashCommands: bash,
  };
}

async function agent(cwd: string, prompt: string, resume: string | null, disallowEdits: boolean) {
  const argv = [
    'claude', '-p', '--output-format', 'stream-json', '--verbose', '--model', values.model!,
    // Local file and shell tools only: no MCP connectors, no user-level settings, hooks or skills.
    '--permission-mode', 'bypassPermissions', '--strict-mcp-config', '--setting-sources', 'project',
    '--tools', disallowEdits ? 'Bash,Read,Grep,Glob' : 'Bash,Read,Grep,Glob,Edit,Write',
    ...(resume ? ['--resume', resume] : []),
  ];
  const started = new Date().toISOString();
  const outcome = await run(cwd, argv, deadline, prompt);
  const parsed = parseStream(outcome.output);
  return { argv, started, wallMs: outcome.elapsedMs, exitCode: outcome.code, raw: outcome.output, ...parsed };
}

function classify(files: string[]) {
  return {
    wiring: files.filter((file) => WIRING.includes(file)),
    authored: files.filter((file) => !WIRING.includes(file)),
  };
}

const workspace = mkdtempSync(join(tmpdir(), `ultima-exercise-${id}-`));
const checkout = join(workspace, 'repo');
git(root, ['worktree', 'add', '--detach', checkout, values.revision]);
const record: Record<string, unknown> = {
  schemaVersion: SCHEMA_VERSION,
  kind: 'agent-exercise',
  exercise: values.exercise,
  attempt: Number(values.attempt),
  revision: values.revision,
  checkout: 'a new git worktree at a fresh temporary path, removed afterwards',
  learning: 'naive: new session and new worktree path, so no project memory; project setting source only, no MCP servers, file and shell tools only',
  operator: { host: environment(root).host, claude: execFileSync('claude', ['--version'], { encoding: 'utf8' }).trim() },
  requestedModel: values.model,
  harnessSha256: treeHash(root, 'scripts/measure'),
};

try {
  const install = await run(checkout, ['pnpm', 'install', '--frozen-lockfile'], 10 * 60_000);
  record.setup = { argv: ['pnpm', 'install', '--frozen-lockfile'], exitCode: install.code, elapsedMs: install.elapsedMs };
  if (install.code !== 0) throw new Error(`install failed: ${install.output.slice(-500)}`);
  const baseline = git(checkout, ['status', '--porcelain']);

  if (exercise.kind === 'discovery') {
    const task = DISCOVERY_TASK(exercise.prompt);
    const session = await agent(checkout, task, null, true);
    writeFileSync(join(out, `${id}.stream.jsonl.gz`), gzipSync(session.raw));
    const answer = String(session.result?.result ?? '');
    const owner = answer.match(/^OWNER:\s*`?([^`\n]+?)`?\s*$/m)?.[1]?.trim() ?? null;
    const command = answer.match(/^COMMAND:\s*`?([^`\n]+?)`?\s*$/m)?.[1]?.trim() ?? null;
    const located = owner !== null && exercise.owners.includes(owner.replace(/^\.\//, ''));
    let check: Record<string, unknown> | null = null;
    if (command) {
      const executed = await run(checkout, ['bash', '-c', command], 15 * 60_000);
      const covered = exercise.coverage.filter((file) => executed.output.includes(file));
      check = { command, exitCode: executed.code, elapsedMs: executed.elapsedMs, coverageSeen: covered, tail: executed.output.slice(-1500) };
    }
    const commandValid = check !== null && check.exitCode === 0 && (check.coverageSeen as string[]).length > 0;
    const candidatesNamed = exercise.owners.filter((path) => answer.includes(path.split('/').at(-1)!.replace(/\.tsx?$/, '')));
    record.task = { text: task, sha256: sha256(task), entryPoint: 'repository root, no files open' };
    record.session = {
      model: session.init?.model ?? null,
      tools: session.init?.tools ?? null,
      sessionId: session.init?.session_id ?? null,
      argv: session.argv,
      started: session.started,
      wallMs: session.wallMs,
      durationMs: session.result?.duration_ms ?? null,
      turns: session.result?.num_turns ?? null,
      costUsd: session.result?.total_cost_usd ?? null,
      exitCode: session.exitCode,
      trace: `${id}.stream.jsonl.gz`,
    };
    record.observation = { ...describeCalls(session.calls, checkout), answer: answer.slice(-2000) };
    record.score = {
      owner,
      located,
      wrongCandidate: owner !== null && !located ? owner : null,
      commandValid,
      check,
      success: located && commandValid,
      ambiguousPrompt: exercise.ambiguous,
      candidatesNamed,
      rule: exercise.ambiguous
        ? 'success: one picker owner and a passing command that runs its tests; candidatesNamed records whether the answer surfaced the ambiguity'
        : 'success: the owner matches the key and the command exits 0 while running a covering test file',
    };
    record.corrections = git(checkout, ['status', '--porcelain']) === baseline ? [] : ['the agent changed files despite the instruction'];
  } else {
    const added = await agent(checkout, exercise.add, null, false);
    writeFileSync(join(out, `${id}.add.stream.jsonl.gz`), gzipSync(added.raw));
    const addedFiles = git(checkout, ['status', '--porcelain', '--untracked-files=all'])
      .split('\n')
      .filter(Boolean)
      .map((line) => line.slice(3));
    const proofs = [];
    for (const argv of [
      ['pnpm', 'typecheck'],
      ['pnpm', 'registry:build'],
      ['pnpm', '--filter', '@ultima/ui', 'exec', 'vitest', 'run', 'src/__tests__/synthetic-stepper.test.tsx'],
      ['pnpm', '--filter', '@ultima/docs', 'exec', 'vitest', 'run', 'src/__tests__/axe.test.tsx', 'src/__tests__/components.test.ts'],
    ]) {
      const result = await run(checkout, argv, 20 * 60_000);
      proofs.push({ argv, exitCode: result.code, elapsedMs: result.elapsedMs, tail: result.output.slice(-1200) });
    }
    const servedItem = (() => {
      try {
        return JSON.parse(readFileSync(join(checkout, 'registry/registry.json'), 'utf8')).items.some((item: { name: string }) => item.name === 'synthetic-stepper');
      } catch {
        return false;
      }
    })();

    const removed = await agent(checkout, exercise.remove, added.init?.session_id ?? null, false);
    writeFileSync(join(out, `${id}.remove.stream.jsonl.gz`), gzipSync(removed.raw));
    const rebuild = await run(checkout, ['pnpm', 'registry:build'], 10 * 60_000);
    const leftover = git(checkout, ['status', '--porcelain', '--untracked-files=all']);
    const stale = await run(checkout, ['bash', '-c', 'git grep -n -i -e synthetic-stepper -e SyntheticStepper -- . ; grep -rl -i synthetic-stepper registry apps/docs/public 2>/dev/null'], 60_000);

    const addCalls = describeCalls(added.calls, checkout);
    const removeCalls = describeCalls(removed.calls, checkout);
    const opsByFile = (edits: { file: string }[]) => classify([...new Set(edits.map((edit) => edit.file))]);
    record.task = { add: exercise.add, remove: exercise.remove, sha256: sha256(`${exercise.add}\n${exercise.remove}`) };
    record.session = {
      model: added.init?.model ?? null,
      sessionId: added.init?.session_id ?? null,
      add: { wallMs: added.wallMs, durationMs: added.result?.duration_ms ?? null, turns: added.result?.num_turns ?? null, costUsd: added.result?.total_cost_usd ?? null, exitCode: added.exitCode },
      remove: { wallMs: removed.wallMs, durationMs: removed.result?.duration_ms ?? null, turns: removed.result?.num_turns ?? null, costUsd: removed.result?.total_cost_usd ?? null, exitCode: removed.exitCode },
      traces: [`${id}.add.stream.jsonl.gz`, `${id}.remove.stream.jsonl.gz`],
    };
    record.observation = {
      addition: {
        changedFiles: classify(addedFiles),
        editOperations: {
          wiring: addCalls.edits.filter((edit) => WIRING.includes(edit.file)).length,
          authored: addCalls.edits.filter((edit) => !WIRING.includes(edit.file)).length,
        },
        editedFiles: opsByFile(addCalls.edits),
        bashWrites: addCalls.bashCommands.filter((command) => /(>|sed -i|tee |cp |mv |rm )/.test(command)),
        searches: addCalls.searches.length,
        filesOpened: addCalls.filesOpened.length,
        failedCommands: addCalls.failedCommands,
        proofs,
        servedItem,
      },
      removal: {
        editOperations: removeCalls.edits.length,
        editedFiles: opsByFile(removeCalls.edits),
        failedCommands: removeCalls.failedCommands,
        rebuildExit: rebuild.code,
        leftoverStatus: leftover,
        staleReferences: stale.output.trim(),
      },
      wiringFiles: WIRING,
    };
    record.score = {
      additionComplete: proofs.every((proof) => proof.exitCode === 0) && servedItem,
      removalClean: leftover === baseline && stale.output.trim() === '',
      manualWiringFiles: classify(addedFiles).wiring.length,
    };
  }
} catch (error) {
  record.failure = (error as Error).message;
} finally {
  try {
    git(root, ['worktree', 'remove', '--force', checkout]);
  } catch {}
  rmSync(workspace, { recursive: true, force: true });
}

writeFileSync(join(out, `${id}.json`), `${JSON.stringify(record, null, 2)}\n`);
console.log(JSON.stringify(record.score ?? { failure: record.failure }));
