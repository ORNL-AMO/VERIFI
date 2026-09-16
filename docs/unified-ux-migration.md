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

### Portfolio Setup and Facility Onboarding Workflow

- **Workflow:** v1 portfolio setup and first-facility onboarding, issue #2638.
- **Existing v0 entry point:** Account setup lives under `/data-management/:id/account-setup`; facility management and facility setup live under `/data-management/:id/facilities`.
- **Decision:** Rebuild in v1 with account-level `Data > Portfolio` for facility portfolio management and `Account Settings > Portfolio` for add, delete, and selected-facility account-setting application.
- **Parity:** Facility creation uses existing facility defaults from `getNewIdbFacility(account)` and continues setup through v1 facility settings for profile, units, goals, financial reporting, and data staleness.
- **Shared contracts:** No IndexedDB schema, migration, backup, import/export, calculation, Worker, report, or Electron contract changes.
- **Tests:** Focused v1 navigation, account data portfolio, account settings portfolio, and shared portfolio command specs; validation planner decides parent checks.

### Data Navigation Foundation Workflow

- **Workflow:** v1 account and facility Data section navigation, issue #2642.
- **Existing v0 entry point:** Account custom data lives under `/data-management/:id/account-custom-data`; facility meters, predictors, and energy uses live under `/data-management/:id/facilities/:facilityGuid`.
- **Decision:** Establish v1 Data routes and secondary navigation with placeholder destinations. Rebuild migrated content one workflow at a time.
- **Parity:** Account Data keeps Portfolio and account-level custom database destinations; Facility Data exposes Meters, Predictors, and Energy Uses. Events remain deferred until a persisted event model is approved.
- **Shared contracts:** No IndexedDB schema, migration, backup, import/export, calculation, Worker, report, or Electron contract changes.
- **Tests:** Focused v1 route helper, single-site redirect, and section navigation specs; validation planner decides parent checks.

### Facility Meters Workspace Navigation Workflow

- **Workflow:** v1 Facility Data > Meters workspace, issues #2644 and #2645.
- **Existing v0 entry point:** Facility meter setup, meter readings, monthly data, meter grouping, and data quality are split across Data Management and Facility utility routes.
- **Decision:** Rebuild the production v1 workflow as one Facility Data > Meters workspace with grouped meter cards and deep-linked selected-meter workbench tabs.
- **Parity:** This first slice establishes navigation, grouped meter visibility, meter selection, workbench tabs, empty states, pending/read-only messaging, and WIP placeholders for detailed content.
- **Shared contracts:** No IndexedDB schema, migration, backup, import/export, calculation, Worker, report, or Electron contract changes.
- **Tests:** Focused v1 route/navigation specs and Facility Data Meters component specs; validation planner decides parent checks.

### Facility Meter Group Results Workflow

- **Workflow:** v1 Facility Data > Meter Grouping selected-group workbench.
- **Existing v0 entry point:** Meter grouping results table and graph under the current shared meter grouping routes.
- **Decision:** Rebuild in v1 as a selected meter-group workbench with header facts, side-nav group links, Monthly Table, Monthly Chart, and combined Yearly Data tabs. Use the v1 meter results chart component with Apache ECharts while leaving v0 Plotly surfaces in place.
- **Parity:** Monthly group totals match v0 energy, water consumption, and cost aggregation. Yearly totals aggregate by facility fiscal year for the new v1 yearly tabs.
- **Shared contracts:** No IndexedDB schema, migration, backup, import/export, Worker payload, report export, or Electron contract changes.
- **Tests:** Focused v1 route/navigation specs, group result aggregation specs, workbench table/graph specs, and browser coverage for native chart rendering where practical; omit `build-prod` from Codex validation for this workflow.

### Facility Meter Results Workflow

- **Workflow:** v1 selected-meter Settings, Monthly Table, Monthly Chart, and Yearly Data tabs.
- **Existing v0 entry point:** Facility meter monthly data page and calendarization method modal under the current Data Management meter routes.
- **Decision:** Move the calendarization method selector into the v1 meter Settings form, rebuild the v0 explanatory modal as a dense v1 slideout that also allows method selection, and fill the selected-meter results tabs with v1-native monthly table, monthly chart, and yearly chart/table content. Share the v1 meter results chart between selected-meter and selected-group workbenches because both consume prepared period rows and metric metadata; keep table components separate where meter and group columns differ. Until more chart metric options are available, use direct series display toggles with chart zoom and PNG download actions instead of a metric-selection settings panel.
- **Parity:** Monthly Table uses existing calendarized meter results and preserves v0 table columns for consumption, energy, cost, and applicable emissions. The “Do Not Calendarize Meter Data” method hides only Monthly Table because it duplicates the Readings tab; Monthly Chart and Yearly Data remain visible and show the same no-calendarization settings call-to-action when needed.
- **Shared contracts:** No IndexedDB schema, migration, backup, import/export, Worker payload, report export, or Electron contract changes.
- **Tests:** Focused v1 meter settings, workbench tab visibility, monthly table, monthly chart, yearly data, shared chart, and calendarization helper specs; omit `build-prod` from Codex validation for this workflow.

### Facility Meter Data Quality Report Workflow

- **Workflow:** v1 selected-meter Quality Report tab.
- **Existing v0 entry point:** Facility meter Data Quality Report under the current Data Management meter routes.
- **Decision:** Rebuild in v1 using version-neutral meter data quality helpers and Apache ECharts. Preserve statistics, outlier warnings, duplicate-month review, and raw-reading consumption and cost time series; intentionally omit v0 histogram/binning charts and annual totals.
- **Parity:** Statistics use the existing min, max, average, median, MAD, median +/- 5 MAD, and outlier rules. Time-series charts use one shared-x-axis figure with stacked consumption and cost plots, marker-bearing line series, outlier overlays, and the expected MAD range as a shaded band. Cost sections render only when finite non-zero cost data exists.
- **Shared contracts:** No IndexedDB schema, migration, backup, import/export, Worker payload, report export, or Electron contract changes.
- **Tests:** Focused v1 quality helper and component specs, plus ECharts scatter browser coverage when the directive registration changes. Skip `build-prod` in the Codex sandbox because it does not work reliably there; leave production build validation to CI or a non-sandbox environment.

### Facility Meter Bill Inspection Workflow

- **Workflow:** v1 selected-meter Bill Inspection tab.
- **Existing v0 entry point:** `meter-charges-visualization` under the current Data Management meter routes.
- **Decision:** Rebuild in v1 as an electricity-only meter workbench tab for meters with configured charges. Use raw utility bill readings and Apache ECharts to compare detailed charge amounts with bill consumption, total cost, and demand.
- **Parity:** Preserve the v0 charge-over-time and per-charge correlation inspection intent while adding v1 empty states, accessible data tables, scrollable legends, zoom, and PNG download.
- **Shared contracts:** No IndexedDB schema, migration, backup, import/export, calculation, Worker payload, report export, or Electron contract changes.
- **Tests:** Focused v1 route/navigation specs, meter tab visibility specs, and bill inspection component specs for chart data preparation, regression lines, and empty states.

### Portfolio Resource Card Reuse Decision

- **Workflow:** v1 account portfolio resource tabs, starting with account-wide Meters and extending next to Predictors, Energy Uses, Analyses, and Reports.
- **Existing v0 entry point:** Current portfolio-style browsing is split across Data Management facility resources and Data Evaluation account/facility surfaces.
- **Decision:** Do not move `MeterBrowseCardComponent` into a shared folder unchanged. It is visually reusable but still owns facility-meter workspace dependencies and card actions. When the next reusable resource card is implemented, extract a v1 shared presentational card pattern under `src/app/v1/shared/` that receives prepared display state and emits user intents, while meter, predictor, energy-use, analysis, and report wrappers keep feature-specific data shaping, routing, status checks, copy/delete behavior, and modal ownership.
- **Parity:** Facility and account contexts should keep the same visible card affordances where appropriate: clickable title with icon and chevron, optional owning-facility header for portfolio cards, fact tiles, footer actions, loading/error/disabled states, and route-correct navigation. Facility Data resource views should also mirror the account portfolio tabs' search, filter, and sort pattern so users can scan meters, predictors, energy uses, analyses, and reports consistently whether they are working inside one facility or across the account.
- **Shared contracts:** No IndexedDB schema, migration, backup, import/export, calculation, Worker, report, or Electron contract changes should be introduced by the presentational extraction itself.
- **Tests:** Cover the shared presentational card behavior separately, then cover each resource wrapper in both facility and account portfolio contexts. Avoid account-portfolio shims for facility-only services once the shared card API exists.

## Implementation Rules

- Do not add v0/v1 conditionals to legacy components.
- Rebuild v1 UI components from scratch using the new architecture and P1 learnings.
- Reuse shared data, domain, platform, and model contracts when they are not coupled to legacy presentation behavior.
- Put v1 child components in their own folders with their `.ts`, template, styles, and spec files colocated. Keep parent workflow folders for the route/container component and shared workflow models/helpers, not piles of sibling child component files.
- In v1 workbench tabs, stack primary content sections with connected borders, square outer corners, and no vertical gaps between sections. Avoid floating, rounded card treatment for top-level workbench content; reserve card styling for repeated items inside a section only when it improves scanning.
- In v1, use the themed content-control color (`--v1-content-control`, orange in the default theme) as the active fill, border, or indicator for tabs, segmented toggles, selectors, nav-panel active indicators, and other content navigation controls. Keep active labels on neutral text unless contrast requires otherwise. Use the themed action color (`--v1-action`, blue in the default theme) for additive page actions such as adding a facility, meter, or group. Prefer the semantic tokens and button classes over hard-coded colors.
- Keep current public v0 URLs stable while v0 remains the default experience.
- Keep `/p1` prototype routes and `/v1` production routes out of `develop`; on `unified-ux`, root routing lazy-loads `/p1`, `/v1`, and the default v0 route tree.
- Treat `/p1` as non-production reference material. It may temporarily import `@v0/shared/*` while production v1 must not import from `@v0/*`.
- Prefer aliases for cross-boundary imports: `@app/*`, `@shared/*`, `@v0/*`, `@data/*`, `@domain/*`, and `@platform/*`. Use aliases instead of long relative paths when crossing from a feature into app shell, shared, data, domain, or platform code; keep relative imports for files that are local to the same feature/component folder.
- Do not import from `@v0/*` in root shared, data, domain, platform, or production v1 code.
- Use `@v0/shared/*` for legacy reusable UI even when only v0 imports it today; use `@shared/*` only when v1 can safely depend on the code without inheriting v0 presentation behavior.

## Validation

- For develop foundation changes, run `npx tsc -p tsconfig.app.json --noEmit` after each module or folder move.
- Before opening the develop foundation PR, run `npm run test:ci`, `npm run test:browser:ci`, `npm run build-prod`, and `npm run build-prod-electron`.
- After merging the foundation into `unified-ux`, verify legacy routes, `/p1`, and `/v1`.
- For each future v1 workflow, add focused tests for changed behavior. Add browser tests when IndexedDB, File APIs, or Workers are involved, and Electron validation when renderer or desktop behavior changes.
