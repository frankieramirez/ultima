/**
 * The production binding for theme-studio.pane-boundaries, desktop only. In Compare, each pane's
 * overlays portal inside that pane's theme boundary and paint its values; one guided edit reaches both
 * panes while the editor chrome follows the site mode. The contract is the portal's mount point and the theme
 * it inherits (docs/spec/theme-studio.md); a Dialog still centres in the window.
 */
import assert from 'node:assert/strict';

import type { Locator, Page } from 'playwright';

import { productionScenario } from '../../../../scripts/verification/production.ts';
import { draftHistory } from '../fixtures/theme-studio-history.ts';
import { paneBoundaries } from '../fixtures/theme-studio-panes.ts';
import { animationsSettle, assertColor, assertFits, isFocused, sameColor, shippedColor } from '../support/production.ts';

const { panes, scene, overlays } = paneBoundaries;
const { densityGroup, editedDensity, stockSpace1 } = draftHistory;

const EDITOR_TOKENS = ['--ult-color-surface', '--ult-color-accent', '--ult-space-1'];

function tokens(target: Locator, names: string[]): Promise<Record<string, string>> {
  return target.evaluate(
    (element, list) => Object.fromEntries(list.map((name) => [name, getComputedStyle(element).getPropertyValue(name).trim()])),
    names,
  );
}

/** Each pane's surfaces, spacing and color scheme, dark then light. */
async function paneState(page: Page): Promise<Record<string, string>[]> {
  return Promise.all(
    panes.map(async (pane) => {
      const region = page.getByRole('region', { name: pane.name });
      return { ...(await tokens(region, ['--ult-color-surface', '--ult-color-surface-raised', '--ult-space-1'])), scheme: await region.evaluate((element) => getComputedStyle(element).colorScheme) };
    }),
  );
}

export default productionScenario('theme-studio.pane-boundaries', 'production', async ({ page, variant, open, axe }) => {
  assert.equal(variant.viewport, 'desktop', 'Compare panes sit side by side only at desktop width');
  await open('/theme-studio');
  const editor = page.getByRole('complementary', { name: 'Theme editor' });
  const header = page.getByRole('banner');
  const headerBefore = await header.evaluate((element) => getComputedStyle(element).backgroundColor);
  await assertColor(page, headerBefore, await shippedColor(page, '--ult-color-surface', variant.mode), `the site header in ${variant.mode} mode`);
  const editorBefore = await tokens(editor, EDITOR_TOKENS);
  await assertColor(page, editorBefore['--ult-color-surface'] ?? '', await shippedColor(page, '--ult-color-surface', variant.mode), 'the editor surface');

  const modes = page.getByRole('group', { name: 'Preview color mode' });
  await modes.getByRole('button', { name: 'Compare', exact: true }).click();
  assert.equal(await modes.getByRole('button', { name: 'Compare', exact: true }).getAttribute('aria-pressed'), 'true');
  const [dark, light] = panes.map((pane) => page.getByRole('region', { name: pane.name })) as [Locator, Locator];
  await dark.waitFor();
  await light.waitFor();
  const [darkBox, lightBox] = [await dark.boundingBox(), await light.boundingBox()];
  assert.ok(darkBox && lightBox && darkBox.x + darkBox.width <= lightBox.x + 1 && Math.abs(darkBox.y - lightBox.y) <= 1, 'the panes sit side by side, dark first');

  const stock = await paneState(page);
  assert.deepEqual(stock.map((pane) => pane.scheme), ['dark', 'light'], 'each pane is forced to its own color scheme');
  assert.ok(!(await sameColor(page, stock[0]?.['--ult-color-surface'] ?? '', stock[1]?.['--ult-color-surface'] ?? '')), 'the panes paint different surfaces');
  assert.equal(stock[0]?.['--ult-space-1'], stockSpace1, 'the draft starts stock');
  await page.getByRole('button', { name: 'Inspect tokens', exact: true }).click();
  for (const [index, pane] of panes.entries()) {
    const region = index === 0 ? dark : light;
    const trigger = region.getByRole('button', { name: 'Inspect Create your workspace tokens', exact: true });
    await trigger.focus();
    const readout = region.getByRole('status', { name: 'Token readout' });
    await readout.waitFor({ state: 'visible' });
    await animationsSettle(region, 'the token hover card finishes opening');
    const owner = await readout.evaluate((element) => element.closest('[role="region"]')?.getAttribute('aria-label'));
    assert.equal(owner, pane.name, 'the hover card belongs to the inspected pane');
    assert.ok((await readout.textContent())?.includes(stock[index]?.['--ult-color-surface-raised'] ?? ''), 'the hover card shows the pane’s resolved surface');
    assert.equal(await readout.evaluate((element) => getComputedStyle(element).colorScheme), pane.mode, 'the hover card inherits its pane’s mode');
    await assertFits(page, readout, `the token hover card in ${pane.name}`);
    await axe(`token inspection in ${pane.name}`);
    await page.keyboard.press('Escape');
    await readout.waitFor({ state: 'hidden' });
  }
  await page.getByRole('button', { name: 'Inspect tokens', exact: true }).click();
  await page.getByRole('tablist', { name: 'Preview scenes' }).getByRole('tab', { name: scene, exact: true }).click();
  await assertFits(page, light, 'the studio in Compare');
  await axe('Compare with the Overlays scene');

  for (const [index, pane] of panes.entries()) {
    const region = index === 0 ? dark : light;
    const other = index === 0 ? light : dark;
    for (const overlay of overlays) {
      const trigger = region.getByRole('button', { name: overlay.trigger, exact: true });
      await trigger.focus();
      await page.keyboard.press('Enter');
      const popup = region.getByRole('dialog', { name: overlay.dialog });
      await popup.waitFor({ state: 'visible' });
      // The pane holds the portal, so this covers the popup and a dialog's backdrop.
      await animationsSettle(region, `${overlay.dialog} finishes opening in ${pane.name}`);
      assert.equal(await other.getByRole('dialog', { name: overlay.dialog }).count(), 0, `the ${pane.name} ${overlay.dialog} popup is not in the other pane`);
      const owner = await popup.evaluate((element) => element.closest('[role="region"]')?.getAttribute('aria-label') ?? null);
      assert.equal(owner, pane.name, `${overlay.dialog} mounts inside ${pane.name}`);
      const painted = await popup.evaluate((element) => ({ background: getComputedStyle(element).backgroundColor, scheme: getComputedStyle(element).colorScheme }));
      assert.equal(painted.scheme, pane.mode, `${overlay.dialog} inherits the ${pane.mode} scheme`);
      await assertColor(page, painted.background, stock[index]?.['--ult-color-surface-raised'] ?? '', `${overlay.dialog} in ${pane.name}`);
      const box = await popup.boundingBox();
      const view = page.viewportSize();
      assert.ok(box && view && box.x >= 0 && box.y >= 0 && box.x + box.width <= view.width && box.y + box.height <= view.height, `${overlay.dialog} lies inside the window`);
      await axe(`${overlay.dialog} open in ${pane.name}`);
      await page.keyboard.press('Escape');
      await popup.waitFor({ state: 'hidden' });
      assert.ok(await isFocused(trigger), `Escape returns focus to ${overlay.trigger} in ${pane.name}`);
    }
  }

  await editor.getByRole('button', { name: `Edit ${densityGroup}`, exact: true }).click();
  await editor.getByRole('group', { name: `${densityGroup} preset` }).getByRole('button', { name: editedDensity, exact: true }).click();
  await page.waitForFunction(
    ([name, value]) => getComputedStyle(document.querySelector(`[role="region"][aria-label="${name}"]`) as Element).getPropertyValue('--ult-space-1').trim() !== value,
    [panes[0].name, stockSpace1] as const,
  );
  const edited = await paneState(page);
  assert.notEqual(edited[0]?.['--ult-space-1'], stockSpace1, 'the edit reaches the dark pane');
  assert.equal(edited[1]?.['--ult-space-1'], edited[0]?.['--ult-space-1'], 'the same edit reaches the light pane');
  assert.deepEqual(edited.map((pane) => pane.scheme), ['dark', 'light'], 'the panes keep their schemes');
  for (const [index, pane] of panes.entries()) {
    assert.ok(await sameColor(page, edited[index]?.['--ult-color-surface'] ?? '', stock[index]?.['--ult-color-surface'] ?? ''), `${pane.name} keeps its surface`);
  }
  assert.deepEqual(await tokens(editor, EDITOR_TOKENS), editorBefore, 'the editor around the panes is unchanged');
  assert.equal(await header.evaluate((element) => getComputedStyle(element).backgroundColor), headerBefore, 'the site header is unchanged');
});
