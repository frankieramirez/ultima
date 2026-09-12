import { ArrowUpRightIcon, DotsThreeIcon } from '@phosphor-icons/react';
import * as stylex from '@stylexjs/stylex';
import { color, font, radius, space, text } from '@ultima/tokens/tokens.stylex';
import { Button, Card, Code, Dialog, DropdownMenu, Input, Separator, Stat, Switch, Tabs } from '@ultima/ui';
import { useState } from 'react';

import source from './playground?raw';
import { actionStyles } from './action';



const styles = stylex.create({
  root: { minInlineSize: 0 },
  toolbar: {
    alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between',
    paddingBlock: space['--ult-space-4'], paddingInline: space['--ult-space-7'],
  },
  mono: { color: color['--ult-color-accent-text'], fontFamily: font['--ult-font-mono'], fontSize: text['--ult-text-2'] },
  controls: { alignItems: 'center', display: 'flex', gap: space['--ult-space-2'] },
  viewButton: { fontFamily: font['--ult-font-mono'], fontSize: text['--ult-text-2'], fontWeight: font['--ult-font-weight-regular'] },
  preview: {
    display: 'grid', gap: space['--ult-space-9'],
    gridTemplateColumns: { default: 'minmax(0, 1fr)', '@media (min-width: 80rem)': 'minmax(0, 2.5fr) minmax(0, 1fr)' },
    padding: { default: space['--ult-space-6'], '@media (min-width: 48rem)': space['--ult-space-9'] },
  },
  project: {
    display: 'flex', flexDirection: 'column', gap: space['--ult-space-8'], minInlineSize: 0,
    padding: { default: space['--ult-space-6'], '@media (min-width: 48rem)': `calc(${space['--ult-space-7']} + ${space['--ult-space-4']})` },
  },
  projectHead: { alignItems: 'start', display: 'flex', justifyContent: 'space-between', gap: space['--ult-space-4'] },
  projectCopy: { display: 'flex', flexDirection: 'column', gap: space['--ult-space-8'] },
  title: { fontSize: text['--ult-text-8'], fontWeight: font['--ult-font-weight-medium'] },
  desc: { color: color['--ult-color-text-muted'], fontSize: text['--ult-text-4'], lineHeight: font['--ult-font-leading-normal'], margin: 0 },
  overview: { display: 'flex', flexDirection: 'column', gap: space['--ult-space-8'] },
  stats: { display: 'grid', gap: space['--ult-space-4'], gridTemplateColumns: '1fr 1fr' },
  stat: { gap: space['--ult-space-5'] },
  statLabel: { color: color['--ult-color-text-muted'], fontSize: text['--ult-text-2'], letterSpacing: font['--ult-font-tracking-normal'], textTransform: 'none' },
  statValue: { fontSize: '2rem', fontWeight: font['--ult-font-weight-regular'] },
  chart: { alignItems: 'end', display: 'flex', gap: space['--ult-space-3'], height: `calc(2 * ${space['--ult-space-10']})` },
  bar: { backgroundColor: color['--ult-color-success'], borderRadius: radius['--ult-radius-xs'], flex: 1 },
  recentBar: { backgroundColor: color['--ult-color-success-active'] },
  status: { color: color['--ult-color-success-text'], fontFamily: font['--ult-font-mono'], fontSize: text['--ult-text-1'], margin: 0 },
  footer: { alignItems: 'center', display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', gap: space['--ult-space-6'] },
  source: { margin: space['--ult-space-6'], maxHeight: '36rem', overflow: 'auto' },
  theme: { display: 'flex', flexDirection: 'column', gap: space['--ult-space-8'], minInlineSize: 0, paddingBlock: space['--ult-space-4'] },
  file: { color: color['--ult-color-text'], fontFamily: font['--ult-font-mono'], fontSize: text['--ult-text-2'], margin: 0 },
  themeCode: { color: color['--ult-color-accent-text'], fontFamily: font['--ult-font-mono'], fontSize: text['--ult-text-2'], lineHeight: '2', margin: 0, whiteSpace: 'pre-wrap', overflowWrap: 'anywhere' },
  note: { color: color['--ult-color-text-muted'], fontSize: text['--ult-text-4'], lineHeight: font['--ult-font-leading-relaxed'], margin: 0 },
  dots: { display: 'flex', gap: space['--ult-space-4'] },
  dot: { borderRadius: radius['--ult-radius-full'], display: 'block', height: space['--ult-space-8'], width: space['--ult-space-8'] },
  dotAccent: { backgroundColor: color['--ult-color-accent'] },
  dotSuccess: { backgroundColor: color['--ult-color-success-text'] },
  dotWarning: { backgroundColor: color['--ult-color-warning'] },
  dotDanger: { backgroundColor: color['--ult-color-danger'] },
  events: { color: color['--ult-color-text-muted'], fontSize: text['--ult-text-4'], lineHeight: font['--ult-font-leading-relaxed'], margin: 0, paddingInlineStart: space['--ult-space-7'] },
  form: { display: 'flex', flexDirection: 'column', gap: space['--ult-space-5'], maxWidth: '24rem' },
  field: { display: 'flex', flexDirection: 'column', gap: space['--ult-space-2'] },
  label: { color: color['--ult-color-text-muted'], fontSize: text['--ult-text-3'] },
  setting: { alignItems: 'center', display: 'flex', justifyContent: 'space-between' },
});

const live = stylex.create({ height: (value: number) => ({ height: `${value / 80 * 100}%` }) });
const heights = [25, 37, 31, 45, 39, 58, 48, 64, 55, 72, 62, 76];
const themeCode = `// Ultima semantic tokens

color['--ult-color-surface']
color['--ult-color-accent']
color['--ult-color-text']

// Override with
stylex.createTheme(color, {
  /* your theme */
});`;

export default function Playground() {
  const [view, setView] = useState<'preview' | 'code'>('preview');
  const [tab, setTab] = useState('overview');
  const [published, setPublished] = useState(false);
  const [dialog, setDialog] = useState(false);
  const [projectName, setProjectName] = useState('Your next big thing');
  const [notifications, setNotifications] = useState(true);

  return (
    <Card.Root style={styles.root} role="region" aria-label="Interactive project preview">
      <Card.Header style={styles.toolbar}>
        <span {...stylex.props(styles.mono)}>--playground</span>
        <div {...stylex.props(styles.controls)}>
          <Button variant="ghost" size="sm" style={styles.viewButton} aria-pressed={view === 'preview'} onClick={() => setView('preview')}>Preview</Button>
          <span aria-hidden {...stylex.props(styles.mono)}>/</span>
          <Button variant="ghost" size="sm" style={styles.viewButton} aria-pressed={view === 'code'} onClick={() => setView('code')}>Code</Button>
          <Button variant="ghost" size="sm" nativeButton={false} render={<a href="/components/card" />} aria-label="Open Card component"><ArrowUpRightIcon aria-hidden /></Button>
        </div>
      </Card.Header>
      <Separator />
      {view === 'code' ? <Code variant="block" style={styles.source}>{source}</Code> : (
        <div {...stylex.props(styles.preview)}>
          <Card.Root style={styles.project}>
            <div {...stylex.props(styles.projectHead)}>
              <div {...stylex.props(styles.projectCopy)}>
                <Card.Title render={<h2 />} style={styles.title}>{projectName}</Card.Title>
                <p {...stylex.props(styles.desc)}>A little structure. Unlimited possibility.</p>
              </div>
              <DropdownMenu.Root>
                <DropdownMenu.Trigger render={<Button variant="ghost" size="sm" aria-label="Project actions" />}><DotsThreeIcon aria-hidden /></DropdownMenu.Trigger>
                <DropdownMenu.Portal>
                  <DropdownMenu.Positioner sideOffset={4}>
                    <DropdownMenu.Popup>
                      <DropdownMenu.Item onClick={() => setTab('settings')}>Rename project</DropdownMenu.Item>
                      <DropdownMenu.Item onClick={() => { setProjectName('Your next big thing'); setPublished(false); setNotifications(true); setTab('overview'); }}>Reset preview</DropdownMenu.Item>
                    </DropdownMenu.Popup>
                  </DropdownMenu.Positioner>
                </DropdownMenu.Portal>
              </DropdownMenu.Root>
            </div>
            <Tabs.Root value={tab} onValueChange={(value) => setTab(String(value))}>
              <Tabs.List aria-label="Project sections">
                <Tabs.Tab value="overview">Overview</Tabs.Tab>
                <Tabs.Tab value="activity">Activity</Tabs.Tab>
                <Tabs.Tab value="settings">Settings</Tabs.Tab>
                <Tabs.Indicator />
              </Tabs.List>
              <Tabs.Panel value="overview">
                <div {...stylex.props(styles.overview)}>
                  <div {...stylex.props(styles.stats)}>
                    <Stat.Root style={styles.stat}><Stat.Label style={styles.statLabel}>Total views</Stat.Label><Stat.Value style={styles.statValue}>24,892</Stat.Value></Stat.Root>
                    <Stat.Root style={styles.stat}><Stat.Label style={styles.statLabel}>Conversion</Stat.Label><Stat.Value style={styles.statValue}>8.4%</Stat.Value></Stat.Root>
                  </div>
                  <div role="img" aria-label="Activity over twelve days: 25, 37, 31, 45, 39, 58, 48, 64, 55, 72, 62, and 76 percent." {...stylex.props(styles.chart)}>
                    {heights.map((height, index) => <span key={index} {...stylex.props(styles.bar, index >= 9 && styles.recentBar, live.height(height))} />)}
                  </div>
                  <div {...stylex.props(styles.footer)}>
                    <p role="status" aria-atomic="true" {...stylex.props(styles.status)}>● {published ? 'Project published' : 'All systems ready'}</p>
                    <Button style={actionStyles.root} onClick={() => setDialog(true)}>Publish project <ArrowUpRightIcon aria-hidden /></Button>
                  </div>
                </div>
              </Tabs.Panel>
              <Tabs.Panel value="activity">
                <ul {...stylex.props(styles.events)}><li>Today · Preview opened</li><li>Yesterday · Project updated</li><li>Monday · New interface created</li></ul>
              </Tabs.Panel>
              <Tabs.Panel value="settings">
                <div {...stylex.props(styles.form)}>
                  <label {...stylex.props(styles.field)}><span {...stylex.props(styles.label)}>Project name</span><Input value={projectName} onChange={(event) => setProjectName(event.target.value)} /></label>
                  <label {...stylex.props(styles.setting)}><span {...stylex.props(styles.label)}>Notifications</span><Switch.Root checked={notifications} onCheckedChange={setNotifications}><Switch.Thumb /></Switch.Root></label>
                </div>
              </Tabs.Panel>
            </Tabs.Root>
          </Card.Root>
          <div {...stylex.props(styles.theme)}>
            <p {...stylex.props(styles.file)}>theme.stylex.ts</p>
            <pre {...stylex.props(styles.themeCode)}>{themeCode}</pre>
            <div aria-hidden {...stylex.props(styles.dots)}>
              {[styles.dotAccent, styles.dotSuccess, styles.dotWarning, styles.dotDanger].map((tone, index) => <span key={index} {...stylex.props(styles.dot, tone)} />)}
            </div>
            <p {...stylex.props(styles.note)}>Mithril surfaces. Arcane accents.<br />Shared across every component.</p>
          </div>
        </div>
      )}
      <Dialog.Root open={dialog} onOpenChange={setDialog}>
        <Dialog.Portal><Dialog.Backdrop /><Dialog.Viewport><Dialog.Popup>
          <Dialog.Title>Publish project</Dialog.Title>
          <Dialog.Description>This local demo will mark “{projectName}” as published.</Dialog.Description>
          <div {...stylex.props(styles.controls)}>
            <Dialog.Close render={<Button variant="ghost" />}>Cancel</Dialog.Close>
            <Button onClick={() => { setPublished(true); setDialog(false); }}>Publish</Button>
          </div>
        </Dialog.Popup></Dialog.Viewport></Dialog.Portal>
      </Dialog.Root>
    </Card.Root>
  );
}
