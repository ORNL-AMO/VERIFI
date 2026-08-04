# VERIFI Agent Guide

This file contains repository-wide instructions for coding agents. Keep it concise and route detailed context to the linked documents.

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

VERIFI is an Angular and Electron application for tracking, visualizing, and analyzing industrial facility utility data. The browser and desktop builds share the Angular renderer. The Electron build adds narrowly exposed filesystem and updater capabilities through a preload bridge.

Start in these areas:

| Task | First locations |
| --- | --- |
| Application shell and startup | `src/main.ts`, `src/app/app.module.ts`, `src/app/app.component.ts` |
| Routes and user workflows | `src/app/routing/`, `src/app/data-management/`, `src/app/data-evaluation/` |
| Persisted data | `src/app/models/idbModels/`, `src/app/indexedDB/` |
| Calculations and reports | `src/app/calculations/`, `src/app/web-workers/`, report features under `src/app/data-evaluation/` |
| Imports, exports, and backups | `src/app/data-management/data-management-import/`, `src/app/shared/helper-services/`, `src/app/core-components/import-backup-modal/` |
| Electron-only behavior | `main.js`, `preload.js`, `src/app/electron/` |
| Shared UI and styling | `src/app/shared/`, `src/styles/`, neighboring feature components |
| Builds, tests, and environments | `package.json`, `angular.json`, `src/environments/`, `.github/workflows/` |

Read only the sections relevant to the task. Prefer established neighboring code over introducing a new pattern.

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

Apply the relevant mode from [docs/agents/personas.md](docs/agents/personas.md). Use these discoverable skills for repeatable workflows:

- `implement-angular-feature`: Angular features, UI/UX implementation, routes, components, services, templates, and styles.
- `change-indexeddb-persistence`: persisted models, indexes, stores, services, migrations, or backup compatibility.
- `change-calculations-and-reports`: calculations, units, Web Worker contracts, analyses, and report outputs.
- `change-data-import-export`: spreadsheets, structured imports/exports, templates, and JSON backups.
- `design-and-write-tests`: test strategy, regression coverage, test implementation, test-quality review, and layer selection.
- `validate-web-and-electron`: selecting and running the correct test/build matrix across runtimes.

Use the Designer mode with `implement-angular-feature` for UI implementation. A design-only request does not authorize code changes.

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

## Documentation maintenance

Update documentation in the same change when behavior or workflow changes:

- Update `ARCHITECTURE.md` for changed boundaries, data flows, or invariants.
- Update the matching skill for a changed repeatable workflow.
- Update this file only for durable repository-wide rules, routing, commands, or recurring mistakes.
- Update `docs/agents/personas.md` when task-mode responsibilities change.

Validate every new link and command. If a fact is uncertain, verify it in source or label the uncertainty rather than presenting an assumption as current behavior.
