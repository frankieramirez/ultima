import * as stylex from '@stylexjs/stylex';
import { color } from '@ultima/tokens/tokens.stylex';
import type { ReactNode } from 'react';

const styles = stylex.create({
  glyph: {
    flexShrink: 0,
    height: '1em',
    width: '1em',
  },
  pending: {
    color: color['--ult-color-warning'],
  },
});

function Stroke({ children }: { children: ReactNode }) {
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
      {children}
    </svg>
  );
}

export function ArrowLeftGlyph() {
  return (
    <Stroke>
      <path d="M19 12H5" />
      <path d="m12 19-7-7 7-7" />
    </Stroke>
  );
}

export function MenuGlyph() {
  return (
    <Stroke>
      <path d="M4 6h16" />
      <path d="M4 12h16" />
      <path d="M4 18h16" />
    </Stroke>
  );
}

export function UserGlyph() {
  return (
    <Stroke>
      <circle cx="12" cy="8" r="4" />
      <path d="M4 21a8 8 0 0 1 16 0" />
    </Stroke>
  );
}

export function KeyGlyph() {
  return (
    <Stroke>
      <circle cx="8" cy="16" r="4" />
      <path d="m10.8 13.2 9.2-9.2" />
      <path d="m17 7 2.5 2.5" />
      <path d="m14.5 9.5 2 2" />
    </Stroke>
  );
}

export function BellGlyph() {
  return (
    <Stroke>
      <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
      <path d="M10.3 21a1.9 1.9 0 0 0 3.4 0" />
    </Stroke>
  );
}

export function CardGlyph() {
  return (
    <Stroke>
      <rect x="2" y="5" width="20" height="14" rx="2" />
      <path d="M2 10h20" />
    </Stroke>
  );
}

export function UsersGlyph() {
  return (
    <Stroke>
      <circle cx="9" cy="8" r="4" />
      <path d="M2 21a7 7 0 0 1 14 0" />
      <path d="M16 4.1a4 4 0 0 1 0 7.8" />
      <path d="M22 21a7 7 0 0 0-4-6.3" />
    </Stroke>
  );
}

export function ShieldGlyph() {
  return (
    <Stroke>
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10" />
    </Stroke>
  );
}

export function CodeGlyph() {
  return (
    <Stroke>
      <path d="m16 18 6-6-6-6" />
      <path d="m8 6-6 6 6 6" />
    </Stroke>
  );
}

export function PendingGlyph() {
  return (
    <svg {...stylex.props(styles.glyph, styles.pending)} viewBox="0 0 24 24" width="1em" height="1em" aria-hidden="true">
      <circle cx="12" cy="12" r="5" fill="currentColor" />
    </svg>
  );
}
