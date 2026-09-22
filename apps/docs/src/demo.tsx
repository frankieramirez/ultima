import * as stylex from '@stylexjs/stylex';
import { border, color, font, radius, space, text } from '@ultima/tokens/tokens.stylex';
import { Button, Card, Separator } from '@ultima/ui';
import { useLayoutEffect, useRef, useState, type ComponentType, type RefObject } from 'react';

import { CopyButton } from './copy-button';
import { HighlightedCode } from './highlighted-code';

const WIDE = '@media (min-width: 48rem)';

const ALWAYS_OPEN_LINES = 8;
const TEASER_LINES = 6;
const FADE_LINES = 3;

const LINE = `calc(${text['--ult-text-4']} * ${font['--ult-font-leading-normal']})`;

const styles = stylex.create({
  figure: { borderRadius: 0, marginBlock: space['--ult-space-6'], marginInline: 0, overflow: 'hidden' },
  preview: {
    alignItems: 'center',
    display: 'flex',
    justifyContent: 'center',
    minBlockSize: { default: '6rem', [WIDE]: '8rem' },
    overflowX: 'auto',
    paddingBlock: space['--ult-space-9'],
    paddingInline: space['--ult-space-9'],
  },
  previewInner: { minInlineSize: 'fit-content' },
  code: { backgroundColor: color['--ult-color-surface-sunken'], position: 'relative' },
  teaser: {
    maxBlockSize: `calc(${TEASER_LINES} * ${LINE} + 2 * ${space['--ult-space-6']})`,
    overflow: 'hidden',
  },
  source: {
    borderWidth: 0,
    paddingBlock: space['--ult-space-6'],
    paddingInlineEnd: space['--ult-space-12'],
    paddingInlineStart: space['--ult-space-7'],
  },
  fade: {
    backgroundImage: `linear-gradient(to bottom, transparent, ${color['--ult-color-surface-sunken']})`,
    blockSize: `calc(${FADE_LINES} * ${LINE} + ${space['--ult-space-6']})`,
    insetBlockEnd: 0,
    insetInline: 0,
    pointerEvents: 'none',
    position: 'absolute',
  },
  cover: {
    alignItems: 'flex-end',
    backgroundColor: 'transparent',
    borderRadius: 0,
    borderWidth: 0,
    blockSize: 'auto',
    display: 'flex',
    inset: 0,
    justifyContent: 'center',
    padding: 0,
    paddingBlockEnd: space['--ult-space-5'],
    position: 'absolute',
  },
  reveal: {
    display: 'flex',
    insetBlockEnd: space['--ult-space-5'],
    justifyContent: 'center',
    marginBlockStart: `calc(-1 * (${space['--ult-space-9']} + ${space['--ult-space-5']}))`,
    paddingBlockEnd: space['--ult-space-5'],
    pointerEvents: 'none',
    position: 'sticky',
  },
  toggle: { blockSize: 'auto', pointerEvents: 'auto' },
  pill: {
    alignItems: 'center',
    backgroundColor: color['--ult-color-surface-raised'],
    borderColor: color['--ult-color-border'],
    borderRadius: radius['--ult-radius-full'],
    borderStyle: 'solid',
    borderWidth: border.hairline,
    color: color['--ult-color-text'],
    display: 'inline-flex',
    fontSize: text['--ult-text-3'],
    fontWeight: font['--ult-font-weight-medium'],
    lineHeight: font['--ult-font-leading-none'],
    paddingBlock: space['--ult-space-4'],
    paddingInline: space['--ult-space-6'],
  },
});

/** Keeps `anchor` under the pointer across a collapse by scrolling the window by its displacement. */
function useScrollAnchoredTo(
  anchor: RefObject<HTMLElement | null>,
  open: boolean,
  setOpen: (open: boolean) => void,
) {
  const before = useRef<number | null>(null);

  useLayoutEffect(() => {
    if (before.current === null || !anchor.current) return;
    window.scrollBy(0, anchor.current.getBoundingClientRect().top - before.current);
    before.current = null;
  }, [anchor, open]);

  return () => {
    if (open) before.current = anchor.current?.getBoundingClientRect().top ?? null;
    setOpen(!open);
  };
}

export function Demo({
  component: Component,
  source,
  lang = 'tsx',
}: {
  component: ComponentType;
  source: string;
  lang?: string;
}) {
  const collapsible = source.split('\n').length > ALWAYS_OPEN_LINES;
  const [open, setOpen] = useState(!collapsible);
  const pill = useRef<HTMLSpanElement>(null);
  const toggle = useScrollAnchoredTo(pill, open, setOpen);

  const control = (
    <Button aria-expanded={open} onClick={toggle} style={open ? styles.toggle : styles.cover} variant="ghost">
      <span ref={pill} {...stylex.props(styles.pill)}>
        {open ? 'Hide code' : 'Show code'}
      </span>
    </Button>
  );

  return (
    <Card.Root render={<figure />} style={styles.figure}>
      <div {...stylex.props(styles.preview)}>
        <div {...stylex.props(styles.previewInner)}>
          <Component />
        </div>
      </div>
      <Separator />
      <div {...stylex.props(styles.code, !open && styles.teaser)}>
        <HighlightedCode code={source} lang={lang} style={styles.source} />
        <CopyButton text={source} ariaLabel="Copy example source" floating />
        {collapsible && !open ? <div aria-hidden {...stylex.props(styles.fade)} /> : null}
        {collapsible && !open ? control : null}
        {collapsible && open ? <div {...stylex.props(styles.reveal)}>{control}</div> : null}
      </div>
    </Card.Root>
  );
}
