import * as stylex from '@stylexjs/stylex';
import type { StyleXStyles } from '@stylexjs/stylex';
import { colorScheme } from '@ultima/tokens';
import { color } from '@ultima/tokens/tokens.stylex';
import { createContext, useState, type HTMLAttributes, type ReactNode } from 'react';

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
 * Shows components as a consumer gets them: Neutral in the site's mode, and the portal container
 * for every popup inside, so a Select or Dialog in a demo is Neutral too, never `site`.
 * docs/spec/ultima.md, The docs site theme.
 */
export function NeutralBoundary({
  children,
  mode,
  style,
  ...props
}: Omit<HTMLAttributes<HTMLDivElement>, 'className' | 'style'> & {
  children: ReactNode;
  /** A fixed mode in place of the site's, for a specimen that shows the other one. */
  mode?: Scheme;
  style?: StyleXStyles;
}) {
  const siteScheme = useResolvedScheme();
  const scheme = mode ?? siteScheme;
  const [container, setContainer] = useState<HTMLDivElement | null>(null);
  return (
    <div
      {...props}
      ref={setContainer}
      data-theme-boundary="neutral"
      {...stylex.props(neutralTheme[scheme], colorScheme[scheme], styles.boundary, style)}
    >
      <BoundaryPortalContext.Provider value={container}>{children}</BoundaryPortalContext.Provider>
    </div>
  );
}
