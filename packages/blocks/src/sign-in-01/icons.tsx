import * as stylex from '@stylexjs/stylex';
import { color, text } from '@ultima/tokens/tokens.stylex';

const styles = stylex.create({
  glyph: {
    flexShrink: 0,
    height: '1em',
    width: '1em',
  },
  logo: {
    color: color['--ult-color-accent'],
    fontSize: text['--ult-text-8'],
  },
});

export function LogoGlyph() {
  return (
    <svg {...stylex.props(styles.glyph, styles.logo)} viewBox="0 0 24 24" width="1em" height="1em" aria-hidden="true">
      <rect x="1" y="1" width="22" height="22" rx="6" fill="currentColor" />
    </svg>
  );
}

export function GitHubGlyph() {
  return (
    <svg
      {...stylex.props(styles.glyph)}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      width="1em"
      height="1em"
      aria-hidden="true"
    >
      <path d="M9 19c-4 1.5-4-2-6-2.5" />
      <path d="M15 21v-3.5c0-1 .1-1.4-.5-2 2.8-.3 5.5-1.4 5.5-6a4.6 4.6 0 0 0-1.3-3.2 4.2 4.2 0 0 0-.1-3.2s-1.1-.3-3.5 1.3a12.3 12.3 0 0 0-6.2 0C6.5 2.8 5.4 3.1 5.4 3.1a4.2 4.2 0 0 0-.1 3.2A4.6 4.6 0 0 0 4 9.5c0 4.6 2.7 5.7 5.5 6-.6.6-.6 1.2-.5 2V21" />
    </svg>
  );
}

export function KeyGlyph() {
  return (
    <svg
      {...stylex.props(styles.glyph)}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      width="1em"
      height="1em"
      aria-hidden="true"
    >
      <circle cx="8" cy="16" r="4" />
      <path d="m10.8 13.2 9.2-9.2" />
      <path d="m17 7 2.5 2.5" />
      <path d="m14.5 9.5 2 2" />
    </svg>
  );
}
