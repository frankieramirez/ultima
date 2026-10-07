/**
 * Small read-only helpers the production bindings share. They read the page, the build's own
 * `/tokens.json` and the drafts the docs' `site` and Neutral themes are generated from; they never
 * change the app, inject styles or copy palette values into a test.
 */
import assert, { AssertionError } from 'node:assert/strict';

import type { Locator, Page } from 'playwright';

import { resolveDraft } from '../../../../packages/tokens/src/theme/draft.ts';
import { LIMITS } from '../../scripts/production-runner.ts';
import { neutralDraft, siteDraft } from '../../src/site-theme-draft.ts';

const SITE = resolveDraft(siteDraft());
const NEUTRAL = resolveDraft(neutralDraft());

/** A color in the docs chrome's `site` theme, resolved by the recipe the build's themes are generated from. */
export function siteColor(token: string, mode: 'dark' | 'light'): string {
  return resolved(SITE, token, mode, 'site');
}

/** A color, or any other token, inside a demo's Neutral boundary, resolved the same way. */
export function neutralColor(token: string, mode: 'dark' | 'light'): string {
  return resolved(NEUTRAL, token, mode, 'Neutral');
}

/** A `px` length inside a demo's Neutral boundary, such as a radius step. */
export function neutralLength(token: string, mode: 'dark' | 'light'): number {
  const value = resolved(NEUTRAL, token, mode, 'Neutral');
  const match = /^(-?\d*\.?\d+)px$/.exec(value);
  if (!match) throw new AssertionError({ message: `${token} is ${value} in Neutral, not a px length` });
  return Number(match[1]);
}

function resolved(tables: typeof SITE, token: string, mode: 'dark' | 'light', theme: string): string {
  const value = tables[mode][token];
  if (value === undefined) throw new AssertionError({ message: `the ${theme} theme has no ${mode} value for ${token}` });
  return value;
}

/** A semantic color token's value for one mode, as the served build publishes it in `/tokens.json`. */
export function shippedColor(page: Page, token: string, mode: 'dark' | 'light'): Promise<string> {
  return shippedValue(page, token, mode);
}

/** A length token in CSS pixels, resolved from the served `/tokens.json` against the document's root font size. */
export async function shippedLength(page: Page, token: string, mode: 'dark' | 'light'): Promise<number> {
  const value = await shippedValue(page, token, mode);
  const match = /^(-?\d*\.?\d+)(rem|px)$/.exec(value);
  if (!match) throw new AssertionError({ message: `${token} is ${value}, not a rem or px length` });
  const root = await page.evaluate(() => Number.parseFloat(getComputedStyle(document.documentElement).fontSize));
  return Number(match[1]) * (match[2] === 'rem' ? root : 1);
}

/** Any token's value for one mode, as the served build publishes it in `/tokens.json`. */
export async function shippedValue(page: Page, token: string, mode: 'dark' | 'light'): Promise<string> {
  const value = await page.evaluate(
    async ([name, scheme]) => {
      const response = await fetch('/tokens.json');
      const tokens = (await response.json()) as { tokens: Record<string, Record<string, { value: string } | string>> };
      const entry = tokens.tokens[name]?.[scheme];
      return typeof entry === 'object' && entry !== null ? entry.value : null;
    },
    [token, mode] as const,
  );
  if (value === null) throw new AssertionError({ message: `the served /tokens.json has no ${mode} value for ${token}` });
  return value;
}

/** Whether two CSS colors paint the same, compared after the browser normalizes both. */
export function sameColor(page: Page, a: string, b: string): Promise<boolean> {
  return page.evaluate(
    ([first, second]) => {
      const normalize = (color: string) => {
        const context = document.createElement('canvas').getContext('2d');
        if (!context) return color;
        context.fillStyle = '#010203';
        context.fillStyle = color;
        return context.fillStyle;
      };
      return normalize(first) === normalize(second);
    },
    [a, b] as const,
  );
}

export async function assertColor(page: Page, actual: string, expected: string, what: string) {
  if (!(await sameColor(page, actual, expected))) throw new AssertionError({ message: `${what} is ${actual}, not ${expected}`, actual, expected });
}

/** Waits, within the page's condition limit, for focus to rest inside `scope`: a focus guard may hold it for a frame. */
export async function focusSettlesInside(page: Page, scope: Locator, what: string) {
  const handle = await scope.elementHandle();
  try {
    await page.waitForFunction((element) => element?.contains(document.activeElement) ?? false, handle);
  } catch {
    const at = await page.evaluate(() => {
      const active = document.activeElement;
      return active ? `${active.tagName.toLowerCase()}${active.id ? `#${active.id}` : ''} "${(active.textContent ?? '').trim().slice(0, 40)}"` : 'nothing';
    });
    throw new AssertionError({ message: `${what}: focus rests on ${at}, outside the scope` });
  } finally {
    await handle?.dispose();
  }
}

/** Waits until a computed property on `target` reads `expected`, for transitions to finish. */
export async function settles(target: Locator, property: string, expected: string, what: string) {
  try {
    await target.page().waitForFunction(
      ([element, name, value]) => element !== null && getComputedStyle(element as Element).getPropertyValue(name) === value,
      [await target.elementHandle(), property, expected] as const,
    );
  } catch {
    const actual = await target.evaluate((element, name) => getComputedStyle(element).getPropertyValue(name), property).catch(() => 'unreadable');
    throw new AssertionError({ message: `${what}: ${property} is ${actual}, not ${expected}` });
  }
}

/** The documented rounding tolerance for route-level horizontal fit, in CSS pixels. */
export const FIT_TOLERANCE_PX = 1;

/**
 * Route-level horizontal fit: the document is no wider than the window, within one CSS pixel. An
 * intentional scroll container may overflow inside itself, but it cannot widen the page. `target` must
 * be visible first, so an absent control or an empty page cannot pass on its geometry.
 */
export async function assertFits(page: Page, target: Locator, what: string) {
  await target.waitFor({ state: 'visible' });
  const { scroll, client } = await page.evaluate(() => ({ scroll: document.documentElement.scrollWidth, client: document.documentElement.clientWidth }));
  if (scroll > client + FIT_TOLERANCE_PX) {
    const widest = await page.evaluate((width) => {
      // The outermost element past the edge: its descendants overflow because it does.
      const over = [...document.querySelectorAll('body *')].find((element) => element.getBoundingClientRect().right > width + 1);
      return over ? `${over.localName}${over.getAttribute('part') ? `[part=${over.getAttribute('part')}]` : ''} ends at ${Math.round(over.getBoundingClientRect().right)}px` : 'no element reports it';
    }, client);
    throw new AssertionError({ message: `${what}: the document is ${scroll}px wide in a ${client}px window (${widest})` });
  }
}

/** Whether `element` is the focused element, read from the page rather than assumed from an action. */
export function isFocused(target: Locator): Promise<boolean> {
  return target.evaluate((element) => element === document.activeElement);
}

/**
 * Waits for every finite animation and transition on `target` and its descendants to finish, so a check
 * reads the end state rather than a frame of an entrance. An entrance first renders a starting style and
 * only starts its transition a frame later, so the wait also needs Base UI's `data-starting-style` and
 * `data-ending-style` markers gone and two frames to pass. A looping animation never finishes and is not
 * waited on; the reduced-motion scenario asserts those directly.
 */
export async function animationsSettle(target: Locator, what: string) {
  const until = performance.now() + LIMITS.conditionMs;
  let left: string[] = [];
  do {
    left = await target.evaluate(
      (element) =>
        new Promise<string[]>((resolve) =>
          requestAnimationFrame(() =>
            requestAnimationFrame(() => {
              const markers = [element, ...element.querySelectorAll('[data-starting-style], [data-ending-style]')]
                .filter((node) => node.hasAttribute('data-starting-style') || node.hasAttribute('data-ending-style'))
                .map((node) => `${node.localName} in a starting or ending style`);
              const running = element
                .getAnimations({ subtree: true })
                .filter((animation) => animation.playState === 'running' && animation.effect?.getComputedTiming().iterations !== Infinity)
                .map((animation) => (animation instanceof CSSTransition ? animation.transitionProperty : animation instanceof CSSAnimation ? animation.animationName : 'animation'));
              resolve([...markers, ...running]);
            }),
          ),
        ),
    );
    if (left.length === 0) return;
  } while (performance.now() < until);
  throw new AssertionError({ message: `${what}: still animating ${left.join(', ')} after ${LIMITS.conditionMs}ms` });
}

/** The keyboard focus ring on `target`: a solid outline with width, in `ring`, the surrounding theme's `--ult-color-border-focus`. */
export async function assertFocusRing(page: Page, target: Locator, ring: string, what: string) {
  const outline = await target.evaluate((element) => {
    const style = getComputedStyle(element);
    return { focusVisible: element.matches(':focus-visible'), style: style.outlineStyle, width: style.outlineWidth, color: style.outlineColor };
  });
  assert.ok(outline.focusVisible, `${what} matches :focus-visible`);
  assert.equal(outline.style, 'solid', `${what} draws a solid ring`);
  assert.ok(Number.parseFloat(outline.width) > 0, `${what}'s ring has width`);
  await assertColor(page, outline.color, ring, `${what}'s ring`);
}

/** Polls `check` until it holds, within the runner's per-condition limit; for state a component updates a frame later. */
export async function eventually(check: () => Promise<boolean>, what: string) {
  const until = performance.now() + LIMITS.conditionMs;
  do {
    if (await check()) return;
    await new Promise((resolve) => setTimeout(resolve, 50));
  } while (performance.now() < until);
  throw new AssertionError({ message: `${what} did not hold within ${LIMITS.conditionMs}ms` });
}
