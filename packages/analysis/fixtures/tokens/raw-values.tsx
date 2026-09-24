'use client';

import * as stylex from '@stylexjs/stylex';

const styles = stylex.create({
  root: {
    backgroundColor: '#1d1e20',
    borderRadius: '8px',
    boxShadow: '0 1px 2px rgba(0, 0, 0, 0.3)',
    color: 'white',
    fontSize: '0.875rem',
    fontWeight: 600,
    lineHeight: 1.5,
    padding: '12px',
    transitionDuration: '150ms',
    transitionTimingFunction: 'cubic-bezier(0.2, 0, 0, 1)',
    zIndex: 50,
  },
});

function Separator() {
  return <hr {...stylex.props(styles.root)} />;
}

export { Separator };
