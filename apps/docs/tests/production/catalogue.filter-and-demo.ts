/**
 * The production binding for catalogue.filter-and-demo: the /components filter, its empty state and
 * clear, a result opened from the keyboard, and the Button page's live demo and copy control, in the
 * built docs. The copied text is compared with the demo's own source file as well as the displayed code.
 */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import type { Page } from 'playwright';

import { productionScenario } from '../../../../scripts/verification/production.ts';
import { catalogue } from '../fixtures/catalogue.ts';
import { assertFits, assertFocusRing, isFocused, neutralLength, shippedLength, siteColor } from '../support/production.ts';

const { groups, broadQuery, broadMatch, broadGroups, emptyQuery, emptyHeading, openQuery, open: result, demo, copyLabel } = catalogue;

async function sections(page: Page) {
  return page.getByRole('main').locator('section').evaluateAll((elements) =>
    elements.map((section) => {
      const heading = section.querySelector('h2');
      const parts = Array.from(heading?.childNodes ?? [], (node) => (node as Element).getAttribute?.('aria-hidden') ? '' : node.textContent?.trim() ?? '').filter(Boolean);
      return { label: parts[0] ?? '', count: Number(parts[1]), entries: section.querySelectorAll('li a[href^="/components/"]').length };
    }),
  );
}

async function assertSections(page: Page, labels: readonly string[], what: string) {
  const shown = await sections(page);
  assert.deepEqual(shown.map(({ label }) => label), labels, `${what}: the group sections shown`);
  for (const { label, count, entries } of shown) {
    assert.ok(entries > 0 && count === entries, `${what}: ${label} lists ${entries} entries under a count of ${count}`);
  }
}

/** The catalogue's count, read from its status line: "54 components". */
async function count(page: Page): Promise<number> {
  const status = page.getByRole('main').getByRole('status');
  const text = (await status.textContent())?.trim() ?? '';
  const match = /^(\d+) components? · A–Z$/.exec(text);
  assert.ok(match, `the status reads "${text}", not a component count`);
  return Number(match[1]);
}

async function counted(page: Page, expected: (n: number) => boolean, what: string): Promise<number> {
  await page.waitForFunction(
    () => /^\d+ components? · A–Z$/.test(document.querySelector('main [role="status"]')?.textContent?.trim() ?? ''),
  );
  const n = await count(page);
  assert.ok(expected(n), `${what}: the status counts ${n}`);
  return n;
}

async function type(page: Page, query: string) {
  const filter = page.getByRole('searchbox', { name: 'Filter components' });
  await filter.clear();
  await filter.pressSequentially(query);
}

export default productionScenario('catalogue.filter-and-demo', 'production', async ({ page, variant, open, grantClipboard, axe }) => {
  await grantClipboard();
  await open('/components');
  const main = page.getByRole('main');
  const filter = page.getByRole('searchbox', { name: 'Filter components' });
  // The entries are the list links into a component page; the breadcrumb and the on-this-page rail also hold lists of links.
  const entries = main.getByRole('listitem').getByRole('link').and(main.locator('a[href^="/components/"]'));
  const whole = await counted(page, (n) => n > 1, 'the whole catalogue');
  assert.equal(await entries.count(), whole, 'every component appears once across the group sections');
  await assertSections(page, groups, 'the whole catalogue');
  assert.equal(await main.getByRole('button', { name: /Next components|Previous components/ }).count(), 0, 'the directory has no pagination');
  assert.equal(await main.getByRole('button', { name: 'Clear filters' }).count(), 0, 'no filters need clearing initially');
  await assertFits(page, filter, `/components at ${variant.viewport} width`);
  await axe('whole catalogue');

  await type(page, broadQuery);
  const narrowed = await counted(page, (n) => n > 0 && n < whole, `filtering by "${broadQuery}"`);
  assert.equal(await entries.count(), narrowed, 'the list shows exactly the counted matches');
  assert.equal(await entries.getByText(broadMatch, { exact: true }).count(), 1, `${broadMatch} is listed`);
  await assertSections(page, broadGroups, `filtering by "${broadQuery}" hides every group without a match`);
  for (const name of await entries.allTextContents()) assert.match(name, new RegExp(broadQuery, 'i'), `"${name}" matches the query`);

  await type(page, emptyQuery);
  await counted(page, (n) => n === 0, 'a query that matches nothing');
  await assertSections(page, [], 'a query that matches nothing');
  await main.getByRole('heading', { name: emptyHeading }).waitFor();
  assert.equal(await entries.count(), 0, 'the empty state lists nothing');
  await axe('empty results');
  // The filter bar's Clear filters comes first; the empty state's own is the last.
  await main.getByRole('button', { name: 'Clear filters' }).last().click();
  await counted(page, (n) => n === whole, 'clearing the filters');
  await assertSections(page, groups, 'clearing the filters');
  assert.equal(await filter.inputValue(), '', 'the query is cleared');
  assert.ok(await isFocused(filter), 'clearing returns focus to the filter');
  assert.equal(await main.getByRole('heading', { name: emptyHeading }).count(), 0, 'the empty state is gone');

  // Open a result from the keyboard: Tab out of the filter until the entry has focus, then Enter.
  await type(page, openQuery);
  await counted(page, (n) => n > 0 && n < whole, `filtering by "${openQuery}"`);
  // Named by its destination: "Button" also begins "Button Group".
  const entry = entries.and(main.locator(`[href="${result.pathname}"]`));
  assert.equal(await entry.count(), 1, `${result.name} is listed once`);
  for (let press = 0; press < 12 && !(await isFocused(entry)); press += 1) await page.keyboard.press('Tab');
  assert.ok(await isFocused(entry), `Tab reaches the ${result.name} entry`);
  await assertFocusRing(page, entry, siteColor('--ult-color-border-focus', variant.mode), `the focused ${result.name} entry`);
  await page.keyboard.press('Enter');
  await page.waitForURL((url) => url.pathname === result.pathname, { waitUntil: 'commit' });
  await main.getByRole('heading', { level: 1, name: result.name, exact: true }).waitFor();

  // The first demo figure: its live preview, its displayed source and its copy control.
  const figure = main.getByRole('figure').first();
  assert.ok(await figure.getByRole('button', { name: demo.control, exact: true }).isVisible(), `the live demo renders its ${demo.control} button`);
  await figure.getByRole('tab', { name: 'Code', exact: true }).click();
  const displayed = await figure.locator('pre').first().textContent();
  const source = readFileSync(new URL(`../../${demo.source}`, import.meta.url), 'utf8');
  assert.equal(displayed, source, `the figure displays ${demo.source} as written`);
  const copy = figure.getByRole('button', { name: copyLabel });
  const square = (await shippedLength(page, '--ult-space-8', variant.mode)) + (await shippedLength(page, '--ult-space-2', variant.mode));
  const box = await copy.boundingBox();
  assert.ok(box && Math.abs(box.width - square) <= 0.5 && Math.abs(box.height - square) <= 0.5, `${copyLabel} is a ${square}px square (it is ${box ? `${box.width}×${box.height}` : 'not rendered'})`);
  await assertFits(page, figure, `${result.pathname} at ${variant.viewport} width`);
  await axe('component page');

  await copy.click();
  await figure.getByRole('status').filter({ hasText: 'Copied' }).waitFor();
  assert.equal(await page.evaluate(() => navigator.clipboard.readText()), displayed, 'the clipboard holds exactly the displayed source');
  assert.ok(await copy.isVisible(), 'the copy control keeps its place after copying');
  await figure.getByRole('tab', { name: 'Preview', exact: true }).click();
  const liveButton = figure.getByRole('button', { name: demo.control, exact: true });
  await liveButton.waitFor({ state: 'visible' });
  const previewRadius = await liveButton.evaluate((element) => parseFloat(getComputedStyle(element).borderTopLeftRadius));
  assert.equal(previewRadius, neutralLength('--ult-radius-md', variant.mode), "the live demo wears Neutral's Tight radius");
});
