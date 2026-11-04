# V1 Energy Uses Migration Plan

## Purpose and delivery

Migrate Energy Uses into the existing v1 Data workflow as an inventory of individual energy uses. An item may represent equipment, a system, or a process.

Use the meter/predictor inventory and workbench patterns, with **Settings** and **Annual Data** tabs that both autosave. Support estimation independently of meter readings.

This roadmap records the agreed target experience, not shipped behavior. Work through each phase separately and record its status and validation evidence when completed. The first release includes the complete item workflow: management, estimation, calculators, charts, comparisons, bulk actions, retirement, and Excel export. Broader grouping remains a separate planning effort.

| Phase | Deliverable | Status |
| --- | --- | --- |
| 1 | Inventory and workspace navigation | In progress |
| 2 | Creation, Settings, and safe commands | Planned |
| 3 | Annual Data and estimation | Planned |
| 4 | Complete item tools and charts | Planned |
| 5 | Export, compatibility, and release acceptance | Planned |

## Architecture and contracts

- Keep production UI under [`src/app/v1/data/energy-uses/`](../src/app/v1/data/energy-uses/), using feature-owned inventory projections, a collection workspace service, and a route-scoped workbench context. Reuse shared inventory, workbench, navigation, chart, and modal presentation. Follow the [Data workbench architecture norms](unified-ux-migration.md#production-v1-data-workbench-architecture-norms).
- Continue using the existing [equipment](../src/app/data/models/idbModels/facilityEnergyUseEquipment.ts) and [group](../src/app/data/models/idbModels/facilityEnergyUseGroups.ts) records. Keep their persisted names, GUID relationships, annual arrays, and backup formats. No database schema or data-version migration is planned.
- Every item retains its required energy-use group relationship. Present items in a flat inventory without regrouping existing records. Energy-use grouping and optional utility meter-group links remain separate relationships.
- Add typed Energy Use settings, annual-data, creation, and command contracts. Both editors use the [shared Data editing session](v1-data-form-architecture-roadmap.md) for serialized autosave, reconciliation, failed drafts, and navigation protection.
- Route writes through `WorkspaceCommandBoundary` and the existing [energy-use handler](../src/app/data/account-workspace/handlers/energy-use-command-handler.service.ts). Resolve current records inside queued commands; compound operations commit atomically and publish once. Follow the [workspace data workflow](data-access-and-workspace.md).
- Reuse deterministic calculations from [`src/app/domain/calculations/energy-footprint/`](../src/app/domain/calculations/energy-footprint/). Rebuild legacy presentation and forms in v1; extract reusable helpers and file-writing logic into neutral layers where needed. Production v1 must not import v0 presentation or prototype code.

## Phased delivery

### Phase 1 — Inventory and workspace navigation

Replace the account and facility placeholders with a flat inventory containing all energy-use items, including existing imported records.

- Follow existing facility scope, ownership links, search, sorting, pagination, detail levels, and browse restoration.
- Show identity, category, sources, current group, annual-data availability, and retirement state. Use item-specific readiness information without implying that global energy-use validation already exists.
- Add canonical workbench routes under `data/energy-uses/:energyUseGuid`, with `settings` and `annual-data` tabs.
- Integrate breadcrumbs, sidebar item links, resource switching, single-facility behavior, and guarded navigation. Missing or deleted items show an unavailable state.

**Completion:** Existing energy uses are discoverable and directly addressable without changing their data or group assignments.

### Phase 2 — Creation, Settings, and safe commands

Implement typed creation and Settings forms using existing field meanings and validation.

- Cover name, notes, category, source configuration, rated capacity, units, quantity, and optional compatible meter-group links.
- Creation requires an owning facility, an initial year, and either an existing energy-use group or a new group name. Creating a group and its first item is one transaction.
- Show the existing energy-use group as metadata after creation. Group management and reassignment remain deferred.
- Add copy and single-item deletion. Copies receive fresh identity and independent nested data; deleting an item leaves its group and linked meter groups intact.
- Preserve all saved source data. Linking or unlinking meters must not silently create, replace, or remove annual history. Destructive source changes require explicit review.

**Completion:** Users can create and manage energy uses without meter readings, with working autosave, conflict review, retry, and discard protection.

### Phase 3 — Annual Data and estimation

Build an annual editor with a year selector, operating assumptions, and per-source calculated or overridden consumption.

- Allow explicit years using the facility's fiscal-year meaning; meter data does not constrain available years.
- Cover operating hours, load factor, duty factor, electricity efficiency, consumption units, and manual overrides.
- Show estimates immediately as edits are made, clearly distinguishing previews from saved values. Autosave valid changes through the shared editing lifecycle.
- Preserve existing formulas, conversion precision, zero values, overrides, and stored history. Invalid inputs or non-finite calculated results block the affected save.
- Add and copy years across operating conditions and every source consistently. Confirm year removal.
- Separate Settings and Annual Data mappings because both touch nested source records. Merge annual entries by source/year, preserve unrelated edits, and surface conflicts when source changes invalidate an annual draft.
- Opening a record never recalculates or rewrites saved values.

**Completion:** A user can create an energy use, enter annual assumptions, override consumption, reopen it, and recover the same saved values.

### Phase 4 — Complete item tools and charts

Finish the item workflow before declaring release readiness.

- Migrate operating-hours, load-factor, and rated-power calculators. Calculators requiring fuel or meter information explain their prerequisites; direct input remains available.
- Add retirement and reinstatement using existing lifecycle fields. Preserve all annual history and show retirement metadata.
- Add reviewed bulk deletion and bulk year operations. Each confirmed batch is atomic; selection follows the existing inventory behavior across pagination.
- Add annual workbench charts and inventory comparisons through shared chart presentation.
- Chart committed values with one trace per item/source, explicit units, override indicators, and genuine gaps. Do not propagate missing years.
- Portfolio comparisons identify facility ownership and fiscal periods. Different fiscal calendars remain explicit; comparisons do not imply aligned periods or produce portfolio totals.

**Completion:** Users can complete item-level work without returning to v0. Group moves, group rollups, and footprint diagrams remain outside this milestone.

### Phase 5 — Export, compatibility, and release acceptance

Complete the surrounding workflows and verify the full journey.

- Migrate the existing [Energy Uses Excel export](../src/app/v0/data-management/account-facilities/facility-data/facility-energy-uses/energy-uses-excel-export.service.ts). Extract its projection/writer and format helpers from v0 into neutral code, retaining a compatible v0 adapter.
- Preserve the workbook template, headers, types, units, group names, facility/year selection, and explicit rejection of records with more than two sources.
- Export committed data only. Relevant pending saves must finish; invalid, conflicted, or failed drafts prevent export with a clear explanation.
- Ensure existing v1 imports land on the usable inventory and preserve group and meter relationships. Verify supported Energy Uses and Footprint import paths.
- Verify account/facility backup round trips and existing cascade deletion.
- Update the migration guide, architecture notes, task routing, and form guidance only where the implemented workflow establishes durable changes.

**Completion:** The complete item workflow passes compatibility and interaction checks and is ready for release.

## Validation and acceptance

Each phase includes focused behavioral tests; validation is part of delivery, not a final cleanup phase. Follow the [testing policy](testing.md) and [validation workflow](../.agents/skills/validate-web-and-electron/SKILL.md).

- **Calculations:** Electricity versus fuel efficiency, conversion precision, valid zeroes, invalid inputs, overrides, source changes, and synchronized year operations.
- **Editing:** Silent hydration, nested-copy independence, queued edits and reversions, Settings/Annual Data reconciliation, save failures, retry, missing targets, and guarded route reuse.
- **Persistence:** Real IndexedDB rollback for group-plus-item creation and bulk commands, ownership rejection, one committed publication, reopening, copying, and deletion boundaries.
- **Compatibility:** Existing multi-group records, imported records with additional sources, workbook fidelity, and backup restoration without lost history or relationships.
- **Experience:** Fresh facility without readings, portfolio and single-facility journeys, keyboard/focus behavior, responsive layouts, themes, chart gaps, and export availability.

Use `npm run validate:agent -- --mode plan` with the files changed in each phase to choose focused checks. Final persistence handoff requires `npm run test:all:ci`, `npx tsc -p tsconfig.app.json --noEmit`, `npm run build-prod`, and `npm run build-prod-electron`, plus focused desktop export verification. Record results and remaining gaps with the completed phase.

## Phase 1 delivery evidence

- **Inventory branch:** Feature-owned read-only projections and shared cards are implemented; activation remains deferred to the workspace integration branch.
- **Validation:** Focused inventory/card tests (8 passed), app TypeScript check, full fast suite (3,311 passed), full Chromium suite (338 passed), and production web build passed. Restricted test/build processes initially exited 134; unrestricted reruns passed. The web build retains existing browser-support, style-budget, and CommonJS warnings.
- **Workbench branch:** Canonical Settings/Annual Data routes, route-scoped ownership and missing-item handling, shared resource switching, and lightweight guarded editor shells are implemented.
- **Workbench validation:** Focused energy-use/route tests (58 passed), colocated editor-shell test (1 passed), app TypeScript check, full fast suite (3,315 passed), full Chromium suite (338 passed), and production web build passed.
- **Remaining:** Workspace integration and final interaction checks.

## Defaults and deferred work

- Retain **Energy Uses** and use **energy use** for an individual item; retain existing stored equipment terminology.
- Preserve the established two-source creation limit while retaining existing/imported extra sources without truncation.
- Existing retirement and missing-year propagation inconsistencies are documented separately from formula changes. This migration preserves history and avoids introducing retirement-adjusted item rollups.
- A later grouping plan will define group editing, reassignment, bulk moves, deletion semantics, group/facility summaries, footprint balances, and Sankey views.
