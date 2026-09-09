declare module '*.mdx' {
  import type { MDXComponents } from 'mdx/types';
  import type { ComponentType } from 'react';

  const MDXComponent: ComponentType<{ components?: MDXComponents }>;
  export default MDXComponent;
}
