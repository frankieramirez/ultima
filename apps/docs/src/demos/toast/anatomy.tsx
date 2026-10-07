import * as stylex from '@stylexjs/stylex';
import { space } from '@ultima/tokens/tokens.stylex';
import { Button, Toast } from '@ultima/ui';
import { useEffect, useState } from 'react';

const styles = stylex.create({
  stage: {
    blockSize: '10rem',
    inlineSize: 'min(28rem, 100cqi)',
    isolation: 'isolate',
    position: 'relative',
  },
  sizedToFrontmostToast: {
    blockSize: 'var(--toast-frontmost-height)',
    position: 'absolute',
  },
  text: {
    display: 'flex',
    flex: 1,
    flexDirection: 'column',
    gap: space['--ult-space-2'],
    minWidth: 0,
  },
});

export default function ToastAnatomy() {
  // Base UI's portal reads a ref object before this div's ref is set, so the stage is state and the portal waits on `null`.
  const [stage, setStage] = useState<HTMLDivElement | null>(null);
  return (
    <div ref={setStage} {...stylex.props(styles.stage)}>
      <Toast.Provider timeout={0}>
        <Toast.Portal container={stage}>
          <Toast.Viewport style={styles.sizedToFrontmostToast}>
            <Stack />
          </Toast.Viewport>
        </Toast.Portal>
      </Toast.Provider>
    </div>
  );
}

function Stack() {
  const { toasts, add } = Toast.useToastManager();
  // A fixed id makes the second add under Strict Mode an update rather than a second toast.
  useEffect(() => {
    add({ id: 'anatomy', title: 'Report exported', description: 'Saved to your downloads.', type: 'success' });
  }, [add]);

  return toasts.map((toast) => (
    <Toast.Root key={toast.id} toast={toast}>
      <Toast.Content>
        <div {...stylex.props(styles.text)}>
          <Toast.Title />
          <Toast.Description />
        </div>
        <Toast.Action render={<Button variant="ghost" size="sm" />}>Undo</Toast.Action>
        <Toast.Close render={<Button variant="ghost" size="sm" />}>Dismiss</Toast.Close>
      </Toast.Content>
    </Toast.Root>
  ));
}
