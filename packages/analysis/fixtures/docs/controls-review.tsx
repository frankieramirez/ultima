// A plain element carrying handlers or a tab stop is ambiguous: ULT-DOCS-REVIEW-001 asks, and never fails the run.
export function Ambiguous({ onPick }: { onPick: () => void }) {
  return (
    <ul>
      <li onClick={onPick}>Pick</li>
      <li tabIndex={0}>Focus</li>
    </ul>
  );
}
