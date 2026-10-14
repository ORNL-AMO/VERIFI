# V1 Account Analysis Architecture

This document is the implementation reference for the production v1 account-analysis dashboard and workbench. It defines ownership, calculation orchestration, dashboard behavior, and the presentation that account and facility analyses intentionally share.

## Scope and boundaries

The feature lives under `src/app/v1/account/analysis`. The dashboard owns account-analysis inventory, commands, filters, active-for-reporting presentation, concise result calculation, details, and comparison. The route `/v1/workspace/account/:accountGuid/analysis/workbench/:analysisGuid` is the stable selected-analysis destination and owns Setup, Select Facility Items, Results, and Used By.

IndexedDB remains the durable source of truth. Account analyses continue to reference facility analyses by facility and analysis GUID. Production v1 reuses the existing account roll-up calculations, persistence command boundary, workspace snapshot, status evaluation, and Worker infrastructure without importing v0 presentation or services.

The approved dashboard implementation plan deliberately adds a typed, v1-only account-analysis Worker request and response plus a dedicated Worker entry point so multiple dashboard cards can be calculated with bounded concurrency. This is a new orchestration boundary, not a formula change: it shares the deterministic calculation entry point with the synchronous fallback and does not alter legacy Worker messages or v0 behavior. This approved scope decision supersedes the earlier issue wording that excluded Worker contract work.

The approved Facility Details and Facility Contributions implementation in [PR #2771](https://github.com/ORNL-AMO/VERIFI/pull/2771) extends that v1-only workbench response with selected facility GUIDs, analysis GUIDs, and monthly summaries already produced by the existing calculation. The maintainer approved committing and opening this implementation after local review, including disclosure of the added response field. This records the workbench payload extension as an explicit exception to issue #2736's original Worker-contract exclusion. Dashboard responses still omit these summaries; legacy Worker messages, formulas, persisted records, backups, and reports remain unchanged.

No account-analysis record shape, database schema, backup format, report output, formula, unit conversion, rounding rule, or Electron contract changes as part of the dashboard.

Valid single-facility accounts do not expose the account-analysis dashboard or workbench. Account Analysis routes redirect to the sole facility's Analysis dashboard or the corresponding facility-analysis workbench view. Each facility analysis has a hidden account-analysis pair containing exactly one selection link to that analysis. The pair mirrors category, basis, display units, baseline, banking state, and name so account-level reports and other consumers retain the existing account-analysis contract without creating a second user-facing editing workflow.

Pair creation and synchronization use the existing account-analysis record shape and GUID relationships. Creating, copying, editing, activating, or deleting a facility analysis commits the paired account-analysis change atomically in v1. The selected account energy or water analysis follows the pair for the facility's active analysis. Route-entry reconciliation backfills missing or stale pairs for existing single-facility workspaces; multi-facility accounts keep the explicit account-analysis workflow unchanged. A paired analysis referenced by an account report blocks deletion through the same dependency rule as an ordinary account analysis.

## Dashboard ownership

The dashboard projects every account analysis into one card containing status, category, baseline, basis and units, facility-selection readiness, linked reports, active-for-reporting state, modified date, and the latest complete annual and monthly outcome facts. It offers create, copy, set active, compare, details, and guarded delete commands through a feature action service.

Creating an analysis uses the existing model factory so every current facility receives a selection entry. Copying preserves the source selection setup while assigning a new GUID and timestamps. Setting an active energy or water analysis requires its baseline to match the corresponding account goal baseline. Deletion is a compound command: linked reports block it, while the account's matching active selection and the analysis record are cleared atomically.

The dashboard exposes loading, evaluating, blocked, calculation-error, workspace-error, empty, filtered-empty, disabled, and ready states. Search, filters, sorting, and create controls use typed reactive forms.

The account portfolio Analyses tab reuses the account card projection as a read-only setup/status summary alongside facility summaries, without requesting outcome calculations. Scope chips, icons, and themed owner-header accents distinguish Account analysis from Facility analysis. An All/Account/Facility filter combines with search, category, and status while preserving the query; owner names and existing feature search fields remain searchable. Each card opens its owning workbench, and portfolio totals include both scopes while excluding hidden single-facility account pairs.

## Calculation orchestration

The dashboard wraps `AnnualAccountAnalysisSummaryClass` in a deterministic typed entry point shared by its Worker and synchronous fallback. The calculation receives an immutable snapshot containing the account analysis, account and facilities, selected facility analyses plus banking dependencies, meters and readings, and predictors and readings.

The dashboard coordinator applies these rules:

- Status errors block only the affected analysis; warnings remain calculable.
- At most two account-analysis Workers run concurrently.
- A changed workspace or calculation fingerprint cancels active and queued stale work.
- Each Worker uses the shared calculation timeout and releases its queue slot after success, failure, cancellation, or timeout.
- One ready result is cached per analysis while its calculation fingerprint matches.
- The dashboard response retains complete annual history through the report year and only the newest valid monthly row. Facility summaries do not cross the dashboard Worker boundary.

The fingerprint includes calculation-bearing account-analysis setup, selected facility analyses and banking dependencies, fiscal and unit settings, meter data, predictor data, and calculation options. Display metadata such as an analysis name is excluded. Calculations retain full precision; presentation owns rounding.

## Shared analysis presentation

Exact reusable analysis presentation belongs under `src/app/v1/shared/analysis-results`. This includes generic metric charts and their contracts, annual and monthly chart-row builders, result status presentation, period-specific column preferences and the column chooser, result number formatting, result markers and legends, annual/monthly outcome facts, active-reporting summaries, and the common comparison layout. Account and facility features supply feature-owned tables, view builders, and commands to those components. The period-specific column preference continues to use the existing `v1AnalysisTableColumns` key across both scopes.

The shared `ContributionHeatmapComponent` owns the diverging fiscal-year heatmap, percentage formatting, theme-aware labels, horizontal overflow, and PNG download for both account facility contributions and facility group contributions. Features supply aligned row labels and precomputed contribution percentages; their calculations, grouped tables, drill-in links, and vertical scroll ownership remain local.

Page-specific tables remain explicit when their columns, row semantics, formulas, or completeness rules differ. Promote a table or graph only after account and facility consumers use the same semantic contract; do not create configurable abstractions that hide materially different calculations.

Account comparison accepts two analyses of the same category. It compares analysis setup and each facility selection by GUID, aligns annual rows by fiscal year, renders one accessible table per analysis, and reuses the common charts. Actual-versus-adjusted series require compatible units and energy basis; percentage-improvement series remain comparable independently.

## Workbench workflow and extension points

The selected-analysis route owns the production v1 workbench. Its route-scoped context resolves the selected account analysis and its facilities, facility analyses, reports, and status findings. Primary navigation follows Setup, Select Facility Items, Results, and Used By; Results owns Annual, Monthly Table, Monthly Chart, Facility Details, and Facility Contributions child routes. The footer advances through primary stages, while the account Analysis sidebar mirrors the same workflow and keeps result tabs contextual to the workbench.

The account header consumes the existing route-scoped results coordinator on every stage. Its latest annual and monthly outcome facts use the dashboard's shared outcome-summary and display helpers, including account fiscal labels, completeness, and rounding. Baseline, basis and units, and facility-selection counts complete the five collapsible facts. Unsaved drafts and analysis switches suppress previously published outcome values. A persistent “Changes can affect…” dependency note matches the facility header and shows the referencing report count without a link. The header and Used By both consume the context's linked-report projection.

Account and facility headers render the shared `AnalysisStatusNotesComponent` outside the facts disclosure. It receives findings for the selected analysis without filtering by the active stage or result tab. Messages expand naturally without an internal scrollbar or Review links; the facility header combines regression setup notices when multiple groups need setup. Stage/tab attention badges and readiness still use their contextual projections.

Setup now has v0 workflow parity through a typed reactive editor. Route-scoped autosave maintains separate committed and editable records, persists changes through the account workspace command boundary, protects navigation while work is pending or invalid, and publishes one account-analysis patch per save. Complete baseline years are projected from the canonical calendarization for the draft unit and energy basis. Once a facility is selected or skipped, calculation-bearing fields lock until an explicit portal-hosted confirmation clears those selections; referenced facility analyses and reports remain intact.

Setup also owns the bulk facility-analysis workflow. It builds one new Absolute Consumption or Classic Intensity analysis per current facility and commits the generated analyses and account links in one IndexedDB transaction. Ownership and category relationships are validated before writes; a failure rolls back the complete operation. The operation preserves existing analyses, uses the later facility-goal baseline for new facilities where v0 does, and introduces no schema or record-shape changes.

Select Facility Items now has v0 workflow parity through a route-scoped selection controller. It reconciles GUID links to the current facility set, filters candidates by facility, category, energy basis, and baseline, presents v1 status findings and common-input data coverage, and immediately autosaves a selection or explicit skip. The footer walks the current facility order before opening Results. Selected errors remain editable and can be opened in the facility workbench, but they block Results; warnings do not.

The selection table wrapper scrolls horizontally only when its columns exceed the available width. Vertical scrolling belongs to the surrounding selection content area, so the table does not create an extra scrollbar for its hidden caption or collapsed borders.

View Analysis opens the same facility-analysis details slideout used by the facility dashboard. Its setup, models, downstream usage, and validation render immediately; annual and monthly outcome facts calculate lazily for only the opened analysis and its banking dependencies. The route-scoped coordinator reuses canonical calendarization, the existing facility-analysis outcome Worker contract, deterministic fingerprints, and one compact matching outcome summary per opened analysis; full annual and monthly result tables are not retained. Closing the panel or opening another analysis cancels stale Worker work. The slideout footer opens the full facility-analysis workbench with the validated account-analysis return origin, without an intermediate confirmation modal.

Creating a facility analysis from Select Facility Items stays inside the account workbench until confirmation in a v1 slideout. The standard factory supplies regression groups, the account analysis supplies category and energy basis, and the account baseline is used except for the established later new-facility goal baseline. One native transaction creates the facility analysis, replaces that facility's account-analysis link, and reconciles current facility links. The facility workbench receives a validated transient GUID origin and exposes Return to Account Analysis, restoring the originating facility without accepting an arbitrary return URL.

Setup is always available. Select Facility Items requires a valid editable setup, Results requires every facility to have a valid matching analysis or an explicit skip and no selected analysis errors, and Used By remains informational and available. Annual, Monthly Table, and Monthly Chart now have v0 calculation parity through a route-scoped account-results coordinator. The coordinator waits for saved, validated inputs, builds the same deterministic request and fingerprint as the dashboard, cancels stale work, validates returned GUIDs, applies the shared timeout, and caches only matching complete results. A dedicated workbench Worker returns full annual and monthly rows plus compact per-selected-facility monthly summaries; the dashboard keeps its bounded summary Worker and omits facility summaries from its response. Warnings do not block results.

The account result pages mirror the v1 facility-result interaction contract while retaining account-owned tables: annual totals and both annual charts, a paginated and copyable monthly table with fiscal-year boundaries, and monthly use plus aggregate rolling savings/loss charts. Account pages intentionally omit facility predictor columns. Banking columns appear when an included facility analysis uses banking, while the account monthly savings chart retains the v0 aggregate series instead of splitting facility banking series. Facility Details renders one responsive v0-equivalent monthly Actual-versus-Calculated chart per selected facility. Facility Contributions uses a diverging facility-by-fiscal-year heatmap and a grouped table; each facility contribution is annual facility savings divided by annual account adjusted use, with zero adjusted use producing zero contribution. It omits the initial baseline year when account savings is zero and links each facility to its existing Group Contributions result. Used By lists the linked account reports by name and type using the same GUID reference projection as the dashboard and deletion guard. It displays an explicit empty state and an availability note while v1 report destinations remain deferred.

## Testing map

| Concern | Primary check |
| --- | --- |
| Card, facility-selection, linked-report, and comparison projections | Fast pure tests |
| Dashboard forms and interactions | Focused Angular TestBed tests |
| Setup drafts, autosave recovery, locking, and period availability | Fast service and focused Angular TestBed tests |
| Bulk facility-analysis creation and rollback | Fast handler tests plus Chromium IndexedDB tests |
| Facility selection, eligibility, progress, and per-facility footer navigation | Fast pure, service, and Angular TestBed tests |
| Single facility-analysis create/link and rollback | Fast handler tests plus Chromium IndexedDB tests |
| Facility-workbench return origin validation | Fast route-service tests |
| On-demand facility detail results, cancellation, and cache reuse | Focused component tests plus Chromium Worker tests |
| Account workbench result gating, cache reuse, supersession, and full-result Worker exchange | Fast service tests plus Chromium Worker tests |
| Account annual/monthly tables, controls, markers, and chart projections | Focused Angular TestBed and pure presentation tests |
| Calculation formula parity and result projection | Deterministic calculation tests |
| Worker messaging, cancellation, timeout, and supersession | Chromium browser tests |
| Atomic deletion and rollback | Chromium IndexedDB tests |
| Single-facility hidden pairing, active synchronization, and route bypass | Fast pure/guard tests plus Chromium IndexedDB tests |
| Routes and status destinations | Fast route and service tests |
| Responsive layout, charts, focus, themes, and Electron window constraints | Focused manual review |
