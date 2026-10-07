// ULT-REGISTRY-001: missing or stale item metadata, unstaged dependencies and source/item shape
// mismatches, found before any registry build from the builder's own staging plan and the catalogue
// model. docs/spec/agent-infrastructure.md, Import and registry boundaries.
import { importsOf } from '../../../../scripts/catalogue/source.ts';
import { stagedTarget } from '../../../../scripts/catalogue/staging.ts';
import type { Diagnostic } from '../diagnostic.ts';
import type { RegistryInputs } from '../scope.ts';
import type { Parsed } from '../sources.ts';
import type { Context } from './context.ts';

const INFRA = 'docs/spec/agent-infrastructure.md';
const BOUNDARIES = `${INFRA}#import-and-registry-boundaries`;
const OWNERSHIP = `${INFRA}#ownership`;
const ITEM = 'docs/spec/ultima.md#the-registry-item';

/** The descriptor kind each planned item's files need. */
const SHAPE = { staged: ['react', 'source-bundle'], setup: ['setup'], artifact: ['artifact'], element: ['element'] } as const;

/** What an author does about each catalogue finding. */
const REPAIR: Record<string, string> = {
  'missing-file': 'Restore the file the descriptor names, or delete the descriptor with the item.',
  'missing-reference': 'Name an item that exists, or add its descriptor.',
  'broken-anchor': 'Point the contract at an existing specification heading.',
  'duplicate-order': 'Give the item an order no other item in its group holds.',
  'unknown-release': 'Use a release defined in registry/metadata/releases.ts.',
  'unknown-group': 'Use a catalogue group defined in registry/metadata/groups.ts.',
  'path-outside': 'Keep every path inside the directory the descriptor owns.',
  'source-without-metadata': 'Add the descriptor that claims the file, or remove the file.',
  'invalid-primary-export': 'Export the root function or namespace the descriptor names as primaryExport.',
  'invalid-export': 'Export only names the file declares.',
  'duplicate-export': 'Rename one of the two exports; the UI barrel holds each public name once.',
  'unresolved-import': 'Import a module a registry item stages, through its package specifier.',
  'tooling-import': 'Remove the contributor-tooling import from installable source.',
  'dependency-cycle': 'Break the cycle; registry items install in dependency order.',
  'tag-mismatch': "List exactly the tags the element source registers, the family's root first.",
  'invalid-enum-reference': 'Name a module-scope string table the element source declares.',
  'demo-not-on-page': "Import the recipe's demo on the page that documents it.",
  'unresolved-dependency': 'Resolve the dependency or classify it in the optimizer policy.',
  'stale-policy': 'Remove the stale optimizer policy entry.',
};

export function checkRegistry(context: Context): void {
  const { registry } = context.scope;
  if (!registry) return;
  const at = (file: string, line?: number): Pick<Diagnostic, 'file' | 'start' | 'end'> => ({
    file,
    start: { line: line ?? 1, column: 1 },
    end: { line: line ?? 1, column: 1 },
  });
  const push = (location: Pick<Diagnostic, 'file' | 'start' | 'end'>, fields: Pick<Diagnostic, 'message' | 'repair' | 'link'> & { symbol?: string; target?: string }) =>
    context.diagnostics.push({ ruleId: 'ULT-REGISTRY-001', severity: 'blocking', ...location, ...fields });

  const stagedPaths = new Set(registry.sources.map((source) => source.source));
  // The catalogue reads component and element sources too; where one does not parse, its findings about
  // exports and tags are echoes of that failure, which already leaves the run incomplete.
  const unparsed = context.scope.inventory.some(
    ({ path, kind }) => ['react-component', 'react-helper', 'element', 'token-source'].includes(kind) && !context.source(path),
  );

  for (const finding of unparsed ? [] : registry.findings) {
    // Staged sources get the builder's own import check below, so the catalogue's copy would repeat it.
    if ((finding.code === 'unresolved-import' || finding.code === 'tooling-import') && stagedPaths.has(finding.file)) continue;
    // A test is ULT-SOURCE-001's to place, and a file that does not parse is already incomplete.
    if (context.scope.kindOf(finding.file) === 'test') continue;
    if (/\.(ts|tsx)$/.test(finding.file) && context.scope.kindOf(finding.file) && !context.source(finding.file)) continue;
    if (finding.line !== undefined && context.reportedAt(finding.file, finding.line)) continue;
    push(at(finding.file, finding.line), {
      target: finding.code,
      message: `Registry metadata: ${finding.message}.`,
      repair: REPAIR[finding.code] ?? 'Fix the metadata the catalogue names; pnpm catalogue:check reports the same finding.',
      link: finding.code === 'source-without-metadata' || finding.code === 'missing-file' ? OWNERSHIP : ITEM,
    });
  }

  for (const { source, staged, with: holder } of registry.collisions) {
    push(at(source), {
      target: `registry/${staged}`,
      message: `This file and ${holder} both stage to registry/${staged}, so one would overwrite the other.`,
      repair: 'Rename one of the two sources.',
      link: BOUNDARIES,
    });
  }

  checkPlan(registry, push, at);
  checkStagedImports(context, registry);
}

function checkPlan(
  registry: RegistryInputs,
  push: (location: Pick<Diagnostic, 'file' | 'start' | 'end'>, fields: Pick<Diagnostic, 'message' | 'repair' | 'link'> & { symbol?: string; target?: string }) => void,
  at: (file: string, line?: number) => Pick<Diagnostic, 'file' | 'start' | 'end'>,
): void {
  const planned = new Set(registry.plan.map((item) => item.name));
  for (const { name, from } of registry.plan) {
    const descriptor = registry.descriptors.get(name);
    const sources = registry.sources.filter((source) => source.item === name);
    const where = sources[0]?.source;
    if (!descriptor) {
      // A component file with no descriptor is the catalogue's source-without-metadata finding already.
      if (sources.some((source) => source.type === 'registry:ui')) continue;
      push(at(where ?? `registry/metadata/${SHAPE[from][0]}/${name}.ts`), {
        symbol: name,
        message: `The registry build writes item "${name}" but no descriptor under registry/metadata/ describes it, so the build would fail.`,
        repair: `Add registry/metadata/${SHAPE[from][0]}/${name}.ts.`,
        link: OWNERSHIP,
      });
      continue;
    }
    if (!(SHAPE[from] as readonly string[]).includes(descriptor.kind)) {
      push(at(descriptor.path), {
        symbol: name,
        message: `Item "${name}" is a ${descriptor.kind} descriptor, but the build writes it from ${from === 'staged' ? `staged source (${where})` : `its ${from} path`}.`,
        repair: `Describe it as ${SHAPE[from].join(' or ')}, or rename the source so the two stop sharing an ID.`,
        link: ITEM,
      });
    }
    const components = sources.filter((source) => source.type === 'registry:ui');
    if (descriptor.kind === 'react' && components.length !== 1) {
      push(at(descriptor.path), {
        symbol: name,
        message: `React item "${name}" stages ${components.length} files; a component item carries exactly one.`,
        repair: 'Keep the component in the one file named for its item.',
        link: ITEM,
      });
    }
  }
  for (const [name, descriptor] of registry.descriptors) {
    if (planned.has(name)) continue;
    push(at(descriptor.path), {
      symbol: name,
      message: `The ${descriptor.kind} descriptor "${name}" describes an item the registry build never writes: its metadata is stale.`,
      repair: 'Delete the descriptor, or restore the source the build stages for it.',
      link: OWNERSHIP,
    });
  }
}

/** Every workspace import in a staged file must rewrite to another staged file, as the build rewrites it. */
function checkStagedImports(context: Context, registry: RegistryInputs): void {
  for (const { source } of registry.sources) {
    const parsed = context.source(source);
    if (!parsed) continue;
    const segment = parsed.segments[0] as Parsed['segments'][number];
    const { imports } = importsOf(segment.file);
    for (const entry of imports) {
      if (!entry.specifier.startsWith('@ultima/')) continue;
      if (stagedTarget(entry.specifier, registry.sources)) continue;
      // ULT-IMPORT-001 rejects most unstaged spellings at the same site; this catches the rest, where
      // the checker's resolution and the build's staging disagree.
      if (context.reportedAt(source, parsed.text.slice(0, entry.start).split('\n').length)) continue;
      context.report({
        ruleId: 'ULT-REGISTRY-001',
        parsed,
        start: entry.start,
        end: entry.end,
        target: entry.specifier,
        message: `An installable file imports "${entry.specifier}", which the registry build stages no file for, so the installed copy would not resolve.`,
        repair: 'Import a module a registry item stages: a token source, a lib helper or a component item.',
        link: BOUNDARIES,
      });
    }
  }
}
