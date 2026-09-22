import { CheckIcon, CopyIcon } from '@phosphor-icons/react';
import * as stylex from '@stylexjs/stylex';
import { border, color, font, space, text } from '@ultima/tokens/tokens.stylex';
import { Card } from '@ultima/ui';

import { CopyButton } from '../../copy-button';

const SETUP_COMMAND = 'npx shadcn add https://ultima.systems/r/setup-vite.json';
const COMPONENT_COMMAND = 'npx shadcn add @ultima/button';

const styles = stylex.create({
  panel: { borderRadius: 0, inlineSize: '100%' },
  toolbar: {
    alignItems: 'center',
    borderBlockEndColor: color['--ult-color-border'],
    borderBlockEndStyle: 'solid',
    borderBlockEndWidth: border.hairline,
    display: 'flex',
    justifyContent: 'space-between',
    paddingBlock: space['--ult-space-6'],
    paddingInline: space['--ult-space-7'],
  },
  target: {
    color: color['--ult-color-text-muted'],
    fontFamily: font['--ult-font-mono'],
    fontSize: text['--ult-text-1'],
    letterSpacing: font['--ult-font-tracking-wide'],
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

export default function Workbench() {
  return (
    <Card.Root style={styles.panel}>
      <div {...stylex.props(styles.toolbar)}>
        <span {...stylex.props(styles.target)}>{'VITE   /   NEXT.JS'}</span>
        <CopyButton
          text={`${SETUP_COMMAND}\n${COMPONENT_COMMAND}`}
          ariaLabel="Copy install commands"
        >
          {(status) =>
            status === 'Copied' ? <CheckIcon aria-hidden /> : <CopyIcon aria-hidden />
          }
        </CopyButton>
      </div>
      <div {...stylex.props(styles.body)}>
        <p {...stylex.props(styles.command, styles.setup)}>
          npx shadcn add
          <br />
          https://ultima.systems/r/setup-vite.json
        </p>
        <p {...stylex.props(styles.command, styles.component)}>{COMPONENT_COMMAND}</p>
      </div>
    </Card.Root>
  );
}
