import { createRequire } from 'node:module';
import { join } from 'node:path';
import type { Page } from 'playwright';
import { resolveDraft, stockDraft, type ResolvedDraft } from '../packages/tokens/src/theme/draft.ts';
import { repository } from './consumer-helpers.ts';
import type { ConsumerLayout, DeliveryPath } from './consumer-report.ts';
import { consumerValues } from './consumer-values.ts';

export const BROWSER_ASSERTIONS = [
  'form-label-required', 'required-validation', 'required-error-name', 'selection-pointer', 'selection-keyboard', 'submit-values', 'reset-values',
  'navigation-current', 'navigation-keyboard', 'navigation-activation', 'data-row', 'data-empty', 'data-restore', 'keyboard-focus',
  'overlay-keyboard-open', 'overlay-portalled', 'overlay-focus-in', 'overlay-keyboard-action', 'overlay-action-focus-return',
  'overlay-pointer-open', 'overlay-escape', 'overlay-escape-focus-return', 'mode-switch-portal', 'system-preference-change', 'explicit-mode-overrides',
  'reduced-motion-values', 'reduced-motion-interaction', 'axe-closed', 'axe-open', 'axe-switched-open', 'axe-switched-closed',
] as const;
type Assertion = { name: string; expected: unknown; actual: unknown; status: 'passed' | 'failed'; error?: string };
type FocusItem = { role: string; name: string };
type FocusStep = { key: string; inside: boolean; accessible: boolean; position: number; item: FocusItem | null };
type AxeReport = { violations: { id: string; nodes: unknown[] }[]; incomplete: unknown[]; passes: unknown[]; focusCycle?: { relatedNodes: number; inventory: FocusItem[]; steps: FocusStep[] } };
export type BrowserEvidence = { assertions: Assertion[]; axe: Record<string, AxeReport>; modeSnapshots: unknown[]; failures: string[] };
const TOKEN_KEYS = Object.keys(resolveDraft(stockDraft()).light);

function modalFocusNodes(axe: AxeReport): number | null {
  let count = 0;
  const selector = (value: unknown): boolean => typeof value === 'string' ? value.length > 0 : Array.isArray(value) && value.length > 0 && value.every(selector);
  for (const rule of axe.incomplete as { id: string; nodes: { any: unknown[]; none: unknown[]; all: { id: string; relatedNodes: unknown[] }[] }[] }[]) {
    if (!rule || rule.id !== 'aria-hidden-focus' || !Array.isArray(rule.nodes) || !rule.nodes.length) return null;
    for (const node of rule.nodes) {
      if (!node || !Array.isArray(node.any) || node.any.length !== 0 || !Array.isArray(node.none) || node.none.length !== 0 || !Array.isArray(node.all) || node.all.length !== 1 || node.all[0]?.id !== 'focusable-modal-open' || !Array.isArray(node.all[0].relatedNodes) || !node.all[0].relatedNodes.length || node.all[0].relatedNodes.some((related) => {
        if (!related || typeof related !== 'object' || Array.isArray(related)) return true;
        const item = related as { html?: unknown; target?: unknown };
        return typeof item.html !== 'string' || !item.html.length || !Array.isArray(item.target) || !selector(item.target);
      })) return null;
      count += node.all[0].relatedNodes.length;
    }
  }
  return count;
}

function axeProblems(axe: AxeReport, state: string): string[] {
  const problems = axe.violations.map((violation) => violation?.id ?? 'invalid axe violation');
  const count = modalFocusNodes(axe);
  const cycle = axe.focusCycle;
  const size = cycle?.inventory?.length ?? 0;
  const reviewed = ['open', 'switched-open'].includes(state) && cycle?.relatedNodes === count && size > 0 && cycle.inventory.every((item) => typeof item?.role === 'string' && typeof item?.name === 'string') && Array.isArray(cycle.steps) && cycle.steps.length === 2 * (size + 1) && cycle.steps.every((step, index) => {
    const forward = index <= size;
    const offset = forward ? index : index - size - 1;
    const position = forward ? offset % size : (size - 1 - offset % size);
    return step?.inside === true && step.accessible === true && step.position === position && step.key === (forward ? 'Tab' : 'Shift+Tab') && JSON.stringify(step.item) === JSON.stringify(cycle.inventory[position]);
  });
  if (count === null || (count > 0 && !reviewed)) problems.push('unresolved axe incomplete');
  return problems;
}

export function browserEvidenceProblems(value: unknown, passed: boolean, layout?: ConsumerLayout, deliveryPath?: DeliveryPath): string[] {
  if (!value || typeof value !== 'object') return ['missing browser pass-condition evidence'];
  const evidence = value as BrowserEvidence;
  const failures: string[] = [];
  if (!Array.isArray(evidence.assertions) || evidence.assertions.some((row) => !row || typeof row !== 'object') || evidence.assertions.length !== BROWSER_ASSERTIONS.length || new Set(evidence.assertions.map((row) => row.name)).size !== BROWSER_ASSERTIONS.length || BROWSER_ASSERTIONS.some((name) => !evidence.assertions.some((row) => row.name === name))) return ['incomplete browser assertion inventory'];
  for (const row of evidence.assertions) {
    if (!['passed', 'failed'].includes(row.status) || row.expected === undefined || row.actual === undefined || (passed && (row.status !== 'passed' || JSON.stringify(row.expected) !== JSON.stringify(row.actual)))) failures.push(`invalid browser assertion: ${row.name}`);
  }
  for (const state of ['closed', 'open', 'switched-open', 'switched-closed']) {
    const axe = evidence.axe?.[state];
    if (!axe || !Array.isArray(axe.violations) || !Array.isArray(axe.incomplete) || !Array.isArray(axe.passes) || (passed && (axeProblems(axe, state).length || !axe.passes.length))) failures.push(`missing or failing axe report: ${state}`);
  }
  if (!Array.isArray(evidence.modeSnapshots) || evidence.modeSnapshots.length < 3 || !Array.isArray(evidence.failures) || (passed && evidence.failures.length)) failures.push('incomplete dynamic mode evidence');
  else {
    const snapshots = evidence.modeSnapshots as Awaited<ReturnType<typeof consumerValues>>[];
    if (!['dark', 'light'].every((mode) => snapshots.some((snapshot) => snapshot?.mode === mode))) failures.push('dynamic modes did not cover both themes');
    for (const snapshot of snapshots) {
      if (!snapshot || typeof snapshot !== 'object') { failures.push('invalid dynamic theme snapshot'); continue; }
      if ((layout && snapshot.layout !== layout) || (deliveryPath && snapshot.deliveryPath !== deliveryPath)) failures.push('dynamic snapshot has wrong layout or delivery path');
      const keys = TOKEN_KEYS;
      const variables = ['variables', 'controlVariables', 'portalVariables'].every((part) => Object.keys(snapshot[part as 'variables'] ?? {}).length === keys.length && keys.every((key) => {
        const value = snapshot[part as 'variables']?.[key];
        return typeof value?.expected === 'string' && typeof value?.actual === 'string' && (!passed || value.expected === value.actual);
      }));
      const paint = ['root', 'control', 'status', 'portal'].every((part) => ['backgroundColor', 'color'].every((property) => typeof snapshot.expected?.[part as 'root']?.[property as 'color'] === 'string' && typeof snapshot.actual?.[part as 'root']?.[property as 'color'] === 'string' && (!passed || snapshot.expected[part as 'root'][property as 'color'] === snapshot.actual[part as 'root']?.[property as 'color'])));
      if (!variables || !paint || !Array.isArray(snapshot.failures) || (passed && (snapshot.failures.length || snapshot.colorScheme !== snapshot.mode))) failures.push('invalid dynamic theme snapshot');
      if (passed && (snapshot.controlColorScheme !== snapshot.mode || snapshot.portal?.colorScheme !== snapshot.mode)) failures.push('dynamic control or portal color-scheme differs from mode');
      if (!snapshot.portal || typeof snapshot.portal.inContainer !== 'boolean' || typeof snapshot.portal.documentSurface !== 'string' || typeof snapshot.portal.subtreeSurface !== 'string' || (passed && deliveryPath === 'stylex-subtree' && (!snapshot.portal.inContainer || snapshot.portal.documentSurface === snapshot.portal.subtreeSurface))) failures.push('invalid dynamic portal boundary');
      if (!['height', 'radius', 'display'].every((key) => {
        const property = key as 'height' | 'radius' | 'display';
        return typeof snapshot.extraction?.expected?.[property] === 'string' && typeof snapshot.extraction?.actual?.[property] === 'string' && (!passed || snapshot.extraction.actual[property] === snapshot.extraction.expected[property]);
      })) failures.push('invalid dynamic extraction');
    }
  }
  return failures;
}

const axePath = createRequire(import.meta.url).resolve('axe-core/axe.min.js', { paths: [join(repository, 'apps/docs')] });

export async function browserConditions(page: Page, tables: ResolvedDraft, mode: 'dark' | 'light', explicit: boolean, id: string, layout: ConsumerLayout, deliveryPath: DeliveryPath) {
  const evidence: BrowserEvidence = { assertions: [], axe: {}, modeSnapshots: [], failures: [] };
  page.setDefaultTimeout(5000);
  const check = async (name: typeof BROWSER_ASSERTIONS[number], expected: unknown, action: () => Promise<unknown>) => {
    let actual: unknown = null;
    let error: string | undefined;
    try { actual = await action(); } catch (caught) { error = String(caught); }
    const status = !error && JSON.stringify(actual) === JSON.stringify(expected) ? 'passed' : 'failed';
    evidence.assertions.push({ name, expected, actual, status, ...(error ? { error } : {}) });
    if (status === 'failed') evidence.failures.push(`${name}: expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}${error ? ` (${error})` : ''}`);
  };
  const settle = async () => page.evaluate(async () => {
    getComputedStyle(document.querySelector('[data-testid="proof-portal"]') ?? document.documentElement).backgroundColor;
    await new Promise<void>((done) => requestAnimationFrame(() => requestAnimationFrame(() => done())));
    await Promise.all(document.getAnimations().filter((animation) => animation.effect?.getComputedTiming().iterations !== Infinity).map((animation) => animation.finished.catch(() => {})));
  });
  const input = page.getByRole('textbox', { name: 'Project name', exact: true });
  const trigger = page.getByRole('button', { name: 'Theme popup', exact: true });
  const dialog = page.getByRole('dialog', { name: 'Installed theme', exact: true });
  const focused = (locator: ReturnType<Page['getByRole']>) => locator.evaluate((el) => el === document.activeElement);
  const modeValues = async (next: 'dark' | 'light') => {
    await page.getByTestId('proof-root').waitFor();
    await page.waitForFunction((mode) => document.querySelector('[data-testid="proof-root"]')?.getAttribute('data-mode') === mode, next);
    await settle();
    const snapshot = await consumerValues(page, tables[next], next, id, layout, deliveryPath);
    evidence.modeSnapshots.push(snapshot);
    return snapshot.failures;
  };
  const setMode = async (next: 'dark' | 'light' | null) => page.evaluate((mode) => {
    if (mode) document.documentElement.dataset.theme = mode;
    else document.documentElement.removeAttribute('data-theme');
  }, next);
  const axe = async (state: string) => {
    await page.addScriptTag({ path: axePath });
    const result = await page.evaluate(async () => (window as unknown as { axe: { run: () => Promise<AxeReport> } }).axe.run());
    evidence.axe[state] = result;
    const count = modalFocusNodes(result);
    if (count !== null && count > 0) {
      const focusState = async (edge?: 'first' | 'last') => dialog.evaluate((element, edge) => {
        const accessible = (node: Element) => !node.closest('[aria-hidden="true"], [inert]') && getComputedStyle(node).visibility === 'visible' && getComputedStyle(node).display !== 'none' && node.getClientRects().length > 0;
        const walker = document.createTreeWalker(element, NodeFilter.SHOW_ELEMENT);
        const elements: HTMLElement[] = [];
        while (walker.nextNode()) {
          const node = walker.currentNode;
          if (node instanceof HTMLElement && node.tabIndex >= 0 && !node.matches(':disabled') && accessible(node)) elements.push(node);
        }
        elements.sort((a, b) => (a.tabIndex || Infinity) - (b.tabIndex || Infinity));
        const item = (node: HTMLElement) => ({ role: node.getAttribute('role') ?? node.tagName.toLowerCase(), name: node.getAttribute('aria-label') ?? node.textContent?.trim() ?? '' });
        if (edge) elements[edge === 'first' ? 0 : elements.length - 1]?.focus();
        const active = document.activeElement;
        return { inventory: elements.map(item), inside: !!active && element.contains(active), accessible: !!active && accessible(active), position: elements.indexOf(active as HTMLElement), item: active instanceof HTMLElement ? item(active) : null };
      }, edge);
      const { inventory } = await focusState();
      const steps: FocusStep[] = [];
      // Axe defers modal-only tab checks; retain its findings and cross both boundaries.
      for (const key of ['Tab', 'Shift+Tab']) {
        await focusState(key === 'Tab' ? 'last' : 'first');
        await settle();
        for (let index = 0; index <= inventory.length; index++) {
          await page.keyboard.press(key);
          await settle();
          const observed = await focusState();
          steps.push({ key, inside: observed.inside && JSON.stringify(observed.inventory) === JSON.stringify(inventory), accessible: observed.accessible, position: observed.position, item: observed.item });
        }
      }
      result.focusCycle = { relatedNodes: count, inventory, steps };
    }
    return axeProblems(result, state);
  };
  try {
  await check('form-label-required', true, async () => await input.getAttribute('required') !== null && await page.getByRole('form', { name: 'Project form' }).isVisible());
  await check('required-validation', 'true', async () => { await page.getByRole('button', { name: 'Save project', exact: true }).click(); return input.getAttribute('aria-invalid'); });
  await check('required-error-name', true, async () => {
    const alert = page.getByRole('alert', { name: 'Project name error', exact: true });
    await alert.waitFor();
    return await alert.textContent() === 'Project name is required' && await input.evaluate((el) => (el.getAttribute('aria-describedby') ?? '').split(/\s+/).some((id) => document.getElementById(id)?.textContent === 'Project name is required'));
  });
  await check('selection-pointer', 'true', async () => { await page.getByRole('radio', { name: 'Public', exact: true }).click(); return page.getByRole('radio', { name: 'Public', exact: true }).getAttribute('aria-checked'); });
  await check('selection-keyboard', 'true', async () => { await page.getByRole('radio', { name: 'Public', exact: true }).focus(); await page.keyboard.press('ArrowUp'); return page.getByRole('radio', { name: 'Private', exact: true }).getAttribute('aria-checked'); });
  await check('submit-values', { project: 'Aster', visibility: 'private' }, async () => {
    await input.fill('Aster');
    await page.getByRole('button', { name: 'Save project', exact: true }).focus();
    await page.keyboard.press('Enter');
    return JSON.parse(await page.getByRole('status', { name: 'Submission result', exact: true }).textContent() ?? 'null');
  });
  await check('reset-values', { project: '', private: 'true', result: 'No submission', errors: 0 }, async () => {
    await page.getByRole('button', { name: 'Reset form', exact: true }).click();
    return { project: await input.inputValue(), private: await page.getByRole('radio', { name: 'Private', exact: true }).getAttribute('aria-checked'), result: await page.getByRole('status', { name: 'Submission result', exact: true }).textContent(), errors: await page.getByRole('form', { name: 'Project form', exact: true }).getByRole('alert').count() };
  });
  await check('navigation-current', 'page', () => page.getByRole('link', { name: 'Projects', exact: true }).getAttribute('aria-current'));
  await check('navigation-keyboard', true, async () => { await page.getByRole('link', { name: 'Projects', exact: true }).focus(); await page.keyboard.press('Tab'); return focused(page.getByRole('link', { name: 'Activity', exact: true })); });
  await check('navigation-activation', true, async () => { await page.keyboard.press('Enter'); return await page.getByRole('link', { name: 'Activity', exact: true }).getAttribute('aria-current') === 'page' && await page.getByRole('heading', { name: 'Current route: activity', exact: true }).isVisible() && new URL(page.url()).hash === '#activity'; });
  await check('data-row', true, () => page.getByRole('row', { name: 'Aster Active', exact: true }).isVisible());
  await check('data-empty', true, async () => { await page.getByRole('button', { name: 'Clear projects', exact: true }).click(); return await page.getByRole('heading', { name: 'No projects', exact: true }).isVisible() && await page.getByRole('row', { name: 'Aster Active', exact: true }).count() === 0; });
  await check('data-restore', true, async () => { await page.getByRole('button', { name: 'Restore projects', exact: true }).click(); return page.getByRole('row', { name: 'Aster Active', exact: true }).isVisible(); });
  const control = page.getByRole('button', { name: 'Theme control', exact: true });
  await check('keyboard-focus', true, async () => {
    await control.focus(); await page.keyboard.press('Tab'); await page.keyboard.press('Shift+Tab');
    return control.evaluate((el) => {
      const css = getComputedStyle(el);
      const probe = document.createElement('span'); probe.style.color = css.getPropertyValue('--ult-color-border-focus'); el.append(probe);
      const pass = el.matches(':focus-visible') && css.outlineStyle !== 'none' && parseFloat(css.outlineWidth) > 0 && css.outlineColor === getComputedStyle(probe).color;
      probe.remove(); return pass;
    });
  });
  await check('axe-closed', [], () => axe('closed'));
  await check('overlay-keyboard-open', true, async () => { await trigger.focus(); await page.keyboard.press('Enter'); await dialog.waitFor(); await settle(); return dialog.isVisible(); });
  await check('overlay-portalled', true, () => dialog.evaluate((el) => !!el.parentElement && !el.parentElement.contains(document.querySelector('[data-testid="proof-control"]')) && (el.closest('[data-proof-portal-container]') !== null || el.closest('main') === null)));
  await check('overlay-focus-in', true, () => dialog.evaluate((el) => el.contains(document.activeElement)));
  await check('axe-open', [], () => axe('open'));
  const snapshot = await consumerValues(page, tables[mode], mode, id, layout, deliveryPath);
  const opposite = mode === 'dark' ? 'light' : 'dark';
  await check('mode-switch-portal', [], async () => { await setMode(opposite); return modeValues(opposite); });
  await check('axe-switched-open', [], () => axe('switched-open'));
  await check('overlay-keyboard-action', true, async () => { await page.getByRole('button', { name: 'Confirm theme', exact: true }).focus(); await page.keyboard.press('Space'); await dialog.waitFor({ state: 'hidden' }); return await dialog.count() === 0; });
  await check('overlay-action-focus-return', true, () => focused(trigger));
  await check('axe-switched-closed', [], () => axe('switched-closed'));
  await check('overlay-pointer-open', true, async () => { await trigger.click(); await dialog.waitFor(); await settle(); return dialog.isVisible(); });
  await check('system-preference-change', [], async () => {
    await setMode(null);
    const failures: string[] = [];
    for (const next of [mode, opposite] as const) { await page.emulateMedia({ colorScheme: next }); failures.push(...await modeValues(next)); }
    return failures;
  });
  await check('explicit-mode-overrides', [], async () => {
    const failures: string[] = [];
    for (const next of [mode, opposite] as const) { await page.emulateMedia({ colorScheme: next === 'dark' ? 'light' : 'dark' }); await setMode(next); failures.push(...await modeValues(next)); }
    return failures;
  });
  await setMode(explicit ? mode : null);
  await page.emulateMedia({ colorScheme: explicit ? opposite : mode });
  snapshot.failures.push(...await modeValues(mode));
  await check('overlay-escape', true, async () => { await page.keyboard.press('Escape'); await dialog.waitFor({ state: 'hidden' }); return await dialog.count() === 0; });
  await check('overlay-escape-focus-return', true, () => focused(trigger));
  await check('reduced-motion-values', { fast: '1ms', base: '1ms', slow: '1ms', loop: '0s', portalFast: '1ms', portalBase: '1ms', portalSlow: '1ms', portalLoop: '0s', transition: '0.001s' }, async () => {
    await page.emulateMedia({ reducedMotion: 'reduce' }); await trigger.click(); await dialog.waitFor(); await settle();
    return page.evaluate(() => {
      const control = getComputedStyle(document.querySelector('[data-testid="proof-control"]')!);
      const portal = getComputedStyle(document.querySelector('[data-testid="proof-portal"]')!);
      return Object.fromEntries([...['fast', 'base', 'slow', 'loop'].map((key) => [key, control.getPropertyValue(`--ult-motion-${key}`).trim()]), ...['fast', 'base', 'slow', 'loop'].map((key) => [`portal${key[0]!.toUpperCase()}${key.slice(1)}`, portal.getPropertyValue(`--ult-motion-${key}`).trim()]), ['transition', portal.transitionDuration]]);
    });
  });
  await check('reduced-motion-interaction', true, async () => { await page.keyboard.press('Escape'); await dialog.waitFor({ state: 'hidden' }); return focused(trigger); });
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await trigger.click(); await dialog.waitFor(); await settle();
  snapshot.failures.push(...evidence.failures);
  return { snapshot, browser: evidence };
  } catch (error) { throw Object.assign(new Error(String(error)), { browser: evidence }); }
}
