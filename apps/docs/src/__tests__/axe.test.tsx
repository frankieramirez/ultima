import * as stylex from '@stylexjs/stylex';
import { colorScheme, darkTheme, lightTheme } from '@ultima/tokens';
import { space } from '@ultima/tokens/tokens.stylex';
import { Card } from '@ultima/ui';
import axe from 'axe-core';
import type { ComponentType } from 'react';
import { expect, onTestFinished, test } from 'vitest';
import { render } from 'vitest-browser-react';

const demos = import.meta.glob<{ default: ComponentType }>('../demos/**/*.tsx', { eager: true });

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
