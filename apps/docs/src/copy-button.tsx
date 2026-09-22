import * as stylex from '@stylexjs/stylex';
import { Button } from '@ultima/ui';
import { visuallyHidden } from '@ultima/ui/lib/visually-hidden';
import { useEffect, useRef, useState } from 'react';

// Word Joiner: invisible and zero-width. Same string twice is not a live-region change; this is.
const WORD_JOINER = '\u2060';

export function CopyButton({ text, ariaLabel }: { text: string; ariaLabel?: string }) {
  const [status, setStatus] = useState('');
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  useEffect(() => () => clearTimeout(timer.current), []);

  async function copy() {
    await navigator.clipboard.writeText(text);
    setStatus((current) => (current === 'Copied' ? `Copied${WORD_JOINER}` : 'Copied'));
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setStatus(''), 2000);
  }

  return (
    <>
      <Button variant="ghost" size="sm" onClick={copy} aria-label={ariaLabel}>
        {status ? 'Copied' : 'Copy'}
      </Button>
      {/* The confirmation is a label swap on a button that often carries an `aria-label`, so nothing
          announces it. This region is in the tree from the first render, which is what makes it speak. */}
      <span role="status" aria-atomic="true" {...stylex.props(visuallyHidden)}>
        {status}
      </span>
    </>
  );
}
