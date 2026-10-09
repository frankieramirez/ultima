import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import type { ElementDescriptor } from '../registry/metadata/schema.ts';
import { computedColors, settle, type Cell } from './consumer-bundles.ts';
import type { Run } from './consumer-helpers.ts';
import { ELEMENT_ITEMS } from './consumer-report.ts';

let descriptors: Promise<ElementDescriptor[]> | undefined;
export const elementDescriptors = () => descriptors ??= Promise.all(ELEMENT_ITEMS.map(async (id) => (await import(`../registry/metadata/element/${id}.ts`) as { default: ElementDescriptor }).default));

const TABS_WITH_DISABLED_MIDDLE = `<ult-tabs id="proof-tabs" value="overview">
  <ult-tabs-list aria-label="Proof views">
    <ult-tabs-tab value="overview">Overview</ult-tabs-tab>
    <ult-tabs-tab value="findings">Findings</ult-tabs-tab>
    <ult-tabs-tab value="archive" disabled>Archive</ult-tabs-tab>
    <ult-tabs-tab value="history">History</ult-tabs-tab>
    <ult-tabs-indicator></ult-tabs-indicator>
  </ult-tabs-list>
  <ult-tabs-panel value="overview">Overview panel</ult-tabs-panel>
  <ult-tabs-panel value="findings">Findings panel</ult-tabs-panel>
  <ult-tabs-panel value="archive">Archive panel</ult-tabs-panel>
  <ult-tabs-panel value="history">History panel</ult-tabs-panel>
</ult-tabs>`;

export async function elementScene(app: string, registry: string, execute: Run): Promise<void> {
  const items = await elementDescriptors();
  await execute(app, 'npx', ['-y', 'shadcn@latest', 'add', ...items.map((item) => `${registry}/r/${item.id}.json`), '--yes']);
  await execute(app, 'npm', ['install']);
  const examples = items.filter((item) => item.id !== 'ult-tabs').map((item) => `<section aria-label="${item.title}">\n${item.example}\n</section>`);
  await writeFile(join(app, 'index.html'), `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Element consumer proof</title>
    <link rel="stylesheet" href="./ultima-tokens.css" />
    <link rel="stylesheet" href="./ultima-theme.css" />
    <style>@layer reset { body { margin: 0; } } :root { background: var(--ult-color-surface); color: var(--ult-color-text); font-family: var(--ult-font-sans); }</style>
${items.map((item) => `    <script type="module" src="./${item.id}.js"></script>`).join('\n')}
    <script type="module" src="/src/main.ts"></script>
  </head>
  <body>
    <main>
      <h1>Element consumer proof</h1>
      <ult-button id="proof-button" tone="accent">Save proof</ult-button>
      ${TABS_WITH_DISABLED_MIDDLE}
      <div id="reconnect-holder"></div>
${examples.join('\n')}
    </main>
  </body>
</html>
`);
  const tags = items.flatMap((item) => item.tags);
  await writeFile(join(app, 'src/main.ts'), `const tags: string[] = ${JSON.stringify(tags)};
void Promise.all(tags.map((tag) => customElements.whenDefined(tag))).then(() => { document.body.dataset.hydrated = 'true'; });
`);
  for (const name of ['counter.ts', 'style.css']) await rm(join(app, 'src', name), { force: true });
  for (const item of items) assert.ok(existsSync(join(app, `${item.id}.js`)), `${item.id}.js did not arrive`);
  assert.ok(existsSync(join(app, 'ultima-tokens.css')), 'the tokens stylesheet did not arrive with the element items');
}

export async function lifecycle({ page, check, table, mode }: Cell) {
  const tags = (await elementDescriptors()).flatMap((item) => item.tags);
  const tab = (name: string) => page.getByRole('tab', { name, exact: true });
  const state = () => page.evaluate(() => {
    const host = document.getElementById('proof-tabs')!;
    const active = document.activeElement;
    return {
      focused: active?.closest('#proof-tabs') ? active.textContent?.trim() ?? null : null,
      selected: host.querySelector('[role="tab"][aria-selected="true"]')?.textContent?.trim() ?? null,
      panel: host.querySelector('[role="tabpanel"]:not([hidden])')?.textContent?.trim() ?? null,
    };
  });
  await check('registration', { defined: tags.length, missing: [] }, () => page.evaluate((tags) => {
    const missing = tags.filter((tag) => !customElements.get(tag));
    return { defined: tags.length - missing.length, missing };
  }, tags));
  await check('upgrade', { pending: [], created: { tag: 'BUTTON', text: 'Created later', type: 'button' } }, () => page.evaluate(() => {
    const pending = [...document.querySelectorAll('*')].filter((element) => element.localName.startsWith('ult-') && !element.matches(':defined')).map((element) => element.localName);
    const host = document.createElement('ult-button');
    host.textContent = 'Created later';
    document.querySelector('main')!.append(host);
    const inner = host.querySelector<HTMLButtonElement>('[part="root"]');
    const created = { tag: inner?.tagName ?? null, text: inner?.textContent ?? null, type: inner?.type ?? null };
    host.remove();
    return { pending, created };
  }));
  await check('reconnect', { moved: true, roots: 1, tabs: 4, selected: 'Overview', panel: 'Overview panel', buttons: 1 }, async () => {
    await page.evaluate(() => {
      document.getElementById('reconnect-holder')!.append(document.getElementById('proof-tabs')!);
      const button = document.getElementById('proof-button')!;
      const parent = button.parentElement!;
      button.remove();
      parent.append(button);
    });
    await settle(page);
    const { selected, panel } = await state();
    return page.evaluate(({ selected, panel }) => {
      const host = document.getElementById('proof-tabs')!;
      return { moved: !!host.closest('#reconnect-holder'), roots: host.querySelectorAll('[part="root"]').length, tabs: host.querySelectorAll('[role="tab"]').length, selected, panel, buttons: document.getElementById('proof-button')!.querySelectorAll('button').length };
    }, { selected, panel });
  });
  const danger = await computedColors(page, { danger: table['--ult-color-danger']! });
  await check('attribute-update', { selected: 'History', panel: 'History panel', tabDisabled: true, buttonDisabled: true, buttonBackground: danger.danger, restored: { selected: 'Overview', tabDisabled: false, buttonDisabled: false } }, async () => {
    const set = (values: { value: string; disabled: boolean; tone: string }) => page.evaluate((values) => {
      document.getElementById('proof-tabs')!.setAttribute('value', values.value);
      document.querySelector('#proof-tabs ult-tabs-tab[value="findings"]')!.toggleAttribute('disabled', values.disabled);
      const button = document.getElementById('proof-button')!;
      button.toggleAttribute('disabled', values.disabled);
      button.setAttribute('tone', values.tone);
    }, values);
    const read = () => page.evaluate(() => ({
      tabDisabled: document.querySelector<HTMLButtonElement>('#proof-tabs ult-tabs-tab[value="findings"] [part="tab"]')!.disabled,
      buttonDisabled: document.querySelector<HTMLButtonElement>('#proof-button [part="root"]')!.disabled,
      buttonBackground: getComputedStyle(document.querySelector('#proof-button [part="root"]')!).backgroundColor,
    }));
    await set({ value: 'history', disabled: true, tone: 'danger' });
    await settle(page);
    const updated = { ...(await state()), ...(await read()) };
    await set({ value: 'overview', disabled: false, tone: 'accent' });
    await settle(page);
    const restored = { ...(await state()), ...(await read()) };
    return { selected: updated.selected, panel: updated.panel, tabDisabled: updated.tabDisabled, buttonDisabled: updated.buttonDisabled, buttonBackground: updated.buttonBackground, restored: { selected: restored.selected, tabDisabled: restored.tabDisabled, buttonDisabled: restored.buttonDisabled } };
  });
  await check('tabs-keyboard', {
    arrow: { focused: 'Findings', selected: 'Overview', panel: 'Overview panel' }, enter: { focused: 'Findings', selected: 'Findings', panel: 'Findings panel' },
    skip: 'History', home: 'Overview', end: 'History',
  }, async () => {
    await page.mouse.move(0, 0);
    await tab('Overview').focus();
    const press = async (key: string) => { await page.keyboard.press(key); await settle(page); return state(); };
    const arrow = await press('ArrowRight');
    const enter = await press('Enter');
    const skip = (await press('ArrowRight')).focused;
    const home = (await press('Home')).focused;
    const end = (await press('End')).focused;
    return { arrow, enter, skip, home, end };
  });
  const colors = await computedColors(page, Object.fromEntries(['text', 'text-muted', 'accent', 'border', 'border-focus'].map((name) => [name, table[`--ult-color-${name}`]!])));
  await check('tabs-theme', { selected: colors.text, unselected: colors['text-muted'], indicator: colors.accent, listBorder: colors.border, focusRing: { visible: true, color: colors['border-focus'] }, button: colors.accent, colorScheme: mode }, () => page.evaluate(() => {
    const host = document.getElementById('proof-tabs')!;
    const css = (selector: string) => getComputedStyle(host.querySelector(selector)!);
    const focused = document.activeElement as HTMLElement;
    return {
      selected: css('[role="tab"][aria-selected="true"]').color,
      unselected: css('[role="tab"][aria-selected="false"]:not([disabled])').color,
      indicator: css('[part="indicator"]').backgroundColor,
      listBorder: css('[part="list"]').borderBottomColor,
      focusRing: { visible: !!focused?.closest('#proof-tabs') && focused.matches(':focus-visible'), color: getComputedStyle(focused).outlineColor },
      button: getComputedStyle(document.querySelector('#proof-button [part="root"]')!).backgroundColor,
      colorScheme: getComputedStyle(document.documentElement).colorScheme,
    };
  }));
}
