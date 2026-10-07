import type { ReactDescriptor } from '../schema.ts';

export default {
  id: 'slider',
  kind: 'react',
  title: 'Slider',
  description: 'A value picker with one thumb per value and an accent fill, on Base UI.',
  contract: 'docs/spec/ultima.md#the-v01-set',
  installDocs: "import { Slider } from '@/components/ui/slider';\n\n<Slider.Root defaultValue={40}>\n  <Slider.Label>Volume</Slider.Label>\n  <Slider.Value />\n  <Slider.Control>\n    <Slider.Track>\n      <Slider.Indicator />\n      <Slider.Thumb />\n    </Slider.Track>\n  </Slider.Control>\n</Slider.Root>\n\nFor a range, pass an array to defaultValue and render one Thumb per value with its own index.",
  primaryExport: 'Slider',
  release: 'v0.1',
  order: 7,
  group: 'forms',
  replaces: { elements: ['input[type=range]'], roles: ['slider'] },
} satisfies ReactDescriptor;
