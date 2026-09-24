import { existsSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { parseArgs } from 'node:util';

import { check, checkExit, printCheck } from './check.ts';
import { exitCode, print } from './diagnostic.ts';
import { diff } from './diff.ts';
import { type Target, doctor } from './doctor.ts';
import { hook } from './hook.ts';
import { HARNESSES, type Harness, install, printPlan, uninstall } from './install.ts';
import { printStatus, status } from './status.ts';

const COMMANDS = ['doctor', 'status', 'diff', 'check', 'install', 'uninstall'];
const USAGE = `usage: ultima <${COMMANDS.join('|')}> [item…] [--json] [--cwd <dir>] [--target vite|next] [--project <tsconfig>] [--files <path>...] [--strict] [--harness <name>]... [--dry-run] [--force]`;
const FLAGS: Record<string, string[]> = {
  doctor: ['target', 'json'],
  status: ['project', 'json'],
  diff: ['project'],
  check: ['files', 'strict', 'project', 'json'],
  install: ['harness', 'dry-run', 'force', 'json'],
  uninstall: ['json'],
};

export async function run(argv: string[], stdin = ''): Promise<{ code: number; stdout: string; stderr: string }> {
  // `hook` is hidden from usage and never fails: a harness hook must leave the agent where no hook would.
  if (argv[0] === 'hook') return { code: 0, stdout: hookInvocation(argv.slice(1), stdin), stderr: '' };
  const invocation = parseInvocation(argv);
  if ('usage' in invocation) return usageError(invocation);
  if (invocation.command === 'install' || invocation.command === 'uninstall') {
    const result =
      invocation.command === 'install'
        ? install(invocation.root, { harnesses: invocation.harnesses, dryRun: invocation.dryRun, force: invocation.force })
        : uninstall(invocation.root);
    const stdout = invocation.json
      ? `${JSON.stringify({ command: invocation.command, ...result }, null, 2)}\n`
      : printPlan(invocation.command, result);
    return { code: result.files.some(({ action }) => action === 'invalid') ? 3 : 0, stdout, stderr: '' };
  }
  if (invocation.command === 'status') {
    const result = await status(invocation.root, { project: invocation.project });
    if ('diagnostics' in result) {
      const report = { command: 'status', ...result };
      return { code: exitCode(report), stdout: print(report, invocation.json), stderr: '' };
    }
    return { code: 0, stdout: invocation.json ? `${JSON.stringify(result, null, 2)}\n` : printStatus(result), stderr: '' };
  }
  if (invocation.command === 'check') {
    const result = check(invocation.root, { project: invocation.project, files: invocation.files, strict: invocation.strict });
    if (!('counts' in result)) {
      const report = { command: 'check', ...result };
      return { code: exitCode(report), stdout: print(report, invocation.json), stderr: '' };
    }
    return { code: checkExit(result), stdout: invocation.json ? `${JSON.stringify(result, null, 2)}\n` : printCheck(result), stderr: '' };
  }
  if (invocation.command === 'diff') {
    const result = await diff(invocation.root, invocation.items, { project: invocation.project });
    if ('usage' in result) return usageError(result);
    if ('diagnostics' in result) {
      const report = { command: 'diff', ...result };
      return { code: exitCode(report), stdout: print(report, false), stderr: '' };
    }
    return { code: 0, stdout: result.output, stderr: '' };
  }
  const result = doctor(invocation.root, invocation.target);
  if ('usage' in result) return usageError(result);
  const report = { command: invocation.command, ...result };
  return { code: exitCode(report), stdout: print(report, invocation.json), stderr: '' };
}

function hookInvocation(argv: string[], stdin: string): string {
  try {
    const { positionals, values } = parseArgs({ args: argv, allowPositionals: true, options: { cwd: { type: 'string' } } });
    return positionals.length === 1 ? hook(resolve(values.cwd ?? '.'), positionals[0], stdin) : '';
  } catch {
    return '';
  }
}

function usageError(result: { usage: string }) {
  return { code: exitCode(result), stdout: '', stderr: `ultima: ${result.usage}\n${USAGE}\n` };
}

type Invocation = { root: string; json: boolean } & (
  | { command: 'doctor'; target: Target | undefined }
  | { command: 'status'; project: string | undefined }
  | { command: 'diff'; project: string | undefined; items: string[] }
  | { command: 'check'; project: string | undefined; files: string[] | undefined; strict: boolean }
  | { command: 'install'; harnesses: Harness[] | undefined; dryRun: boolean; force: boolean }
  | { command: 'uninstall' }
);

function parseInvocation(argv: string[]): { usage: string } | Invocation {
  let args;
  try {
    args = parseArgs({
      args: argv,
      allowPositionals: true,
      options: {
        json: { type: 'boolean' },
        cwd: { type: 'string' },
        target: { type: 'string' },
        project: { type: 'string' },
        harness: { type: 'string', multiple: true },
        files: { type: 'string', multiple: true },
        strict: { type: 'boolean' },
        'dry-run': { type: 'boolean' },
        force: { type: 'boolean' },
      },
    });
  } catch (error) {
    return { usage: (error as Error).message };
  }
  const [command, ...rest] = args.positionals;
  if (!command) return { usage: 'no command given' };
  if (!COMMANDS.includes(command)) return { usage: `unknown command ${command}` };
  const own = FLAGS[command];
  if (!own) return { usage: `${command} is not available in this build` };
  const { target, project, harness, files, json = false } = args.values;
  // `check --files a b` names both: the paths after the flag arrive as positionals.
  const takesPositionals = command === 'diff' || (command === 'check' && files !== undefined);
  if (rest.length > 0 && !takesPositionals) return { usage: `${command} takes no arguments, got ${rest.join(' ')}` };
  const foreign = Object.keys(args.values).find((flag) => flag !== 'cwd' && !own.includes(flag));
  if (foreign) return { usage: `${command} takes no --${foreign}` };
  if (target !== undefined && target !== 'vite' && target !== 'next') {
    return { usage: `--target takes vite or next, got ${target}` };
  }
  const unknown = harness?.find((name) => !(HARNESSES as string[]).includes(name));
  if (unknown !== undefined) return { usage: `--harness takes ${HARNESSES.join(', ')}, got ${unknown}` };
  const root = resolve(args.values.cwd ?? '.');
  if (!existsSync(join(root, 'package.json'))) {
    return { usage: `${root} holds no package.json; pass --cwd with the project root` };
  }
  if (command === 'status') return { command, root, project, json };
  if (command === 'diff') return { command, root, project, json, items: rest };
  if (command === 'check') return { command, root, project, json, files: files && [...files, ...rest], strict: args.values.strict ?? false };
  if (command === 'uninstall') return { command, root, json };
  if (command === 'install') {
    return { command, root, json, harnesses: harness as Harness[] | undefined, dryRun: args.values['dry-run'] ?? false, force: args.values.force ?? false };
  }
  return { command: 'doctor', root, target, json };
}
