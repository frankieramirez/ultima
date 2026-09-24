/**
 * The production binding for dialog.keyboard-dismissal. Authored for the production pilot and not yet
 * executed: the runner that serves the built docs and calls it once per declared case lands later.
 */
import assert from 'node:assert/strict';

import { productionScenario } from '../../../../scripts/verification/production.ts';

export default productionScenario('dialog.keyboard-dismissal', 'production', async ({ page, open }) => {
  await open('/components/dialog');
  const trigger = page.getByRole('button', { name: 'Open dialog', exact: true }).first();
  const dialog = page.getByRole('dialog', { name: 'Archive report' });
  const focusInside = () => dialog.evaluate((element) => element.contains(document.activeElement));

  assert.equal(await dialog.count(), 0, 'the dialog starts closed');
  await trigger.focus();
  await page.keyboard.press('Enter');
  await dialog.waitFor({ state: 'visible' });
  assert.ok(await focusInside(), 'opening moves focus inside the dialog');

  const tabbable = await dialog.locator('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])').count();
  for (let press = 0; press <= tabbable; press += 1) {
    await page.keyboard.press('Tab');
    assert.ok(await focusInside(), `Tab ${press + 1} keeps focus inside the dialog`);
  }
  for (let press = 0; press <= tabbable; press += 1) {
    await page.keyboard.press('Shift+Tab');
    assert.ok(await focusInside(), `Shift+Tab ${press + 1} keeps focus inside the dialog`);
  }

  await page.keyboard.press('Escape');
  await dialog.waitFor({ state: 'detached' });
  assert.ok(await trigger.evaluate((element) => element === document.activeElement), 'Escape returns focus to the trigger');
});
