import { CheckIcon, CopyIcon } from '@phosphor-icons/react';
import * as stylex from '@stylexjs/stylex';
import { border, color, font, space, text } from '@ultima/tokens/tokens.stylex';
import { Button, Card } from '@ultima/ui';
import { visuallyHidden } from '@ultima/ui/lib/visually-hidden';
import { useEffect, useRef, useState } from 'react';

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
  copy: { paddingInline: space['--ult-space-4'] },
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
  const [copied, setCopied] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  useEffect(() => () => clearTimeout(timer.current), []);

  async function copy() {
    await navigator.clipboard.writeText(`${SETUP_COMMAND}\n${COMPONENT_COMMAND}`);
    setCopied(true);
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setCopied(false), 2000);
  }

  return (
    <Card.Root style={styles.panel}>
      <div {...stylex.props(styles.toolbar)}>
        <span {...stylex.props(styles.target)}>{'VITE   /   NEXT.JS'}</span>
        <Button variant="ghost" size="sm" onClick={copy} aria-label="Copy install commands" style={styles.copy}>
          {copied ? <CheckIcon aria-hidden /> : <CopyIcon aria-hidden />}
        </Button>
        <span role="status" aria-atomic="true" {...stylex.props(visuallyHidden)}>
          {copied ? 'Copied' : ''}
        </span>
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
