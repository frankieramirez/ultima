import { consumerBundle, safePath, type CopyBundle } from './consumer-copy.ts';
import { readLiteral } from './descriptors.ts';
import type { Files } from './files.ts';
import type { Catalogue, Diagnostic } from './model.ts';
import { headingAnchors } from './source.ts';

export type CompositionExample = {
  id: string;
  title: string;
  recipe?: string;
  block?: string;
  /** The owning page and heading; both are omitted together until that page is published. */
  route?: string;
  anchor?: string;
  /** Empty only for a block lesson: the block's registry item installs its source. */
  files: { source: string; destination: string }[];
  feature?: string;
  scenarios?: string[];
};
export const COMPOSITION_INVENTORY = 'scripts/catalogue/composition-examples.ts';
export type CompositionProjection = CompositionExample & { install: string };

const installCommand = (items: string[]) => {
  const installable = items.filter((id) => !['tokens', 'lib'].includes(id));
  return { items: installable, install: `npx shadcn add ${installable.map((id) => `@ultima/${id}`).join(' ')}` };
};
export type RecipeProjection = {
  id: string;
  title: string;
  description: string;
  page: string;
  section: string;
  url: string;
  items: string[];
  dependencies: string[];
  /** The `@types/*` packages the docs app compiles these engines with, so a TypeScript consumer can too. */
  devDependencies: string[];
  install: string;
  engines: string | null;
  sources: string[];
};

export function compositionProjection(files: Files, catalogue: Catalogue): {
  recipes: RecipeProjection[]; sources: Record<string, CopyBundle>; examples: CompositionProjection[]; diagnostics: Diagnostic[];
} {
  const diagnostics: Diagnostic[] = [];
  const report = (path: string, message: string) => diagnostics.push({ code: 'unresolved-dependency' as const, path, message });
  const sources: Record<string, CopyBundle> = {};
  const text = files.read(COMPOSITION_INVENTORY);
  if (text === undefined) report(COMPOSITION_INVENTORY, 'missing composition inventory');
  const literal = text === undefined ? { value: [], problems: [] } : readLiteral(COMPOSITION_INVENTORY, text);
  literal.problems.forEach((message) => report(COMPOSITION_INVENTORY, message));
  const examples: CompositionProjection[] = [];
  const seen = new Set<string>();
  if (!Array.isArray(literal.value)) report(COMPOSITION_INVENTORY, 'inventory must be an array');
  for (const value of Array.isArray(literal.value) ? literal.value : []) {
    const example = value as CompositionExample;
    if (!example || typeof example !== 'object' || typeof example.id !== 'string' || !/^[a-z0-9]+(-[a-z0-9]+)*$/.test(example.id) || seen.has(example.id)) {
      report(COMPOSITION_INVENTORY, 'invalid or duplicate example ID'); continue;
    }
    seen.add(example.id);
    if (typeof example.title !== 'string' || !example.title.trim() || !Array.isArray(example.files) || (example.files.length === 0 && !example.block)) {
      report(COMPOSITION_INVENTORY, `${example.id}: title and source bundle are required`); continue;
    }
    if (example.route !== undefined || example.anchor !== undefined) {
      const page = typeof example.route === 'string' && /^\/components\/([a-z0-9-]+)$/.exec(example.route);
      const pageSource = page ? files.read(`apps/docs/src/content/components/${page[1]}.mdx`) :
        typeof example.route === 'string' && /^\/[a-z0-9-]+$/.test(example.route) ? files.read(`apps/docs/src/content${example.route}.mdx`) : undefined;
      if (!pageSource || typeof example.anchor !== 'string' || !headingAnchors(pageSource).has(example.anchor)) report(COMPOSITION_INVENTORY, `${example.id}: unresolved route/anchor`);
    }
    const recipe = catalogue.recipes.find((entry) => entry.id === example.recipe);
    if (example.recipe && (!recipe || example.route !== `/components/${recipe.page}` || example.anchor !== recipe.section)) report(COMPOSITION_INVENTORY, `${example.id}: unresolved recipe owner`);
    if (example.block && !catalogue.blocks.some((entry) => entry.id === example.block)) report(COMPOSITION_INVENTORY, `${example.id}: unresolved block owner`);
    if (example.feature && files.read(`verification/features/${example.feature}.json`) === undefined) report(COMPOSITION_INVENTORY, `${example.id}: unresolved feature`);
    if (example.scenarios !== undefined && (!Array.isArray(example.scenarios) || example.scenarios.some((id) => typeof id !== 'string' || files.read(`verification/scenarios/${id.replace('.', '/')}.json`) === undefined))) report(COMPOSITION_INVENTORY, `${example.id}: unresolved scenarios`);
    const destinations: Record<string, string> = {};
    for (const file of example.files) {
      if (!file || typeof file.source !== 'string' || typeof file.destination !== 'string' || !safePath(file.source) || !safePath(file.destination) || destinations[file.source] !== undefined || Object.values(destinations).includes(file.destination)) {
        report(COMPOSITION_INVENTORY, `${example.id}: invalid or duplicate source/destination`); continue;
      }
      destinations[file.source] = file.destination;
    }
    for (const source of Object.keys(destinations)) {
      try { sources[source] = consumerBundle(source, catalogue, files, undefined, destinations); }
      catch (error) { report(source, (error as Error).message); }
    }
    const entry = example.files[0] && sources[example.files[0].source];
    const items = entry ? entry.items : example.block && example.files.length === 0 ? [example.block] : undefined;
    examples.push({ ...example, install: items ? installCommand(items).install : '' });
  }
  const docsManifest = JSON.parse(files.read('apps/docs/package.json') ?? '{}') as Record<string, Record<string, string> | undefined>;
  const docsPackages = new Set([...Object.keys(docsManifest.dependencies ?? {}), ...Object.keys(docsManifest.devDependencies ?? {})]);
  const recipes = catalogue.recipes.map((recipe) => {
    for (const source of recipe.demos) {
      try { sources[source] ??= consumerBundle(source, catalogue, files); }
      catch (error) { report(source, (error as Error).message); }
    }
    const { items, install } = installCommand(recipe.registryDependencies);
    const devDependencies = recipe.dependencies.map((name) => `@types/${name.replace(/^@/, '').replace('/', '__')}`).filter((name) => docsPackages.has(name));
    return {
      id: recipe.id, title: recipe.title, description: recipe.description, page: recipe.page, section: recipe.section,
      url: `/components/${recipe.page}#${recipe.section}`, items, dependencies: recipe.dependencies, devDependencies,
      install,
      engines: recipe.dependencies.length > 0
        ? [`npm install ${recipe.dependencies.join(' ')}`, ...(devDependencies.length > 0 ? [`npm install -D ${devDependencies.join(' ')}`] : [])].join('\n')
        : null,
      sources: recipe.demos,
    };
  });
  return { recipes, sources, examples, diagnostics };
}
