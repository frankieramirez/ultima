import { CheckIcon, CopyIcon } from '@phosphor-icons/react';
import * as stylex from '@stylexjs/stylex';
import { color, space } from '@ultima/tokens/tokens.stylex';
import { Button } from '@ultima/ui';
import { useEffect, useRef, useState } from 'react';

const WIDE = '@media (min-width: 48rem)';

// Word Joiner: invisible and zero-width. Same string twice is not a live-region change; this is.
const WORD_JOINER = '⁠';

const CONFIRMATION_MS = 1500;

const styles = stylex.create({
  button: {
    backgroundColor: {
      default: color['--ult-color-surface-sunken'],
      ':hover': color['--ult-color-surface-hover'],
      [WIDE]: { default: 'transparent', ':hover': color['--ult-color-surface-hover'] },
    },
    flexShrink: 0,
    paddingInline: space['--ult-space-2'],
    width: space['--ult-space-9'],
  },
  floating: {
    insetBlockStart: space['--ult-space-4'],
    insetInlineEnd: space['--ult-space-4'],
    position: 'absolute',
  },
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
  ariaLabel = 'Copy',
  floating = false,
}: {
  text: string;
  ariaLabel?: string;
  /** Pin the button to the top and inline-end corner of a `position: relative` code block. */
  floating?: boolean;
}) {
  const [status, setStatus] = useState('');
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  useEffect(() => () => clearTimeout(timer.current), []);

  async function copy() {
    await navigator.clipboard.writeText(text);
    setStatus((current) => (current === 'Copied' ? `Copied${WORD_JOINER}` : 'Copied'));
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setStatus(''), CONFIRMATION_MS);
  }

  return (
    <>
      <Button
        aria-label={ariaLabel}
        onClick={copy}
        size="sm"
        style={[styles.button, floating && styles.floating]}
        variant="ghost"
      >
        {status ? <CheckIcon aria-hidden /> : <CopyIcon aria-hidden />}
      </Button>
      <span role="status" aria-atomic="true" {...stylex.props(styles.status)}>
        {status}
      </span>
    </>
  );
}
