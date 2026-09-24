# What GitHub changes when the repository goes public

## Findings

Going public clears both halves of the CI enforcement gap recorded on #562. Standard GitHub-hosted runners are free in public repositories, so the billing state that stops jobs from starting no longer applies to `ci.yml`, `smoke-install.yml`, or `release-cli.yml`, all of which use `ubuntu-latest`. On a personal account, GitHub Free covers public repositories with the full feature set. Protected branches in private repositories need GitHub Pro, which explains why `branches/main/protection` returned 404. Once the repo is public, a `main` ruleset that requires `check` and `production` can be created without a paid plan. That is the restoration condition #562 names.

Larger runners are always billed, even in public repositories. Every Ultima workflow uses standard runners, so none of them are affected.

The switch also turns on, at no cost:

- Secret scanning, which runs automatically for free on public repositories. Push protection is part of the same feature set.
- GitHub Advanced Security features, including code scanning, which the repository gains automatically on becoming public.
- Private vulnerability reporting, which owners of public repositories can enable. It gives a SECURITY policy a reporting channel without a published email address.
- Deployment protection rules for public repositories, which is relevant to the `cli-v*` release workflow's environment.

What happens on the switch, and what it costs:

- All code, history, issues and pull requests on every branch become visible to anyone. That includes the private Linear links in the spec and every closed map and ticket.
- Actions history and logs become visible to everyone. Runs can be deleted beforehand through the workflow-runs API.
- Stars and watchers are erased. Anyone can fork.
- All push rulesets are disabled. The repository has none today (`rules/branches/main` is `[]`), so nothing is lost.
- The change is published as activity.
- Private forks are detached into standalone private repositories.

Making the repo private again later is possible, but it does not undo exposure. Public forks stay public and are detached, and anything already cloned or cached stays out there. Treat the switch as irreversible for content.

Facts later tickets need:

- The history scan ticket has to finish before the switch, because the switch exposes every ref and GitHub's own secret scanning only reports after exposure.
- The readiness bar can require a green remote `check` and `production` run. After the switch, that requirement costs nothing and becomes achievable.
- The runbook needs a step to create the `main` ruleset after the first green remote run. Creating it earlier would block merges on checks that have never reported.
- The community files decision can point SECURITY at private vulnerability reporting.

## Sources

- https://docs.github.com/en/billing/concepts/product-billing/github-actions: Actions usage is free for public repositories on standard GitHub-hosted runners; larger runners are always charged; private repositories use a plan quota and block when it runs out without a valid payment method.
- https://docs.github.com/en/get-started/learning-about-github/githubs-plans: GitHub Free covers public repositories with a full feature set; protected branches in private repositories are a GitHub Pro feature; deployment protection rules apply to public repositories on Free.
- https://docs.github.com/en/repositories/managing-your-repositorys-settings-and-features/managing-repository-settings/setting-repository-visibility: consequences of private to public (visible code, forks, push rulesets disabled, activity published, Actions logs visible, stars and watchers erased, automatic Advanced Security access, private forks detached).
- https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/managing-rulesets/about-rulesets: rulesets and branch protection layer together; enforcement status can be switched without deleting a ruleset.
- https://docs.github.com/en/code-security/secret-scanning/introduction/about-secret-scanning: secret scanning runs automatically for free on public repositories.
- https://docs.github.com/en/code-security/security-advisories/working-with-repository-security-advisories/configuring-private-vulnerability-reporting-for-a-repository: owners of public repositories can enable private vulnerability reporting.
- `docs/evidence/handoff/README.md` and PR #562: the recorded state (`branches/main/protection` 404, `rules/branches/main` `[]`, Actions jobs cannot start) and the restoration condition.
- `.github/workflows/*.yml`: every job runs on `ubuntu-latest`.
