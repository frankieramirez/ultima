import * as stylex from '@stylexjs/stylex';
import { space } from '@ultima/tokens/tokens.stylex';
import { Card } from '@ultima/ui';
import type { ComponentType } from 'react';

import { CopyButton } from './copy-button';
import { HighlightedCode } from './highlighted-code';

const styles = stylex.create({
  figure: {
    borderRadius: 0,
    marginBlock: space['--ult-space-6'],
    marginInline: 0,
    padding: space['--ult-space-6'],
  },
  preview: {
    paddingBlockStart: space['--ult-space-7'],
  },
  source: {
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
    <Card.Root render={<figure />} style={styles.figure}>
      <Card.Body style={styles.preview}>
        <Component />
      </Card.Body>
      <Card.Body>
        <HighlightedCode code={source} lang="tsx" style={styles.source} />
      </Card.Body>
      <Card.Footer style={styles.bar}>
        <CopyButton text={source} ariaLabel="Copy example source" />
      </Card.Footer>
    </Card.Root>
  );
}
