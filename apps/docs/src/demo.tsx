import * as stylex from '@stylexjs/stylex';
import { border, color, radius, space } from '@ultima/tokens/tokens.stylex';
import { Button, Code } from '@ultima/ui';
import { useEffect, useRef, useState, type ComponentType } from 'react';

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
  const [copied, setCopied] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  useEffect(() => () => clearTimeout(timer.current), []);

  async function copy() {
    await navigator.clipboard.writeText(source);
    setCopied(true);
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setCopied(false), 2000);
  }

  return (
    <figure {...stylex.props(styles.figure)}>
      <div {...stylex.props(styles.stage)}>
        <Component />
      </div>
      <div {...stylex.props(styles.bar)}>
        <Button variant="ghost" size="sm" onClick={copy}>
          {copied ? 'Copied' : 'Copy'}
        </Button>
      </div>
      <Code variant="block" style={styles.source}>
        {source}
      </Code>
    </figure>
  );
}
