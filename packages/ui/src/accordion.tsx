'use client';

import { Accordion as BaseAccordion } from '@base-ui/react/accordion';
import * as stylex from '@stylexjs/stylex';
import { border, color, font, motion, space, text } from '@ultima/tokens/tokens.stylex';
import type { PartProps } from '@ultima/ui/lib/component';
import type { ComponentProps } from 'react';

const styles = stylex.create({
  item: {
    borderBlockEndColor: color['--ult-color-border'],
    borderBlockEndStyle: 'solid',
    borderBlockEndWidth: border.hairline,
  },
  header: {
    margin: 0,
  },
  trigger: {
    alignItems: 'center',
    appearance: 'none',
    backgroundColor: {
      default: 'transparent',
      ':hover': color['--ult-color-surface-hover'],
    },
    borderStyle: 'none',
    borderWidth: 0,
    color: color['--ult-color-text'],
    cursor: 'default',
    display: 'flex',
    fontFamily: font['--ult-font-sans'],
    fontSize: text['--ult-text-4'],
    fontWeight: font['--ult-font-weight-medium'],
    gap: space['--ult-space-4'],
    inlineSize: '100%',
    justifyContent: 'space-between',
    margin: 0,
    opacity: { default: 1, ':is([data-disabled])': 0.5 },
    paddingBlock: space['--ult-space-4'],
    paddingInline: space['--ult-space-4'],
    textAlign: 'start',
    transitionDuration: motion['--ult-motion-fast'],
    transitionProperty: 'background-color, color',
    ':focus-visible': {
      outline: `${border.focus} solid ${color['--ult-color-border-focus']}`,
      outlineOffset: border.focusOffset,
    },
  },
  panel: {
    /** Base UI seeds the variable, and zero at both ends is what there is to animate between. */
    height: {
      default: 'var(--accordion-panel-height)',
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

type AccordionRootProps = Omit<ComponentProps<typeof BaseAccordion.Root>, 'orientation' | 'loopFocus'>;
type AccordionItemProps = PartProps<ComponentProps<typeof BaseAccordion.Item>>;
type AccordionHeaderProps = PartProps<ComponentProps<typeof BaseAccordion.Header>>;
type AccordionTriggerProps = PartProps<ComponentProps<typeof BaseAccordion.Trigger>>;
type AccordionPanelProps = PartProps<ComponentProps<typeof BaseAccordion.Panel>>;

function Item({ style, ...props }: AccordionItemProps) {
  return <BaseAccordion.Item {...props} {...stylex.props(styles.item, style)} />;
}

function Header({ style, ...props }: AccordionHeaderProps) {
  return <BaseAccordion.Header {...props} {...stylex.props(styles.header, style)} />;
}

function Trigger({ style, ...props }: AccordionTriggerProps) {
  return <BaseAccordion.Trigger {...props} {...stylex.props(styles.trigger, style)} />;
}

function Panel({ style, ...props }: AccordionPanelProps) {
  const panel = stylex.props(styles.panel, style);
  // Applied outside the merge on purpose: StyleX drops every earlier rule for a property
  // when a later style sets it plainly, so a caller reaching for the style slot to lay
  // their content out would take the guard with it and leave a closed panel on screen.
  const guard = stylex.props(styles.hiddenGuard);

  return (
    <BaseAccordion.Panel
      {...props}
      className={`${panel.className ?? ''} ${guard.className ?? ''}`}
      style={panel.style}
    />
  );
}

const Accordion = {
  Root: BaseAccordion.Root,
  Item,
  Header,
  Trigger,
  Panel,
};

export {
  Accordion,
  type AccordionRootProps,
  type AccordionItemProps,
  type AccordionHeaderProps,
  type AccordionTriggerProps,
  type AccordionPanelProps,
};
