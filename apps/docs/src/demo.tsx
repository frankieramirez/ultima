import * as stylex from '@stylexjs/stylex';
import { space } from '@ultima/tokens/tokens.stylex';
import { Card, Code } from '@ultima/ui';
import type { ComponentType } from 'react';

import { CopyButton } from './copy-button';

const styles = stylex.create({
  figure: {
    marginBlock: space['--ult-space-6'],
    marginInline: 0,
  },
  stage: {
    padding: space['--ult-space-7'],
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
      <Card.Body style={styles.stage}>
        <Component />
      </Card.Body>
      <Card.Body>
        <Code variant="block">{source}</Code>
      </Card.Body>
      <Card.Footer style={styles.bar}>
        <CopyButton text={source} ariaLabel="Copy example source" />
      </Card.Footer>
    </Card.Root>
  );
}
