import * as stylex from '@stylexjs/stylex';
import { border, color, radius, space } from '@ultima/tokens/tokens.stylex';
import { Code } from '@ultima/ui';
import type { ComponentType } from 'react';

import { CopyButton } from './copy-button';

const styles = stylex.create({
  figure: {
    borderColor: color['--ult-color-border'],
    borderRadius: radius['--ult-radius-lg'],
    borderStyle: 'solid',
    borderWidth: border.hairline,
    marginBlock: space['--ult-space-6'],
    marginInline: 0,
    overflow: 'hidden',
  },
  stage: {
    backgroundColor: color['--ult-color-surface-raised'],
    padding: space['--ult-space-7'],
  },
  bar: {
    borderTopColor: color['--ult-color-border'],
    borderTopStyle: 'solid',
    borderTopWidth: border.hairline,
    display: 'flex',
    justifyContent: 'flex-end',
    padding: space['--ult-space-3'],
  },
  source: {
    borderRadius: 0,
    borderWidth: 0,
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
    <figure {...stylex.props(styles.figure)}>
      <div {...stylex.props(styles.stage)}>
        <Component />
      </div>
      <div {...stylex.props(styles.bar)}>
        <CopyButton text={source} />
      </div>
      <Code variant="block" style={styles.source}>
        {source}
      </Code>
    </figure>
  );
}
