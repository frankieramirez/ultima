import * as stylex from '@stylexjs/stylex';
import { colorScheme } from '@ultima/tokens';
import { space } from '@ultima/tokens/tokens.stylex';
import { Card } from '@ultima/ui';
import axe from 'axe-core';
import type { ComponentType } from 'react';
import { beforeAll, expect, onTestFinished, test } from 'vitest';
import { page } from 'vitest/browser';
import { render } from 'vitest-browser-react';

import { ThemeBoundary } from '../theme-boundary';
import { siteTheme } from '../theme';

const demos = import.meta.glob<{ default: ComponentType }>('../demos/**/*.tsx', { eager: true });

/**
 * An overlay's `anatomy.tsx` holds its popup open, and mounted here, outside the Anatomy tab's inert
 * stage, two `aria-hidden` focusables of Base UI's own appear: the focus guards around an open menu,
 * and a toast's Close until its stack is hovered or focused. Only those nodes leave the
 * `aria-hidden-focus` rule, and only for these modules.
 */
const BASE_UI_HIDDEN_FOCUSABLE = '[data-base-ui-focus-guard], [data-anatomy-item="toast"][data-anatomy-part="Close"]';

function withoutBaseUiHiddenFocusables(violations: axe.Result[]): axe.Result[] {
  return violations
    .map((violation) =>
      violation.id === 'aria-hidden-focus'
        ? {
            ...violation,
            nodes: violation.nodes.filter((node) => !document.querySelector(String(node.target[0]))?.matches(BASE_UI_HIDDEN_FOCUSABLE)),
          }
        : violation,
    )
    .filter((violation) => violation.nodes.length > 0);
}

/**
 * One browser serves every file, so the pointer arrives wherever the file before this one left it.
 * Base UI opens a Tooltip as soon as its trigger renders under a resting pointer and both tooltip
 * demos set `delay={0}`, so a pointer parked over the top left made the sweep scan an open popup.
 * That popup portals outside the landmark below and fails the region rule. Park the pointer in a
 * corner first, where nothing is mounted yet and no demo reaches afterwards.
 */
beforeAll(async () => {
  const corner = document.createElement('div');
  corner.style.cssText = 'position:fixed;bottom:0;right:0;width:2px;height:2px';
  document.body.append(corner);
  await page.elementLocator(corner).hover();
  corner.remove();
});

const styles = stylex.create({
  stage: {
    padding: space['--ult-space-7'],
  },
});

const modes = [
  { name: 'dark', theme: siteTheme.dark, scheme: colorScheme.dark },
  { name: 'light', theme: siteTheme.light, scheme: colorScheme.light },
] as const;

function themeDocument(mode: (typeof modes)[number]) {
  const classes = stylex.props(mode.theme, mode.scheme).className?.split(/\s+/).filter(Boolean) ?? [];
  document.documentElement.classList.add(...classes);
  onTestFinished(() => document.documentElement.classList.remove(...classes));
}

for (const [path, module] of Object.entries(demos)) {
  const name = path.replace('../demos/', '').replace(/\.tsx$/, '');
  const Demo = module.default;

  for (const mode of modes) {
    test(`${name} has no axe violations in ${mode.name}`, async () => {
      themeDocument(mode);

      // axe's region rule fails every node outside a landmark, and the landmark is the
      // one piece of the site's shell a demo mounted bare would otherwise be missing.
      await render(
        <main>
          <Card.Root style={styles.stage}>
            <ThemeBoundary mode={mode.name}>
              <Demo />
            </ThemeBoundary>
          </Card.Root>
        </main>,
      );

      const { violations } = await axe.run(document.body);
      const kept = name.endsWith('/anatomy') ? withoutBaseUiHiddenFocusables(violations) : violations;
      expect(kept.map(describe)).toEqual([]);
    });
  }
}

function describe(violation: axe.Result) {
  return `${violation.id}: ${violation.nodes.map((node) => node.html).join(', ')}`;
}
