/**
 * The production binding for theme-studio.draft-history. The runner serves the built docs, starts each
 * case with empty storage and calls it once per declared case. It drives only shipped controls, reads
 * painted values, and reloads once so the autosave restores the draft through the real entry point.
 */
import assert from 'node:assert/strict';

import type { Page } from 'playwright';

import { parseDraft, serializeDraft } from '../../../../packages/tokens/src/theme/codec.ts';
import { toRegistryItem } from '../../../../packages/tokens/src/theme/export.ts';
import { productionScenario } from '../../../../scripts/verification/production.ts';
import { draftHistory } from '../fixtures/theme-studio-history.ts';
import { assertColor, assertFits, shippedColor } from '../support/production.ts';

const { densityGroup, stockDensity, editedDensity, stockSpace1, overrideToken, overrideValue } = draftHistory;

async function showGroup(page: Page, narrow: boolean, group: string) {
  if (narrow) {
    if (!(await page.getByRole('dialog', { name: 'Edit theme', exact: true }).isVisible())) await page.getByRole('button', { name: 'Edit theme', exact: true }).click();
    await page.getByRole('group', { name: 'Theme groups' }).getByRole('button', { name: group, exact: true }).click();
  } else {
    const edit = page.getByRole('button', { name: `Edit ${group}`, exact: true });
    if ((await edit.getAttribute('aria-expanded')) === 'false') await edit.click();
  }
}

function readToken(page: Page, token: string) {
  return page
    .getByRole('region', { name: /^(Dark|Light) preview$/ })
    .first()
    .evaluate((pane, name) => getComputedStyle(pane).getPropertyValue(name).trim(), token);
}

async function pressed(page: Page, name: string, scope?: string) {
  const root = scope ? page.getByRole('group', { name: scope }) : page;
  return root.getByRole('button', { name, exact: true }).getAttribute('aria-pressed');
}

type Snapshot = { density: string | null; locked: string | null; space: string; accent: string };

async function snapshot(page: Page, narrow: boolean): Promise<Snapshot> {
  await showGroup(page, narrow, densityGroup);
  return {
    density: await pressed(page, editedDensity, `${densityGroup} preset`),
    locked: await pressed(page, `Lock ${densityGroup}`),
    space: await readToken(page, '--ult-space-1'),
    accent: await readToken(page, overrideToken),
  };
}

export default productionScenario('theme-studio.draft-history', 'production', async ({ page, variant, open, reload, axe, grantClipboard }) => {
  const narrow = variant.viewport === 'narrow';
  await open('/theme-studio');
  const stockAccent = await readToken(page, overrideToken);
  assert.equal(await readToken(page, '--ult-space-1'), stockSpace1, 'the studio opens on the stock draft');

  // The site header and editor follow the chosen mode, independently of the draft.
  const header = await page.getByRole('banner').evaluate((element) => getComputedStyle(element).backgroundColor);
  await assertColor(page, header, await shippedColor(page, '--ult-color-surface', variant.mode), `the site header in ${variant.mode} mode`);
  await showGroup(page, narrow, 'Color');
  const editor = page.getByRole('complementary', { name: 'Theme editor' });
  const editorSurface = await editor.evaluate((element) => getComputedStyle(element).getPropertyValue('--ult-color-surface').trim());
  await assertColor(page, editorSurface, await shippedColor(page, '--ult-color-surface', variant.mode), 'the editor surface');

  if (narrow) await page.getByRole('group', { name: 'Theme groups' }).waitFor({ state: 'visible' });
  await assertFits(page, editor, `/theme-studio at ${variant.viewport} width`);
  const scrollGap = await editor.evaluate((element) => {
    const viewport = Array.from(element.querySelectorAll<HTMLElement>('div')).find((child) => getComputedStyle(child).overflowY === 'auto');
    if (!viewport) throw new Error('The editor scroll viewport is missing.');
    return element.getBoundingClientRect().bottom - viewport.getBoundingClientRect().bottom;
  });
  assert.ok(Math.abs(scrollGap) < 2, `the sidebar scroll viewport reaches its bottom edge (gap ${scrollGap}px)`);
  await axe('stock draft');

  await showGroup(page, narrow, densityGroup);
  await page.getByRole('group', { name: `${densityGroup} preset` }).getByRole('button', { name: editedDensity, exact: true }).click();

  await showGroup(page, narrow, 'Color');
  await page.getByRole('button', { name: 'Color token overrides' }).click();
  const accent = page.getByRole('textbox', { name: overrideToken, exact: true });
  // Typed like a person, as the docs test does; the field commits a valid value on blur.
  await accent.clear();
  await accent.pressSequentially(overrideValue);
  await accent.press('Enter');

  await showGroup(page, narrow, densityGroup);
  await page.getByRole('button', { name: `Lock ${densityGroup}`, exact: true }).click();

  const edited = await snapshot(page, narrow);
  assert.deepEqual(edited, { density: 'true', locked: 'true', space: edited.space, accent: overrideValue });
  assert.notEqual(edited.space, stockSpace1, 'the density edit changes the painted spacing');

  await reload();
  await showGroup(page, narrow, densityGroup);
  await page.getByRole('button', { name: 'Reset theme' }).waitFor();
  assert.deepEqual(await snapshot(page, narrow), edited, 'autosave restores the edit, the override and the lock');
  assert.ok(await page.getByRole('button', { name: 'Undo' }).isDisabled(), 'reload restores the draft but starts undo history empty');

  await page.getByRole('button', { name: 'Reset theme' }).click();
  await showGroup(page, narrow, densityGroup);
  assert.equal(await pressed(page, stockDensity, `${densityGroup} preset`), 'true');
  assert.deepEqual(await snapshot(page, narrow), { density: 'false', locked: 'false', space: stockSpace1, accent: stockAccent });

  await page.getByRole('button', { name: 'Undo' }).click();
  assert.deepEqual(await snapshot(page, narrow), edited, 'one undo restores the draft from before the reset');

  if (narrow) {
    await page.keyboard.press('Escape');
    await page.getByRole('dialog', { name: 'Edit theme', exact: true }).waitFor({ state: 'hidden' });
    assert.ok(await page.getByRole('button', { name: 'Edit theme', exact: true }).evaluate((element) => element === document.activeElement), 'Escape restores focus to Edit theme');
    await assertFits(page, page.getByRole('region', { name: 'Dark preview' }), 'mobile gallery after closing the drawer');
    await axe('mobile gallery');
  }

  await page.getByRole('button', { name: 'Export theme', exact: true }).click();
  const dialog = page.getByRole('dialog', { name: 'Export theme', exact: true });
  const acknowledgement = dialog.getByRole('checkbox', { name: /Export anyway/ });
  if (await acknowledgement.isVisible()) await acknowledgement.check();
  const copy = dialog.getByRole('button', { name: 'Copy install command', exact: true });
  await copy.waitFor();
  await grantClipboard();
  await copy.click();
  await page.waitForFunction(() => document.querySelector('[aria-label="Copy install command"]')?.textContent?.includes('Copied'));
  const command = await page.evaluate(() => navigator.clipboard.readText());
  const match = /^npx shadcn@latest add "(.+)"$/.exec(command);
  assert.ok(match, 'Copy install command writes the URL-based command');
  const url = new URL(match[1]!);
  assert.equal(url.origin, new URL(page.url()).origin);
  assert.equal(url.pathname, '/r/theme.json');
  assert.equal(url.hash, '');
  const commandBlock = dialog.locator('pre').filter({ hasText: 'npx shadcn@latest add' });
  const commandSize = await commandBlock.evaluate((element) => ({ height: element.getBoundingClientRect().height, width: element.clientWidth, scrollWidth: element.scrollWidth }));
  assert.ok(commandSize.height < 100, 'the URL command stays on one line');
  assert.ok(commandSize.scrollWidth > commandSize.width, 'the full command scrolls horizontally');
  await commandBlock.focus();
  await page.keyboard.press('End');
  await page.keyboard.press('ArrowRight');
  await page.waitForFunction(() => Array.from(document.querySelectorAll('pre')).some((element) => element.textContent?.includes('npx shadcn@latest add') && element.scrollLeft > 0));
  const response = await page.request.get(url.href);
  assert.equal(response.status(), 200, 'the built worker serves the install URL');
  const saved = parseDraft(await page.evaluate(() => localStorage.getItem('ultima-theme-studio-draft') ?? ''));
  assert.ok(saved.ok);
  const registryText = await response.text();
  assert.equal(registryText, toRegistryItem(saved.draft), 'the URL and file export contain the same complete edited theme');
  const registry = JSON.parse(registryText) as { files: { content: string; target: string }[] };
  assert.equal(registry.files[1]!.content, serializeDraft(saved.draft));
  assert.equal(saved.draft.locks.density, true);
  assert.equal(saved.draft.overrides.dark[overrideToken], overrideValue);
  await assertFits(page, dialog, `URL export at ${variant.viewport} width`);
  await axe('URL export');
});
