import * as stylex from '@stylexjs/stylex';
import { color, font, space, text } from '@ultima/tokens/tokens.stylex';
import { Card } from '@ultima/ui';

import { CopyButton } from './copy-button';

const styles = stylex.create({
  root: {
    alignItems: 'center',
    display: 'flex',
    gap: space['--ult-space-5'],
    paddingBlock: space['--ult-space-4'],
    paddingInlineEnd: space['--ult-space-4'],
    paddingInlineStart: space['--ult-space-6'],
  },
  lines: {
    display: 'flex',
    flexDirection: 'column',
    flexGrow: 1,
    fontFamily: font['--ult-font-mono'],
    fontSize: text['--ult-text-3'],
    gap: space['--ult-space-1'],
    lineHeight: font['--ult-font-leading-snug'],
    margin: 0,
    minInlineSize: 0,
    whiteSpace: 'pre-wrap',
  },
  line: { display: 'flex', gap: space['--ult-space-4'] },
  prompt: { color: color['--ult-color-text-subtle'], userSelect: 'none' },
  command: { color: color['--ult-color-text'], minInlineSize: 0, overflowWrap: 'anywhere' },
});

export function LandingCommand({ commands, label }: { commands: readonly string[]; label: string }) {
  return (
    <Card.Root style={styles.root}>
      <pre {...stylex.props(styles.lines)}>
        {commands.map((command) => (
          <span key={command} {...stylex.props(styles.line)}>
            <span aria-hidden {...stylex.props(styles.prompt)}>
              $
            </span>
            <code {...stylex.props(styles.command)}>{command}</code>
          </span>
        ))}
      </pre>
      <CopyButton text={commands.join('\n')} ariaLabel={label} />
    </Card.Root>
  );
}
