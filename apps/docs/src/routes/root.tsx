import { IconContext, type IconProps } from '@phosphor-icons/react';
import { Outlet, useRouterState } from '@tanstack/react-router';
import * as stylex from '@stylexjs/stylex';
import { color, font } from '@ultima/tokens/tokens.stylex';
import { Sidebar } from '@ultima/ui';
import { useCallback, useEffect, useRef, useState } from 'react';

import { Header } from '../header';
import { SiteMenu } from '../site-menu';
import { readStored, writeStored } from '../storage';
import { ThemeRoot } from '../theme';

export const NAVIGATION_STORAGE_KEY = 'ultima-navigation';

const styles = stylex.create({
  shell: {
    blockSize: '100dvh',
    color: color['--ult-color-text'],
    display: 'flex',
    flexDirection: 'column',
    fontFamily: font['--ult-font-sans'],
  },
  body: {
    display: 'flex',
    inlineSize: '100%',
    flexGrow: 1,
    // Without this the row refuses to shrink below its content and the panel scrolls the page.
    minBlockSize: 0,
  },
  content: {
    flexGrow: 1,
    minInlineSize: 0,
    overflow: 'auto',
    scrollbarWidth: 'none',
    position: 'relative',
  },
});

// Phosphor's provider replaces its context wholesale and IconBase has no
// fallback for size, so a partial value renders every glyph at zero.
const icons: IconProps = {
  color: 'currentColor',
  size: '1em',
  weight: 'regular',
  mirrored: false,
};

export function Root() {
  return (
    <ThemeRoot>
      <IconContext.Provider value={icons}>
        <Shell />
      </IconContext.Provider>
    </ThemeRoot>
  );
}

function Shell() {
  const [open, setOpen] = useState(readNavigationOpen);
  const content = useRef<HTMLDivElement>(null);
  // The resolved location and not the requested one: `location` moves when the navigation starts,
  // which is a render where the outgoing page is still the one on screen to take the focus.
  const pathname = useRouterState({
    select: (state) => state.resolvedLocation?.pathname ?? state.location.pathname,
  });
  const focused = useRef(pathname);

  const remember = useCallback((next: boolean) => {
    setOpen(next);
    writeStored(NAVIGATION_STORAGE_KEY, next ? 'open' : 'closed');
  }, []);

  useEffect(() => {
    if (focused.current === pathname) return;
    focused.current = pathname;
    const heading = content.current?.querySelector('h1');
    if (!heading) return;
    heading.tabIndex = -1;
    heading.focus();
  }, [pathname]);

  return (
    <Sidebar.Root open={open} onOpenChange={remember} style={styles.shell}>
      <Header />
      <div {...stylex.props(styles.body)}>
        <SiteMenu />
        <div ref={content} {...stylex.props(styles.content)}>
          <Outlet />
        </div>
      </div>
    </Sidebar.Root>
  );
}

function readNavigationOpen(): boolean {
  return readStored(NAVIGATION_STORAGE_KEY) !== 'closed';
}
