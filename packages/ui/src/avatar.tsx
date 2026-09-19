'use client';

import { Avatar as BaseAvatar } from '@base-ui/react/avatar';
import * as stylex from '@stylexjs/stylex';
import { color, font, radius, space } from '@ultima/tokens/tokens.stylex';
import type { PartProps } from '@ultima/ui/lib/component';
import type { ComponentProps } from 'react';

const styles = stylex.create({
  root: {
    alignItems: 'center',
    backgroundColor: color['--ult-color-surface-sunken'],
    blockSize: space['--ult-space-9'],
    borderRadius: radius['--ult-radius-full'],
    boxSizing: 'border-box',
    containerType: 'inline-size',
    display: 'inline-flex',
    flexShrink: 0,
    fontFamily: font['--ult-font-sans'],
    inlineSize: space['--ult-space-9'],
    justifyContent: 'center',
    lineHeight: font['--ult-font-leading-none'],
    margin: 0,
    overflow: 'hidden',
    position: 'relative',
    userSelect: 'none',
  },
  image: {
    blockSize: '100%',
    inlineSize: '100%',
    inset: 0,
    objectFit: 'cover',
    position: 'absolute',
    visibility: {
      default: null,
      ':is([data-loading], [data-error])': 'hidden',
    },
  },
  fallback: {
    alignItems: 'center',
    color: color['--ult-color-text-muted'],
    display: 'flex',
    fontSize: '40cqi',
    fontWeight: font['--ult-font-weight-medium'],
    inset: 0,
    justifyContent: 'center',
    lineHeight: font['--ult-font-leading-none'],
    position: 'absolute',
  },
});

type AvatarRootProps = PartProps<ComponentProps<typeof BaseAvatar.Root>>;
type AvatarImageProps = PartProps<ComponentProps<typeof BaseAvatar.Image>>;
type AvatarFallbackProps = PartProps<ComponentProps<typeof BaseAvatar.Fallback>>;

function Root({ style, ...props }: AvatarRootProps) {
  return <BaseAvatar.Root {...props} {...stylex.props(styles.root, style)} />;
}

function Image({ style, ...props }: AvatarImageProps) {
  return <BaseAvatar.Image {...props} {...stylex.props(styles.image, style)} />;
}

function Fallback({ style, ...props }: AvatarFallbackProps) {
  return <BaseAvatar.Fallback {...props} {...stylex.props(styles.fallback, style)} />;
}

const Avatar = {
  Root,
  Image,
  Fallback,
};

export { Avatar, type AvatarRootProps, type AvatarImageProps, type AvatarFallbackProps };
