// docs/spec/ultima.md, Consumer CLI, Hooks. The hidden `hook <harness>` adapter: it reads the
// harness's post-edit payload, runs `check --files` in process, and hands the findings back through
// that harness's context field. It always exits 0 and prints nothing unless it has a finding to send.
import { isAbsolute, resolve } from 'node:path';

import type { Diagnostic } from '@ultima/analysis/consumer';

import { check } from './check.ts';
import { HARNESSES, type Harness } from './install.ts';

/** Findings sent before the rest are counted; Copilot caps `additionalContext` at 10 KB. */
const MAX_LINES = 20;
const MAX_BYTES = 10 * 1024 - 256;
const MAX_LINE = 480;

type Json = Record<string, unknown>;

const isObject = (value: unknown): value is Json => typeof value === 'object' && value !== null && !Array.isArray(value);
const text = (value: unknown) => (typeof value === 'string' && value.trim() !== '' ? value : undefined);

/** The `*** Add File:` and `*** Update File:` headers of an `apply_patch` patch. */
function patchPaths(patch: string): string[] {
  return [...patch.matchAll(/^\*\*\* (?:Add|Update) File: (.+?)\s*$/gm)].map(([, path]) => path as string);
}

/** A tool's arguments: Copilot has sent both an object and a JSON-encoded string. */
function argumentsOf(value: unknown): Json | string | undefined {
  if (isObject(value)) return value;
  if (typeof value !== 'string') return undefined;
  try {
    const parsed: unknown = JSON.parse(value);
    return isObject(parsed) ? parsed : value;
  } catch {
    return value;
  }
}

/** Every patch body an `apply_patch` call carries, wherever in its arguments the harness puts it. */
function patchesIn(args: Json | string | undefined): string[] {
  if (typeof args === 'string') return [args];
  if (!args) return [];
  return Object.values(args).filter((value): value is string => typeof value === 'string' && value.includes('*** Begin Patch'));
}

/**
 * The files a post-edit payload names, resolved against the payload's `cwd` when relative. Shapes
 * the vendor docs leave out are read from recorded payloads, kept under `__tests__/payloads/`.
 */
export function pathsFromPayload(harness: Harness, json: unknown): string[] {
  if (!isObject(json)) return [];
  let paths: string[];
  let cwd: string | undefined;
  if (harness === 'copilot') {
    const args = argumentsOf(json.toolArgs);
    const named = text(isObject(args) ? args.path : undefined);
    paths = json.toolName === 'apply_patch' ? patchesIn(args).flatMap(patchPaths) : named !== undefined ? [named] : [];
    cwd = text(json.cwd);
  } else {
    const input = argumentsOf(json.tool_input);
    const named = text(isObject(input) ? input.file_path : undefined);
    paths = named !== undefined ? [named] : patchesIn(input).flatMap(patchPaths);
    cwd = text(json.cwd) ?? (Array.isArray(json.workspace_roots) ? text(json.workspace_roots[0]) : undefined);
  }
  const resolved = paths.map((path) => (cwd !== undefined && !isAbsolute(path) ? resolve(cwd, path) : path));
  return [...new Set(resolved)];
}

function line(diagnostic: Diagnostic): string {
  const { ruleId, file, start, message, repair, severity } = diagnostic;
  const lead = severity === 'blocking' ? 'Fix before handing work back' : 'Advisory';
  const full = `${lead}: ${ruleId} ${file}:${start.line}:${start.column} ${message} Repair: ${repair}`.replace(/\s+/g, ' ');
  return full.length > MAX_LINE ? `${full.slice(0, MAX_LINE - 1)}…` : full;
}

/** The harness's JSON for these findings, or null when there is nothing to send. */
export function renderHookOutput(harness: Harness, diagnostics: Diagnostic[]): Json | null {
  // An incomplete finding is the checker's own gap, not something the agent can fix, so it stays out.
  const sent = [
    ...diagnostics.filter(({ severity }) => severity === 'blocking'),
    ...diagnostics.filter(({ severity }) => severity === 'advisory'),
  ];
  if (sent.length === 0) return null;
  const lines = sent.map(line);
  let shown = Math.min(lines.length, MAX_LINES);
  const body = () => [...lines.slice(0, shown), ...(shown < lines.length ? [`and ${lines.length - shown} more`] : [])].join('\n');
  while (shown > 1 && Buffer.byteLength(body()) > MAX_BYTES) shown -= 1;
  const context = body();
  switch (harness) {
    case 'claude':
    case 'codex':
      return { hookSpecificOutput: { hookEventName: 'PostToolUse', additionalContext: context } };
    case 'cursor':
      return { additional_context: context };
    case 'copilot':
      return { additionalContext: context };
  }
}

/** `ultima hook <harness>`: stdout for the harness, empty on anything but a finding to send. */
export function hook(root: string, harness: string | undefined, stdin: string): string {
  try {
    if (!(HARNESSES as string[]).includes(harness ?? '')) return '';
    const paths = pathsFromPayload(harness as Harness, JSON.parse(stdin));
    if (paths.length === 0) return '';
    const report = check(root, { files: paths });
    // A setup failure (no components.json) is doctor's to explain, and doctor never runs from a hook.
    if (!('counts' in report)) return '';
    const output = renderHookOutput(harness as Harness, report.diagnostics);
    return output === null ? '' : `${JSON.stringify(output)}\n`;
  } catch {
    return '';
  }
}
