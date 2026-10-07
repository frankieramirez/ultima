import type { ReactDescriptor } from '../schema.ts';

export default {
  id: 'resizable',
  kind: 'react',
  title: 'Resizable',
  description: 'Panels with boundaries you drag or arrow, on Zag.',
  contract: 'docs/spec/ultima.md#the-aspect-ratio-and-resizable-set',
  installDocs: 'import { Resizable } from \'@/components/ui/resizable\';\n\n<Resizable.Root panels={[{ id: \'nav\' }, { id: \'main\' }]}>\n  <Resizable.Panel id="nav">Navigation</Resizable.Panel>\n  <Resizable.Handle id="nav:main" aria-label="Resize navigation">\n    <Resizable.HandleIndicator />\n  </Resizable.Handle>\n  <Resizable.Panel id="main">Content</Resizable.Panel>\n</Resizable.Root>\n\nEvery Handle needs a name: the type requires one of aria-label or aria-labelledby, the system\'s fourth enforced attribute. Sizing metadata (minSize, maxSize, collapsible, collapsedSize) lives on each panels entry, defaultSize sizes them at mount, and keyboardResizeBy sets the arrow step. The machine owns the panels\' layout inline styles, including overflow: hidden. A strict CSP needs the nonce prop for the drag cursor <style>.',
  primaryExport: 'Resizable',
  release: 'v0.2',
  order: 22,
  group: 'layout',
} satisfies ReactDescriptor;
