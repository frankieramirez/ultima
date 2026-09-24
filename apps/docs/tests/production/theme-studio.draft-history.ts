/**
 * The production binding for theme-studio.draft-history. The runner serves the built docs, starts each
 * case with empty storage and calls it once per declared case. It drives only shipped controls, reads
 * painted values, and reloads once so the autosave restores the draft through the real entry point.
 */
import assert from 'node:assert/strict';

import type { Page } from 'playwright';

import { productionScenario } from '../../../../scripts/verification/production.ts';
import { draftHistory } from '../fixtures/theme-studio-history.ts';
import { assertColor, shippedColor } from '../support/production.ts';

const { densityGroup, stockDensity, editedDensity, stockSpace1, overrideToken, overrideValue } = draftHistory;

/** Below 840px the editor is a bottom sheet whose groups are chosen from a horizontal selector. */
async function showGroup(page: Page, narrow: boolean, group: string) {
  if (narrow) await page.getByRole('group', { name: 'Theme groups' }).getByRole('button', { name: group, exact: true }).click();
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

export default productionScenario('theme-studio.draft-history', 'production', async ({ page, variant, open, reload, axe }) => {
  const narrow = variant.viewport === 'narrow';
  await open('/theme-studio');
  const stockAccent = await readToken(page, overrideToken);
  assert.equal(await readToken(page, '--ult-space-1'), stockSpace1, 'the studio opens on the stock draft');

  // The site header follows the chosen mode; the editor around the preview stays stock dark.
  const header = await page.getByRole('banner').evaluate((element) => getComputedStyle(element).backgroundColor);
  await assertColor(page, header, await shippedColor(page, '--ult-color-surface', variant.mode), `the site header in ${variant.mode} mode`);
  const editor = page.getByRole('complementary', { name: 'Theme editor' });
  const editorSurface = await editor.evaluate((element) => getComputedStyle(element).getPropertyValue('--ult-color-surface').trim());
  await assertColor(page, editorSurface, await shippedColor(page, '--ult-color-surface', 'dark'), 'the editor surface');

  if (narrow) await page.getByRole('group', { name: 'Theme groups' }).waitFor({ state: 'visible' });
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
  await page.getByRole('button', { name: 'Reset theme' }).waitFor();
  assert.deepEqual(await snapshot(page, narrow), edited, 'autosave restores the edit, the override and the lock');
  assert.ok(await page.getByRole('button', { name: 'Undo' }).isDisabled(), 'reload restores the draft but starts undo history empty');

  await page.getByRole('button', { name: 'Reset theme' }).click();
  await showGroup(page, narrow, densityGroup);
  assert.equal(await pressed(page, stockDensity, `${densityGroup} preset`), 'true');
  assert.deepEqual(await snapshot(page, narrow), { density: 'false', locked: 'false', space: stockSpace1, accent: stockAccent });

  await page.getByRole('button', { name: 'Undo' }).click();
  assert.deepEqual(await snapshot(page, narrow), edited, 'one undo restores the draft from before the reset');

  // Narrow: the preview sits on top and the editor sheet under it, and both stay reachable. Checked last
  // so the draft journey above is proven at this width whatever the layout does.
  if (narrow) {
    const pane = page.getByRole('region', { name: /^(Dark|Light) preview$/ }).first();
    await pane.scrollIntoViewIfNeeded();
    const box = await pane.boundingBox();
    assert.ok(box && box.height > 0, `the preview pane is reachable above the editor sheet (it is ${box ? `${box.width}×${box.height}` : 'not rendered'})`);
    await editor.scrollIntoViewIfNeeded();
    assert.ok(await editor.isVisible(), 'the editor sheet is reachable');
  }
});
