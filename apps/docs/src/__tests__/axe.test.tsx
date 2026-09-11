import * as stylex from '@stylexjs/stylex';
import { colorScheme, darkTheme, lightTheme } from '@ultima/tokens';
import { space } from '@ultima/tokens/tokens.stylex';
import { Card } from '@ultima/ui';
import axe from 'axe-core';
import type { ComponentType } from 'react';
import { beforeAll, expect, onTestFinished, test } from 'vitest';
import { page } from 'vitest/browser';
import { render } from 'vitest-browser-react';

const demos = import.meta.glob<{ default: ComponentType }>('../demos/**/*.tsx', { eager: true });

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
  { name: 'dark', theme: darkTheme, scheme: colorScheme.dark },
  { name: 'light', theme: lightTheme, scheme: colorScheme.light },
];

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
            <Demo />
          </Card.Root>
        </main>,
      );

      const results = await axe.run(document.body);
      expect(results.violations.map(describe)).toEqual([]);
    });
  }
}

function describe(violation: axe.Result) {
  return `${violation.id}: ${violation.nodes.map((node) => node.html).join(', ')}`;
}
