import type { ReactDescriptor } from '../schema.ts';

export default {
  id: 'native-select',
  kind: 'react',
  title: 'Native Select',
  description: 'A styled native select: the platform popup, the mobile picker, and native optgroup and multiple.',
  contract: 'docs/spec/ultima.md#the-button-group-input-group-input-otp-and-native-select-set',
  installDocs: 'import { NativeSelect } from \'@/components/ui/native-select\';\n\n<label htmlFor="fruit">Fruit</label>\n<NativeSelect.Root>\n  <NativeSelect.Select id="fruit">\n    <option value="apple">Apple</option>\n    <option value="pear">Pear</option>\n  </NativeSelect.Select>\n</NativeSelect.Root>\n\nOptions and optgroups are children, not parts. Select is Field.Control rendered as a <select>, so inside a Field.Root the label, description, and invalid state reach it on their own. Reach for it when the OS-native popup is the point; Select stays the default when the option list wants Ultima\'s overlay styling.',
  primaryExport: 'NativeSelect',
  release: 'v0.2',
  order: 21,
  group: 'forms',
  replaces: { elements: ['select'] },
} satisfies ReactDescriptor;
