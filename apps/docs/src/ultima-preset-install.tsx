import { useEffect, useState } from 'react';

import { Fence } from './prose';
import { ultimaPresetUrl } from './ultima-preset';

export function UltimaPresetInstall() {
  const [url, setUrl] = useState('');
  useEffect(() => {
    let active = true;
    void ultimaPresetUrl().then((result) => {
      if (active && !result.tooLong) setUrl(result.url);
    });
    return () => { active = false; };
  }, []);
  return url ? <Fence code={`npx shadcn add "${url}"`} lang="shell" title="Terminal" /> : <p>Preparing the Ultima preset command. You can also export the Ultima preset from <a href="/theme-studio">Theme Studio</a>.</p>;
}
