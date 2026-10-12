# V1 Account Analysis Architecture

This document is the implementation reference for the production v1 account-analysis dashboard and workbench. It defines ownership, calculation orchestration, dashboard behavior, and the presentation that account and facility analyses intentionally share.

## Scope and boundaries

The feature lives under `src/app/v1/account/analysis`. The dashboard owns account-analysis inventory, commands, filters, active-for-reporting presentation, concise result calculation, details, and comparison. The route `/v1/workspace/account/:accountGuid/analysis/workbench/:analysisGuid` is the stable selected-analysis destination; until the workbench is implemented it renders one read-only placeholder.

IndexedDB remains the durable source of truth. Account analyses continue to reference facility analyses by facility and analysis GUID. Production v1 reuses the existing account roll-up calculations, persistence command boundary, workspace snapshot, status evaluation, and Worker infrastructure without importing v0 presentation or services.

No account-analysis record shape, database schema, backup format, report output, formula, unit conversion, rounding rule, or Electron contract changes as part of the dashboard.

## Dashboard ownership

The dashboard projects every account analysis into one card containing status, category, baseline, basis and units, facility-selection readiness, linked reports, active-for-reporting state, modified date, and the latest complete annual and monthly outcome facts. It offers create, copy, set active, compare, details, and guarded delete commands through a feature action service.

Creating an analysis uses the existing model factory so every current facility receives a selection entry. Copying preserves the source selection setup while assigning a new GUID and timestamps. Setting an active energy or water analysis requires its baseline to match the corresponding account goal baseline. Deletion is a compound command: linked reports block it, while the account's matching active selection and the analysis record are cleared atomically.

The dashboard exposes loading, evaluating, blocked, calculation-error, workspace-error, empty, filtered-empty, disabled, and ready states. Search, filters, sorting, and create controls use typed reactive forms.

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

Exact reusable analysis presentation belongs under `src/app/v1/shared/analysis-results`. This includes generic metric charts and their contracts, result number formatting, result markers and legends, annual/monthly outcome facts, active-reporting summaries, and the common comparison layout. Account and facility dashboards supply feature-owned view builders and commands to those components.

Page-specific tables remain explicit when their columns, row semantics, formulas, or completeness rules differ. Promote a table or graph only after account and facility consumers use the same semantic contract; do not create configurable abstractions that hide materially different calculations.

Account comparison accepts two analyses of the same category. It compares analysis setup and each facility selection by GUID, aligns annual rows by fiscal year, renders one accessible table per analysis, and reuses the common charts. Actual-versus-adjusted series require compatible units and energy basis; percentage-improvement series remain comparable independently.

## Workbench extension point

The placeholder workbench resolves the route analysis GUID, shows the selected record identity, and provides navigation back to the dashboard. The next workbench task should replace that component in place rather than changing the route.

Future setup and results pages should reuse the typed calculation entry point and shared analysis presentation where the semantics match. The workbench should own its editing, autosave, navigation, and full result lifecycle; the dashboard coordinator must remain an inventory-scoped projection rather than becoming shared mutable workbench state.

## Testing map

| Concern | Primary check |
| --- | --- |
| Card, facility-selection, linked-report, and comparison projections | Fast pure tests |
| Dashboard forms and interactions | Focused Angular TestBed tests |
| Calculation formula parity and result projection | Deterministic calculation tests |
| Worker messaging, cancellation, timeout, and supersession | Chromium browser tests |
| Atomic deletion and rollback | Chromium IndexedDB tests |
| Routes and status destinations | Fast route and service tests |
| Responsive layout, charts, focus, themes, and Electron window constraints | Focused manual review |
