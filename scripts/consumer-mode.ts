import assert from 'node:assert/strict';
import { readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import type { Browser, Page } from 'playwright';
import ts from 'typescript';
import type { ConsumerLayout, ConsumerReport } from './consumer-report.ts';
import type { Run } from './consumer-helpers.ts';
import { browserErrors } from './consumer-next.ts';

export const MODE_KEY = 'consumer-theme-mode';

export async function modeScene(app: string, layout: ConsumerLayout, execute: Run, fault?: string): Promise<void> {
  const next = layout !== 'vite';
  const folder = join(app, layout === 'next-app' ? 'app' : 'src', ...(layout === 'next-src' ? ['app'] : []));
  const control = `'use client';
import { useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Popover } from '@/components/ui/popover';
import { useThemeMode, setThemeMode } from '@/components/ui/theme-mode';
export default function ModeControl() {
  const { mode, resolved, setMode } = useThemeMode('${MODE_KEY}');
  useEffect(() => { document.body.dataset.hydrated = 'true'; }, []);
  return <main><h1>Installed theme mode</h1><output data-mode={mode} data-resolved={resolved ?? 'pending'}>{mode}:{resolved ?? 'pending'}</output>
    <Button data-testid="control" tone="accent" onClick={() => setMode('light')}>Light</Button>
    <Button onClick={() => setMode('dark')}>Dark</Button><Button onClick={() => setMode('system')}>System</Button>
    <Button onClick={() => setThemeMode('dark', '${MODE_KEY}')}>External dark</Button>
    <Badge tone="success" variant="solid" role="status">Ready</Badge>
    <Popover.Root open><Popover.Trigger render={<Button />}>Popup</Popover.Trigger><Popover.Portal><Popover.Positioner><Popover.Popup data-testid="popup" aria-label="Theme popup"><Popover.Title>Theme popup</Popover.Title></Popover.Popup></Popover.Positioner></Popover.Portal></Popover.Root>
  </main>;
}
`;
  if (next) {
    await writeFile(join(folder, 'mode-control.tsx'), control);
    await writeFile(join(folder, 'page.tsx'), "import ModeControl from './mode-control';\nexport default function Page() { return <ModeControl />; }\n");
    await writeFile(join(folder, 'layout.tsx'), `import type { ReactNode } from 'react';
import { ThemeModeScript } from '@/components/ui/theme-mode';
import './ultima.css';
import '${layout === 'next-src' ? '../../' : '../'}ultima-theme.css';
export default function Layout({children}: {children: ReactNode}) {
  return <html lang="en" suppressHydrationWarning><head>${fault === 'mode-script' ? '' : `<ThemeModeScript storageKey="${MODE_KEY}" />`}</head><body>{children}</body></html>;
}
`);
    await writeFile(join(folder, 'ultima.css'), `${await readFile(join(folder, 'ultima.css'), 'utf8')}\n:root { background: var(--ult-color-surface); color: var(--ult-color-text); font-family: var(--ult-font-sans); }\n`);
  } else {
    await writeFile(join(app, 'src/App.tsx'), control);
    const source = await readFile(join(app, 'src/components/ui/theme-mode.tsx'), 'utf8');
    const compiled = ts.transpileModule(source, { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ES2022, jsx: ts.JsxEmit.ReactJSX } }).outputText;
    await writeFile(join(app, 'installed-theme-mode.mjs'), compiled);
    const script = (await execute(app, 'node', ['--input-type=module', '-e', `import {themeModeScript} from './installed-theme-mode.mjs';console.log(themeModeScript('${MODE_KEY}'))`])).trim();
    assert.ok(script.startsWith('(()=>'), 'installed source must generate the Vite script');
    const html = await readFile(join(app, 'index.html'), 'utf8');
    await writeFile(join(app, 'index.html'), html.replace('<head>', `<head>\n${fault === 'mode-script' ? '' : `<script>${script}</script>`}`));
  }
}

type Tables = Record<'dark' | 'light', Record<string, string>>;

async function values(page: Page, table: Record<string, string>, mode: string) {
  return page.evaluate(({ table, mode }) => {
    const names = ['surface', 'text', 'accent', 'accent-contrast', 'success', 'success-contrast'];
    const normalize = (color: string) => {
      const probe = document.createElement('span');
      probe.style.color = color;
      document.body.append(probe);
      const result = getComputedStyle(probe).color;
      probe.remove();
      return result;
    };
    const variables = Object.fromEntries(['root', 'control', 'popup'].map((part) => {
      const node = part === 'root' ? document.documentElement : document.querySelector(`[data-testid="${part}"]`);
      if (!node) return [part, null];
      const style = getComputedStyle(node);
      return [part, Object.fromEntries(names.map((name) => {
        const token = `--ult-color-${name}`;
        const actual = style.getPropertyValue(token).trim();
        return [token, { expected: normalize(table[token]!), actual: actual ? normalize(actual) : 'missing' }];
      }))];
    }));
    const control = document.querySelector('[data-testid="control"]');
    const style = control && getComputedStyle(control);
    return { mode, attribute: document.documentElement.getAttribute('data-theme'), resolved: document.querySelector('[data-resolved]')?.getAttribute('data-resolved'), colorScheme: getComputedStyle(document.documentElement).colorScheme, variables, extraction: { display: style?.display, height: style?.height }, paint: { root: getComputedStyle(document.documentElement).backgroundColor, control: style?.backgroundColor } };
  }, { table, mode });
}

type ModeValues = Awaited<ReturnType<typeof values>>;
type ModeSnapshot = {
  id: string; expectedMode: 'dark' | 'light';
  firstPaint: { attribute: string | null; scheme: string; hydrated: boolean };
  serverHtml: string; serverSnapshot: { mode: string | null; resolved: string | null } | null;
  transitions: ModeValues[]; crossTab: boolean;
  storageSync: { before: { mode: string | null; attribute: string | null }; after: { mode: string | null; attribute: string | null } } | null;
  errors: string[]; failures: string[];
};

export function modeSnapshotProblems(snapshot: unknown, passing = false): string[] {
  if (!snapshot || typeof snapshot !== 'object') return ['missing theme-mode snapshot'];
  const value = snapshot as ModeSnapshot;
  const problems: string[] = [];
  if (!value.firstPaint || typeof value.firstPaint.scheme !== 'string' || value.firstPaint.hydrated !== false || !['dark', 'light'].includes(value.expectedMode)) problems.push('missing pre-hydration first paint');
  if (!Array.isArray(value.transitions) || value.transitions.length !== 6 || !value.serverHtml || !Array.isArray(value.errors)) problems.push('missing lifecycle/hydration evidence');
  for (const state of Array.isArray(value.transitions) ? value.transitions : []) {
    if (!state || !['dark', 'light'].includes(state.mode) || !['root', 'control', 'popup'].every((part) => Object.keys(state.variables?.[part] ?? {}).length === 6 && Object.values(state.variables[part]!).every((pair) => pair && typeof pair.expected === 'string' && typeof pair.actual === 'string'))) {
      problems.push('invalid mode token snapshot');
      continue;
    }
    if (passing && (state.resolved !== state.mode || state.colorScheme !== state.mode || state.extraction?.display !== 'inline-flex' || Object.values(state.variables).some((tokens) => Object.values(tokens ?? {}).some((pair) => pair.expected !== pair.actual)))) problems.push('passing mode snapshot disagrees with computed values');
  }
  if (passing) {
    const [stored, system] = (value.id?.split('/').at(-1) ?? '').split('-');
    const expectedAttribute = stored === 'light' || stored === 'dark' ? stored : null;
    const expectedMode = expectedAttribute ?? system;
    if (value.firstPaint?.attribute !== expectedAttribute || value.firstPaint?.scheme !== expectedMode || value.expectedMode !== expectedMode || value.errors?.length !== 0 || value.crossTab !== (stored !== 'throwing')) problems.push('passing first paint/cross-tab evidence disagrees with the case');
    if (stored !== 'throwing' && (value.storageSync?.before?.mode !== 'system' || value.storageSync.before.attribute !== null || value.storageSync.after?.mode !== 'light' || value.storageSync.after.attribute !== 'light')) problems.push('missing measured cross-tab storage transition');
    if (!value.id?.startsWith('vite/') && (value.serverSnapshot?.mode !== 'system' || value.serverSnapshot?.resolved !== 'pending')) problems.push('missing neutral server snapshot');
    const expected = [[expectedMode, expectedAttribute], ['light', 'light'], ['dark', 'dark'], [system, null], [system === 'dark' ? 'light' : 'dark', null], ['dark', 'dark']];
    for (const [index, state] of (Array.isArray(value.transitions) ? value.transitions : []).entries()) if (!state || state.mode !== expected[index]?.[0] || state.attribute !== expected[index]?.[1]) problems.push(`transition ${index} disagrees with the expected lifecycle`);
  }
  return problems;
}

export async function modeProof(browser: Browser, url: string, report: ConsumerReport, output: string, tables: Tables): Promise<void> {
  for (const id of report.expected) {
    const name = id.split('/').at(-1)!;
    const [stored, system] = name.split('-') as [string, 'dark' | 'light'];
    const mode = stored === 'light' || stored === 'dark' ? stored : system;
    const context = await browser.newContext({ colorScheme: system, reducedMotion: 'reduce' });
    const page = await context.newPage();
    await page.addInitScript(({ stored, key }) => {
      if (stored === 'throwing') {
        Object.defineProperty(window, 'localStorage', { get() { throw new Error('storage denied'); } });
      } else if (stored === 'light' || stored === 'dark') localStorage.setItem(key, stored);
      else localStorage.removeItem(key);
      new PerformanceObserver((list, observer) => {
        if (!list.getEntries().some((entry) => entry.name === 'first-paint')) return;
        (window as any).__firstPaint = { attribute: document.documentElement.getAttribute('data-theme'), scheme: getComputedStyle(document.documentElement).colorScheme, hydrated: document.body?.dataset.hydrated === 'true' };
        observer.disconnect();
      }).observe({ type: 'paint', buffered: true });
    }, { stored, key: MODE_KEY });
    const errors = browserErrors(page);
    let release!: () => void;
    const gate = new Promise<void>((done) => { release = done; });
    await page.route('**/*', async (route) => {
      if (route.request().resourceType() === 'script') await gate;
      await route.continue();
    });
    const failures: string[] = [];
    const transitions: Awaited<ReturnType<typeof values>>[] = [];
    const serverHtml = `${name}.server.html`;
    const html = await (await context.request.get(url)).text();
    const serverSnapshot = report.layout === 'vite' ? null : { mode: html.match(/data-mode="([^"]*)"/)?.[1] ?? null, resolved: html.match(/data-resolved="([^"]*)"/)?.[1] ?? null };
    await writeFile(join(output, serverHtml), html);
    await page.goto(url, { waitUntil: 'commit' });
    let firstPaint: unknown;
    try {
      await page.waitForFunction(() => (window as any).__firstPaint, null, { timeout: 15000 });
      firstPaint = await page.evaluate(() => (window as any).__firstPaint);
      const expectedAttribute = stored === 'dark' || stored === 'light' ? stored : null;
      if (JSON.stringify(firstPaint) !== JSON.stringify({ attribute: expectedAttribute, scheme: mode, hydrated: false })) failures.push(`first paint: ${JSON.stringify(firstPaint)}, expected ${expectedAttribute}/${mode} before hydration`);
    } catch (error) { failures.push(`first paint unavailable: ${String(error)}`); }
    finally { release(); }
    await page.waitForLoadState('networkidle');
    await page.locator('body[data-hydrated="true"]').waitFor({ timeout: 15000 });
    await page.getByTestId('popup').waitFor();
    const capture = async (active: 'dark' | 'light', attribute: string | null, initial = false) => {
      if (!initial) await page.waitForFunction(({ active, attribute }) => document.querySelector('[data-resolved]')?.getAttribute('data-resolved') === active && document.documentElement.getAttribute('data-theme') === attribute, { active, attribute });
      const state = await values(page, tables[active], active);
      transitions.push(state);
      for (const [part, tokens] of Object.entries(state.variables)) {
        if (!tokens) failures.push(`${part} missing`);
        else for (const [token, pair] of Object.entries(tokens)) if (pair.expected !== pair.actual) failures.push(`${part} ${token}: ${pair.actual}, expected ${pair.expected}`);
      }
      if (state.colorScheme !== active || state.resolved !== active || state.attribute !== attribute || state.extraction.display !== 'inline-flex') failures.push(`scheme/mode/extraction mismatch: ${JSON.stringify(state)}`);
    };
    await capture(mode, stored === 'light' || stored === 'dark' ? stored : null, true);
    await page.getByRole('button', { name: 'Light', exact: true }).click();
    await capture('light', 'light');
    await page.getByRole('button', { name: 'Dark', exact: true }).click();
    await capture('dark', 'dark');
    await page.getByRole('button', { name: 'System', exact: true }).click();
    await capture(system, null);
    const opposite = system === 'dark' ? 'light' : 'dark';
    await page.emulateMedia({ colorScheme: opposite });
    await capture(opposite, null);
    let storageSync: ModeSnapshot['storageSync'] = null;
    if (stored !== 'throwing') {
      const tab = await context.newPage();
      const tabErrors = browserErrors(tab);
      await tab.goto(url, { waitUntil: 'networkidle' });
      await tab.locator('body[data-hydrated="true"]').waitFor();
      const before = await tab.evaluate(() => ({ mode: document.querySelector('[data-mode]')?.getAttribute('data-mode') ?? null, attribute: document.documentElement.getAttribute('data-theme') }));
      await page.getByRole('button', { name: 'Light', exact: true }).click();
      await tab.waitForFunction(() => document.documentElement.dataset.theme === 'light' && document.querySelector('[data-resolved]')?.getAttribute('data-resolved') === 'light');
      storageSync = { before, after: await tab.evaluate(() => ({ mode: document.querySelector('[data-mode]')?.getAttribute('data-mode') ?? null, attribute: document.documentElement.getAttribute('data-theme') })) };
      await tab.getByRole('button', { name: 'External dark', exact: true }).click();
      await capture('dark', 'dark');
      assert.equal(await page.evaluate((key) => localStorage.getItem(key), MODE_KEY), 'dark');
      errors.push(...tabErrors);
      await tab.close();
    } else {
      await page.getByRole('button', { name: 'External dark', exact: true }).click();
      await capture('dark', 'dark');
    }
    failures.push(...errors);
    const snapshot = { id, expectedMode: mode, firstPaint, serverHtml, serverSnapshot, transitions, crossTab: stored !== 'throwing', storageSync, errors, failures };
    failures.push(...modeSnapshotProblems(snapshot, true));
    await writeFile(join(output, `${name}.values.json`), `${JSON.stringify(snapshot, null, 2)}\n`);
    await page.screenshot({ path: join(output, `${name}.png`), fullPage: true });
    report.executed.push(id);
    report.cases.push({ id, status: failures.length ? 'failed' : 'passed', snapshot: `${name}.values.json`, failures });
    await context.close();
  }
}
