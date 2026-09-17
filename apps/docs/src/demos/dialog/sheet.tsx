import * as stylex from '@stylexjs/stylex';
import { border, motion, space } from '@ultima/tokens/tokens.stylex';
import { Button, Dialog } from '@ultima/ui';

/**
 * Dialog's own `transform` names a resting, a starting, and an ending state, and StyleX merges a
 * property one condition at a time, so each edge below names all three. An override that set only
 * the resting transform would leave Dialog's `scale(0.98)` alive underneath the slide.
 */
const sheet = stylex.create({
  row: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: space['--ult-space-4'],
  },
  viewport: {
    padding: 0,
  },
  popup: {
    alignContent: 'start',
    borderRadius: 0,
    borderWidth: 0,
    display: 'grid',
    gap: space['--ult-space-4'],
    justifyItems: 'start',
    maxWidth: 'none',
    transitionDuration: motion['--ult-motion-base'],
    transitionProperty: 'opacity, transform',
  },
  leftViewport: {
    placeItems: 'stretch start',
  },
  left: {
    borderRightWidth: border.hairline,
    width: `min(calc(5 * ${space['--ult-space-12']}), 100%)`,
    transform: {
      default: 'translateX(0)',
      ':is([data-starting-style])': 'translateX(-100%)',
      ':is([data-ending-style])': 'translateX(-100%)',
    },
  },
  rightViewport: {
    placeItems: 'stretch end',
  },
  right: {
    borderLeftWidth: border.hairline,
    width: `min(calc(5 * ${space['--ult-space-12']}), 100%)`,
    transform: {
      default: 'translateX(0)',
      ':is([data-starting-style])': 'translateX(100%)',
      ':is([data-ending-style])': 'translateX(100%)',
    },
  },
  topViewport: {
    placeItems: 'start stretch',
  },
  top: {
    borderBottomWidth: border.hairline,
    transform: {
      default: 'translateY(0)',
      ':is([data-starting-style])': 'translateY(-100%)',
      ':is([data-ending-style])': 'translateY(-100%)',
    },
  },
  bottomViewport: {
    placeItems: 'end stretch',
  },
  bottom: {
    borderTopWidth: border.hairline,
    transform: {
      default: 'translateY(0)',
      ':is([data-starting-style])': 'translateY(100%)',
      ':is([data-ending-style])': 'translateY(100%)',
    },
  },
});

const EDGES = [
  { edge: 'left', label: 'Left', viewport: sheet.leftViewport, popup: sheet.left },
  { edge: 'right', label: 'Right', viewport: sheet.rightViewport, popup: sheet.right },
  { edge: 'top', label: 'Top', viewport: sheet.topViewport, popup: sheet.top },
  { edge: 'bottom', label: 'Bottom', viewport: sheet.bottomViewport, popup: sheet.bottom },
] as const;

export default function SheetRecipe() {
  return (
    <div {...stylex.props(sheet.row)}>
      {EDGES.map(({ edge, label, viewport, popup }) => (
        <Dialog.Root key={edge}>
          <Dialog.Trigger render={<Button variant="outline" />}>{label}</Dialog.Trigger>
          <Dialog.Portal>
            <Dialog.Backdrop />
            <Dialog.Viewport style={[sheet.viewport, viewport]}>
              <Dialog.Popup style={[sheet.popup, popup]}>
                <Dialog.Title>Filters</Dialog.Title>
                <Dialog.Description>
                  A Dialog anchored to the {edge} edge, sliding in from the side it sits on.
                </Dialog.Description>
                <Dialog.Close render={<Button variant="ghost" />}>Close</Dialog.Close>
              </Dialog.Popup>
            </Dialog.Viewport>
          </Dialog.Portal>
        </Dialog.Root>
      ))}
    </div>
  );
}
