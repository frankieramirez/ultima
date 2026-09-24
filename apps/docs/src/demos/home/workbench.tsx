import * as stylex from '@stylexjs/stylex';
import { color, font, space, text } from '@ultima/tokens/tokens.stylex';
import { Card, Tabs } from '@ultima/ui';
import { useState } from 'react';

import { CopyButton } from '../../copy-button';
import { INSTALL_TARGETS } from '../../install-commands';

type Target = (typeof INSTALL_TARGETS)[number]['value'];

const styles = stylex.create({
  panel: { borderRadius: 0, inlineSize: '100%' },
  /** The tab list's hairline is the toolbar's rule; the copy button sits over its inline end. */
  toolbar: { position: 'relative' },
  list: {
    paddingBlockStart: space['--ult-space-6'],
    paddingInline: space['--ult-space-7'],
  },
  copy: {
    insetBlockStart: '50%',
    insetInlineEnd: space['--ult-space-6'],
    position: 'absolute',
    transform: 'translateY(-50%)',
  },
  body: {
    display: 'flex',
    flexDirection: 'column',
    gap: space['--ult-space-7'],
    padding: space['--ult-space-8'],
  },
  command: {
    fontFamily: font['--ult-font-mono'],
    fontSize: text['--ult-text-3'],
    lineHeight: font['--ult-font-leading-relaxed'],
    margin: 0,
    overflowWrap: 'anywhere',
  },
  setup: { color: color['--ult-color-text-muted'] },
  component: { color: color['--ult-color-text'] },
});

/** Breaks the setup command before its URL so the pair reads as two short lines at any width. */
function SetupCommand({ command }: { command: string }) {
  const url = command.lastIndexOf(' ');
  return (
    <p {...stylex.props(styles.command, styles.setup)}>
      {command.slice(0, url)}
      <br />
      {command.slice(url + 1)}
    </p>
  );
}

export default function Workbench() {
  const [target, setTarget] = useState<Target>(INSTALL_TARGETS[0].value);
  const active = INSTALL_TARGETS.find((entry) => entry.value === target) ?? INSTALL_TARGETS[0];

  return (
    <Card.Root style={styles.panel}>
      <Tabs.Root value={target} onValueChange={(value) => setTarget(value as Target)}>
        <div {...stylex.props(styles.toolbar)}>
          <Tabs.List aria-label="Setup target" style={styles.list}>
            {INSTALL_TARGETS.map((entry) => (
              <Tabs.Tab key={entry.value} value={entry.value}>
                {entry.label}
              </Tabs.Tab>
            ))}
            <Tabs.Indicator />
          </Tabs.List>
          <div {...stylex.props(styles.copy)}>
            <CopyButton text={active.commands.join('\n')} ariaLabel={`Copy ${active.label} install commands`} />
          </div>
        </div>
        {INSTALL_TARGETS.map((entry) => (
          <Tabs.Panel key={entry.value} value={entry.value} style={styles.body}>
            <SetupCommand command={entry.commands[0]} />
            <p {...stylex.props(styles.command, styles.component)}>{entry.commands[1]}</p>
          </Tabs.Panel>
        ))}
      </Tabs.Root>
    </Card.Root>
  );
}
