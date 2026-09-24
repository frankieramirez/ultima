import type { ReactDescriptor } from '../schema.ts';

export default {
  id: 'avatar',
  kind: 'react',
  title: 'Avatar',
  description: 'An image that falls back to whatever you put behind it, at whatever size you set.',
  contract: 'docs/spec/ultima.md#the-toggle-accordion-avatar-and-scroll-area-set',
  installDocs: 'import { Avatar } from \'@/components/ui/avatar\';\n\n<Avatar.Root>\n  <Avatar.Fallback>FR</Avatar.Fallback>\n  <Avatar.Image src="/avatar.png" alt="Frankie" />\n</Avatar.Root>\n\nFallback goes before Image in DOM order; the not-yet-loaded image is hidden with visibility, never display, so keepMounted and lazy loading work. alt is yours: empty beside a visible name, a name when the avatar stands alone. The box and the radius are the style slot: there is no size or shape prop.',
  primaryExport: 'Avatar',
  release: 'v0.2',
  order: 10,
} satisfies ReactDescriptor;
