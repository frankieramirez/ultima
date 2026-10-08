import * as stylex from '@stylexjs/stylex';
import { color, font, space, text } from '@ultima/tokens/tokens.stylex';
import { Card, ScrollArea } from '@ultima/ui';

import { CopyButton } from './copy-button';

const FADE_WIDTH = '2rem';
const END_FADE_BEFORE_MEASURE = FADE_WIDTH;
const fade = `linear-gradient(
  to right,
  transparent 0px,
  black min(${FADE_WIDTH}, var(--scroll-area-overflow-x-start)),
  black calc(100% - min(${FADE_WIDTH}, var(--scroll-area-overflow-x-end, ${END_FADE_BEFORE_MEASURE}))),
  transparent 100%
)`;

const styles = stylex.create({
  root: {
    alignItems: 'center',
    display: 'flex',
    gap: space['--ult-space-5'],
    paddingBlock: space['--ult-space-4'],
    paddingInlineEnd: space['--ult-space-4'],
    paddingInlineStart: space['--ult-space-6'],
  },
  scroller: { flexGrow: 1, minInlineSize: 0 },
  viewport: { WebkitMaskImage: fade, maskImage: fade },
  lines: {
    display: 'flex',
    flexDirection: 'column',
    fontFamily: font['--ult-font-mono'],
    fontSize: text['--ult-text-3'],
    gap: space['--ult-space-1'],
    lineHeight: font['--ult-font-leading-snug'],
    margin: 0,
    whiteSpace: 'pre',
  },
  line: { display: 'flex', gap: space['--ult-space-4'] },
  prompt: { color: color['--ult-color-text-subtle'], userSelect: 'none' },
  command: { color: color['--ult-color-text'] },
});

export function LandingCommand({ commands, label }: { commands: readonly string[]; label: string }) {
  return (
    <Card.Root style={styles.root}>
      <ScrollArea.Root style={styles.scroller}>
        <ScrollArea.Viewport style={styles.viewport}>
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
        </ScrollArea.Viewport>
      </ScrollArea.Root>
      <CopyButton text={commands.join('\n')} ariaLabel={label} />
    </Card.Root>
  );
}
