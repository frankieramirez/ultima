/**
 * The production binding for site-landing.without-field, per Landing motion's Proof paragraph in
 * docs/spec/ultima.md. The scenario record declares WebGL removed, and the runner removes it from the
 * context before load; the landing then has no field and no fallback, and the hero stands on its own.
 */
import assert from 'node:assert/strict';

import { productionScenario } from '../../../../scripts/verification/production.ts';
import { assertFits } from '../support/production.ts';

export default productionScenario('site-landing.without-field', 'production', async ({ page, variant, open, axe }) => {
  await open('/');
  assert.equal(await page.evaluate(() => document.createElement('canvas').getContext('webgl')), null, 'the page has no WebGL');

  const hero = page.locator('[data-hero]');
  await page.waitForFunction(() => document.querySelector('[data-hero] [data-field]')?.getAttribute('data-field') === 'off');
  assert.equal(await hero.locator('canvas').count(), 0, 'the hero holds no canvas and no fallback');

  const heading = page.getByRole('heading', { level: 1, name: 'A system for building interfaces.' });
  await heading.waitFor();
  await hero.getByText('accessible React components', { exact: false }).waitFor();
  await hero.locator('pre').filter({ hasText: 'npx shadcn add' }).waitFor();
  await hero.getByRole('button', { name: 'Copy the Vite install commands' }).waitFor();
  await assertFits(page, heading, `/ at ${variant.viewport} width without the field`);
  await axe('landing without the field');
});
