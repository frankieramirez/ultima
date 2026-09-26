# Contributing to Ultima

[`AGENTS.md`](AGENTS.md) is the entry point for working in this repository: it holds the layout, the commands, and the rules that are easy to break. [The specification](docs/spec/ultima.md) holds the conventions those rules point at. Read both before opening a pull request.

## Issues

Issues are open to everyone. Ask for features, report bugs, and raise questions here — this is the one channel, so there are no GitHub Discussions to split attention across. External reports are triaged under the `authorAssociation` convention in [`docs/agents/issue-tracker.md`](docs/agents/issue-tracker.md).

## Pull requests

Pull requests are accepted and reviewed on merit, but a pull request is never how a feature is requested. If you want something built or changed, open an issue first; a PR that arrives as a request with code attached will be asked to become an issue.

What a PR has to satisfy:

- **Spec conformance.** The change follows the rules that are easy to break listed in `AGENTS.md` — one file per component, the `style` slot and no `className`, no raw values in component code, generated files regenerated rather than hand-edited — and, for a component, the proof bar in [What a build ticket proves](docs/spec/ultima.md#what-a-build-ticket-proves).
- **A reported verify run.** Run `pnpm verify changed --base origin/main` locally and paste the result in the PR. The template has a checklist for this.

The maintainer may take over a PR, rewrite it, or close it. That is normal triage on a solo-maintained project, not a judgment on the work.

## License

Ultima is [MIT licensed](LICENSE). There is no contributor license agreement; by opening a pull request you agree your contribution ships under the MIT license.

## Security

Do not report vulnerabilities in public issues or pull requests. See [`SECURITY.md`](SECURITY.md).
