'use client';

function Separator() {
  const sheet = document.createElement('style');
  sheet.textContent = 'hr { margin: 0; }';
  document.adoptedStyleSheets = [new CSSStyleSheet()];
  return (
    <>
      <style>{'hr { border: 0; }'}</style>
      <link rel="stylesheet" href="/separator.css" />
      <hr />
    </>
  );
}

export { Separator };
