/**
 * Registers an existing Vitest callback as a scenario's canonical binding, per Executable bindings
 * and discovery in docs/spec/agent-infrastructure.md:
 *
 *   test('Escape closes …', scenario('dialog.keyboard-dismissal', 'ui-vitest', async () => { … }));
 *
 * The ID and target must be literals: `scripts/verification/bindings.ts` reads them from source
 * without loading the test module. The wrapper adds no assertion and no lifecycle; it records the
 * one case identity on the task's meta for a reporter, then runs the callback unchanged.
 */

export type VitestTarget = 'ui-vitest' | 'docs-vitest' | 'elements-vitest';

type ScenarioContext = { task: { meta: object } };

export type ScenarioMeta = { id: string; target: VitestTarget; case: string };

export function scenario<R>(id: string, target: VitestTarget, callback: (context: ScenarioContext) => R) {
  return (context: ScenarioContext): R => {
    const meta: ScenarioMeta = { id, target, case: `${id}@${target}[default]` };
    (context.task.meta as { scenario?: ScenarioMeta }).scenario = meta;
    return callback(context);
  };
}
