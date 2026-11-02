# V1 Maintainability Follow-up Plan

**Status: In progress**

## Purpose and boundaries

This plan records maintenance work identified by the review of `unified-ux...ca76a88a1` after global facility scope Phase 5. The immediate navigation, Settings atomicity, and dashboard-retirement cleanup were completed in [Phase 6 of the scope roadmap](v1-global-facility-scope-plan.md#phase-6--review-fixes-and-scoped-cleanup). The packages below remain separate follow-ups, not additional requirements for that PR or authorization to implement them together.

Preserve the [UI architecture](../ARCHITECTURE.md#ui-architecture), NgModule-based feature organization, existing URLs and guarded journeys, committed workspace ownership, GUID relationships, calculations, imports/backups, v0, and Electron boundaries. No broad Angular migration, new design system, generic CRUD framework, persisted schema, or format migration is proposed. Recheck consumers before extraction or deletion; a test-only reference is not evidence that production behavior needs the obsolete abstraction.

## 1. Navigation ownership

**Status: Complete**

**Original review evidence:** [WorkspaceNavigationService](../src/app/v1/shell/workspace-navigation.service.ts) combines exported route types, parsing/building, scope and resource projections, support-panel presentation, navigation orchestration, and route motion. Guards and other consumers import its module for pure route knowledge.

**Changes and interfaces:** Move pure route types, parsers, and builders into a routing-owned module with no service injection or workspace reads. Keep `WorkspaceNavigationService` as the facade for existing navigation commands. Extract committed-context projections into a focused service and support-panel row/copy preparation into a presentation projection; neither owns navigation or workspace writes. Update consumers to import pure route contracts directly and remove superseded exports after callers move, rather than retain compatibility re-exports.

**Dependencies:** Start from the completed Phase 6 guard behavior. This package can ship independently of the inventory and report packages; preserve the facade while moving one responsibility at a time.

**Acceptance:** Table-driven parser/builder tests cover account and facility inventories, workbenches, settings details, query scope, and report-to-analysis origins. Existing real-router coverage must preserve cancelled transitions, scope cleanup, single-facility exceptions, history restoration, and successful handoffs. Pure route modules must not depend on shell services or workspace state.

### Implementation and evidence

Pure route vocabulary, parsing, scope serialization, and explicit-ID builders now live in `routing/workspace-route.ts`. `WorkspaceContextService` owns one atomic accepted URL pair and committed scope, resource, count, and motion projections. `WorkspaceNavigationService` retains its injected facade APIs, guarded commands, contextual destination policies, invalid-scope normalization, and panel state. Support-panel content is a pure projection, and section metadata has a primary-rail owner. Consumers import pure contracts directly; the old scope module and duplicate home-command helpers were removed without re-exports. Status evaluation retains its existing eager facade lifetime.

Acceptance passed: application TypeScript check, full fast and Chromium suites (55 browser files, 282 tests), production web build, validation planner, local documentation links/anchors, retired-reference scan, and whitespace check. Parser/builders, context/motion, panel filtering, and guarded commands have separate focused tests; native history, cancellation, normalization, recovery, handoffs, and report origins remain covered. Independent source review found no actionable regressions. A restricted focused attempt aborted before actionable results; retries ran successfully. A newly added test incorrectly required an omitted property to exist with an undefined value; its expectation was corrected without changing parser behavior. Existing CSS-budget/CommonJS warnings remain; Electron and manual desktop checks were not applicable.

## 2. Inventory ownership

**Status: Not started**

**Original review evidence:** [DataInventoryComponent](../src/app/v1/data/inventory/data-inventory.component.ts) recognizes concrete Meter/Predictor children with `instanceof` and reaches through them to nested tools. [InventoryToolsComponent](../src/app/v1/data/inventory/inventory-tools/inventory-tools.component.ts) combines calendarization demand, resource chart projections, session preferences, selection, deletion snapshots, persistence orchestration, portals, and focus.

**Changes and interfaces:** Define a typed inventory-header actions contract exposing readonly selection availability/state and an explicit toggle command. Routed inventory owners provide and register that contract with the Data header on activation, and unregister it on deactivation; the header must not inspect concrete component classes or nested tool components. Split chart session/demand state from selection and reviewed deletion in focused controllers scoped to the inventory component lifetime. Keep resource-specific chart shaping in resource-owned pure projections. Components retain templates, portal creation, and focus restoration; existing command handlers retain persistence and transaction ownership.

**Dependencies:** Build on Phase 6's simplified live chart modes. The header contract and controller split can be delivered separately, without waiting for navigation extraction.

**Acceptance:** Header behavior tests cover selectable and non-selectable routed children, child replacement, empty results, pending commands, and disabled selection. Existing charts and deletion tests retain scope-keyed preferences, filter-before-pagination behavior, selection reset, command revalidation/rollback, one committed publication, and cleanup. Chromium checks protect the trace drawer, keyboard/focus, zoom, narrow layouts, themes, and print behavior. No generic base inventory or CRUD framework is needed.

## 3. Report presentation contracts

**Status: Not started**

**Original review evidence:** [Report inventory projection](../src/app/v1/reports/report-inventory.models.ts) builds a facility `ResourceBrowseCardView` only to flatten its facts. [Facility Setup](../src/app/v1/reports/facility/workbench/setup/facility-report-setup.component.html) obtains the report type label from `card.view.chips?.[0]?.label`. These consumers couple report meaning to a retired card layout.

**Changes and interfaces:** Replace that dependency with a facility-report presentation projection exposing explicit `typeLabel`, configuration status, and saved-report facts. Inventory tiles and workbench contexts compose their own UI from those fields. Update every live consumer before removing unused card decorations and view types. Keep report availability, validation, lifecycle commands, pending-content semantics, and calculations with their existing owners.

**Dependencies:** Phase 6 removed the unused card component and obsolete filter while retaining models/builders still serving these consumers. This package otherwise has no dependency on navigation or inventory-controller extraction.

**Acceptance:** Cover every supported facility report type, missing analysis/period values, unavailable validation, and unknown-type fallback. Assert report-type labels and facts through inventory and workbench output without depending on chip order. Preserve single-facility combined Reports, owner-qualified keys, saved settings, and report-to-analysis navigation. A reference scan confirms no remaining consumer needs the retired layout contract before deleting it.

## 4. Inherited maintenance debt

**Status: Not started**

**Original review evidence:** [Settings form helpers](../src/app/shared/settings-forms/settings-form.service.ts) use a broad control-record type while feature editors declare unparameterized `FormGroup`s. [AccountSettingsModule](../src/app/v1/account/settings/account-settings.module.ts) imports the broad Data module. The review also found source already unused at the comparison base:

- [Account Analysis scaffold](../src/app/v1/analysis/account/workbench/scaffold-page/account-analysis-scaffold-page.component.ts) and [Analysis results toolbar](../src/app/v1/analysis/facility/workbench/results/presentation/toolbar/analysis-result-toolbar.component.ts), including their component file sets.
- `filterAndSortAccountAnalysisCards` and its filter/sort types in [account Analysis models](../src/app/v1/analysis/account/account-analysis.models.ts).
- `usableBankedGroup` in [banking helpers](../src/app/v1/analysis/facility/workbench/banking/facility-analysis-banking.ts) and `validationAnalysisCopies` in [regression validation](../src/app/v1/analysis/facility/workbench/group/regression/regression-model-validation.service.ts).
- The unused Meter workbench placeholder [template](../src/app/v1/data/meters/meter-workbench/meter-workbench-tab-placeholder.component.html) and [stylesheet](../src/app/v1/data/meters/meter-workbench/meter-workbench-tab-placeholder.component.css).

**Changes and interfaces:** Type Settings forms by editor/control shape and translate form values into typed changes at the command boundary, preserving optional-value normalization and existing field semantics. Narrow Settings imports to the feature modules its templates actually consume; remove unused imports. Delete the listed inherited artifacts only after repeating class, selector, import, and function-reference scans; remove tests of dead paths while preserving tests for live domain rules.

**Dependencies:** Build Settings typing on Phase 6's atomic-save interface. Module narrowing and independently verified deletions can ship as separate changes. Do not expand this package into unrelated Home, Imports, or Settings folder reorganization.

**Acceptance:** Type-check the form/command boundary and run affected editor, module, and routing specs. Verify hydration does not save, optional/disabled fields map correctly, failed drafts survive, and single-facility mirroring/portfolio behavior remains intact. Re-run relevant domain tests for removed helpers and scan for dead imports/selectors; production web compilation validates narrowed module imports.

## 5. Chart runtime investigation

**Status: Complete**

**Original review evidence:** The review's passing [inventory chart Chromium tests](../src/app/v1/data/inventory/inventory-tools/inventory-tools.component.browser.spec.ts) emitted `ResizeObserver loop completed with undelivered notifications.` The shared [ECharts directive](../src/app/v1/shared/charts/echarts-chart.directive.ts) synchronously calls `chart.resize()` from its observer callback; this behavior predates the refactor. The review did not establish an infinite loop or user-visible rendering failure.

**Changes and interfaces:** First reproduce the notification sequence during sheet opening, scope changes, trace-panel resizing, and narrow/wide transitions; measure element dimensions and resize frequency. If the directive resizes unchanged dimensions or feeds back into its own layout, coalesce changed-size notifications into one resize per animation frame and cancel pending work on destruction. If no directive defect is established, record the measurements and cause without adding speculative scheduling code or suppressing warnings. This investigation does not change chart input/output contracts or calculation demand.

**Dependencies:** Use Phase 6's simplified live chart modes. The investigation can ship independently of the inventory-controller extraction; any shared renderer change requires checking its non-inventory consumers.

**Acceptance:** A focused native-browser case demonstrates stable dimensions and bounded resize work through the reproduction sequence, including destroy-before-callback cleanup. Preserve zoom, theme updates, tooltip/trace behavior, PNG export, and visible chart sizing. Existing passing tests and warning suppression alone do not establish that the cause is fixed.

### Implementation and evidence

The native inventory reproduction logged one ResizeObserver delivery warning during the Meter narrow-layout transition and two during the Predictor sequence. Host and canvas dimensions stabilized; this did not demonstrate an infinite loop or a visible rendering defect.

The directive now coalesces observer deliveries into a separate animation frame, samples current content dimensions, skips unchanged or zero-sized hosts, and cancels pending work on destruction. Initial option scheduling and chart inputs/outputs remain separate. The same inventory sequence subsequently logged no observer errors: Meter dimensions were 940×456 with traces, 1168×456 with traces hidden, 370×392 in the narrow viewport, and 1168×456 after restoring the wide viewport. Scope and theme changes did not add resize work while dimensions stayed unchanged.

Focused coverage also exercises native hidden-to-visible recovery, controller-owned zoom, current-size sampling, padding changes, coalescing, and destruction before a pending callback. Acceptance passed: the focused directive/inventory Chromium suite (2 files, 10 tests), application TypeScript check, full fast and Chromium suites (55 browser files, 282 tests), production web build, validation planner, and whitespace check. Native cases cover scope/history interactions, trace drawer focus and keyboard use, palette/contrast variants, narrow/wide layouts, reduced motion, printing, PNG output, and representative chart consumers. Wide and narrow screenshots were inspected. Existing CSS-budget and CommonJS build warnings remain. An initial restricted test attempt aborted before actionable results; the retry succeeded. Newly added fixture typing and zoom-ownership assertions were corrected before the passing run. Electron boundaries were unchanged and desktop checks were not run. Warnings were observed without suppression; these results establish the tested sequences, not every possible host layout.

## Delivery and validation

Deliver one package per PR in this order: chart investigation (5), navigation ownership (1), inventory ownership (2), report presentation (3), and inherited maintenance debt (4). Keep each package separately reviewable and update its status/evidence when delivered. Use the [risk-based testing policy](testing.md#what-a-change-requires) and [validation workflow](../.agents/skills/validate-web-and-electron/SKILL.md): focused behavior tests first, then `npm run validate:agent -- --mode plan` and its required parent checks. Add browser tests for routing/history, native chart layout, or IndexedDB behavior; add Electron checks only when its runtime boundary changes.

This document introduces no runtime changes. Validate its local links and source references; implementation tests, type-checks, and builds belong to the package that changes their affected behavior.
