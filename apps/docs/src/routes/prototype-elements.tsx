// PROTOTYPE for https://github.com/frankieramirez/ultima/issues/153 — throwaway.
// Renders the built element artifacts inside the React tree: the JS registers
// the elements, the CSS is the document sheet for the light-DOM variant.
import { useEffect } from 'react';
import scriptUrl from '../../../../packages/ui/prototype/dist/ult-button.js?url';
import sheetUrl from '../../../../packages/ui/prototype/dist/ult-button.css?url';

declare module 'react' {
  namespace JSX {
    interface IntrinsicElements {
      'ult-button': UltButtonElementProps;
      'ult-button-shadow': UltButtonElementProps;
    }
  }
}

type UltButtonElementProps = React.HTMLAttributes<HTMLElement> & {
  variant?: 'solid' | 'outline' | 'ghost';
  tone?: 'accent' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  disabled?: boolean;
};

const matrix: Array<{ variant: 'solid' | 'outline' | 'ghost'; tone: 'accent' | 'danger' }> = [
  { variant: 'solid', tone: 'accent' },
  { variant: 'solid', tone: 'danger' },
  { variant: 'outline', tone: 'accent' },
  { variant: 'outline', tone: 'danger' },
  { variant: 'ghost', tone: 'accent' },
  { variant: 'ghost', tone: 'danger' },
];

export function PrototypeElements() {
  useEffect(() => {
    if (document.querySelector('script[data-ult-proto]')) return;
    const script = document.createElement('script');
    script.src = scriptUrl;
    script.dataset.ultProto = '';
    document.head.appendChild(script);
  }, []);

  return (
    <div style={{ padding: '2rem', display: 'grid', gap: '1rem' }}>
      <link rel="stylesheet" href={sheetUrl} />
      <h1>ult-button prototype (React tree)</h1>
      <p>
        The same built artifacts as <code>packages/ui/prototype/index.html</code>,
        rendered by React 19 as custom elements.
      </p>
      {matrix.map(({ variant, tone }) => (
        <div key={`${variant}-${tone}`} style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
          <code>
            {variant} {tone}
          </code>
          <ult-button variant={variant} tone={tone}>
            Light
          </ult-button>
          <ult-button-shadow variant={variant} tone={tone}>
            Shadow
          </ult-button-shadow>
          <ult-button variant={variant} tone={tone} disabled>
            Disabled
          </ult-button>
          <ult-button-shadow variant={variant} tone={tone} disabled>
            Disabled
          </ult-button-shadow>
        </div>
      ))}
      <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
        <code>sizes</code>
        <ult-button size="sm">sm</ult-button>
        <ult-button size="md">md</ult-button>
        <ult-button size="lg">lg</ult-button>
        <ult-button-shadow size="sm">sm</ult-button-shadow>
        <ult-button-shadow size="md">md</ult-button-shadow>
        <ult-button-shadow size="lg">lg</ult-button-shadow>
      </div>
    </div>
  );
}
