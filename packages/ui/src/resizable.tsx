'use client';

import { mergeProps, normalizeProps, useMachine } from '@zag-js/react';
import * as splitter from '@zag-js/splitter';
import * as stylex from '@stylexjs/stylex';
import { border, color, font, space } from '@ultima/tokens/tokens.stylex';
import type { PlainProps } from '@ultima/ui/lib/component';
import { createContext, use, useId } from 'react';

const styles = stylex.create({
  root: {
    blockSize: '100%',
    boxSizing: 'border-box',
    display: 'flex',
    fontFamily: font['--ult-font-sans'],
    inlineSize: '100%',
    margin: 0,
  },
  // The machine leaves the trigger a zero-area element, so the file paints the hairline and
  // stretches the hit area to a full space step past it with a ::before, Drawer's SwipeArea answer.
  handle: {
    alignItems: 'center',
    backgroundColor: color['--ult-color-border'],
    boxSizing: 'border-box',
    display: 'flex',
    fontFamily: font['--ult-font-sans'],
    justifyContent: 'center',
    margin: 0,
    position: 'relative',
    ':focus-visible': {
      outline: `${border.focus} solid ${color['--ult-color-border-focus']}`,
      outlineOffset: border.focusOffset,
    },
  },
  indicator: {
    alignItems: 'center',
    color: color['--ult-color-text-subtle'],
    display: 'flex',
    justifyContent: 'center',
    transform: { default: 'none', ':is([data-orientation="vertical"])': 'rotate(90deg)' },
  },
});

const orientations = stylex.create({
  horizontal: { flexDirection: 'row' },
  vertical: { flexDirection: 'column' },
});

const handleOrientations = stylex.create({
  horizontal: {
    blockSize: '100%',
    inlineSize: border.hairline,
    '::before': {
      content: '""',
      insetBlock: 0,
      insetInline: `calc((${border.hairline} - ${space['--ult-space-8']}) / 2)`,
      position: 'absolute',
    },
  },
  vertical: {
    blockSize: border.hairline,
    inlineSize: '100%',
    '::before': {
      content: '""',
      insetBlock: `calc((${border.hairline} - ${space['--ult-space-8']}) / 2)`,
      insetInline: 0,
      position: 'absolute',
    },
  },
});

type ResizableApi = ReturnType<typeof createApi>;

function createApi(service: splitter.Service) {
  return splitter.connect(service, normalizeProps);
}

const ResizableContext = createContext<ResizableApi | null>(null);
const HandleContext = createContext<{ id: splitter.ResizeTriggerId } | null>(null);

function useApi(caller: string): ResizableApi {
  const api = use(ResizableContext);
  if (!api) throw new Error(`${caller} must be used inside Resizable.Root`);
  return api;
}

function useResizable(): ResizableApi {
  return useApi('useResizable');
}

type ResizableOrientation = keyof typeof orientations;

type ResizableRootProps = PlainProps<'div'> &
  Omit<splitter.Props, 'id' | 'orientation'> & { orientation?: ResizableOrientation };

type ResizablePanelProps = PlainProps<'div'> & { id: splitter.PanelId };

type ResizableHandleProps = PlainProps<'div'> &
  splitter.ResizeTriggerProps & ({ 'aria-label': string } | { 'aria-labelledby': string });

type ResizableHandleIndicatorProps = PlainProps<'div'>;

function Root({ orientation = 'horizontal', style, ...props }: ResizableRootProps) {
  const generatedId = useId();
  const [machineProps, elementProps] = splitter.splitProps(props);
  const service = useMachine(splitter.machine, {
    ...machineProps,
    orientation,
    id: machineProps.id ?? generatedId,
  });
  const api = createApi(service);
  return (
    <ResizableContext value={api}>
      <div {...mergeProps(api.getRootProps(), stylex.props(styles.root, orientations[orientation], style), elementProps)} />
    </ResizableContext>
  );
}

function Panel({ id, style, ...props }: ResizablePanelProps) {
  const api = useApi('Resizable.Panel');
  return <div {...mergeProps(api.getPanelProps({ id }), stylex.props(style), props)} />;
}

function Handle({ id, disabled, style, ...props }: ResizableHandleProps) {
  const api = useApi('Resizable.Handle');
  return (
    <HandleContext value={{ id }}>
      <div
        {...mergeProps(
          api.getResizeTriggerProps({ id, disabled }),
          stylex.props(styles.handle, handleOrientations[api.orientation], style),
          props,
        )}
      />
    </HandleContext>
  );
}

function HandleIndicator({ style, children, ...props }: ResizableHandleIndicatorProps) {
  const api = useApi('Resizable.HandleIndicator');
  const handle = use(HandleContext);
  if (!handle) throw new Error('Resizable.HandleIndicator must be used inside Resizable.Handle');
  return (
    <div
      {...mergeProps(api.getResizeTriggerIndicator({ id: handle.id }), stylex.props(styles.indicator, style), props)}
      aria-hidden="true"
    >
      {children ?? <Grip />}
    </div>
  );
}

function Grip() {
  return (
    <svg viewBox="0 0 24 24" fill="none" width="1em" height="1em" aria-hidden="true">
      <circle cx="9" cy="5" r="1.5" fill="currentColor" />
      <circle cx="15" cy="5" r="1.5" fill="currentColor" />
      <circle cx="9" cy="12" r="1.5" fill="currentColor" />
      <circle cx="15" cy="12" r="1.5" fill="currentColor" />
      <circle cx="9" cy="19" r="1.5" fill="currentColor" />
      <circle cx="15" cy="19" r="1.5" fill="currentColor" />
    </svg>
  );
}

const Resizable = { Root, Panel, Handle, HandleIndicator };

export {
  Resizable,
  useResizable,
  type ResizableApi,
  type ResizableOrientation,
  type ResizableRootProps,
  type ResizablePanelProps,
  type ResizableHandleProps,
  type ResizableHandleIndicatorProps,
};
