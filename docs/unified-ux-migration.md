# Unified UI/UX Migration Guide

Use this guide with issue #2559 when planning or implementing new UI/UX work. It is intentionally lightweight: do not create an exhaustive feature register before building. Add workflow notes only when a workflow is actively planned, rebuilt, bridged, deferred, combined, or retired. Use the [current-state notes guide](unified-ux-current-state.md) with issue #2558 when a v1 workflow needs existing v0 behavior documented.

## Source Layout

- `src/app/v0/` contains the current production UI. Keep legacy routes and v0-only presentation behavior here.
- `src/app/v1/` contains the opt-in production unified workspace reached through `/v1` on `unified-ux`.
- `src/app/ux-prototypes/` contains P1 prototype reference material reached through `/p1` on `unified-ux`. Prototype code can inform v1, but production v1 should not depend on prototype-only components unless they are deliberately promoted.
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

If the workflow needs current-state detail, add a short current-state note using the template in the [current-state notes guide](unified-ux-current-state.md). Do not create a full application inventory as a prerequisite for v1 work.

### Single-Facility Setup Workflow

- **Workflow:** v1 composite single-facility setup, issue #2637.
- **Existing v0 entry point:** Account setup and facility setup remain separate under the current Data Management routes.
- **Decision:** Rebuild in v1 by routing valid single-facility accounts into the sole facility workspace and using the facility settings surface as the combined setup path.
- **Parity:** Shared profile, location, units, goals, financial reporting, data staleness, backup, and delete behavior continue to save through existing account and facility command handlers.
- **Shared contracts:** No IndexedDB schema, migration, backup, import/export, calculation, Worker, or Electron contract changes.
- **Tests:** Focused v1 navigation, header, side-nav, route guard, welcome, and facility settings specs; production web build before handoff.

### Single-Site to Portfolio Conversion Workflow

- **Workflow:** v1 single-site account conversion to portfolio presentation, issue #2641.
- **Existing v0 entry point:** Facility management is available under the current Data Management facilities route.
- **Decision:** Rebuild the scoped conversion path in v1 facility settings by adding a Portfolio detail between Backup and Delete account. Adding a second facility clears the existing `isSingleFacilityCompany` flag through account command handling.
- **Parity:** Facility creation uses existing facility defaults and facility command handling; invalid single-site accounts with multiple facilities can clear the flag without creating another facility.
- **Shared contracts:** No IndexedDB schema, migration, backup, import/export, calculation, Worker, or Electron contract changes.
- **Tests:** Focused facility settings route/component specs and section navigation specs; validation planner decides parent checks.

## Implementation Rules

- Do not add v0/v1 conditionals to legacy components.
- Rebuild v1 UI components from scratch using the new architecture and P1 learnings.
- Reuse shared data, domain, platform, and model contracts when they are not coupled to legacy presentation behavior.
- Keep current public v0 URLs stable while v0 remains the default experience.
- Keep `/p1` prototype routes and `/v1` production routes out of `develop`; on `unified-ux`, root routing lazy-loads `/p1`, `/v1`, and the default v0 route tree.
- Treat `/p1` as non-production reference material. It may temporarily import `@v0/shared/*` while production v1 must not import from `@v0/*`.
- Prefer aliases for cross-boundary imports: `@app/*`, `@shared/*`, `@v0/*`, `@data/*`, `@domain/*`, and `@platform/*`.
- Do not import from `@v0/*` in root shared, data, domain, platform, or production v1 code.
- Use `@v0/shared/*` for legacy reusable UI even when only v0 imports it today; use `@shared/*` only when v1 can safely depend on the code without inheriting v0 presentation behavior.

## Validation

- For develop foundation changes, run `npx tsc -p tsconfig.app.json --noEmit` after each module or folder move.
- Before opening the develop foundation PR, run `npm run test:ci`, `npm run test:browser:ci`, `npm run build-prod`, and `npm run build-prod-electron`.
- After merging the foundation into `unified-ux`, verify legacy routes, `/p1`, and `/v1`.
- For each future v1 workflow, add focused tests for changed behavior. Add browser tests when IndexedDB, File APIs, or Workers are involved, and Electron validation when renderer or desktop behavior changes.
