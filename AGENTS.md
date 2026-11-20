# More Boosty contributor and agent instructions

These rules apply to the entire repository.

## Product scope

- Keep the extension focused on Boosty video quality links and preview images.
- Read the current Boosty token and request content only after the in-page disclosure and user action.
- Do not add advertising, tracking, donation links, unrelated player settings, remote scripts or runtime dependencies.
- Limit content scripts to boosty.to and API requests to api.boosty.to. Keep MV3, narrow permissions and the strict CSP.
- Keep tokens, signed media URLs and private content out of logs, fixtures, screenshots and Git.
- Keep the MIT license in source distributions and release archives.

## Commits and pull requests

Use Conventional Commits: `type(scope): imperative description`.
Scope is optional. Headers must be at most 100 characters. Use English descriptions.
Allowed types: feat, fix, docs, style, refactor, perf, test, build, ci, chore, revert.
Useful scopes: api, ui, privacy, i18n, deps, release.
Use `!` or a `BREAKING CHANGE:` footer when compatibility changes.
One commit should represent one coherent change. PR titles use the same notation.
Git-generated merge messages are accepted by the local commit hook.

Examples:

- `fix(api): retry failed video metadata requests`
- `docs: clarify manual installation in both languages`
- `ci(release): attach checksums to GitHub releases`

## Implementation

- Use native JavaScript ES modules, two-space indentation, single quotes and semicolons.
- Keep third-party packages limited to build, packaging and DOM tests.
- Add focused regression tests for behavior changes. Do not add implementation-mirroring tests for prose or styling.
- Use the current scripts; avoid a parallel build or release system.
- Pin external GitHub Actions by verified full commit SHA with a version comment.
- Give build jobs read-only permissions; only the publishing job needs contents: write.
- Do not commit node_modules, distribution, artifacts or release.zip.

## Documentation and localization

- README.md is Russian; README.en.md is English. Keep their capabilities, setup steps, screenshots and cross-links consistent.
- Record user-visible changes under Unreleased in CHANGELOG.md in Russian and English.
- Keep source/_locales/ru and source/_locales/en keys in sync.
- Keep store/ru/listing.json and store/en/listing.json consistent with the extension and each other.
- When data handling changes, update both privacy policies, the in-page notice and publishing documentation.

## Validation and releases

Use Node.js 24 (minimum 22.13) and npm:

```sh
npm ci
npm test
npm run release
git diff --check
```

For prose-only edits, check links and metadata consistency without adding redundant tests.
A release uses stable vX.Y.Z tags, package.json as the version source and a dated CHANGELOG.md section.
`npm version <version> --no-git-tag-version` updates the lockfile and synchronizes the source manifest via the version lifecycle script.
The release workflow only publishes commits reachable from main. Keep existing Git history and published tags intact.
See CONTRIBUTING.md and docs/publishing.md for the complete release procedure.
