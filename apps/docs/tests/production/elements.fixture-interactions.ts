/**
 * The production binding for elements.fixture-interactions: the built /elements.html fixture, a consumer
 * of the served /elements/ultima.js bundle and /tokens.css. Each cell works in the section whose
 * data-theme matches its mode; the runner checks errors and failed requests across the whole page, and
 * axe runs on the whole document. The families come from the generated element catalogue, not a list here.
 */
import assert from 'node:assert/strict';

import type { Locator } from 'playwright';

import { productionScenario } from '../../../../scripts/verification/production.ts';
import { elements } from '../../src/generated/elements.ts';
import { animationsSettle, assertColor, assertFits, assertFocusRing, eventually, isFocused, shippedColor } from '../support/production.ts';

function selected(tab: Locator) {
  return tab.getAttribute('aria-selected');
}

export default productionScenario('elements.fixture-interactions', 'production', async ({ page, variant, openFixture, axe }) => {
  await openFixture('/elements.html');
  const section = page.getByRole('region', { name: variant.mode === 'dark' ? 'Dark' : 'Light', exact: true });
  await section.waitFor();
  assert.equal(await section.getAttribute('data-theme'), variant.mode, 'the cell works in the section for its mode');

  assert.ok(elements.length > 0, 'the generated element catalogue lists families');
  for (const family of elements) {
    for (const tag of family.tags) {
      assert.ok(await page.evaluate((name) => customElements.get(name) !== undefined, tag), `${tag} is defined`);
    }
    const hosts = section.locator(family.tag);
    assert.ok((await hosts.count()) > 0, `the ${variant.mode} section shows the ${family.item} family (${family.tag})`);
    assert.ok(await hosts.first().evaluate((host) => host.firstElementChild !== null || host.shadowRoot !== null), `${family.tag} rendered its parts`);
  }
  const surface = await section.evaluate((element) => getComputedStyle(element).backgroundColor);
  await assertColor(page, surface, await shippedColor(page, '--ult-color-surface', variant.mode), `the ${variant.mode} section surface`);
  await assertFits(page, section.getByRole('heading', { level: 2 }), `/elements.html at ${variant.viewport} width`);
  await axe('fixture with every element defined');

  // A button activates once per Enter and once per Space, in the accent fill.
  const save = section.getByRole('button', { name: 'Save', exact: true });
  await save.evaluate((button) => {
    const host = button.closest('ult-button') as HTMLElement & { activations?: number };
    host.activations = 0;
    host.addEventListener('click', () => {
      host.activations = (host.activations ?? 0) + 1;
    });
  });
  const activations = () => save.evaluate((button) => (button.closest('ult-button') as HTMLElement & { activations?: number }).activations ?? 0);
  await save.focus();
  await page.keyboard.press('Enter');
  await eventually(async () => (await activations()) === 1, 'Enter activates the button once');
  await page.keyboard.press('Space');
  await eventually(async () => (await activations()) === 2, 'Space activates the button once');
  // Keyboard focus came from focus(); move it off and back with Tab so :focus-visible reflects the keyboard.
  await page.keyboard.press('Shift+Tab');
  await page.keyboard.press('Tab');
  await eventually(() => isFocused(save), 'Tab returns to Save');
  await animationsSettle(save, 'Save settles');
  await assertFocusRing(page, save, variant.mode, 'the focused Save button');
  const fill = await save.evaluate((button) => ({ background: getComputedStyle(button).backgroundColor, color: getComputedStyle(button).color }));
  await assertColor(page, fill.background, await shippedColor(page, '--ult-color-accent', variant.mode), 'the solid accent fill');
  await assertColor(page, fill.color, await shippedColor(page, '--ult-color-accent-contrast', variant.mode), 'the solid accent text');
  assert.ok(await section.getByRole('button', { name: 'Disabled', exact: true }).isDisabled(), 'the disabled button is disabled');

  // Tabs activate manually: the arrows move focus, skipping the disabled tab and wrapping, and Enter selects.
  const tabs = section.getByRole('tablist', { name: 'Report views' });
  const [overview, findings] = [tabs.getByRole('tab', { name: 'Overview' }), tabs.getByRole('tab', { name: 'Findings' })];
  assert.equal(await selected(overview), 'true', 'Overview starts selected');
  await overview.focus();
  await page.keyboard.press('ArrowRight');
  await eventually(() => isFocused(findings), 'ArrowRight moves focus to Findings');
  assert.equal(await selected(overview), 'true', 'moving focus alone does not select');
  await page.keyboard.press('Enter');
  await eventually(async () => (await selected(findings)) === 'true', 'Enter selects Findings');
  assert.equal(await selected(overview), 'false', 'Overview is no longer selected');
  const panel = section.getByRole('tabpanel', { name: 'Findings' });
  await panel.waitFor({ state: 'visible' });
  assert.match((await panel.textContent()) ?? '', /Findings from the latest audit/);
  await page.keyboard.press('ArrowRight');
  await eventually(() => isFocused(overview), 'ArrowRight skips the disabled Archive tab and wraps to Overview');
  await page.keyboard.press('Enter');
  await eventually(async () => (await selected(overview)) === 'true', 'Enter selects Overview again');
  await assertFocusRing(page, overview, variant.mode, 'the focused Overview tab');

  // A tooltip opens on keyboard focus, paints the raised surface and closes on Escape.
  const copy = section.getByRole('button', { name: 'Copied to clipboard', exact: true });
  const tip = section.getByRole('tooltip', { name: 'Copied to clipboard' });
  assert.ok(!(await tip.isVisible()), 'the tooltip starts closed');
  // The trigger is scrolled into view first, as a reader would, and reached with one Tab from the control
  // before it. A Tab that has to scroll the trigger into view closes the tooltip it just opened: that is
  // #541, not this obligation.
  await copy.scrollIntoViewIfNeeded();
  // The scroll event lands a frame after the scroll; let it pass before the trigger opens.
  await page.evaluate(() => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve))));
  await section.getByRole('tabpanel', { name: 'Grid' }).evaluate((panel) => (panel as HTMLElement).focus({ preventScroll: true }));
  await page.keyboard.press('Tab');
  await eventually(() => isFocused(copy), 'Tab reaches the tooltip trigger');
  await tip.waitFor({ state: 'visible' });
  await animationsSettle(tip, 'the tooltip finishes opening');
  const tipFill = await tip.evaluate((popup) => getComputedStyle(popup).backgroundColor);
  await assertColor(page, tipFill, await shippedColor(page, '--ult-color-surface-raised', variant.mode), 'the tooltip surface');
  await axe('open tooltip');
  await page.keyboard.press('Escape');
  await tip.waitFor({ state: 'hidden' });
  assert.ok(await isFocused(copy), 'Escape keeps focus on the trigger');
  assert.equal(await activations(), 2, 'nothing else activated Save');
});
