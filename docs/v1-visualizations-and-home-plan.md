# V1 Visualizations and Home Plan

## Purpose and delivery

Deliver the next unified UX phase in [epic #2564](https://github.com/ORNL-AMO/VERIFI/issues/2564): saved Visualizations first, then customizable Home dashboards that reuse them.

The user journey is **create or capture a visualization → save and revisit it → reuse it on Home → later reuse it in a custom report**. The accepted phase plan was agreed on November 10, 2026. Vis1 foundation contracts are implemented locally; its [workflow and contract specification](v1-visualization-foundation.md) records the decisions accepted on November 11, 2026. Application integration remains in the downstream issues.

## Accepted product decisions

- Saved visualizations belong to an account and declare portfolio or facility scope. They stay connected to current saved data and authoritative calculation results.
- Persist a versioned VERIFI definition of data sources, calculation intent, filters, period rules, units, selected series, and appearance. Generate ECharts options and computed values at runtime rather than storing chart instances, executable callbacks, or frozen results.
- Users can choose fixed dates or rolling periods. Source selections and date rules must be explicit so opening a saved chart cannot silently retarget it.
- Home widgets reference saved visualizations. Editing one updates all dashboard appearances. Duplicate creates an independent visualization.
- Dashboard layout and widget overrides belong to the dashboard instance. They do not silently change the linked visualization.
- Templates are reusable starting points. Customizing an instance never changes the shipped template. Personas guide content without restricting capabilities or requiring a role-selection step.
- The Visualizations section lists saved items on Dashboard. Add visualization steps through ownership, concrete chart type, multiple source families, then name; chart/source compatibility is established by adapters, not by family selection alone.
- Support utility usage, costs, charges, emissions, water, predictors/weather, Energy Uses, and existing analysis results. Offer chart/settings combinations that preserve the selected data's meaning.
- Use ECharts extensively for rendering and interaction while keeping VERIFI calculations, units, fiscal periods, provenance, and quality rules authoritative.
- Custom report authoring is deferred. Reusable visualization definitions and rendering boundaries should support that later extension.

## Existing foundation and boundaries

The current branch already includes shared [ECharts rendering](../src/app/v1/shared/charts/echarts-chart.directive.ts), [chart registrations](../src/app/v1/shared/charts/echarts.ts), inventory chart presentation, feature-owned analysis charts, and Energy Use treemap/Sankey projections. Reuse these rather than restarting their migration. Current v1 Home provides status/count summaries; Visualizations is a disabled rail destination.

Existing child [#2635](https://github.com/ORNL-AMO/VERIFI/issues/2635) tracks the early Account/Facility Home slice and remains attached to the epic. It is historical foundation work, not a substitute for the Home issues below; its existing state is preserved.

Use [v0 account Home](../src/app/v0/data-evaluation/account/account-home/), [facility Home](../src/app/v0/data-evaluation/facility/facility-home/), [account Overview](../src/app/v0/data-evaluation/account/account-overview/), and [facility Overview](../src/app/v0/data-evaluation/facility/facility-overview/) as content references. Record focused workflow dispositions when implementation reaches each area.

Preserve existing v0 behavior, calculations, source records, report settings, and supported file formats. Saved visualization/dashboard persistence and backup additions are explicit scope in Vis2 and Home2, not incidental UI edits. Do not change existing scientific formulas, weather retrieval, Electron IPC, or report outputs as a side effect.

## Delivery sequence

1. **Prove a complete saved visualization journey.** Vis1–Vis4 plus the utility time-series slice of Vis6 and capture slice of Vis9 establish create/capture, save, reopen, and refresh before expanding breadth. Individual issue slices do not close the broader issues early.
2. **Complete exploration and capture coverage.** Vis5–Vis9 finish additional source families, chart types, and v1 integrations; Vis10 verifies the combined experience.
3. **Prove linked Home reuse.** Home1 can be designed during Visualizations work. Home2–Home4 establish durable dashboards, customization, and linked visualizations after the visualization foundation is ready.
4. **Deliver Home content and templates.** Home5–Home6 supply summaries/goals/readiness, default templates, and v0 content acceptance.

Dependencies below describe implementation prerequisites. Slices can overlap when their shared contract is stable, while visualization completion remains the first delivery milestone.

## Visualization starter recipes

**Status: planned downstream; not implemented by Vis3.** Deliver a recipe chooser alongside Custom once the first Vis4 utility provider and Vis6 time-series editor can render real saved charts. The Custom path uses Vis3's chart-first workflow. Recipes prefill ordinary editable visualization intent and require explicit account/facility resource binding before adding an independent saved visualization. Editing an instance never changes the shipped recipe. Do not automatically populate accounts or facilities.

| Recipe | Delivery dependency |
| --- | --- |
| Energy usage trend | First working Vis4/Vis6 utility path |
| Utility cost trend | First working Vis4/Vis6 utility path |
| Utility/source breakdown | Applicable Vis4/Vis8 composition adapter |
| Usage versus production or weather | Vis5 with compatible Vis6/Vis7 editing |
| Analysis comparisons | Applicable Vis5 analysis and Vis6/Vis7 adapters |

Each recipe must preserve ownership, explicit source bindings, period/units/provenance, save/reopen behavior and actionable unavailable states. Unusable recipes explain missing data/support. Deliver the first two recipes with the first working chart path, then expand as adapters arrive; Vis10 verifies combined acceptance. Visualization recipes create individual saved charts and remain distinct from the Home layout templates below.

## Default Home templates

| Template | Primary audience | Starting content |
| --- | --- | --- |
| Overview | General or occasional user | Key totals, readiness, goals, recent performance, next actions |
| Goals & Performance | Energy manager or leadership | Energy/water goals, improvement, savings, baseline comparisons |
| Energy Use | Facility or portfolio energy manager | Usage trends, source/facility breakdowns, year comparisons, equipment composition |
| Costs | Finance or operations | Utility spending, charge breakdowns, year comparisons, facility rankings |
| Emissions | Sustainability user | Existing emissions trends and source/facility breakdowns |
| Water | Water or sustainability manager | Usage, costs, trends, goals, facility comparisons |
| Blank | Power user | Empty layout for saved visualizations and other widgets |

Home1 defines the detailed widget composition and dispositions for applicable maps, tables, and other v0 content. Template labels do not create new calculation methods or new goal types.

## Progress tracker

| Tag | Issue | Status | Prerequisites |
| --- | --- | --- | --- |
| Vis1 | [#2901 Define the visualization workflow and reusable configuration contract](https://github.com/ORNL-AMO/VERIFI/issues/2901) | Implemented locally; review/QA pending | None |
| Vis2 | [#2903 Persist saved visualizations and preserve them through backup and restore](https://github.com/ORNL-AMO/VERIFI/issues/2903) | Implemented locally; review/QA pending | Vis1 |
| Vis3 | [#2904 Build the Visualizations Dashboard and workbench](https://github.com/ORNL-AMO/VERIFI/issues/2904) | Framework and alignment implemented locally; review/QA pending | Vis1, Vis2 |
| Vis4 | [#2905 Build utility cost emissions and charge data selection](https://github.com/ORNL-AMO/VERIFI/issues/2905) | Not started | Vis1, Vis3 |
| Vis5 | [#2906 Add predictor weather Energy Use and analysis result sources](https://github.com/ORNL-AMO/VERIFI/issues/2906) | Not started | Vis1, Vis3, Vis4 |
| Vis6 | [#2907 Build time series and comparison chart editing](https://github.com/ORNL-AMO/VERIFI/issues/2907) | Not started | Vis3, Vis4 |
| Vis7 | [#2908 Build correlation and heatmap exploration](https://github.com/ORNL-AMO/VERIFI/issues/2908) | Not started | Vis5, Vis6 |
| Vis8 | [#2909 Build composition hierarchy and flow visualizations](https://github.com/ORNL-AMO/VERIFI/issues/2909) | Not started | Vis5, Vis6 |
| Vis9 | [#2910 Add Visualize capture actions throughout v1](https://github.com/ORNL-AMO/VERIFI/issues/2910) | Not started | Vis2, Vis3, Vis4, Vis5, Vis6, Vis7, Vis8 |
| Vis10 | [#2911 Complete visualization integration and release acceptance](https://github.com/ORNL-AMO/VERIFI/issues/2911) | Not started | Vis1, Vis2, Vis3, Vis4, Vis5, Vis6, Vis7, Vis8, Vis9 |
| Home1 | [#2912 Define Home templates and map existing v0 content](https://github.com/ORNL-AMO/VERIFI/issues/2912) | Not started | Vis1 |
| Home2 | [#2913 Persist dashboards and template instances](https://github.com/ORNL-AMO/VERIFI/issues/2913) | Not started | Home1, Vis2 |
| Home3 | [#2914 Build customizable Home navigation and layout editing](https://github.com/ORNL-AMO/VERIFI/issues/2914) | Not started | Home1, Home2 |
| Home4 | [#2915 Embed linked saved visualizations in Home](https://github.com/ORNL-AMO/VERIFI/issues/2915) | Not started | Home2, Home3, Vis9 |
| Home5 | [#2916 Build Home summaries goals and readiness widgets](https://github.com/ORNL-AMO/VERIFI/issues/2916) | Not started | Home1, Home3, Vis5 |
| Home6 | [#2917 Deliver default Home templates and verify parity](https://github.com/ORNL-AMO/VERIFI/issues/2917) | Not started | Home1, Home2, Home3, Home4, Home5, Vis10 |

## Visualization issues

### Vis1 Define the visualization workflow and reusable configuration contract

**Issue:** [#2901](https://github.com/ORNL-AMO/VERIFI/issues/2901) · **Status:** Implemented locally; review/QA pending

Define a coherent Dashboard, editor, chart capture, and embedding workflow before implementing the saved visualization model.

The [Vis1 foundation specification](v1-visualization-foundation.md) defines the accepted workflow, focused chart dispositions, executable contract boundaries, and three-PR delivery stack. Vis1 does not implement persistence, production providers, routes, capture actions, or Home widgets.

**Scope**

- Specify account ownership, portfolio/facility scope, source selection, fixed and rolling date ranges, comparison periods, save behavior, and Dashboard/workbench navigation.
- Define a versioned VERIFI visualization definition that separates source/calculation intent and presentation from generated ECharts options and computed data.
- Define source-provider and chart-capability boundaries so existing chart families can participate without losing their meaning.

**Acceptance criteria**

- [x] Document the create or capture → save → reopen → reuse on Home journey, including loading, empty, invalid, failed-save, and missing-source states.
- [x] Saved definitions retain source identity, filters, aggregation, units, site/source treatment, selected series, date rules, appearance, and relevant chart-specific settings.
- [x] Home uses linked visualizations: editing the saved definition updates every embedding; Duplicate creates an independent definition. Future reports can consume the same contract.
- [x] Distinguish fixed resource selections from scope-driven selections, and persistent settings from temporary hover, zoom, or navigation state. Opening a chart must not silently retarget it.
- [x] Record a focused disposition of current v1 chart families and required data sources, including capture fidelity and compatible editing controls. No exhaustive legacy inventory is required.

**Dependencies:** None; start here.

**Validation:** Review the contract against a utility trend, an analysis-result chart, an Energy Use treemap/Sankey, a portfolio, and a single-facility account. Add focused contract tests when executable contracts are introduced.

### Vis2 Persist saved visualizations and preserve them through backup and restore

**Issue:** [#2903](https://github.com/ORNL-AMO/VERIFI/issues/2903) · **Status:** Implemented locally; review/QA pending

Make saved visualization definitions durable and portable with the account data they reference.

The [Vis2 persistence specification](v1-visualization-persistence.md) records the accepted ownership, recovery, compatibility, transfer/isolation decisions and five-PR implementation stack. Older backups remain supported; the deliberately unchanged global backup data version means older VERIFI releases may omit saved visualizations when importing new backups.

**Scope**

- Add versioned saved-definition persistence through existing workspace command and publication boundaries, using GUID relationships rather than local numeric database keys.
- Integrate account backup/restore, supported account/facility copying, owner deletion, and reference remapping.
- Keep older backups importable and preserve unrelated stored records and existing v0 behavior.

**Acceptance criteria**

- [x] Create, update, duplicate, delete, and reopen definitions without persisting chart instances, executable callbacks, or derived result snapshots.
- [x] Restore and copy remap the definition's account/facility/source relationships correctly; duplication produces an independent identity.
- [x] Source rename, deletion, and unavailable calculation inputs produce a repairable saved definition rather than silent source replacement or fabricated results.
- [x] Schema upgrades and record-version upgrades are idempotent. Older backups without visualizations remain supported.
- [x] Failed saves retain recoverable user intent; committed-refresh failures do not repeat an already committed mutation.

**Dependencies:** Vis1 ([#2901](https://github.com/ORNL-AMO/VERIFI/issues/2901))

**Validation:** Fast mapping/version tests plus real Chromium IndexedDB save/reopen, rollback/recovery, migration, GUID remapping, deletion, and representative old/new backup round trips.

### Vis3 Build the Visualizations Dashboard and workbench

**Issue:** [#2904](https://github.com/ORNL-AMO/VERIFI/issues/2904) · **Status:** Framework and alignment implemented locally; review/QA pending

The [Vis3 workbench specification](v1-visualization-workbench.md) records the accepted card Dashboard, autosave/navigation/recovery decisions and six-slice delivery stack. This is framework-first delivery; concrete source and chart adapters remain in Vis4–Vis8.

Enable the Visualizations rail destination and provide the main place to create, organize, and edit saved visualizations.

**Scope**

- Build feature-owned production v1 Dashboard and editor routes, navigation, scope presentation, and guarded transitions.
- Support creation, opening, renaming, duplication, deletion, search/filter/sort, and useful Dashboard organization.
- Provide live preview, source/settings controls, visible save state, and recovery actions.

**Acceptance criteria**

- [ ] Users can find and reopen saved visualizations after navigation and application restart, with clear account/facility ownership.
- [ ] Creation and duplication lead to the correct saved workbench without losing filters or the originating browse context.
- [ ] Loading, empty, no matching results, unavailable source, calculation error, invalid configuration, disabled, saving, and retry states are actionable.
- [ ] Account/scope switches cannot publish stale previews or discard protected drafts.
- [ ] Keyboard navigation, visible focus, labels, responsive layouts, theme variants, and portal-based confirmations follow existing v1 patterns.

**Dependencies:** Vis1 ([#2901](https://github.com/ORNL-AMO/VERIFI/issues/2901)), Vis2 ([#2903](https://github.com/ORNL-AMO/VERIFI/issues/2903))

**Validation:** Focused Dashboard/editor/router and save-state tests, plus Chromium keyboard, guarded navigation, source loss, account switching, and reopen journeys. Select final builds with the repository validation planner.

### Vis4 Build utility cost emissions and charge data selection

**Issue:** [#2905](https://github.com/ORNL-AMO/VERIFI/issues/2905) · **Status:** Not started

Provide consistent exploration inputs for utility usage, costs, emissions, water, and detailed bill charges.

**Scope**

- Select portfolio/facility scope, meters and meter groups, sources, measures, filters, dates, comparisons, and aggregation.
- Expose applicable raw billing-period versus calendarized monthly/yearly views and clear units/site-source settings.
- Reuse canonical calendarization, emissions, charge, and overview calculation boundaries.

**Acceptance criteria**

- [ ] Users can build energy, water, other supported utility, cost, emissions, and charge series from their saved data.
- [ ] Selections retain source provenance and period meaning; overlapping meters/groups cannot silently double count totals.
- [ ] Missing, invalid, excluded, retired, and partial observations remain distinguishable from actual zero values.
- [ ] Unit conversions, charge semantics, fiscal/calendar periods, site/source treatment, and account/facility settings match existing authoritative calculations.
- [ ] Incompatible units, currencies, periods, or measure combinations produce a clear choice or unavailable state rather than misleading aggregation.

**Dependencies:** Vis1 ([#2901](https://github.com/ORNL-AMO/VERIFI/issues/2901)), Vis3 ([#2904](https://github.com/ORNL-AMO/VERIFI/issues/2904))

**Validation:** Table-driven projection tests for units, actual zero/missing/partial data, overlapping membership, raw versus calendarized dates, charge types, fiscal years, and representative v0/v1 reference totals. Use browser tests for native Worker lifecycle changes.

### Vis5 Add predictor weather Energy Use and analysis result sources

**Issue:** [#2906](https://github.com/ORNL-AMO/VERIFI/issues/2906) · **Status:** Not started

Extend exploration beyond utility measures to the other data families already held or calculated by VERIFI.

**Scope**

- Add saved predictor and weather histories, Energy Use equipment/group/facility projections, and existing facility/account analysis results.
- Retain resource-specific source settings, period identity, selected analysis/model identity, and provenance.
- Demand calculations only for active previews/embeddings and use existing calculation coordinators where applicable.

**Acceptance criteria**

- [ ] Users can select supported sources from each included data family and combine only compatible measures and periods.
- [ ] Saved weather exploration does not trigger remote weather retrieval, and viewing Energy Use results does not create or rewrite annual history.
- [ ] Annual equipment estimates, carried-forward values, measured utility data, predictor values, modeled results, and savings remain explicitly distinguishable.
- [ ] Existing analysis freshness, invalidity, cancellation, and error rules remain authoritative; stale or unavailable results cannot appear current.
- [ ] Portfolio and single-facility projections preserve actual fiscal periods and reject incompatible rollups without silently resampling annual values into monthly observations.

**Dependencies:** Vis1 ([#2901](https://github.com/ORNL-AMO/VERIFI/issues/2901)), Vis3 ([#2904](https://github.com/ORNL-AMO/VERIFI/issues/2904)), Vis4 ([#2905](https://github.com/ORNL-AMO/VERIFI/issues/2905))

**Validation:** Focused source/projection tests covering each data family, mixed units/periods, saved weather histories, annual provenance, analysis freshness, cancellation, account switching, and unchanged stored records. Add Chromium coverage for changed Worker contracts/lifecycle.

### Vis6 Build time series and comparison chart editing

**Issue:** [#2907](https://github.com/ORNL-AMO/VERIFI/issues/2907) · **Status:** Not started

Provide flexible trend and comparison editing using ECharts with controls appropriate to each selected measure.

**Scope**

- Support line, bar, area, stacked, and compatible combination presentations, including appropriate axis assignment.
- Provide series visibility, labels, colors, ordering, legends, comparisons, zoom, and reset controls.
- Integrate the existing ECharts rendering boundary and accessible source-data presentation.

**Acceptance criteria**

- [ ] Users can switch among compatible chart types and reopen the saved configuration without losing data intent or appearance.
- [ ] Fixed/rolling ranges and comparison periods remain understandable and keep chart values aligned to the requested dates.
- [ ] Stacking, percentage views, and multiple axes preserve unit and aggregation meaning; incompatible choices are explained.
- [ ] True gaps remain gaps, alignment padding is not a missing observation, and chart controls do not alter source values or trigger unnecessary calculation demand.
- [ ] Dense portfolios, long labels, narrow layouts, themes, keyboard controls, and source-data alternatives remain usable.

**Dependencies:** Vis3 ([#2904](https://github.com/ORNL-AMO/VERIFI/issues/2904)), Vis4 ([#2905](https://github.com/ORNL-AMO/VERIFI/issues/2905))

**Validation:** Pure option/projection tests plus Chromium rendering, zoom/reset, series visibility, save/reopen, gaps, long labels, theme, and responsive interaction checks.

### Vis7 Build correlation and heatmap exploration

**Issue:** [#2908](https://github.com/ORNL-AMO/VERIFI/issues/2908) · **Status:** Not started

Let users investigate relationships and patterns with scatter plots, correlation matrices, and time-based heatmaps.

**Scope**

- Configure X/Y sources, grouping, periods, compatible observations, visual encodings, and heatmap dimensions.
- Expose applicable existing fit/statistical results through deterministic VERIFI calculations.
- Provide drill-down from a matrix cell or point to its underlying observations and source context.

**Acceptance criteria**

- [ ] Users can save and reopen scatter/correlation and heatmap definitions with their selected sources and settings.
- [ ] Observation alignment, excluded/missing pairs, sample counts, and insufficient or constant data are explicit.
- [ ] Existing correlation/fit semantics remain correct, including the distinction between signed correlation and R-squared; rendering does not invent new statistical formulas.
- [ ] Heatmap scales, missing cells, legends, and selected ranges remain clear in every theme.
- [ ] Chart interactions have keyboard-accessible equivalents and accessible underlying values.

**Dependencies:** Vis5 ([#2906](https://github.com/ORNL-AMO/VERIFI/issues/2906)), Vis6 ([#2907](https://github.com/ORNL-AMO/VERIFI/issues/2907))

**Validation:** Deterministic statistical/alignment cases for positive/negative/constant/insufficient and missing data; Chromium scatter/heatmap rendering, interaction, save/reopen, themes, and accessible source-data checks.

### Vis8 Build composition hierarchy and flow visualizations

**Issue:** [#2909](https://github.com/ORNL-AMO/VERIFI/issues/2909) · **Status:** Not started

Provide reusable breakdown, hierarchy, and flow charts, including the existing Energy Use treemap and Sankey capabilities.

**Scope**

- Support appropriate bar/donut breakdowns, treemaps, and Sankey flows through chart-specific capability adapters.
- Reuse feature-owned Energy Use calculations and existing group/facility projections.
- Preserve hierarchy navigation, drill-down context, aggregation meaning, and accessible source details.

**Acceptance criteria**

- [ ] Users can save and reopen breakdown, hierarchy, and flow configurations with supported source/settings controls.
- [ ] Energy Use group/facility flows and equipment hierarchies retain saved-value provenance, actual fiscal periods, source occurrence, and correct denominators.
- [ ] Missing, all-zero, partial, negative, and over-allocated data have explicit behavior; flows do not fabricate negative links or hide unsupported contributions.
- [ ] Portfolio breakdowns do not merge incompatible periods or units, and chart conversion is offered only when the data meaning is compatible.
- [ ] Long names, small positive shares, keyboard hierarchy navigation, theme contrast, and zero/unavailable source details remain usable.

**Dependencies:** Vis5 ([#2906](https://github.com/ORNL-AMO/VERIFI/issues/2906)), Vis6 ([#2907](https://github.com/ORNL-AMO/VERIFI/issues/2907))

**Validation:** Projection and option tests for totals/percentages, periods, zero/unavailable values, and energy balance; Chromium treemap/Sankey/donut rendering, drill-down, save/reopen, keyboard, and themes.

### Vis9 Add Visualize capture actions throughout v1

**Issue:** [#2910](https://github.com/ORNL-AMO/VERIFI/issues/2910) · **Status:** Not started

Turn charts across v1 into entry points for saved exploration, similar to opening a chart in an external plotting workbench.

**Scope**

- Add the shared visualization icon action to charts in Data, Energy Uses, Analysis, and Reports through feature-owned capture adapters.
- Capture current source identity, scope, date rules/range, selected series, filters, units, calculation context, and supported display settings.
- Create a saved visualization with a useful default name and open its workbench while retaining a safe route back.

**Acceptance criteria**

- [ ] Clicking Visualize creates a durable saved definition and opens an equivalent chart for further exploration.
- [ ] Capturing a specialized chart preserves its meaning and selected analysis/flow/hierarchy context rather than forcing a generic time series.
- [ ] Failed or repeated in-flight capture cannot create accidental duplicate records; no successful handoff is shown before saving completes.
- [ ] Capture never changes the source chart, source records, analysis configuration, report setup, or existing export behavior.
- [ ] Every current v1 chart family has verified capture support or an explicit documented disposition. Unavailable capture is explained without silently dropping settings.

**Dependencies:** Vis2 ([#2903](https://github.com/ORNL-AMO/VERIFI/issues/2903)), Vis3 ([#2904](https://github.com/ORNL-AMO/VERIFI/issues/2904)), Vis4 ([#2905](https://github.com/ORNL-AMO/VERIFI/issues/2905)), Vis5 ([#2906](https://github.com/ORNL-AMO/VERIFI/issues/2906)), Vis6 ([#2907](https://github.com/ORNL-AMO/VERIFI/issues/2907)), Vis7 ([#2908](https://github.com/ORNL-AMO/VERIFI/issues/2908)), Vis8 ([#2909](https://github.com/ORNL-AMO/VERIFI/issues/2909))

**Validation:** Adapter tests for representative Data, Energy Use, Analysis, and Reports charts; Chromium capture/save/reopen, failure/retry, repeated activation, return navigation, and fidelity checks for each chart family.

### Vis10 Complete visualization integration and release acceptance

**Issue:** [#2911](https://github.com/ORNL-AMO/VERIFI/issues/2911) · **Status:** Not started

Verify the full saved visualization experience across data families, chart families, scopes, persistence, and v1 capture entry points.

**Scope**

- Complete the current v1 chart-capture and source-coverage matrix begun in Vis1, recording intentional limitations.
- Exercise complete journeys with representative portfolio, single-facility, incomplete, and dense datasets.
- Verify cross-feature consistency, accessibility, performance, and browser/Electron behavior.

**Acceptance criteria**

- [ ] Create/capture, save, reopen, edit, duplicate, delete, and live refresh work across the supported data and chart families.
- [ ] Source rename/removal, analysis invalidation, account changes, rolling dates, and failed calculations do not publish misleading or stale values.
- [ ] Definitions survive supported backup/restore/copy workflows and older backups still import correctly.
- [ ] Charts expose source scope, dates, units, provenance, accessible values, and actionable quality/coverage states consistently.
- [ ] Active work is bounded for large datasets; keyboard, focus, all themes, printing/image output where supported, responsive layouts, and practical Electron windows pass focused acceptance.
- [ ] Each implementation issue includes its own focused validation; this issue closes integration gaps rather than deferring testing.

**Dependencies:** Vis1 ([#2901](https://github.com/ORNL-AMO/VERIFI/issues/2901)), Vis2 ([#2903](https://github.com/ORNL-AMO/VERIFI/issues/2903)), Vis3 ([#2904](https://github.com/ORNL-AMO/VERIFI/issues/2904)), Vis4 ([#2905](https://github.com/ORNL-AMO/VERIFI/issues/2905)), Vis5 ([#2906](https://github.com/ORNL-AMO/VERIFI/issues/2906)), Vis6 ([#2907](https://github.com/ORNL-AMO/VERIFI/issues/2907)), Vis7 ([#2908](https://github.com/ORNL-AMO/VERIFI/issues/2908)), Vis8 ([#2909](https://github.com/ORNL-AMO/VERIFI/issues/2909)), Vis9 ([#2910](https://github.com/ORNL-AMO/VERIFI/issues/2910))

**Validation:** Representative end-to-end Chromium journeys and comparison of displayed values with authoritative calculation outputs; focused desktop acceptance and applicable print/image inspection. Run the validation planner and the runtime-appropriate final matrix.

## Home issues

### Home1 Define Home templates and map existing v0 content

**Issue:** [#2912](https://github.com/ORNL-AMO/VERIFI/issues/2912) · **Status:** Not started

Define useful default dashboards and map current v0 Home and Data Overview capabilities to the new Home experience.

**Scope**

- Map account/facility Home summaries, status, energy/water goals, analysis performance/savings, and next actions.
- Map Energy, Costs, Emissions, and Water overviews, including applicable maps, tables, breakdowns, trends, and comparisons.
- Specify template composition, account/facility/single-facility presentation, dashboard navigation, and context/filter behavior.

**Acceptance criteria**

- [ ] Each existing Home/Overview content area is retained, combined, or given a documented intentional disposition.
- [ ] Define Overview, Goals & Performance, Energy Use, Costs, Emissions, Water, and Blank templates with audience, widget composition, and required data.
- [ ] Personas guide useful starting content without imposing a role-selection gate or restricting customization.
- [ ] Templates create independent editable dashboard instances; editing an instance never changes the shipped template.
- [ ] Dashboard widgets link to saved visualization definitions; define filter precedence, supported context overrides, missing-source behavior, and safe return navigation without modifying linked definitions implicitly.

**Dependencies:** Vis1 ([#2901](https://github.com/ORNL-AMO/VERIFI/issues/2901))

**Validation:** Review template compositions against representative v0 account/facility Home and the four Overview areas, with portfolio and single-facility scenarios, no analysis, missing costs, incomplete data, and keyboard/responsive interaction plans.

### Home2 Persist dashboards and template instances

**Issue:** [#2913](https://github.com/ORNL-AMO/VERIFI/issues/2913) · **Status:** Not started

Save custom Home dashboards, their widget settings, and references to shared saved visualizations.

**Scope**

- Persist account ownership, applicable facility scope, dashboard name, ordered layout, widget settings, and default dashboard selection.
- Store saved-visualization references rather than embedded independent copies.
- Integrate schema/version handling, supported copying, owner deletion, backup/restore, and reference remapping.

**Acceptance criteria**

- [ ] Dashboards and template instances survive restart and retain widget order, size, settings, and selected default.
- [ ] Duplicating a dashboard creates an independent dashboard layout while retaining linked visualization references; duplicating a visualization remains an explicit separate action.
- [ ] Deleting a dashboard never deletes a referenced visualization. Deleting a referenced visualization reviews or explains affected widgets and leaves a recoverable state.
- [ ] Account/facility copy and restore remap relationships correctly; older backups without dashboards remain supported.
- [ ] Failed writes and committed-refresh recovery preserve user intent without duplicate mutations; invalid defaults recover predictably.

**Dependencies:** Home1 ([#2912](https://github.com/ORNL-AMO/VERIFI/issues/2912)), Vis2 ([#2903](https://github.com/ORNL-AMO/VERIFI/issues/2903))

**Validation:** Fast mapping/default/reference tests plus real Chromium IndexedDB save/reopen, rollback/recovery, copy/delete, old/new backup round trips, and GUID remapping.

### Home3 Build customizable Home navigation and layout editing

**Issue:** [#2914](https://github.com/ORNL-AMO/VERIFI/issues/2914) · **Status:** Not started

Let users manage several Home dashboards and customize a responsive layout of visualization and summary widgets.

**Scope**

- Create, duplicate, rename, delete, switch, and choose a default dashboard using the existing Home rail and section navigation.
- Add/remove/reorder/resize widgets with keyboard alternatives to pointer interactions.
- Provide template selection, reset behavior, clear save feedback, and protected drafts/recovery where applicable.

**Acceptance criteria**

- [ ] Dashboard navigation works at account, facility, and single-facility scopes without redundant screens or silent context changes.
- [ ] Users can customize their instance and return to it after reload; template reset explains what layout/settings will be replaced.
- [ ] Layout order remains the reading/focus order, and narrow layouts preserve every widget and its useful controls.
- [ ] Removing widgets or dashboards does not delete underlying data or saved visualizations.
- [ ] Empty, invalid, loading, disabled, saving, failed-save, missing-dashboard, and account-switch states remain actionable.

**Dependencies:** Home1 ([#2912](https://github.com/ORNL-AMO/VERIFI/issues/2912)), Home2 ([#2913](https://github.com/ORNL-AMO/VERIFI/issues/2913))

**Validation:** Focused dashboard action/layout/router tests plus Chromium keyboard reorder/resize alternatives, focus after removal, responsive layout, save/reopen, guarded transitions, reset, and account switching.

### Home4 Embed linked saved visualizations in Home

**Issue:** [#2915](https://github.com/ORNL-AMO/VERIFI/issues/2915) · **Status:** Not started

Reuse saved visualizations as live dashboard widgets and let users return to the full Visualizations workbench.

**Scope**

- Choose existing saved visualizations from Dashboard and render them with the shared chart/data pipeline.
- Apply explicit dashboard context/filter overrides according to Home1 without mutating the saved definition.
- Provide open-in-Visualizations, replace/remove, source context, and missing/error/retry behavior.

**Acceptance criteria**

- [ ] Editing a saved visualization updates every dashboard widget that references it; duplicating it creates an independent definition that can be selected explicitly.
- [ ] Widget titles, source scope, dates, units, and override indicators make the displayed context clear.
- [ ] Dashboard filters affect only compatible widgets; fixed sources and incompatible scopes never silently retarget or aggregate.
- [ ] Source loss, visualization deletion, invalid analysis, failed calculations, and partial data show actionable states without stale charts.
- [ ] Visible widgets share reusable calculation demand where possible; account/dashboard changes cancel or ignore obsolete work.

**Dependencies:** Home2 ([#2913](https://github.com/ORNL-AMO/VERIFI/issues/2913)), Home3 ([#2914](https://github.com/ORNL-AMO/VERIFI/issues/2914)), Vis9 ([#2910](https://github.com/ORNL-AMO/VERIFI/issues/2910))

**Validation:** Link/reference and override-precedence tests plus Chromium edit-one/update-multiple, independent duplicate, scope/date filters, source loss, calculation cancellation, resize, and accessible open/return journeys.

### Home5 Build Home summaries goals and readiness widgets

**Issue:** [#2916](https://github.com/ORNL-AMO/VERIFI/issues/2916) · **Status:** Not started

Supply useful non-chart Home content alongside saved visualizations using existing workspace findings and calculations.

**Scope**

- Provide key totals, energy/water goal progress, baseline context, analysis performance/savings, and data coverage summaries.
- Provide actionable readiness/status and next-step widgets linked to the existing support-panel and owning workflows.
- Make widgets configurable where appropriate without introducing a new goal-definition or calculation system.

**Acceptance criteria**

- [ ] Account/facility/single-facility widgets reuse existing goal settings, active analysis choices, calculations, status findings, and ownership rules.
- [ ] Raw usage changes remain distinct from normalized analysis improvement or savings, with baseline, period, and calculation freshness visible.
- [ ] Unavailable goals/analyses and incomplete coverage show setup/recovery actions rather than fabricated zero progress or success.
- [ ] Widgets navigate to the relevant owning workflow and complement the existing support panel without duplicating its evaluation logic.
- [ ] Loading, empty, error, theme, keyboard, long-label, responsive, and printing states are covered.

**Dependencies:** Home1 ([#2912](https://github.com/ORNL-AMO/VERIFI/issues/2912)), Home3 ([#2914](https://github.com/ORNL-AMO/VERIFI/issues/2914)), Vis5 ([#2906](https://github.com/ORNL-AMO/VERIFI/issues/2906))

**Validation:** Focused projection/widget tests against existing totals, goal settings, active analyses, freshness, incomplete/zero data, and status destinations; Chromium actionable links, focus, themes, layout, and print checks.

### Home6 Deliver default Home templates and verify parity

**Issue:** [#2917](https://github.com/ORNL-AMO/VERIFI/issues/2917) · **Status:** Not started

Ship the agreed Home template collection and verify complete linked-dashboard journeys against the retained v0 content baseline.

**Scope**

- Deliver Overview, Goals & Performance, Energy Use, Costs, Emissions, Water, and Blank templates.
- Instantiate and customize templates for account, facility, and single-facility workspaces, with appropriate portfolio content.
- Complete Home/Overview content dispositions and cross-feature acceptance.

**Acceptance criteria**

- [ ] Templates offer useful starting content from existing data without requiring users to construct every visualization manually or select a persona.
- [ ] Template-created charts use the saved visualization Dashboard and linked semantics; template instantiation avoids accidental orphan or duplicate records.
- [ ] Users can choose a default, customize widgets, reopen dashboards, edit a linked chart, and recover missing inputs.
- [ ] Retained v0 Home/Overview values match authoritative calculations, and every deliberate content difference is documented.
- [ ] Backup/restore, source deletion, filters, dense portfolios, incomplete data, keyboard/focus, themes, responsive layouts, printing, and practical Electron windows pass acceptance.
- [ ] Per-issue validation remains required; this issue closes integration and content-parity gaps.

**Dependencies:** Home1 ([#2912](https://github.com/ORNL-AMO/VERIFI/issues/2912)), Home2 ([#2913](https://github.com/ORNL-AMO/VERIFI/issues/2913)), Home3 ([#2914](https://github.com/ORNL-AMO/VERIFI/issues/2914)), Home4 ([#2915](https://github.com/ORNL-AMO/VERIFI/issues/2915)), Home5 ([#2916](https://github.com/ORNL-AMO/VERIFI/issues/2916)), Vis10 ([#2911](https://github.com/ORNL-AMO/VERIFI/issues/2911))

**Validation:** Representative end-to-end template/customization/reuse/backup journeys and v0 content/value comparisons; inspect layouts and applicable print output across scopes. Run the validation planner and runtime-appropriate final checks.

## Shared implementation and validation rules

- Follow the [migration guide](unified-ux-migration.md), [current-state notes guidance](unified-ux-current-state.md), [workspace data workflow](data-access-and-workspace.md), and [architecture](../ARCHITECTURE.md). Keep production code in feature folders under v1 and preserve neutral data/domain/platform boundaries; do not import v0 UI.
- Use typed reactive forms, existing scope/navigation and draft protection, GUID relationships, atomic commands where needed, and shell-portal confirmations. Reuse chart rendering and feature-owned calculation projections.
- Show scope, period, units, provenance, gaps, partial coverage, invalidity, and calculation freshness. Do not substitute missing data with zero or display stale results as current.
- Cover loading, empty, invalid, disabled, saving, success, failure/retry, and missing-source states. Provide accessible values, keyboard controls, visible focus, themes, responsive layouts, and practical Electron-window behavior.
- Protect changed behavior at the lowest valuable test tier. Use Chromium for real IndexedDB, Workers, rendering, and browser-native behavior; compare authoritative calculation values where projections change.
- Run `npm run validate:agent -- --mode plan` before implementation handoff and follow the selected runtime matrix. Use [testing guidance](testing.md) for the documentation-only exception and the required implementation gates. Electron build/manual checks are selected for Electron boundaries or explicit desktop release acceptance rather than every routine web slice.
- Vis10 and Home6 verify integrated journeys; they do not defer the focused validation owed by each implementation issue.

## Progress maintenance

The tables above track local implementation progress. Keep each status aligned with the GitHub issue and record evidence below when a slice changes state. Suggested states are Not started, In progress, Blocked, In review, and Complete. Closing an issue requires its acceptance criteria and relevant validation, not only a rendered screen.

| Date | Issue or slice | Result and validation evidence |
| --- | --- | --- |
| 2026-11-10 | Planning | Accepted linked visualization semantics and visualization-first delivery. Created and attached Vis1–Vis10 and Home1–Home6 to epic #2564; all begin Not started. No application behavior changed. |
| 2026-11-10 | Planning validation | Verified all 16 published issue bodies, dependencies, milestone/label, and native parent links; preserved #2635. Local links, issue mappings, and dependency graph passed checks. `npm run validate:agent -- --mode plan` selected documentation checks only; `git diff --check` passed. |
| 2026-11-11 | Vis1 workflow slice | Added the foundation specification, accepted workflow/state decisions, focused current-v1 chart/source dispositions, acceptance crosswalk and three-PR handoff. Local link targets verified. This slice changes documentation only; executable contract validation is recorded with the following slices. |
| 2026-11-11 | Vis1 contracts | Added strict serializable definitions, incomplete/unsupported validation, provider/capability/capture/embedding contracts, and fake-provider behavior examples. Actual UI, persistence and source adapters remain downstream. Local stack targets `unified-ux`; publication and QA remain pending. |
| 2026-11-11 | Vis3 framework | Implemented the six-slice library/workbench stack, guarded autosave/navigation, reviewed repair/copy recovery, and cancellable preview registrations. Full fast suite: 4,297 tests; Chromium: 533 tests. Concrete source/chart adapters and real-data preview acceptance remain downstream; issue #2904 is not closed by this framework delivery. |
| 2026-11-11 | Vis3 alignment | Added Dashboard/Add naming, stepped chart-first creation with multiple source families, explicit incomplete Scatter bindings, retained recovery intent and the downstream starter recipe plan. Full validation: 4,368 fast tests, 544 Chromium tests, app/spec type checks and production web/Electron-target builds passed; existing build warnings remain. Wide/narrow theme and keyboard checks passed. Real-data adapters, recipes, human review and QA remain downstream. |
