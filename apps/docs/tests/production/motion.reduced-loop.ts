/**
 * The production binding for motion.reduced-loop: under the browser's reduced-motion preference, the
 * Spinner marks on /components/spinner keep their box and run no animation. The exhaustive motion
 * assertions stay in the UI suite; this proves the shipped CSS honors the preference.
 */
import assert from 'node:assert/strict';

import { productionScenario } from '../../../../scripts/verification/production.ts';
import { assertFits } from '../support/production.ts';

export default productionScenario('motion.reduced-loop', 'production', async ({ page, variant, open, axe }) => {
  assert.equal(variant.motion, 'reduced', 'this scenario only means something under reduced motion');
  await open('/components/spinner');
  const main = page.getByRole('main');
  await main.getByRole('heading', { level: 1, name: 'Spinner', exact: true }).waitFor();
  assert.ok(await page.evaluate(() => matchMedia('(prefers-reduced-motion: reduce)').matches), 'the page sees the reduced-motion preference');

  const marks = main.getByRole('figure').locator('[data-component-preview] [aria-hidden="true"]');
  const count = await marks.count();
  assert.ok(count >= 2, `both Spinner demos render a mark (found ${count})`);
  for (let index = 0; index < count; index += 1) {
    const mark = marks.nth(index);
    await mark.waitFor({ state: 'visible' });
    const before = await mark.evaluate((element) => {
      const style = getComputedStyle(element);
      const box = element.getBoundingClientRect();
      return { name: style.animationName, iterations: style.animationIterationCount, running: element.getAnimations().length, transform: style.transform, width: box.width, height: box.height };
    });
    assert.equal(before.iterations, 'infinite', `mark ${index + 1} still declares its loop, so the stop comes from the preference`);
    assert.equal(before.name, 'none', `mark ${index + 1}'s animation-name is none under reduced motion`);
    assert.equal(before.running, 0, `mark ${index + 1} runs no animation`);
    assert.ok(before.width > 0 && before.height > 0, `mark ${index + 1} keeps its box (${before.width}×${before.height})`);
    const after = await mark.evaluate(
      (element) =>
        new Promise<string>((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve(getComputedStyle(element).transform)))),
    );
    assert.equal(after, before.transform, `mark ${index + 1} does not turn between frames`);
  }
  await assertFits(page, marks.first(), `/components/spinner at ${variant.viewport} width`);
  await axe('Spinner page under reduced motion');
});
