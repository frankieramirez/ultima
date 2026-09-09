import * as stylex from '@stylexjs/stylex';
import { colorScheme, darkTheme, lightTheme } from '@ultima/tokens';
import { color, font, space } from '@ultima/tokens/tokens.stylex';
import axe from 'axe-core';
import type { ComponentType } from 'react';
import { expect, test } from 'vitest';
import { render } from 'vitest-browser-react';

const demos = import.meta.glob<{ default: ComponentType }>('../demos/**/*.tsx', { eager: true });

const styles = stylex.create({
  surface: {
    backgroundColor: color['--ult-color-surface'],
    color: color['--ult-color-text'],
    fontFamily: font['--ult-font-sans'],
    padding: space['--ult-space-7'],
  },
});

const modes = [
  { name: 'dark', theme: darkTheme, scheme: colorScheme.dark },
  { name: 'light', theme: lightTheme, scheme: colorScheme.light },
];

for (const [path, module] of Object.entries(demos)) {
  const name = path.replace('../demos/', '').replace(/\.tsx$/, '');
  const Demo = module.default;

  for (const mode of modes) {
    test(`${name} has no axe violations in ${mode.name}`, async () => {
      const screen = await render(
        <div {...stylex.props(mode.theme, mode.scheme, styles.surface)}>
          <Demo />
        </div>,
      );

      const results = await axe.run(screen.container);
      expect(results.violations.map(describe)).toEqual([]);
    });
  }
}

function describe(violation: axe.Result) {
  return `${violation.id}: ${violation.nodes.map((node) => node.html).join(', ')}`;
}
