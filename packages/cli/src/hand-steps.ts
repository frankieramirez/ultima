// docs/spec/ultima.md, Consumer CLI, Doctor, A third target. The kinds are closed: a target
// built from these is data in registry/items.config.ts, and a new kind is a CLI change.

export type Assertion =
  /** `path` exists, relative to the project root. */
  | { kind: 'file-present'; path: string }
  /** `file` names `package` in a string. `package.json` instead declares the setup item's dependencies. */
  | { kind: 'config-references'; file: string; package: string }
  | { kind: 'config-references'; file: 'package.json' }
  /** The first of `importers` that exists imports `specifier`, and it resolves to a file beside it. */
  | { kind: 'import-present'; importers: string[]; specifier: string }
  /** `vite.config.*` imports `plugin` from `from` and calls it first in `plugins`. */
  | { kind: 'plugin-first'; plugin: string; from: string }
  /** Every `@/` alias in components.json resolves through each of `tsconfigs` that exists. */
  | { kind: 'alias-resolves'; tsconfigs: string[] }
  /** No unlayered reset in a stylesheet reachable from `entries`. */
  | { kind: 'layered-resets'; entries: string[] }
  /** Each of `packages` that package.json declares resolves inside its supported range, and all to one version. */
  | { kind: 'version-in-range'; packages: string[] };

export const KINDS = [
  'file-present',
  'config-references',
  'import-present',
  'plugin-first',
  'alias-resolves',
  'layered-resets',
  'version-in-range',
] as const satisfies readonly Assertion['kind'][];

/**
 * `spec` is the bold lead of the step's bullet under What the consumer still does by hand,
 * which the CLI build turns into a link to that line.
 */
export type HandStep = { prose: string; spec?: string } & (
  | { assertion: Assertion; unverifiable?: never }
  | { unverifiable: string; assertion?: never }
);

/** The registry build runs without a type check, so the manifest is checked here too. */
export function validateHandSteps(item: string, steps: readonly HandStep[]): void {
  steps.forEach((step, index) => {
    const name = `${item} hand step ${index + 1} ("${step.prose}")`;
    const { assertion, unverifiable } = step as { assertion?: { kind?: unknown }; unverifiable?: unknown };
    if (assertion === undefined && unverifiable === undefined) {
      throw new Error(`${name} has neither an assertion nor an unverifiable reason`);
    }
    if (assertion !== undefined && unverifiable !== undefined) {
      throw new Error(`${name} has both an assertion and an unverifiable reason`);
    }
    if (assertion !== undefined && !(KINDS as readonly unknown[]).includes(assertion.kind)) {
      throw new Error(`${name} asserts ${String(assertion.kind)}, which is not one of ${KINDS.join(', ')}`);
    }
    if (unverifiable !== undefined && (typeof unverifiable !== 'string' || unverifiable.trim() === '')) {
      throw new Error(`${name} gives an empty unverifiable reason`);
    }
  });
}
