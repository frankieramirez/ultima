import * as stylex from '@stylexjs/stylex';
import { colorScheme } from '@ultima/tokens';
import { space } from '@ultima/tokens/tokens.stylex';
import {
  createContext,
  useCallback,
  useContext,
  useLayoutEffect,
  useMemo,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from 'react';

import { readStored, writeStored } from './storage';
import { shell } from './shell.stylex';
import { neutralDark, neutralLight, siteDark, siteLight } from './site-themes';

export type Scheme = 'dark' | 'light';

export const siteTheme = { dark: siteDark, light: siteLight } as const;

export const neutralTheme = { dark: neutralDark, light: neutralLight } as const;

export const THEME_STORAGE_KEY = 'ultima-theme';
export type ThemePreference = 'dark' | 'light' | 'system';

const ThemeContext = createContext<{
  preference: ThemePreference;
  setPreference: (preference: ThemePreference) => void;
}>({ preference: 'system', setPreference: () => {} });

function isThemePreference(value: string | null): value is ThemePreference {
  return value === 'dark' || value === 'light' || value === 'system';
}

function readPreference(): ThemePreference {
  const stored = readStored(THEME_STORAGE_KEY);
  return isThemePreference(stored) ? stored : 'system';
}

const styles = stylex.create({
  scrollPad: {
    scrollPaddingBlockStart: `calc(${shell.chromeBlock} + ${space['--ult-space-6']})`,
  },
});

function themeProps(preference: ThemePreference, scheme: Scheme) {
  return stylex.props(siteTheme[scheme], colorScheme[preference], styles.scrollPad);
}

export function useTheme() {
  return useContext(ThemeContext);
}

const LIGHT_QUERY = '(prefers-color-scheme: light)';

function subscribeToScheme(onChange: () => void) {
  const query = window.matchMedia(LIGHT_QUERY);
  query.addEventListener('change', onChange);
  return () => query.removeEventListener('change', onChange);
}

function readSystemScheme(): Scheme {
  return window.matchMedia(LIGHT_QUERY).matches ? 'light' : 'dark';
}

function serverScheme(): Scheme {
  return 'dark';
}

/** The color scheme on screen: the stored preference, or the system's answer when the preference is `system`. */
export function useResolvedScheme(): Scheme {
  return useSchemeFor(useTheme().preference);
}

function useSchemeFor(preference: ThemePreference): Scheme {
  const system = useSyncExternalStore(subscribeToScheme, readSystemScheme, serverScheme);
  return preference === 'system' ? system : preference;
}

export function ThemeRoot({ children }: { children: ReactNode }) {
  const [preference, setPreferenceState] = useState<ThemePreference>(readPreference);

  const setPreference = useCallback((next: ThemePreference) => {
    setPreferenceState(next);
    writeStored(THEME_STORAGE_KEY, next);
  }, []);

  const scheme = useSchemeFor(preference);

  useLayoutEffect(() => {
    const el = document.documentElement;
    const applied = themeProps(preference, scheme);
    const previousClass = el.getAttribute('class');
    const previousInline = el.getAttribute('style');
    if (applied.className) el.setAttribute('class', applied.className);
    else el.removeAttribute('class');
    if (applied.style) Object.assign(el.style, applied.style);
    else el.style.colorScheme = '';
    return () => {
      if (previousClass === null) el.removeAttribute('class');
      else el.setAttribute('class', previousClass);
      if (previousInline === null) el.removeAttribute('style');
      else el.setAttribute('style', previousInline);
    };
  }, [preference, scheme]);

  const value = useMemo(() => ({ preference, setPreference }), [preference, setPreference]);

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}
