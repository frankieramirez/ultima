import type { Group } from './schema.ts';

export default [
  { id: 'forms', label: 'Forms' },
  { id: 'overlays', label: 'Overlays' },
  { id: 'data-display', label: 'Data display' },
  { id: 'navigation', label: 'Navigation' },
  { id: 'feedback', label: 'Feedback' },
  { id: 'layout', label: 'Layout' },
] as const satisfies readonly Group[];
