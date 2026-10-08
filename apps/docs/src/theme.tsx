import * as stylex from '@stylexjs/stylex';
import { colorScheme } from '@ultima/tokens';
import { space } from '@ultima/tokens/tokens.stylex';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useLayoutEffect,
  useMemo,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from 'react';

import { readStored, writeStored } from './storage';
import { shell } from './shell.stylex';
import { neutralDark, neutralLight, neutralShape, siteDark, siteLight } from './site-themes';

export type Scheme = 'dark' | 'light';

export const siteTheme = { dark: [siteDark], light: [siteLight] } as const;

export const neutralTheme = { dark: [neutralDark, neutralShape], light: [neutralLight, neutralShape] } as const;

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

function themeProps(preference: ThemePreference, scheme: Scheme, theme: 'site' | 'neutral') {
  const site = theme === 'site';
  return stylex.props(site ? siteTheme[scheme] : neutralTheme[scheme], colorScheme[preference], site && styles.scrollPad);
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

/** The framing page's root, when a same-origin page frames this document; `null` otherwise. */
function framingRoot(): HTMLElement | null {
  try {
    return window.parent !== window ? window.parent.document.documentElement : null;
  } catch {
    return null;
  }
}

function subscribeToFramer(onChange: () => void) {
  const root = framingRoot();
  if (!root) return () => {};
  const observer = new MutationObserver(onChange);
  observer.observe(root, { attributes: true, attributeFilter: ['class', 'style'] });
  const query = window.matchMedia(LIGHT_QUERY);
  query.addEventListener('change', onChange);
  return () => {
    observer.disconnect();
    query.removeEventListener('change', onChange);
  };
}

/** The mode the framing page resolved, read from its root's `color-scheme`, so no storage write is needed to follow it. */
function readFramerScheme(): Scheme | null {
  const root = framingRoot();
  const scheme = root && root.ownerDocument.defaultView?.getComputedStyle(root).colorScheme;
  return scheme === 'dark' || scheme === 'light' ? scheme : null;
}

const unframed = () => null;
const ignore = () => () => {};

function useSchemeFor(preference: ThemePreference): Scheme {
  const system = useSyncExternalStore(subscribeToScheme, readSystemScheme, serverScheme);
  return preference === 'system' ? system : preference;
}

/**
 * Applies the site's mode and a theme on `<html>`: `site` for the docs chrome, or Neutral for a
 * document that is itself a boundary, such as a framed block preview, whose portals mount on `body`.
 */
export function ThemeRoot({ children, theme = 'site' }: { children: ReactNode; theme?: 'site' | 'neutral' }) {
  const [preference, setPreferenceState] = useState<ThemePreference>(readPreference);

  // Another document on the site changed the mode, such as the page framing this one.
  useEffect(() => {
    const onStorage = (event: StorageEvent) => {
      if (event.key === THEME_STORAGE_KEY || event.key === null) setPreferenceState(readPreference());
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  const setPreference = useCallback((next: ThemePreference) => {
    setPreferenceState(next);
    writeStored(THEME_STORAGE_KEY, next);
  }, []);

  // A framed block preview takes the framing page's mode, which holds even when storage refuses writes.
  const framed = theme === 'neutral';
  const framer = useSyncExternalStore(framed ? subscribeToFramer : ignore, framed ? readFramerScheme : unframed, unframed);
  const effective = framer ?? preference;
  const scheme = useSchemeFor(effective);

  useLayoutEffect(() => {
    const el = document.documentElement;
    const applied = themeProps(effective, scheme, theme);
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
  }, [effective, scheme, theme]);

  const value = useMemo(() => ({ preference: effective, setPreference }), [effective, setPreference]);

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}
