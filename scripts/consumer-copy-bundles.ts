import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { basename, dirname, join } from 'node:path';
import type { Browser, Page } from 'playwright';
import { compositionExamples, recipeSources, recipes } from '../apps/docs/src/generated/recipes.ts';
import { repository, serveRegistry, type Run } from './consumer-helpers.ts';
import { browserErrors, serveNext, type BrowserLog } from './consumer-next.ts';
import { ADAPTED_BLOCK, COPY_CASES, type ConsumerLayout, type ConsumerReport } from './consumer-report.ts';

/**
 * Every copy bundle the Build a screen inventory and the Recipes index expose, by entry source: the
 * inventory's lessons first, then each recipe demo the inventory does not already own. A block lesson
 * copies nothing; the adapted block's own exercises cover it.
 */
const exposed = [
  ...compositionExamples.filter((example) => example.files.length > 0).map((example) => ({ id: example.id, entry: example.files[0]!.source })),
  ...recipes.flatMap((recipe) => recipe.sources.map((source) => ({ id: basename(source, '.tsx'), entry: source }))),
];
export const COPY_BUNDLES = exposed.filter((bundle, index) => exposed.findIndex((other) => other.entry === bundle.entry) === index);
assert.equal(new Set(COPY_BUNDLES.map((bundle) => bundle.id)).size, COPY_BUNDLES.length, 'copy bundle IDs must be unique');

export const COPY_ITEMS = [...new Set([...COPY_BUNDLES.flatMap((bundle) => recipeSources[bundle.entry]!.items), ADAPTED_BLOCK])].filter((id) => !['tokens', 'lib'].includes(id)).sort();
export const COPY_ENGINES = [...new Set(recipes.flatMap((recipe) => recipe.dependencies))].sort();
export const COPY_TYPES = [...new Set(recipes.flatMap((recipe) => recipe.devDependencies))].sort();

/** Literal edits to the installed block: labels and initial data change, components and layout stay. */
const ADAPTATION: Record<string, [string, string][]> = {
  'notifications-form.tsx': [
    ["label: 'Weekly digest', description: 'Orders, revenue and stock in one summary.'", "label: 'Project digest', description: 'New and archived projects in one summary.'"],
    ['description="Sent to ada@northwind.co"', 'description="Sent to ops@projects.example"'],
  ],
  'settings-01.tsx': [
    ['weeklyDigest: true,', 'weeklyDigest: false,'],
    ["timeZone: 'Europe/Oslo',", "timeZone: 'America/New_York',"],
  ],
};

type Viewport = { width: number; height: number; deviceScaleFactor?: number };
type Exercise = { bundle: string; viewport: Viewport; run: (page: Page) => Promise<void> };
const DESKTOP = { width: 1280, height: 800 };
const WIDE = { width: 1600, height: 900 };
const NARROW = { width: 390, height: 844 };
/** A 1280 by 800 window at 200% browser zoom lays out a 640 by 400 CSS viewport at twice the pixel density. */
const ZOOM_200 = { width: 640, height: 400, deviceScaleFactor: 2 };

async function until(condition: () => Promise<boolean>, message: string): Promise<void> {
  const deadline = Date.now() + 5000;
  while (!(await condition().catch(() => false))) {
    if (Date.now() > deadline) throw new Error(`never held: ${message}`);
    await new Promise((done) => setTimeout(done, 50));
  }
}
const noOverflow = async (page: Page) => {
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  assert.ok(overflow <= 0, `the document overflows horizontally by ${overflow}px`);
};
const focusedName = (page: Page) => page.evaluate(() => {
  const active = document.activeElement;
  return active?.getAttribute('aria-label') ?? active?.textContent?.trim() ?? null;
});
/** A token's computed length on the root, in pixels. */
const tokenPixels = (page: Page, token: string) => page.evaluate((name) => {
  const probe = document.createElement('div');
  probe.style.width = `var(${name})`;
  document.body.append(probe);
  const width = probe.getBoundingClientRect().width;
  probe.remove();
  return width;
}, token);
type AxeResult = { violations: { id: string }[] };
const runAxe = async (page: Page): Promise<AxeResult> => {
  await page.addScriptTag({ path: axePath });
  return page.evaluate(async () => (window as unknown as { axe: { run: (options: unknown) => Promise<AxeResult> } }).axe.run({ runOnly: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'] }));
};
const statusText = (page: Page, text: string | RegExp) => until(async () => (await page.getByRole('status').allTextContents()).some((value) => typeof text === 'string' ? value.includes(text) : text.test(value)), `a status reads ${text}`);

/** The interaction each exposed bundle owes, keyed by case name; every bundle and the adapted block appear at least once. */
export const EXERCISES: Record<string, Exercise> = {
  'projects-zoom-200': {
    bundle: 'projects',
    viewport: ZOOM_200,
    run: async (page) => {
      await page.getByRole('heading', { level: 1, name: 'Projects' }).waitFor();
      await noOverflow(page);
      const input = page.getByRole('textbox', { name: 'Project name', exact: true });
      await input.fill('Zoomed launch plan with a long wrapping name');
      const submit = page.getByRole('button', { name: 'Create project', exact: true });
      const box = await submit.boundingBox();
      assert.ok(box && box.x >= 0 && box.x + box.width <= ZOOM_200.width, 'Create project stays inside the zoomed viewport');
      await submit.click();
      await statusText(page, 'Created Zoomed launch plan with a long wrapping name.');
      const region = page.getByRole('region', { name: 'Projects, newest first', exact: true });
      await region.getByText('Zoomed launch plan with a long wrapping name').waitFor();
      const reachable = await region.evaluate((element) => element.scrollWidth <= element.clientWidth || element.tabIndex >= 0);
      assert.ok(reachable, 'the overflowing table region is keyboard reachable');
      await noOverflow(page);
    },
  },
  'product-tokens': {
    bundle: 'projects',
    viewport: WIDE,
    run: async (page) => {
      const heading = page.getByRole('heading', { level: 1, name: 'Projects' });
      await heading.waitFor();
      const column = await heading.evaluate((element) => {
        let node: Element | null = element;
        while (node && getComputedStyle(node).maxInlineSize === 'none') node = node.parentElement;
        const rem = Number.parseFloat(getComputedStyle(document.documentElement).fontSize);
        return node ? { max: Number.parseFloat(getComputedStyle(node).maxInlineSize), width: node.getBoundingClientRect().width, rem } : null;
      });
      assert.ok(column, 'a content column reads a maximum width');
      assert.equal(column.max, 72 * column.rem, 'the column reads --app-size-content-max (72rem) from screen.stylex.ts');
      assert.ok(column.width <= column.max, 'the wide window keeps the column at the application token');
      for (const token of ['--ult-color-accent', '--ult-color-success', '--ult-color-surface']) {
        assert.ok(await page.evaluate((name) => getComputedStyle(document.documentElement).getPropertyValue(name).trim() !== '', token), `${token} is set by the installed theme`);
      }
    },
  },
  'style-overrides': {
    bundle: 'style-overrides',
    viewport: DESKTOP,
    run: async (page) => {
      await page.getByText('Invite a teammate').waitFor();
      assert.ok(await page.getByRole('button', { name: 'Resend invitation', exact: true }).isDisabled(), 'the overridden button stays disabled');
      const send = page.getByRole('button', { name: 'Send invitation', exact: true });
      const height = await send.evaluate((element) => element.getBoundingClientRect().height);
      assert.equal(height, await tokenPixels(page, '--ult-space-11'), 'the size override reads --ult-space-11');
      for (let step = 0; step < 10 && await focusedName(page) !== 'Send invitation'; step++) await page.keyboard.press('Tab');
      assert.ok(await send.evaluate((element) => element === document.activeElement && element.matches(':focus-visible') && getComputedStyle(element).outlineStyle !== 'none'), 'the override keeps the focus ring');
      const dark = (await runAxe(page)).violations.map((violation) => violation.id);
      assert.deepEqual(dark, [], `dark mode axe: ${dark.join(', ')}`);
      // The exercise's closing axe runs in the other mode.
      await page.evaluate(() => { document.documentElement.dataset.theme = 'light'; });
    },
  },
  'interaction-states': {
    bundle: 'interaction-states',
    viewport: DESKTOP,
    run: async (page) => {
      const input = page.getByRole('textbox', { name: 'Email address' });
      const send = page.getByRole('button', { name: 'Send invite' });
      assert.ok(await send.isDisabled(), 'Send invite starts disabled');
      await input.fill('nobody');
      await until(async () => await send.isEnabled(), 'typing enables Send invite');
      await send.click();
      const message = 'Enter an email address that includes @.';
      await page.getByText(message).waitFor();
      await until(async () => await input.getAttribute('aria-invalid') === 'true' && await input.getAttribute('data-invalid') !== null, 'the field reports its invalid state');
      assert.ok(await input.evaluate((element, text) => (element.getAttribute('aria-describedby') ?? '').split(/\s+/).some((id) => document.getElementById(id)?.textContent === text), message), 'the error is associated with the field');
      await input.fill('ada@example.com');
      await send.click();
      await statusText(page, 'Invited ada@example.com.');
      const review = page.getByRole('button', { name: 'Review pending invites' });
      await review.click();
      await page.getByRole('dialog', { name: 'Pending invites' }).getByText('1 invite is waiting for an answer.').waitFor();
      await page.keyboard.press('Escape');
      await page.getByRole('dialog').waitFor({ state: 'detached' });
      await until(async () => await focusedName(page) === 'Review pending invites', 'focus returns to the trigger');
    },
  },
  typography: {
    bundle: 'typography',
    viewport: DESKTOP,
    run: async (page) => {
      await page.getByRole('heading', { level: 1, name: 'The prose mapping' }).waitFor();
      assert.ok(await page.getByRole('table').count() > 0, 'the prose table renders');
      assert.ok(await page.locator('blockquote').count() > 0, 'the quote renders');
      await noOverflow(page);
    },
  },
  carousel: {
    bundle: 'carousel',
    viewport: DESKTOP,
    run: async (page) => {
      const carousel = page.getByRole('region', { name: 'Landscapes' });
      const previous = carousel.getByRole('button', { name: 'Previous' });
      await until(async () => await previous.isDisabled(), 'Previous starts disabled');
      await carousel.getByRole('button', { name: 'Next' }).click();
      await until(async () => await previous.isEnabled(), 'Next enables Previous');
    },
  },
  chart: {
    bundle: 'chart',
    viewport: DESKTOP,
    run: async (page) => {
      await page.getByRole('table', { name: 'Requests per weekday' }).waitFor();
      assert.ok(await page.locator('svg rect').count() > 0, 'the chart draws its bars');
    },
  },
  'command-dialog': {
    bundle: 'command-dialog',
    viewport: DESKTOP,
    run: async (page) => {
      const trigger = page.getByRole('button', { name: /Search actions/ });
      await trigger.click();
      await page.getByRole('dialog', { name: 'Command menu' }).waitFor();
      await page.getByRole('combobox', { name: 'Search actions' }).fill('Export');
      await until(async () => await page.getByRole('option').count() === 1, 'one action matches');
      await page.keyboard.press('Enter');
      await page.getByRole('dialog').waitFor({ state: 'detached' });
      await page.getByText('Ran “Export PDF”').waitFor();
      await trigger.click();
      await page.getByRole('dialog').waitFor();
      await page.keyboard.press('Escape');
      await page.getByRole('dialog').waitFor({ state: 'detached' });
      await until(async () => /Search actions/.test(await focusedName(page) ?? ''), 'focus returns to the trigger');
    },
  },
  'data-table-sorting': {
    bundle: 'data-table-sorting',
    viewport: DESKTOP,
    run: async (page) => {
      await page.getByRole('button', { name: 'Region' }).click();
      await until(async () => await page.getByRole('columnheader', { name: 'Region' }).getAttribute('aria-sort') === 'ascending', 'Region sorts ascending');
      assert.equal((await page.getByRole('row').nth(1).getByRole('cell').first().textContent())?.trim(), 'ap-south-1');
    },
  },
  'data-table-row-selection': {
    bundle: 'data-table-row-selection',
    viewport: DESKTOP,
    run: async (page) => {
      const row = page.getByRole('checkbox', { name: 'Select us-east-1' });
      await row.click();
      await until(async () => await row.getAttribute('aria-checked') === 'true', 'the row is selected');
      await statusText(page, '1 selected');
    },
  },
  'data-table-filtering': {
    bundle: 'data-table-filtering',
    viewport: DESKTOP,
    run: async (page) => {
      await page.getByRole('searchbox', { name: 'Search regions' }).fill('eu-');
      await statusText(page, 'Showing 2 of 8 rows.');
    },
  },
  'data-table-pagination': {
    bundle: 'data-table-pagination',
    viewport: DESKTOP,
    run: async (page) => {
      const below = page.getByRole('navigation', { name: 'Pagination below the table' });
      await below.getByRole('button', { name: 'Next' }).click();
      await statusText(page, /^Showing \d+ through \d+ of \d+ rows\.$/);
      await until(async () => await below.getByRole('button', { name: '2', exact: true }).getAttribute('aria-current') === 'page', 'page 2 is current');
    },
  },
  item: {
    bundle: 'item',
    viewport: DESKTOP,
    run: async (page) => { await page.getByText('Access requests').waitFor(); },
  },
  kbd: {
    bundle: 'kbd',
    viewport: DESKTOP,
    run: async (page) => {
      await page.locator('kbd', { hasText: 'Esc' }).waitFor();
      assert.ok(await page.locator('kbd').count() >= 3, 'every key renders as kbd');
    },
  },
  'react-hook-form': {
    bundle: 'react-hook-form',
    viewport: DESKTOP,
    run: async (page) => {
      const input = page.getByRole('textbox', { name: 'Handle' });
      const submit = page.getByRole('button', { name: 'Claim handle' });
      await submit.click();
      await page.getByText('A handle is required.').waitFor();
      await until(async () => await input.getAttribute('aria-invalid') === 'true' && await input.evaluate((element) => element === document.activeElement), 'the engine focuses the invalid field');
      await input.fill('admin');
      await submit.click();
      await page.getByText('That handle is reserved.').waitFor();
      await input.fill('ada');
      await submit.click();
      await until(async () => await input.getAttribute('aria-invalid') !== 'true', 'a valid handle clears the error');
    },
  },
  sheet: {
    bundle: 'sheet',
    viewport: DESKTOP,
    run: async (page) => {
      await page.getByRole('button', { name: 'Right' }).click();
      await page.getByRole('dialog', { name: 'Filters' }).waitFor();
      await page.keyboard.press('Escape');
      await page.getByRole('dialog').waitFor({ state: 'detached' });
      await until(async () => await focusedName(page) === 'Right', 'focus returns to the trigger');
    },
  },
  'settings-01-desktop': {
    bundle: ADAPTED_BLOCK,
    viewport: DESKTOP,
    run: async (page) => {
      await page.getByRole('heading', { level: 1, name: 'Notifications' }).waitFor();
      const nav = page.getByRole('navigation', { name: 'Settings' });
      await nav.waitFor();
      assert.equal(await nav.getByRole('link', { name: 'Notifications' }).getAttribute('aria-current'), 'page');
      assert.equal(await page.getByRole('button', { name: 'Open settings navigation' }).count(), 0, 'desktop shows no menu trigger');
      await settingsForm(page);
    },
  },
  'settings-01-narrow': {
    bundle: ADAPTED_BLOCK,
    viewport: NARROW,
    run: async (page) => {
      const trigger = page.getByRole('button', { name: 'Open settings navigation' });
      await trigger.click();
      const nav = page.getByRole('navigation', { name: 'Settings' });
      await nav.waitFor();
      await page.keyboard.press('Escape');
      await nav.waitFor({ state: 'hidden' });
      await until(async () => await focusedName(page) === 'Open settings navigation', 'focus returns to the menu trigger');
      await noOverflow(page);
      await settingsForm(page);
    },
  },
};

/** The adaptation shows, and the form still goes dirty, reaches Save from the keyboard and confirms. */
async function settingsForm(page: Page) {
  await page.getByText('Sent to ops@projects.example').waitFor();
  const digest = page.getByRole('switch', { name: 'Project digest', exact: true });
  assert.equal(await digest.getAttribute('aria-checked'), 'false', 'the adapted initial data unchecks Project digest');
  assert.equal(await page.getByRole('combobox', { name: 'Time zone' }).inputValue(), 'America/New_York');
  await digest.click();
  await until(async () => (await page.locator('main [role="status"]').textContent()) === 'You have unsaved changes', 'the form reports unsaved changes');
  for (let step = 0; step < 40 && await focusedName(page) !== 'Save changes'; step++) await page.keyboard.press('Tab');
  const save = page.getByRole('button', { name: 'Save changes' });
  assert.ok(await save.evaluate((element) => element === document.activeElement && element.matches(':focus-visible') && getComputedStyle(element).outlineStyle !== 'none'), 'Tab reaches Save changes with a visible focus ring');
  await page.keyboard.press('Enter');
  await page.getByText('Notification settings saved').waitFor();
  await until(async () => (await page.locator('main [role="status"]').textContent()) === '', 'saving clears the unsaved-changes region');
}

assert.deepEqual(['compile', ...Object.keys(EXERCISES)], COPY_CASES, 'consumer-report.ts must list every copy-bundle exercise');
export const COPY_FAULTS = ['unresolved-copy-import'] as const;

/** Where a layout's compiler-included sources live: `src/` except the Next root layout. */
const sourceRoot = (app: string, layout: ConsumerLayout) => layout === 'next-app' ? app : join(app, 'src');
const moduleName = (index: number) => `Bundle${index}`;

/** The gallery the production app renders: `?bundle=<id>` mounts one copied entry after hydration. */
export function gallerySource(): string {
  const imports = COPY_BUNDLES.map((bundle, index) => {
    const entry = recipeSources[bundle.entry]!.files.find((file) => file.source === bundle.entry)!;
    assert.match(entry.content, /^export default function /m, `${bundle.entry} has no default export to render`);
    return `import ${moduleName(index)} from './${entry.path.replace(/\.tsx?$/, '')}';`;
  });
  const entries = COPY_BUNDLES.map((bundle, index) => `  ${JSON.stringify(bundle.id)}: ${moduleName(index)},`);
  return `'use client';
import { useEffect, useState, type ComponentType } from 'react';
${imports.join('\n')}
import { Settings01 } from '@/components/${ADAPTED_BLOCK}/${ADAPTED_BLOCK}';
const bundles: Record<string, ComponentType> = {
${entries.join('\n')}
  ${JSON.stringify(ADAPTED_BLOCK)}: Settings01,
};
/** Complete screens bring their own main landmark; a recipe demo sits inside the gallery's. */
const screens = new Set(['projects', ${JSON.stringify(ADAPTED_BLOCK)}]);
export default function CopyBundles() {
  const [id, setId] = useState<string | null>(null);
  useEffect(() => {
    setId(new URLSearchParams(window.location.search).get('bundle'));
    document.body.dataset.hydrated = 'true';
  }, []);
  if (id === null) return null;
  const Bundle = bundles[id];
  if (!Bundle) return <p>Unknown bundle {id}</p>;
  return screens.has(id) ? <Bundle /> : <main><Bundle /></main>;
}
`;
}

/** Installs every bundle's items and engines, writes the exact copied bytes, adapts Settings 01 and mounts the gallery. */
export async function copyBundleScene(app: string, layout: ConsumerLayout, execute: Run, fault?: string): Promise<void> {
  await execute(app, 'npx', ['-y', 'shadcn@latest', 'add', ...COPY_ITEMS.map((id) => `@ultima/${id}`), '--yes']);
  await execute(app, 'npm', ['install', ...COPY_ENGINES]);
  if (COPY_TYPES.length) await execute(app, 'npm', ['install', '-D', ...COPY_TYPES]);
  const root = sourceRoot(app, layout);
  const files = COPY_BUNDLES.flatMap((bundle) => recipeSources[bundle.entry]!.files);
  for (const file of files) {
    await mkdir(dirname(join(root, file.path)), { recursive: true });
    await writeFile(join(root, file.path), file.content);
  }
  if (fault === 'unresolved-copy-import') {
    const seeded = files.find((file) => file.content.includes("from '@/components/ui/button'"))!;
    await writeFile(join(root, seeded.path), seeded.content.replace("from '@/components/ui/button'", "from '@ultima/ui'"));
  }
  for (const [name, edits] of Object.entries(ADAPTATION)) {
    const path = join(root, 'components', ADAPTED_BLOCK, name);
    let content = await readFile(path, 'utf8');
    for (const [from, to] of edits) {
      assert.ok(content.includes(from), `the installed ${name} no longer contains ${from}`);
      content = content.replace(from, to);
    }
    await writeFile(path, content);
  }
  await writeFile(join(root, 'CopyBundles.tsx'), gallerySource());
  if (layout === 'vite') await writeFile(join(root, 'App.tsx'), "import CopyBundles from './CopyBundles';\nexport default function App() { return <CopyBundles />; }\n");
  else await writeFile(join(root, 'app/page.tsx'), "import CopyBundles from '../CopyBundles';\nexport default function Page() { return <CopyBundles />; }\n");
}

type CopySnapshot = { id: string; bundle: string; viewport: Viewport; failures: string[]; reproduce: string; artifacts: Record<string, string> };

const axePath = createRequire(import.meta.url).resolve('axe-core/axe.min.js', { paths: [join(repository, 'apps/docs')] });

/** Builds and typechecks the app, then serves production output and runs every exercise in a fresh context. */
export async function copyBundleProof(browser: Browser, app: string, layout: ConsumerLayout, execute: Run, report: ConsumerReport, output: string): Promise<void> {
  const reproduce = `node --experimental-strip-types scripts/consumer-proof.ts --layout ${layout} --delivery-path css --exercise copy-bundles`;
  const record = async (name: string, snapshot: Omit<CopySnapshot, 'id' | 'reproduce'>) => {
    const id = `${layout}/copy-bundles/chromium/${name}`;
    await writeFile(join(output, `${name}.values.json`), `${JSON.stringify({ ...snapshot, id, reproduce }, null, 2)}\n`);
    report.executed.push(id);
    report.cases.push({ id, status: snapshot.failures.length ? 'failed' : 'passed', snapshot: `${name}.values.json`, failures: snapshot.failures });
  };
  const compile: string[] = [];
  let log = '';
  try {
    log += await execute(app, 'npm', ['run', 'build']);
    // Vite's build script runs `tsc -b` itself; Next checks types during its build, and this repeats it with the project's own config.
    if (layout !== 'vite') log += await execute(app, 'npx', ['tsc', '--noEmit']);
  } catch (error) { compile.push(String(error)); log += String(error); }
  await writeFile(join(output, 'build.log'), log);
  await record('compile', { bundle: 'all', viewport: DESKTOP, failures: compile, artifacts: { build: 'build.log' } });
  if (compile.length) {
    for (const [name, exercise] of Object.entries(EXERCISES)) await record(name, { bundle: exercise.bundle, viewport: exercise.viewport, failures: ['not run: the copy bundles did not compile'], artifacts: {} });
    return;
  }
  const server = layout === 'vite' ? await serveRegistry(join(app, 'dist'), true, join(output, 'server.log')) : await serveNext(app, join(output, 'server.log'));
  try {
    for (const [name, exercise] of Object.entries(EXERCISES)) {
      const { deviceScaleFactor, ...viewport } = exercise.viewport;
      const context = await browser.newContext({ viewport, deviceScaleFactor, colorScheme: 'dark' });
      const page = await context.newPage();
      page.setDefaultTimeout(5000);
      const logs: BrowserLog = { console: [], pageErrors: [], failedRequests: [] };
      const failures = browserErrors(page, logs);
      let axe: unknown = null;
      try {
        await page.goto(`${server.url}/?bundle=${exercise.bundle}`, { waitUntil: 'networkidle' });
        await page.locator('body[data-hydrated="true"]').waitFor();
        await exercise.run(page);
        const result = await runAxe(page);
        axe = result;
        failures.push(...result.violations.map((violation) => `axe: ${violation.id}`));
      } catch (error) { failures.push(String(error)); }
      await page.screenshot({ path: join(output, `${name}.png`), fullPage: true }).catch((error) => failures.push(`screenshot unavailable: ${error}`));
      await writeFile(join(output, `${name}.browser.json`), `${JSON.stringify(logs, null, 2)}\n`);
      await writeFile(join(output, `${name}.axe.json`), `${JSON.stringify(axe, null, 2)}\n`);
      await record(name, { bundle: exercise.bundle, viewport: exercise.viewport, failures, artifacts: { build: 'build.log', server: 'server.log', browser: `${name}.browser.json`, axe: `${name}.axe.json`, screenshot: `${name}.png` } });
      await context.close();
    }
  } finally { await server.close(); }
}

/** What the verifier requires of a retained copy-bundle snapshot. */
export function copySnapshotProblems(snapshot: unknown, row: { id: string; status: string; failures: string[] }): string[] {
  const value = snapshot as Partial<CopySnapshot> | null;
  const problems: string[] = [];
  if (!value || value.id !== row.id || JSON.stringify(value.failures) !== JSON.stringify(row.failures)) problems.push('snapshot disagrees with its case');
  const name = row.id.split('/').at(-1)!;
  const kinds = name === 'compile' ? ['build'] : row.status === 'passed' ? ['build', 'server', 'browser', 'axe', 'screenshot'] : [];
  for (const kind of kinds) if (typeof value?.artifacts?.[kind] !== 'string') problems.push(`missing ${kind} artifact`);
  if (name !== 'compile' && !EXERCISES[name]) problems.push('unknown copy-bundle case');
  return problems;
}
