import { createRequire } from 'node:module';
import { join } from 'node:path';
import type { Page } from 'playwright';
import type { ResolvedDraft } from '../packages/tokens/src/theme/draft.ts';
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
type AxeReport = { violations: { id: string; nodes: unknown[] }[]; incomplete: unknown[]; passes: unknown[] };
export type BrowserEvidence = { assertions: Assertion[]; axe: Record<string, AxeReport>; modeSnapshots: unknown[]; failures: string[] };

export function browserEvidenceProblems(value: unknown, passed: boolean): string[] {
  if (!value || typeof value !== 'object') return ['missing browser pass-condition evidence'];
  const evidence = value as BrowserEvidence;
  const failures: string[] = [];
  if (!Array.isArray(evidence.assertions) || evidence.assertions.some((row) => !row || typeof row !== 'object') || evidence.assertions.length !== BROWSER_ASSERTIONS.length || new Set(evidence.assertions.map((row) => row.name)).size !== BROWSER_ASSERTIONS.length || BROWSER_ASSERTIONS.some((name) => !evidence.assertions.some((row) => row.name === name))) return ['incomplete browser assertion inventory'];
  for (const row of evidence.assertions) {
    if (!['passed', 'failed'].includes(row.status) || row.expected === undefined || row.actual === undefined || (passed && (row.status !== 'passed' || JSON.stringify(row.expected) !== JSON.stringify(row.actual)))) failures.push(`invalid browser assertion: ${row.name}`);
  }
  for (const state of ['closed', 'open', 'switched-open', 'switched-closed']) {
    const axe = evidence.axe?.[state];
    if (!axe || !Array.isArray(axe.violations) || !Array.isArray(axe.incomplete) || !Array.isArray(axe.passes) || (passed && (axe.violations.length || !axe.passes.length))) failures.push(`missing or failing axe report: ${state}`);
  }
  if (!Array.isArray(evidence.modeSnapshots) || evidence.modeSnapshots.length < 3 || !Array.isArray(evidence.failures) || (passed && evidence.failures.length)) failures.push('incomplete dynamic mode evidence');
  else {
    const snapshots = evidence.modeSnapshots as Awaited<ReturnType<typeof consumerValues>>[];
    if (!['dark', 'light'].every((mode) => snapshots.some((snapshot) => snapshot?.mode === mode))) failures.push('dynamic modes did not cover both themes');
    for (const snapshot of snapshots) {
      if (!snapshot || typeof snapshot !== 'object') { failures.push('invalid dynamic theme snapshot'); continue; }
      const keys = Object.keys(snapshot.variables ?? {});
      const variables = keys.length > 0 && ['variables', 'controlVariables', 'portalVariables'].every((part) => keys.every((key) => {
        const value = snapshot[part as 'variables']?.[key];
        return typeof value?.expected === 'string' && typeof value?.actual === 'string' && (!passed || value.expected === value.actual);
      }));
      const paint = ['root', 'control', 'status', 'portal'].every((part) => ['backgroundColor', 'color'].every((property) => typeof snapshot.expected?.[part as 'root']?.[property as 'color'] === 'string' && typeof snapshot.actual?.[part as 'root']?.[property as 'color'] === 'string' && (!passed || snapshot.expected[part as 'root'][property as 'color'] === snapshot.actual[part as 'root']?.[property as 'color'])));
      if (!variables || !paint || !Array.isArray(snapshot.failures) || (passed && (snapshot.failures.length || snapshot.colorScheme !== snapshot.mode))) failures.push('invalid dynamic theme snapshot');
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
    return result.violations.map((violation) => violation.id);
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
