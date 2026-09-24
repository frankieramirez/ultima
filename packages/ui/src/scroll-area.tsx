'use client';

import { ScrollArea as BaseScrollArea } from '@base-ui/react/scroll-area';
import * as stylex from '@stylexjs/stylex';
import { border, color, motion, radius, space } from '@ultima/tokens/tokens.stylex';
import type { PartProps } from '@ultima/ui/lib/component';
import type { ComponentProps } from 'react';

const marker = stylex.defaultMarker();

const styles = stylex.create({
  viewport: {
    blockSize: '100%',
    boxSizing: 'border-box',
    ':focus-visible': {
      outline: `${border.focus} solid ${color['--ult-color-border-focus']}`,
      outlineOffset: border.focusOffset,
    },
  },
  scrollbar: {
    blockSize: { default: null, ':is([data-orientation="horizontal"])': space['--ult-space-5'] },
    display: 'flex',
    flexDirection: { default: null, ':is([data-orientation="horizontal"])': 'column' },
    inlineSize: { default: null, ':is([data-orientation="vertical"])': space['--ult-space-5'] },
    justifyContent: 'center',
    padding: space['--ult-space-1'],
  },
  thumb: {
    backgroundColor: {
      default: color['--ult-color-surface-active'],
      [stylex.when.ancestor(':is([data-hovering], [data-scrolling])')]: color['--ult-color-border-strong'],
    },
    blockSize: { default: null, ':is([data-orientation="horizontal"])': '100%' },
    borderRadius: radius['--ult-radius-full'],
    inlineSize: { default: null, ':is([data-orientation="vertical"])': '100%' },
    transitionDuration: motion['--ult-motion-fast'],
    transitionProperty: 'background-color',
  },
});

type ScrollAreaRootProps = PartProps<ComponentProps<typeof BaseScrollArea.Root>>;
type ScrollAreaViewportProps = PartProps<ComponentProps<typeof BaseScrollArea.Viewport>>;
type ScrollAreaContentProps = PartProps<ComponentProps<typeof BaseScrollArea.Content>>;
type ScrollAreaScrollbarProps = PartProps<ComponentProps<typeof BaseScrollArea.Scrollbar>>;
type ScrollAreaThumbProps = PartProps<ComponentProps<typeof BaseScrollArea.Thumb>>;
type ScrollAreaCornerProps = PartProps<ComponentProps<typeof BaseScrollArea.Corner>>;

function Root({ style, ...props }: ScrollAreaRootProps) {
  return <BaseScrollArea.Root {...props} {...stylex.props(style)} />;
}

function Viewport({ style, ...props }: ScrollAreaViewportProps) {
  return <BaseScrollArea.Viewport {...props} {...stylex.props(styles.viewport, style)} />;
}

function Content({ style, ...props }: ScrollAreaContentProps) {
  return <BaseScrollArea.Content {...props} {...stylex.props(style)} />;
}

function Scrollbar({ style, ...props }: ScrollAreaScrollbarProps) {
  return <BaseScrollArea.Scrollbar {...props} {...stylex.props(marker, styles.scrollbar, style)} />;
}

function Thumb({ style, ...props }: ScrollAreaThumbProps) {
  return <BaseScrollArea.Thumb {...props} {...stylex.props(styles.thumb, style)} />;
}

function Corner({ style, ...props }: ScrollAreaCornerProps) {
  return <BaseScrollArea.Corner {...props} {...stylex.props(style)} />;
}

const ScrollArea = { Root, Viewport, Content, Scrollbar, Thumb, Corner };

export {
  ScrollArea,
  type ScrollAreaRootProps,
  type ScrollAreaViewportProps,
  type ScrollAreaContentProps,
  type ScrollAreaScrollbarProps,
  type ScrollAreaThumbProps,
  type ScrollAreaCornerProps,
};
