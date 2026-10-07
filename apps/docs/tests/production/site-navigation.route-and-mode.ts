/**
 * The production binding for site-navigation.route-and-mode: direct loads, real links, browser history,
 * the narrow site menu and the persisted color mode, in the built docs. Paint is read against the
 * build's own `/tokens.json`.
 */
import assert from 'node:assert/strict';

import type { Page } from 'playwright';

import { productionScenario } from '../../../../scripts/verification/production.ts';
import { siteNavigation } from '../fixtures/site-navigation.ts';
import { animationsSettle, assertColor, assertFits, focusSettlesInside, isFocused, siteColor } from '../support/production.ts';

const { directLoads, componentLoad, homeLink, destination, menu, menuSections, colorMode } = siteNavigation;

async function assertFlatMenu(page: Page, what: string) {
  const nav = page.getByRole('navigation', { name: menu.name });
  assert.deepEqual(await nav.getByRole('heading').allTextContents(), [...menuSections], `${what}: the menu's sections`);
  const list = nav.getByRole('heading', { name: 'Components', exact: true }).locator('xpath=following-sibling::ul[1]');
  assert.equal(await list.locator('ul').count(), 0, `${what}: Components holds no sub-lists`);
  const numbers = await list.locator('a > [aria-hidden="true"]').allTextContents();
  assert.ok(numbers.length > 0, `${what}: Components lists its entries`);
  assert.deepEqual(numbers, numbers.map((_, index) => String(index + 1).padStart(3, '0')), `${what}: the components run in catalogue-number order`);
  assert.equal(await nav.locator('[aria-expanded]').count(), 0, `${what}: nothing in the menu collapses`);
}

function heading(page: Page) {
  return page.getByRole('main').getByRole('heading', { level: 1 });
}

/** The URL and the level-one heading agree on where the reader is. */
async function arrived(page: Page, pathname: string, name: string, what: string) {
  await page.waitForURL((url) => url.pathname === pathname, { waitUntil: 'commit' });
  await page.getByRole('main').getByRole('heading', { level: 1, name, exact: true }).waitFor();
  assert.equal(await heading(page).count(), 1, `${what}: the page has one level-one heading`);
}

/** The link to `name` in `scope` is marked as the current page, and no other link there is. */
async function current(page: Page, scope: 'Site' | 'Ultima', name: string) {
  const nav = page.getByRole('navigation', { name: scope });
  assert.equal(await nav.getByRole('link', { name, exact: true }).getAttribute('aria-current'), 'page', `${name} is the current page in the ${scope} navigation`);
  assert.equal(await nav.locator('a[aria-current="page"]').count(), 1, `the ${scope} navigation marks one current page`);
  if (scope === 'Site') {
    const active = await nav.getByRole('link', { name, exact: true }).evaluate((link) => {
      const style = getComputedStyle(link);
      return { color: style.color, weight: style.fontWeight, decoration: style.textDecorationLine, thickness: style.textDecorationThickness };
    });
    assert.equal(active.weight, '600');
    assert.equal(active.decoration, 'underline');
    assert.equal(active.thickness, '2px');
    const mode = await page.evaluate(() => getComputedStyle(document.documentElement).colorScheme) as 'dark' | 'light';
    await assertColor(page, active.color, siteColor('--ult-color-accent-text', mode), 'the active header link');
  }
}

async function painted(page: Page, mode: 'dark' | 'light', what: string) {
  const header = await page.getByRole('banner').evaluate((element) => ({
    background: getComputedStyle(element).backgroundColor,
    scheme: getComputedStyle(document.documentElement).colorScheme,
  }));
  await assertColor(page, header.background, siteColor('--ult-color-surface', mode), `${what}: the header surface`);
  assert.equal(header.scheme, mode, `${what}: the document's color-scheme`);
}

export default productionScenario('site-navigation.route-and-mode', 'production', async ({ page, variant, open, reload, axe }) => {
  const narrow = variant.viewport === 'narrow';

  for (const route of directLoads) {
    await open(route.pathname);
    await arrived(page, route.pathname, route.heading, `direct load of ${route.pathname}`);
    await assertFits(page, heading(page), `${route.pathname} at ${variant.viewport} width`);
  }
  await painted(page, variant.mode, 'with no stored preference the site follows the system');
  if (!narrow) {
    await open(componentLoad.pathname);
    await arrived(page, componentLoad.pathname, componentLoad.heading, `direct load of ${componentLoad.pathname}`);
    await assertFlatMenu(page, `direct load of ${componentLoad.pathname}`);
    await current(page, 'Ultima', componentLoad.heading);
  }

  await open('/');
  await animationsSettle(page.getByRole('main'), 'the home page entrance');
  await axe('home page');
  await page.getByRole('main').getByRole('link', { name: homeLink.name, exact: true }).click();
  await arrived(page, homeLink.pathname, homeLink.heading, `following ${homeLink.name}`);

  const trigger = page.getByRole('button', { name: menu.trigger });
  const panel = page.getByRole('dialog', { name: menu.name });
  if (narrow) {
    assert.ok(!(await page.getByRole('navigation', { name: 'Site' }).isVisible()), 'the header links give way to the menu at narrow width');
    await trigger.focus();
    await page.keyboard.press('Enter');
    await panel.waitFor({ state: 'visible' });
    await focusSettlesInside(page, panel, 'opening the menu from the keyboard moves focus into it');
    await current(page, 'Ultima', homeLink.heading);
    await assertFlatMenu(page, 'the open site menu');
    await animationsSettle(panel, 'the menu finishes opening');
    await axe('open site menu');
    await page.keyboard.press('Escape');
    await panel.waitFor({ state: 'hidden' });
    assert.ok(await isFocused(trigger), 'Escape returns focus to Toggle navigation');

    await trigger.focus();
    await page.keyboard.press('Enter');
    await panel.waitFor({ state: 'visible' });
    await panel.getByRole('link', { name: destination.name, exact: true }).click();
    await arrived(page, destination.pathname, destination.heading, `the menu's ${destination.name} link`);
    await panel.waitFor({ state: 'hidden' });
  } else {
    assert.ok(!(await trigger.isVisible()), 'the menu trigger is hidden at desktop width');
    await current(page, 'Site', 'Documentation');
    await page.getByRole('navigation', { name: 'Site' }).getByRole('link', { name: destination.name, exact: true }).click();
    await arrived(page, destination.pathname, destination.heading, `the header's ${destination.name} link`);
  }

  await page.goBack();
  await arrived(page, homeLink.pathname, homeLink.heading, 'the first Back');
  await page.goBack();
  await arrived(page, '/', directLoads[0].heading, 'the second Back');
  await page.goForward();
  await arrived(page, homeLink.pathname, homeLink.heading, 'the first Forward');
  await page.goForward();
  await arrived(page, destination.pathname, destination.heading, 'the second Forward');
  if (narrow) {
    await trigger.click();
    await panel.waitFor({ state: 'visible' });
    await current(page, 'Ultima', destination.name);
    await page.keyboard.press('Escape');
    await panel.waitFor({ state: 'hidden' });
  } else {
    await current(page, 'Site', destination.name);
  }
  await assertFits(page, heading(page), `${destination.pathname} after the history walk`);

  // The visible Color mode control: the header's at desktop width, the footer's at narrow width.
  const other = variant.mode === 'dark' ? 'light' : 'dark';
  const label = other === 'dark' ? 'Dark' : 'Light';
  const control = page.getByRole('group', { name: colorMode.group }).locator('visible=true');
  assert.equal(await control.count(), 1, 'exactly one Color mode control is visible');
  assert.equal(await control.getByRole('button', { name: 'System' }).getAttribute('aria-pressed'), 'true', 'System is the stored-nothing default');
  await control.getByRole('button', { name: label, exact: true }).click();
  assert.equal(await control.getByRole('button', { name: label, exact: true }).getAttribute('aria-pressed'), 'true');
  await painted(page, other, `after pressing ${label}`);

  await reload();
  await arrived(page, destination.pathname, destination.heading, 'the reload');
  const reloaded = page.getByRole('group', { name: colorMode.group }).locator('visible=true');
  assert.equal(await reloaded.getByRole('button', { name: label, exact: true }).getAttribute('aria-pressed'), 'true', `${label} is still pressed after the reload`);
  assert.equal(await page.evaluate((key) => localStorage.getItem(key), colorMode.storageKey), other, 'the preference is the one stored key');
  await painted(page, other, `after reloading with ${label} stored`);
  await axe(`${other} mode after the reload`);
});
