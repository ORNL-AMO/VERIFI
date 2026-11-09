# V1 Energy Uses Migration Plan

## Purpose and delivery

Migrate Energy Uses into the existing v1 Data workflow as a group-first inventory of individual energy uses. An item may represent equipment, a system, or a process.

Use the shared Data inventory and workbench patterns. Each energy-use group owns a workbench with **Setup Group** first, followed by **Energy Use Items** **Group Summary**, **Group Footprint**, and **Facility Footprint**. Energy Use Items owns an internal member sidebar; each item retains its combined Setup editor and autosave. Support estimation independently of meter readings.

The [current accepted behavior](#current-accepted-behavior) is the authoritative workflow reference for the implementation under review. The phased delivery sections record targets and historical evidence; earlier phase descriptions do not override that current contract. The first release includes the complete item workflow: management, estimation, calculators, charts, comparisons, bulk actions, retirement, and Excel export. Phase 4D supersedes the Phase 3A item dashboard/navigation and the Phase 4 item History destination. Broader group management remains a separate planning effort.

The [Energy Uses review and hardening plan](v1-energy-uses-review-and-hardening-plan.md) records the implementation review and completed reliability, code-organization, skill-guidance, and backup recovery work. It preserves the accepted data-entry workflow and separates remaining results/export acceptance.

| Phase | Deliverable | Status |
| --- | --- | --- |
| 1 | Inventory and workspace navigation | Complete |
| 2 | Creation, Settings, and safe commands | Merged into `unified-ux` |
| 3 | Combined Setup, annual data, and estimation | Merged |
| 3A | Group browsing, nested navigation, and equipment icons | Merged in [#2874](https://github.com/ORNL-AMO/VERIFI/pull/2874) |
| 4 | Complete item tools and charts | Group/facility results implemented; inventory polish follows in the stack |
| 4D | Group workbench, Setup Group, and item sidebar | Approved workflow implemented and validated; prepared for stacked PR review |
| 5 | Export, compatibility, and release acceptance | Planned |

## Current accepted behavior

This section owns current Energy Uses workflow requirements. Architectural preservation and transaction invariants live in [Energy-use group workbench](../ARCHITECTURE.md#energy-use-group-workbench) and [annual projections](../ARCHITECTURE.md#energy-use-item-tools-and-annual-projections). Update this section when accepted behavior changes; retain phase evidence below as history.

### Browsing and navigation

- Energy Uses shows existing groups as scoped inventory cards, including empty groups and a synthetic unavailable-group bucket for orphaned items. Cards retain equipment icons, linked member summaries, linked utility meter-group unions, missing-source/annual-data notices, and independent outer browse restoration. Group notes are hidden on cards; browsing does not initialize or recalculate records.
- Facility-owned `data/energy-uses/groups/:energyUseGroupGuid` routes open the group workbench. **Setup Group** at `/setup` is the first primary tab; **Energy Use Items** at `/items/:energyUseGuid` selects the combined item editor. Group landing restores the last successful account/facility/group session visit, otherwise the first alphabetical member, using replacement navigation. Empty groups stay at `/items`. Standalone item and History URLs are removed without aliases.
- The global sidebar stops at groups; the group switcher stays facility-scoped. Energy Use Items lists every member in an icon/name rail, independently scrolling beside the editor and becoming a compact horizontal rail at narrow widths. Outer inventory filters do not hide members. There is no item finder or repeated selected-item title strip. Setup Group remains full width.
- Item switches use guarded peer navigation and retain the item editing identity. Keep the outlet and protected drafts mounted when saved groups/items disappear. Creation/copy opens the new member; single-item deletion selects the next alphabetical survivor, then the previous survivor, or the empty group. Synthetic unavailable groups permit orphan access without relationship repair, editable group metadata, or group-preselected creation.

### Combined Setup and utilities

- One typed Settings session edits equipment settings and explicit annual rows together. Annual sections appear in ascending order, with immediate estimates, operating assumptions, source amounts/units, overrides, and copy/remove-year actions. Opening saved records does not recalculate history. Setup readiness is local form feedback, separate from global workspace status. Save feedback stays in the top workbench header through the editor's refresh.
- Creation chooses a facility, existing group or named new group, and item name; a new group and first item commit atomically. Creation uses existing source/year defaults. New utilities follow the established two-source limit while preserving imported extra/duplicate sources. Manual utility selection retains compatible meter links and reviews required unlinking/history removal. Confirmed meter-group selection determines utilities without overlapping sources across selected groups; links and utilities update together after review, never during hydration.
- Source/year edits preserve untouched history, copied amounts, calculator inputs, and manual overrides. Review destructive source/year removal against current saved data. Derived consumption is excluded from draft equality. Settings maps edits onto the latest equipment record and preserves unrelated edits. Calculators apply typed values to the existing draft; cancel leaves it unchanged. Retirement/reinstatement preserves saved history.

### Setup Group and Add year

- Setup Group autosaves existing name/notes through the shared Settings session and allowlisted metadata command. Its **Energy Use Equipment** table shows all members with selection, linked Name, Industrial System, Utility Types, and Notes columns. Item names include equipment icons. Content is vertically centered and wraps within fixed columns without a horizontal table scrollbar. There is no search, pagination, Choose action, Copy year, Remove year, or Clear selection action.
- The right-aligned action row offers Add energy use, Add year, and Delete selected. Selection actions require selected rows. Group settings that are unsaved, failed, conflicted, or busy disable management. Group changes clear selection. Reviewed bulk deletion uses the shared shell confirmation and stays in Setup Group after completion.
- Add year opens a guided shell-portal slideout. Year cards combine valid saved meter, predictor, and equipment years across the current account, independent of selected equipment; use the current calendar year when none exist, or Other for a typed fiscal year. Each item starts from its highest saved fiscal year, preserving copied calculation provenance, or loads an existing destination year for editing.
- Completed equipment appears above the current shared annual form and remaining equipment below it. Next validates without saving, skips reviewed items, and wraps to earlier unfinished equipment. Save all is available when every other item is reviewed, independent of alphabetical position, and commits the entire batch atomically. Embedded calculators reuse the same annual fields without replacing the portal.
- The table owns detached per-item drafts and recovery state outside the portal. Preserve other years/settings, block ambiguous rows and stale ownership/membership, and confirm year resets, discard, and reload. Reload retains unaffected drafts; changed facility settings reset all drafts. Rejected writes retain retryable drafts; committed-refresh failures permit refresh-only recovery and never repeat persistence.

### Results and compatibility scope

- Inventory Charts and feature-owned annual projection helpers remain available. Group Graphs, Table Results, and restored History presentation are subsequent work, without placeholder tabs. Existing projection preserves saved amounts, source-year/unit/override provenance, actual fiscal periods, and explicit history after retirement; it never persists inferred rows.
- Excel export and final compatibility/release acceptance remain Phase 5. Keep stored equipment/group shapes, GUID relationships, calculations, backup formats, and v0 behavior. The [hardening plan](v1-energy-uses-review-and-hardening-plan.md) records localized reliability fixes and backup recovery acceptance; these do not authorize broader group management or a new results design.

## Architecture and contracts

- Keep production UI under [`src/app/v1/data/energy-uses/`](../src/app/v1/data/energy-uses/), using feature-owned inventory projections, a collection workspace service, and separate group and selected-item workbench contexts. Reuse shared inventory, workbench, navigation, chart, and modal presentation. Follow the [Data workbench architecture norms](unified-ux-migration.md#production-v1-data-workbench-architecture-norms).
- Continue using the existing [equipment](../src/app/data/models/idbModels/facilityEnergyUseEquipment.ts) and [group](../src/app/data/models/idbModels/facilityEnergyUseGroups.ts) records. Keep their persisted names, GUID relationships, annual arrays, and backup formats. No database schema or data-version migration is planned.
- Every item retains its required energy-use group relationship. Browse existing groups as cards and their members as workbench tabs, without regrouping or rewriting existing records. Energy-use grouping and optional utility meter-group links remain separate relationships.
- Add typed Energy Use settings, annual-data, creation, and command contracts. The combined Setup editor uses one [shared Data editing session](v1-data-form-architecture-roadmap.md) for serialized autosave, reconciliation, failed drafts, and navigation protection.
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
- Creation collects an owning facility (unless already scoped), an existing energy-use group or a new group name, and an item name. The prior completed fiscal year and equipment setup use existing defaults; detailed configuration belongs to Settings. Creating a group and its first item is one transaction.
- Retain the existing facility and energy-use group ownership after creation. Group management and reassignment remain deferred.
- Add copy and single-item deletion. Copies receive fresh identity and independent nested data; deleting an item leaves its group and linked meter groups intact.
- Preserve all saved source data. Linking or unlinking meters must not silently create, replace, or remove annual history. Destructive source changes require explicit review.

**Completion:** Users can create and manage energy uses without meter readings, with working autosave, conflict review, retry, and discard protection.

### Phase 3 — Combined Setup, annual data, and estimation

Extend the existing editor into one Setup tab, retaining `/settings` and removing the unshipped Annual Data route and shell without a compatibility alias. Display all fiscal years in ascending order, with operating assumptions and compact per-source consumption rows in each connected year section.

- Allow explicit years using the facility's fiscal-year meaning; meter data does not constrain available years.
- Cover operating hours, load factor, duty factor, electricity efficiency, consumption units, and manual overrides.
- Update estimates immediately as edits are made. Keep save feedback and Setup validation chips in the sticky header; omit flashing inline preview labels, footer save reminders, and availability alerts during the editor's own save. Autosave valid changes through the shared editing lifecycle.
- Preserve existing formulas, conversion precision, zero values, overrides, and stored history. Invalid inputs or non-finite calculated results block the affected save.
- Add and copy years across operating conditions and every source consistently. Copy stored amounts, units, override flags, and optional calculator inputs independently; changing a manual value's units retains the entered number. Confirm year removal.
- Present Linked Utility Meter Groups separately, with group icons, an empty state, and a right-aligned blue selection action. Keep Select Utilities available with linked groups; review any links that must be removed and apply utility/link changes together, preserving retained source history.
- Keep equipment and annual projections distinct within one typed form and editing session. Merge annual entries by source/year, preserve unrelated edits, and surface conflicts when source changes invalidate an annual draft.
- Opening a record never recalculates or rewrites saved values.

**Completion:** A user can create an energy use, enter annual assumptions, override consumption, reopen it, and recover the same saved values.

### Phase 3A — Group browsing and equipment icons

Deliver one combined Phase 3A PR against `unified-ux` on the merged Phase 3 baseline. Browsing, navigation, icons, and the accepted UI refinements are reviewed and validated together; the original three local slices are retained as historical implementation evidence below.

- Replace individual item cards with existing energy-use group cards, retaining empty groups, scope, search, sorting, detail levels, and pagination. Show one icon per equipment type instead of item-count status text. Summary is a list of matching items with their icons and direct workbench links; Detailed adds sources, saved years, and the deduplicated linked utility meter groups. V1 hides energy-use group notes; group and item cards omit lifecycle fields while lifecycle filtering remains available. Keep large member lists scrollable; consumption rollups remain deferred.
- Open facility-owned groups at `data/energy-uses/groups/:energyUseGroupGuid`; keep existing item Setup URLs. Search group and item metadata consistently and carry dashboard filters into the group dashboard of individual energy-use cards, paginated at 24 cards. Reuse the same Data inventory header, breadcrumbs, search, detail levels, and grid at both levels. Restore filters, page, scroll, and focus separately at each level.
- Keep orphaned items discoverable through a read-only `unavailable` group bucket. Add energy use preselects the current group and facility through the existing creation workflow. No group management or relationship repair is introduced.
- Nest sidebar links as Energy Uses → group → items. Groups start collapsed; accepted item navigation opens its group. Cap each expanded preview at 20 items, retaining the current item, and provide View all. Keep disclosure state in memory. Add group breadcrumbs and scope Setup switching to the current group.
- Apply reviewed custom equipment icons, including Motor, and Hugeicons AirVent, LampCeiling, and Forklift for HVAC, Lighting, and Mobile. Use Ufo for Other/unknown categories and the collection icon for groups, through one category lookup.
- Review browsing, then navigation, then icons/layout. Cover 100 groups and 1,000 items, ownership, missing groups, empty groups, sparse history, extra sources, retirement, Back/Forward, guarded exits, keyboard/focus, responsive layouts, themes, and printing. Complete focused tests, app type-check, production web build, and pre-PR full suites; no Electron boundary is changed.

**Completion:** Large inventories are navigable through group cards and nested item-card dashboards, with bounded sidebar previews and unchanged committed data. Phase 4 bulk actions and comparisons continue to target individual equipment GUIDs from the group item dashboards.

### Phase 4 — Complete item tools and charts

Finish the item workflow before declaring release readiness.

- Migrate operating-hours, load-factor, and rated-power calculators. Calculators requiring fuel or meter information explain their prerequisites; direct input remains available.
- Add retirement and reinstatement using existing lifecycle fields. The retirement year is the last active year; stop carry-forward afterward while preserving and displaying explicitly saved history. Reinstatement restores projection eligibility.
- Add reviewed bulk deletion and bulk year operations. Each confirmed batch is atomic; selection follows the existing inventory behavior across pagination.
- Add annual workbench charts and inventory comparisons through shared chart presentation.
- Resolve committed consumption per source/year: use the explicit entry or its latest earlier entry, carrying its amount, units, and override provenance unchanged. Never backfill before the first entry or persist projected rows. Label carried-forward values and their originating fiscal year; preserve genuine gaps and surface invalid or ambiguous rows.
- Dashboard treemaps use the shared Charts drawer at both browsing levels. Portfolio hierarchy is actual fiscal period → facility → group → item; totals and percentages remain within matching period branches. Named scope uses facility → group → item; group scope uses group → item. Item workbenches add a History tab.

**Completion:** Users can complete item-level work without returning to v0. Group moves, broader group rollups, and footprint diagrams remain outside this milestone; chart-only subtotals are included.

### Phase 4D — Group workbench pivot

Replace the group item-card dashboard and standalone item workbench with one facility-owned group workbench. This supersedes the navigation and History presentation described in Phases 3A and 4; their forms, command safety, projections, and validation evidence remain applicable.

- Canonical routes are `data/energy-uses/groups/:energyUseGroupGuid`, `/items`, and `/items/:energyUseGuid`. Group landing selects the remembered successful item visit for this account/facility/group, otherwise the first alphabetical member, using replacement navigation. Empty groups remain at `/items`. Old standalone item routes are removed without aliases.
- The group title switches among groups in the current facility. **Setup Group** is the first primary tab and owns group name, notes, and inline item management. **Energy Use Items** contains every member in an icon/name sidebar patterned after Account Analysis Select Facility Items; the item finder and repeated selected-item title/status strip are removed. Outer inventory filters never hide members; returning restores inventory filters, paging, scroll, and focus. Sidebar links stop at the group, and item switches use peer motion.
- Reuse the combined Setup editor, annual sections, calculators, lifecycle actions, editing identity, autosave/reconciliation, guarded navigation, and selected-editor save feedback in the top workbench header. Creation preselects the facility/group; create/copy selects the new item. Deletion selects the next alphabetical survivor, then the previous survivor, or the empty group.
- **Setup Group** autosaves the existing group's name/notes through the shared Settings session and guarded `/setup` route, preserving conflicts, failed drafts, and normalized-equivalent raw text. Queued commands merge current metadata and revalidate the durable facility/group before writing the allowlisted fields and modification date; item relationships/history and other group fields remain untouched. Synthetic unavailable groups cannot edit metadata.
- **Energy Use Equipment** shows every group member in one table with selection, linked Name, Industrial System, Utility Types, and Notes columns. Name links open the corresponding item in Energy Use Items. Search, pagination, and Choose action are removed. A right-aligned action row always shows Add energy use, Add year, and Delete selected; selection actions are disabled without selected rows. Creation moves here from the workbench header and remains available for empty groups. Clear selection, Copy year, and Remove year are not offered. Item names include category icons; content is vertically centered and wraps without a table scrollbar. Shared shell-portal confirmation handles add-year inputs and reviewed deletion. Group changes clear selection; reviewed commands, stale-record checks, atomicity, and publication-only recovery remain. Unsaved, failed, conflicted, or in-progress group settings disable management. Bulk deletion stays in Setup Group.
- Missing/mismatched groups/items show unavailable states while mounted editor drafts remain protected. The synthetic unavailable-group bucket retains orphan access without repairing relationships or permitting group-preselected creation.
- Keep inventory Charts and update all item destinations. Remove the item History tab/route; reusable chart/projection logic remains. Group **Graphs**, **Table Results**, and restored History presentation are deferred without placeholder tabs. No persisted schema, existing item command payload, formula, backup, import, or Electron boundary changes. Group metadata uses an explicit new allowlisted command.

**Completion:** Users open one group workbench, switch item forms from the internal sidebar without another drill-in, and manage selected members from Setup Group with reviewed confirmation. Focused route/editor/sidebar/management tests, Chromium history/layout/focus journeys, type-check, and production web compilation cover this pivot.

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

Use `npm run validate:agent -- --mode plan` with the files changed in each phase to choose focused checks. Phase 4 validation stays focused on changed Energy Use behavior, shared web chart/navigation contracts, native IndexedDB commands, the app type-check, and production web compilation. It does not change Electron boundaries and does not require Electron validation. Full-suite and desktop export acceptance belong to the later release/export milestone where those checks apply. Record results and remaining gaps with the completed phase.

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

- Creation uses the shared inventory header registry and Reports-style progressive choices: facility (unless already scoped), existing energy-use group or name-only new group, then item name. Pinned selections, dirty-draft protection, and retry retain the draft. Existing defaults supply the prior completed fiscal year and equipment setup; configuration continues in Settings. No meter readings are required.
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

Builds retain existing browser-support, stylesheet-budget, and CommonJS warnings. The initial restricted focused test process exited 134; the permitted rerun and final full suites passed. Early browser journey failures came from fixture mounting and asynchronous handoff timing; those fixtures now exercise actual controls and await committed results. Desktop OS integration checks are not needed because no Electron bridge or file-delivery behavior changed. At this baseline checkpoint, UI layout/UX review remained pending before PR publication.

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

Simple creation redesign (2026-11-05):

Creation now shares Reports' progressive choice-card, pinned-selection, and footer presentation. Choose a facility unless ownership is already scoped, choose an existing energy-use group or give a new group its name, then name the item and create. Naming a new group does not persist it early: the final action commits the group and item together. Creation supplies the existing default source/setup and prior completed fiscal year, then opens Settings for detailed configuration. No utility, meter-link, capacity, category, notes, or year-entry controls remain in creation.

The cleanup sweep removed the previous Settings-form dependency, context/year controls, source-selection handlers, creation-only editor/refresh state, obsolete styles, and nested utility-panel rendering path. It also removed the unused direct Settings add-source handler superseded by the checklist. Settings' identity-scoped selectors and pending source-removal review remain active. Old creation-selector tests were replaced with the progressive workflow and discard-review checks. Reports and Energy Uses use one shared presentation stylesheet; feature state and commands remain separate. No persisted shape, factory defaults, schema, backup format, or calculation contract changed.

| Check | Result |
| --- | --- |
| Validation planner and app TypeScript check | Passed for the redesign and final cleanup. |
| Focused creation, Settings, Reports lifecycle, and form-architecture checks | Passed: 74 fast tests, repeated after cleanup. |
| Creation and Reports browser checks | Passed: 21 Chromium tests. |
| Full `npm run test:all:ci` | Passed: 3,382 fast tests and 368 Chromium tests before the final dead-code cleanup. |
| Final creation, Settings, and inventory browser checks | Passed after cleanup: 14 Chromium tests, including new/existing groups, no early group writes, no-readings creation, discard focus restoration, selectors, guarded route reuse, copy/delete, and backup restoration. |
| `npm run build-prod` | Passed for the redesign and final cleanup; existing browser-support, stylesheet-budget, and CommonJS warnings remain. |
| Visual/keyboard checks | Inspected desktop light and narrow dark/high-contrast choices, pinned selections, and name entry; browser checks cover focus, Escape, keyboard submit, and no horizontal overflow. |
| Local review and stale-code sweep | No actionable findings remain in the updated comparisons. Screenshot artifacts remain outside the commits. |

The initial app check identified an incorrect icon-type import, corrected before the passing checks. Visual inspection also caught an unthemed input surface; both flows now use the shared theme-aware input class. Full suites were not repeated after deleting the unused handler and nested rendering branch; focused compilation, type-check, browser journeys, and the production build passed on that final code. Electron build and OS checks were not repeated for this renderer-only redesign; the earlier persistence-stack evidence remains above. Annual Data and later roadmap phases remain deferred.

## Phase 3 local delivery evidence

Combined Setup uses one typed form and Settings editing session for equipment settings and all annual rows, presented oldest first. Save feedback and validation remain in the workbench header. Year actions, utility changes, overrides, and source/history reviews preserve the existing record and backup shapes; no schema, formula, or v0 workflow changes are introduced.

The local review fixes cover coherent copying before autosave, clearing removed optional calculator inputs during silent hydration, safe edits and independent reconciliation beside duplicate history, and supported conflict choices for remotely deleted sources/years. Complete affected drafts and their baselines remain mounted until saved deletion is explicitly accepted. The stale Settings-only command, tab-event subscription/metadata, and unused group/preview state are removed. The combined editor delegates validation to its form service, including current meter-link context.

Validation on the iteration checkout (2026-11-05):

| Check | Result |
| --- | --- |
| Validation planner and app TypeScript check | Passed. |
| Focused Energy Uses and shared editing checks | Passed: 135 fast tests. |
| Focused Chromium persistence, journeys, and backup compatibility | Passed: 19 tests, including copying pending inputs, native rollback/reopen, source/year reviews, navigation, and backup restoration. |
| Full `npm run test:all:ci` | Passed: 3,430 fast tests and 373 Chromium tests. |
| `npm run build-prod` | Passed; existing browser-support, stylesheet-budget, and CommonJS warnings remain. |
| `npm run build-prod-electron` | Passed; existing browser-support, stylesheet-budget, and CommonJS warnings remain. |
| Updated local review and `git diff --check` | No additional actionable findings; whitespace check passed. |

Four supplemental review probes initially reproduced the defects and are now covered by permanent regression tests. Chromium also caught a normalization regression while consolidating validation: empty optional form controls made untouched imported history appear edited. Normalizing before delta validation fixed it; the focused checks and full suites above passed afterward.

Desktop/narrow, theme, focus, keyboard, and print behavior are covered by the existing phase 3 browser journeys and local screenshot evidence. Native Electron OS integration was not exercised because no IPC, filesystem, or OS workflow changed. The stack targets `unified-ux` → `codex/energy-uses-annual-contracts` → `codex/energy-uses-setup` → `codex/energy-uses-phase3-acceptance`, in that merge order. Each exact comparison received a local review and validation plan; no actionable findings remain. Publication is approved, with initial GitHub CI verification performed after opening each PR. Screenshot artifacts and unrelated custom-icon work remain local and unstaged.

Stack assembly validation (2026-11-05):

| Comparison | Validation |
| --- | --- |
| `unified-ux` → annual contracts | 135 focused fast tests, 29 Chromium tests, app type-check, and production web build passed. The phase 2 UI remains functional. |
| Annual contracts → combined Setup | 196 focused fast tests, 18 Chromium journeys, app type-check, and production web build passed. Application files match the approved iteration snapshot. |
| Combined Setup → acceptance | Ten focused Chromium checks passed, including coherent pending-copy persistence and combined-edit backup restoration. The comparison contains acceptance tests and documentation only. |
| Complete isolated stack | Full suite passed: 3,418 fast tests and 373 Chromium tests. App type-check and both production web and Electron renderer builds passed. |
| Presentation and boundaries | Desktop light and narrow high-contrast screenshots inspected. Local artifacts preserved outside the comparisons; no schema, backup-format, formula, v0, IPC, or OS workflow changes. |

The isolated checkout excludes unrelated custom-icon edits, so its fast-test total differs from the iteration checkout above. Existing browser-support, stylesheet-budget, and CommonJS warnings remain. Native Electron OS integration was not exercised.

## Phase 3A delivery evidence

### Initial group-list iteration

Initially implemented as three local dependent branches: `codex/energy-uses-group-browsing` → `codex/energy-uses-group-navigation` → `codex/energy-uses-group-icons-acceptance`. The stack was rebased cleanly onto Phase 3 acceptance head `fe6940b63` after its history-reconciliation review fixes arrived. Phase 3 was still WIP at this checkpoint; no Phase 3 branches or unrelated iteration-worktree files were changed.

Group cards retain empty groups and describe committed inventory metadata. Facility-qualified identities keep equal group names separate; orphaned items remain accessible in the read-only unavailable bucket. Group lists page 24 items, transfer dashboard filters, preselect creation, and restore history independently. Sidebar groups expose at most 20 item links plus View all, retain the active item, preserve manual collapse during publication, and open after accepted item navigation. Setup switching and breadcrumbs follow group membership. Icons use the reviewed custom SVGs and selected Hugeicons through one category lookup.

Validation on the refreshed stack (2026-11-05):

| Check | Result |
| --- | --- |
| Exact-comparison validation planner, all three slices | Passed. |
| `npx tsc -p tsconfig.app.json --noEmit` | Passed. |
| Group browsing slice | 32 focused fast tests and 7 Chromium journeys passed before the upstream refresh. |
| Group navigation slice | 142 focused fast tests and 9 Chromium journeys passed before the upstream refresh. |
| Equipment icons and feature checks | 209 focused fast tests passed, including SVG geometry, stroke widths, labels, and unknown-category fallback. |
| `npm run test:all:ci`, refreshed Phase 3 base | Passed: 3,473 fast tests and 381 Chromium tests. |
| Final focused Chromium journeys | 11 passed, including an additional cross-facility unavailable-group history probe added after the full-suite bundle compiled. |
| `npm run build-prod` | Passed for each slice, including the final refreshed stack. |
| Local comparison review and `git diff --check` | No actionable findings; whitespace checks passed. |
| Visual and interaction evidence | Inspected desktop light and narrow dark/high-contrast cards and group lists, equipment icons, nested sidebar, keyboard disclosure, long labels, internal table scrolling, and Back/Forward focus restoration. Existing print-card controls remain covered. |

The scale fixtures cover 100 groups and 1,000 items; the rendered 1,000-item group remains capped at 24 table rows and the active sidebar preview at 20 item links. Browsing and navigation preserve committed workspace snapshots. Visual review caught and corrected unreadable narrow columns and inherited nested-chevron rotation.

Initial restricted Angular test/build processes exited 134; permitted reruns passed. Initial template and test-fixture compilation errors were corrected before the passing checks. Browser-support, stylesheet-budget, and CommonJS build warnings remain; the full browser suite also logs duplicate-key warnings from meter fixtures. Native print-dialog and Electron OS checks were not exercised. No Electron, schema, calculation, persistence-command, or file-format boundary changed. Screenshot artifacts remain local and excluded from the stack.

At this historical checkpoint, publication was paused for local review and Phase 3 was still open. Phase 3 has since merged; the final delivery is one combined PR against `unified-ux`, as specified above.

### Nested card-dashboard iteration

The group drill-in now reuses the same Data inventory host and shared card grid as the group dashboard. Its header shows account/facility context, the Energy Uses breadcrumb, the current group title, Add energy use, and Upload data. Both levels retain search, filters, detail controls, 24-card pagination, and independent browse restoration. The group-specific table, header markup, and styles are removed. Other equipment and unknown imported categories use Hugeicons `UfoIcon` through the shared category lookup.

Focused follow-up checks passed: 50 fast tests and 12 Chromium checks, including the 1,000-item card dashboard, desktop/narrow themes, shared sticky header behavior, creation preselection, orphan-group ownership, and Back/Forward restoration. Moving the routed child below the shared header exposed a history-trigger timing regression: the form retained its saved filters, but late route emissions reapplied the dashboard query. Falling back to the last accepted navigation trigger fixes hydration, and the regression journey now verifies the saved filters before navigating Back. The app TypeScript check passed. The production web build passed with existing browser-support, stylesheet-budget, and CommonJS warnings. The restricted focused test startup exited 134; its permitted rerun passed.

The original full-stack evidence above predates this feedback iteration; full suites and Electron checks were not repeated for this focused renderer change. No persisted data or calculation contract changed. Screenshot artifacts remain local and excluded from commits.

### Group-card summary iteration

Group cards now replace count status text with one accessible icon per distinct saved equipment category, using the shared lookup and UFO fallback. Summary shows matching items as icon/name links to canonical Setup routes, without the group facts grid. Detailed retains the member links and saved group facts. Long member lists scroll within the card and expand normally for printing. Workbench links use the feature navigation boundary, preserve modifier-click behavior, and omit dashboard filter query parameters; group-title links still carry dashboard filters into the group dashboard.

Focused validation: 29 fast tests and 13 Chromium checks passed, including icon deduplication, empty groups, filtered member links, direct keyboard navigation, Back restoration, responsive themes, and print presentation. App TypeScript and whitespace checks passed. Visual inspection confirmed the type strip and link-only Summary at desktop and narrow high-contrast sizes. The production web build passed with the existing browser-support, stylesheet-budget, and CommonJS warnings. Full suites were not repeated for this focused presentation change.

### Card metadata and utility-link iteration

V1 no longer displays energy-use group notes on group pages or cards. Group notes remain saved for compatibility and v0; individual equipment notes are unaffected. Both group and equipment cards omit Lifecycle. Equipment cards omit the redundant Saved annual data status note and show their linked utility meter groups, and group Detailed cards show the deduplicated union across all members. Summary group cards remain item-link lists. Group links use the existing meter-group workbench routes and icons; missing or foreign references retain a non-link unavailable label without revealing foreign names or changing saved relationships. Empty link lists show None linked.

Focused follow-up validation passed: 33 fast tests and 17 Chromium checks cover ownership, missing references, deduplication, links, modifier clicks, printing, hidden group notes/lifecycle, responsive themes, and unchanged workspace snapshots. The app TypeScript and whitespace checks passed. Visual inspection confirmed group meter links and the simplified metadata at desktop and narrow high-contrast widths. The production web build passed with the existing browser-support, stylesheet-budget, and CommonJS warnings. V0, persisted models, commands, calculations, and file formats are unchanged; full suites were not repeated for this focused renderer change.


### Final combined-PR review and cleanup

After Phase 3 merged, delivery changed to one combined Phase 3A PR against `unified-ux`. The final implementation includes the nested card dashboards, linked item summaries, meter-group links, approved equipment icons, and creation-slideout group icons described above.

The combined review found two browser-test navigation fixtures missing the group-context accessor used by the shared inventory header. Updating the shared inventory fixture and meter-creation fixture resolved all 14 failures. The dead-code sweep removed obsolete group-count/lifecycle/note presentation fields, a duplicate filtered-member projection, the unused flat-item dashboard filtering branch, and an unused import/export. Saved notes and retirement data, note searching, lifecycle filtering, v0 behavior, and the live combined Setup form helpers are preserved. The earlier group table markup and styles were already removed during UI iteration.

Final validation (2026-11-05):

| Check | Result |
| --- | --- |
| Validation planner over the complete 73-file comparison | Passed; local screenshot artifacts excluded. |
| Focused card/group fast tests | 33 passed. |
| Previously failing inventory/meter-creation Chromium suites | 14 passed. |
| `npm run test:all:ci` | Passed: 3,483 fast tests and 384 Chromium tests. |
| `npx tsc -p tsconfig.app.json --noEmit` | Passed. |
| `npm run build-prod` | Passed with the existing browser-support, stylesheet-budget, and CommonJS warnings. |
| Final comparison review and `git diff --check` | No actionable findings; whitespace checks passed. |
| Advisory unused-local scan | No diagnostics in changed files; repository-wide strict unused-local checking still reports existing diagnostics in unchanged files. |

The first combined review full-suite run had 14 fixture failures; the focused repair and final full suite passed. An earlier review build generated bundles but returned a nonzero status without a compiler error; confirmation and final production builds passed. Existing scale, ownership, no-write browsing, Back/Forward, rejected-navigation, focus, theme, narrow-layout, and print-markup journeys passed in the final suite. Native print-dialog and Electron OS integration remain untested because no native boundary changed. Generated screenshots were deleted after validation; the earlier local branches remain outside the combined PR. Publication awaits the local review checkpoint required by the [PR creation guide](agents/github-pr-creation.md).

## Defaults and deferred work

- Retain **Energy Uses** and use **energy use** for an individual item; retain existing stored equipment terminology.
- Simple creation uses the existing default source. Settings permits additions up to the established two-source limit while retaining existing/imported extra sources without truncation.
- Existing retirement and missing-year propagation inconsistencies are documented separately from formula changes. This migration preserves history and avoids introducing retirement-adjusted item rollups.
- Phase 3A introduces read-only group browsing. A later grouping plan will define group editing, reassignment, bulk moves, deletion semantics, group/facility consumption summaries, footprint balances, and Sankey views.

## Phase 4 delivery slices

Deliver stacked branches in order: 4A calculators, 4B retirement and atomic bulk operations, then 4C projections, treemaps, and History. Each slice records its own validation before publication.

- **4A:** Typed operating-hours, load-factor, and rated-power calculators apply to the existing Setup draft. Cancel does not edit Setup. Rated-power fuel defaults and conversion behavior are shared with the v0 adapter.
- **4B:** Group dashboards select individual equipment across pagination for reviewed Delete/Add year/Copy year/Remove year operations. Preserve existing destination years and review skips; block incomplete or ambiguous copies. One native transaction rechecks reviewed records and ownership, then publishes once.
- **4C:** Carry the latest saved amount forward until a later explicit entry replaces it. A 2022 value of 100 plus newly entered 2025 equipment at 50 produces 150 for 2025. The new equipment has no contribution before 2025. Explicit zeroes remain zero, and invalid newer entries never silently fall back. Setup contains only explicit annual rows. Removing a year may resume an earlier value; retirement stops future projection. Chart details and accessible data distinguish entered, carried-forward, missing, invalid, and inactive values.

No schema, backup, import, export, or v0 calculation policy changes are required. Chart-only period subtotals are presentation values. Excel export and release compatibility acceptance remain Phase 5.

### Phase 4A local validation

Calculator implementation: focused suite 143 passed; final full suite 3,489 fast and 385 Chromium tests passed. App TypeScript check and production web build passed. Initial restricted-process runs exited 134; unrestricted reruns passed. Desktop light and narrow dark Setup captures were inspected. Generated screenshots are not source artifacts. Publication remains deferred for user iteration.

### Phase 4 local implementation and validation

- Setup includes operating-hours, load-factor, and fuel rated-power calculators. Retirement/reinstatement and reviewed group-dashboard deletion/year batches are implemented locally; explicit annual rows and relationships are preserved.
- Dashboard Charts uses treemaps with actual-period branches, item provenance, partial-coverage details, session memory, and accessible drilldown/data links. The item History tab draws entered segments solid and carried-forward segments dashed, with source-year/override details and genuine invalid/missing gaps.
- Focused Chromium validation passed 32 tests covering transaction rollback, durable owner/stale-review rejection, one publication, refresh-only recovery, 30-item selection across pagination, reviewed deletion, 100 groups/1,000 chart items, themes, keyboard controls, and actual chart rendering. Desktop and narrow chart/review captures were inspected; inspection caught and corrected invisible History segments before the final run.
- App type-check, whitespace checks, and production web build passed. The full suites had already been run before the validation scope was narrowed: 3,509 fast and 392 Chromium tests passed. These broad suites are additional evidence, not the routine Phase 4 gate. Existing browser-support, stylesheet-budget, CommonJS, and unrelated chart deprecation warnings remain.
- The in-flight final Electron build was stopped (exit 130) when validation was narrowed to changed web/persistence behavior. No Electron validation is required for this work; native OS integration and export were not exercised.
- PR review, pushing, and PR creation remain deferred for user iteration. No schema or persisted-record migration was introduced, and projection itself performs no writes. Generated test screenshots are removed from source folders after inspection.

### Calculator UI iteration validation

Calculator triggers are input-group icon addons. Calculator/year slideouts use shared v1 field styling and neutral Cancel actions. Operating hours uses a highlighted, uniform-size result with hrs/year. Load Factor uses method toggles, attached power-unit dropdowns, a kW breakdown, and the v0 percentage precision/warning presentation. Shared modal focus recovery preserves native field-to-field Tab navigation while retaining disabled-control and nested-modal containment.

Focused validation passed: 28 fast tests across calculator helpers/forms/Setup, 19 Chromium tests across calculator slideouts and shared modal focus, app type-check, whitespace checks, and production web build. Light, dark, and high-contrast narrow captures were inspected. No broad-suite or Electron validation was run for this iteration batch; existing browser-support, style-budget, and CommonJS build warnings remain. Subsequent History feedback is a new UI iteration batch.

## Phase 4D delivery evidence

Implemented and validated locally on 2026-11-06. The group workbench replaces the second card dashboard and standalone item routes; the existing Setup forms, annual editing, calculators, lifecycle actions, and safe command boundary remain active. The sidebar ends at groups. Group Graphs, Table Results, and restored History presentation remain deferred.

| Check | Result |
| --- | --- |
| Scoped fast specs for Energy Uses, the changed inventory header, route parsing/navigation, sidebar, and shared tabs | Passed: 345 tests across 33 files. The final workbench-only rerun passed all 13 tests, including the newly added empty-group creation regression. |
| Focused Chromium Energy Uses and reused native batch-command workflows | Passed: 48 tests across 6 files. The final changed-journey rerun passed all 12 tests, including the added drawer keyboard/focus check. |
| App type-check: `npx tsc -p tsconfig.app.json --noEmit` | Passed. |
| Production web build: `npm run build-prod` | Passed; existing browser-support, stylesheet-budget, and CommonJS warnings remain. |
| Responsive, theme, focus, history, and print checks | Desktop light and narrow dark/high-contrast captures inspected. Journeys cover 1,000 long-named items, search, active-tab scrolling, 30-item drawer selection, reviewed deletion, guarded exits, Back/Forward, orphan access, and outer inventory filter/page/scroll/focus restoration. |
| Additional repository-wide form-architecture scan | Existing failure: `shared/a11y/modal-focus-trap.directive.ts` reads `event.target` for native focus tracking. This file was already modified before the pivot and remains untouched by Phase 4D. Other scan checks passed. |

Restricted fast-test/build processes initially exited 134 before results; runs with the required process access passed. An initial screenshot destination was outside the test server's allowed paths; captures now use the ignored repository `tmp/` directory. Generated screenshots were moved out of source folders, preserving their prior deletion state. No full-suite or Electron validation was run for this pivot. PR publication remains deferred.

### Setup Group layout iteration

The subsequent 2026-11-06 UI iteration places **Setup Group** first in the primary tab row, followed by **Energy Use Items**. Group landing retains the accepted item-restoration behavior; reordering tabs does not change existing deep links. Setup Group edits the persisted group's name/notes and hosts item selection and operation entry inline. Only reviewed batch confirmation uses the shell portal. The item search and repeated selected-item title/validation strip are removed; save/retry/conflict feedback is in the top header. Each item's existing name, notes, annual form, calculators, and lifecycle tools remain in its own item tab.

Group metadata uses a separate shared Settings session, explicit account/facility/group identity, queued three-way reconciliation, and a durable allowlisted metadata command. It preserves all other group fields, item GUID relationships, annual history, and supported stored/backup shapes. Missing groups retain mounted drafts; synthetic unavailable groups cannot edit name/notes. No schema, default, migration, calculation, v0 command, backup-format, or Electron boundary changes are introduced.

| Focused check | Result |
| --- | --- |
| Group/item workbench, group editing, action, management, route, and legacy command-handler fast specs | Passed: 35 tests across 6 files. |
| Chromium changed journeys and native Energy Use commands | Passed: 32 tests across 2 files; final layout rerun passed all 13 changed journeys. Covers group save/reopen, single committed publication, stale/foreign rejection, rollback, preserved item history, guarded tab changes, inline selection across pages, confirmation keyboard/focus, and retained group metadata. |
| `npx tsc -p tsconfig.app.json --noEmit` and `git diff --check` | Passed. |
| `npm run build-prod` | Passed with existing browser-support, stylesheet-budget, and CommonJS warnings. |
| Visual review | Inspected desktop light and narrow high-contrast Setup Group and item views; corrected connected section borders, field spacing, and heading styling. Captures remain under ignored `tmp/`. |

Validation used the scoped agent validation plan and followed the user's focused-check/no-Electron instruction. No full suite or Electron checks were run for this iteration.

### Setup Group equipment-table iteration

The next 2026-11-06 refinement aligns Setup Group with the v0 equipment table: every group member appears in one table with selection, Name, Industrial System, Utility Types, and Notes. Each name is a canonical native link to that item's Energy Use Items subtab, including guarded navigation and modified-click behavior. The table has no search, pagination, or Choose action workflow. A select-all checkbox and direct selection actions retain the existing reviewed year/delete commands; year inputs and review are collected inside the shared shell-portal confirmation. Narrow layouts scroll the table within its own region. Group metadata editing and item forms are unchanged.

| Focused check | Result |
| --- | --- |
| Table/management and Setup Group fast specs | Passed: 8 tests across 2 files; covers every row, canonical links, direct actions, group-change selection reset, stale review, and publication-only recovery. Initial year-action fixtures lacked the required facility energy unit; corrected fixtures pass without changing calculation or persistence behavior. |
| Changed Chromium journey file | Passed: 15 tests, including v0 column/data alignment, item-link keyboard navigation and Back, all 30 rows without paging, direct deletion, direct year input/review, confirmation focus, and responsive themes. |
| App type-check and whitespace checks | Passed: `npx tsc -p tsconfig.app.json --noEmit` and `git diff --check`. |
| Production web compilation | Passed: `npm run build-prod`, with existing browser-support, stylesheet-budget, and CommonJS warnings. |
| Visual review | Desktop light and narrow high-contrast table captures inspected under ignored `tmp/`; links, utility badges, notes, and contained horizontal scrolling remain readable. |

No persisted model, command, calculation, backup, or Electron boundary changed. No full-suite or Electron checks were run for this table iteration.

### Equipment table action and layout refinement

The final 2026-11-06 refinement moves Add energy use from the workbench header into the right-aligned equipment action row. Add energy use, Add year, and Delete selected are always visible. Creation remains available without selected rows, subject to the existing ownership/editor rules; Add year and Delete selected require selection. Clear selection, Copy year, and Remove year are no longer offered by this table. The selection-header checkbox still supports selecting/deselecting every row.

Item names include equipment icons. Table cells vertically center their content. Fixed-layout columns and wrapped text fit the available width without a table-specific scrollbar, including narrow themes. The final table retains Name, Industrial System, Utility Types, and Notes; no Meter Groups column is added. Group editing, item forms, and persistence/calculation contracts are unchanged.

| Focused check | Result |
| --- | --- |
| Table, Setup Group, and workbench fast specs | Passed: 22 tests across 3 files, including always-visible action states, independent creation availability, and creation handoff. |
| Changed Chromium journey file | Passed: 15 tests. Covers right alignment, empty-selection disabled states, item icons/links, centered cells, no table overflow at desktop/narrow widths, creation from Setup Group, unavailable-group creation protection, and guarded navigation/history. |
| App type-check, whitespace checks, and production web build | Passed: `npx tsc -p tsconfig.app.json --noEmit`, `git diff --check`, and `npm run build-prod`; existing build warnings remain. |
| Visual review | Desktop light and narrow high-contrast captures inspected after the final button move; source screenshots remain under ignored `tmp/`. |

Validation remained scoped to the changed content. No full-suite or Electron checks were run.

### Energy Use Items sidebar iteration

The 2026-11-06 navigation refinement replaces horizontal item subtabs with the Account Analysis Select Facility Items layout. Energy Use Items has an internal icon/name rail on the left, a member count, active selection, and independently scrolling navigation/editor panes. Narrow windows use the account-analysis pattern's compact horizontal top rail. Setup Group stays full width; the global Data sidebar still stops at groups. There is no item finder or repeated selected-item heading.

Routes, successful-visit restoration, guarded switching, existing forms/autosave, and table-name links retain their contracts. The editor outlet remains mounted when its saved target disappears. Accepted item changes reveal the active rail button without changing selection before navigation succeeds. Print layout omits the internal rail and exposes the form content.

| Focused check | Result |
| --- | --- |
| Workbench fast specs | Passed: 13 tests protecting routing, group membership, creation/copy/deletion, retained drafts, own-save feedback, and cancelled navigation. |
| Changed Chromium journey file | Passed: 15 tests. Covers 1,000 long-named members, independent list scrolling, compact narrow layout, active-item visibility, contrast, keyboard selection, table links, guarded exits, browser history, and unchanged Setup Group workflows. |
| App type-check, whitespace checks, and production web build | Passed: `npx tsc -p tsconfig.app.json --noEmit`, `git diff --check`, and `npm run build-prod`; existing build warnings remain. |
| Visual review | Desktop light and narrow high-contrast captures inspected under ignored `tmp/energy-use-item-sidebar/`. The large-inventory check exposed a generic routed-page display rule overriding the flex host; scoped host styling and an explicit constrained grid row now preserve independent scrolling. The contrast assertion checks the active item's opaque background rather than its transparent navigation parent. |

No persistence, calculation, import/export, or Electron boundaries changed. Validation remained focused; no full suite or Electron checks were run.

### Save-feedback copy refinement

Removed the redundant “Finish saving…” reminders from the workbench header, Setup Group management area, and item lifecycle actions. The top-right save feedback remains the saving/status indicator; existing validation/conflict errors and action-disabled conditions remain unchanged. This presentation-only edit uses the focused workbench, Setup Group, and lifecycle template/save checks selected by the scoped agent validation plan; no new copy-only regression test, broad suite, or Electron check is needed.


### Setup Group Add year slideout

The 2026-11-06 Add year follow-up replaces the year-only confirmation with a guided slideout. Select equipment in Setup Group, choose one fiscal year, then review full annual inputs one item at a time in alphabetical order. The default destination is the next highest saved year across the selection; overflowing 9999 remains invalid rather than being silently clamped. With no history, use the existing facility-based year default.

New annual drafts start from each item’s highest saved fiscal year, retaining manual values, units, calculator inputs, and existing copied-calculation behavior. Existing destination years load for editing. Missing annual rows use the existing defaults; ambiguous duplicate source/year buckets block saving without modifying history. Shared annual fields include operating hours, load/duty factors, applicable efficiency, consumption modes, units, previews, and hours/load calculators. Calculators remain inside the same blocking portal.

Completed equipment appears above the current form using creation-step styling; remaining equipment appears below. Previous/Next and direct step selection retain every typed draft. Editing a completed item requires review again. Next validates without saving; Save all validates the entire selection and commits one annual-only transaction. Changing the year or discarding unfinished drafts requires confirmation.

The table owns controller state outside the portal view. Saved-record, facility, ownership, and membership changes block saving while keeping drafts mounted. Reload changed items requires confirmation and resets only changed item drafts; changed facility settings reset all drafts. Removed/moved items require closing and reselecting. Write failures retain drafts for retry; committed refresh failures allow only publication recovery. Success clears table selection, closes the slideout, and restores focus. Persisted models, durable command payloads, formulas, and backup formats remain unchanged. Earlier Phase 4D evidence above remains historical.

| Focused check | Result |
| --- | --- |
| Scoped `validate:agent -- --mode plan -- <changed files>` | Selected nearby fast specs, app type-check, and browser checks. Browser execution was limited to the changed slideout and annual batch transaction journeys; the requested production web build was also run. |
| Annual draft, controller, fields, calculator, and table fast specs | Passed: 30 tests across 6 files. Covers per-item defaults, existing-year edits, partial/ambiguous history, validation, revisits, resets, stale/moved/foreign records, retry, and refresh-only recovery. |
| Focused Chromium checks | Passed: 20 native command tests plus 4 slideout journeys. Covers mixed existing/new years, atomic rollback and reopening, one blocking portal, calculator Apply/Escape, draft/discard navigation, selection clearing, and focus restoration. The table-handoff test fixture was corrected to retain its portal host before the final passing run. |
| Responsive/theme visual check | Passed at desktop and 390px widths in light, dark, and strong contrast, including long equipment names, reachable footer actions, and no horizontal panel overflow. The slideout is hidden in print styles. |
| `npx tsc -p tsconfig.app.json --noEmit` | Passed. |
| `npm run build-prod` | Passed; existing browser-support, unrelated stylesheet-budget, and CommonJS dependency warnings remain. |

The restricted fast runner initially exited 134; rerunning outside that environment passed. Browser checks caught and verified the correction for normalized optional fields being mistaken for unrelated history edits. No broad suite or Electron validation was run.


### Add year selection cards

The year-selection refinement presents sorted, distinct saved years from the current account’s meter readings, predictor readings, and equipment annual data as clickable cards. The list spans facilities and groups, excludes foreign-account records and invalid years, and does not fill gaps. With no dated account data, show the current calendar year. Clicking a year proceeds directly to the equipment forms; Other reveals the validated fiscal-year input and Next item action. Returning to the year step retains the selected card/input, and changing the destination still requires the existing draft-reset confirmation. The next-saved-year suggestion from the original slice remains only as the initial Other input value. Per-item defaults and persistence are unchanged.

Focused validation for this refinement: 14 controller tests and 5 Chromium slideout journeys passed, including account-wide/deduplicated years, foreign/invalid-year exclusion, current-year fallback, direct card selection, Other validation, reset protection, keyboard focus, and narrow layout. App type-check passed. Production web compilation passed with existing browser-support, stylesheet-budget, and dependency warnings. No broad suite or Electron checks were run.


### Annual form presentation cleanup

Removed the Copied year annotation beside Consumption in the shared annual fields; copied-value handling remains unchanged. Remaining equipment now uses a locally styled h3 heading, avoiding legacy h4 padding, orange underline, and letter spacing. Focused validation passed: 1 annual-field test and 5 Chromium slideout journeys, including computed-style checks for the heading. The scoped validation plan selected template/style checks; no broad build or Electron checks were run for this presentation-only follow-up.


### Add year out-of-order equipment navigation

Fixed the workflow for jumping ahead through Remaining equipment. Next validates the current item and visits the next unfinished item, wrapping to earlier skipped items after reaching the end and skipping already reviewed equipment. Save all depends on every other item being reviewed, rather than the current item’s alphabetical position. Earlier drafts, validation, Previous, and direct step selection retain their existing behavior. The regression covers jumping from equipment 1 to 3 of 9, progressing through 9, returning to 1 and 2, and saving the full batch from item 2.

Focused validation passed: 16 controller tests and 6 Chromium slideout journeys, app type-check, and production web build. The browser regression exercises the nine-item out-of-order path and verifies a single save containing all nine records. Existing browser-support, unrelated stylesheet-budget, and dependency warnings remain; no broad suite or Electron checks were run.


### Add year review progress counter

The equipment counter now shows the number of completed equipment drafts plus one, rather than the selected item’s alphabetical position. Jumping directly to the third item with no completed drafts still displays 1 of 9; after reviewing seven items and wrapping back, it displays 8 of 9, then 9 of 9 for the final unfinished draft.

Focused validation passed: all 6 Chromium slideout journeys, with explicit rendered progress assertions for out-of-order completion. The scoped validation plan selected no additional checks for this template-only change; no broad build or Electron validation was run.

### Stacked results workbench delivery

The results workbench adds Group Summary, Group Footprint, and Facility Footprint after Setup Group and Energy Use Items. Summary provides equipment comparison/history and a matching table; footprints provide source flows and matching usage tables. The removed Table Results URL redirects to Group Summary. Group-only header chips summarize committed sources and Setup validation; save/retry feedback belongs in the active form. Shared facts reveal the owning facility energy balance and retain previous results during refresh with a compact chip. The disconnected item History implementation is removed. Results/empty-group links preserve draft guards and session item restoration, including late-mounted shell outlets. Inventory treemap and creation/group-deletion iterations follow in the next stack slices.
