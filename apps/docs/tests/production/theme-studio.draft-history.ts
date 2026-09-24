/**
 * The production binding for theme-studio.draft-history. Authored for the production pilot and not
 * yet executed: the runner that serves the built docs, starts each case with empty storage and calls
 * it once per declared case lands later. It drives only shipped controls and reads painted values.
 */
import assert from 'node:assert/strict';

import type { Page } from 'playwright';

import { productionScenario } from '../../../../scripts/verification/production.ts';
import { draftHistory } from '../fixtures/theme-studio-history.ts';

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

export default productionScenario('theme-studio.draft-history', 'production', async ({ page, variant, open }) => {
  const narrow = variant.viewport === 'narrow';
  await open('/theme-studio');
  const stockAccent = await readToken(page, overrideToken);
  assert.equal(await readToken(page, '--ult-space-1'), stockSpace1, 'the studio opens on the stock draft');

  await showGroup(page, narrow, densityGroup);
  await page.getByRole('group', { name: `${densityGroup} preset` }).getByRole('button', { name: editedDensity, exact: true }).click();

  await showGroup(page, narrow, 'Color');
  await page.getByRole('button', { name: 'Color token overrides' }).click();
  const accent = page.getByRole('textbox', { name: overrideToken, exact: true });
  await accent.fill(overrideValue);
  await accent.press('Enter');

  await showGroup(page, narrow, densityGroup);
  await page.getByRole('button', { name: `Lock ${densityGroup}`, exact: true }).click();

  const edited = await snapshot(page, narrow);
  assert.deepEqual(edited, { density: 'true', locked: 'true', space: edited.space, accent: overrideValue });
  assert.notEqual(edited.space, stockSpace1, 'the density edit changes the painted spacing');

  await page.reload();
  await page.getByRole('button', { name: 'Reset theme' }).waitFor();
  assert.deepEqual(await snapshot(page, narrow), edited, 'autosave restores the edit, the override and the lock');

  await page.getByRole('button', { name: 'Reset theme' }).click();
  await showGroup(page, narrow, densityGroup);
  assert.equal(await pressed(page, stockDensity, `${densityGroup} preset`), 'true');
  assert.deepEqual(await snapshot(page, narrow), { density: 'false', locked: 'false', space: stockSpace1, accent: stockAccent });

  await page.getByRole('button', { name: 'Undo' }).click();
  assert.deepEqual(await snapshot(page, narrow), edited, 'one undo restores the draft from before the reset');
});
