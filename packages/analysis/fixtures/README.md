# Checker fixtures

Deliberately invalid and valid sources for `@ultima/analysis`. The tests in `src/__tests__/` mount each
file over a path in the real repository and assert the diagnostics the checker reports there. These files
are never production sources: the workspace scope classifies this directory as `fixture`, and the package
typecheck excludes it.
