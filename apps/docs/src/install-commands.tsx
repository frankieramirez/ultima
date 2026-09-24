import * as stylex from '@stylexjs/stylex';
import { space } from '@ultima/tokens/tokens.stylex';
import { Tabs } from '@ultima/ui';

import { Fence } from './prose';

export const INSTALL_TARGETS = [
  {
    value: 'vite',
    label: 'Vite',
    commands: ['npx shadcn add https://ultima.systems/r/setup-vite.json', 'npx shadcn add @ultima/button'],
  },
  {
    value: 'next',
    label: 'Next.js',
    commands: ['npx shadcn add https://ultima.systems/r/setup-next.json', 'npx shadcn add @ultima/button'],
  },
] as const;

const styles = stylex.create({
  root: { marginBlock: space['--ult-space-6'] },
  /** The fence carries its own block margin, so the panel adds none of its own. */
  panel: { paddingBlockStart: 0 },
});

export function InstallCommands() {
  return (
    <Tabs.Root defaultValue={INSTALL_TARGETS[0].value} style={styles.root}>
      <Tabs.List aria-label="Setup target">
        {INSTALL_TARGETS.map((target) => (
          <Tabs.Tab key={target.value} value={target.value}>
            {target.label}
          </Tabs.Tab>
        ))}
        <Tabs.Indicator />
      </Tabs.List>
      {INSTALL_TARGETS.map((target) => (
        <Tabs.Panel key={target.value} value={target.value} style={styles.panel}>
          <Fence code={target.commands.join('\n')} lang="bash" />
        </Tabs.Panel>
      ))}
    </Tabs.Root>
  );
}
