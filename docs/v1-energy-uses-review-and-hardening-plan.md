# V1 Energy Uses Review and Hardening Plan

**Review date:** November 6, 2026

**Status:** E1–E7 implemented and validated; prepared for stacked PR review.

## Outcome and scope

Keep the approved group-workbench and data-entry experience. The implementation has a sound foundation: feature-owned typed forms and pure mappings, the shared Settings editing lifecycle, queued commands, native atomic transactions, and committed workspace publication. A rewrite or a new feature-wide facade would add risk without resolving the findings below.

The review covers the current working tree at `0651ea4ce`, including uncommitted Phase 4/group-workbench refinements and untracked source files. It follows creation, combined Setup, utilities and meter links, annual drafts, group metadata, selection/deletion, lifecycle, routing, and their persistence consumers. The roadmap calls the accepted navigation pivot **Phase 4D**; its current behavior supersedes the earlier Phase 3A dashboard. Historical phase evidence is context, not fresh validation.

Chart restoration, new results screens, and Excel export remain subsequent migration work. Existing projection contracts were inspected for boundary risks, but this review does not certify chart presentation or release readiness. No application code or skills were changed during the evaluation.

## Architecture assessment

| Boundary | Assessment | Preserve during remediation |
| --- | --- | --- |
| Committed workspace → feature read models | Inventory and workbench project existing records without initializing or rewriting them on entry. Group/member lookup respects account and facility ownership. | GUID relationships, orphan discoverability, independent outer browse state, and session-only item restoration. |
| Forms → shared Settings session | Combined Setup has one editing identity, typed controls, silent hydration, normalized equality, and reconciliation of source/year history. Detached Add year drafts outlive their portal views. | Failed drafts, overrides, imported extra/ambiguous sources, guarded exits, and mounted editors when saved records disappear. |
| Action service → command boundary → handler | Commands resolve current records when queued work executes. Native handlers validate ownership and reviewed snapshots. Group metadata uses allowlisted updates; batches validate all selected records before writing atomically. | One publication after commit, rollback, idempotent creation/copy identities, and distinct rejected-write versus committed-refresh recovery. |
| Feature → shared layers | Production code uses neutral persisted models/calculations and shared v1 editing, navigation, and portal presentation. | NgModule organization and existing v0 callers; keep presentation types local to the feature. |
| Documentation and feature ownership | The pivot left workbench management under inventory folders and spread exact feature behavior across general guidance. | One owner for each contract, clear names, and short reusable skills. |

No critical defect or reason to replace the central editing/persistence design was found in the inspected paths. The following localized issues remain actionable.

## Findings

The findings retain the review-time behavior and line references; links follow the current source locations. Priorities distinguish **P2** reliability/compatibility or substantial maintenance concerns from **P3** bounded cleanup. Implementation and fresh regression evidence are recorded below.

### E1 — P2: Single-item deletion has no committed-refresh recovery

**Evidence:** [Settings deletion](../src/app/v1/data/energy-uses/energy-use-workbench/settings/energy-use-settings.component.ts), lines 257–266, handles all errors as a failed action. It does not inspect `WorkspaceWriteError.persistenceCommitted`. The [command boundary](../src/app/data/account-workspace/workspace-command-boundary.service.ts), lines 145–149, repairs a pending publication before executing the next persistence callback. [The action service](../src/app/v1/data/energy-uses/energy-use-actions.service.ts), lines 81–89 and 116–119, requires the item to exist for deletion.

**Trigger and impact:** The delete commits, but reloading the workspace fails. The old snapshot remains visible and Delete is still offered. A retry first publishes the repaired snapshot, then the delete callback rejects because the item is already gone. The confirmation becomes stale; draft discard, modal closure, and neighbor navigation never complete. The user can cancel and leave manually, but the action cannot finish through its own recovery path. Lifecycle and batch actions already demonstrate the appropriate recovery behavior.

**Correction:** Retain committed-deletion state, owner identity, and the destination captured before deletion. Offer refresh-only recovery through `recoverPublication`; prevent another durable delete. Discard the deleted item's draft, close the confirmation, and navigate only after publication succeeds. Keep ordinary write failures retryable and guard asynchronous completion against owner/lifetime changes.

**Acceptance:** A component regression covers rejected write versus committed refresh failure, repeated failed recovery, and final completion. A native integration test injects reload failure after commit and proves that recovery calls persistence once, leaves other records intact, and selects the expected survivor/empty group. Include deletion of an item with an unsaved draft.

### E2 — P2: Existing orphan records cannot round-trip through backups

**Evidence:** [Group projection](../src/app/v1/data/energy-uses/inventory/energy-use-group.models.ts), lines 39–48, deliberately exposes equipment with missing groups through `unavailable`. [Backup snapshot creation](../src/app/data/backup/backup-snapshot-builder.service.ts), lines 43–44 and 82–83, copies saved Energy Uses relationships unchanged. [Backup preparation](../src/app/data/backup/backup-preparation.service.ts), lines 226–229, rejects equipment referencing a missing energy-use or meter group.

**Trigger and impact:** Existing local data contains an orphan item, a state explicitly supported by the current read UI. Export succeeds, but restoration rejects that backup. This is an existing cross-boundary compatibility gap, not a demonstrated regression introduced by Phase 4. Current backup import already rejects these references; do not assume normal imports create the state.

**Correction:** Establish a preservation/recovery policy before Phase 5 acceptance. Recommended direction: retain the original equipment and unresolved GUID references, expose the unavailable state after restore, and continue rejecting foreign ownership. Verify downstream consumers before relaxing relationship validation. If that policy cannot be supported, provide explicit export/restore diagnostics and a separately designed recovery path; do not silently omit records or manufacture replacement relationships.

**Acceptance:** Account and facility snapshot → preparation → import/reopen tests cover missing energy-use groups, missing optional meter groups, valid relationships, and foreign owners. Confirm no history, overrides, or GUIDs disappear. The restore policy is the only product/data-policy decision required by this plan; it need not interrupt the independent cleanup slices.

### E3 — P3: Selective Add year reload retains obsolete form subscriptions

**Evidence:** [Add year controller](../src/app/v1/data/energy-uses/energy-use-workbench/setup-group/add-year-drawer/add-year.controller.ts), lines 122–134, appends every form subscription to one array. Lines 175–179 replace changed drafts through `build()` without disposing subscriptions for the replaced forms. Close/reset/destroy eventually clean up the array.

**Impact:** Repeated selective reloads retain old forms and closures for the duration of the slideout. A replaced form still has an active handler that can update controller version/dirty state. Unaffected drafts correctly remain mounted and should continue to do so.

**Correction and acceptance:** Associate disposal with each equipment draft. Dispose only replaced drafts during reload and all drafts during reset/close/destroy. A focused controller test reloads the same item repeatedly, verifies that a held obsolete form cannot change controller state, and verifies that retained/current forms still react once and preserve their edits.

### E4 — P2: The general Angular skill contains a feature specification

**Evidence:** [Angular skill](../.agents/skills/implement-angular-feature/SKILL.md), lines 27, 29, and 31, contains exact Energy Uses routes, year-card choices, review order, table columns, omitted actions, sidebar placement, and deferred Phase 4D scope. Those three bullets contain approximately 552 of the skill's 1,472 words. Related details are repeated in [architecture](../ARCHITECTURE.md#energy-use-group-workbench), the [migration guide](unified-ux-migration.md#energy-uses-item-migration), the [context index](agents/context-index.md), and the [feature roadmap](v1-energy-uses-migration-plan.md).

**Impact:** Unrelated Angular tasks load Energy Uses requirements, while a single UX iteration requires several documents to stay synchronized. Temporary phase status and exact UI choices become general instructions. The user's concern is supported by the current content; feature-specific safety rules remain valuable, but need a feature owner.

**Correction:** Keep reusable editing, reconciliation, silent hydration, draft protection, semantic component boundaries, and committed-write recovery in the general skill. Add a concise **Current accepted behavior** section near the start of the feature roadmap and make it the authoritative owner of current UX requirements and deferred scope; keep earlier phases and delivery evidence explicitly historical below it. Replace the Energy Uses skill paragraphs with a short conditional link to that section and the feature architecture section. Keep source/year identity, preservation, ownership, and projection invariants in feature architecture. Reduce context-index rows to entrypoints, required references, cross-boundary triggers, and the initial validation tier. Replace repeated feature specifications in the migration guide with links, and remove the unrelated Add year detail from its Phase 6 scope-review history.

**Acceptance:** A maintainer can determine current Energy Uses requirements from one feature reference without reading historical iterations. The general Angular skill teaches a repeatable workflow and routes to feature details without prescribing individual screens. Check every moved instruction for retention at its proper owner and validate all links/anchors; do not discard preservation rules merely to shorten the skill.

### E5 — P2: Group equipment management still has inventory ownership

**Evidence:** [Bulk actions component](../src/app/v1/data/energy-uses/energy-use-workbench/setup-group/equipment-table/equipment-table.component.ts), lines 15–25, injects the workbench context and constructs group-only selection/Add year controllers. Its only production host is [Setup Group](../src/app/v1/data/energy-uses/energy-use-workbench/setup-group/setup-group.component.html), line 17. The [selection controller](../src/app/v1/data/energy-uses/energy-use-workbench/setup-group/energy-use-selection.controller.ts), lines 14–39, retains selection-mode/filter abstractions from the former inventory workflow; the accepted table has no selection mode, filtering, or pagination.

**Impact:** Folder names and controller contracts describe the superseded dashboard rather than the current owner. Understanding a Setup Group operation requires crossing inventory, workbench, and generic inventory-tool contracts, and unused affordances obscure the live behavior.

**Correction:** Move the equipment table, Add year workflow, and selection controller beneath `energy-use-workbench/setup-group/`, retaining one folder per component. Rename `BulkActionsComponent` for its equipment-table responsibility. Replace the inventory tools source with a small typed group-member selection contract; remove unused selection-mode APIs after a consumer scan. Keep draft/recovery state in the host-owned controller outside the portal. Leave true inventory charts and browse projections under inventory.

**Acceptance:** Update module declarations/imports and colocate the tests with their owners. Existing selection, stale membership, year review, atomic save/delete, group switching, focus, and recovery journeys pass without UX changes. Do not change shared inventory contracts merely to accommodate this relocation.

### E6 — P3: Annual presentation types and utility policy have unclear owners

**Evidence:** [Annual year fields](../src/app/v1/data/energy-uses/forms/annual-year-fields/annual-year-fields.component.ts), lines 3 and 10, imports its parent component and uses `ReturnType<AnnualDataFieldsComponent['years']>[number]` as its input contract. [Settings](../src/app/v1/data/energy-uses/energy-use-workbench/settings/energy-use-settings.component.ts), lines 188–220, mixes pure utility/link selection policy with confirmation and editor orchestration; related eligibility logic lives in the meter-group slideout. [Setup models](../src/app/v1/data/energy-uses/models/energy-use-setup.models.ts) combines normalization, validation/calculation, source/year reconciliation, year operations, and persistence mapping in one module.

**Correction:** Define explicit feature-local annual-year/source view interfaces consumed by parent and child. Extract a small pure utility selection/review-plan helper used by Settings and the slideout, while form mutation stays in the form service. Split setup helpers only along demonstrated cohesive boundaries, such as reconciliation and year operations, and avoid circular imports or a new Angular service layer. Expand compressed multi-operation lines and name the separate stale-review conditions in touched paths.

**Acceptance:** Existing annual rendering/override and setup reconciliation tests remain authoritative. Add table-driven policy cases for compatible retained links, required unlinking, overlaps, unavailable/foreign groups, unchanged legacy selections, and stale reviews. Type-check component contracts. Keep form-specific interfaces out of domain/persistence modules.

### E7 — P3: Shared member-rail presentation can drift

**Evidence:** [Energy Uses workbench styles](../src/app/v1/data/energy-uses/energy-use-workbench/energy-use-workbench.component.css), lines 6–23, repeat the independently scrolling desktop rail, narrow horizontal rail, active indicators, and 850px breakpoint of [Account Analysis facility selection](../src/app/v1/analysis/account/workbench/select-facility-items/account-analysis-select-facility-items.component.css), lines 3–13 and 51–56. The accepted roadmap explicitly calls for the same presentation pattern.

**Correction and acceptance:** Extract the small shared rail layout/presentation contract, retaining workflow-specific navigation, progress, data, and actions in each feature. Check existing connected-section styles for semantic reuse when touching them; do not consolidate coincidental declarations. Validate both consumers at wide/narrow widths, keyboard focus, scrolling, themes, and print. This is bounded cleanup and need not block reliability fixes.

## Implementation sequence

Each slice should be independently reviewable and retain the accepted workflow.

| Slice | Work | Dependencies and completion gate |
| --- | --- | --- |
| 1. Recovery and lifetime | E1 deletion recovery and E3 per-draft disposal. | Start in the current structure. Focused fast regressions, native delete/recovery test, app type-check, production web compilation for changed UI. |
| 2. Guidance ownership | E4 skill simplification and documentation deduplication. | Can run independently of slice 1. Preserve safety rules, validate links, and leave historical evidence in the roadmap. |
| 3. Feature ownership | E5 move/rename and narrow the group selection contract; E6 explicit annual view types. | Apply after slice 1 so fixes move with their tests. Focused module/router/form/selection tests, Chromium group/slideout journeys, type-check and production web build. |
| 4. Readability and reuse | E6 pure policy extraction/cohesive model splits; E7 shared rail presentation. | Small behavior-preserving changes after ownership is clear. Use pure policy tests and focused checks for both rail consumers. Avoid speculative abstractions. |
| 5. Compatibility acceptance | E2 restore-policy decision and account/facility round trips. | Can be investigated in parallel; required before Phase 5 release acceptance. Use persistence/import-export review and native reopen evidence. |
| 6. Resume charts | Restore group results using retained projections and explicit current routes. | Separate migration slice after the relevant cleanup. Reuse or remove the disconnected History component when the destination is chosen; preserve useful projection/option helpers. |

For each behavior-changing slice, run the validation planner against that slice's files, then the lowest-cost meaningful regressions. Add production web validation for route/module/template behavior and native tests for transaction/publication behavior. Reserve full suites and desktop/export acceptance for the repository's pre-PR/release requirements or an actual Electron boundary change.

## Review validation before remediation

Fresh review checks and their final results are recorded below before handoff. Existing roadmap test results remain historical evidence. Passing existing tests does not cover E1–E3 until the proposed regressions exist.

| Check | Result |
| --- | --- |
| Source/consumer review | Completed across feature, route/shell, shared editing, command/handler, calculation, and backup boundaries; independent focused reviews covered forms, persistence, and guidance ownership. |
| Validation planner | Passed; inspected the complete current dirty diff. Its implementation matrix informs future remediation; this task changes documentation only. |
| App type-check | Passed: `npx tsc -p tsconfig.app.json --noEmit`. |
| Focused fast tests | Passed: 32 files, 250 tests. Command: `npm run test:ci -- --include 'src/app/v1/data/energy-uses/**/*.spec.ts' --include 'src/app/shared/energy-use-calculators/*.spec.ts' --include 'src/app/v1/routing/workspace-route.spec.ts'`. |
| Document links and whitespace | Passed: review links/heading anchors, the roadmap link, and scoped `git diff --check`. |
| Browser/native integration, production builds, full suites, manual UI and Electron | Not rerun for this evaluation. No implementation changes were made; remediation acceptance above specifies the missing regressions and appropriate gates. |

The first restricted fast-test attempt exited 134 after browser-support warnings without a test result. The rerun with the runner's required local access passed all 250 tests. Browser-support warnings remain.


## Remediation implementation

| Finding | Implementation | Evidence |
| --- | --- | --- |
| E1 | Deletion retains its owner/key/destination after commit, blocks another write and navigation, and completes through publication-only recovery before discarding the draft and selecting the survivor. Old recovery state clears on identity changes. | Fast rejected-write/repeated-recovery/identity cases and a native commit → failed reload → failed recovery → successful recovery journey. |
| E2 | Backups preserve unresolved nonempty group GUIDs, remap included groups, reject foreign relationships and stored-GUID collisions, and normalize absent optional meter links to `[]`. No schema or backup version change. | Account/facility export → prepare → native import → reopen tests preserve complete annual history and overrides; null/absent link cases exercise a real footprint consumer; collision tests prove rollback. |
| E3 | Each annual draft owns its subscription. Selective reload disposes only replaced forms; close/reset/destroy disposes all. | Repeated-reload regression proves obsolete forms are inert and unaffected/current drafts retain edits and react once. |
| E4 | The roadmap owns current accepted behavior; architecture owns invariants; task routing and the migration guide link to those owners. The protected Angular skill update replaces screen-specific paragraphs with conditional references. | Protected skill update completed; documentation link/anchor checks retain the feature safety rules at their owners. |
| E5 | Equipment table, Add year, and member selection now live beneath Setup Group. The selection contract consumes current member snapshots instead of generic inventory filters/modes. | Existing group/selection/slideout journeys plus ownership and synthetic unavailable-group deletion regressions. |
| E6 | Named annual presentation types replace parent-component inference. A pure utility selection policy serves Settings and meter selection. Setup values/normalization and three-way reconciliation have focused pure modules behind the existing public imports. | Pure policy cases, unchanged setup mapping/reconciliation coverage, annual rendering, and type-check. |
| E7 | Energy Uses and Account Analysis import one semantic member-rail stylesheet while retaining workflow content, borders, and actions locally. | Shared-consumer component/browser checks and production compilation. |

Chart restoration, group results destinations, Excel export, and broader Phase 5 release acceptance remain separate migration work. The disconnected History presentation and its useful projection helpers are retained until the results destination is designed.

### Remediation validation

| Check | Result |
| --- | --- |
| Focused fast tests | Passed: 34 files, 269 tests before final optional-link additions; final full-suite result recorded below. |
| Focused Chromium | Passed: 4 files, 30 tests, including recovery, guided annual drafts, and backup round trips/collisions. |
| App type-check | Passed after the refactors. |
| Full fast and browser suites | Passed: `npm run test:all:ci`; the complete fast suite followed by 82 Chromium files / 417 tests. |
| Production web and Electron compilation | Both passed, with existing browser-support, stylesheet-budget, and CommonJS warnings. |
| Final comparison review, links and whitespace | Independent source review found no remaining actionable issues; final stack comparisons and document checks are required before publication. |

The first focused compile caught an invalid utility label in a new fixture; it was corrected. The first native deletion regression checked completion before the IndexedDB refresh finished; it now waits for the actual recovered state and passes. The first full-suite run found one pending modal focus listener that violated the repository form-boundary scan (3,593 tests passed, one failed); its focus tracking now reads the browser's active element and passes native focus coverage and the full gate. A later focused native pass also caught one stale inventory journey that still expected the superseded Add year confirmation; it now exercises year cards, annual review, one Save all batch, and preserved unselected equipment. These failures are recorded separately from the final gates.

Production builds retain existing browser-support, stylesheet-budget, and CommonJS warnings. Native OS integration and native print-dialog checks were not performed; no Electron bridge or OS delivery code changed. The PR stack is ordered as calculators → approved group workbench → editing/ownership hardening → backup compatibility. Validation above ran on the complete stack; merge the dependent PRs in that order.
