# V1 Facility Analysis Architecture

This document is the implementation reference for the production v1 facility-analysis workbench and reusable inventory projections. It explains ownership, state lifetimes, calculation orchestration, and extension points. Use it before adding a setup field, regression option, result calculation, or results page.

## Scope and boundaries

The feature lives under [`src/app/v1/analysis/facility`](../src/app/v1/analysis/facility). It owns v1 routing, interaction state, draft editing, status presentation, and result presentation. It reuses version-neutral models, persistence commands, calculations, and Worker infrastructure from `data`, `domain`, `platform`, and `shared`.

Production v1 code must not import v0 presentation or services. A calculation helper belongs outside v1 only when it is deterministic and genuinely shared with another application surface. IndexedDB records remain the durable source of truth; view services and facades are route-scoped projections over those records.

The feature is organized by workflow ownership:

```text
analysis/
  inventory/       unified inventory, result demand, creation
  comparison/      comparison session and sheet
  account/         account projections, inspectors, comparison, workbench
  facility/        facility projections, inspectors, comparison, workbench
```

See the [feature source](../src/app/v1/analysis) for current entry points.

Keep specs beside the implementation they protect. Do not introduce broad feature-level `components`, `services`, `models`, or `specs` buckets; add code to the workflow that owns it. Each Angular component keeps its class, template, styles, and spec in its own component folder.

## Route and ownership model

The unified account Analysis inventory lists the selected facility's analyses through the same Simple/Summary/Detailed inventory cards as the account dashboard. Shared tile projection, Analysis snapshots, and inventory layout live under `src/app/v1/analysis/inventory/` and `src/app/v1/shared/inventory/`; feature services retain domain commands and calculation input ownership. Facility cards show the owning facility in the shared card header; its link requests filtered inventory scope. Summary shows annual/rolling improvement, baseline, energy basis, and modification date. Detailed adds a bounded Group Details roster, Used By, and Needs attention. Reporting badges and the Active filter replace a separate active-reporting strip.

Filtering and sorting precede 24-item pagination. The unified inventory derives facility scope from navigation, including implicit sole-facility scope for valid single-facility accounts. Shared inventory state restores controls, page, detail, individual overrides, scroll, and focus per scope after validation and results settle. Printing includes all matching cards.

The unified result coordinator retains matching card/detail/comparison jobs and permits at most two Workers. Existing calendarization, dependency closure, fingerprints, deterministic fallback, and Worker payloads remain authoritative. Opening `/v1/workspace/facility/:facilityGuid/analysis/workbench/:analysisGuid` creates a workbench-owned context. Account breadcrumbs open the unfiltered inventory; facility breadcrumbs open it filtered to the owner. Specialized account-analysis and report return origins remain intact.

The workbench owns the services that must survive child-tab navigation:

| Owner | Responsibility | Lifetime |
| --- | --- | --- |
| `FacilityAnalysisWorkbenchContext` | Resolves the selected account, facility, analysis, meter groups, stages, and status findings from the workspace | One analysis workbench route |
| `FacilityAnalysisAutosaveService` | Maintains committed and editable analysis copies, debounces valid edits, persists through the command boundary, and exposes navigation state | One analysis workbench route |
| `FacilityAnalysisPeriodService` | Projects the canonical calendarization for the editable draft and supplies the shared baseline-year choices and latest complete year to setup and header views | One analysis workbench route |
| `FacilityAnalysisResultsService` | Decides when complete facility result work is valid, builds the calculation request, cancels stale work, and caches the latest matching result | One analysis workbench route |
| `FacilityAnalysisResultsDisplayService` | Owns the user’s result-column preferences | One analysis workbench route; column preferences persist in v1 local storage |
| `RegressionCandidateStore` | Holds generated, uncommitted regression candidates by analysis and group GUID | One analysis workbench route; never persisted directly |
| `FacilityAnalysisWorkbenchNavigationService` | Tracks the active stage and contextual tab, projects completion and availability, guards locked deep links, and owns Back/Continue/Finish commands | One analysis workbench route |

The workbench route component is the provider and guard boundary. Its header, workflow navigation, and footer are focused child components that inject the route-scoped services directly. The header and both workflow/contextual tab rows share one sticky stack; group and facility result shells retain only route context, canonical fallback behavior, empty states, and their child outlets.

The header's shared `AnalysisStatusNotesComponent` displays selected-analysis and selected-analysis-group findings on every stage and result tab, including Used By. When several groups need regression setup, the header combines their setup notices into one message with the group count and combined missing settings. Other findings remain separate. Status details remain visible when facts are collapsed and expand naturally without an internal scrollbar or Review links. Stage and tab attention badges remain contextual and keep their existing readiness behavior.

Each group route creates `FacilityAnalysisGroupContext`. It resolves the group, group meters, meter-group metadata, and group findings. Setup and Regression then create page-specific facades:

- `FacilityAnalysisGroupSetupController` owns the typed setup forms, dynamic predictor controls, adjustment-editor state, and pending confirmations. `FacilityAnalysisGroupSetupFacade` owns setup projections and typed analysis-draft mutations.
- `FacilityAnalysisRegressionController` owns the typed regression controls, generated-model table filters, the discriminated pending-change state, and review focus restoration. `FacilityAnalysisRegressionFacade` owns candidate generation, model selection, regression draft transitions, and validation coordination.
- `RegressionModelValidationService` owns debouncing, cancellation, and the validation Worker state for the active Regression page.
- `FacilityAnalysisGroupResultsService` survives navigation among Annual, Monthly Table, and Monthly Chart. It reuses a ready facility result when every group is valid; otherwise it calculates only the selected completed group and matching banking chain.
- `FacilityAnalysisBankingResultsService` is provided by the group shell and is shared by Group Setup and the Banked Savings tab. It calculates the selected source group through the year before the new baseline, includes transitive source dependencies, and caches only matching inputs. Both surfaces consume the same projection: source rows continue through the applied year, and later rows through the year before the new baseline are transition rows.

Controllers are provided at their owning route and are the only layer that synchronizes editable draft state into form controls. Hydration and dynamic-control rebuilding use `emitEvent: false`; distinct user-value subscriptions translate `null` form values into optional domain values and issue one typed facade command. A component renders the controller state and invokes direct UI actions. Put domain transitions, calculation requests, and derived domain projections in the route-scoped facade or coordinator. Put deterministic transformations in plain functions with direct unit tests. Facades do not import presentation-component types or accept DOM events.

## Persisted and transient state

`IdbAnalysisItem` and its `AnalysisGroup` entries are durable. Cross-record references use GUIDs, including the analysis GUID, group GUID, meter group relationship, and banking dependency.

The autosave service keeps two copies:

1. `committed` is the last record confirmed by the workspace command boundary.
2. `draft` is the editable copy rendered by setup and regression pages.

Every draft transition clones before mutation and marks `isAnalysisVisited` false. Valid edits become `dirty`, then `saving`, then `saved`. Invalid form edits remain in the draft with state `invalid` and do not start persistence or result calculation. A failed write becomes `error` and can be retried or discarded.

The workbench header and Analysis Setup both read the editable draft for analysis-wide settings. `FacilityAnalysisPeriodService` derives complete years from the shared canonical calendarization, independently of group readiness and the result Worker. This keeps baseline and latest-complete-year facts available during setup without starting calculation work that cannot yet succeed.

Generated regression candidates, pending confirmation choices, open editors, loading flags, and Worker subscriptions are transient. Do not add them to IndexedDB records merely to preserve navigation state.

Analysis Setup, Group Setup, Regression, dashboard filters, create-analysis controls, and result-column preferences are reactive forms. Annual and monthly tables reuse the same result-column slideout component, but it presents only the options for the active period; production-variable columns remain visible. A control synchronization must never be used as evidence of a user edit; only emitted, deduplicated user changes may invalidate models, autosave drafts, or request calculation work.

## Result calculation orchestration

Facility result calculation is coordinated from one workbench-scoped service rather than from individual result components. Facility Annual, Facility Monthly Table, Facility Monthly Chart, Group Contributions, result-dependent header facts, and future facility views consume that state. Setup facts such as baseline and latest complete year use the editable draft and canonical calendarization instead, because they do not require valid group models or a result Worker.

Group result calculation has a distinct readiness boundary. The group-route-scoped coordinator requires valid Analysis Setup and the selected group, but ignores blocking findings owned by other groups. When another group blocks the facility calculation, the coordinator projects only the selected group, its meters and predictors, and the matching groups from the transitive banking chain into a group-results Worker request. Its fingerprint likewise excludes unrelated groups. When the complete facility calculation is available, the group coordinator projects the selected group from that result instead of starting duplicate work.

Banking source results have a third, group-route-scoped readiness boundary. The version-neutral banking-configuration evaluator is the source of truth for source compatibility, dependency cycles, matching usable groups, and year bounds. An applied year must be within the source baseline plus one through the latest complete year supported by the matching source group and its transitive banking dependencies. A new baseline remains bounded by the current analysis baseline and the consuming group's latest complete year, and must be later than the applied year. Analysis Setup, Group Setup, status, tab availability, route fallback, autosave, and the coordinator all consume that evaluation rather than reimplementing readiness.

`FacilityAnalysisBankingResultsService` reuses the selected-group Worker contract and deterministic calculation entry point, but sends the source analysis and matching source group with `reportYear` equal to the year before the consuming group's new baseline. Group Setup and `/group/:groupGuid/banking` consume the same complete result: source rows run through the applied year, and post-applied rows through the year before the new baseline are transition rows. The route owns the read-only source/model context, annual source table and charts, and monthly charts. Components never start banking Workers directly. The Banked Savings tab appears only when the analysis has banking enabled and the group opts into it, then remains disabled until the source, matching group, bounded years, and dependency chain are valid. The consuming group's unfinished regression setup does not gate source banking results. An unavailable deep link returns to Setup.

The workbench data flow is:

```text
workspace snapshot
  -> canonical account calendarization
  -> facility-analysis status evaluation
  -> autosave reaches idle/saved
  -> select analysis + transitive banking dependencies
  -> project only meters used by those analyses
  -> fingerprint calculation-bearing inputs
  -> one facility-results Worker
  -> publish one ready/error state
  -> all result views project from that state
```

The dashboard applies the same status, calendarization, dependency-closure, projection, and fingerprint rules to persisted analyses without an autosave gate. Blocking findings suppress that analysis's request; warnings do not. Dashboard requests retain partial-year monthly calculation but project the shared result down to complete annual rows through `reportYear` and the newest valid monthly row before crossing the Worker boundary. Requests run at most two at a time and time out through `CALCULATION_WORKER_TIMEOUT_MS`; timeout becomes that card's error state and the queue continues. The coordinator retains one ready result per analysis while its fingerprint matches, so an unrelated analysis change does not discard completed work. Demand is reconciled per account, analysis GUID, and fingerprint: unchanged running/queued work survives panel changes, and only obsolete jobs are canceled. Simple and off-page cards create no analysis demand. Service destruction terminates all remaining work.

The facility coordinator starts a Worker only when all of these invariants hold:

- the workspace snapshot is ready;
- autosave is `idle` or `saved`;
- status evaluation is ready and has no blocking finding;
- the canonical calendarization base matches its current input fingerprint; and
- the requested facility projection is ready.

While an invariant is unresolved, the service publishes `waiting` with a reason instead of starting calculation work. Result components render `idle`, `waiting`, `loading`, `ready`, and `error` explicitly.

The group coordinator applies the same workspace, autosave, status, and calendarization gates, but its blocking gate includes only Analysis Setup and the selected group. Warnings do not block either scope. A selected-group request is cancelled when its projected calculation fingerprint changes or the group becomes blocked.

The request fingerprint includes the selected analysis’s calculation fields, its transitive banking dependencies, facility fiscal and unit settings, projected calendarized meters, predictors, predictor readings, and calculation options. Display metadata such as the analysis name and modified date is intentionally excluded. Therefore a rename reuses the current result, while a baseline, group, model, meter, predictor, unit, fiscal, or banking change replaces it.

RxJS `switchMap` is the cancellation boundary. When the fingerprint changes, teardown terminates the stale Worker before starting its replacement. Facility, group, and banking coordinators retain only matching ready results. Do not call the result Worker from a component, tab, or effect.

### Adding a calculation input

When a new field can change a result:

1. Add it to the typed Worker request if the calculation needs it.
2. Add its stable calculation representation to `facilityAnalysisResultsFingerprint`.
3. Update the pure calculation entry point and all synchronous consumers.
4. Add a unit test proving the fingerprint changes for the field and remains stable for unrelated display metadata.
5. Add or update a browser Worker lifecycle test when message or cancellation behavior changes.

Missing a fingerprint input can publish stale results. Including volatile display metadata can spam Workers. Treat both as correctness defects.

## Regression orchestration

Regression uses two distinct Worker operations:

1. Model generation calendarizes the group inputs and returns candidate models for the inclusive range from the effective baseline year through the latest complete analysis year. It does not generate pre-baseline candidates. `FacilityAnalysisRegressionFacade` cancels a superseded generation with `AbortController`. Candidates go into `RegressionCandidateStore`; selecting one applies a deliberate draft transition and autosaves the analysis.
2. Model validation sends the candidate, optional selected-model comparison, raw inputs, and analysis context through one validation Worker. The Worker calendarizes once and calculates both monthly series from the same snapshot. A new edit or inspected model unsubscribes and terminates the old Worker.

User-defined model construction is a shared pure function used by the synchronous service and validation calculation. Generated-to-user-defined conversion, model invalidation, and selection are centralized in `regression-draft.ts`; pages must not clear model fields ad hoc.

Predictor selection changes invalidate generated models. In user-defined models, they preserve the constant and every predictor coefficient, including excluded predictors; only selected predictors contribute to the equation and validation. Excluded coefficient controls retain their values while disabled, so selecting the predictor again restores its term.

The user-defined model editor uses the shared themed input, select, and textarea controls, including focus and disabled states, to keep values readable in light, dark, and high-contrast modes.

New and existing twelve-month user-defined periods lock the end month and year. Start-date edits update the end date atomically to twelve inclusive months (January–December or July–June of the following year). The duration row offers an end-date unlock and a return to the twelve-month default. This lock is transient UI state; existing custom or incomplete saved periods reopen unlocked without rewriting their dates during hydration. Autosave exposes a draft-reset version so discarding edits or resetting the analysis context reinitializes the lock from the restored period, even within the same group route. Ordinary edits and successful saves preserve the current lock choice. Custom periods retain the existing minimum of twelve complete months.

Regression validation states are `idle`, `invalid`, `loading`, `ready`, and `error`. Invalid user input is rejected before Worker creation. Worker responses use typed success/error unions, and thrown or browser Worker errors are mapped to the page error state.

## Worker contract rules

Worker request and response interfaces live beside Workers under [`src/app/platform/web-workers`](../src/app/platform/web-workers). The Worker itself is a thin adapter over a deterministic calculation function. The same function is used by the synchronous fallback so browser and non-Worker execution cannot drift.

For every Worker path:

- send one structured-cloneable request and return one typed response;
- represent calculation failures in the response contract and transport failures through the observable or promise error path;
- terminate on success, failure, cancellation, route destruction, or replacement;
- never retain a global “current Worker” that lets one caller cancel another caller’s work; and
- test successful messaging, failure handling, and supersession or cancellation in a browser test.

Calendarization is already coordinated at workspace scope for facility results. Do not calendarize again inside a result component. Regression generation and validation accept raw inputs because their model-specific calculations have an independent lifecycle; validation combines candidate and comparison work so it calendarizes only once per request.

## Results presentation

Group **Visualization** is an exploratory input-data tab immediately after Setup,
available for all analysis methods, including skipped groups. It does not consume
completed analysis results or require a valid regression model. Its route-local
facade reads the canonical calendarization projected into the analysis units and
site/source basis, group meter GUIDs, and saved owning-facility Predictor readings.
No weather readings are fetched or generated to draw these plots. Raw Time Series uses
actual group usage on the left axis and visible raw Predictor values on the right;
Correlation shows a separate scatter plot and intercept-bearing linear fit per
visible Predictor. The time series stays visible above a responsive grid of
correlation plots; the tab has no section headings, introductory descriptions,
chart-view switch, or visible monthly data table. A screen-reader-only table exposes
the full analysis-period values, coverage, and selected predictors in the active
Raw/Z-score scale. Predictor controls use disambiguated accessible names while
keeping visible names short and unit-free. A trace-colored Group usage legend button
is locked on; Predictor buttons toggle only Predictor traces. Double-click or
Shift+Enter isolates one Predictor alongside group usage, updating only transient
visualization selections. Correlation summaries
show r and R² without paired-month counts, followed by the best-fit line equation
`y = mx + b` (y is group usage; x is the Predictor). Coefficients display five
significant figures and use the existing raw-data fit without changing calculations.
Trace buttons wrap beside the chart actions in one toolbar above the time series,
without a divider or separate action row between controls and plot.
Trace button labels omit units; axes, tooltips, and correlation plots retain them.

The toolbar's typed reactive Raw / Z-score control defaults to Raw. Z-score mode
standardizes group usage and each visible Predictor independently as `(x - mean) /
population standard deviation`, using finite monthly values across the full
analysis period. Missing values stay gaps. Each series' reference period is fixed
while zooming or toggling other series. Standardized traces share one axis labeled
Standard deviations from mean, with a thicker theme-aware horizontal zero line.
Time-series tooltips show only the selected scale: raw values with units or z-scores.
Raw axis labels and tooltip
values use five significant figures; chart data and statistics keep full precision.
Constant series or series
with fewer than two finite readings show gaps and an explicit unavailable notice;
no divide-by-zero result is plotted. Correlation plots/statistics retain their
original raw-data contract. Printing and PNG download use the selected chart mode.
Calendar-month alignment and duplicate-reading aggregation
match monthly analysis; absent/non-finite values remain gaps. Source bills determine
coverage independently of calendarized row presence, since calendarization can
synthesize zero-valued rows for missing months. Full-month readings cover their
calendar month, annual readings cover their calendar year, and backward bills cover
the interval after the previous reading through the current reading. Finite source
values are required; a legitimate zero is covered. Partial group totals are visible
with coverage warnings and excluded from correlation pairs. Statistics
require at least three complete pairs with varying values in both series.

The chart history runs from the analysis baseline fiscal-year start through
the latest group month, independently of analysis method. A missing baseline uses
full history. Timeline selection uses chart zoom, with no separate date selector;
zoom affects only the time-series viewport. `GroupVisualizationSession`, provided by the
workbench, retains visible Predictor GUIDs, scale, and zoom
per owning account/facility/analysis/group while navigating child routes. It never
updates analysis drafts, validation, persistence, or backups. Scale-control edits
are compared with the current session scale so silent hydration when a group route
reuses the component cannot suppress a later edit. Explicit Retry asks
the shared calendarization service to rerun its current snapshot, preserving its
existing sharing, cancellation, and publication rules. The existing result-tab and
stage guards remain authoritative.

Shared modeled-equation labels parenthesize regression multiplication terms and additive modified-intensity products while preserving their signs and significant-digit formatting.

Result pages are projections, not calculation owners. Facility pages read `FacilityAnalysisResultsService.state`; ordinary group pages read `FacilityAnalysisGroupResultsService.state`; the Banking tab and setup preview read `FacilityAnalysisBankingResultsService.state`. Annual and monthly tables share accessible banked-source, banked-savings, transition, and group model-period markers, and render only the markers present in each table's legend. Transition rows preserve actual use, the applied year's carried total improvement, cumulative values supplied by calculation, and rolling values while suppressing adjusted/model-derived, annual-improvement, and directly attributed savings fields that are not meaningful. Chart row values use `null` for those unavailable points so charts create a gap, omit comparison bands across it, display an em dash visually, and announce the value as unavailable rather than plotting zero. Positive and negative values belong to exactly one ordinary or banked savings series.

Both ordinary scopes offer Annual, Monthly Table, and Monthly Chart. Annual displays its table first, followed by the v0-equivalent Actual-versus-Calculated and Annual-versus-Total-improvement charts; monthly routes keep the dense table and chart in separate tabs. Facility calculations retain annual summaries only through the latest complete fiscal `reportYear`, while monthly rows continue through the newest month supported by every included meter and predictor. Dashboard cards and workbench facts therefore show total savings percent improvement for the complete report year and rolling 12-month improvement for the newest available month. Annual completeness and missing-predictor flags must be derived from the same `fiscalYear` row set used to calculate that annual value; calendar-year filtering is incorrect for non-calendar facilities. Missing-data flags or non-finite values make the corresponding fact unavailable rather than presenting zero. Facility Results also offers Group Contributions. That view starts with a diverging contribution heatmap, then groups its table rows by fiscal year, uses each year heading as a facility-total row, and indents the included groups beneath it. Heatmap rows are groups, columns are fiscal years labeled with their facility total, and a symmetric scale around zero uses green for savings and red for losses. The initial baseline year is omitted when its facility savings is zero. Contribution percentage is the group's annual savings divided by the facility's annual adjusted use, multiplied by 100; a zero adjusted value produces zero contribution rather than an invalid value. Result tables use the v0 analysis display-rounding rules and omit banked and unbanked savings when banking is disabled. Existing `/monthly` deep links redirect canonically to `/monthly-table`. Shared result status and toolbar components live under `results/presentation`; page-specific tables remain explicit so columns and formulas are easy to inspect.

Future results pages should be added below the existing group or facility result shells. They should consume the coordinator’s current result or add a clearly named projection to it. Add a new Worker only when the calculation has a genuinely different input and lifecycle boundary—not merely because a new tab needs another presentation.

Generic metric charts and their contracts, contribution heatmaps, result number formatting, result markers and legends, annual/monthly outcome facts, active-reporting summaries, and the common comparison layout are shared v1 analysis presentation. Facility/group Annual and Monthly Chart routes and facility Analysis reports share `AnalysisResultChartsComponent` for chart configuration and responsive layout. `AnalysisModelComparisonChartComponent` owns regression comparison series, model-period shading, formatting, and accessible data for both model validation and reports. Feature adapters own result demand, periods, and transition/banking selection; these shared components start no calculations and save no preferences. Shared-axis percentage charts that allow negative values emphasize the horizontal zero-percent axis with a thicker, theme-aware line so savings and losses remain distinguishable. The shared contribution heatmap owns chart configuration, percentage formatting, themes, horizontal overflow, and PNG download for both group and account facility contributions. Facility group contributions and facility Analysis reports also share the pure group-contribution projection and input-driven table/heatmap presenter under `v1/shared/analysis-results/group-contributions/`. Account facility contributions retain their feature-owned view builder. Feature adapters own result readiness and supply current calculation results and labels; report embedding hides chart actions and defers initialization while Analysis retains immediate charts and PNG download. Keep tables feature-owned when their columns, row semantics, formulas, or completeness rules differ; promote them only when both workflows use the same contract without feature switches.

## Confirmation and navigation rules

Destructive setup and model changes use `TemplatePortal`, `ModalPortalService`, and `ConfirmationDialogComponent`. Feature components own the pending action and explanatory copy; the shell owns stacking, focus trapping, Escape handling, and backdrop behavior.

Analysis Setup and group completion are status-ready projections with no blocking errors; warnings remain visible but do not prevent completion. Setup is always available. Once Setup is complete, every group becomes available and groups may be completed in any order. A completed group can display its own results even while another group is incomplete. Facility Results becomes available only after every group is complete. Used By is informational and ignores workflow prerequisites, although transient autosave navigation locks still apply. Locked group and Facility Results deep links redirect to the first unmet prerequisite.

The footer follows displayed stage order without making groups sequential prerequisites. Continue moves from Setup to the first group, between listed groups even when the current group remains incomplete, from the last group to Facility Results only when all groups are complete, and then to Used By. Back selects the nearest previous available stage. Route guards are a final safety boundary, not the primary save mechanism. Contextual group tabs are derived from configuration: Banked Savings appears after Setup whenever banking is selected and is disabled until its banking options are valid, Regression appears only for regression groups, and result tabs are hidden for skipped groups.

## Testing and debugging map

Use the smallest layer that owns the behavior:

| Concern | Primary check |
| --- | --- |
| Draft transition, dependency closure, fingerprint, row projection | Fast unit test for the pure function |
| Facade state or component interaction | Focused Angular TestBed test |
| IndexedDB command or atomic deletion | Chromium browser test |
| Worker payload, response, termination, or supersession | Chromium browser test with a fake or real Worker boundary |
| Formula or result value | Deterministic calculation test plus every affected consumer |
| Web/Electron packaging | Validation planner, then the selected build tier |

When results do not update, inspect the coordinator state in this order: autosave, status, calendarization fingerprint, result fingerprint, then Worker response. When too many Workers start, compare the old and new result fingerprints and identify the volatile input that was included. When a regression chart is stale, check validation request cancellation and the analysis/group GUID used by the candidate store before changing calculation code.

## Change checklist

Before completing facility-analysis work:

- preserve GUID relationships and older stored records;
- keep components focused on presentation and local interaction;
- route draft changes through autosave and centralized transition helpers;
- update request, response, fallback, caller, and browser tests together for Worker changes;
- reuse the canonical calendarization projection for result work;
- verify loading, waiting, empty, error, blocked, and ready states;
- keep result tables and formulas readable rather than over-generalizing them; and
- update this document when an ownership boundary, data flow, or invariant changes.

### Shared user-defined inspection projection

The neutral [user-defined inspection calculation](../src/app/domain/calculations/analysis-calculations/user-defined-inspection-calculation.ts) supplies its dedicated [Worker](../src/app/platform/web-workers/user-defined-inspection.worker.ts) and synchronous fallback. It preserves ordinary monthly actual/modeled points and adds only selected model-period months absent from those rows, using the same regression expression and nonnegative boundary. Added points are chart-only: they create no savings/baseline rollups, alter no saved analysis baseline or SEP validation input, and do not change the ordinary monthly-group Worker contract.

Inspection input identity excludes analysis annotations such as notes/status timestamps but includes coefficients, periods, units, predictors/readings, and banking dependencies. Metadata changes therefore reuse numerical work; input changes cancel/supersede it. Validate account/request/current-input identity before synchronizing Worker results into Angular state. Interactive Worker timeout and retry follow the shared [Worker lifecycle](../ARCHITECTURE.md#calculations-workers-and-reports).
