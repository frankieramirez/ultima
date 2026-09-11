# 7. A composition that needs an engine ships as a recipe

Date: 2026-09-11

## Context

Base UI supplies roles, ARIA state, keyboard handling, and focus management, which is what ADR 0002 adopted it for. Some v0.2 entries need something else: a row model, a date model, a scale and a layout. Base UI ships none of those, and the spec's v0.2 section already says Calendar and Chart may need capabilities beyond it.

Data Table is the first entry to reach that line. Its engine is TanStack Table, which is headless: it owns state and row models and renders no DOM and no styles, so it fits the StyleX-only contract where most candidates do not. It supplies no accessibility at all. Its own documentation says so, and so does the skill shipped inside the package: "Table produces models and state; React owns the semantic markup, styles, event affordances, and accessibility."

Two shapes were on the table. A `data-table` registry item would import the engine, which makes every consumer of that one item install it, and `scripts/build-registry.ts` derives that dependency from the import with no way to mark it optional. It would also have to own a column-definition API, and TanStack's `ColumnDef` already is one. TanStack v9 makes that worse: features are registered statically and the table's type is computed from the registration, so APIs for an omitted feature do not exist. A generic item either registers every feature, defeating the opt-in design, or threads the feature set through Ultima's public API as a type parameter.

The alternative was a documented recipe. shadcn/ui, whose distribution model Ultima's is built on, ships no `data-table` item for the same reason, stated on its own page: combining the variations into one component loses the flexibility headless UI provides. Its guide has the consumer install `table` and then `@tanstack/react-table` themselves.

That guide also shows what a recipe gets wrong when nobody owns the contract. It has no `aria-sort` anywhere, no announcement after sorting, filtering, or paginating, and it names every row checkbox with the same constant string, so no row is individually identified.

## Decision

A composition whose behavior needs an engine rather than an interactive primitive ships as a documented recipe, and the engine is the consumer's dependency rather than Ultima's.

The controls such a recipe composes are not exempt. Where the recipe hands the user a control, that control's element, ARIA, keyboard handling, and focus ring come from the catalogue, exactly as the line between a component and page layout requires of the docs site. The engine stays outside; the accessible surface comes inside.

An engine must still be headless, rendering no DOM and no styles, or it is not a candidate at all.

## Consequences

No Ultima registry item gains an engine dependency, so the derived `dependencies` of every item stay what a component's own imports put there, and a consumer installing one component never installs a data layer.

ADR 0002 is unchanged and needs no amendment or exception. An engine supplies none of the four things that ADR names, and the controls a recipe composes are Base UI components like any other.

The cost lands on the docs. A recipe entry carries no installable unit, so its copyable example is the whole contract, and the spec already requires that example to name its component dependencies and to be covered by the applicable checks. A recipe that ships an inaccessible example fails in a way a component's test file would have caught, which is why the controls move into the catalogue rather than staying in the guide.

The policy decides Calendar and Chart before they are specified, and they may yet produce an engine that is not headless, which this ADR rules out rather than leaving open.

Recorded on [What Data Table is built on, and what that dependency costs a consumer](https://linear.app/frankie-ramirez/issue/ULT-72).

## Amendment (2026-09-11)

Recorded on [What Ultima documents as its form integration](https://linear.app/frankie-ramirez/issue/ULT-78). A form library is an engine by this ADR's own test, so the ADR decides its shape and needs no companion. React Hook Form, TanStack Form, and Formisch were each checked against their published builds: none renders styles, the DOM any of them can render is a single optional `<form>` element, and none emits a single `aria-*` attribute. The gate rules none of them out and ADR 0002's scope is again untouched.

What generalises is the scope. The decision above is written for a composition whose behavior *needs* an engine, and no v0.1 entry needs one. Field is complete on Base UI and the platform's constraint validation, and a form library is a capability a consumer may add on top of it. The policy covers both cases: an optional engine is still the consumer's dependency, still ships as a recipe, and still has to be headless.

One consequence is new. An optional engine never reaches the component's source **or** its props. The wiring is the primitive's own external-state props, which the component passes through like any other, and the recipe does the connecting, so Field exposes `invalid`, `dirty`, and `touched` from the day it ships and gains nothing when the recipe lands. A component that grew a prop for an engine would put that engine in its public API without putting it in its derived `dependencies`, which is worse than either half.
