/**
 * Execution adapters, keyed by check ID, per Check composition under Verification CLI in
 * docs/spec/agent-infrastructure.md. None is registered yet: the static, type and unit adapters land with
 * #460, browser, build and install with #461, and production scenarios with #462 and #463. Until then the
 * runner reports every selected check `unavailable` and no run can pass.
 *
 * `commandAdapter` is the shape they share: one argument array, run as an owned process in the snapshot,
 * and a parser that turns the tool's own report into coverage evidence and validation failures.
 */
import type { ProcessResult } from './process.ts';
import type { Adapter, AdapterContext, AdapterReport, Adapters } from './run.ts';

export const ADAPTERS: Adapters = {};

export function commandAdapter(
  argv: (context: AdapterContext) => string[],
  parse: (context: AdapterContext, process: ProcessResult) => Omit<AdapterReport, 'process'>,
): Adapter {
  return {
    async run(context) {
      const process = await context.launch(argv(context));
      if (process.status !== 'exited') return { verdict: 'incomplete', process, executed: [], reason: `the command ${process.status}` };
      return { ...parse(context, process), process };
    },
  };
}
