import * as stylex from '@stylexjs/stylex';
import { colorScheme, lightTheme } from '@ultima/tokens';
import { space } from '@ultima/tokens/tokens.stylex';
import { Card, Code } from '@ultima/ui';
import type { ComponentType } from 'react';

import { CopyButton } from './copy-button';

const PAPER = '#EDEDE8';
const PAPER_BORDER = '#C5C5BF';
const PAPER_WELL = '#E4E4DF';
const PAPER_INK = '#393935';

const styles = stylex.create({
  figure: {
    backgroundColor: PAPER,
    borderColor: PAPER_BORDER,
    borderRadius: 0,
    marginBlock: space['--ult-space-6'],
    marginInline: 0,
    padding: space['--ult-space-6'],
  },
  preview: {
    paddingBlockStart: space['--ult-space-7'],
  },
  source: {
    backgroundColor: PAPER_WELL,
    borderColor: PAPER_BORDER,
    borderRadius: 0,
    color: PAPER_INK,
    paddingBlock: space['--ult-space-6'],
    paddingInline: '0.875rem',
  },
  bar: {
    justifyContent: 'flex-end',
  },
});

export function Demo({
  component: Component,
  source,
}: {
  component: ComponentType;
  source: string;
}) {
  return (
    <div {...stylex.props(lightTheme, colorScheme.light)}>
      <Card.Root render={<figure />} style={styles.figure}>
        <Card.Body style={styles.preview}>
          <Component />
        </Card.Body>
        <Card.Body>
          <Code variant="block" style={styles.source}>
            {source}
          </Code>
        </Card.Body>
        <Card.Footer style={styles.bar}>
          <CopyButton text={source} ariaLabel="Copy example source" />
        </Card.Footer>
      </Card.Root>
    </div>
  );
}
