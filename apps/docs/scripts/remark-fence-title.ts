type MdNode = { type: string; meta?: string | null; data?: { hProperties?: Record<string, unknown> }; children?: MdNode[] };

const TITLE = /(?:^|\s)title="([^"]*)"/;

/**
 * Carries a fence's `title="…"` meta onto its `code` element, where the docs' `Pre` reads it as the
 * block's label (docs/spec/ultima.md, Authoring). MDX drops the meta string otherwise.
 */
export function remarkFenceTitle() {
  const visit = (node: MdNode) => {
    const title = node.type === 'code' ? TITLE.exec(node.meta ?? '')?.[1] : undefined;
    if (title) node.data = { ...node.data, hProperties: { ...node.data?.hProperties, title } };
    node.children?.forEach(visit);
  };
  return visit;
}
