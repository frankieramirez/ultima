import { IconContext, type IconProps } from '@phosphor-icons/react';
import { Outlet, useRouterState } from '@tanstack/react-router';
import * as stylex from '@stylexjs/stylex';
import { color, font } from '@ultima/tokens/tokens.stylex';
import { Separator, Sidebar } from '@ultima/ui';
import { useEffect, useRef } from 'react';

import { Header } from '../header';
import { SiteFooter } from '../site-footer';
import { SiteMenu } from '../site-menu';
import { ThemeRoot } from '../theme';


const styles = stylex.create({
  shell: {
    minBlockSize: '100dvh',
    color: color['--ult-color-text'],
    display: 'flex',
    flexDirection: 'column',
    fontFamily: font['--ult-font-sans'],
  },
  body: {
    display: 'flex',
    inlineSize: '100%',
    flexGrow: 1,
  },
  content: {
    flexGrow: 1,
    minInlineSize: 0,
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
  const content = useRef<HTMLDivElement>(null);
  // The resolved location and not the requested one: `location` moves when the navigation starts,
  // which is a render where the outgoing page is still the one on screen to take the focus.
  const pathname = useRouterState({
    select: (state) => state.resolvedLocation?.pathname ?? state.location.pathname,
  });
  const focused = useRef(pathname);

  useEffect(() => {
    if (focused.current === pathname) return;
    focused.current = pathname;
    const heading = content.current?.querySelector('h1');
    if (!heading) return;
    heading.tabIndex = -1;
    // Scroll position is the router's: restoration owns where the document lands, focus only
    // tells the reader which page arrived.
    heading.focus({ preventScroll: true });
  }, [pathname]);

  if (pathname === '/theme-studio') return <Outlet />;

  return (
    <Sidebar.Root open={true} style={styles.shell}>
      <Header />
      <div {...stylex.props(styles.body)}>
        <SiteMenu />
        <div ref={content} {...stylex.props(styles.content)}>
          <Outlet />
        </div>
      </div>
      <Separator />
      <SiteFooter />
    </Sidebar.Root>
  );
}
