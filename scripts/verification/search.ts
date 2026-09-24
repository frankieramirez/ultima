/**
 * `verify list --search`: deterministic token matching over features, scenarios and catalogue items.
 * An ID or name token ranks before an alias, an alias before title and description text, and the ID
 * breaks every tie. A match is a candidate to read, never a selection to run.
 */
import type { ItemSummary, JoinedFeature, JoinedScenario, VerificationModel } from './model.ts';

export type Field = 'id' | 'name' | 'alias' | 'title' | 'summary' | 'intent' | 'description';

export type Candidate = {
  type: 'feature' | 'scenario' | 'item';
  id: string;
  title: string;
  /** 0 for an ID or name, 1 for an alias, 2 for text. */
  tier: 0 | 1 | 2;
  reasons: { field: Field; value: string; tokens: string[] }[];
};

const STOPWORDS = new Set(
  'a an and are as at be but by do does for from has have i if in into is it its me my no not of on or our so that the their them then there this to up was we what when where which with you your'.split(' '),
);

const TIER: Record<Field, 0 | 1 | 2> = { id: 0, name: 0, alias: 1, title: 2, summary: 2, intent: 2, description: 2 };

/** Lowercased words, with a trailing plural `s` dropped so "overrides" meets "override". */
export function tokens(text: string): string[] {
  return (text.toLowerCase().match(/[a-z0-9]+/g) ?? []).map((word) =>
    word.length > 3 && word.endsWith('s') && !word.endsWith('ss') ? word.slice(0, -1) : word,
  );
}

function score(
  type: Candidate['type'],
  id: string,
  title: string,
  fields: [Field, string][],
  query: string[],
): Candidate | undefined {
  const reasons: Candidate['reasons'] = [];
  for (const [field, value] of fields) {
    const own = new Set(tokens(value));
    const matched = [...new Set(query.filter((token) => own.has(token)))];
    if (matched.length > 0) reasons.push({ field, value, tokens: matched });
  }
  if (reasons.length === 0) return undefined;
  const tier = Math.min(...reasons.map((reason) => TIER[reason.field])) as Candidate['tier'];
  return { type, id, title, tier, reasons };
}

const matchedCount = (candidate: Candidate) => new Set(candidate.reasons.flatMap((reason) => reason.tokens)).size;

export function search(model: VerificationModel, text: string): { query: string[]; candidates: Candidate[] } {
  const query = [...new Set(tokens(text).filter((token) => !STOPWORDS.has(token)))];
  const candidates: (Candidate | undefined)[] = [
    ...model.features.map((feature: JoinedFeature) =>
      score('feature', feature.id, feature.title, [
        ['id', feature.id],
        ['name', feature.title],
        ...feature.aliases.map((alias): [Field, string] => ['alias', alias]),
        ['summary', feature.summary],
      ], query),
    ),
    ...model.scenarios.map((scenario: JoinedScenario) =>
      score('scenario', scenario.id, scenario.title, [
        ['id', scenario.id],
        ...scenario.aliases.map((alias): [Field, string] => ['alias', alias]),
        ['title', scenario.title],
        ['intent', scenario.intent],
      ], query),
    ),
    ...model.items.map((item: ItemSummary) =>
      score('item', item.id, item.title, [
        ['id', item.id],
        ['name', item.title],
        ['description', item.description],
      ], query),
    ),
  ];
  return {
    query,
    candidates: candidates
      .filter((candidate): candidate is Candidate => candidate !== undefined)
      .sort((a, b) => a.tier - b.tier || matchedCount(b) - matchedCount(a) || a.id.localeCompare(b.id) || a.type.localeCompare(b.type)),
  };
}
