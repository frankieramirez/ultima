/**
 * The executable feature map: authored feature and scenario records joined in memory to the catalogue
 * model and to the bindings read from source, per Executable feature map in
 * docs/spec/agent-infrastructure.md. Nothing here writes a file, imports application code or starts
 * a process. There is no committed scenario index; every caller derives this afresh.
 */
import { realpathSync } from 'node:fs';
import { join, posix, relative, sep } from 'node:path';

import ts from 'typescript';

import { type Files, diskFiles } from '../catalogue/files.ts';
import type { Catalogue } from '../catalogue/model.ts';
import { headingAnchors, parse } from '../catalogue/source.ts';
import { type Binding, TARGET_DIRECTORIES, discoverBindings } from './bindings.ts';
import {
  type FeatureRecord,
  type ScenarioRecord,
  type Target,
  type Variant,
  caseId,
  expandVariants,
  featureProblems,
  scenarioProblems,
} from './schema.ts';

export const FEATURES = 'verification/features';
export const SCENARIOS = 'verification/scenarios';

export type VerificationCode =
  | 'not-json'
  | 'invalid-record'
  | 'unexpected-record'
  | 'id-mismatch'
  | 'duplicate-id'
  | 'absent-owner'
  | 'broken-anchor'
  | 'path-outside'
  | 'missing-file'
  | 'empty-source-root'
  | 'unknown-item'
  | 'outside-ownership'
  | 'unsupported-route'
  | 'unsupported-variant'
  | 'dynamic-registration'
  | 'misplaced-binding'
  | 'orphan-binding'
  | 'undeclared-target'
  | 'missing-binding'
  | 'duplicate-binding';

export type VerificationDiagnostic = { code: VerificationCode; path: string; message: string };

/** Repository files, plus where a path really points once symlinks resolve. */
export type RepositoryFiles = Files & { real?(path: string): string | undefined };

export function repositoryFiles(root: string): RepositoryFiles {
  const realRoot = realpathSync(root);
  return {
    ...diskFiles(root),
    real(path) {
      try {
        return relative(realRoot, realpathSync(join(root, path))).split(sep).join('/');
      } catch {
        return undefined;
      }
    },
  };
}

export type ItemSummary = {
  id: string;
  kind: string;
  title: string;
  description: string;
  contract: string;
  /** Files this item owns in the repository. */
  paths: string[];
  route?: string;
  test?: string;
};

export type Case = { id: string; variant: Variant };

export type JoinedScenario = ScenarioRecord & {
  feature: string;
  path: string;
  /** Each route as a served pathname, with where it is defined. */
  resolvedRoutes: { pathname: string; definedBy: string }[];
  bindings: { target: Target; binding?: Binding; cases: Case[] }[];
};

export type JoinedFeature = FeatureRecord & { path: string; scenarios: string[] };

export type VerificationModel = {
  features: JoinedFeature[];
  scenarios: JoinedScenario[];
  items: ItemSummary[];
  /** Every input read, for the source-manifest hash. */
  inputs: string[];
};

const KEBAB = /^[a-z0-9]+(-[a-z0-9]+)*$/;

function isSafeRepositoryPath(path: string): boolean {
  return path !== '' && !path.startsWith('/') && !path.includes('\\') && posix.normalize(path) === path && !path.startsWith('..');
}

export function itemSummaries(catalogue: Catalogue): ItemSummary[] {
  const common = (d: { id: string; kind: string; title: string; description: string; contract: string }) => ({
    id: d.id,
    kind: d.kind,
    title: d.title,
    description: d.description,
    contract: d.contract,
  });
  return [
    ...catalogue.react.map((d) => ({
      ...common(d),
      paths: [d.source, d.page, d.test, d.demos],
      route: `/components/${d.id}`,
      test: d.test,
    })),
    ...catalogue.elements.map((d) => ({ ...common(d), paths: [d.source, d.test], test: d.test })),
    ...catalogue.recipes.map((d) => ({ ...common(d), paths: d.demos, route: `/components/${d.page}#${d.section}` })),
    ...catalogue.setup.map((d) => ({ ...common(d), paths: [`registry/static/${d.id}`] })),
    ...catalogue.sourceBundles.map((d) => ({ ...common(d), paths: d.sources })),
    ...catalogue.artifacts.map((d) => ({ ...common(d), paths: [] })),
  ];
}

export function routePaths(file: ts.SourceFile): Set<string> {
  const paths = new Set<string>();
  const visit = (node: ts.Node) => {
    if (ts.isCallExpression(node) && ts.isIdentifier(node.expression) && node.expression.text === 'createRoute') {
      const [options] = node.arguments;
      if (options && ts.isObjectLiteralExpression(options)) {
        for (const property of options.properties) {
          if (
            ts.isPropertyAssignment(property) &&
            ts.isIdentifier(property.name) &&
            property.name.text === 'path' &&
            ts.isStringLiteral(property.initializer)
          ) {
            paths.add(property.initializer.text);
          }
        }
      }
    }
    ts.forEachChild(node, visit);
  };
  visit(file);
  return paths;
}

export function loadVerification(
  files: RepositoryFiles,
  catalogue: Catalogue,
): { model: VerificationModel; diagnostics: VerificationDiagnostic[] } {
  const diagnostics: VerificationDiagnostic[] = [];
  const inputs: string[] = [];
  const report = (code: VerificationCode, path: string, message: string) => diagnostics.push({ code, path, message });
  const read = (path: string) => {
    const text = files.read(path);
    if (text !== undefined) inputs.push(path);
    return text;
  };

  const items = itemSummaries(catalogue);
  const itemById = new Map(items.map((item) => [item.id, item]));

  const anchorCache = new Map<string, Set<string> | undefined>();
  const checkContract = (where: string, contract: string) => {
    const match = /^(docs\/spec\/[a-z0-9-]+\.md)#(.+)$/.exec(contract);
    if (!match) return report('broken-anchor', where, `contract "${contract}" is not docs/spec/<file>.md#<anchor>`);
    const [, spec, anchor] = match as unknown as [string, string, string];
    if (!anchorCache.has(spec)) {
      const text = read(spec);
      anchorCache.set(spec, text === undefined ? undefined : headingAnchors(text));
    }
    const anchors = anchorCache.get(spec);
    if (!anchors) report('broken-anchor', where, `${spec} does not exist`);
    else if (!anchors.has(anchor)) report('broken-anchor', where, `${spec} has no heading #${anchor}`);
  };

  /** A repository path that stays inside the checkout once symlinks resolve; `kind` asks for a file or a directory. */
  const checkPath = (where: string, path: string, kind: 'file' | 'directory' | 'either' = 'file'): boolean => {
    if (!isSafeRepositoryPath(path)) {
      report('path-outside', where, `"${path}" is not a repository-relative path`);
      return false;
    }
    const isFile = files.read(path) !== undefined;
    const isDirectory = files.list(path) !== undefined;
    if ((kind === 'file' && !isFile) || (kind === 'directory' && !isDirectory) || (kind === 'either' && !isFile && !isDirectory)) {
      report('missing-file', where, `${path} does not exist`);
      return false;
    }
    const real = files.real?.(path) ?? path;
    if (!isSafeRepositoryPath(real)) {
      report('path-outside', where, `"${path}" resolves outside the repository`);
      return false;
    }
    return true;
  };

  const checkItems = (where: string, ids: string[]) => {
    for (const id of ids) if (!itemById.has(id)) report('unknown-item', where, `"${id}" is not a catalogue item`);
  };

  const readRecord = (path: string): unknown => {
    try {
      return JSON.parse(read(path) as string);
    } catch (error) {
      report('not-json', path, (error as Error).message);
      return undefined;
    }
  };

  const features: JoinedFeature[] = [];
  for (const entry of files.list(FEATURES) ?? []) {
    const path = `${FEATURES}/${entry.name}`;
    if (entry.directory || !entry.name.endsWith('.json')) {
      report('unexpected-record', path, 'features/ holds one <feature-id>.json per feature');
      continue;
    }
    const value = readRecord(path);
    if (value === undefined) continue;
    const problems = featureProblems(value);
    for (const problem of problems) report('invalid-record', path, problem);
    if (problems.length > 0) continue;
    const record = value as FeatureRecord;
    const id = entry.name.slice(0, -'.json'.length);
    if (record.id !== id) report('id-mismatch', path, `id "${record.id}" does not match the file name "${id}"`);
    else if (!KEBAB.test(id)) report('invalid-record', path, `id "${id}" is not kebab-case`);
    else features.push({ ...record, path, scenarios: [] });
  }
  const featureById = new Map(features.map((feature) => [feature.id, feature]));

  const ownership = new Map<string, string[]>();
  for (const feature of features) {
    checkContract(feature.path, feature.contract);
    checkItems(feature.path, feature.items);
    for (const root of feature.sourceRoots) {
      if (!checkPath(feature.path, root, 'either')) continue;
      const owned =
        files.read(root) !== undefined
          ? /\.(ts|tsx)$/.test(root)
          : (files.list(root) ?? []).some((child) => !child.directory && /\.(ts|tsx)$/.test(child.name));
      if (!owned) report('empty-source-root', feature.path, `source root ${root} holds no .ts or .tsx source`);
    }
    for (const dependency of feature.extraDependencies) {
      if (dependency.item === undefined && dependency.path === undefined) {
        report('invalid-record', feature.path, `extra dependency "${dependency.reason}" names neither an item nor a path`);
      }
      if (dependency.item !== undefined) checkItems(feature.path, [dependency.item]);
      if (dependency.path !== undefined) checkPath(feature.path, dependency.path, 'either');
    }
    const vitestDirectories = Object.entries(TARGET_DIRECTORIES).filter(([target]) => target !== 'production');
    for (const { path } of feature.supporting) {
      if (!checkPath(feature.path, path)) continue;
      if (!vitestDirectories.some(([, directory]) => path.startsWith(`${directory}/`) && /\.test\.tsx?$/.test(path))) {
        report('path-outside', feature.path, `supporting suite ${path} is not a test file a runner discovers`);
      }
    }
    ownership.set(feature.id, [
      ...feature.sourceRoots,
      ...feature.items.flatMap((id) => itemById.get(id)?.paths ?? []),
    ]);
  }

  const scenarios: JoinedScenario[] = [];
  const seen = new Map<string, string>();
  for (const directory of files.list(SCENARIOS) ?? []) {
    const directoryPath = `${SCENARIOS}/${directory.name}`;
    if (!directory.directory) {
      report('unexpected-record', directoryPath, 'scenarios/ holds one directory per feature');
      continue;
    }
    const feature = featureById.get(directory.name);
    if (!feature) report('absent-owner', directoryPath, `no ${FEATURES}/${directory.name}.json owns these scenarios`);
    for (const entry of files.list(directoryPath) ?? []) {
      const path = `${directoryPath}/${entry.name}`;
      if (entry.directory || !entry.name.endsWith('.json')) {
        report('unexpected-record', path, 'a scenario is one <scenario-name>.json');
        continue;
      }
      if (!feature) continue;
      const value = readRecord(path);
      if (value === undefined) continue;
      const problems = scenarioProblems(value);
      for (const problem of problems) report('invalid-record', path, problem);
      if (problems.length > 0) continue;
      const record = value as ScenarioRecord;
      const name = entry.name.slice(0, -'.json'.length);
      const expected = `${feature.id}.${name}`;
      if (!KEBAB.test(name)) {
        report('invalid-record', path, `scenario name "${name}" is not kebab-case`);
        continue;
      }
      if (record.id !== expected) {
        report('id-mismatch', path, `id "${record.id}" does not match its path, which makes it "${expected}"`);
        continue;
      }
      const earlier = seen.get(record.id);
      if (earlier) {
        report('duplicate-id', path, `"${record.id}" is also ${earlier}`);
        continue;
      }
      seen.set(record.id, path);

      checkContract(path, record.contract);
      checkItems(path, record.items);
      const owned = ownership.get(feature.id) ?? [];
      const within = (candidate: string) => owned.some((root) => candidate === root || candidate.startsWith(`${root}/`));
      for (const item of record.items) {
        if (!feature.items.includes(item)) report('outside-ownership', path, `item "${item}" is not one of ${feature.id}'s items`);
      }
      for (const source of record.sources) {
        if (checkPath(path, source, 'either') && !within(source)) {
          report('outside-ownership', path, `${source} is outside ${feature.id}'s items and source roots`);
        }
      }
      for (const demo of record.demos) {
        if (!checkPath(path, demo)) continue;
        const owners = record.items.filter((id) => itemById.get(id)?.paths.some((root) => demo === root || demo.startsWith(`${root}/`)));
        if (!demo.startsWith('apps/docs/src/demos/') || owners.length === 0) {
          report('outside-ownership', path, `demo ${demo} belongs to none of this scenario's items`);
        }
      }
      for (const fixture of record.fixtures) checkPath(path, fixture.path, 'either');

      const resolvedRoutes: JoinedScenario['resolvedRoutes'] = [];
      for (const route of record.routes) {
        if (route.kind === 'item') {
          const item = itemById.get(route.item);
          if (!item) report('unknown-item', path, `route item "${route.item}" is not a catalogue item`);
          else if (!record.items.includes(route.item)) report('outside-ownership', path, `route item "${route.item}" is not one of this scenario's items`);
          else if (!item.route || item.kind !== 'react') report('unsupported-route', path, `"${route.item}" has no component route`);
          else resolvedRoutes.push({ pathname: item.route, definedBy: `catalogue item ${route.item}` });
        } else if (route.kind === 'application') {
          if (!checkPath(path, route.definition)) continue;
          const paths = routePaths(parse(route.definition, read(route.definition) as string));
          if (!paths.has(route.pathname)) {
            report('unsupported-route', path, `${route.definition} defines no createRoute path "${route.pathname}"`);
          } else resolvedRoutes.push({ pathname: route.pathname, definedBy: route.definition });
        } else {
          if (!checkPath(path, route.file)) continue;
          const publicRoot = 'apps/docs/public/';
          if (!route.file.startsWith(publicRoot) || route.pathname !== `/${route.file.slice(publicRoot.length)}`) {
            report('unsupported-route', path, `static fixture ${route.file} is not served at ${route.pathname}`);
          } else resolvedRoutes.push({ pathname: route.pathname, definedBy: route.file });
        }
      }

      const declaredTargets = record.targets.map((entry) => entry.target);
      const bindings: JoinedScenario['bindings'] = [];
      for (const { target, variants } of record.targets) {
        if (declaredTargets.indexOf(target) !== declaredTargets.lastIndexOf(target)) {
          report('invalid-record', path, `target ${target} is declared twice`);
          continue;
        }
        if (target !== 'production' && variants !== 'default') {
          report('unsupported-variant', path, `${target} registers one default case; its fixtures do not apply mode, viewport or motion`);
        }
        bindings.push({ target, cases: expandVariants(variants).map((variant) => ({ id: caseId(record.id, target, variant), variant })) });
      }
      feature.scenarios.push(record.id);
      scenarios.push({ ...record, feature: feature.id, path, resolvedRoutes, bindings });
    }
  }

  const discovered = discoverBindings(files);
  inputs.push(...discovered.read);
  for (const problem of discovered.problems) report(problem.code, problem.path, problem.message);
  const scenarioById = new Map(scenarios.map((scenario) => [scenario.id, scenario]));
  for (const binding of discovered.bindings) {
    const where = `${binding.path}:${binding.line}`;
    const scenario = scenarioById.get(binding.id);
    const slot = scenario?.bindings.find((entry) => entry.target === binding.target);
    if (!scenario) report('orphan-binding', where, `"${binding.id}" has no scenario record under ${SCENARIOS}/`);
    else if (!slot) report('undeclared-target', where, `${binding.id} does not declare the ${binding.target} target`);
    else if (slot.binding) {
      report('duplicate-binding', where, `${binding.id} already has its ${binding.target} binding at ${slot.binding.path}:${slot.binding.line}`);
    } else slot.binding = binding;
  }
  for (const scenario of scenarios) {
    for (const slot of scenario.bindings) {
      if (!slot.binding) {
        report(
          'missing-binding',
          scenario.path,
          `${scenario.id} requires a ${slot.target} binding under ${TARGET_DIRECTORIES[slot.target]}/ and none registers it`,
        );
      }
    }
  }

  features.sort((a, b) => a.id.localeCompare(b.id));
  scenarios.sort((a, b) => a.id.localeCompare(b.id));
  for (const feature of features) feature.scenarios.sort();
  return { model: { features, scenarios, items, inputs: [...new Set(inputs)].sort() }, diagnostics };
}

export function formatVerificationDiagnostics(diagnostics: VerificationDiagnostic[]): string {
  return diagnostics.map((d) => `  ${d.code} ${d.path}: ${d.message}`).join('\n');
}

/** Every case the joined model requires of one target, in scenario order: what a runner must report back. */
export function casesFor(model: VerificationModel, target: Target): string[] {
  return model.scenarios.flatMap((scenario) => scenario.bindings.filter((slot) => slot.target === target).flatMap((slot) => slot.cases.map((entry) => entry.id)));
}
