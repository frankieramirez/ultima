/**
 * The production binding for blocks.preview: the /blocks index and its inert thumbnails, a card opened
 * from the keyboard, the block page's framed preview, its install command and narrow toggle, and every
 * other block's page, in the built docs.
 */
import assert from 'node:assert/strict';

import type { Frame, Locator, Page } from 'playwright';

import { productionScenario } from '../../../../scripts/verification/production.ts';
import { blocksFixture } from '../fixtures/blocks.ts';
import { assertFits, assertFocusRing, eventually, isFocused, neutralColor, siteColor } from '../support/production.ts';

const { open: opened, copyLabel, desktop, narrow } = blocksFixture;

async function framedBlock(page: Page): Promise<{ element: Locator; frame: Frame }> {
  const element = page.getByRole('main').getByRole('figure').locator('iframe');
  await element.contentFrame().getByRole('main').waitFor({ state: 'visible' });
  const frame = await (await element.elementHandle())?.contentFrame();
  assert.ok(frame, 'the preview iframe has a document');
  await frame.evaluate(() => document.fonts.ready.then(() => undefined));
  return { element, frame };
}

function frameWindow(frame: Frame) {
  return frame.evaluate(() => ({
    width: window.innerWidth,
    height: window.innerHeight,
    scroll: document.documentElement.scrollWidth,
  }));
}

/** The mode the frame's document resolves and the Neutral surface it paints, read from its root. */
function frameMode(frame: Frame) {
  return frame.evaluate(() => {
    const root = getComputedStyle(document.documentElement);
    return { scheme: root.colorScheme, surface: root.getPropertyValue('--ult-color-surface').trim() };
  });
}

export default productionScenario('blocks.preview', 'production', async ({ page, variant, open, grantClipboard, axe }) => {
  await grantClipboard();
  // Storage that refuses every write: the frame must still follow the page's mode.
  await page.addInitScript(() => {
    Storage.prototype.setItem = () => {
      throw new DOMException('storage is blocked', 'SecurityError');
    };
  });
  await open('/blocks');
  const main = page.getByRole('main');
  await main.getByRole('heading', { level: 1, name: 'Blocks', exact: true }).waitFor();

  const list = main.getByRole('list', { name: 'Blocks', exact: true });
  const cards = list.getByRole('listitem');
  const count = await cards.count();
  assert.ok(count > 0, 'the index lists blocks');
  const numbers = await cards.locator('h2 [aria-hidden]').allTextContents();
  assert.deepEqual(numbers, [...numbers].sort(), 'the cards are in number order');
  const links = list.getByRole('link');
  assert.equal(await links.count(), count, 'each card is one link');
  const pages = await links.evaluateAll((anchors) => anchors.map((anchor) => anchor.getAttribute('href') ?? ''));
  assert.ok(pages.includes(`/blocks/${opened.id}`), `${opened.title} is listed`);

  const thumbnails = await list.locator('iframe').evaluateAll((frames) =>
    (frames as HTMLIFrameElement[]).map((frame) => ({ src: frame.getAttribute('src'), inert: frame.inert, loading: frame.loading })),
  );
  assert.deepEqual(
    thumbnails,
    pages.map((href) => ({ src: `${href}/preview`, inert: true, loading: 'lazy' })),
    'every card frames its own preview route, inert and lazy',
  );
  await assertFits(page, list, `/blocks at ${variant.viewport} width`);
  await axe('the blocks index');

  await links.first().focus();
  const target = links.and(main.locator(`[href="/blocks/${opened.id}"]`));
  for (let stop = 1; stop < count && !(await isFocused(target)); stop += 1) {
    await page.keyboard.press('Tab');
    const focused = await page.evaluate(() => ({ tag: document.activeElement?.localName, href: document.activeElement?.getAttribute('href') }));
    assert.ok(focused.tag === 'a' && pages.includes(focused.href ?? ''), `Tab stop ${stop} is a card link, not ${focused.tag}`);
  }
  assert.ok(await isFocused(target), `Tab reaches the ${opened.title} card`);
  await assertFocusRing(page, target, siteColor('--ult-color-border-focus', variant.mode), `the focused ${opened.title} card link`);
  await page.keyboard.press('Enter');
  await page.waitForURL((url) => url.pathname === `/blocks/${opened.id}`, { waitUntil: 'commit' });
  await main.getByRole('heading', { level: 1, name: opened.title, exact: true }).waitFor();

  const { element, frame } = await framedBlock(page);
  const atDesktop = await frameWindow(frame);
  assert.deepEqual([atDesktop.width, atDesktop.height], [desktop.width, desktop.height], 'the frame lays out at the design size');
  const action = await frame.evaluate(() => getComputedStyle(document.documentElement).getPropertyValue('--ult-color-action').trim());
  assert.notEqual(neutralColor('--ult-color-action', variant.mode), siteColor('--ult-color-action', variant.mode), 'Neutral and site differ in action');
  assert.equal(action, neutralColor('--ult-color-action', variant.mode), "the preview document's root wears Neutral");

  // The page's Color mode control moves the frame with it, though storage takes no write.
  const other = variant.mode === 'dark' ? 'light' : 'dark';
  const control = page.getByRole('group', { name: 'Color mode' }).locator('visible=true');
  for (const [mode, label] of [[other, other === 'dark' ? 'Dark' : 'Light'], [variant.mode, variant.mode === 'dark' ? 'Dark' : 'Light']] as const) {
    await control.getByRole('button', { name: label, exact: true }).click();
    await eventually(async () => (await frameMode(frame)).scheme === mode, `the framed block following the page to ${mode}`);
    assert.equal((await frameMode(frame)).surface, neutralColor('--ult-color-surface', mode), `the framed block paints Neutral's ${mode} surface`);
  }

  const copy = main.getByRole('button', { name: copyLabel, exact: true });
  await copy.click();
  await main.getByRole('status').filter({ hasText: 'Copied' }).first().waitFor();
  assert.equal(await page.evaluate(() => navigator.clipboard.readText()), opened.install, 'the clipboard holds the install command');

  await main.getByRole('button', { name: 'Narrow', exact: true }).click();
  await eventually(async () => (await frameWindow(frame)).width === narrow.width, 'the frame narrowing to 390');
  const atNarrow = await frameWindow(frame);
  assert.equal(atNarrow.height, narrow.height, 'the narrow frame is 844 tall');
  assert.ok(atNarrow.scroll <= atNarrow.width + 1, `the block fits its ${atNarrow.width}px frame (it is ${atNarrow.scroll}px wide)`);
  await assertFits(page, element, `/blocks/${opened.id} with the narrow preview at ${variant.viewport} width`);
  await axe(`${opened.title} with the narrow preview`);

  for (const href of pages.filter((href) => href !== `/blocks/${opened.id}`)) {
    await open(href);
    const framed = await framedBlock(page);
    await assertFits(page, framed.element, `${href} at ${variant.viewport} width`);
    await axe(href);
  }

  // The runner's axe reaches the top document only, so each preview route is checked as its own page.
  for (const href of pages) {
    await open(`${href}/preview`);
    await axe(`${href}/preview`);
  }
});
