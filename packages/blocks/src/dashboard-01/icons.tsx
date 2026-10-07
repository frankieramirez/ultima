import * as stylex from '@stylexjs/stylex';
import { color, text } from '@ultima/tokens/tokens.stylex';
import type { ReactNode } from 'react';

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

function Glyph({ children }: { children: ReactNode }) {
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

export function LogoGlyph() {
  return (
    <svg {...stylex.props(styles.glyph, styles.logo)} viewBox="0 0 24 24" width="1em" height="1em" aria-hidden="true">
      <rect x="1" y="1" width="22" height="22" rx="6" fill="currentColor" />
    </svg>
  );
}

export function ChevronsUpDownGlyph() {
  return (
    <Glyph>
      <path d="m7 15 5 5 5-5" />
      <path d="m7 9 5-5 5 5" />
    </Glyph>
  );
}

export function SidebarGlyph() {
  return (
    <Glyph>
      <rect x="3" y="3" width="18" height="18" rx="2" />
      <path d="M9 3v18" />
    </Glyph>
  );
}

export function OverviewGlyph() {
  return (
    <Glyph>
      <rect x="3" y="3" width="7" height="9" rx="1" />
      <rect x="14" y="3" width="7" height="5" rx="1" />
      <rect x="14" y="12" width="7" height="9" rx="1" />
      <rect x="3" y="16" width="7" height="5" rx="1" />
    </Glyph>
  );
}

export function CartGlyph() {
  return (
    <Glyph>
      <circle cx="8" cy="21" r="1" />
      <circle cx="19" cy="21" r="1" />
      <path d="M2 2h3l2.7 12.4a2 2 0 0 0 2 1.6h8.7a2 2 0 0 0 2-1.6L22 7H6" />
    </Glyph>
  );
}

export function BoxGlyph() {
  return (
    <Glyph>
      <path d="M21 8 12 3 3 8v8l9 5 9-5Z" />
      <path d="m3 8 9 5 9-5" />
      <path d="M12 13v8" />
    </Glyph>
  );
}

export function UsersGlyph() {
  return (
    <Glyph>
      <circle cx="9" cy="8" r="4" />
      <path d="M2 21a7 7 0 0 1 14 0" />
      <path d="M16 4a4 4 0 0 1 0 8" />
      <path d="M18 14.5a7 7 0 0 1 4 6.5" />
    </Glyph>
  );
}

export function AnalyticsGlyph() {
  return (
    <Glyph>
      <path d="M3 3v18h18" />
      <path d="m7 15 4-4 3 3 6-6" />
    </Glyph>
  );
}

export function MegaphoneGlyph() {
  return (
    <Glyph>
      <path d="M3 10v4a1 1 0 0 0 1 1h3l8 5V4L7 9H4a1 1 0 0 0-1 1Z" />
      <path d="M19 9a4 4 0 0 1 0 6" />
    </Glyph>
  );
}

export function SettingsGlyph() {
  return (
    <Glyph>
      <circle cx="12" cy="12" r="3" />
      <path d="M12 2v3M12 19v3M2 12h3M19 12h3M4.9 4.9 7 7M17 17l2.1 2.1M4.9 19.1 7 17M17 7l2.1-2.1" />
    </Glyph>
  );
}

export function HelpGlyph() {
  return (
    <Glyph>
      <circle cx="12" cy="12" r="9" />
      <path d="M9.5 9a2.5 2.5 0 1 1 3.5 2.3c-.6.3-1 .9-1 1.6v.6" />
      <path d="M12 17h.01" />
    </Glyph>
  );
}

export function SearchGlyph() {
  return (
    <Glyph>
      <circle cx="11" cy="11" r="7" />
      <path d="m20 20-4-4" />
    </Glyph>
  );
}

export function CalendarGlyph() {
  return (
    <Glyph>
      <rect x="3" y="5" width="18" height="16" rx="2" />
      <path d="M3 10h18M8 3v4M16 3v4" />
    </Glyph>
  );
}

export function DownloadGlyph() {
  return (
    <Glyph>
      <path d="M12 3v12" />
      <path d="m7 10 5 5 5-5" />
      <path d="M4 21h16" />
    </Glyph>
  );
}
