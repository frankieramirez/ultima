import * as stylex from '@stylexjs/stylex';
import { useLayoutEffect, useRef, useState, type ReactNode, type Ref } from 'react';

import type { BlockEntry } from './generated/blocks';

/**
 * The window a block preview lays out in, in CSS pixels: the frames' 1200×760 block layouts, and the
 * production matrix's 390×844 narrow viewport. docs/spec/ultima.md, Docs routes.
 */
export const PREVIEW_SIZES = {
  desktop: { width: 1200, height: 760 },
  narrow: { width: 390, height: 844 },
} as const;

export type PreviewSize = keyof typeof PREVIEW_SIZES;

const styles = stylex.create({
  stage: { inlineSize: '100%', minInlineSize: 0 },
  window: (inline: string, block: string) => ({
    blockSize: block,
    inlineSize: inline,
    marginInline: 'auto',
    overflow: 'hidden',
    position: 'relative',
  }),
  frame: (scale: number) => ({
    borderWidth: 0,
    display: 'block',
    transform: `scale(${scale})`,
    transformOrigin: '0 0',
  }),
});

/** Frames `/blocks/<id>/preview`; see PreviewFrame. */
export function BlockFrame({ block, ...props }: { block: BlockEntry } & Omit<PreviewFrameProps, 'src' | 'title'>) {
  return <PreviewFrame src={`/blocks/${block.id}/preview`} title={`${block.title} preview`} {...props} />;
}

type PreviewFrameProps = {
  src: string;
  title: string;
  size?: PreviewSize;
  thumbnail?: boolean;
  inert?: boolean;
  frameRef?: Ref<HTMLIFrameElement>;
  children?: (scale: number) => ReactNode;
};

/**
 * Frames a bare preview route at a preview size, scaled down to fit the column. The screen lays
 * out for the frame's own viewport, so a Sidebar reads the frame's width rather than the reader's
 * window. A thumbnail loads lazily and is `inert`, so nothing inside it is a tab stop. `children`
 * draws over the frame at its scale, as Anatomy does.
 */
export function PreviewFrame({
  src,
  title,
  size = 'desktop',
  thumbnail = false,
  inert = thumbnail,
  frameRef,
  children,
}: PreviewFrameProps) {
  const stage = useRef<HTMLDivElement>(null);
  const [room, setRoom] = useState(0);

  useLayoutEffect(() => {
    const node = stage.current;
    if (!node) return;
    const measure = () => setRoom(node.clientWidth);
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  const { width, height } = PREVIEW_SIZES[size];
  const scale = Math.min(1, room / width);

  return (
    <div ref={stage} data-preview-size={size} {...stylex.props(styles.stage)}>
      <div {...stylex.props(styles.window(`${width * scale}px`, `${height * scale}px`))}>
        <iframe
          ref={frameRef}
          src={src}
          title={title}
          width={width}
          height={height}
          loading={thumbnail ? 'lazy' : 'eager'}
          inert={inert}
          {...stylex.props(styles.frame(scale))}
        />
        {children && scale > 0 && children(scale)}
      </div>
    </div>
  );
}
