import * as stylex from '@stylexjs/stylex';
import { Button, type ButtonVariant } from '@ultima/ui';
import { useEffect, useRef, useState, type ReactNode } from 'react';

// Word Joiner: invisible and zero-width. Same string twice is not a live-region change; this is.
const WORD_JOINER = '\u2060';

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

export function CopyButton({
  text,
  ariaLabel,
  variant = 'ghost',
  children,
}: {
  text: string;
  ariaLabel?: string;
  variant?: ButtonVariant;
  children?: (status: '' | 'Copied' | 'Copy failed') => ReactNode;
}) {
  const [status, setStatus] = useState('');
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  useEffect(() => () => clearTimeout(timer.current), []);

  async function copy() {
    let result: 'Copied' | 'Copy failed' = 'Copied';
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      result = 'Copy failed';
    }
    setStatus((current) => (current === result ? `${result}${WORD_JOINER}` : result));
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setStatus(''), 2000);
  }

  const label = status.replace(WORD_JOINER, '') as '' | 'Copied' | 'Copy failed';

  return (
    <>
      <Button variant={variant} size="sm" onClick={copy} aria-label={ariaLabel}>
        {children ? children(label) : label || 'Copy'}
      </Button>
      <span role="status" aria-atomic="true" {...stylex.props(styles.status)}>
        {status}
      </span>
    </>
  );
}
