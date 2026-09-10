import * as stylex from '@stylexjs/stylex';
import type { StyleXStyles } from '@stylexjs/stylex';

import { useTheme } from './theme';

const DARK_LOGO = '/brand/ultima-logo-dark.svg';
const LIGHT_LOGO = '/brand/ultima-logo-light.svg';

type BrandLogoProps = {
  alt: string;
  height: number;
  style?: StyleXStyles;
  width: number;
};

export function BrandLogo({ alt, height, style, width }: BrandLogoProps) {
  const { preference } = useTheme();
  const image = (
    <img
      src={preference === 'light' ? LIGHT_LOGO : DARK_LOGO}
      alt={alt}
      width={width}
      height={height}
      {...stylex.props(style)}
    />
  );

  if (preference !== 'system') return image;

  return (
    <picture>
      <source media="(prefers-color-scheme: light)" srcSet={LIGHT_LOGO} />
      {image}
    </picture>
  );
}
