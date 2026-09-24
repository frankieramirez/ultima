/**
 * `pnpm catalogue:generate` and `pnpm catalogue:check`, per Generation and freshness in
 * docs/spec/agent-infrastructure.md.
 */
import { mkdirSync, renameSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import type { OptimizerPolicy } from './browser.ts';
import { type Files, diskFiles } from './files.ts';
import { formatDiagnostics as format } from './model.ts';
import { optimizerPolicy } from './optimizer-policy.ts';
import { GENERATED_DIRECTORIES, HEADER_MARK, OUTPUTS, planOutputs } from './projections.ts';

const POLICY = 'scripts/catalogue/optimizer-policy.ts';
export const LOCK = '.catalogue-generate.lock';

export type Freshness = { added: string[]; changed: string[]; stale: string[] };

function recording(files: Files) {
  const reads = new Map<string, string | undefined>();
  const lists = new Map<string, string | undefined>();
  const recorded: Files = {
    read(path) {
      const text = files.read(path);
      if (!reads.has(path)) reads.set(path, text);
      return text;
    },
    list(path) {
      const entries = files.list(path);
      if (!lists.has(path)) lists.set(path, JSON.stringify(entries));
      return entries;
    },
  };
  const changed = () => [
    ...[...reads].filter(([path, text]) => files.read(path) !== text).map(([path]) => path),
    ...[...lists].filter(([path, entries]) => JSON.stringify(files.list(path)) !== entries).map(([path]) => `${path}/`),
  ];
  return { files: recorded, changed };
}

function freshnessOf(files: Files, outputs: Map<string, string>): Freshness {
  const report: Freshness = { added: [], changed: [], stale: [] };
  for (const [path, text] of outputs) {
    const current = files.read(path);
    if (current === undefined) report.added.push(path);
    else if (current !== text) report.changed.push(path);
  }
  for (const directory of GENERATED_DIRECTORIES) {
    for (const entry of files.list(directory) ?? []) {
      const path = `${directory}/${entry.name}`;
      if (!outputs.has(path)) report.stale.push(path);
    }
  }
  return report;
}

/** Read-only: the expected outputs, compared by name and exact bytes with what is on disk. */
export function check(root: string, policy: OptimizerPolicy = optimizerPolicy) {
  const files = diskFiles(root);
  const { outputs, diagnostics } = planOutputs(files, policy);
  return { diagnostics, freshness: freshnessOf(files, outputs) };
}

export class GenerationError extends Error {
  readonly written: string[];
  constructor(message: string, written: string[] = []) {
    super(message);
    this.written = written;
  }
}

export type GenerateOptions = {
  /** Owned paths that still hold an authored file and may be replaced once, after review. */
  adopt?: string[];
  /** Runs after the plan and before the recheck; tests edit inputs here. */
  beforeWrite?: () => void;
  policy?: OptimizerPolicy;
};

/**
 * Validates every input and plans every output before writing, under a per-worktree lock. Aborts when
 * an input or output changed since it was read, and reports each path written before a failed write.
 */
export function generate(root: string, options: GenerateOptions = {}) {
  const lock = join(root, LOCK);
  try {
    writeFileSync(lock, `${process.pid}\n`, { flag: 'wx' });
  } catch {
    throw new GenerationError(`${LOCK} exists: another generation is running here, or one was killed. Remove it once none is.`);
  }
  try {
    const disk = diskFiles(root);
    const { files, changed } = recording(disk);
    files.read(POLICY);
    const { outputs, diagnostics } = planOutputs(files, options.policy ?? optimizerPolicy);
    if (diagnostics.length > 0) throw new GenerationError(`the inputs are invalid; nothing was written\n${format(diagnostics)}`);

    const pending = [...outputs].filter(([path, text]) => files.read(path) !== text);
    for (const [path] of pending) {
      const current = files.read(path);
      if (current !== undefined && !current.includes(HEADER_MARK) && !options.adopt?.includes(path)) {
        throw new GenerationError(
          `${path} holds an authored file, not a generated one; review its replacement, then pass --adopt ${path}. Nothing was written.`,
        );
      }
    }

    options.beforeWrite?.();
    const moved = changed();
    if (moved.length > 0) {
      throw new GenerationError(`changed while generating, so nothing was written; rerun once edits settle:\n${moved.map((p) => `  ${p}`).join('\n')}`);
    }

    const written: string[] = [];
    for (const [path, text] of pending) {
      const target = join(root, path);
      const temporary = `${target}.catalogue-tmp`;
      try {
        mkdirSync(dirname(target), { recursive: true });
        writeFileSync(temporary, text);
        renameSync(temporary, target);
      } catch (error) {
        rmSync(temporary, { force: true });
        const rest = pending.map(([p]) => p).filter((p) => p !== path && !written.includes(p));
        throw new GenerationError(
          [
            `writing ${path} failed: ${(error as Error).message}`,
            `written before it: ${written.length > 0 ? written.join(', ') : 'none'}`,
            `not written: ${[path, ...rest].join(', ')}`,
            '`pnpm catalogue:check` fails until a generation completes.',
          ].join('\n'),
          written,
        );
      }
      written.push(path);
    }
    return { written, stale: freshnessOf(disk, outputs).stale };
  } finally {
    rmSync(lock, { force: true });
  }
}

function main(argv: string[]) {
  const root = join(dirname(fileURLToPath(import.meta.url)), '../..');
  const [command] = argv;

  if (command === 'check') {
    const { diagnostics, freshness } = check(root);
    const lines = [
      ...freshness.added.map((path) => `  added (missing on disk): ${path}`),
      ...freshness.changed.map((path) => `  changed: ${path}`),
      ...freshness.stale.map((path) => `  stale (no longer generated): ${path}`),
    ];
    if (diagnostics.length > 0) console.error(`catalogue: the inputs are invalid\n${format(diagnostics)}`);
    if (lines.length > 0) {
      console.error(`catalogue: the generated wiring is stale; run \`pnpm catalogue:generate\` (remove a stale path by hand)\n${lines.join('\n')}`);
    }
    if (diagnostics.length > 0 || lines.length > 0) return 1;
    console.log(`catalogue: ${Object.keys(OUTPUTS).length} generated files are fresh`);
    return 0;
  }

  if (command === 'provenance') {
    const { optimizer, diagnostics } = planOutputs(diskFiles(root), optimizerPolicy);
    if (diagnostics.length > 0) console.error(format(diagnostics));
    for (const [project, entries] of Object.entries(optimizer.provenance)) {
      console.log(`${project}:`);
      for (const [specifier, from] of entries) console.log(`  ${specifier}  <- ${from}`);
    }
    return diagnostics.length > 0 ? 1 : 0;
  }

  if (command === '--out') {
    const out = argv[1];
    if (!out) throw new GenerationError('--out needs a directory');
    const { outputs, diagnostics } = planOutputs(diskFiles(root), optimizerPolicy);
    for (const [path, text] of outputs) {
      mkdirSync(dirname(join(out, path)), { recursive: true });
      writeFileSync(join(out, path), text);
    }
    if (diagnostics.length > 0) console.error(format(diagnostics));
    console.log(`catalogue: planned ${outputs.size} files into ${out}`);
    return diagnostics.length > 0 ? 1 : 0;
  }

  const adopt = argv.flatMap((arg, index) => (argv[index - 1] === '--adopt' ? [arg] : []));
  if (argv.some((arg, index) => arg !== '--adopt' && argv[index - 1] !== '--adopt')) {
    throw new GenerationError('usage: generate.ts [check | provenance | --out <dir> | --adopt <path>...]');
  }
  const { written, stale } = generate(root, { adopt });
  console.log(written.length > 0 ? `catalogue: wrote ${written.join(', ')}` : 'catalogue: every generated file is current');
  if (stale.length > 0) {
    console.error(`catalogue: no longer generated; remove by hand:\n${stale.map((p) => `  ${p}`).join('\n')}`);
    return 1;
  }
  return 0;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  try {
    process.exitCode = main(process.argv.slice(2));
  } catch (error) {
    if (!(error instanceof GenerationError)) throw error;
    console.error(`catalogue: ${error.message}`);
    process.exitCode = 1;
  }
}

