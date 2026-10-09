'use client';

import { useRender } from '@base-ui/react/use-render';
import * as stylex from '@stylexjs/stylex';
import type { PartProps } from '@ultima/ui/lib/component';
import { useThemeMode } from '@ultima/ui/theme-mode';
import { createContext, useContext, useState } from 'react';

type ScopeMode = 'dark' | 'light';

const schemes = stylex.create({
  dark: { colorScheme: 'dark' },
  light: { colorScheme: 'light' },
});

const ContainerContext = createContext<HTMLElement | null | undefined>(undefined);

export type ThemeScopeProps = PartProps<useRender.ComponentProps<'div'>> & {
  /** Every themeable group for each mode, the shape of the Studio export's `ultimaTheme`. */
  theme: Record<ScopeMode, ReadonlyArray<stylex.CompiledStyles>>;
  /** Pins a mode; without it the scope follows the document's resolved mode. */
  mode?: ScopeMode;
};

export function ThemeScope({ theme, mode, ref, render, style, children, ...props }: ThemeScopeProps) {
  const resolved = useThemeMode().resolved ?? 'dark';
  const scheme = mode ?? resolved;
  const [container, setContainer] = useState<HTMLElement | null>(null);
  return useRender<Record<string, never>, HTMLDivElement>({
    defaultTagName: 'div',
    ref: ref ? [ref, setContainer] : setContainer,
    render,
    props: {
      ...props,
      ...stylex.props(theme[scheme], schemes[scheme], style),
      children: <ContainerContext.Provider value={container}>{children}</ContainerContext.Provider>,
    },
  });
}

/** The nearest scope's element: `undefined` outside every scope, `null` until it mounts. */
export function useThemeScopeContainer() {
  return useContext(ContainerContext);
}
