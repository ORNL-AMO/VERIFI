# VERIFI Agent Guide

## Start with the smallest context

Executable configuration and source are authoritative, followed by this guide, [architecture](ARCHITECTURE.md), the relevant [task workflow](.agents/skills), and its current feature reference. Use the [task router](docs/agents/context-index.md) to select those references. Read only affected sections and neighboring source; stop once owners, consumers, compatibility risks, and validation are understood.

This guide is supplied automatically. Do not reopen it, preload complete guides, or read unrelated skills. Inspect `package.json` first; read the lockfile only for a specific dependency investigation. Skip dependencies, caches, generated output, and binary assets unless relevant. Do not hide tracked source through ignore files.

## Repository boundaries

VERIFI shares one Angular renderer between web and Electron. On `unified-ux`, root navigation opens `/v1`; legacy entry is `/welcome`. Versioned UI lives in `src/app/v0/` and `src/app/v1/`. Production v1 never imports `@v0/*`.

Use feature folders, NgModules, and non-standalone components unless the owning feature deliberately differs. Each component has its own folder with class, template, styles, and meaningful specs together. Ordinary v1 names do not need `V1`/`v1-` prefixes; retain versioning for route/module, theme, and storage boundaries.

Use configured aliases across boundaries: `@app/*` for app/v1, `@v0/shared/*` for legacy-only UI, and `@shared/*`, `@data/*`, `@domain/*`, `@platform/*` for neutral contracts and helpers. Keep same-feature imports relative. Shared records, persistence, calculations, and runtime contracts belong outside versioned UI. Prefer established neighboring patterns over new frameworks.

## Working rules

- Diagnose without editing for analysis/review-only requests. Preserve unrelated worktree changes.
- Treat stored user data as durable. Preserve supported backups/imports, idempotent migrations, and GUID relationships; IndexedDB numeric `id` is not a domain GUID.
- Read active state through workspace signals; persist through the command boundary. Multi-store invariants require one native transaction and one committed publication. Recovery after commit must not replay persistence.
- Keep calculations deterministic. Update every consumer of changed inputs, outputs, units, aggregations, report values, and Worker request/result/error contracts together.
- Preserve Electron context isolation and the preload channel allowlist. Never expose unrestricted Node or `ipcRenderer` access.
- Production v1 editable workflows use typed reactive forms. Pass typed values and `FileList | null`; never extract editable values from DOM events or pass raw events through outputs/services. Native focus, pointer, keyboard, and drag/drop mechanics may retain events locally. Follow [template guidance](docs/agents/angular-template-guidance.md).
- Reuse shared presentation and semantic theme tokens. Native v1 selects include `v1-select`. Workbench sections have connected borders, square outer corners, and no vertical gaps.
- Routed workspace confirmations use `ModalPortalService`, `TemplatePortal`, and `ConfirmationDialogComponent`. Feature-local backdrop/stacking overrides cannot reliably escape the workspace stacking context.
- Cover relevant loading, empty, invalid, disabled, saving, error/recovery, and success states; check keyboard/focus, labels, contrast, responsive layouts, printing, and chart alternatives when affected.
- Do not edit `node_modules/`, `dist/`, or `output/`. Binary assets under `src/assets/` are deliberate source. Never add secrets or machine-specific paths.

## Commands and validation

Use the Node/npm toolchain declared in `package.json`. Install with `npm ci`; develop with `npm start`. The [testing guide](docs/testing.md) owns validation policy; the [validation workflow](.agents/skills/validate-web-and-electron/SKILL.md) explains execution.

| Purpose | Command |
| --- | --- |
| Select checks | `npm run validate:agent -- --mode plan` |
| Fast tests | `npm run test:ci` |
| Native browser tests | `npm run test:browser:ci` |
| Explicit pre-PR/release test gate | `npm run test:all:ci` |
| App type-check | `npx tsc -p tsconfig.app.json --noEmit` |
| Production web / Electron | `npm run build-prod` / `npm run build-prod-electron` |
| Documentation | `npm run docs:check` |

Use focused non-watch checks while iterating and the planner before final validation. In a dirty checkout, pass only this task's files to the planner. Install Chromium with `npx playwright install chromium` only when missing. `npm run lint` is not a valid gate while its removed TSLint builder remains configured. Do not add creation-only tests or artificial tests for prose/style edits.

## PRs, communication, and maintenance

Follow the [PR workflow](docs/agents/pr-workflow.md): context-aware self-review, then an independent subagent without inherited conversation, with both records against current commits. It owns review/publication procedure; completion does not grant merge approval. Honor authorization already given and surface new findings or material gaps.

Lead updates with changed outcomes. Final responses give results, actual validation, unresolved risks, and required action. Disclose failed/unperformed checks; do not repeat unchanged status.

Keep one owner per contract: architecture for boundaries, feature references for current behavior, skills for repeatable procedure, and issues for pending delivery. Update those owners with changes. Convert or delete completed plans after preserving unique invariants and open acceptance; retain history in Git/PRs. Do not append implementation inventories, chronological evidence, or test counts to current references. Validate links and commands; document uncertain facts explicitly.
