import { createProcessor } from '@mdx-js/mdx';
import { mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join, relative, sep } from 'node:path';
import { INSTALL_TARGETS } from '../apps/docs/src/install-targets.ts';
import { proofDraft } from '../apps/docs/src/proof-draft.ts';
import { ultimaPresetUrl } from '../apps/docs/src/ultima-preset.ts';
import { createRegistryUrl } from '../packages/tokens/src/theme/registry-url.ts';
import { encodeFragment } from '../packages/tokens/src/theme/codec.ts';
import { setupItems } from '../registry/items.config.ts';
import type { CompositionProjection, RecipeProjection } from './catalogue/compositions.ts';
import type { CopyBundle } from './catalogue/consumer-copy.ts';
import type { Files } from './catalogue/files.ts';
import type { Catalogue } from './catalogue/model.ts';
import { headingAnchors } from './catalogue/source.ts';
import type { EvidenceManifest } from './consumer-evidence.ts';

type Composition = { examples: CompositionProjection[]; recipes: RecipeProjection[]; sources: Record<string, CopyBundle> };
type Node = { type: string; name?: string | null; value?: string; url?: string; children?: Node[]; attributes?: { name?: string; value?: string | { value: string } | null }[]; position: { start: { offset: number }; end: { offset: number } } };
const ORIGIN = 'https://ultima.systems';
const PAGES = new Map([['/install', 'install'], ['/install/update', 'install-update'], ['/build-a-screen', 'build-a-screen'], ['/support', 'support']]);
export const guidePath = (route: string) => `/guides${route}.md`;
export const lessonPath = (id: string) => `/guides/lessons/${id}.md`;
export const recipePath = (id: string) => `/guides/recipes/${id}.md`;
const fence = (content: string, language = '') => {
  const delimiter = '`'.repeat(Math.max(3, ...[...content.matchAll(/`+/g)].map((match) => match[0].length + 1)));
  return `${delimiter}${language}\n${content}${content.endsWith('\n') ? '' : '\n'}${delimiter}\n`;
};
const command = (text: string) => fence(text, 'sh');
const attribute = (node: Node, name: string) => node.attributes?.find((entry) => entry.name === name)?.value;
const required = (files: Files, path: string) => {
  const source = files.read(path);
  if (!source) throw new Error(`missing guidance source: ${path}`);
  return source;
};
const table = (rows: string[][]) => rows.map((row, index) => `| ${row.map((cell) => cell.replaceAll('|', '\\|').replaceAll('\n', ' ')).join(' | ')} |${index === 0 ? `\n| ${row.map(() => '---').join(' | ')} |` : ''}`).join('\n');
const COPY_GUIDANCE = "Save every file at its shown path under the directory your `@` alias points to. Substitute your components.json aliases for `@/components/ui`, `@/lib` and `@/components`. Keep interactive examples behind a Next.js client boundary. You own the copied source.\n";

function bundleText(bundle: CopyBundle): string {
  if (!bundle.files.length) throw new Error(`empty copy bundle: ${bundle.entry}`);
  return bundle.files.map((file) => `### ${file.path}\n\n${fence(file.content, file.path.endsWith('.json') ? 'json' : file.path.endsWith('.tsx') ? 'tsx' : 'ts')}`).join('\n');
}

function recipeSection(files: Files, recipe: RecipeProjection): string {
  const source = required(files, `apps/docs/src/content/components/${recipe.page}.mdx`);
  const headings = [...source.matchAll(/^## (.+)$/gm)];
  const heading = headings.find((match) => headingAnchors(`## ${match[1]}`).has(recipe.section));
  if (!heading) throw new Error(`missing recipe section: ${recipe.id}`);
  const next = headings.find((match) => match.index! > heading.index!);
  return source.slice(heading.index, next?.index);
}

export async function markdownGuidance(files: Files, catalogue: Catalogue, composition: Composition): Promise<Map<string, string>> {
  const output = new Map<string, string>();
  const support = JSON.parse(required(files, 'apps/docs/src/support-evidence.json')) as EvidenceManifest;
  const examples = new Map(composition.examples.map((example) => [example.id, example]));
  const lesson = (id: string) => {
    const example = examples.get(id);
    if (!example) throw new Error(`missing guidance lesson: ${id}`);
    return example;
  };
  const draft = proofDraft();
  const [theme, fragment, preset] = await Promise.all([createRegistryUrl(draft, ORIGIN), encodeFragment(draft), ultimaPresetUrl()]);
  if (theme.tooLong || preset.tooLong) throw new Error('guidance theme URL exceeds the registry limit');
  const dynamic = (node: Node): string | undefined => {
    switch (node.name) {
      case 'InstallCommands': return INSTALL_TARGETS.map((target) => `### ${target.label}\n\n${command(target.commands.join('\n'))}`).join('\n');
      case 'HandSteps': {
        const item = attribute(node, 'item');
        if (item !== 'setup-vite' && item !== 'setup-next') throw new Error(`unknown guidance setup: ${String(item)}`);
        return setupItems[item].handSteps.map((step, i) => `${i + 1}. ${step.prose} (${step.assertion ? 'doctor checks this' : "cannot be checked by doctor"})`).join('\n');
      }
      case 'LessonInstall': {
        const id = attribute(node, 'id');
        if (typeof id !== 'string') throw new Error('LessonInstall requires a literal id');
        return command(lesson(id).install);
      }
      case 'ProductThemeInstall': return `${command(`npx shadcn@4.21.4 add "${theme.url}"`)}\n[Open this draft in Theme Studio](${ORIGIN}/theme-studio${fragment.fragment})`;
      case 'UltimaPresetInstall': return command(`npx shadcn@4.21.4 add "${preset.url}"`);
      case 'CompleteScreens': return catalogue.blocks.map((block) => `- [${block.title}](${ORIGIN}/blocks/${block.id}): ${block.description}`).join('\n');
      case 'SettingsPreview': return '[Settings 01 preview](https://ultima.systems/blocks/settings-01)';
      case 'WhereNext': return [...PAGES.keys(), '/recipes', '/components', '/tokens', '/theme-studio', '/cli', '/blocks'].map((route) => `- [${route.slice(1)}](${ORIGIN}${PAGES.has(route) || route === '/recipes' ? guidePath(route) : route})`).join('\n');
      case 'EvidenceSummary': return `Last full run: ${support.run.date}, revision [${support.run.revision}](https://github.com/frankieramirez/ultima/commit/${support.run.revision}), [run ${support.run.id}](${support.run.url}). All ${support.matrix.cells} registered cells passed in ${support.matrix.engines.join(', ')} on ${support.platform.os} ${support.platform.arch}.`;
      case 'TestedVersions': return [table([['Engine', 'Version'], ...Object.entries(support.browsers)]), ...support.fixtures.map((fixture) => `### ${fixture.layout}\n\n${table([['Package', 'Version'], ...Object.entries(fixture.versions)])}`), `Node ${support.tools.node}, npm ${support.tools.npm}. CLI ultima-design ${support.cli.version}, tarball SHA-256 ${support.cli.tarballDigest}.`].join('\n\n');
      case 'TestedRecipes': return table([['Setup', 'Entry', 'Cells'], ...support.fixtures.map((fixture) => [fixture.layout, fixture.setup ?? 'tokens-css', String(fixture.cells)])]);
      case 'RtlClaim': return `Excluded from the RTL claim: ${support.knownGaps.filter((gap) => gap.bundle === 'direction-locale').map((gap) => gap.component).join(', ')}.`;
      case 'KnownGaps': return support.knownGaps.map((gap) => `- **${gap.component}**, \`${gap.assertion}\` in ${gap.bundle}, ${gap.engines.join(', ')}${gap.issue ? `, [${gap.issue}](https://github.com/frankieramirez/ultima/issues/${gap.issue.replace(/^#/, '')})` : ''}. ${gap.reason} Recorded in ${gap.observed.length} of ${gap.engines.length * 2} cells.`).join('\n');
      case 'OpenGaps': return support.openGaps.map((gap) => `- **${gap.title}.** ${gap.closes}`).join('\n');
      case 'EvidenceReports': return `${table([['Report', 'Cells', 'SHA-256'], ...support.fixtures.map((fixture) => [fixture.report, String(fixture.cells), fixture.reportDigest])])}\n\nReports are artifacts of [run ${support.run.id}](${support.run.url}), retained for 90 days. [Evidence manifest](https://github.com/frankieramirez/ultima/blob/main/apps/docs/src/support-evidence.json).`;
      default: return undefined;
    }
  };
  const links = new Map([...PAGES.keys()].map((route) => [route, guidePath(route)]));
  links.set('/recipes', guidePath('/recipes'));
  for (const recipe of composition.recipes) links.set(recipe.url, recipePath(recipe.id));
  const rewriteLink = (url: string) => {
    const local = url.startsWith(ORIGIN) ? url.slice(ORIGIN.length) : url;
    if (!local.startsWith('/')) return url;
    const exact = links.get(local);
    if (exact) return ORIGIN + exact;
    const [page, hash] = local.split('#');
    return `${ORIGIN}${links.get(page!) ?? page}${hash ? `#${hash}` : ''}`;
  };
  const markdown = (source: string, recipe?: RecipeProjection): string => {
    const root = createProcessor().parse(source) as unknown as Node;
    const render = (node: Node): string => {
      if (node.type === 'mdxjsEsm') return '';
      if (node.type === 'mdxFlowExpression' || node.type === 'mdxTextExpression') throw new Error(`unhandled guidance expression: ${node.value}`);
      if (node.type === 'mdxJsxFlowElement' || node.type === 'mdxJsxTextElement') {
        const projected = dynamic(node);
        if (projected !== undefined) return projected;
        if (node.name === 'Demo') {
          if (recipe) return '';
          const source = attribute(node, 'source');
          const match = typeof source === 'object' && source ? /^lessonSource\('([^']+)'\)$/.exec(source.value) : null;
          if (!match) throw new Error('guidance Demo must reference a lesson bundle');
          const example = lesson(match[1]!);
          return `[Complete source: ${example.title}](${ORIGIN}${lessonPath(example.id)})`;
        }
        if (!['Callout', 'Columns', 'Card.Root', 'Card.Body', 'Code', null].includes(node.name ?? null)) throw new Error(`unhandled guidance component: ${node.name}`);
        const contents = (node.children ?? []).map(render).join(node.type === 'mdxJsxFlowElement' ? '\n\n' : '');
        const title = attribute(node, 'title');
        const label = typeof title === 'string' ? title : title && typeof title === 'object' ? markdown(title.value) : '';
        return `${label ? `**${label.trim()}**\n\n` : ''}${node.name === 'Code' ? `\`${contents}\`` : contents}`;
      }
      const start = node.position.start.offset;
      const end = node.position.end.offset;
      let text = source.slice(start, end);
      if ((node.type === 'link' || node.type === 'definition') && node.url && rewriteLink(node.url) !== node.url) {
        const prefix = node.type === 'definition' ? /^\[(?:\\.|[^\]\\])*\]:\s*/.exec(text)?.[0].length : text.indexOf('](', (node.children?.at(-1)?.position.end.offset ?? start + 1) - start) + 2;
        if (prefix === undefined || prefix < 2) throw new Error(`missing guidance link destination: ${text}`);
        let offset = prefix;
        while (/\s/.test(text[offset] ?? '') && offset < text.length) offset++;
        const angled = text[offset] === '<';
        if (angled) offset++;
        let finish = offset;
        let depth = 0;
        while (finish < text.length) {
          const character = text[finish]!;
          if (character === '\\') { finish += 2; continue; }
          if (angled ? character === '>' : /\s/.test(character) || character === ')' && depth === 0) break;
          if (character === '(') depth++;
          if (character === ')') depth--;
          finish++;
        }
        const destination = rewriteLink(node.url).replaceAll('&', '&amp;').replace(/\s/g, (character) => `&#${character.codePointAt(0)};`).replace(angled ? /[\\<>]/g : /[\\()<>]/g, '\\$&');
        text = text.slice(0, offset) + destination + text.slice(finish);
      }
      for (const child of [...(node.children ?? [])].reverse()) text = text.slice(0, child.position.start.offset - start) + render(child) + text.slice(child.position.end.offset - start);
      return text;
    };
    return render(root).trim() + '\n';
  };
  for (const [route, source] of PAGES) output.set(guidePath(route).slice('/guides/'.length), markdown(required(files, `apps/docs/src/content/${source}.mdx`)));
  for (const example of composition.examples) {
    const bundle = example.files[0] && composition.sources[example.files[0].source];
    if (!bundle && !example.block) throw new Error(`missing copy bundle: ${example.id}`);
    const block = example.block && catalogue.blocks.find((block) => block.id === example.block);
    if (example.block && !block) throw new Error(`missing block: ${example.block}`);
    output.set(`lessons/${example.id}.md`, `# ${example.title}\n\n[Lesson](${ORIGIN}${guidePath('/build-a-screen')}#${example.anchor})\n\n${COPY_GUIDANCE}\n${command(example.install)}\n${bundle ? [...(bundle.dependencies.length ? [command(`npm install ${bundle.dependencies.join(' ')}`)] : []), bundleText(bundle)].join('\n') : command(`import { ${block && block.primaryExport} } from '@/components/${example.block}/${example.block}';`)}`);
  }
  for (const recipe of composition.recipes) {
    const bundles = recipe.sources.map((source) => {
      const bundle = composition.sources[source];
      if (!bundle) throw new Error(`missing copy bundle: ${source}`);
      return bundleText(bundle);
    });
    output.set(`recipes/${recipe.id}.md`, `# ${recipe.title}\n\n${recipe.description}\n\n${COPY_GUIDANCE}\n${command([recipe.install, recipe.engines].filter(Boolean).join('\n'))}\n${markdown(recipeSection(files, recipe), recipe)}\n${bundles.join('\n')}`);
  }
  output.set('recipes.md', `# Recipes\n\n${COPY_GUIDANCE}\n${composition.recipes.map((recipe) => `## ${recipe.title}\n\n${recipe.description}\n\n[Instructions and complete source](${ORIGIN}${recipePath(recipe.id)})\n\n${command([recipe.install, recipe.engines].filter(Boolean).join('\n'))}`).join('\n')}`);
  return output;
}

export function publishGuidance(directory: string, guides: Map<string, string>): void {
  rmSync(directory, { recursive: true, force: true });
  for (const [path, text] of guides) {
    mkdirSync(dirname(join(directory, path)), { recursive: true });
    writeFileSync(join(directory, path), text);
  }
}

export function checkGuidance(directory: string, guides: Map<string, string>): string[] {
  const actual = new Set(readdirSync(directory, { recursive: true, withFileTypes: true }).filter((entry) => entry.isFile()).map((entry) => relative(directory, join(entry.parentPath, entry.name)).split(sep).join('/')));
  return [...new Set([...guides.keys(), ...actual])].filter((path) => !guides.has(path) || !actual.has(path) || readFileSync(join(directory, path), 'utf8') !== guides.get(path));
}
