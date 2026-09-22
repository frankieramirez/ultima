/**
 * The spec's clip-hidden recipe, shared so every visually hidden element uses
 * one shape: a 1px absolutely positioned box clipped by inset(50%). Never
 * `display: none`, which would leave the accessibility tree, so pre-mounted
 * live regions and hidden titles keep speaking. `visuallyHiddenFocusable` is
 * the same box revealed on :focus, for a control that stays keyboard-reachable.
 */
import * as stylex from '@stylexjs/stylex';

const styles = stylex.create({
  hidden: {
    clipPath: 'inset(50%)',
    height: '1px',
    overflow: 'hidden',
    position: 'absolute',
    whiteSpace: 'nowrap',
    width: '1px',
  },
  focusable: {
    clipPath: { default: 'inset(50%)', ':focus': 'none' },
    height: { default: '1px', ':focus': 'auto' },
    overflow: { default: 'hidden', ':focus': 'visible' },
    position: 'absolute',
    whiteSpace: { default: 'nowrap', ':focus': 'normal' },
    width: { default: '1px', ':focus': 'auto' },
  },
});

/** The clip-hidden box: invisible, still in the accessibility tree. */
export const visuallyHidden = styles.hidden;

/** The clip-hidden box until the element is focused, when it shows in place. */
export const visuallyHiddenFocusable = styles.focusable;
