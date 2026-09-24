/**
 * Small read-only helpers the production bindings share. They read the page and the build's own
 * `/tokens.json`; they never change the app, inject styles or copy palette values into a test.
 */
import { AssertionError } from 'node:assert';

import type { Locator, Page } from 'playwright';

/** A semantic color token's value for one mode, as the served build publishes it in `/tokens.json`. */
export async function shippedColor(page: Page, token: string, mode: 'dark' | 'light'): Promise<string> {
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
