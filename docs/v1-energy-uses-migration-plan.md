# V1 Energy Uses Migration Plan

## Purpose and delivery

Migrate Energy Uses into the existing v1 Data workflow as an inventory of individual energy uses. An item may represent equipment, a system, or a process.

Use the meter/predictor inventory and workbench patterns, with **Settings** and **Annual Data** tabs that both autosave. Support estimation independently of meter readings.

This roadmap records the agreed target experience, not shipped behavior. Work through each phase separately and record its status and validation evidence when completed. The first release includes the complete item workflow: management, estimation, calculators, charts, comparisons, bulk actions, retirement, and Excel export. Broader grouping remains a separate planning effort.

| Phase | Deliverable | Status |
| --- | --- | --- |
| 1 | Inventory and workspace navigation | Complete |
| 2 | Creation, Settings, and safe commands | Implemented; approved for PR review |
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
- Retain the existing facility and energy-use group ownership after creation. Group management and reassignment remain deferred.
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
- **Integration branch:** Shared account/facility-scoped inventory, legacy route redirects, implicit single-facility scope, breadcrumbs, resource/sidebar switching, accepted route context, and browse restoration are complete. Settings and Annual Data remain intentionally minimal navigation shells.
- **Final validation:** Focused inventory/navigation/sidebar/route tests (213 passed), full fast suite (3,318 passed), full Chromium suite (342 passed), app TypeScript check, and production web build passed. Four additional focused Chromium journeys passed after improving card typography and checking three-source wrapping.
- **Interaction evidence:** Chromium verified browser Back/Forward scroll/focus restoration, rejected exits retaining context, old facility routes, implicit single-facility ownership, native select labels, keyboard progression, desktop/narrow light/dark/high-contrast layouts, readable source facts, and print-card omission of controls. Captured layouts were visually inspected. Browsing and tab switching preserve committed records and do not initialize analysis pairs.
- **Boundaries:** No database, command, calculation, import/export, backup, v0, or Electron boundary changes. Electron-specific validation is not required for this phase. Existing browser-support, stylesheet-budget, and CommonJS build warnings remain.

## Phase 2 delivery evidence

- Creation uses the shared inventory header registry and a facility-aware drawer with an explicit initial fiscal year, typed setup fields, existing/new group selection, and dirty-draft protection. No meter readings are required.
- Settings uses the shared Data edit session for autosave, normalized acknowledgement, reconciliation, retry/discard, missing-target draft retention, and guarded route reuse. Source configuration and meter links reconcile together; metadata-only edits preserve stored history.
- Capacity, quantity, and unit edits reuse the existing calculation for affected non-overridden annual values. Source removal reviews the current saved history through the shell portal. Extra-source and ambiguous imported records are preserved.
- **UI iteration:** Meter-group selection is below Notes in a confirm/cancel slideout. Confirmed links determine the utility selection as in v0; groups with overlapping utility sources cannot be selected together. Group links and their utilities apply together after any required history-removal review. Manual utility selection remains available without linked groups. No existing record is rewritten on opening.
- Full-item copy and reviewed deletion preserve energy-use groups and meter groups. Compound creation rolls back atomically; stable creation/copy identities prevent duplicate items after a committed write followed by a refresh failure.
- Focused validation: 74 fast tests and 13 Chromium checks passed. Native checks cover creation without readings, autosave and calculated values, full-history copying, deletion, rollback, idempotent creation retry, ownership rejection, stale review, reopening, and account/facility backup restore with extra sources, zero overrides, retirement, and remapped links.
- Visual/interaction evidence: Settings was inspected at desktop and narrow widths in light, dark, and high-contrast modes. Shared select indicators, connected sections, keyboard focus, Escape cancellation, and shell-portal confirmations are retained. Phase 1 inventory/history/scope checks continue to pass.
- Phase 2 completed local form layout and UI/UX iteration and is approved for PR review. Annual Data editing and the later roadmap phases remain deferred. No database schema, data-version, backup-format, import-format, Worker, or Electron bridge changes are introduced.

Final functional validation for the phase 2 baseline:

| Check | Result |
| --- | --- |
| Validation planner over the complete phase 2 diff | Passed; focused specs, app type-check, and browser checks selected. Both production builds also ran for the persistence boundary. |
| `npx tsc -p tsconfig.app.json --noEmit` | Passed. |
| `npm run test:all:ci` | Passed: 3,348 fast tests and 354 Chromium tests. |
| `npm run build-prod` | Passed. |
| `npm run build-prod-electron` | Passed. |

Builds retain existing browser-support, stylesheet-budget, and CommonJS warnings. The initial restricted focused test process exited 134; the permitted rerun and final full suites passed. Early browser journey failures came from fixture mounting and asynchronous handoff timing; those fixtures now exercise actual controls and await committed results. Desktop OS integration checks are not needed because no Electron bridge or file-delivery behavior changed. UI layout/UX review remains pending before any PRs are opened.

UI iteration batch validation (2026-11-04):

| Check | Result |
| --- | --- |
| Validation planner and app TypeScript check | Passed. |
| Focused Energy Uses, link contracts, Meter icons, shared slideout, and form architecture tests | Passed: 71 tests. |
| `npm run test:all:ci` | Passed: 3,361 fast tests and 356 Chromium tests. |
| `npm run build-prod` and `npm run build-prod-electron` | Passed; existing browser-support, stylesheet-budget, and CommonJS warnings remain. |
| Settings and meter-group slideout layouts | Inspected at desktop and narrow widths in light, dark, and high-contrast modes; no horizontal overflow. |
| Native interaction checks | Passed: nested creation slideouts preserve drafts and restore focus; checkboxes remain local until confirmation; conflicting groups are disabled; cancelled history review leaves storage unchanged; confirmed links and utilities publish once and survive reopening. |

The batch adds regression coverage for short unit addons and the equipment-count label. An additional imported-data regression exposed a checklist restriction that prevented reselecting a saved third utility before confirmation; this is fixed without allowing new utilities beyond the two-source limit. Initial new browser-fixture compilation and database-store naming errors were corrected before the successful focused and full runs. Existing backup, override, retirement, copying, deletion, and navigation checks continue to pass. At this checkpoint, UI review remained open and no PRs had been opened.

PR stack handoff validation (2026-11-04):

Phase 1 (#2862) has merged. The reviewed phase 2 stack now targets `unified-ux` → `codex/energy-uses-commands` → `codex/energy-uses-settings` → `codex/energy-uses-phase2-acceptance`. Local correctness/data-safety, Angular/reuse, and validation reviews found no actionable findings; publication was approved after that checkpoint. The assembled Energy Uses source and tests match the UI iteration snapshot, and newer base-branch shell/workflow changes are retained. Screenshot artifacts remain local and outside the PR comparisons.

| Check | Result |
| --- | --- |
| Commands slice | App type-check, 25 focused fast tests, and 6 native IndexedDB tests passed independently. |
| Creation/Settings slice | App type-check, 66 focused fast tests, and 4 Chromium inventory/navigation journeys passed independently. |
| Validation planner over the complete 54-file stack | Passed; screenshot artifacts excluded from the comparison. |
| `npx tsc -p tsconfig.app.json --noEmit` | Passed on the assembled stack. |
| `npm run test:all:ci` | Passed: 3,373 fast tests and 357 Chromium tests on the merged phase 1 base. |
| `npm run build-prod` and `npm run build-prod-electron` | Passed; existing browser-support, stylesheet-budget, and CommonJS warnings remain. |

No new application defects were found during restacking. Desktop OS integration was not rechecked because no Electron bridge, filesystem, or file-delivery behavior changed. Annual Data and the remaining roadmap phases are still planned.

Review follow-up for [#2865](https://github.com/ORNL-AMO/VERIFI/pull/2865#pullrequestreview-5779652386) (2026-11-05):

| Finding | Correction and regression evidence |
| --- | --- |
| [Settings can carry stale annual history](https://github.com/ORNL-AMO/VERIFI/pull/2865#discussion_r4476424186) | Normalize sources to their four Settings fields. Wider equipment rows cannot overwrite current annual history or overrides; metadata-only and capacity-change regressions both failed before the fix and pass afterward. |
| [Creation retry ignores a changed group name](https://github.com/ORNL-AMO/VERIFI/pull/2865#discussion_r4476424253) | Revalidate the durable group's ownership and submitted new-group name before accepting a matching item retry. Native regressions reject changed names, missing groups, and foreign groups without altering saved records. |
| [Copy accepts a changed or deleted source](https://github.com/ORNL-AMO/VERIFI/pull/2865#discussion_r4476424287) | Validate the owned source snapshot inside the same native transaction that inserts the copy. Native regressions reject changed annual history and deleted sources without publishing; valid copies and matching retries still succeed. |

The fixes are in the owning command branch at `b4c1bc7e2` and propagate through the stack with merge commits. No history rewriting, persisted-shape changes, schema/version migration, or v0 method changes are needed. The initial native copy fixture needed its workspace storage provider configured before reproducing both copy defects.

| Check | Result |
| --- | --- |
| Validation planner scoped to the six review-fix files | Passed. |
| Owning-branch focused tests and app type-check | Passed: 27 fast tests, 12 native IndexedDB tests, and TypeScript check. |
| Assembled-stack app type-check and `npm run test:all:ci` | Passed: 3,375 fast tests and 363 Chromium tests, including existing full-history copy and backup-restore journeys. |
| `npm run build-prod` and `npm run build-prod-electron` | Passed; existing browser-support, stylesheet-budget, and CommonJS warnings remain. |

UI layout and OS integration were not rechecked because this follow-up changes Settings projection and persistence validation without changing presentation, Electron IPC, or file-delivery paths.

PR two [drawer-identity review follow-up](https://github.com/ORNL-AMO/VERIFI/pull/2866#discussion_r4481389691) (2026-11-05):

The shared fields now require an editor identity and capture it when opening either selection drawer. Workbench item changes and creation-facility changes close the selection; confirmation checks the identity again before emitting. An unrelated metadata refresh within the same editor preserves the open selection. The fix belongs to PR #2866 at `64df1cef8` and is merged into the acceptance branch without rewriting published history.

| Check | Result |
| --- | --- |
| Browser Back between reused item editors with identical setup | Both Utilities and Meter Groups cases failed on the reviewed head and pass after the fix; neither emits a Settings save or changes stored values. Reopening uses the current item's selection. |
| Focused Energy Uses, slideout, and form-architecture tests | Passed: 65 tests, including stale confirmations before another render and both creation-facility changes retaining the draft. |
| Owning-PR Chromium journeys | Passed: 6 inventory/navigation journeys. |
| Assembled-stack Chromium journeys | Passed: 11 journeys, including nested creation focus, history review, copy/delete, and backup restoration. |
| Owning/assembled app type-check and production web build | Passed; existing build warnings remain. |
| Validation planner | Passed over the eight follow-up files. |

The full suites, Electron build, and OS integration checks were not repeated for this UI-only follow-up: persistence, calculation, IPC, file formats, and layout rules are unchanged. The earlier full persistence validation remains recorded above. Local screenshot artifacts are preserved outside the PR changes.

## Defaults and deferred work

- Retain **Energy Uses** and use **energy use** for an individual item; retain existing stored equipment terminology.
- Preserve the established two-source creation limit while retaining existing/imported extra sources without truncation.
- Existing retirement and missing-year propagation inconsistencies are documented separately from formula changes. This migration preserves history and avoids introducing retirement-adjusted item rollups.
- A later grouping plan will define group editing, reassignment, bulk moves, deletion semantics, group/facility summaries, footprint balances, and Sankey views.
