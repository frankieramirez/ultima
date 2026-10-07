/**
 * The production binding for site-landing.dot-field, per Landing motion's Proof paragraph in
 * docs/spec/ultima.md: the hero shows before the field, the canvas is decorative and fits the hero, and
 * the field runs, paints and settles, or holds one still frame under reduced motion. The cell runs on
 * the software WebGL the runner enables at launch; a cell that finds no WebGL fails.
 */
import assert from 'node:assert/strict';
import { gzipSync } from 'node:zlib';

import type { Page } from 'playwright';

import { productionScenario } from '../../../../scripts/verification/production.ts';
import { LIMITS } from '../../scripts/production-runner.ts';
import { FIT_TOLERANCE_PX, assertFits, shippedColor } from '../support/production.ts';

/** The drift Landing motion sets: five seconds from the first frame. */
const DRIFT_MS = 5_000;
/** Landing motion's budget for the field's chunk, shader included. */
const CHUNK_GZIP_BYTES = 6 * 1024;
const CHUNK = /\/assets\/dot-field-[\w-]+\.js$/;

type Watch = { states: string[]; leftLoading: { at: number; heading: boolean; commands: boolean } | null; lcp: string | null };

function pixelsOtherThan(page: Page, png: Buffer, ground: string, fromRow: number): Promise<number> {
  return page.evaluate(
    async ([data, color, first]) => {
      const bitmap = await createImageBitmap(await (await fetch(`data:image/png;base64,${data}`)).blob());
      const context = new OffscreenCanvas(bitmap.width, bitmap.height).getContext('2d');
      if (!context) throw new Error('no 2d context to read the capture');
      context.fillStyle = color;
      context.fillRect(0, 0, 1, 1);
      const [r, g, b] = context.getImageData(0, 0, 1, 1).data;
      context.drawImage(bitmap, 0, 0);
      const pixels = context.getImageData(0, 0, bitmap.width, bitmap.height).data;
      let count = 0;
      for (let index = Math.max(0, Math.floor(first)) * bitmap.width * 4; index < pixels.length; index += 4) {
        if (pixels[index] !== r || pixels[index + 1] !== g || pixels[index + 2] !== b) count += 1;
      }
      return count;
    },
    [png.toString('base64'), ground, fromRow] as const,
  );
}

export default productionScenario('site-landing.dot-field', 'production', async ({ page, variant, open, axe }) => {
  await page.addInitScript(() => {
    const watch: Watch = { states: [], leftLoading: null, lcp: null };
    (window as unknown as { __field: Watch }).__field = watch;
    const shown = (element: Element | null | undefined) => {
      const box = element?.getBoundingClientRect();
      return Boolean(element && box && box.width > 0 && box.height > 0 && getComputedStyle(element).visibility === 'visible');
    };
    new MutationObserver(() => {
      const state = document.querySelector('[data-hero] [data-field]')?.getAttribute('data-field');
      if (!state || watch.states.at(-1) === state) return;
      watch.states.push(state);
      if (state !== 'loading' && !watch.leftLoading) {
        const hero = document.querySelector('[data-hero]');
        watch.leftLoading = {
          at: performance.now(),
          heading: shown(document.getElementById('hero-heading')),
          commands: shown(hero?.querySelector('pre')) && shown(hero?.querySelector('button')),
        };
      }
    }).observe(document, { subtree: true, childList: true, attributes: true, attributeFilter: ['data-field'] });
    new PerformanceObserver((list) => {
      for (const entry of list.getEntries() as (PerformanceEntry & { element: Element | null })[]) {
        watch.lcp = entry.element ? (entry.element.closest('#hero-heading') ? 'hero-heading' : entry.element.localName) : null;
      }
    }).observe({ type: 'largest-contentful-paint', buffered: true });
  });

  const requested: string[] = [];
  page.on('request', (request) => requested.push(new URL(request.url()).pathname));
  await open('/install');
  await page.evaluate(() => new Promise((resolve) => requestIdleCallback(() => requestAnimationFrame(resolve))));
  assert.deepEqual(requested.filter((path) => CHUNK.test(path)), [], 'another route never requests the field chunk');

  await open('/');
  const webgl = await page.evaluate(() => document.createElement('canvas').getContext('webgl') !== null);
  assert.ok(webgl, 'this cell needs WebGL from the software renderer the runner enables at launch, and does not pass through the fallback');

  const hero = page.locator('[data-hero]');
  const field = hero.locator('[data-field]');
  const heading = page.getByRole('heading', { level: 1, name: 'A system for building interfaces.' });
  await heading.waitFor();
  await hero.getByRole('button', { name: 'Copy the Vite install commands' }).waitFor();

  const expected = variant.motion === 'reduced' ? 'still' : 'settled';
  await page.waitForFunction((state) => document.querySelector('[data-hero] [data-field]')?.getAttribute('data-field') === state, expected, {
    timeout: DRIFT_MS + LIMITS.conditionMs,
  });
  const watch = await page.evaluate(() => (window as unknown as { __field: Watch }).__field);
  assert.deepEqual(watch.states, variant.motion === 'reduced' ? ['loading', 'still'] : ['loading', 'running', 'settled'], 'the field moves through its states in order');
  assert.ok(watch.leftLoading?.heading, 'the hero heading was visible while the field was still loading');
  assert.ok(watch.leftLoading?.commands, 'the install commands were visible while the field was still loading');
  const fcp = await page.evaluate(() => performance.getEntriesByName('first-contentful-paint')[0]?.startTime ?? null);
  assert.ok(fcp !== null && watch.leftLoading && fcp < watch.leftLoading.at, `the hero painted (${fcp}ms) before the field drew (${watch.leftLoading?.at}ms)`);
  assert.equal(watch.lcp, 'hero-heading', 'the largest contentful paint is the hero heading, never the canvas');

  const chunks = [...new Set(requested.filter((path) => CHUNK.test(path)))];
  assert.equal(chunks.length, 1, `the landing loads the field as one chunk of its own (${chunks.join(', ') || 'none'})`);
  const chunk = await page.context().request.get(new URL(chunks[0]!, page.url()).href);
  const gzipped = gzipSync(await chunk.body()).length;
  assert.ok(gzipped < CHUNK_GZIP_BYTES, `the field chunk is ${gzipped} bytes gzipped, under ${CHUNK_GZIP_BYTES}`);

  const canvas = field.locator('canvas');
  const read = await canvas.evaluate((element: HTMLCanvasElement) => {
    const style = getComputedStyle(element);
    const box = element.getBoundingClientRect();
    const hero = element.closest('[data-hero]')?.getBoundingClientRect();
    return {
      hidden: element.getAttribute('aria-hidden'),
      wrapperHidden: element.parentElement?.getAttribute('aria-hidden'),
      tabindex: element.getAttribute('tabindex'),
      tabIndex: element.tabIndex,
      pointerEvents: style.pointerEvents,
      rendering: style.imageRendering,
      opacity: style.opacity,
      box: { x: box.x, y: box.y, width: box.width, height: box.height },
      hero: hero ? { x: hero.x, y: hero.y, width: hero.width, height: hero.height } : null,
      pixels: { width: element.width, height: element.height },
    };
  });
  assert.equal(read.hidden, 'true', 'the canvas is aria-hidden');
  assert.equal(read.wrapperHidden, 'true', 'its wrapper is aria-hidden');
  assert.ok(read.tabindex === null && read.tabIndex < 0, 'the canvas is out of the tab order');
  assert.equal(read.pointerEvents, 'none', 'the canvas takes no pointer events');
  assert.equal(read.rendering, 'pixelated', 'the canvas upscales with image-rendering: pixelated');
  assert.equal(read.opacity, '1', 'the field has faded in');
  assert.ok(read.hero, 'the canvas sits inside the hero');
  for (const side of ['x', 'y', 'width', 'height'] as const) {
    assert.ok(Math.abs(read.box[side] - read.hero[side]) <= FIT_TOLERANCE_PX, `the canvas ${side} (${read.box[side]}) matches the hero's (${read.hero[side]})`);
  }
  assert.equal(read.pixels.width, Math.round(read.box.width), 'the canvas renders at CSS-pixel width');
  assert.equal(read.pixels.height, Math.round(read.box.height), 'the canvas renders at CSS-pixel height');
  await assertFits(page, heading, `/ at ${variant.viewport} width with the field`);

  const ground = await shippedColor(page, '--ult-color-surface', variant.mode);
  const padding = await hero.evaluate((element) => Number.parseFloat(getComputedStyle(element).paddingBlockEnd));
  const first = await hero.screenshot();
  const painted = await pixelsOtherThan(page, first, ground, read.box.height - padding);
  assert.ok(padding > 0 && painted > 0, `the field paints pixels other than the surface (${painted} in the hero's ${padding}px bottom padding)`);

  if (variant.motion === 'reduced') {
    await page.evaluate(() => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve))));
    assert.ok(first.equals(await hero.screenshot()), 'two captures of the hero a frame apart are identical under reduced motion');
  }

  await axe(`landing with the field ${expected}`);
});
