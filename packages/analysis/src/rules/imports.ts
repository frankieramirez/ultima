// ULT-IMPORT-001 and ULT-PRIMITIVE-001: dependency direction, staged module paths, declared component
// composition and the primitive source per render target. docs/spec/agent-infrastructure.md, Import and
// registry boundaries, and Target and API distinctions.
import ts from 'typescript';

import { importsOf } from '../../../../scripts/catalogue/source.ts';
import { DESIGN_ASSETS, allows, categoryOf, packageName } from '../policy.ts';
import { DOCS_KINDS, PRODUCTION_KINDS, type Resolution, type SourceKind } from '../scope.ts';
import type { Parsed } from '../sources.ts';
import type { Context } from './context.ts';

const INFRA = 'docs/spec/agent-infrastructure.md';
const BOUNDARIES = `${INFRA}#import-and-registry-boundaries`;
const TARGETS = `${INFRA}#target-and-api-distinctions`;
const ONE_FILE = 'docs/spec/ultima.md#one-file-per-component';
const BLOCKS = 'docs/spec/ultima.md#sources-and-the-files-of-a-block';
const BLOCK_ENGINES = 'docs/spec/ultima.md#engines-in-a-block';

const LABEL: Record<SourceKind, string> = {
  'token-source': 'a token source',
  'react-component': 'a React component',
  'react-helper': 'a shared React helper',
  element: 'an element',
  block: 'a block file',
  docs: 'docs application code',
  demo: 'a demo',
  content: 'an MDX page',
  test: 'a test',
  tooling: 'build tooling',
  metadata: 'registry metadata',
  'setup-template': 'a setup template',
  declarations: 'a declaration file',
  generated: 'generated output',
  fixture: 'a checker fixture',
  app: 'consumer code',
  stylesheet: 'a consumer stylesheet',
};

/** What production code may never reach, whatever the spelling. */
const PRODUCTION_NEVER: readonly SourceKind[] = ['docs', 'demo', 'content', 'test', 'tooling', 'metadata', 'setup-template', 'fixture', 'generated'];
/** What the docs application may never reach: it depends on the lower layers and on generated wiring. */
const DOCS_NEVER: readonly SourceKind[] = ['test', 'tooling', 'metadata', 'setup-template', 'fixture'];

export function checkImports(context: Context): void {
  const { scope } = context;
  for (const { path, kind } of scope.inventory) {
    const production = PRODUCTION_KINDS.includes(kind);
    if (!production && !DOCS_KINDS.includes(kind)) continue;
    const parsed = context.source(path);
    if (!parsed) continue;
    const item = scope.itemOf(path);

    for (const segment of parsed.segments) {
      const { imports, problems } = importsOf(segment.file);
      for (const problem of problems) {
        context.report({
          ruleId: 'ULT-ANALYSIS-001',
          parsed,
          start: (problem.start ?? 0) + segment.shift,
          end: (problem.end ?? 0) + segment.shift,
          target: 'import()',
          message: `${LABEL[kind]} imports a computed specifier, so its dependencies cannot be established.`,
          repair: 'Import a string literal, or a static import the registry can stage.',
          link: BOUNDARIES,
        });
      }
      if (production) reportCommonJs(context, parsed, segment.file, segment.shift, kind);

      for (const entry of imports) {
        const at = { parsed, start: entry.start + segment.shift, end: entry.end + segment.shift, target: entry.specifier };
        const symbol = entry.names.map((name) => name.imported).join(', ') || undefined;
        const resolution = scope.resolve(entry.specifier, path);
        const verdict = production
          ? productionVerdict(context, kind, item, path, resolution)
          : docsVerdict(context, kind, path, resolution);
        if (verdict) context.report({ ...at, ...(symbol && { symbol }), ...verdict });
      }
    }
  }
}

type Verdict = { ruleId: string; message: string; repair: string; link: string };

function reportCommonJs(context: Context, parsed: Parsed, file: ts.SourceFile, shift: number, kind: SourceKind): void {
  const visit = (node: ts.Node) => {
    const required =
      (ts.isCallExpression(node) && ts.isIdentifier(node.expression) && node.expression.text === 'require') ||
      ts.isImportEqualsDeclaration(node);
    if (required) {
      context.report({
        ruleId: 'ULT-ANALYSIS-001',
        parsed,
        start: node.getStart(file) + shift,
        end: node.getEnd() + shift,
        target: 'require',
        message: `${LABEL[kind]} loads a module through CommonJS, which the import analysis does not follow.`,
        repair: 'Use a static ES import so the dependency can be classified and staged.',
        link: BOUNDARIES,
      });
    }
    ts.forEachChild(node, visit);
  };
  visit(file);
}

function unresolved(resolution: Extract<Resolution, { kind: 'unresolved' }>, kind: SourceKind): Verdict {
  if (resolution.via === 'relative') {
    return {
      ruleId: 'ULT-ANALYSIS-001',
      message: `${LABEL[kind]} imports a path that resolves to no file (${resolution.reason}), so the dependency cannot be classified.`,
      repair: 'Point the import at an existing module.',
      link: BOUNDARIES,
    };
  }
  return {
    ruleId: 'ULT-IMPORT-001',
    message: `${LABEL[kind]} imports a workspace module no package export stages (${resolution.reason}).`,
    repair: 'Import a module path the package exports, such as a token source or a component item.',
    link: BOUNDARIES,
  };
}

function docsVerdict(context: Context, kind: SourceKind, from: string, resolution: Resolution): Verdict | undefined {
  if (resolution.kind === 'external') return undefined;
  if (resolution.kind === 'unresolved') return unresolved(resolution, kind);
  if (resolution.path.startsWith('ultima-assets/')) {
    if (DESIGN_ASSETS.some(({ asset, importer }) => asset === resolution.path && importer === from)) return undefined;
    return {
      ruleId: 'ULT-IMPORT-001',
      message: `${LABEL[kind]} imports the design asset ${resolution.path}, which no entry in the policy's design assets names for ${from}.`,
      repair: 'Import a design asset only where an owning decision names it, and add that asset and importer to DESIGN_ASSETS with its spec link.',
      link: DESIGN_ASSETS[0]?.authority ?? BOUNDARIES,
    };
  }
  const target = context.scope.kindOf(resolution.path);
  if (target && DOCS_NEVER.includes(target)) {
    return {
      ruleId: 'ULT-IMPORT-001',
      message: `${LABEL[kind]} imports ${LABEL[target]} (${resolution.path}); the docs application may depend on the lower layers only.`,
      repair: 'Move what the page needs into docs code or a production package, or read generated wiring instead of the tool that writes it.',
      link: BOUNDARIES,
    };
  }
  return undefined;
}

function productionVerdict(
  context: Context,
  kind: SourceKind,
  item: string | undefined,
  from: string,
  resolution: Resolution,
): Verdict | undefined {
  const { scope } = context;
  if (resolution.kind === 'unresolved') return unresolved(resolution, kind);

  if (resolution.kind === 'external') {
    const name = resolution.package;
    const category = categoryOf(scope.policy, name);
    if (!category) {
      return {
        ruleId: 'ULT-IMPORT-001',
        message: `${LABEL[kind]} imports "${name}", a dependency no category in the dependency policy classifies.`,
        repair: `Remove the dependency, or classify "${name}" in the policy with a spec link after review; a new production dependency is never allowed automatically.`,
        link: BOUNDARIES,
      };
    }
    if (allows(scope.policy, kind, category.category, item)) return undefined;
    if (category.category === 'engine' && kind === 'block') {
      if (item !== undefined && scope.blockEngines?.(item).has(name)) return undefined;
      return {
        ruleId: 'ULT-IMPORT-001',
        message: `a block file imports the engine "${name}", but its descriptor names no recipe whose demos import it.`,
        repair: `Name the recipe this block follows in its descriptor's \`recipes\`, if one of that recipe's demos imports "${name}"; otherwise draw without the engine.`,
        link: BLOCK_ENGINES,
      };
    }
    if (category.category === 'engine') {
      return {
        ruleId: 'ULT-IMPORT-001',
        message: `${LABEL[kind]} imports the engine "${name}", which belongs in recipe and demo scope, never as a hidden component dependency.`,
        repair: 'Ship the composition as a recipe whose demo imports the engine.',
        link: category.authority,
      };
    }
    const why =
      category.category === 'icon'
        ? `the icon package "${name}"; installed items carry private glyphs instead`
        : category.category === 'foreign-primitive'
          ? `"${name}", a primitive library outside the target's one primitive vocabulary`
          : kind === 'element'
            ? `"${name}", which crosses render targets: elements stay React-free on their Zag vanilla layer`
            : category.category.startsWith('zag')
              ? `"${name}", a Zag package; React reaches for Zag only in the entries Base UI ships no primitive for`
              : `"${name}", which ${LABEL[kind]} may not depend on`;
    return {
      ruleId: 'ULT-PRIMITIVE-001',
      message: `${LABEL[kind]} imports ${why}.`,
      repair:
        category.category === 'icon'
          ? 'Write the glyph as inline SVG private to the component file.'
          : kind === 'element'
            ? 'Use @zag-js/vanilla and the Zag machine for the element.'
            : 'Use the Base UI primitive, or record an owning decision that admits this entry before importing it.',
      link: category.authority,
    };
  }

  const target = scope.kindOf(resolution.path);
  if (!target) {
    return {
      ruleId: 'ULT-IMPORT-001',
      message: `${LABEL[kind]} imports ${resolution.path}, which is outside every authored source scope, so the registry cannot stage it.`,
      repair: 'Import a staged module: a token source, the shared helper or a component item.',
      link: BOUNDARIES,
    };
  }
  if (PRODUCTION_NEVER.includes(target)) {
    return {
      ruleId: 'ULT-IMPORT-001',
      message: `${LABEL[kind]} imports ${LABEL[target]} (${resolution.path}); production targets may not depend on docs, tests, fixtures, tooling or generated output.`,
      repair: target === 'generated' ? 'Import the component item or module directly, never a barrel.' : 'Move the shared code into the production package that owns it.',
      link: BOUNDARIES,
    };
  }
  if (target === 'declarations') return undefined;

  const staged = scope.staged(resolution.path);
  if (kind === 'token-source') {
    if (target === 'token-source') return undefined;
    return {
      ruleId: 'ULT-IMPORT-001',
      message: `a token source imports ${LABEL[target]} (${resolution.path}); token sources depend on no layer above them.`,
      repair: 'Keep token sources free of UI, element, docs and tooling code.',
      link: BOUNDARIES,
    };
  }
  if (kind === 'element' && (target === 'react-component' || target === 'react-helper')) {
    return {
      ruleId: 'ULT-PRIMITIVE-001',
      message: `an element imports ${LABEL[target]} (${resolution.path}); elements stay React-free and restate their component instead.`,
      repair: 'Restate the styles in the element file; the parity gate keeps the two in step.',
      link: TARGETS,
    };
  }
  if (kind === 'react-helper' && target === 'react-helper') return undefined;
  if (kind === 'block' && target === 'block') {
    if (resolution.via === 'relative' && item !== undefined && scope.itemOf(resolution.path) === item) return undefined;
    return {
      ruleId: 'ULT-IMPORT-001',
      message: `a block file imports ${resolution.path}, outside its own block; each block installs alone, and only its own files come with it.`,
      repair: 'Import the catalogue component through @ultima/ui/<name>, or copy what the block needs into its own folder.',
      link: BLOCKS,
    };
  }
  const allowedTargets: readonly SourceKind[] =
    kind === 'react-component' || kind === 'block' ? ['token-source', 'react-helper', 'react-component'] : ['token-source'];
  if (!allowedTargets.includes(target)) {
    return {
      ruleId: 'ULT-IMPORT-001',
      message: `${LABEL[kind]} imports ${LABEL[target]} (${resolution.path}), against the dependency direction.`,
      repair: 'Depend only on token sources, the shared helper and, for a React component, other component items.',
      link: BOUNDARIES,
    };
  }
  if (resolution.via === 'relative') {
    return {
      ruleId: 'ULT-IMPORT-001',
      message: `${LABEL[kind]} imports ${resolution.path} by a relative path, which the registry build neither stages nor declares as a dependency.`,
      repair: staged ? `Import "${staged.specifier}".` : 'Import the module through its package specifier.',
      link: ONE_FILE,
    };
  }
  if (!staged) {
    if (!scope.registry) return undefined;
    return {
      ruleId: 'ULT-IMPORT-001',
      message: `${LABEL[kind]} imports ${resolution.path}, a module no registry item stages.`,
      repair: 'Import a staged module directly; barrels and unstaged files never install.',
      link: BOUNDARIES,
    };
  }
  if (target === 'react-component' && resolution.path === from) {
    return {
      ruleId: 'ULT-IMPORT-001',
      message: 'a React component imports itself.',
      repair: 'Remove the self import.',
      link: ONE_FILE,
    };
  }
  return undefined;
}
