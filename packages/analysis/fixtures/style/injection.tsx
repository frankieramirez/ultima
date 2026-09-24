'use client'; import * as stylex from '@stylexjs/stylex';

function Separator({ style }: import('@ultima/ui/lib/component').PlainProps<'hr'>) {
  const sheet = document.createElement('style');
  sheet.textContent = 'hr { margin: 0; }';
  document.adoptedStyleSheets = [new CSSStyleSheet()];
  return (
    <>
      <style>{'hr { border: 0; }'}</style>
      <link rel="stylesheet" href="/separator.css" />
      <hr {...stylex.props(style)} />
    </>
  );
}

export { Separator };
