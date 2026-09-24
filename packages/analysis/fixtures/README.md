# Checker fixtures

Deliberately invalid and valid sources for `@ultima/analysis`. The tests in `src/__tests__/` mount each
file over a path in the real repository and assert the diagnostics the checker reports there. These files
are never production sources: the workspace scope classifies this directory as `fixture`, and the package
typecheck excludes it.

`consumer/` holds two consumer programs the API tests compile against the real public types: `valid.tsx`
must compile clean, and every line of `invalid.tsx` marked `expect TS<code>` must receive that diagnostic
and no other.
