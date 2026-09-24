import type { ReactDescriptor } from '../schema.ts';

export default {
  id: 'color-field',
  kind: 'react',
  title: 'Color Field',
  description: 'An opaque sRGB color control: a swatch trigger, a hex input, and a picker popover.',
  contract: 'docs/spec/theme-studio.md#studio-support-components-and-compositions',
  installDocs: 'import { ColorField } from \'@/components/ui/color-field\';\n\n<ColorField.Root defaultValue="#3366ff">\n  <ColorField.Swatch aria-label="Pick accent" />\n  <ColorField.Input aria-label="Hex" />\n  <ColorField.Portal>\n    <ColorField.Positioner sideOffset={8}>\n      <ColorField.Popup>\n        <ColorField.Picker />\n      </ColorField.Popup>\n    </ColorField.Positioner>\n  </ColorField.Portal>\n</ColorField.Root>\n\nThe value is an opaque sRGB #rrggbb string. size is sm, md, or lg on Root. Name the swatch with aria-label; the popup defaults to aria-label="Color picker". Input fills Field\'s control slot, so invalid hex carries the validation state. There is no alpha and no wide-gamut format.',
  primaryExport: 'ColorField',
  release: 'v0.2',
  order: 13,
} satisfies ReactDescriptor;
