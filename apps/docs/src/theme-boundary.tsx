import * as stylex from '@stylexjs/stylex';
import type { StyleXStyles } from '@stylexjs/stylex';
import { colorScheme, presetDraft, resolveDraft, type ThemePresetId } from '@ultima/tokens';
import { color } from '@ultima/tokens/tokens.stylex';
import { createContext, useMemo, useState, type CSSProperties, type HTMLAttributes, type ReactNode } from 'react';

import { neutralTheme, useResolvedScheme, type Scheme } from './theme';

/**
 * The element portalled parts mount into. `undefined` outside every boundary, so a portal keeps
 * Base UI's default; `null` inside one until the element mounts, which Base UI waits for.
 */
export const BoundaryPortalContext = createContext<HTMLElement | null | undefined>(undefined);

const styles = stylex.create({
  boundary: { color: color['--ult-color-text'] },
});

/**
 * Shows components as a consumer gets them, in a preset's theme and the site's mode, and is the
 * portal container for every popup inside, so a Select or Dialog in a demo wears that theme too,
 * never `site`. Neutral, the default, comes from the generated `site-themes.ts`; another preset
 * resolves its draft. docs/spec/ultima.md, The docs site theme.
 */
export function ThemeBoundary({
  children,
  preset = 'neutral',
  mode,
  style,
  ...props
}: Omit<HTMLAttributes<HTMLDivElement>, 'className' | 'style'> & {
  children: ReactNode;
  preset?: ThemePresetId;
  /** A fixed mode in place of the site's, for a specimen that shows the other one. */
  mode?: Scheme;
  style?: StyleXStyles;
}) {
  const siteScheme = useResolvedScheme();
  const scheme = mode ?? siteScheme;
  const vars = useMemo(
    () => (preset === 'neutral' ? undefined : (resolveDraft(presetDraft(preset))[scheme] as CSSProperties)),
    [preset, scheme],
  );
  const [container, setContainer] = useState<HTMLDivElement | null>(null);
  const applied = stylex.props(!vars && neutralTheme[scheme], colorScheme[scheme], styles.boundary, style);
  return (
    <div
      {...props}
      ref={setContainer}
      data-theme-boundary={preset}
      {...applied}
      style={{ ...applied.style, ...vars }}
    >
      <BoundaryPortalContext.Provider value={container}>{children}</BoundaryPortalContext.Provider>
    </div>
  );
}
