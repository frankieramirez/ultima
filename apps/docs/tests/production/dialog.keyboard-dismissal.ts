/**
 * The production binding for dialog.keyboard-dismissal: the basic Dialog demo on `/components/dialog`,
 * opened and dismissed from the keyboard in the built docs. Paint is read against the build's own
 * `/tokens.json`, so a production-only stylesheet or ordering defect fails here even when every
 * development test passes.
 */
import assert from 'node:assert/strict';

import { productionScenario } from '../../../../scripts/verification/production.ts';
import { assertColor, assertFits, focusSettlesInside, neutralColor, settles } from '../support/production.ts';

export default productionScenario('dialog.keyboard-dismissal', 'production', async ({ page, variant, open, axe }) => {
  await open('/components/dialog');
  const trigger = page.getByRole('button', { name: 'Open dialog', exact: true });
  const dialog = page.getByRole('dialog', { name: 'Archive report' });

  assert.equal(await trigger.count(), 1, 'the page has one basic demo trigger');
  assert.equal(await dialog.count(), 0, 'the dialog starts closed');
  await assertFits(page, trigger, `/components/dialog at ${variant.viewport} width`);
  await axe('page with the dialog closed');

  await trigger.focus();
  await page.keyboard.press('Enter');
  await dialog.waitFor({ state: 'visible' });
  await focusSettlesInside(page, dialog, 'opening moves focus inside the dialog');

  // The popup paints the raised surface over a fixed backdrop, inside the viewport, in this mode's colors.
  // The backdrop is aria-hidden, so it has no accessible name: it is the open sibling just before the viewport.
  const backdrop = dialog.locator('xpath=../preceding-sibling::div[@data-open][1]');
  const parts = await dialog.evaluate((popup) => {
    const style = getComputedStyle(popup);
    const viewport = popup.parentElement as HTMLElement;
    const box = popup.getBoundingClientRect();
    return {
      background: style.backgroundColor,
      overflow: style.overflowY,
      viewportPosition: getComputedStyle(viewport).position,
      inside: box.left >= 0 && box.top >= 0 && box.right <= window.innerWidth && box.bottom <= window.innerHeight,
      width: box.width,
    };
  });
  await assertColor(page, parts.background, neutralColor('--ult-color-surface-raised', variant.mode), 'the popup background');
  assert.equal(parts.viewportPosition, 'fixed', 'the dialog viewport is fixed to the window');
  assert.equal(parts.overflow, 'auto', 'the popup scrolls its own overflow');
  assert.ok(parts.inside && parts.width > 0, 'the popup lies inside the window');
  await settles(backdrop, 'opacity', '1', 'the backdrop finishes fading in');
  const backdropStyle = await backdrop.evaluate((element) => ({ position: getComputedStyle(element).position, background: getComputedStyle(element).backgroundColor }));
  assert.equal(backdropStyle.position, 'fixed', 'the backdrop covers the window');
  await assertColor(page, backdropStyle.background, neutralColor('--ult-color-surface-overlay', variant.mode), 'the backdrop');
  await axe('open dialog');

  const tabbable = await dialog.locator('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])').count();
  for (let press = 0; press <= tabbable; press += 1) {
    await page.keyboard.press('Tab');
    await focusSettlesInside(page, dialog, `Tab ${press + 1} keeps focus inside the dialog`);
  }
  for (let press = 0; press <= tabbable; press += 1) {
    await page.keyboard.press('Shift+Tab');
    await focusSettlesInside(page, dialog, `Shift+Tab ${press + 1} keeps focus inside the dialog`);
  }

  // Keyboard focus on the Close button shows the focus ring in this mode's focus color.
  const close = dialog.getByRole('button', { name: 'Close' });
  await close.focus();
  await page.keyboard.press('Shift+Tab');
  await page.keyboard.press('Tab');
  await focusSettlesInside(page, close, 'focus returns to Close');
  const ring = await close.evaluate((element) => ({ style: getComputedStyle(element).outlineStyle, width: getComputedStyle(element).outlineWidth, color: getComputedStyle(element).outlineColor }));
  assert.equal(ring.style, 'solid', 'the focused Close button draws a solid ring');
  assert.ok(Number.parseFloat(ring.width) > 0, 'the focus ring has width');
  await assertColor(page, ring.color, neutralColor('--ult-color-border-focus', variant.mode), 'the focus ring');

  await page.keyboard.press('Escape');
  await dialog.waitFor({ state: 'detached' });
  assert.ok(await trigger.evaluate((element) => element === document.activeElement), 'Escape returns focus to the trigger');
});
