import type { ComponentType } from 'react';

/**
 * A part that passes the two Anatomy attributes to its element, under the docs only, per
 * [Anatomy](../../../docs/spec/ultima.md#anatomy). Attributes the caller passes win, so a `render`
 * target such as `<Dialog.Close render={<Button />}>` is labelled as the part that renders it.
 */
export function mark<Part>(part: Part, item: string, name: string): Part {
  const Source = part as ComponentType<Record<string, unknown>>;
  function Marked(props: Record<string, unknown>) {
    return <Source data-anatomy-item={item} data-anatomy-part={name} {...props} />;
  }
  Marked.displayName = name;
  return Marked as Part;
}
