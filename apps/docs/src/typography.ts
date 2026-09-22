import * as stylex from '@stylexjs/stylex';
import { color, display, font, space, text } from '@ultima/tokens/tokens.stylex';

import { breakpoints } from './breakpoints.stylex';

export const headings = stylex.create({
  h1: {
    color: color['--ult-color-text'],
    fontSize: {
      default: text['--ult-text-10'],
      [breakpoints.WIDE]: text['--ult-text-12'],
    },
    fontWeight: font['--ult-font-weight-medium'],
    letterSpacing: font['--ult-font-tracking-tight'],
    lineHeight: font['--ult-font-leading-tight'],
    margin: 0,
  },
  h2: {
    color: color['--ult-color-text'],
    fontSize: display.section,
    fontWeight: font['--ult-font-weight-medium'],
    letterSpacing: font['--ult-font-tracking-tight'],
    lineHeight: font['--ult-font-leading-tight'],
    marginTop: space['--ult-space-4'],
    marginBottom: space['--ult-space-6'],
  },
  h3: {
    color: color['--ult-color-text'],
    fontSize: text['--ult-text-6'],
    fontWeight: font['--ult-font-weight-semibold'],
    lineHeight: font['--ult-font-leading-snug'],
    marginTop: space['--ult-space-8'],
    marginBottom: space['--ult-space-4'],
  },
  rule: {
    marginTop: space['--ult-space-11'],
  },
});
