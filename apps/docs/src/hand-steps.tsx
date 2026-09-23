import { setupItems } from '../../../registry/items.config';
import { proseComponents } from './prose';

const { ol: Ol, li: Li, code: Code } = proseComponents;

export function HandSteps({ item }: { item: keyof typeof setupItems }) {
  return (
    <Ol>
      {setupItems[item].handSteps.map(({ prose }) => (
        <Li key={prose}>
          {prose.split('`').map((part, index) => (index % 2 === 1 ? <Code key={index}>{part}</Code> : part))}
        </Li>
      ))}
    </Ol>
  );
}
