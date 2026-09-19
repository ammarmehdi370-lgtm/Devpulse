# Contributing to Devpulse

## Branching

- `main` is production and protected.
- `develop` is the integration branch and deploys to staging.
- Create feature branches from `develop`: `feat/editor-tabs`, `fix/session-expiry`.
- Open pull requests into `develop`; release pull requests merge `develop` into `main`.
- Require passing CI and review before merging.

## Commit messages

Use Conventional Commits:

```text
type(scope): summary
```

Examples: `feat(editor): add file tabs`, `fix(auth): reject expired refresh tokens`, `chore(ci): cache pnpm store`.

Allowed types include `feat`, `fix`, `docs`, `refactor`, `test`, `chore`, `build`, and `ci`.
