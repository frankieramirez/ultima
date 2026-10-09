import assert from 'node:assert/strict';
import { after, before, test } from 'node:test';
import { chromium, type Browser } from 'playwright';

import { externalAxe } from '../consumer-external.ts';

let browser: Browser;
before(async () => { browser = await chromium.launch({ headless: true }); });
after(async () => { await browser?.close(); });

/** The page's `region` findings, as the selectors axe reports. */
async function region(body: string): Promise<string[]> {
  const page = await browser.newPage();
  try {
    await page.setContent(`<!doctype html><html lang="en"><head><title>Region</title></head><body>${body}</body></html>`);
    const result = await externalAxe(page);
    const rows = result.violations.filter(({ id }) => id === 'region').flatMap(({ nodes }) => nodes.map(({ target }) => String(target[0])));
    assert.equal(await page.locator('[data-ultima-owned-popup]').count(), 0, 'the ownership marker is removed after the run');
    return rows;
  } finally {
    await page.close();
  }
}

const screen = (expanded: boolean, link = 'aria-controls') =>
  `<main><h1>Pantry</h1><button role="combobox" aria-expanded="${expanded}" ${link}="category">Canned goods</button></main>`;
const listbox = '<div data-base-ui-portal><div role="presentation"><div role="listbox" id="category" aria-label="Category"><div role="option" aria-selected="true">Canned goods</div><div role="option" aria-selected="false">Produce</div></div></div></div>';

test('a listbox popup owned by its expanded control is exempt from region, as axe exempts a dialog', async () => {
  assert.deepEqual(await region(screen(true) + listbox), []);
  assert.deepEqual(await region(screen(true, 'aria-owns') + listbox.replace('role="listbox"', 'role="menu"').replaceAll('role="option"', 'role="menuitem"')), []);
});

test('an orphaned element outside every landmark still fails region beside an owned popup', async () => {
  assert.deepEqual(await region(`${screen(true)}${listbox}<div id="orphan"><p>Delivered today</p></div>`), ['#orphan']);
});

test('a listbox no expanded control owns still fails region', async () => {
  assert.notDeepEqual(await region(screen(false) + listbox), []);
  assert.notDeepEqual(await region(`<main><h1>Pantry</h1></main>${listbox}`), []);
});
