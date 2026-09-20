import * as stylex from '@stylexjs/stylex';
import { color, space, text } from '@ultima/tokens/tokens.stylex';
import { Resizable } from '@ultima/ui';

const styles = stylex.create({
  bounds: { blockSize: '12rem' },
  pane: {
    alignItems: 'center',
    blockSize: '100%',
    color: color['--ult-color-text-subtle'],
    display: 'flex',
    fontSize: text['--ult-text-4'],
    justifyContent: 'center',
    padding: space['--ult-space-4'],
  },
});

export default function BasicResizable() {
  return (
    <Resizable.Root panels={[{ id: 'nav' }, { id: 'editor' }, { id: 'console' }]} style={styles.bounds}>
      <Resizable.Panel id="nav">
        <div {...stylex.props(styles.pane)}>Navigation</div>
      </Resizable.Panel>
      <Resizable.Handle id="nav:editor" aria-label="Resize navigation">
        <Resizable.HandleIndicator />
      </Resizable.Handle>
      <Resizable.Panel id="editor">
        <div {...stylex.props(styles.pane)}>Editor</div>
      </Resizable.Panel>
      <Resizable.Handle id="editor:console" aria-label="Resize console">
        <Resizable.HandleIndicator />
      </Resizable.Handle>
      <Resizable.Panel id="console">
        <div {...stylex.props(styles.pane)}>Console</div>
      </Resizable.Panel>
    </Resizable.Root>
  );
}
