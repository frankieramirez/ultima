'use client';

import * as stylex from '@stylexjs/stylex';
import { color, font, space, text } from '@ultima/tokens/tokens.stylex';
import { Button } from '@ultima/ui/button';
import { Sidebar, useSidebar } from '@ultima/ui/sidebar';
import { Toast } from '@ultima/ui/toast';
import { useState } from 'react';

import { MenuGlyph } from './icons';
import { type NotificationValues, NotificationsForm } from './notifications-form';
import { SettingsSidebar } from './settings-sidebar';

const initialValues: NotificationValues = {
  productUpdates: true,
  weeklyDigest: true,
  mentions: true,
  marketing: false,
  push: 'mentions',
  quietFrom: '22:00',
  quietTo: '07:30',
  timeZone: 'Europe/Oslo',
};

const DESKTOP = '@media (min-width: 48rem)';

const styles = stylex.create({
  root: {
    boxSizing: 'border-box',
    color: color['--ult-color-text'],
    display: 'flex',
    fontFamily: font['--ult-font-sans'],
    minBlockSize: '100dvh',
  },
  main: {
    boxSizing: 'border-box',
    display: 'flex',
    flexDirection: 'column',
    flexGrow: 1,
    gap: space['--ult-space-6'],
    minInlineSize: 0,
    paddingBlockStart: { default: space['--ult-space-6'], [DESKTOP]: space['--ult-space-10'] },
    paddingInline: { default: space['--ult-space-6'], [DESKTOP]: space['--ult-space-11'] },
  },
  topRow: {
    alignItems: 'center',
    display: 'flex',
    fontSize: text['--ult-text-4'],
    fontWeight: font['--ult-font-weight-semibold'],
    gap: space['--ult-space-4'],
  },
  toastText: {
    display: 'flex',
    flexGrow: 1,
    minInlineSize: 0,
  },
});

export function Settings01() {
  const [saved, setSaved] = useState(initialValues);
  const [values, setValues] = useState(initialValues);

  return (
    <Toast.Provider>
      <Sidebar.Root style={styles.root}>
        <SettingsSidebar />
        <main {...stylex.props(styles.main)}>
          <MobileNavRow />
          <NotificationsForm saved={saved} values={values} onValuesChange={setValues} onSavedChange={setSaved} />
        </main>
      </Sidebar.Root>
      <Toast.Portal>
        <Toast.Viewport>
          <Toasts />
        </Toast.Viewport>
      </Toast.Portal>
    </Toast.Provider>
  );
}

function MobileNavRow() {
  if (!useSidebar().isMobile) return null;
  return (
    <div {...stylex.props(styles.topRow)}>
      <Sidebar.Trigger render={<Button variant="ghost" size="sm" aria-label="Open settings navigation" />}>
        <MenuGlyph />
      </Sidebar.Trigger>
      Settings
    </div>
  );
}

function Toasts() {
  const { toasts } = Toast.useToastManager();
  return toasts.map((toast) => (
    <Toast.Root key={toast.id} toast={toast}>
      <Toast.Content>
        <Toast.Title style={styles.toastText} />
        <Toast.Close render={<Button variant="ghost" size="sm" />}>Dismiss</Toast.Close>
      </Toast.Content>
    </Toast.Root>
  ));
}
