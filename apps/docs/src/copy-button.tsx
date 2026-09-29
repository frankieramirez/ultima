import { docsStyles } from './docs-style';
import { CheckIcon, CopyIcon, WarningIcon } from '@phosphor-icons/react';
import * as stylex from '@stylexjs/stylex';
import { color, space } from '@ultima/tokens/tokens.stylex';
import { Button, type ButtonVariant } from '@ultima/ui';
import { visuallyHidden } from '@ultima/ui/lib/visually-hidden';
import { useEffect, useRef, useState, type ReactNode } from 'react';

import { breakpoints } from './breakpoints.stylex';

// Word Joiner: invisible and zero-width. Same string twice is not a live-region change; this is.
const WORD_JOINER = '⁠';

const CONFIRMATION_MS = 1500;

/** 28px: the square the demo figure decision (#369) sets, a step between the space scale's 1.5rem and 2rem. */
const ICON_SQUARE = `calc(${space['--ult-space-8']} + ${space['--ult-space-2']})`;

type CopyStatus = '' | 'Copied' | 'Copy failed';

const styles = stylex.create({
  icon: {
    backgroundColor: {
      default: color['--ult-color-surface-sunken'],
      ':hover': color['--ult-color-surface-hover'],
      [breakpoints.WIDE]: { default: 'transparent', ':hover': color['--ult-color-surface-hover'] },
    },
    flexShrink: 0,
    height: ICON_SQUARE,
    paddingInline: 0,
    width: ICON_SQUARE,
  },
  floating: {
    insetBlockStart: space['--ult-space-4'],
    insetInlineEnd: space['--ult-space-4'],
    position: 'absolute',
  },
});

function glyph(status: CopyStatus) {
  if (status === 'Copied') return <CheckIcon aria-hidden />;
  if (status === 'Copy failed') return <WarningIcon aria-hidden />;
  return <CopyIcon aria-hidden />;
}

/**
 * Without `children` it is the site's square icon button, whose name stays `ariaLabel` while the
 * status region announces the result. A `children` render receives the status and draws its own label.
 */
export function CopyButton({
  text,
  ariaLabel,
  variant = 'ghost',
  floating = false,
  children,
}: {
  text: string;
  ariaLabel?: string;
  variant?: ButtonVariant;
  /** Pin the icon button to the top and inline-end corner of a `position: relative` code block. */
  floating?: boolean;
  children?: (status: CopyStatus) => ReactNode;
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
    timer.current = setTimeout(() => setStatus(''), CONFIRMATION_MS);
  }

  const label = status.replace(WORD_JOINER, '') as CopyStatus;

  return (
    <>
      <Button
        aria-label={label === 'Copy failed' ? 'Copy failed' : (ariaLabel ?? (children ? undefined : 'Copy'))}
        onClick={copy}
        size="sm"
        style={[docsStyles.square, !children && styles.icon, !children && floating && styles.floating]}
        variant={variant}
      >
        {children ? children(label) : glyph(label)}
      </Button>
      {/* The confirmation is a glyph or label swap on a button that often carries an `aria-label`, so
          nothing announces it. This region is in the tree from the first render, which is what makes it speak. */}
      <span role="status" aria-atomic="true" {...stylex.props(visuallyHidden)}>
        {status}
      </span>
    </>
  );
}
