import type { BlockDescriptor } from '../schema.ts';

export default {
  id: 'settings-01',
  kind: 'block',
  title: 'Settings 01',
  description: 'A Notifications settings page: a settings sidebar beside one form of switches, push choices and quiet hours, with an unsaved-changes bar.',
  contract: 'docs/spec/ultima.md#settings-01',
  installDocs:
    "Render it from a route of your own: import { Settings01 } from '@/components/settings-01/settings-01'. Saving only moves the current values into the block's saved state; persist them from the submit handler in notifications-form.tsx. The sidebar links have no handler of their own.",
  primaryExport: 'Settings01',
  recipes: [],
} satisfies BlockDescriptor;
