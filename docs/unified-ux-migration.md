# Unified UI/UX Migration Guide

Use this guide with issue #2559 when planning or implementing new UI/UX work. It is intentionally lightweight: do not create an exhaustive feature register before building. Add workflow notes only when a workflow is actively planned, rebuilt, bridged, deferred, combined, or retired.

## Source Layout

- `src/app/v0/` contains the current production UI. Keep legacy routes and v0-only presentation behavior here.
- `src/app/v1/` is reserved for the future opt-in production experience. Add it on the `unified-ux` branch after the develop foundation lands.
- `src/app/shared/` contains version-neutral helpers and contracts; import it with `@shared/*`.
- `src/app/v0/shared/` contains legacy reusable UI that is shared only inside v0; import it with `@v0/shared/*`.
- `src/app/data/` contains shared data contracts: account workspace, IndexedDB, backups, persisted models, and migrations.
- `src/app/domain/` contains deterministic calculations and domain helpers.
- `src/app/platform/` contains Electron services, Web Worker wrappers/contracts, analytics, and other runtime integration boundaries.

Current boundary examples:

- Root shared keeps form, fuel, vehicle, date/helper service, router-guard, notification-state, and analysis-calculation contracts.
- v0 shared owns legacy helper pipes, spinners, labels, table/dropdown helpers, meter content, data-quality displays, analysis presentation widgets, report widgets, settings/help UI, and similar presentation bundles.
- Meter charge option types/constants live in `src/app/data/models/meter-charges-options.ts` because they are used by persisted models, migrations, exports, and v0 forms.

## Protected Contracts

Do not change these contracts as incidental UI migration work:

- IndexedDB schemas, store names, indexes, migrations, and record defaults.
- JSON backup shape, data-version handling, import/export compatibility, and GUID remapping.
- Spreadsheet imports/exports, report exports, and generated report values.
- Calculation inputs, outputs, units, rounding, and aggregation semantics.
- Web Worker request, response, error, and structured-clone payloads.
- Electron IPC channels, preload allowlist, context isolation, and desktop file behavior.
- Account workspace publication, selection repair, committed revision, and command-boundary behavior.
- Persisted model identities, especially GUID relationships versus local numeric IndexedDB ids.

## Workflow Decision Note

When a workflow enters v1 planning or implementation, record only the decisions needed for that workflow:

- **Workflow:** Name the workflow and its existing v0 entry point.
- **Decision:** Rebuild in v1, share logic, temporarily link to v0, combine with another workflow, defer, or retire.
- **Parity:** Name the user-visible behaviors that must match v0.
- **Shared contracts:** List any data, domain, file, Worker, Electron, or report contracts touched.
- **Tests:** Name the focused unit, browser, Electron, or manual checks required.

## Implementation Rules

- Do not add v0/v1 conditionals to legacy components.
- Rebuild v1 UI components from scratch using the new architecture and P1 learnings.
- Reuse shared data, domain, platform, and model contracts when they are not coupled to legacy presentation behavior.
- Keep current public v0 URLs stable while v0 remains the default experience.
- Keep `/p1` prototype routes and `/v1` production routes out of `develop`; add them on `unified-ux`.
- Prefer aliases for cross-boundary imports: `@app/*`, `@shared/*`, `@v0/*`, `@data/*`, `@domain/*`, and `@platform/*`.
- Do not import from `@v0/*` in root shared, data, domain, platform, or future v1 code.
- Use `@v0/shared/*` for legacy reusable UI even when only v0 imports it today; use `@shared/*` only when v1 can safely depend on the code without inheriting v0 presentation behavior.

## Validation

- For develop foundation changes, run `npx tsc -p tsconfig.app.json --noEmit` after each module or folder move.
- Before opening the develop foundation PR, run `npm run test:ci`, `npm run test:browser:ci`, `npm run build-prod`, and `npm run build-prod-electron`.
- After merging the foundation into `unified-ux`, verify legacy routes, `/p1`, and `/v1`.
- For each future v1 workflow, add focused tests for changed behavior. Add browser tests when IndexedDB, File APIs, or Workers are involved, and Electron validation when renderer or desktop behavior changes.
