import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';

import { ComingSoon } from './coming-soon';
import { ThemeRoot } from './theme';
import './styles.css';

const rootEl = document.getElementById('root');
if (!rootEl) throw new Error('#root is missing from index.html');

createRoot(rootEl).render(
  <StrictMode>
    <ThemeRoot>
      <ComingSoon />
    </ThemeRoot>
  </StrictMode>,
);
