# V1 composition, hierarchy and flow visualizations

This reference owns saved VIS8 presentations. [Foundation](v1-visualization-foundation.md) owns source meaning, [workbench](v1-visualization-workbench.md) owns editing/recovery, and [persistence](v1-visualization-persistence.md) owns durable ownership and transfer. Inventory capture expansion remains VIS9 work.

## Sources and periods

Composition uses one utility or Energy Use source configuration and one resolved period, without comparison overlays. Add offers Breakdown bar, Donut, Treemap, Sunburst and Sankey; Sunburst has its own shared icon. Unsupported retained intent stays repairable. Replacing a composition source category reviews removal of the previous bindings and presentation.

Calendarized utilities support energy, compatible consumption/water, cost, and location/market emissions. Existing selections and grouping define breakdown categories. A composition sums original canonical monthly observations across history, whole-month fixed/rolling ranges, or a selected fiscal year. Native bills, detailed charges, mixed consumption meanings and standalone utility flows are unavailable. Existing conversion, energy-treatment, inclusion and emissions coverage rules remain authoritative.

Energy Uses support annual consumption by equipment, group, equipment type, linked meter group or facility. Choose latest saved fiscal year or one pinned fiscal year; all-history snapshots are never summed. The annual projection retains each saved source occurrence, original amount/unit/year, override, retirement and carry-forward meaning. Group changes and orphan equipment retain their existing ownership semantics. Portfolio aggregation requires matching actual start/end dates and compatible display units.

## Hierarchies and flows

Treemap and Sunburst share the same leaf evidence, totals and presets. Utilities offer Facility / source / meter, Facility / meter group / meter, and Source / facility / meter. Energy Uses offer Facility / group / equipment, Facility / source / equipment, and Source / facility / group / equipment. Single-facility setup omits the redundant facility level. Meter groups and Energy Use groups remain separate. Paths use typed resource identities; matching labels do not merge unrelated nodes. Repeated source occurrences may aggregate into one displayed item/source while remaining separate in source details.

Hierarchy configuration is saved intent. Pointer drill, keyboard Explore buttons, breadcrumbs, parent/root actions and focused Backspace/Home share temporary state. Appearance changes retain a valid branch; missing branches or changed visualization identity recover to root. Chart conversion between Treemap and Sunburst retains hierarchy and value display. Required period, comparison and native-observation resets use the existing reviewed decision flow.

New Energy Use Sankey setup starts with source-to-equipment and also supports source-to-group and facility energy balance. Allocation flows use selected contributions. Balance requires explicit whole-facility selections and includes every owning group/item, orphan equipment and eligible included energy meters. Its latest year follows the existing facility balance rule: later of latest saved equipment year and latest complete utility year, or latest available utility year when none is complete. A pinned year stays pinned.

The neutral balance helper is shared with Facility Footprint. It compares site-energy calendarization and saved reading coverage against saved equipment estimates without changing formulas. Positive residuals become Unaccounted links; over-allocation remains a signed diagnostic and never a negative link. Incomplete metered coverage leaves balance/shares unavailable while known allocation remains visible. Equipment-only charts never acquire utility calculations. Balance and explicitly requested metered shares acquire current calculations only while the preview is active; obsolete work cannot publish.

## Values, shares and accessible evidence

Canonical leaf contributions establish totals; hierarchy parents and Sankey endpoints never count as additional contributions. Overlapping selections cannot produce a composition total. Rendering does not write source records or inferred history.

Geometry represents selected positive contributions. Percentage display retains original amounts and names its denominator. Utility percentages use selected contributions. Energy Use percentages can use selected contributions, full owning-facility equipment use, full-account equipment use under All Facilities, or complete positive metered site-energy consumption. Facility/account denominators ignore item visibility and drill position. Full-account shares also require matching actual fiscal periods. A node spanning several facilities has no single owning-facility percentage.

Known partial totals/shares are labeled as known values only. Missing, invalid, inactive and observed-zero values remain distinguishable in source details. Zero denominators have unavailable percentages. Absolute utility bars can display signed values; visible negative contributions make donut, hierarchy and percentage breakdowns unavailable. Explicitly hidden contributions remain in source evidence without blocking compatible visible geometry. The Energy Use annual projection continues to reject invalid negative saved amounts rather than reinterpreting them as signed consumption.

Charts preserve small positive contributions without automatic Other grouping. Positive shares below 1% display `<1%`; zero displays `0%`. Source details retain original precision, periods, coverage and provenance, plus chart values/shares and guarded source links. All-zero/unavailable geometry has an explanation and retains its details. Long labels remain available in tooltips and accessible navigation. Print includes title, resolved period and current hierarchy context while omitting editing/navigation controls.

## Storage and validation

Sunburst adds a typed chart variant with the same hierarchy/value fields as Treemap; utility hierarchies add the meter level. These are additive definition-version-2 extensions. Database structure and record/backup container versions are unchanged. Source selections and item appearance use existing verified GUID transfer rules; runtime composition evidence, denominators, diagnostics, options and drill state are never persisted.

Deterministic tests protect totals, canonical occurrences, shares, missing/zero/negative values, units, actual periods and energy balance. Chromium journeys protect rendering, keyboard navigation, save/reopen/duplication, actual account/facility backup remapping, active metered demand, source immutability, themes, narrow windows and printing. Select execution gates through [testing policy](testing.md); production-shell/release acceptance remains tracked by the [delivery plan](v1-visualizations-and-home-plan.md).
