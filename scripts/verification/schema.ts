/**
 * The versioned shape of `verification/features/<id>.json` and
 * `verification/scenarios/<feature>/<name>.json`, per Ownership and storage under Executable feature
 * map in docs/spec/agent-infrastructure.md. Records are data: no commands, expressions or callbacks.
 */

export const SCHEMA_VERSION = 1;

export const TARGETS = ['ui-vitest', 'docs-vitest', 'elements-vitest', 'production'] as const;
export type Target = (typeof TARGETS)[number];

export const AXES = {
  mode: ['dark', 'light'],
  viewport: ['desktop', 'narrow'],
  motion: ['normal', 'reduced'],
} as const;
export type Axis = keyof typeof AXES;
export type Variant = { [A in Axis]?: (typeof AXES)[A][number] };

export const RESETS = ['unmount', 'fresh-context'] as const;

/** Who settled a feature's intent: drafted from code, agreed by a person, or an open question. */
export const KNOWLEDGE = ['proposed', 'confirmed', 'unresolved'] as const;

export type FeatureRecord = {
  schemaVersion: 1;
  id: string;
  title: string;
  summary: string;
  aliases: string[];
  /** `docs/spec/<file>.md#<anchor>`. */
  contract: string;
  /** Catalogue item IDs; their source, test and demo paths come from the catalogue model. */
  items: string[];
  /** Repository-relative application files or directories this feature owns. */
  sourceRoots: string[];
  /** Runtime links import analysis cannot see, such as a bundle loaded by URL. */
  extraDependencies: { reason: string; item?: string; path?: string }[];
  /** Existing suites that prove this feature without a scenario registration. */
  supporting: { path: string; reason: string }[];
  knowledge?: (typeof KNOWLEDGE)[number];
};

export type RouteReference =
  | { kind: 'item'; item: string }
  | { kind: 'application'; definition: string; pathname: string }
  | { kind: 'static'; file: string; pathname: string };

export type FixtureReference = {
  name: string;
  path: string;
  reset: (typeof RESETS)[number];
  /** Present only when the fixture seeds storage, with why. */
  storage?: { keys: string[]; reason: string };
};

/** `"default"` is the single unparameterized case; axes expand to their product. */
export type Variants = 'default' | { mode: string[]; viewport: string[]; motion: string[] };

export type ScenarioRecord = {
  schemaVersion: 1;
  id: string;
  title: string;
  intent: string;
  contract: string;
  aliases: string[];
  items: string[];
  sources: string[];
  demos: string[];
  routes: RouteReference[];
  fixtures: FixtureReference[];
  preconditions: string[];
  steps: { action: string; expect: string }[];
  targets: { target: Target; variants: Variants }[];
};

type Check = (value: unknown, at: string, problems: string[]) => void;

const isObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const text: Check = (value, at, problems) => {
  if (typeof value !== 'string' || value.trim() === '') problems.push(`${at} is not a nonempty string`);
};

const list =
  (item: Check, { nonempty = false } = {}): Check =>
  (value, at, problems) => {
    if (!Array.isArray(value)) return void problems.push(`${at} is not an array`);
    if (nonempty && value.length === 0) problems.push(`${at} is empty`);
    value.forEach((entry, index) => item(entry, `${at}[${index}]`, problems));
  };

const oneOf =
  (values: readonly string[]): Check =>
  (value, at, problems) => {
    if (typeof value !== 'string' || !values.includes(value)) problems.push(`${at} is not one of ${values.join(', ')}`);
  };

const literal =
  (expected: unknown): Check =>
  (value, at, problems) => {
    if (value !== expected) problems.push(`${at} is not ${JSON.stringify(expected)}`);
  };

const shape =
  (required: Record<string, Check>, optional: Record<string, Check> = {}): Check =>
  (value, at, problems) => {
    if (!isObject(value)) return void problems.push(`${at} is not an object`);
    for (const key of Object.keys(value)) {
      if (!(key in required) && !(key in optional)) problems.push(`${at}.${key} is not a known field`);
    }
    for (const [key, check] of Object.entries(required)) {
      if (!(key in value)) problems.push(`${at}.${key} is missing`);
      else check(value[key], `${at}.${key}`, problems);
    }
    for (const [key, check] of Object.entries(optional)) {
      if (key in value) check(value[key], `${at}.${key}`, problems);
    }
  };

const union =
  (discriminant: string, variants: Record<string, Check>): Check =>
  (value, at, problems) => {
    const kind = isObject(value) ? value[discriminant] : undefined;
    const check = typeof kind === 'string' ? variants[kind] : undefined;
    if (!check) problems.push(`${at}.${discriminant} is not one of ${Object.keys(variants).join(', ')}`);
    else check(value, at, problems);
  };

const variants: Check = (value, at, problems) => {
  if (value === 'default') return;
  if (!isObject(value)) return void problems.push(`${at} is neither "default" nor an object of axes`);
  shape(Object.fromEntries(Object.entries(AXES).map(([axis, values]) => [axis, list(oneOf(values), { nonempty: true })])))(
    value,
    at,
    problems,
  );
  for (const [axis, values] of Object.entries(value)) {
    if (Array.isArray(values) && new Set(values).size !== values.length) problems.push(`${at}.${axis} repeats a value`);
  }
};

const featureShape = shape({
  schemaVersion: literal(SCHEMA_VERSION),
  id: text,
  title: text,
  summary: text,
  aliases: list(text),
  contract: text,
  items: list(text),
  sourceRoots: list(text),
  extraDependencies: list(shape({ reason: text }, { item: text, path: text })),
  supporting: list(shape({ path: text, reason: text })),
}, { knowledge: oneOf(KNOWLEDGE) });

const scenarioShape = shape({
  schemaVersion: literal(SCHEMA_VERSION),
  id: text,
  title: text,
  intent: text,
  contract: text,
  aliases: list(text),
  items: list(text),
  sources: list(text),
  demos: list(text),
  routes: list(
    union('kind', {
      item: shape({ kind: text, item: text }),
      application: shape({ kind: text, definition: text, pathname: text }),
      static: shape({ kind: text, file: text, pathname: text }),
    }),
  ),
  fixtures: list(
    shape({ name: text, path: text, reset: oneOf(RESETS) }, { storage: shape({ keys: list(text, { nonempty: true }), reason: text }) }),
  ),
  preconditions: list(text),
  steps: list(shape({ action: text, expect: text }), { nonempty: true }),
  targets: list(shape({ target: oneOf(TARGETS), variants }), { nonempty: true }),
});

export function featureProblems(value: unknown): string[] {
  const problems: string[] = [];
  featureShape(value, 'feature', problems);
  return problems;
}

export function scenarioProblems(value: unknown): string[] {
  const problems: string[] = [];
  scenarioShape(value, 'scenario', problems);
  return problems;
}

/** The declared cases in axis order; `"default"` is one case with no parameters. */
export function expandVariants(declared: Variants): Variant[] {
  if (declared === 'default') return [{}];
  let cases: Variant[] = [{}];
  for (const axis of Object.keys(AXES) as Axis[]) {
    cases = cases.flatMap((partial) => declared[axis].map((value) => ({ ...partial, [axis]: value }) as Variant));
  }
  return cases;
}

/** `<scenario>@<target>[<axis>=<value>,…]`, or `[default]` for an unparameterized case. */
export function caseId(scenario: string, target: Target, variant: Variant): string {
  const parameters = (Object.keys(AXES) as Axis[]).filter((axis) => variant[axis]).map((axis) => `${axis}=${variant[axis]}`);
  return `${scenario}@${target}[${parameters.length > 0 ? parameters.join(',') : 'default'}]`;
}
