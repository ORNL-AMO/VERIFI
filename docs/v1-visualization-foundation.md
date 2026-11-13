# V1 visualization contracts

This reference owns saved visualization meaning, runtime contracts, and planned embedding semantics. Use [persistence](v1-visualization-persistence.md) for durable ownership and transfers, [workbench](v1-visualization-workbench.md) for editing/navigation, and [utility visualizations](v1-utility-visualizations.md) for implemented providers, line/bar editing, recipes, and inventory capture. Remaining source families, chart breadth, capture locations, and Home implementation are tracked in the [phase plan](v1-visualizations-and-home-plan.md).

## Ownership and saved intent

A visualization belongs to one account with portfolio or single-facility scope. Dashboard lists the account's definitions; facility entry filters the list without retargeting saved sources. A single-facility account must not initialize hidden analysis pairs merely to use visualizations.

Account and scope are immutable for a saved identity. Duplicate allocates independent identity. Cross-scope copying requires an explicit destination and review of incompatible references; names never map sources. Existing linked consumers retain the original identity. Backup/account/facility transfer rules belong to the persistence owner.

- **Fixed selection** retains exact resource GUIDs. Renaming changes labels, not identity. Missing required resources block rendering and require explicit repair, rather than silent replacement or exclusion from a total.
- **Rule-based selection** intentionally follows current matching membership. Missing facility/group anchors break the reference; they never broaden a rule. Fixed utility groups retain group identity while following current members, as described in the utility contract.
- **Capture** retains selection mode, grouping, period, units/treatment, visible series, and reproducible appearance. Matching inventory results differ from checked rows and the current page. A feature adapter owns fidelity; a renderer cannot recover authoritative sources from ECharts options.

Saved intent includes sources, measures, filters, aggregation, units, site/source treatment, selected series, period/comparison rules, appearance, and chart-specific settings. Applicable settings explicitly follow the owner or pin a value; capture preserves that binding. Definition-local source/series IDs are not resource GUIDs. Runtime results, ECharts options, callbacks, route destinations, hover, zoom, and temporarily drilled hierarchy nodes are not persisted. Configured hierarchy is intent; drill position is session state.

Definition validity, configuration completeness/compatibility, and runtime availability are separate. Coherent incomplete or unavailable intent is saveable; malformed field values remain local. Catalog choices establish setup intent, not rendering support. Concrete adapters must approve the source/chart/settings combination, alignment, units, and axes before rendering. Compatible type changes retain shared settings and visibly initialize newly applicable settings.

## Periods and provenance

Utility setup uses all saved history unless an explicit rule replaces it. Fixed dates retain exact civil dates; rolling periods declare calendar or latest-data anchoring and show resolved intervals. Latest-data means the newest eligible observation across selected sources, with lagging sources retaining gaps and partial notices. Calendar windows do not establish that saved observations exist.

Energy Use-only setup declares latest saved fiscal year, optionally pinned to one fiscal year. Mixed-family setup starts with all saved history, subject to adapter review. Annual values with the same label cannot roll up across incompatible fiscal intervals. Never invent monthly observations from annual estimates.

Comparisons use previous periods, calendar/fiscal years, or explicit dates only when supported. Alignment preserves original dates and actual period meaning. Visualization dates do not edit analysis baselines. Result sources follow the named analysis's current saved calculation; model inspection pins durable model identity. Missing pinned models require repair, and unsaved candidates cannot become durable sources.

Providers preserve measured values, predictor observations, saved weather, estimates, carried-forward equipment values, modeled values, and savings as distinct provenance. True zero, missing observations, alignment padding, exclusions, retirement, duplicates, and partial coverage are not interchangeable. Viewing saved weather does not retrieve weather; viewing Energy Uses does not create annual history.

| State | Required behavior |
| --- | --- |
| Loading/calculating | Show scoped progress; only active previews/embeddings request work. Old results cannot appear current. |
| Setup required or incompatible | Preserve coherent intent, identify missing configuration or unsupported meaning, and block misleading rendering. |
| Empty or partial | Show requested scope and resolved period. Render partial observations only under authoritative semantics, with coverage and omitted contributions visible; never substitute missing data with zero. |
| Missing source or stale/invalid analysis | Retain references and show repair/recalculation actions rather than silently retargeting or presenting stale results. |
| Calculation failure | Preserve intent, expose retry, and cancel/reject obsolete requests. |
| Invalid input or failed save | Retain protected local input and distinguish persistence rejection from committed-but-unpublished state through the workbench lifecycle. |

## Runtime boundaries

Version-neutral contracts live under [`domain/visualizations`](../src/app/domain/visualizations/). Source owns exact field shapes: definition/validation, source-provider capabilities, chart compatibility, capture outcomes, and embedding context. Serializable definitions have no Angular, browser, ECharts, database, or Worker dependency. Typed variants do not admit arbitrary executable chart options. Unknown versions/providers remain unsupported without destructive normalization; persistence preserves durable payloads.

Runtime evidence includes resolved periods, sources/series, settings, provenance, quality, unavailable reasons, and account/workspace/definition/input/request identity. Cancel or reject evidence after any relevant identity changes. Establish one calendar date and latest-data anchor across sources, then pass shared date context and requested chart projection to providers. Chart registration alone is insufficient approval. Requested source, settings, series, periods, and comparison must match the returned evidence.

Periods contain ordered real civil dates and primary/comparison roles. Fixed/custom windows accept overlapping native intervals, including partial months, while retaining original dates. Rows fit declared intervals and overlap the requested role's dates. Every selected table series supplies an observation or explicit missing/excluded/padding value for each requested role; metadata alone is insufficient. Empty payloads use an empty state. Relative/fiscal calculations stay with authoritative providers.

Additive totals require declared nonoverlapping contribution identities and compatible units/site-source treatment. Separate comparison lines may retain distinct interpretations without implying a valid combined total. An opted-in widget date change that differs from existing evidence requires resolution rather than relabeling old values.

## Capture extension requirements

Only the utility inventory capture described by its owner is implemented. Extend other capture adapters at their source feature, preserving these meanings:

| Source family | Meaning an adapter must preserve |
| --- | --- |
| Meter monthly/fiscal views | Meter GUID, canonical calendarization, measures, axes, selected years, fiscal alignment, and explicit native/monthly interpretation. |
| Predictor/weather | Saved histories, units, duplicates, and observation pairing. Preserve the existing raw “Units ignored” comparison explicitly or block it; do not fetch weather. |
| Bill charges/correlation | Meter/charge identity, usage/demand interpretation, X/Y pairing, exclusions, and authoritative fitted results. |
| Analysis group exploration | Analysis/group identity, predictor selection, raw versus z-score mode, baseline/sample exclusions, signed correlation versus R-squared. |
| Analysis results/models | Named analysis/group, monthly/annual measure intent, baseline/adjustments/banking gaps, and durable pinned model identity. Never substitute another model. |
| Energy Use treemap/flows | Latest/pinned year, actual fiscal intervals, saved-value provenance, equipment/group/source occurrences, hierarchy and full-scope share denominators. Keep unaccounted/overallocated or unsupported negative flow contributions accessible; never fabricate negative Sankey links. |
| Report result charts | Durable report/analysis context and report-specific periods/measures. Prepared rows alone do not establish provenance. |

Existing chart availability does not establish compatible capture or editing for every source/type combination. Pending time-series breadth, scatter/correlation/heatmaps, and composition/hierarchy/flow support require their own capability approval and fidelity checks.

## Planned Home and report reuse

These are accepted contracts for pending Home implementation, not claims of current widgets. A widget references a saved visualization; edits update all appearances after commit. Duplicate visualization creates independent intent. Duplicate dashboard copies layout/settings but retains visualization links. Same-account reuse across Home contexts is explicit, leaves source scope visible and unchanged, and rejects cross-account references.

Dashboard filters do not retarget definitions or narrow portfolio membership. Date inheritance is opt-in and capability-gated: explicit widget override, then opted-in dashboard date, then saved period. Without opt-in the saved period wins. Unsupported overrides show unavailable rather than being dropped. Widget appearance/layout never writes to the definition.

Deletion reviews affected widgets; missing definitions retain recoverable placeholders offering Replace or Remove. Removing a widget/dashboard never deletes a visualization. Future report authoring may reuse the same boundaries; existing report outputs remain governed by report contracts.

## Validation

Protect round trips, unknown and incomplete definitions, fixed/rule selection, mixed units/fiscal incompatibility, provenance, missing references, real zero/gaps/partial data, freshness, capture fidelity, date overrides, and stale request identity. Use pure contract tests for deterministic decisions and native browser coverage for changed storage, Worker, or interaction behavior. Select commands and broader gates through [testing policy](testing.md) and the validation planner.
