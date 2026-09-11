import * as stylex from '@stylexjs/stylex';
import { Button } from '@ultima/ui';
import { useEffect, useRef, useState } from 'react';

const styles = stylex.create({
  // The confirmation is a label swap on a button that often carries an `aria-label`, so nothing
  // announces it. This region is in the tree from the first render, which is what makes it speak.
  status: {
    clipPath: 'inset(50%)',
    height: '1px',
    overflow: 'hidden',
    position: 'absolute',
    whiteSpace: 'nowrap',
    width: '1px',
  },
});

export function CopyButton({ text, ariaLabel }: { text: string; ariaLabel?: string }) {
  const [copied, setCopied] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  useEffect(() => () => clearTimeout(timer.current), []);

  async function copy() {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setCopied(false), 2000);
  }

  return (
    <>
      <Button variant="ghost" size="sm" onClick={copy} aria-label={ariaLabel}>
        {copied ? 'Copied' : 'Copy'}
      </Button>
      <span role="status" {...stylex.props(styles.status)}>
        {copied ? 'Copied' : ''}
      </span>
    </>
  );
}
