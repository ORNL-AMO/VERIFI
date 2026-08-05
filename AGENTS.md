# VERIFI Agent Guide

This file contains repository-wide instructions for coding agents. Keep it concise and route detailed context to linked sources.

## Sources of truth

Use sources in this order when they disagree:

1. Executable configuration and source code.
2. This file for required agent behavior.
3. [ARCHITECTURE.md](ARCHITECTURE.md) for system boundaries and data flow.
4. Task-specific skills under [`.agents/skills`](.agents/skills).
5. [Agent task modes](docs/agents/personas.md) for the perspective to apply.
6. [README.md](README.md), [CONTRIBUTING.md](CONTRIBUTING.md), and [CODING_STYLE.md](CODING_STYLE.md) for their existing domains.

Do not copy volatile package versions, scripts, database versions, or implementation inventories into new documents when a link to the source is clearer.

## Project orientation

VERIFI's Angular renderer ships for web and Electron. Use the [task context index](docs/agents/context-index.md) to choose entrypoints, minimum documentation, skill, mode, and first validation tier. Prefer established neighboring code over a new pattern.

## Context discipline

- This guide is supplied automatically; reopen it only to verify exact text.
- Use targeted searches and narrow excerpts. Load only relevant linked headings, not whole documents.
- Do not preload `README.md`, `CONTRIBUTING.md`, unrelated skills, or complete guides.
- Stop broad exploration after identifying the affected contract, consumers, neighboring pattern, material risks, and test tier.
- Inspect `package.json` first. Query `package-lock.json` only for a specific dependency, integrity record, upgrade, or security investigation.
- Skip dependencies, generated output, caches, and binary assets unless relevant. `.gitignore` is not a context or security boundary.
- Do not add `.codexignore` or hide tracked source through `.ignore`.

## Setup and commands

Use Node.js 24.10.0 and npm 11.6.1 as declared in `package.json`. Treat `package.json` as authoritative and update this line with it when the supported toolchain changes.

```bash
npm ci
npm start
```

Use non-watch commands for verification:

| Check | Command | Use it for |
| --- | --- | --- |
| Fast unit tests | `npm run test:ci` | Pure TypeScript, Angular components, services, pipes, and ordinary utilities |
| Browser tests | `npm run test:browser:ci` | IndexedDB, Web Workers, and behavior requiring native browser APIs |
| Full test suite | `npm run test:all:ci` | Final verification before a pull request |
| Informational coverage | `npm run test:coverage` | Scoped calculation, IndexedDB, and Web Worker coverage; not a gate |
| Development build | `npm run build` | General Angular/Electron renderer changes |
| Production web build | `npm run build-prod` | Web deployment behavior and final validation |
| Production Electron build | `npm run build-prod-electron` | Electron or shared renderer changes |

Install Chromium once with `npx playwright install chromium` when browser tests cannot find it. For interactive Electron development, run `npm run build-watch` and `npm run electron` in separate terminals.

`npm run lint` is not a valid gate at present: it references the removed `@angular-devkit/build-angular:tslint` builder and fails before linting. Follow `CODING_STYLE.md`, tests, and builds until the lint configuration is repaired.

## Task routing

Use the mode and discoverable skill selected by the [task context index](docs/agents/context-index.md). Combine skills only when the task crosses their stated boundaries. Use Designer with Implementer for UI implementation; design-only work does not authorize code changes.

## Working rules

- Diagnose before editing when the request asks for analysis, investigation, or review only.
- Keep changes scoped to the issue and preserve unrelated worktree changes.
- Use the repository's NgModule-based Angular pattern; components are non-standalone unless the surrounding feature has deliberately migrated.
- Follow the risk-based policy in [docs/testing.md](docs/testing.md): protect changed behavior with the lowest-cost valuable automated test, or document why automation is disproportionate and provide focused manual evidence. Do not rely on creation-only `should create` tests.
- Treat stored user data as durable. Make migrations idempotent and preserve older backups and import formats where supported.
- Preserve GUID-based domain relationships. Do not confuse IndexedDB's local numeric `id` with cross-record identifiers.
- Keep calculations deterministic and verify every consumer when changing a shared result, unit, payload, or report field.
- Treat Web Worker messages as contracts: update payloads, results, errors, call sites, and browser tests together.
- Keep Electron `contextIsolation` intact. Expose only explicit IPC channels through `preload.js`; never expose unrestricted Node or `ipcRenderer` access.
- Reuse shared UI, Bootstrap/ng-bootstrap conventions, and existing style layers. Cover loading, empty, validation, error, disabled, and success states.
- Check responsive behavior, keyboard access, focus, labels, contrast, screen-reader semantics, printing, charts, and Electron window constraints when relevant.
- Do not edit `node_modules/`, `dist/`, or `output/`. Treat spreadsheets, images, and other binary assets under `src/assets/` as deliberate source artifacts.
- Do not add secrets, credentials, private deployment details, or machine-specific paths to documentation or source.

## Communication

- Lead with the outcome. Send one- or two-sentence updates only when state changes.
- Final responses give the result, validation, unresolved risks, and required next action.
- Omit repeated summaries, unchanged status, generic reassurance, and step-by-step tool narration.
- Never omit failures, test results, compatibility risks, destructive-action warnings, or required decisions.

## Documentation maintenance

Update documentation in the same change when behavior or workflow changes:

- Update `ARCHITECTURE.md` for changed boundaries, data flows, or invariants.
- Update the matching skill for a changed repeatable workflow.
- Update this file only for durable repository-wide rules, routing, commands, or recurring mistakes.
- Update the task context index when stable entrypoints, routing, cross-boundary triggers, or validation tiers change.
- Update `docs/agents/personas.md` when task-mode responsibilities change.

Validate every new link and command. If a fact is uncertain, verify it in source or label the uncertainty rather than presenting an assumption as current behavior.
