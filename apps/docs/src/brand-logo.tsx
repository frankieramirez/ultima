import * as stylex from '@stylexjs/stylex';
import type { StyleXStyles } from '@stylexjs/stylex';

import { useTheme } from './theme';

const DARK_LOGO = '/brand/ultima-logo-dark.svg';
const LIGHT_LOGO = '/brand/ultima-logo-light.svg';

type BrandLogoProps = {
  alt: string;
  style?: StyleXStyles;
};

export function BrandLogo({ alt, style }: BrandLogoProps) {
  const { preference } = useTheme();
  const image = (
    <img
      src={preference === 'light' ? LIGHT_LOGO : DARK_LOGO}
      alt={alt}
      width={714}
      height={197}
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
