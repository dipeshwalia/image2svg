# Contributing to Image2SVG

Thanks for your interest in contributing.

## Development Setup

1. Fork and clone the repository.
2. Install dependencies:
   - `npm install`
3. Start local dev server:
   - `npm run dev`
4. Run quality checks before opening a PR:
   - `npm run lint`
   - `npm run format`
   - `npm run typecheck`
   - `npm run test`

## What to Work On

- Bug fixes in vectorization flow, editor UX, and PWA behavior.
- Performance improvements in `src/lib/*` pipeline stages.
- Tests for edge cases in optimizer and pipeline behavior.
- Documentation and onboarding improvements.

## Pull Request Rules

- Keep PRs focused and small.
- Include a clear description of the problem and fix.
- Add or update tests for behavior changes.
- Ensure CI is passing.

## Git and Commit History

To keep history clean and useful for open source:

- Branch from `main` using a descriptive branch name (for example `fix/upscale-memory-limit`).
- Use clear commit messages (Conventional Commits preferred):
  - `feat: add svg optimizer fallback test`
  - `fix: remove tensorflow dependency from upscaler`
  - `docs: add contribution guide`
- Rebase on latest `main` before merging to avoid noisy merge commits.
- Squash trivial fixup commits before opening or updating PRs.
- Never force-push to `main`.

## Testing Guidance

- Put unit tests next to source modules as `*.test.ts`.
- Mock heavy or browser-only dependencies in tests.
- Prefer deterministic assertions (no timing flakes).

## Code Style

- Use TypeScript strict-friendly patterns.
- Keep modules single-purpose and easy to test.
- Follow existing lint and formatting conventions.
