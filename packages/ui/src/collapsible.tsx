'use client';

import { Collapsible as BaseCollapsible } from '@base-ui/react/collapsible';
import * as stylex from '@stylexjs/stylex';
import { motion } from '@ultima/tokens/tokens.stylex';
import type { PartProps } from '@ultima/ui/lib/component';
import type { ComponentProps } from 'react';

const styles = stylex.create({
  panel: {
    /** Base UI seeds the variable, and zero at both ends is what there is to animate between. */
    height: {
      default: 'var(--collapsible-panel-height)',
      ':is([data-starting-style])': 0,
      ':is([data-ending-style])': 0,
    },
    overflow: 'hidden',
    transitionDuration: motion['--ult-motion-base'],
    transitionProperty: 'height',
  },
  hiddenGuard: {
    display: {
      default: null,
      ':is([hidden]):not([hidden="until-found"])': 'none',
    },
  },
});

type CollapsibleRootProps = ComponentProps<typeof BaseCollapsible.Root>;
type CollapsibleTriggerProps = ComponentProps<typeof BaseCollapsible.Trigger>;
type CollapsiblePanelProps = PartProps<ComponentProps<typeof BaseCollapsible.Panel>>;

function Panel({ style, ...props }: CollapsiblePanelProps) {
  const panel = stylex.props(styles.panel, style);
  // Applied outside the merge on purpose: StyleX drops every earlier rule for a property
  // when a later style sets it plainly, so a caller reaching for the style slot to lay
  // their content out would take the guard with it and leave a closed panel on screen.
  const guard = stylex.props(styles.hiddenGuard);

  return (
    <BaseCollapsible.Panel
      {...props}
      className={`${panel.className ?? ''} ${guard.className ?? ''}`}
      style={panel.style}
    />
  );
}

const Collapsible = {
  Root: BaseCollapsible.Root,
  Trigger: BaseCollapsible.Trigger,
  Panel,
};

export { Collapsible, type CollapsibleRootProps, type CollapsibleTriggerProps, type CollapsiblePanelProps };
