# V1 Visualizations and Home plan

Active plan for [epic #2564](https://github.com/ORNL-AMO/VERIFI/issues/2564): establish saved Visualizations, expand exploration/capture, then deliver customizable Home dashboards. The journey is create/capture → save/reopen → reuse on Home → later reuse in a custom report. GitHub issues own detailed scope and acceptance; this document owns shared product decisions and dependency order.

## Accepted product decisions

- Saved visualizations belong to an account with explicit portfolio/facility ownership and fixed or rolling periods. Keep source identity explicit so reopening cannot silently retarget data.
- Save versioned VERIFI intent: sources, calculations, filters, aggregation, units/treatment, series, dates, and appearance. Runtime providers produce current values and ECharts options; saved definitions contain no instances, executable callbacks, or frozen results.
- Home chart widgets reference saved visualizations. Editing a definition updates its linked appearances; Duplicate creates independent intent. Dashboard layout and widget overrides belong to the dashboard instance and never silently edit the linked definition.
- Recipes create independent saved charts with explicit resource binding. Templates create independently editable dashboards; editing an instance never changes the shipped template. Personas suggest useful starting content without a mandatory role choice or restricted capabilities. Home will initialize editable starter dashboards once per owner, without creating source data; see the [Home specification](v1-home-dashboard-spec.md).
- Use existing VERIFI calculations, fiscal periods, units, provenance, quality rules, and ECharts rendering. Expose only compatible source/chart/settings combinations; distinguish raw utility changes, modeled improvement/savings, equipment estimates, and predictor observations.
- Custom report authoring is deferred. Keep reusable definitions/rendering extensible for later report reuse without implementing it here.

## Current implementation and owning references

Visualizations is enabled. Saved JSON contracts, storage/transfer/recovery, Dashboard/workbench, utility projections/editing, line/bar/area editing with compatible utility and Energy Use stacks, percentages and series ordering, Energy usage trend/Utility cost trend recipes, and supported inventory capture exist. Source setup now uses one resource/measure section per category, separate trace controls and chart-wide display units; Add can construct the monthly energy-plus-cost chart directly. Multiple compatible Analysis targets/measures share one category section. Scatter, pairwise correlation/matrices, and monthly/yearly heatmaps are implemented under the [exploration contract](v1-exploration-visualizations.md). Bar/donut breakdowns, Treemap/Sunburst hierarchies, and Energy Use allocation/balance Sankey flows are implemented under the [composition contract](v1-composition-visualizations.md). Other source/chart combinations retain setup/unavailable behavior. Current Home provides status/count summaries; customizable linked dashboards remain future work. Read the relevant current reference rather than every document:

| Change | Current owner |
| --- | --- |
| Saved intent, provider/capability/capture/embedding contracts | [Foundation](v1-visualization-foundation.md) and [`domain/visualizations`](../src/app/domain/visualizations/) |
| Stores, commands, versions, reference transfer, backup/recovery | [Persistence](v1-visualization-persistence.md) |
| Dashboard, creation, autosave, navigation, repair, preview | [Workbench](v1-visualization-workbench.md) |
| Composition/hierarchy/flow settings, shares and accessible source details | [Composition visualizations](v1-composition-visualizations.md) |
| Actual utility selections, periods, quality, charges, recipes/capture boundaries | [Utility visualizations](v1-utility-visualizations.md) |
| Planned Home content, templates, and lifecycle | [Home specification](v1-home-dashboard-spec.md) and [content map](v1-home-content-map.md); delivery in the [Home phase plan](v1-home-dashboard-plan.md) |

The current definition version comes from source; do not maintain a competing schema here. Existing v0 data, calculations, report settings, and supported formats remain protected. Home storage/backup additions are explicit Home2 work; no incidental weather retrieval, formula, report-output, or IPC changes.

## Delivery dependencies

These are implementation/acceptance relationships, not claims about remote issue closure. Initial utility slices do not complete broader chart or capture issues.

| Slice | Issue | Delivery and prerequisites |
| --- | --- | --- |
| Vis1: contracts | [#2901](https://github.com/ORNL-AMO/VERIFI/issues/2901) | Implemented foundation; no prerequisite. |
| Vis2: persistence | [#2903](https://github.com/ORNL-AMO/VERIFI/issues/2903) | Implemented after Vis1; durable visualization ownership, transfers and backup. |
| Vis3: Dashboard/workbench | [#2904](https://github.com/ORNL-AMO/VERIFI/issues/2904) | Implemented framework after Vis1/Vis2; broader real-data acceptance remains issue-owned. |
| Vis4: utility sources | [#2905](https://github.com/ORNL-AMO/VERIFI/issues/2905) | Implemented initial utility journey after Vis1/Vis3; production-shell review/QA remains pending. |
| Vis5: other sources | [#2906](https://github.com/ORNL-AMO/VERIFI/issues/2906) | Predictor/weather, Energy Uses, and facility/account result journeys are complete under [focused source acceptance](v1-visualization-sources-plan.md); standalone model inspection is outside scope. Broader issue/release acceptance and VIS4 production-shell QA remain separate. |
| Vis6: time series/comparison | [#2907](https://github.com/ORNL-AMO/VERIFI/issues/2907) | Implemented time-series breadth across current sources: area/combinations, compatible stacks/percentages, ordering, stable preview/zoom and original-value tooltips. Existing source-specific comparison boundaries remain; broader production-shell/release acceptance stays separate. |
| Vis7: correlation/heatmap | [#2908](https://github.com/ORNL-AMO/VERIFI/issues/2908) | Implemented after Vis5/Vis6: saved pairwise figures/matrices and heatmaps, with exact observation alignment, original-value tooltips and shared header data checks. Production-shell/release QA remains separate. |
| Vis8: composition/flow | [#2909](https://github.com/ORNL-AMO/VERIFI/issues/2909) | Implemented after Vis5/Vis6: utility and Energy Use breakdowns, shared Treemap/Sunburst hierarchies, allocation and metered-balance Sankey flows, named shares and original source details. Production-shell/release QA remains separate. |
| Vis9: capture coverage | [#2910](https://github.com/ORNL-AMO/VERIFI/issues/2910) | Utility inventory, both meter Monthly Chart captures and Yearly Data capture exist, including fiscal Monthly patterns and Full year/YTD totals. Yearly utility charts support shared-cutoff YTD creation and editing for meters, groups and sources. Meter captures use naming confirmation, save/reopen and preserved display intent; unchanged captured charts expose durable source links. Monthly patterns also supports meter/group/source and single-predictor creation with linked year editing. Specialized measures and other chart locations remain pending after Vis2–Vis8. |
| Vis10: integrated acceptance | [#2911](https://github.com/ORNL-AMO/VERIFI/issues/2911) | After Vis1–Vis9; source/chart coverage and integrated journeys. |
| Home1: content/templates | [#2912](https://github.com/ORNL-AMO/VERIFI/issues/2912) | Specification delivered in the [Home specification](v1-home-dashboard-spec.md) and [source inventory](v1-home-content-map.md); human review/issue acceptance remains separate. Runtime implementation follows in Home2–Home6. |
| Home2: storage | [#2913](https://github.com/ORNL-AMO/VERIFI/issues/2913) | After Home1/Vis2; layout/default/widget references, copy/delete/backup/remapping and recovery. |
| Home3: navigation/layout | [#2914](https://github.com/ORNL-AMO/VERIFI/issues/2914) | Navigation/layout editing implemented in the [Home workspace](v1-home-workspace.md); complete recipes and numerical renderers remain later phases. Human acceptance remains separate. |
| Home4: linked embedding | [#2915](https://github.com/ORNL-AMO/VERIFI/issues/2915) | After Home2/Home3/Vis9; explicit compatible overrides, open/return, loss/retry and canceled obsolete demand. |
| Home5: summary widgets | [#2916](https://github.com/ORNL-AMO/VERIFI/issues/2916) | After Home1/Home3/Vis5; existing goals, analysis/readiness and setup actions. |
| Home6: templates/parity | [#2917](https://github.com/ORNL-AMO/VERIFI/issues/2917) | After Home1–Home5/Vis10; template instantiation and retained v0 content acceptance. |

First complete the working saved utility journey, then remaining sources/charts/capture, then linked Home persistence/layout/rendering and default content. Stable-contract slices may overlap; visualization completion is the first delivery milestone. Existing early Home issue [#2635](https://github.com/ORNL-AMO/VERIFI/issues/2635) remains historical foundation, not a substitute for Home1–Home6.

## Recipes and Home content

Energy usage trend is implemented with explicit utility-source, meter-group, or exact-meter binding; Utility cost trend binds exact meters. Remaining utility/source breakdown recipes depend on applicable Vis4/Vis8 adapters; usage versus production/weather requires Vis5/Vis6/Vis7; analysis comparison requires applicable Vis5/Vis6/Vis7 adapters. Recipes must retain scope, dates, units/provenance, save/reopen behavior, and useful unavailable explanations.

The [Home specification](v1-home-dashboard-spec.md) owns agreed compositions and behavior; the [Home phase plan](v1-home-dashboard-plan.md) tracks delivery. The issue's Overview and Goals & Performance templates use the display names Home and Goal Progress. Together with Energy Use, Costs, Emissions, and conditional Water they form the editable starter set; Blank remains available for creation. Default performance widgets explicitly follow Active for reporting, while named-analysis charts remain pinned. These Home capabilities are planned, not implemented. Template names introduce no new goal types or calculation methods.

The [source inventory](v1-home-content-map.md) dispositions account/facility Home and all four Overview areas, including maps, selected-period comparisons, annual histories, emissions categories and water subtypes. Home6 verifies those retained capabilities. Overview reports have not been migrated and follow the new overview experience separately; Home does not advertise an unavailable report-creation workflow.

## Outstanding acceptance

- Production-shell utility manual verification, human review, and QA remain pending; focused development checks do not close issues or certify broader Vis3/Vis4/Vis9 or release acceptance.
- Other sources must retain annual estimate/carry-forward versus measured/model meaning, actual fiscal periods, source/model freshness, cancellation, and no viewing-time mutation or weather retrieval. Incompatible combinations explain unavailability rather than resampling or fabricating values.
- Home must preserve account/facility/single-facility ownership, explicit compatible filter precedence, linked-definition identity, independent layout duplication, recoverable widget/source deletion, safe defaults, and old/new backup transfer. Deleting layouts/widgets never deletes their underlying source definitions/data.
- Summary widgets use existing goal settings, active analyses, calculations and findings; missing/incomplete data is not zero progress or success. Layout order remains reading/focus order and pointer actions have keyboard alternatives.
- Vis10/Home6 own combined restore/delete/filter/dense-portfolio/content-parity journeys, including themes, responsive layouts, printing and practical desktop windows. Each issue still owes its own focused checks under [testing policy](testing.md).
